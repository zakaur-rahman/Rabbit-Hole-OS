import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Ensure components directory is scanned
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        border1: "var(--border)",
        border2: "var(--border2)",
        sub: "var(--sub)",
        muted: "var(--muted)",
        amber1: "var(--amber)",
        amber2: "var(--amber2)",
        amberBg: "var(--amber-bg)",
        amberGlow: "var(--amber-glow)",
        green1: "var(--green)",
        greenBg: "var(--green-bg)",
        red1: "var(--red)",
        blue1: "var(--blue)",
        
        // Custom RabbitHole Palette (keep green for compatibility if needed)
        brand: {
             500: '#22c55e', // Green
        }
      },
      fontFamily: {
        sans: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        r1: "var(--r)",
        r2: "var(--r2)",
      }
    },
  },
  plugins: [],
  darkMode: 'class', // Manual dark mode logic if needed, but we force dark mostly
};
export default config;
