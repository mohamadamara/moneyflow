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
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        pop: "0 10px 30px rgba(16,24,40,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
