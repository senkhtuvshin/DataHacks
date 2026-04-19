import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Industrial zinc palette ───────────────────────────────────
        z950: "#09090b",   // page background
        z900: "#111113",   // panel/column background
        z850: "#18181b",   // card background
        z800: "#27272a",   // border
        z700: "#3f3f46",   // hover border
        z600: "#52525b",   // muted label
        z500: "#71717a",   // placeholder
        z400: "#a1a1aa",   // secondary text
        z300: "#d4d4d8",   // tertiary text
        z200: "#e4e4e7",   // interactive / primary text
        z50:  "#fafafa",   // crisp white

        // ── Traffic-light status (ONLY vibrant colors allowed) ────────
        sig: {
          green: "#22c55e",
          amber: "#f59e0b",
          red:   "#ef4444",
        },

        // ── Legacy aliases (keep for existing components that haven't been refactored yet) ──
        vent: {
          bg:      "#09090b",
          surface: "#111113",
          card:    "#18181b",
          border:  "#27272a",
          text:    "#fafafa",
          sub:     "#a1a1aa",
          muted:   "#52525b",
          green:   "#22c55e",
          amber:   "#f59e0b",
          red:     "#ef4444",
          teal:    "#a1a1aa",
          accent:  "#e4e4e7",
        },
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      borderWidth: { DEFAULT: "1px" },
      keyframes: {
        slidein: {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        fadeup: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
        pulse_ring: {
          "0%, 100%": { opacity: "0.8" },
          "50%":       { opacity: "0.2" },
        },
      },
      animation: {
        slidein:    "slidein 0.2s ease-out",
        fadeup:     "fadeup 0.2s ease-out",
        pulse_ring: "pulse_ring 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
