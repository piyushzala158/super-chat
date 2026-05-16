import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#08121e",
        cyan: "#6ff3ff",
        lime: "#d4ff6a",
        coral: "#ff7a66",
        mist: "#dce7f5"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(111, 243, 255, 0.18), 0 18px 60px rgba(1, 22, 39, 0.28)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
