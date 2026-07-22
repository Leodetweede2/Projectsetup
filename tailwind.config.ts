import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Amphia house style — built from the two official blues:
        // lichtblauw #64B3E8 (brand-400) and donkerblauw #225D8A (brand-700).
        brand: {
          50: "#eef6fc",
          100: "#d6ebf8",
          200: "#b4d9f1",
          300: "#8bc6ea",
          400: "#64b3e8",
          500: "#3f93c9",
          600: "#2d76aa",
          700: "#225d8a",
          800: "#1d4c70",
          900: "#1a4059",
        },
        // Semantic tokens (backed by CSS variables in globals.css) so the whole
        // UI flips between light and dark from a single source of truth.
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
