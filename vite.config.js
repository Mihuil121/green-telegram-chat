import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // чтобы сборка работала на GitHub Pages и в любой подпапке
});
