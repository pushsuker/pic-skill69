import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// หน้าบ้านเรียก /api แล้ว Vite ส่งต่อไป Express
const proxy = { '/api': 'http://127.0.0.1:3301' };
export default defineConfig({
  plugins: [vue()],
  server: { host: '127.0.0.1', port: 5175, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 5175, strictPort: true, proxy },
});
