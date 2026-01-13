/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        surface: "var(--surface)",
        card: "var(--card)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
      },
      backgroundColor: {
        primary: "var(--primary)",
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        surface: "var(--surface)",
        card: "var(--card)",
      },
      textColor: {
        primary: "var(--primary)",
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        text: "var(--text)",
        muted: "var(--muted)",
      },
      borderColor: {
        primary: "var(--primary)",
        accent: "var(--accent)",
        border: "var(--border)",
      },
    },
  },
  plugins: [],
}
