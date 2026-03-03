import { Outlet } from "react-router-dom";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";
import { LivingBackground } from "@/components/ui";
import { useNovaThemeBridge } from "@/hooks/useNovaThemeBridge";

export function SiteLayout() {
  const { theme, setTheme, isInNovaWallet } = useNovaThemeBridge();

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <LivingBackground />
      <NavBar
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        hideThemeToggle={isInNovaWallet}
      />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-nova-lg py-nova-xxl">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
