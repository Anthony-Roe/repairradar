/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          background: 'var(--background)',
          foreground: 'var(--foreground)',
          card: 'var(--card)',
          'card-foreground': 'var(--card-foreground)',
          primary: 'var(--primary)',
          'primary-foreground': 'var(--primary-foreground)',
          secondary: 'var(--secondary)',
          'secondary-foreground': 'var(--secondary-foreground)',
          muted: 'var(--muted)',
          'muted-foreground': 'var(--muted-foreground)',
          accent: 'var(--accent)',
          'accent-foreground': 'var(--accent-foreground)',
          destructive: 'var(--destructive)',
          border: 'var(--border)',
        },
        orange: {
          DEFAULT: 'oklch(70% 0.15 60)', // Light theme: vibrant orange
          dark: 'oklch(80% 0.12 60)',   // Dark theme: slightly lighter, less saturated
        },
        // Priority Levels
        priority: {
          low: 'oklch(75% 0.10 60)',    // Subtle orange for low priority
          medium: 'oklch(70% 0.15 60)', // Standard orange for medium priority
          high: 'oklch(65% 0.20 60)',   // Intense orange for high priority
          'low-dark': 'oklch(85% 0.08 60)',   // Dark theme low
          'medium-dark': 'oklch(80% 0.12 60)', // Dark theme medium
          'high-dark': 'oklch(75% 0.18 60)',   // Dark theme high
        },
        borderRadius: {
          DEFAULT: 'var(--radius)',
        }
      }
    },
    plugins: [import("tailwindcss-animate")],
  };