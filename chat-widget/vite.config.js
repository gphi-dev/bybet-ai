import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' ? 'production' : 'development'
    ),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'ChatWidget',
      fileName: () => 'chat-widget',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'chat-widget.js',
        inlineDynamicImports: true,
        assetFileNames: (info) => {
          if (info.name && String(info.name).endsWith('.css')) return 'chat-widget.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
}));
