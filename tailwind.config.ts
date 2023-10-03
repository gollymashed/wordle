import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
    fontFamily: {
      mono: ["JetBrainsMono", "monospace"],
      sans: ["JetBrainsMono", "sans-serif"],
    },
    colors: {
      light: "#E4F5DC",
      medium: "#89D992",
      medium_dark: "#398748",
      dark: "#0D0707",
      dark_accent: "#292929",
      green: "#60D177",
      orange: "#F2A365",
      red: "#E84855",
    },
  },
  plugins: [],
} satisfies Config;
