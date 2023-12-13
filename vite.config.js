import {defineConfig} from 'vite';
import {existsSync, readdirSync} from 'fs';
import {join, resolve} from 'path';

const casesDir = resolve(__dirname, 'cases');

const input = {
  main: resolve(__dirname, 'index.html'),
};

for (const name of readdirSync(casesDir)) {
  const candidate = join(casesDir, name, 'index.html');
  if (existsSync(candidate)) {
    input[name] = candidate;
  }
}

export default defineConfig({
  build: {
    rollupOptions: {
      input,
    },
  },
  esbuild: {
    minifyIdentifiers: false,
  },
});
