import { type PropsWithChildren } from "react";

interface GlassCardProps extends PropsWithChildren {
  className?: string;
  pressable?: boolean;
  as?: "div" | "article" | "section" | "aside";
}

export function GlassCard({
  children,
  className = "",
  pressable = false,
  as: Component = "div",
}: GlassCardProps) {
  const baseClasses = "nova-card p-nova-lg";
  const pressableClasses = pressable ? "nova-card-pressable" : "";

  return (
    <Component className={`${baseClasses} ${pressableClasses} ${className}`.trim()}>
      {children}
    </Component>
  );
}
