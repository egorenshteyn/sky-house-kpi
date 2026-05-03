import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      colors: {
        carbon: {
          black: "#161616",
          gray100: "#f4f4f4",
          gray200: "#e0e0e0",
          gray300: "#c6c6c6",
          gray400: "#a8a8a8",
          blue: "#0f62fe",
          blueHover: "#0353e9",
        },
        channel: {
          airbnb: "#FF5A5F",
          luxe: "#6929c4",
          direct: "#198038",
          vrbo: "#0043ce",
          tripadvisor: "#00aa6c",
          bookingcom: "#003580",
          stayone: "#a56eff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
