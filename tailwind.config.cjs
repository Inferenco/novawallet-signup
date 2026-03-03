/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        mono: ["SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "monospace"]
      },
      fontSize: {
        "display": ["40px", { lineHeight: "1.1", fontWeight: "800", letterSpacing: "-0.5px" }],
        "h1": ["32px", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.3px" }],
        "h2": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        "h3": ["17px", { lineHeight: "1.4", fontWeight: "600" }],
        "body": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-medium": ["15px", { lineHeight: "1.5", fontWeight: "500" }],
        "body-small": ["14px", { lineHeight: "1.4", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.2px" }],
        "label": ["14px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.1px" }]
      },
      colors: {
        nova: {
          blue: "var(--nova-blue)",
          "blue-dark": "var(--nova-blue-dark)",
          "blue-light": "var(--nova-blue-light)",
          cyan: "var(--nova-cyan)",
          "cyan-dark": "var(--nova-cyan-dark)",
          violet: "var(--nova-violet)",
          "violet-dark": "var(--nova-violet-dark)",
          "violet-light": "var(--nova-violet-light)"
        },
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)"
        },
        surface: {
          card: "var(--surface-card)",
          sheet: "var(--surface-sheet)",
          glass: "var(--surface-glass)",
          "glass-border": "var(--surface-glass-border)",
          elevated: "var(--surface-elevated)"
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)"
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)"
        },
        status: {
          success: "var(--status-success)",
          "success-bg": "var(--status-success-bg)",
          "success-border": "var(--status-success-border)",
          warning: "var(--status-warning)",
          "warning-bg": "var(--status-warning-bg)",
          "warning-border": "var(--status-warning-border)",
          error: "var(--status-error)",
          "error-bg": "var(--status-error-bg)",
          "error-border": "var(--status-error-border)",
          info: "var(--status-info)",
          "info-bg": "var(--status-info-bg)",
          "info-border": "var(--status-info-border)"
        },
        ink: {
          0: "var(--ink-0)",
          1: "var(--ink-1)",
          2: "var(--ink-2)"
        },
        accent: {
          0: "var(--a-0)",
          1: "var(--a-1)",
          2: "var(--a-2)"
        }
      },
      spacing: {
        "nova-xs": "var(--space-xs)",
        "nova-sm": "var(--space-sm)",
        "nova-md": "var(--space-md)",
        "nova-lg": "var(--space-lg)",
        "nova-xl": "var(--space-xl)",
        "nova-xxl": "var(--space-xxl)",
        "nova-xxxl": "var(--space-xxxl)",
        "nova-xxxxl": "var(--space-xxxxl)"
      },
      borderRadius: {
        "nova-micro": "var(--radius-micro)",
        "nova-small": "var(--radius-small)",
        "nova-standard": "var(--radius-standard)",
        "nova-large": "var(--radius-large)",
        "nova-hero": "var(--radius-hero)",
        "nova-round": "var(--radius-round)"
      },
      minHeight: {
        touch: "44px",
        button: "52px"
      },
      boxShadow: {
        "nova-card": "0 4px 24px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "nova-card-hover": "0 8px 32px rgba(45, 108, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "nova-glow": "0 4px 20px var(--shadow-color)"
      },
      backdropBlur: {
        nova: "20px"
      }
    }
  },
  plugins: []
};
