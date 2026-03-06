import { useEffect, useRef, useState } from "react";
import { useChatContext } from "../../context/chat";
import "../../styles/poker-modals.css";

interface ChatPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatPanel({ visible, onClose }: ChatPanelProps) {
  const {
    messages,
    handle,
    setHandle,
    sendMessage,
    clearMessages,
    clearUnread,
    setPanelOpen,
    isTableOwner,
    isConnected,
    isEnabled,
    canSend
  } = useChatContext();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPanelOpen(visible);
    if (visible) {
      clearUnread();
    }

    return () => {
      setPanelOpen(false);
    };
  }, [clearUnread, setPanelOpen, visible]);

  useEffect(() => {
    if (!visible) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, visible]);

  if (!visible) return null;

  return (
    <div className="games-overlay games-chat-overlay" role="dialog" aria-modal="true">
      <div className="games-modal-panel games-chat-panel">
        <div className="games-modal-header">
          <div>
            <h3 className="games-modal-title">Table Chat</h3>
            <p className="games-status-text">
              {isEnabled ? (isConnected ? "Live" : "Connecting...") : "Supabase not configured"}
            </p>
          </div>
          <button type="button" className="games-icon-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <label className="games-field">
          <span className="games-field-label">Display name</span>
          <input
            className="games-input"
            value={handle}
            maxLength={30}
            onChange={(event) => setHandle(event.target.value)}
          />
        </label>

        <div className="games-chat-messages">
          {!isEnabled ? (
            <div className="games-empty-state">
              Chat is disabled until `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
            </div>
          ) : messages.length === 0 ? (
            <div className="games-empty-state">No messages yet.</div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="games-chat-message">
                <div className="games-chat-message-header">
                  <strong>{message.handle || "Player"}</strong>
                  <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                </div>
                <p>{message.body}</p>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <label className="games-field">
          <span className="games-field-label">Message</span>
          <textarea
            className="games-textarea"
            rows={3}
            maxLength={500}
            value={draft}
            placeholder={canSend ? "Say something to the table..." : "Connect wallet to chat"}
            disabled={!canSend}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>

        <div className="games-modal-inline-actions">
          {isTableOwner ? (
            <button
              type="button"
              className="games-button games-button-secondary"
              onClick={() => {
                void clearMessages();
              }}
            >
              Clear Chat
            </button>
          ) : null}
          <button
            type="button"
            className="games-button games-button-primary"
            disabled={!canSend || draft.trim().length === 0}
            onClick={() => {
              void sendMessage(draft);
              setDraft("");
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
