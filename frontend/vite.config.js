import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // En dev, /api est proxifié vers le backend : pas de CORS à gérer et les liens /api/r/:id fonctionnent
      proxy: {
        '/api': { target: env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
      },
    },
  };
});
