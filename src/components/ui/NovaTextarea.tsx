import { forwardRef, type TextareaHTMLAttributes } from "react";

interface NovaTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const NovaTextarea = forwardRef<HTMLTextAreaElement, NovaTextareaProps>(
  function NovaTextarea({ label, error, className = "", id, ...props }, ref) {
    const inputId = id || props.name;

    const textareaClasses = [
      "nova-input min-h-[120px] resize-y",
      error ? "nova-input-error" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="grid gap-nova-sm">
        {label && (
          <label
            htmlFor={inputId}
            className="text-caption text-text-secondary font-medium"
          >
            {label}
          </label>
        )}
        <textarea ref={ref} id={inputId} className={textareaClasses} {...props} />
        {error && <p className="text-caption text-status-error">{error}</p>}
      </div>
    );
  }
);
