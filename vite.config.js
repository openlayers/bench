import fs from 'fs/promises';
import {defineConfig} from 'vite';
import {dependencies} from './package.json';
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

// this Vite plugin will put the import map before anything else to have it properly work in dev
const putImportmapFirst = () => ({
  name: 'put-importmap-first',
  transformIndexHtml(html) {
    const importmapLine = html.match(/<script .+importmap.+<\/script>/)?.[0];
    if (!importmapLine) {
      return html;
    }
    return html.replace(importmapLine, '').replace(
      '<head>',
      `<head>
${importmapLine}`
    );
  },
});

// this Vite plugin will copy node_modules/ol and its dependencies to the assets at build time
const addNodeModulesToDist = () => {
  return {
    name: 'copy-ol-in-assets',
    apply: 'build',
    async writeBundle() {
      const toCopy = [
        ['./node_modules/ol', './dist/node_modules/ol'],
        ['./node_modules/rbush', './dist/node_modules/rbush'],
        ['./node_modules/quickselect', './dist/node_modules/quickselect'],
        ['./node_modules/earcut', './dist/node_modules/earcut'],
        // also copy the import map script
        ['./cases/create-importmap.js', './dist/cases/create-importmap.js'],
      ];
      await Promise.all(
        toCopy.map(([src, dest]) =>
          fs.cp(src, dest, {
            recursive: true,
          })
        )
      );

      // tweak color-name default export
      const colorNamePath = './dist/node_modules/color-name/index.js';
      const colorName = await fs.readFile(
        './dist/node_modules/color-name/index.js',
        'utf-8'
      );
      await fs.writeFile(
        colorNamePath,
        colorName.replace('module.exports = ', 'export default ')
      );
    },
  };
};

// list of supported OL versions and current one
const SUPPORTED_OL_VERSIONS = [
  '10.3.1',
  '10.3.0',
  '10.2.1',
  '10.2.0',
  '10.1.0',
  '10.0.0',
  '9.2.4',
  '9.2.3',
  '9.2.2',
  '9.2.1',
  '9.2.0',
  '9.1.0',
  '9.0.0',
];
const CURRENT_OL_VERSION = dependencies.ol;

export default defineConfig({
  plugins: [putImportmapFirst(), addNodeModulesToDist()],
  build: {
    rollupOptions: {
      input,
      output: {
        esModule: true,
      },
      external: [/^ol\//],
    },
  },
  define: {
    // list of OL version as env
    '__OL_VERSIONS': JSON.stringify([
      CURRENT_OL_VERSION,
      ...SUPPORTED_OL_VERSIONS,
    ]),
    '__DEFAULT_OL_VERSION': JSON.stringify(CURRENT_OL_VERSION),
  },
  optimizeDeps: {
    noDiscovery: true,
  },
  esbuild: {
    minifyIdentifiers: false,
  },
});
