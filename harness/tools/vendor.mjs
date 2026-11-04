// Copies browser builds of the widget's dependencies from node_modules into widget/vendor/,
// where the HTTP server serves them. Runs automatically after `npm install`.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const vendor = fileURLToPath(new URL('../widget/vendor/', import.meta.url));
// Not require.resolve: penpal's "exports" field hides package.json and dist/.
const pkgDir = (name) => fileURLToPath(new URL(`../node_modules/${name}/`, import.meta.url));

const files = [
  [join(pkgDir('penpal'), 'dist/penpal.min.js'), join(vendor, 'penpal.min.js')],
  // Preact + hooks + htm in one ES module: the widget's chat UI, no build step.
  [join(pkgDir('htm'), 'preact/standalone.module.js'), join(vendor, 'preact-htm.js')],
  [join(pkgDir('@openuidev/browser-bundle'), 'dist/openui-bundle.min.js'), join(vendor, 'openui/openui-bundle.min.js')],
  [join(pkgDir('@openuidev/browser-bundle'), 'dist/openui-styles.css'), join(vendor, 'openui/openui-styles.css')],
];
for (const [from, to] of files) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log('vendored', to.slice(vendor.length));
}
