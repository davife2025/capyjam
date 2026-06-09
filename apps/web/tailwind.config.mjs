/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./game/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        capy: {
          brown:  "#8B5A2B",
          tan:    "#C4965A",
          green:  "#3A7D44",
          yellow: "#F9CB42",
          red:    "#E24B4A",
          blue:   "#378ADD",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "bounce-slow": "bounce 2s infinite",
        "pulse-fast": "pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
