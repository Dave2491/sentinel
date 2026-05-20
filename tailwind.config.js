/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07080d",
        panel: "#0d111a",
        line: "rgba(255,255,255,0.09)",
        mantle: "#46d4a8",
        frost: "#dce7f4",
        muted: "#8490a6",
        amber: "#f0b35d",
        danger: "#ef6b6b",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0,0,0,0.38)",
        glow: "0 0 48px rgba(70,212,168,0.16)",
      },
    },
  },
  plugins: [],
};
