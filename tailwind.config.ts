import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        band: {
          verylow: "#dc2626",
          low: "#f97316",
          moderate: "#eab308",
          high: "#22c55e",
          veryhigh: "#0ea5e9",
        },
      },
    },
  },
  plugins: [],
};
export default config;
