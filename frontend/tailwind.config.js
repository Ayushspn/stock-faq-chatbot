/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {
        fontFamily: {
          mono: ['"IBM Plex Mono"', "Courier New", "monospace"],
          display: ['"Barlow Condensed"', "sans-serif"],
        },
        colors: {
          terminal: {
            bg:       "#050810",
            surface:  "#0c1120",
            border:   "#1a2744",
            muted:    "#2a3a5c",
            green:    "#10e888",
            "green-dim": "#0a7a4a",
            amber:    "#f59e0b",
            "amber-dim": "#78490a",
            blue:     "#3b82f6",
            text:     "#c8d8f0",
            "text-dim": "#4a6080",
          },
        },
        animation: {
          blink: "blink 1s step-end infinite",
          "fade-in": "fadeIn 0.3s ease-out",
          "slide-up": "slideUp 0.25s ease-out",
          "pulse-green": "pulseGreen 2s ease-in-out infinite",
        },
        keyframes: {
          blink: {
            "0%, 100%": { opacity: "1" },
            "50%": { opacity: "0" },
          },
          fadeIn: {
            from: { opacity: "0" },
            to:   { opacity: "1" },
          },
          slideUp: {
            from: { opacity: "0", transform: "translateY(8px)" },
            to:   { opacity: "1", transform: "translateY(0)" },
          },
          pulseGreen: {
            "0%, 100%": { boxShadow: "0 0 4px #10e888" },
            "50%":      { boxShadow: "0 0 12px #10e888" },
          },
        },
      },
    },
    plugins: [],
  };
  