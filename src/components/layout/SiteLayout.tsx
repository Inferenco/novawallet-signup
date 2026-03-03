import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";

const THEME_STORAGE_KEY = "nova_theme_mode";

export function SiteLayout() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-bg-0 text-ink-0">
      <NavBar
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
