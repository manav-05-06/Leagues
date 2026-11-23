// @vercel/og's Node build expects CommonJS globals (require, __dirname,
// __filename) at load time. ES-module functions have none of them, so provide
// them before the library loads, pointing at the library's own folder so it
// finds its bundled files. Files starting with "_" in api/ are not turned into
// functions by Vercel.
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

if (typeof globalThis.require === 'undefined') {
  globalThis.require = require;
}

let ogEntry = null;
try {
  ogEntry = require.resolve('@vercel/og');
} catch {
  ogEntry = null;
}

if (ogEntry) {
  if (typeof globalThis.__filename === 'undefined') globalThis.__filename = ogEntry;
  if (typeof globalThis.__dirname === 'undefined') globalThis.__dirname = path.dirname(ogEntry);
}
