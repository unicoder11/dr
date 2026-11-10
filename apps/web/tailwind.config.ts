import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        racing: "#080D11",
        lime: "#B7FF00",
        graphite: "#2A2E34",
        silver: "#C9CDD3",
        gold: "#D4A235",
      },
      fontFamily: {
        display: ["var(--font-display-face)", "Arial Narrow", "Impact", "sans-serif"],
        body: ["var(--font-body-face)", "Helvetica Neue", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
