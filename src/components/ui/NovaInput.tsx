import { forwardRef, type InputHTMLAttributes } from "react";

interface NovaInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  mono?: boolean;
}

export const NovaInput = forwardRef<HTMLInputElement, NovaInputProps>(
  function NovaInput({ label, error, mono, className = "", id, ...props }, ref) {
    const inputId = id || props.name;

    const inputClasses = [
      "nova-input",
      mono ? "nova-input-mono" : "",
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
        <input ref={ref} id={inputId} className={inputClasses} {...props} />
        {error && <p className="text-caption text-status-error">{error}</p>}
      </div>
    );
  }
);
