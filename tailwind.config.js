/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        'void': '#000508',
        'deep': '#020c14',
        'navy': '#030f1c',
        'surface': '#061828',
        'panel': '#081f30',
        // Cyan accent system
        'cyan': {
          DEFAULT: '#00d4ff',
          dim: '#0099bb',
          bright: '#33e0ff',
          glow: '#00d4ff80',
        },
        // Blueprint blue
        'blueprint': '#0a4f8c',
        'grid': '#0a2540',
        // Text
        'text': {
          primary: '#f0f8ff',
          secondary: '#8bb8d4',
          muted: '#3a6280',
          accent: '#00d4ff',
        },
        // Glass
        'glass': {
          DEFAULT: 'rgba(8, 31, 48, 0.6)',
          light: 'rgba(8, 31, 48, 0.3)',
          dark: 'rgba(2, 12, 20, 0.8)',
        }
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'mono': ['Space Mono', 'monospace'],
        'body': ['Space Grotesk', 'sans-serif'],
      },
      fontSize: {
        'hero': 'clamp(4rem, 12vw, 10rem)',
        'title': 'clamp(2rem, 5vw, 4rem)',
        'label': '0.65rem',
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'flicker': 'flicker 0.15s ease-in-out',
        'grid-drift': 'gridDrift 20s linear infinite',
        'iridescent': 'iridescent 4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { 
            textShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff40',
            opacity: '0.9'
          },
          '50%': { 
            textShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff60, 0 0 60px #00d4ff20',
            opacity: '1'
          },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        gridDrift: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '60px 60px' },
        },
        iridescent: {
          '0%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '33%': { filter: 'hue-rotate(60deg) brightness(1.2)' },
          '66%': { filter: 'hue-rotate(-30deg) brightness(0.9)' },
          '100%': { filter: 'hue-rotate(0deg) brightness(1)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'cyan': '0 0 20px #00d4ff40, 0 0 40px #00d4ff20',
        'cyan-strong': '0 0 30px #00d4ff60, 0 0 60px #00d4ff30, 0 0 90px #00d4ff10',
        'panel': 'inset 0 1px 0 rgba(0,212,255,0.15), 0 4px 20px rgba(0,0,0,0.5)',
        'card-hover': '0 0 40px #00d4ff30, inset 0 1px 0 rgba(0,212,255,0.3)',
      },
    },
  },
  plugins: [],
}
