/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Sora", "sans-serif"],
        body: ["Sora", "sans-serif"]
      },
      colors: {
        ink: {
          0: "var(--ink-0)",
          1: "var(--ink-1)",
          2: "var(--ink-2)"
        },
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)"
        },
        accent: {
          0: "var(--a-0)",
          1: "var(--a-1)",
          2: "var(--a-2)"
        }
      }
    }
  },
  plugins: []
};
