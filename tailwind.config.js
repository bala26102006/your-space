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
        'bg-raised': 'var(--bg-raised)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'active-nav-bg': 'var(--active-nav-bg)',
        'hover-bg': 'var(--hover-bg)',
        'border-color': 'var(--border-color)',
        'divider-color': 'var(--divider-color)',
        'card-default': 'var(--card-default)',
        'surface-card': 'var(--surface-card)',
        'card-yellow': 'var(--card-yellow)',
        'card-red': 'var(--card-red)',
        'card-blue': 'var(--card-blue)',
        'card-green': 'var(--card-green)',
        'card-purple': 'var(--card-purple)',
        'workspace-accent': 'var(--workspace-accent)',
        'workspace-accent-bg': 'var(--workspace-accent-bg)',
        'workspace-accent-hover': 'var(--workspace-accent-hover)',
        'workspace-accent-text': 'var(--workspace-accent-text)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      boxShadow: {
        'card-hover': '0 2px 8px rgba(0,0,0,0.04)',
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
