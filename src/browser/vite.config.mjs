import { resolve } from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        day22: resolve(__dirname, 'day22.html'),
        day24: resolve(__dirname, 'day24.html'),
      },
      output: {
        dir: resolve(__dirname, '../../dist/browser')
      },
    },
  },
});
