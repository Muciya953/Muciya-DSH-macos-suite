#!/usr/bin/env node
/**
 * Build one package's published half from its source.
 *
 * The suite ships two kinds of packages. Four of them are already in their
 * published shape (a plain `lib/index.js` Host half plus a
 * `window.__ModuleLoader__.load(...)` browser half) and are copied as-is. The
 * appearance library is different: its browser half is authored as a single
 * module file with a CJS prologue, exactly like `scripts/build.mjs` expects, so
 * it needs a build step that wraps that file in the loader envelope and pins the
 * package identity and API prefix.
 *
 * Kept separate from `scripts/build.mjs` on purpose: that script composes the
 * legacy aggregate bundle, whose browser half registers every panel inside one
 * module. The five split packages must not depend on that composition.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OUT = "packages/appearance-library";
const NAME = "muciya-dsh-plugin-appearance-library";
const API = "/api/muciya-appearance/v1";

/** Replace one literal and fail loudly when the source no longer contains it. */
function replaceOnce(text, from, to, what) {
	if (!text.includes(from)) throw new Error(`build-package: ${what} not found in source`);
	return text.replace(from, to);
}

/** Indent a whole file one tab so it sits inside the loader factory. */
function indent(text) {
	return text
		.split("\n")
		.map((line) => (line.length === 0 ? line : "\t" + line))
		.join("\n");
}

mkdirSync(join(OUT, "lib"), { recursive: true });
mkdirSync(join(OUT, "scripts"), { recursive: true });

let panel = readFileSync("src/client/appearance-library.js", "utf8");
panel = replaceOnce(panel, 'const PACKAGE_NAME = "dsh-plugin-appearance-library";', `const PACKAGE_NAME = "${NAME}";`, "the browser half package identity");
panel = replaceOnce(panel, 'const API_BASE = "/api/macos-suite/appearance/v1";', `const API_BASE = "${API}";`, "the browser half API base");
panel = replaceOnce(
	panel,
	"/** Where the host half serves the exported library. Namespaced to the suite; see the Host half's API_PREFIX note. */",
	"/** Where this package's Host half serves the exported library. Must match its API_PREFIX. */",
	"the API base note",
);
writeFileSync(
	join(OUT, "lib/client.js"),
	`window.__ModuleLoader__.load({\n\tid: "${NAME}",\n\tfactory: (require) => {\n${indent(panel)}\n\t}\n});\n`,
);

let host = readFileSync("src/host/appearance-library.js", "utf8");
host = replaceOnce(host, 'const PACKAGE_NAME = "dsh-plugin-appearance-library";', `const PACKAGE_NAME = "${NAME}";`, "the Host half package identity");
host = replaceOnce(host, 'const API_PREFIX = "/api/macos-suite/appearance/v1";', `const API_PREFIX = "${API}";`, "the Host half API prefix");
host = replaceOnce(host, " * @module dsh-plugin-appearance-library", ` * @module ${NAME}`, "the Host half module tag");
writeFileSync(join(OUT, "lib/index.js"), host);

copyFileSync("scripts/export-wallpapers.mjs", join(OUT, "scripts", "export-wallpapers.mjs"));

console.log(`build-package: ${OUT} — client ${(panel.length / 1024).toFixed(0)} KB, host ${(host.length / 1024).toFixed(0)} KB, export script copied`);
