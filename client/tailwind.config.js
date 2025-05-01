/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "forest-green-primary": "#027e02",
        "forest-green-secondary": "#bcffbc",
        "forest-green-gray": "#c3e8c3"
      },
    },
  },
  plugins: [],
};
