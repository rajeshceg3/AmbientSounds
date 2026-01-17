import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  // Ensure the root is correctly set if you moved files to src
  // root: 'src', // If index.html is also in src
  build: {
    outDir: '../dist' // Adjust if your vite.config.js is in a subdirectory
  }
});
