/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

interface ToastContextValue {
  pushToast: (
    kind: ToastKind,
    message: string,
    options?: { actionHref?: string; actionLabel?: string }
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const kindClasses: Record<ToastKind, string> = {
  success:
    "border-status-success-border bg-status-success-bg text-status-success",
  error: "border-status-error-border bg-status-error-bg text-status-error",
  info: "border-status-info-border bg-status-info-bg text-status-info",
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback(
    (
      kind: ToastKind,
      message: string,
      options?: { actionHref?: string; actionLabel?: string }
    ) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [
        ...prev,
        {
          id,
          kind,
          message,
          actionHref: options?.actionHref,
          actionLabel: options?.actionLabel,
        },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    },
    []
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-nova-lg top-nova-lg z-50 flex max-w-sm flex-col gap-nova-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`nova-toast nova-card pointer-events-auto border px-nova-lg py-nova-md shadow-xl ${kindClasses[toast.kind]}`}
            role="status"
          >
            <p className="text-body text-text-primary">{toast.message}</p>
            {toast.actionHref && toast.actionLabel && (
              <a
                className="mt-nova-sm inline-block text-caption font-semibold text-nova-cyan underline"
                href={toast.actionHref}
                target="_blank"
                rel="noreferrer"
              >
                {toast.actionLabel}
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
