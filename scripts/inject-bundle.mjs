// inject-bundle.mjs
//
// Stages the built single-file React bundle into the SDF source tree so it can
// be deployed to the NetSuite File Cabinet (see ARCHITECTURE.md §1 step 2, §8).
//
//   dist/index.html  ->  src/FileCabinet/SuiteScripts/SuiteReact/ui.html
//
// Run via `npm run inject` (or `npm run bundle` which builds first).

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const SRC = resolve(repoRoot, 'dist', 'index.html');
const DEST = resolve(
  repoRoot,
  'src',
  'FileCabinet',
  'SuiteScripts',
  'SuiteReact',
  'ui.html'
);

if (!existsSync(SRC)) {
  console.error(
    `[inject-bundle] Build output not found at ${SRC}.\n` +
      `Run "npm run build" first (it produces the single-file dist/index.html).`
  );
  process.exit(1);
}

mkdirSync(dirname(DEST), { recursive: true });
copyFileSync(SRC, DEST);

console.log(`[inject-bundle] Copied:\n  ${SRC}\n  -> ${DEST}`);
