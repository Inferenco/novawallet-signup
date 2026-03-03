import { type ButtonHTMLAttributes, type PropsWithChildren } from "react";

type ButtonVariant = "primary" | "accent" | "success" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface NovaButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    PropsWithChildren {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "nova-btn-sm",
  md: "nova-btn-md",
  lg: "",
};

export function NovaButton({
  children,
  variant = "primary",
  size = "lg",
  fullWidth = false,
  loading = false,
  className = "",
  disabled,
  ...props
}: NovaButtonProps) {
  const classes = [
    "nova-btn",
    `nova-btn-${variant}`,
    sizeClasses[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
