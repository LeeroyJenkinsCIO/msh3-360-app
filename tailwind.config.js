/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MSH³ Brand Colors
        msh: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          indigo: '#667eea',
        },
        
        // Pillar Colors
        culture: {
          light: '#f3e8ff',
          DEFAULT: '#8b5cf6',
          dark: '#6d28d9',
        },
        competencies: {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        execution: {
          light: '#d1fae5',
          DEFAULT: '#10b981',
          dark: '#059669',
        },
        
        // Role Colors
        admin: {
          light: '#f3e8ff',
          DEFAULT: '#a855f7',
          dark: '#7e22ce',
        },
        isl: {
          light: '#fed7aa',
          DEFAULT: '#f97316',
          dark: '#ea580c',
        },
        isf: {
          light: '#d1fae5',
          DEFAULT: '#10b981',
          dark: '#059669',
        },
        
        // Neutral Colors (for inactive states, backgrounds, borders)
        neutral: {
          light: '#f3f4f6',
          DEFAULT: '#9ca3af',
          dark: '#4b5563',
        },
        
        // Utility Colors
        danger: {
          light: '#fee2e2',
          DEFAULT: '#dc2626',
          dark: '#991b1b',
        },
      },
      
      // Custom spacing for consistency
      spacing: {
        'card': '1.5rem', // 24px padding for cards
      },
      
      // Custom border radius
      borderRadius: {
        'card': '0.75rem', // 12px for cards
      },
      
      // Custom shadows
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      
      // Custom border widths
      borderWidth: {
        'card-top': '4px',
      },
    },
  },
  plugins: [],
}