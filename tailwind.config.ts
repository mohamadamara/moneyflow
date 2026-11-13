import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "on-brand": "var(--on-brand)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        brand: {
          DEFAULT: "var(--brand)",
          soft: "var(--brand-soft)",
        },
        pos: "var(--pos)",
        "pos-soft": "var(--pos-soft)",
        neg: "var(--neg)",
        "neg-soft": "var(--neg-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
    },
  },
  plugins: [],
};

export default config;
