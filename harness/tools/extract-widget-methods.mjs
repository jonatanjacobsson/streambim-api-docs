// Extracts the host side of the widget API from the StreamBIM web app bundle: the
// `rendrao/components/widget-component` module, whose methodsForWidget() builds the method
// table StreamBIM hands to penpal. The output is the minified module; run it through
// prettier to read it.
//
// Usage: node tools/extract-widget-methods.mjs <rendrao-*.js> <out.js>
// Find the bundle URL on a viewer page: [...document.scripts].map(s => s.src)
import { readFileSync, writeFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
const s = readFileSync(src, 'utf8');

const start = s.indexOf('define("rendrao/components/widget-component"');
if (start < 0) throw new Error('widget-component module not found');
const next = s.indexOf('define("rendrao/', start + 10);
const mod = s.slice(start, next < 0 ? undefined : next).replace(/,$/, '');
writeFileSync(out, mod + '\n');

// Methods are registered as `name:function` in the first object literal and as
// r(e,"name",fn) afterwards.
const names = new Set([
  ...[...mod.matchAll(/[,{]([A-Za-z_]+):(?:\(t=this,)?function/g)].map((m) => m[1]),
  ...[...mod.matchAll(/r\(e,"([A-Za-z_]+)",/g)].map((m) => m[1]),
]);
console.log(`${mod.length} chars; ${names.size} names: ${[...names].join(' ')}`);
