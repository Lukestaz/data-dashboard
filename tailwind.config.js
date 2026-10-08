/** Tailwind build configuration. Pinned to the version previously served by cdn.tailwindcss.com (3.4.17). */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#006fcf',
          dark: '#002663',
        },
      },
    },
  },
};
