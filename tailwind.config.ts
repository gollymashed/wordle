import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
    fontFamily: {
      mono: ["JetBrainsMono", "monospace"],
      sans: ["JetBrainsMono", "sans-serif"],
    },
  },
  plugins: [],
} satisfies Config;
