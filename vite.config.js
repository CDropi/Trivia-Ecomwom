import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para que funcione en cualquier ruta de GitHub Pages
export default defineConfig({ plugins: [react()], base: './' });
