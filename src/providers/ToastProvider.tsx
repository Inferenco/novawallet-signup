/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
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
  success: "border-emerald-400/50 bg-emerald-950/70",
  error: "border-rose-400/60 bg-rose-950/70",
  info: "border-sky-400/50 bg-sky-950/70"
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
          actionLabel: options?.actionLabel
        }
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
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm text-ink-0 shadow-xl ${kindClasses[toast.kind]}`}
            role="status"
          >
            <p>{toast.message}</p>
            {toast.actionHref && toast.actionLabel ? (
              <a
                className="mt-2 inline-block text-xs font-semibold text-accent-0 underline"
                href={toast.actionHref}
                target="_blank"
                rel="noreferrer"
              >
                {toast.actionLabel}
              </a>
            ) : null}
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
