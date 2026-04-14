import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

const defaultBasePath = '/leaftab-workspace/';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : (process.env.PAGES_BASE_PATH ?? defaultBasePath),
  plugins: [
    react(),
    tailwindcss(),
  ],
}));
