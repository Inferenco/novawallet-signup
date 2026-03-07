import { useContext } from "react";
import { ChatContext } from "./chatContextValue";

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext must be used within a ChatProvider");
    }
    return context;
}
