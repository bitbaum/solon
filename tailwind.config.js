/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fg: {
          primary: "var(--color-text)",
          secondary: "var(--color-text-muted)",
          inverted: "var(--color-on-brand)",
        },
        surface: {
          page: "var(--color-bg)",
          base: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
        },
        default: "var(--color-border)",
        "on-brand": {
          DEFAULT: "var(--color-on-brand)",
          muted: "var(--color-on-brand-muted)",
        },
        action: "var(--color-action)",
        "solon-orange": "var(--solon-orange)",
        "solon-orange-dark": "var(--solon-orange-dark)",
        "solon-bitcoin": "var(--solon-bitcoin)",
        "solon-dark": "var(--solon-dark)",
        "solon-light": "var(--solon-light)",
        "solon-gray": "var(--solon-gray)",
        "solon-green": "var(--solon-green)",
        "solon-blue": "var(--solon-blue)",
        navy: "var(--navy)",
        "navy-light": "var(--navy-light)",
        "navy-dark": "var(--navy-dark)",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        card: "var(--shadow-card)",
        lg: "var(--shadow-lg)",
        navy: "var(--shadow-navy)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
