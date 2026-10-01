/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'active-nav-bg': 'var(--active-nav-bg)',
        'card-default': 'var(--card-default)',
        'card-yellow': 'var(--card-yellow)',
        'card-red': 'var(--card-red)',
        'card-blue': 'var(--card-blue)',
        'card-green': 'var(--card-green)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      boxShadow: {
        'card-hover': '0 2px 8px rgba(0,0,0,0.05)',
        'card-hover-dark': '0 2px 8px rgba(0,0,0,0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      transitionDuration: {
        '200': '200ms',
      },
    },
  },
  plugins: [],
}
