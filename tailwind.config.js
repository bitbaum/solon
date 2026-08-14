/** @type {import('tailwindcss').Config} */

// Every colour here resolves to a CSS var defined in src/app/globals.css —
// never a literal. Token names mirror OrangeCat's so the two codebases can be
// read side by side. The old `navy`/`solon-*` colours are deliberately gone:
// they were a second, blue-tinted palette that made Solon look like a different
// company. Removing them means any leftover usage fails the build instead of
// silently rendering the old look.
const withAlpha = (token) => `hsl(var(${token}) / <alpha-value>)`;

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
          primary: withAlpha("--text-primary"),
          secondary: withAlpha("--text-secondary"),
          tertiary: withAlpha("--text-tertiary"),
          muted: withAlpha("--text-muted"),
          inverted: withAlpha("--text-inverted"),
        },
        surface: {
          public: withAlpha("--surface-public"),
          page: withAlpha("--surface-page"),
          base: withAlpha("--surface-base"),
          raised: withAlpha("--surface-raised"),
          overlay: withAlpha("--surface-overlay"),
          hover: withAlpha("--surface-hover"),
        },
        border: {
          subtle: withAlpha("--border-subtle"),
          DEFAULT: withAlpha("--border-default"),
          strong: withAlpha("--border-strong"),
          interactive: withAlpha("--border-interactive"),
        },
        // `border-default` / `text-fg-primary` etc. are the names components use.
        default: withAlpha("--border-default"),
        accent: {
          DEFAULT: "var(--public-accent)",
          hover: "var(--accent-hover)",
        },
        bitcoin: "var(--bitcoin-orange)",
        status: {
          positive: withAlpha("--status-positive"),
          warning: withAlpha("--status-warning"),
          negative: withAlpha("--status-negative"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      letterSpacing: {
        display: "var(--tracking-display)",
        label: "var(--tracking-label)",
        caps: "var(--tracking-caps)",
      },
      borderRadius: {
        control: "var(--radius-control)",
        surface: "var(--radius-surface)",
        pill: "var(--radius-pill)",
      },
      maxWidth: {
        shell: "var(--shell-max)",
      },
      spacing: {
        nav: "var(--public-nav-height)",
      },
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
