/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FFFFFF',
          surface: '#F7F8FA',
          surface2: '#EEF1F5',
          border: '#E2E8F0',
          borderDark: '#CBD5E1',
          text: '#171717',
          muted: '#666666',
          navy: '#173B68',
          navyHover: '#102A4C',
          navyLight: '#EBF2FA',
          blue: '#356FA5',
          blueHover: '#295986',
          alert: '#DC3545',
          alertLight: '#FDF2F2',
          success: '#198754',
          successLight: '#F0F9F4',
          warning: '#D69E36',
          warningLight: '#FDF9F0',
        },
      },
    },
  },
  plugins: [],
}
