#!/usr/bin/env node
/**
 * Build `muciya-dsh-plugin-appearance-library` from its own `src/`.
 *
 * The package is a leaf: every runtime file lives under `src/` and is mirrored
 * verbatim into `lib/`, so `lib/` is always reproducible from source and the
 * loader never sees a hand-edited artifact. Both the host half (`src/index.js`
 * plus its `skin/`, `startup/`, `usage/` submodules) and the browser half
 * (`src/client.js`) keep their relative imports intact — the mirror preserves
 * the layout the runtime expects.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const LIB = join(ROOT, "lib");
const ENTRIES = ["index.js", "client.js", "skin", "startup", "usage"];

for (const entry of ENTRIES) {
  if (!existsSync(join(SRC, entry))) throw new Error(`missing source entry: src/${entry}`);
}

rmSync(LIB, { recursive: true, force: true });
mkdirSync(LIB, { recursive: true });
for (const entry of ENTRIES) cpSync(join(SRC, entry), join(LIB, entry), { recursive: true });

console.log(`appearance-library: mirrored ${ENTRIES.length} entries from src/ to lib/`);
