import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      input: {
        demo: 'demo.html',
        iframe: 'iframe.html',
      },
    },
  },
});
