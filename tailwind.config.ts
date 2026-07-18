import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: "#f7f8f8",
          100: "#eceeef",
          200: "#d8dddf",
          500: "#6b7478",
          700: "#30383c",
          900: "#101417",
        },
        relay: {
          teal: "#0f8f8a",
          amber: "#c78113",
          red: "#b6403a",
        },
      },
      boxShadow: {
        panel: "0 12px 32px rgba(16, 20, 23, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
