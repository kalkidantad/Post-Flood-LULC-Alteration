import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#000000",
          card: "#000000",
          border: "#1f1f1f",
        },
        accent: {
          DEFAULT: "#0984e3",
          warm: "#e17055",
        },
      },
    },
  },
  plugins: [],
};

export default config;
