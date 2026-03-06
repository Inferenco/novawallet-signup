import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { supabase, type ChatMessage } from "@/lib/supabase";
import { getNickname } from "../../services/profiles";
import { normalizeAddress } from "../../utils/address";
import type { NetworkType } from "../../utils/constants";

const HANDLE_KEY = "nova_games_chat_handle";
const DEFAULT_HANDLE = "Player";
const RATE_LIMIT_MS = 2000;
const MAX_MESSAGES = 100;

interface ChatContextValue {
  messages: ChatMessage[];
  handle: string;
  setHandle: (handle: string) => void;
  sendMessage: (body: string) => Promise<void>;
  unreadCount: number;
  clearUnread: () => void;
  clearMessages: () => Promise<void>;
  setPanelOpen: (open: boolean) => void;
  isTableOwner: boolean;
  setIsTableOwner: (isOwner: boolean) => void;
  isConnected: boolean;
  isEnabled: boolean;
  canSend: boolean;
  walletAddress: string | null;
  activeTableId: string | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

interface ChatProviderProps {
  tableId: string | null;
  walletAddress: string | null;
  network: NetworkType | null;
  children: ReactNode;
}

function normalizeTableId(tableId: string | null, network: NetworkType | null): string | null {
  if (!tableId) return null;

  const trimmed = tableId.trim();
  if (!trimmed) return null;

  let networkPart: string | null = network ?? null;
  let addressPart = trimmed;

  if (trimmed.includes(":")) {
    const [maybeNetwork, ...rest] = trimmed.split(":");
    if (rest.length > 0) {
      networkPart = maybeNetwork;
      addressPart = rest.join(":");
    }
  }

  if (networkPart === "testnet") {
    networkPart = "cedra";
  }

  if (!networkPart) return null;

  const normalized = normalizeAddress(addressPart);
  if (!normalized) return null;
  return `${networkPart}:${normalized}`;
}

function readStoredHandle(): string {
  try {
    return window.localStorage.getItem(HANDLE_KEY) || DEFAULT_HANDLE;
  } catch {
    return DEFAULT_HANDLE;
  }
}

export function ChatProvider({
  tableId,
  walletAddress,
  network,
  children
}: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [handle, setHandleState] = useState(() => readStoredHandle());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isTableOwner, setIsTableOwner] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);
  const [isPageActive, setIsPageActive] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );
  const lastSentRef = useRef(0);
  const panelOpenRef = useRef(false);

  const activeTableId = useMemo(() => normalizeTableId(tableId, network), [tableId, network]);
  const isEnabled = Boolean(supabase && activeTableId);
  const canSend = Boolean(isEnabled && walletAddress);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleVisibility = () => {
      setIsPageActive(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const setHandle = useCallback((value: string) => {
    const trimmed = value.trim() || DEFAULT_HANDLE;
    setHandleState(trimmed);
    try {
      window.localStorage.setItem(HANDLE_KEY, trimmed);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  useEffect(() => {
    if (!walletAddress || !network || profileFetched) return;

    let alive = true;
    const loadNickname = async () => {
      try {
        const nickname = await getNickname(network, walletAddress);
        if (alive && nickname) {
          setHandle(nickname);
        }
      } finally {
        if (alive) {
          setProfileFetched(true);
        }
      }
    };

    void loadNickname();
    return () => {
      alive = false;
    };
  }, [network, profileFetched, setHandle, walletAddress]);

  useEffect(() => {
    setProfileFetched(false);
  }, [walletAddress, network]);

  useEffect(() => {
    setMessages([]);
    setUnreadCount(0);
    setIsTableOwner(false);
  }, [activeTableId]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const setPanelOpen = useCallback((open: boolean) => {
    panelOpenRef.current = open;
    if (open) {
      setUnreadCount(0);
    }
  }, []);

  const clearMessages = useCallback(async () => {
    if (!supabase || !activeTableId || !isTableOwner) return;

    setMessages([]);
    setUnreadCount(0);

    const { error } = await supabase.from("messages").delete().eq("table_id", activeTableId);
    if (error) {
      console.error("Failed to delete messages:", error);
      return;
    }
  }, [activeTableId, isTableOwner]);

  useEffect(() => {
    if (!supabase || !activeTableId || !isPageActive) {
      setIsConnected(false);
      if (!activeTableId) {
        setMessages([]);
      }
      return undefined;
    }

    const supabaseClient = supabase;
    let alive = true;

    const fetchMessages = async () => {
      const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("table_id", activeTableId)
        .order("created_at", { ascending: true })
        .limit(MAX_MESSAGES);

      if (!alive) return;
      if (error) {
        console.error("Failed to fetch messages:", error);
        return;
      }
      setMessages((data ?? []) as ChatMessage[]);
    };

    void fetchMessages();

    const channel = supabaseClient
      .channel(`chat:${activeTableId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `table_id=eq.${activeTableId}`
        },
        (payload) => {
          if (!alive) return;
          const nextMessage = payload.new as ChatMessage;
          setMessages((current) => [...current, nextMessage].slice(-MAX_MESSAGES));
          if (!panelOpenRef.current) {
            setUnreadCount((count) => count + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `table_id=eq.${activeTableId}`
        },
        (payload) => {
          if (!alive) return;
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            setMessages((current) => current.filter((message) => message.id !== deletedId));
          } else {
            void fetchMessages();
          }
        }
      )
      .subscribe((status, error) => {
        if (!alive) return;
        if (error) {
          console.error("Realtime subscription error:", error);
        }
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      alive = false;
      void supabaseClient.removeChannel(channel);
    };
  }, [activeTableId, isPageActive]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!supabase || !activeTableId || !walletAddress) return;

      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 500) return;

      const now = Date.now();
      if (now - lastSentRef.current < RATE_LIMIT_MS) {
        return;
      }
      lastSentRef.current = now;

      const { error } = await supabase.from("messages").insert({
        table_id: activeTableId,
        wallet_address: walletAddress,
        handle,
        body: trimmed
      });

      if (error) {
        console.error("Failed to send message:", error);
      }
    },
    [activeTableId, handle, walletAddress]
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      handle,
      setHandle,
      sendMessage,
      unreadCount,
      clearUnread,
      clearMessages,
      setPanelOpen,
      isTableOwner,
      setIsTableOwner,
      isConnected,
      isEnabled,
      canSend,
      walletAddress,
      activeTableId
    }),
    [
      activeTableId,
      canSend,
      clearMessages,
      clearUnread,
      handle,
      isConnected,
      isEnabled,
      isTableOwner,
      messages,
      sendMessage,
      setHandle,
      setPanelOpen,
      unreadCount,
      walletAddress
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
