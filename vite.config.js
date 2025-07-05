import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
  plugins: [eslint()],
  // Ensure the root is correctly set if you moved files to src
  // root: 'src', // If index.html is also in src
  build: {
    outDir: '../dist' // Adjust if your vite.config.js is in a subdirectory
  }
});
