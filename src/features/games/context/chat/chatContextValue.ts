import { createContext } from "react";
import type { ChatMessage } from "@/lib/supabase";

export interface ChatContextValue {
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

export const ChatContext = createContext<ChatContextValue | null>(null);
