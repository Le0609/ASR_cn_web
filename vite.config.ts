import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 固定端口：strictPort 让端口被占用时直接报错，而不是静默递增到 5174/5175
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    // 分包优化：将动效库单独拆包，利于浏览器缓存
    rollupOptions: {
      output: {
        manualChunks: {
          'framer-motion': ['framer-motion'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
