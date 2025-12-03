import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Injeta a variável API_KEY para que o código 'process.env.API_KEY' funcione
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});