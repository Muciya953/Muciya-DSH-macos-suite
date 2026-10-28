#!/usr/bin/env node
/**
 * What `npm pack` would actually ship, against what `package.json.files` promises.
 *
 * The whitelist in `files` is the only thing standing between a published tarball
 * and the private material in this repo (`src/`, `test/`, `docs/`, `_backup/`,
 * `node_modules/`, editor backups). A whitelist that names a path nobody packages
 * is just as wrong as a tarball that carries an extra file, so both directions are
 * reported.
 *
 * `npm pack --dry-run --json` runs `prepack`, which builds `lib/`, and its build
 * output lands on the same stdout ahead of the JSON. The parser below therefore
 * looks for the first bracket whose slice parses into a file list instead of
 * trusting `JSON.parse(stdout)`.
 *
 * Usage: node scripts/check-package.mjs      (also driven by test/harness.mjs)
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** npm always ships these whatever `files` says. */
const ALWAYS_INCLUDED = new Set(["package.json"]);

/**
 * Paths the installed plugin cannot work without. A missing entry here is not a
 * whitelist-versus-tarball mismatch - it is the tarball quietly losing a file the
 * Host half reads at runtime (`lib/index.js` did exactly that in 1.0.0, where a
 * clean `rm -rf lib && npm run build` produced a package with no entry at all).
 */
const REQUIRED_PACKED = [
  "lib/index.js",
  "lib/client.js",
  "lib/host/skill-library.js",
  "lib/host/appearance-library.js",
  "lib/host/automation-tasks.js",
  "cordis.patch.yml",
  "locale/en.json",
  "locale/zh.json",
  "data/about.json",
  "icon.svg",
];

/**
 * Anything matching one of these must never appear in a tarball:
 * private source, the offline checks, docs and backups (including `*.bak-<date>`
 * copies that helper scripts leave behind), and the dependency tree.
 */
const NEVER_PACKED = [
  /^src\//,
  /^test\//,
  /^docs\//,
  /^_backup\//,
  /(^|\/)_backup\//,
  /(^|\/)node_modules\//,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)\.DS_Store$/,
  /(^|\/)[^/]*\.bak(-|$)/,
  /(^|\/)[^/]*\.(tgz|zip)$/,
];

/** Whether one `files` entry (a file or a directory) covers a packed path. */
function covers(entry, file) {
  const bare = entry.replace(/^\.\//, "").replace(/\/+$/, "");
  if (bare === "") return false;
  return file === bare || file.startsWith(bare + "/");
}

/** Pull the file list out of `npm pack --dry-run --json`, tolerating prepack noise. */
export function parsePackReport(text) {
  if (typeof text !== "string" || text === "") return null;
  const end = text.lastIndexOf("]");
  if (end < 0) return null;
  for (let start = text.indexOf("["); start >= 0 && start < end; start = text.indexOf("[", start + 1)) {
    const slice = text.slice(start, end + 1);
    if (!slice.includes('"files"')) continue;
    let rows;
    try {
      rows = JSON.parse(slice);
    } catch {
      continue; // a stray bracket in the build log, not the report
    }
    if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0]?.files)) return rows;
  }
  return null;
}

/**
 * Read the manifest next to `cwd`, ask npm what it would pack, and compare.
 *
 * Returns `skipped: true` with a reason when npm cannot run here (not on PATH,
 * non-zero exit, unparseable output). A skipped check is not a failure: this
 * package has to be verifiable on machines without a usable npm.
 */
export function inspectPackage(options = {}) {
  const cwd = options.cwd ?? PLUGIN_ROOT;
  const manifest = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  const entries = Array.isArray(manifest.files) ? manifest.files.map((value) => String(value)) : [];
  const empty = { entries, files: [], untracked: [], uncovered: [], forbidden: [], missing: [...REQUIRED_PACKED] };

  if (entries.length === 0) {
    return { ...empty, skipped: false, reason: null, problem: "package.json.files is missing; npm would ship every file in the directory" };
  }

  const run = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd,
    encoding: "utf8",
    env: { ...(options.env ?? process.env), npm_config_loglevel: "silent" },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (run.error !== undefined && run.error !== null) {
    return { ...empty, skipped: true, reason: "npm pack could not run (" + (run.error.code ?? run.error.message) + ")" };
  }
  if (run.status !== 0) {
    const tail = String(run.stderr ?? "").trim().split("\n").slice(-1)[0] ?? "";
    return { ...empty, skipped: true, reason: "npm pack exited " + run.status + (tail === "" ? "" : ": " + tail) };
  }

  const rows = parsePackReport(String(run.stdout ?? ""));
  if (rows === null) {
    return { ...empty, skipped: true, reason: "npm pack printed no JSON file list" };
  }

  const files = rows[0].files.map((row) => String(row.path));
  const untracked = files.filter((file) => !ALWAYS_INCLUDED.has(file) && !entries.some((entry) => covers(entry, file)));
  const uncovered = entries.filter((entry) => !files.some((file) => covers(entry, file)));
  const forbidden = files.filter((file) => NEVER_PACKED.some((pattern) => pattern.test(file)));
  const missing = REQUIRED_PACKED.filter((file) => !files.includes(file));

  return { skipped: false, reason: null, problem: null, entries, files, untracked, uncovered, forbidden, missing };
}

/* ---- CLI ---------------------------------------------------------------- */

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const report = inspectPackage();
  if (report.skipped) {
    console.log("skipped - " + report.reason);
    process.exit(0);
  }
  const problems = [];
  if (report.problem !== null) problems.push(report.problem);
  if (report.forbidden.length > 0) problems.push("forbidden in tarball: " + report.forbidden.join(", "));
  if (report.untracked.length > 0) problems.push("packed but not covered by files: " + report.untracked.join(", "));
  if (report.uncovered.length > 0) problems.push("listed in files but never packed: " + report.uncovered.join(", "));
  if (report.missing.length > 0) problems.push("required at runtime but not in the tarball: " + report.missing.join(", "));
  if (problems.length > 0) {
    for (const problem of problems) console.log("  FAIL " + problem);
    process.exit(1);
  }
  console.log(report.files.length + " files, all under the " + report.entries.length + " whitelisted entries:");
  for (const entry of report.entries) {
    const hits = report.files.filter((file) => covers(entry, file));
    console.log("  " + entry + " -> " + hits.length + " file" + (hits.length === 1 ? "" : "s"));
  }
  process.exit(0);
}

export { PLUGIN_ROOT, ALWAYS_INCLUDED, NEVER_PACKED, REQUIRED_PACKED, covers };
