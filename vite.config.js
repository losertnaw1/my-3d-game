import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/*.crdownload',
        '**/*.tmp',
        '**/*.zip',
        '**/*.blend',
        '**/*.blend1',
      ],
    },
  },
});
