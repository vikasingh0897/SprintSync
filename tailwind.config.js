/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      "colors": {
          "indigo": {
            400: "rgb(var(--c-main-400) / <alpha-value>)",
            500: "rgb(var(--c-main-500) / <alpha-value>)",
            600: "rgb(var(--c-main-600) / <alpha-value>)"
          },
          "violet": {
            400: "rgb(var(--c-alt-400) / <alpha-value>)",
            500: "rgb(var(--c-alt-500) / <alpha-value>)",
            600: "rgb(var(--c-alt-600) / <alpha-value>)",
            700: "rgb(var(--c-alt-700) / <alpha-value>)"
          },
          "on-background": "#e1e1ef",
          "outline": "#908fa0",
          "on-primary": "#1000a9",
          "tertiary-fixed-dim": "#ffb2b7",
          "surface-dim": "#11131c",
          "primary-container": "#8083ff",
          "on-tertiary-fixed-variant": "#92002a",
          "on-surface": "#e1e1ef",
          "error-container": "#93000a",
          "secondary": "#44e2cd",
          "background": "#11131c",
          "secondary-fixed": "#62fae3",
          "on-tertiary-container": "#5b0017",
          "surface-container-high": "#282933",
          "on-secondary-fixed": "#00201c",
          "tertiary-container": "#ff516a",
          "surface-container-lowest": "#0c0e17",
          "surface": "#11131c",
          "primary-fixed": "#e1e0ff",
          "primary-fixed-dim": "#c0c1ff",
          "error": "#ffb4ab",
          "on-surface-variant": "#c7c4d7",
          "on-tertiary": "#67001b",
          "secondary-fixed-dim": "#3cddc7",
          "tertiary-fixed": "#ffdadb",
          "on-tertiary-fixed": "#40000d",
          "on-secondary": "#003731",
          "outline-variant": "#464554",
          "surface-container-low": "#191b24",
          "on-primary-fixed-variant": "#2f2ebe",
          "on-error-container": "#ffdad6",
          "on-error": "#690005",
          "tertiary": "#ffb2b7",
          "surface-container-highest": "#32343e",
          "secondary-container": "#03c6b2",
          "inverse-surface": "#e1e1ef",
          "inverse-on-surface": "#2e303a",
          "on-primary-container": "#0d0096",
          "inverse-primary": "#494bd6",
          "on-primary-fixed": "#07006c",
          "surface-tint": "#c0c1ff",
          "surface-bright": "#373943",
          "on-secondary-fixed-variant": "#005047",
          "surface-container": "#1d1f29",
          "primary": "#c0c1ff",
          "surface-variant": "#32343e",
          "on-secondary-container": "#004d44"
      },
      "borderRadius": {
          "DEFAULT": "0.25rem",
          "lg": "0.5rem",
          "xl": "0.75rem",
          "full": "9999px"
      },
      "spacing": {
          "xs": "4px",
          "container-max": "1440px",
          "lg": "24px",
          "md": "16px",
          "sm": "8px",
          "base": "4px",
          "gutter": "20px",
          "xl": "48px"
      },
      "fontFamily": {
          "headline-lg-mobile": ["var(--font-geist)"],
          "headline-xl": ["var(--font-geist)"],
          "body-md": ["var(--font-geist)"],
          "headline-lg": ["var(--font-geist)"],
          "label-sm": ["var(--font-jetbrains-mono)"],
          "headline-md": ["var(--font-geist)"],
          "body-lg": ["var(--font-geist)"],
          "label-md": ["var(--font-jetbrains-mono)"]
      },
      "fontSize": {
          "headline-lg-mobile": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "600"}],
          "headline-xl": ["40px", {"lineHeight": "48px", "letterSpacing": "-0.04em", "fontWeight": "700"}],
          "body-md": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
          "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.03em", "fontWeight": "600"}],
          "label-sm": ["11px", {"lineHeight": "14px", "letterSpacing": "0.05em", "fontWeight": "500"}],
          "headline-md": ["20px", {"lineHeight": "28px", "letterSpacing": "-0.02em", "fontWeight": "600"}],
          "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
          "label-md": ["12px", {"lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "500"}]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
