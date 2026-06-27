import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
      },
      colors: {
        arena: {
          bg: "#FFF0F8",
          panel: "#FFE3F1",
          ink: "#2A1A33",
          pink: "#FFB3D9",
          rose: "#FF8FBD",
          mint: "#B3FFD9",
          sky: "#B3D9FF",
          lemon: "#FFF1A8",
          lavender: "#D9B3FF",
          peach: "#FFD9B3",
          coral: "#FFB3B3",
          lime: "#D9FFB3",
          aqua: "#B3FFF1",
          grape: "#C7B3FF",
          gold: "#FFD86B",
        },
      },
      boxShadow: {
        pixel: "4px 4px 0 0 #2A1A33",
        pixelSm: "2px 2px 0 0 #2A1A33",
        pixelLg: "6px 6px 0 0 #2A1A33",
        pixelInset: "inset 2px 2px 0 0 rgba(255,255,255,0.6), inset -2px -2px 0 0 rgba(0,0,0,0.15)",
      },
      animation: {
        bob: "bob 1.2s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        flip: "flip 1.5s cubic-bezier(0.45, 0, 0.55, 1) forwards",
        spin3: "spin 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
      },
      keyframes: {
        bob: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        glow: {
          "0%,100%": { filter: "drop-shadow(0 0 0 #fff)" },
          "50%": { filter: "drop-shadow(0 0 8px #FFD86B)" },
        },
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(1800deg)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
