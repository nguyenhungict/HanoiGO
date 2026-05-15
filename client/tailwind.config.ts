import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#FF5A5F",
        "primary-container": "#FF8A8E",
        "on-primary": "#ffffff",
        "on-primary-container": "#61000e",
        "secondary": "#F7E7CE",
        "secondary-container": "#FAF0E1",
        "on-secondary": "#413010",
        "on-secondary-container": "#6c614e",
        "tertiary": "#28A745",
        "tertiary-container": "#48C765",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#00350d",
        "background": "#FCF8F2",
        "on-background": "#261817",
        "surface": "#FCF8F2",
        "on-surface": "#261817",
        "outline": "#8e706f",
        "outline-variant": "#e2bebc",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#FAF6F0",
        "surface-container": "#F4EFE9",
        "surface-container-high": "#EEE9E3",
        "surface-container-highest": "#E8E3DD",
        "surface-bright": "#fff8f7",
        "surface-dim": "#efd4d2",
        "inverse-surface": "#3d2c2c",
        "inverse-on-surface": "#ffedeb",
        "inverse-primary": "#ffb3b0",
        "primary-fixed": "#ffdad8",
        "primary-fixed-dim": "#ffb3b0",
        "on-primary-fixed": "#410007",
        "on-primary-fixed-variant": "#92001b",
        "secondary-fixed": "#f0e0c8",
        "secondary-fixed-dim": "#d3c5ad",
        "on-secondary-fixed": "#221b0b",
        "on-secondary-fixed-variant": "#4f4533",
        "tertiary-fixed": "#83fc8e",
        "tertiary-fixed-dim": "#66df75",
        "on-tertiary-fixed": "#002106",
        "on-tertiary-fixed-variant": "#00531a",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        label: ["Manrope", "sans-serif"],
      },
      keyframes: {
        aurora: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(10%, -10%) scale(1.1)' },
          '66%': { transform: 'translate(-5%, 5%) scale(0.9)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'toast-progress': {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        aurora: 'aurora 20s infinite linear',
        float: 'float 3s ease-in-out infinite',
        'toast-progress': 'toast-progress linear forwards',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
