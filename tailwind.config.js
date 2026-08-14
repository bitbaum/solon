/** @type {import('tailwindcss').Config} */

// The colour/typography/geometry scales come from the shared preset, which maps
// every utility onto a CSS var owned by @fleet/design-tokens. Nothing visual is
// defined here — if you find yourself adding a colour or a font below, it almost
// certainly belongs in the token package so all three products get it.
module.exports = {
  presets: [require("@fleet/design-tokens/tailwind-preset")],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
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
