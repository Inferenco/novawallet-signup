import { useEffect, useState, useCallback } from "react";

type NovaTheme = "dark" | "light";

interface NovaThemeBridgeMessage {
  type: "NOVA_THEME_CHANGE";
  theme: NovaTheme;
}

interface UseNovaThemeBridgeResult {
  theme: NovaTheme;
  setTheme: (theme: NovaTheme) => void;
  isInNovaWallet: boolean;
}

const THEME_STORAGE_KEY = "nova_theme_mode";

function isNovaThemeBridgeMessage(data: unknown): data is NovaThemeBridgeMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as { type: string }).type === "NOVA_THEME_CHANGE" &&
    "theme" in data &&
    ((data as { theme: string }).theme === "dark" ||
      (data as { theme: string }).theme === "light")
  );
}

function detectNovaWallet(): boolean {
  if (typeof window === "undefined") return false;

  // Check for Nova Wallet injected properties or user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const hasNovaUA =
    userAgent.includes("novawallet") || userAgent.includes("nova-wallet");

  // Check for injected nova wallet object
  const hasNovaObject =
    (window as Window & { novaWallet?: unknown }).novaWallet !== undefined;

  // Check for data attribute that Nova Wallet might set
  const hasNovaAttribute =
    document.documentElement.hasAttribute("data-nova-wallet");

  return hasNovaUA || hasNovaObject || hasNovaAttribute;
}

export function useNovaThemeBridge(): UseNovaThemeBridgeResult {
  const [isInNovaWallet] = useState(() => detectNovaWallet());

  const [theme, setThemeState] = useState<NovaTheme>(() => {
    if (typeof window === "undefined") return "dark";

    // Check for saved preference
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;

    // Check for Nova Wallet theme attribute
    const novaTheme = document.documentElement.dataset.novaTheme;
    if (novaTheme === "light" || novaTheme === "dark") return novaTheme;

    // Respect system preference
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return "light";
    }

    return "dark";
  });

  const setTheme = useCallback((newTheme: NovaTheme) => {
    setThemeState(newTheme);
    document.documentElement.dataset.theme = newTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  // Apply theme to DOM on mount and changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Listen for Nova Wallet theme bridge messages
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (isNovaThemeBridgeMessage(event.data)) {
        setTheme(event.data.theme);
      }
    }

    // Listen for postMessage from Nova Wallet
    window.addEventListener("message", handleMessage);

    // Also listen for custom event that Nova Wallet might dispatch
    function handleNovaThemeChange(event: Event) {
      const customEvent = event as CustomEvent<{ theme: NovaTheme }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      }
    }
    window.addEventListener("nova-theme-change", handleNovaThemeChange);

    // Request current theme from Nova Wallet if inside it
    if (isInNovaWallet) {
      window.parent?.postMessage({ type: "NOVA_THEME_REQUEST" }, "*");
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("nova-theme-change", handleNovaThemeChange);
    };
  }, [isInNovaWallet, setTheme]);

  // Listen for system preference changes when not in Nova Wallet
  useEffect(() => {
    if (isInNovaWallet) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

    function handleChange(e: MediaQueryListEvent) {
      // Only auto-switch if user hasn't manually set a preference
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!saved) {
        setTheme(e.matches ? "light" : "dark");
      }
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [isInNovaWallet, setTheme]);

  return { theme, setTheme, isInNovaWallet };
}
