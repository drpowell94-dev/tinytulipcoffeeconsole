import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "600px" },
    },
    extend: {
      fontFamily: {
        display: ["Kelros", "Quicksand", "sans-serif"],
        body: ["Quicksand", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand colors (HSL format for CSS variables)
        tulip: {
          50: "hsl(10, 28%, 96%)",    // Cream #fffbf4
          100: "hsl(25, 20%, 85%)",   // Stone Taupe #b8a89b
          200: "hsl(10, 15%, 60%)",   // Main Taupe #8b7355
          500: "hsl(10, 45%, 43%)",   // Warm Charcoal #3d2013
          600: "hsl(10, 50%, 38%)",   // Deep Espresso #1a1410
          700: "hsl(10, 40%, 50%)",   // Medium Brown #6d412a
        },
        coffee: {
          50: "hsl(10, 28%, 96%)",    // Cream background
          100: "hsl(25, 20%, 85%)",   // Light stone
          900: "hsl(10, 45%, 20%)",   // Deep espresso
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
