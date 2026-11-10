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
        racing: "#17191D",
        lime: "#C7F000",
        graphite: "#454B52",
        silver: "#C9CDD3",
        gold: "#D69A48",
        cream: "#F5F5F2",
      },
      fontFamily: {
        display: ["var(--font-display-face)", "Anton", "Impact", "sans-serif"],
        body: ["var(--font-body-face)", "Montserrat", "Helvetica Neue", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
