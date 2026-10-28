/**
 * Appearance Library — host half.
 *
 * A profile-local DSH plugin that turns the Mac's own wallpaper resources into
 * DSH skins and gives them a sidebar panel to be picked from.
 *
 * Why it is built this way (the load-bearing decision):
 *
 * The skin center already owns the only live, persistent background surface in
 * this GUI. It reads `$DSH_HOME/skins/<id>/skin.json`, paints that skin's
 * `contributes.backgroundMedia`, keeps the active id in
 * `$DSH_HOME/skin-center-active.json`, and — while an external wallpaper plugin
 * is on stage — withholds every skin so the two never draw at once. A second,
 * independent wallpaper layer would therefore fight it for the same pixels.
 * So a wallpaper here is not a new kind of object: it is exported as a real
 * skin, and this panel is a purpose-built picker for that family of skins.
 * Styling, background opacity, blur sliders, first-paint stamping and the
 * atomic switch all come from the skin center unchanged.
 *
 * The host half owns three things:
 *
 *  1. the catalog — derived by scanning the skin directories this plugin
 *     generated, so the panel can never show a wallpaper whose skin is missing;
 *  2. the preview bytes — served straight from the exported skin with a real
 *     cache header, because the skin center's own asset route is `no-store`
 *     and 35 tiles per panel open is a lot of re-reading;
 *  3. the apply action — the skin center's persistence contract
 *     (`$DSH_HOME/skin-center-active.json`, the same document
 *     `POST /api/skin-center/v2/active` writes), so an applied wallpaper shows
 *     as the active skin in the skin center too. There is exactly one owner of
 *     that state and it stays the skin center's document.
 *
 * Failure policy: route mounting problems are logged, never thrown. The web
 * shell fails its whole boot when a plugin `apply` throws, and a wallpaper
 * picker must not be able to take the GUI down with it.
 *
 * @module dsh-plugin-appearance-library
 */

import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** This package's manifest name — the loader id and the client module identity. */
const PACKAGE_NAME = "dsh-plugin-appearance-library";

/**
 * Every HTTP path this plugin owns lives under one prefix.
 *
 * The suite ships alongside the standalone appearance plugin (both may be
 * mounted at once), so the path space is namespaced to the bundle instead of
 * reusing the sibling package's prefix: two plugins owning
 * `/api/appearance-library/v1` would fight over the same 11 routes. The build
 * rejects this file if it still spells the retired package id anywhere.
 */
const API_PREFIX = "/api/macos-suite/appearance/v1";

/**
 * The skin ids this plugin authors all start with this token, so the catalog
 * scan and a possible manual cleanup can both be exact.
 */
const SKIN_PREFIX = "wl-";

/** Catalog file written by `scripts/export-wallpapers.mjs` inside the skin root. */
const CATALOG_FILENAME = "_library.json";

/** How long the parsed catalog is reused before the file is stat-ed again. */
const CATALOG_TTL_MS = 3_000;

/** How long the boot-graph self-check waits before reporting absence. */
const GRAPH_DEADLINE_MS = 5_000;

/** Preview file names inside one exported skin, in preference order. */
const PREVIEW_CANDIDATES = ["preview/wallpaper.jpg", "preview/light.jpg"];

/**
 * The preview variants the export writes, keyed by the `size` query value.
 * `thumb` is the grid tile (320 px) and `full` the enlarged card (1080 px);
 * `preview` maps to `full` because the grid's own file *is* the catalog
 * preview and a caller asking for "preview" wants the readable one.
 */
const PREVIEW_SIZES = {
  thumb: ["thumb/wallpaper.jpg", "preview/wallpaper.jpg"],
  preview: PREVIEW_CANDIDATES,
  full: PREVIEW_CANDIDATES,
};

/* ── aerials ─────────────────────────────────────────────────────────────── */

/**
 * The macOS aerial (dynamic wallpaper) collection, mirrored read-only.
 *
 * Settings → Wallpaper lists every aerial Apple ships — 156 on this build —
 * and downloads one only when the user picks it there. This panel shows the
 * ones this Mac does *not* have yet, under the same categories and the same
 * Chinese labels the system uses, so the two surfaces agree. Nothing here
 * writes: the download stays macOS's job, which is why the panel's only action
 * is "open Wallpaper settings".
 */
const AERIAL_ROOT_DEFAULT = join(homedir(), "Library", "Application Support", "com.apple.wallpaper", "aerials");

/** Every asset Apple ships, downloaded or not, with its category tree. */
const AERIAL_ENTRIES_REL = join("manifest", "entries.json");

/** Apple's own asset names: zh_CN, zh_TW and en inside one binary plist. */
const AERIAL_STRINGS_REL = join("manifest", "TVIdleScreenStrings.bundle", "Contents", "Resources", "Localizable.nocache.loctable");

/** A downloaded aerial lands here as `<assetID>.mov`; that file *is* the state. */
const AERIAL_VIDEOS_DIR = "videos";

/** One offline PNG per asset, 214 × 130, shipped beside the manifest. */
const AERIAL_THUMBS_DIR = "thumbnails";

/** How long the parsed aerial inventory is reused before the disk is re-read. */
const AERIAL_TTL_MS = 5_000;

/** Category labels for the case where Apple's string table cannot be read. */
const AERIAL_CATEGORY_FALLBACK = {
  AerialCategoryLandscapes: { zh: "自然景观", en: "Landscape" },
  AerialCategoryCities: { zh: "城市景观", en: "Cityscape" },
  AerialCategoryUnderwater: { zh: "水下景观", en: "Underwater" },
  AerialCategorySpace: { zh: "地球", en: "Earth" },
  AerialCategoryMac: { zh: "Mac", en: "Mac" },
};

/** The Settings pane that lists aerials; the panel only ever opens it. */
const WALLPAPER_SETTINGS_URL = "x-apple.systempreferences:com.apple.Wallpaper-Settings.extension";

/** The harness home that owns `skins/`, matching the skin center's resolver. */
function resolveHarnessHome(env = process.env) {
  const configured = env.DSH_HOME;
  if (typeof configured === "string" && configured.trim() !== "") return configured.trim();
  return join(homedir(), ".dsh-beta");
}

/** The user skin root, honouring the same overrides the skin center does. */
function resolveSkinRoot(env = process.env) {
  const home = env.DSH_SKINS_HOME;
  if (typeof home === "string" && home.trim() !== "") return home.trim();
  const dir = env.DSH_SKINS_DIR;
  if (typeof dir === "string" && dir.trim() !== "") return dir.trim();
  return join(resolveHarnessHome(env), "skins");
}

/** The aerial collection root, overridable the way the skin root is. */
function resolveAerialRoot(env = process.env) {
  const configured = env.DSH_AERIALS_HOME;
  if (typeof configured === "string" && configured.trim() !== "") return configured.trim();
  return AERIAL_ROOT_DEFAULT;
}

/* ── importing a picture ─────────────────────────────────────────────────── */

/**
 * Where the panel keeps its own copy of every picture handed to it.
 *
 * The export turns a picture into a skin directory, so the skin itself is
 * already independent of the file it came from. This inbox is the other half
 * of that promise: the export's *source* is a file this plugin owns, under the
 * DSH home, so moving, renaming or deleting the picture in Finder or Photos
 * cannot leave a wallpaper that can no longer be rebuilt.
 */
const IMPORT_ROOT_SUBDIR = "appearance-library";

/** The folder inside that subdirectory; one digest-named folder per picture. */
const IMPORT_INBOX = "imports";

/** The largest picture this route accepts; the export re-encodes what it takes. */
const IMPORT_MAX_BYTES = 48 * 1024 * 1024;

/** What the user is told they may hand in, matched to what `sips` reads. */
const IMPORT_ACCEPTS = "JPEG, PNG, HEIC, TIFF or GIF";

/** The import inbox, overridable the way the skin root is. */
function resolveImportRoot(env = process.env) {
  const configured = env.DSH_IMPORTS_HOME;
  if (typeof configured === "string" && configured.trim() !== "") return configured.trim();
  return join(resolveHarnessHome(env), IMPORT_ROOT_SUBDIR, IMPORT_INBOX);
}

/**
 * Identify a picture by its bytes, never by the name it arrived under.
 *
 * The name decides what the skin is *called*; the container decides what can
 * encode it, and a renamed screenshot (a `.png` that is really a JPEG) is
 * common enough that trusting the extension would hand `sips` a file it reads
 * differently than advertised. The stored copy is renamed to match the bytes.
 * @returns `{ ext, mime }`, or null when this is not a picture we take.
 */
function sniffImage(bytes) {
  if (Buffer.isBuffer(bytes) === false || bytes.length < 16) return null;
  const ascii = (offset, length) => bytes.subarray(offset, offset + length).toString("latin1");
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  const head = ascii(0, 6);
  if (head === "GIF87a" || head === "GIF89a") return { ext: "gif", mime: "image/gif" };
  const tiff = ascii(0, 4);
  if (tiff === "II*\u0000" || tiff === "MM\u0000*") return { ext: "tiff", mime: "image/tiff" };
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return { ext: "heic", mime: "image/heic" };
  }
  return null;
}

/**
 * Turn whatever the browser sent as a file name into a skin-name stem: one
 * path segment, no control characters, bounded, and never empty. The name is
 * the label a reader sees in the panel, so it is kept as the user wrote it —
 * Chinese included — rather than slugified here; the export owns the id.
 */
function safeImageStem(raw) {
  const base = typeof raw === "string" ? raw.split(/[\\/]/).pop() ?? "" : "";
  const stem = base
    .replace(/\.[A-Za-z0-9]{1,5}$/, "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/^[.\s]+/, "")
    .trim()
    .slice(0, 60)
    .trim();
  return stem === "" ? `imported-${new Date().toISOString().slice(0, 10)}` : stem;
}

/** The skin center's active-selection document. */
function resolveActiveStatePath(env = process.env) {
  return join(resolveHarnessHome(env), "skin-center-active.json");
}

/* ── catalog ─────────────────────────────────────────────────────────────── */

/**
 * Cached catalog, keyed by the (mtime, size) signature of both sources.
 *
 * Two sources, deliberately:
 *
 *  1. the skin directories — the *truth*. A wallpaper exists exactly when its
 *     skin directory holds a manifest, so a skin written after the last export
 *     still shows up, and an interrupted export can never hide one.
 *  2. `_library.json` — the export's own catalogue, which contributes the
 *     extra detail a manifest does not carry (Chinese label, resource family,
 *     file sizes). It is a cache of that detail, never the source of record:
 *     an entry is only used when its skin is actually on disk.
 *
 * Reading only the JSON — which is what an earlier version did — made the
 * panel empty until the first export finished, which is exactly the state a
 * half-built library is in.
 */
let catalogCache = { signature: null, at: 0, value: null };

/** The export's own markers: tags every skin it author is labelled with. */
const EXPORT_TAGS = ["macos", "local"];

/** Cluster metadata, mirrored from the export script so a scan can label its own groups. */
const CLUSTER_META = {
  "desktop-pictures": { nameZh: "桌面图片", blurb: "macOS 自带的桌面图片，6K 母版", order: 1 },
  "assets-v2": { nameZh: "MobileAsset", blurb: "桌面图片的 MobileAsset 缓存，6K 母版", order: 2 },
  "wallpapers.video": { nameZh: "动态壁纸", blurb: "随时间或外观变化的动态桌面", order: 3 },
  aerials: { nameZh: "航拍壁纸", blurb: "系统已下载的 4K 航拍影片", order: 4 },
  custom: { nameZh: "本机图片", blurb: "本机图片做成的同规格皮肤", order: 5 },
};

/**
 * The path a manifest records for its source, or null.
 *
 * `decodeURI` throws on a stray `%` — a hand-written or third-party manifest
 * can carry one — and this runs inside the catalogue read, where a throw would
 * blank the whole panel over one bad label. A source that cannot be decoded
 * reads as "unknown" instead.
 * @param sourceUrl - the manifest's `sourceUrl`, any shape.
 * @returns the decoded local path, or null.
 */
function readSourcePath(sourceUrl) {
  if (typeof sourceUrl !== "string") return null;
  try {
    return decodeURI(sourceUrl.replace(/^file:\/\//, ""));
  } catch {
    return null;
  }
}

/**
 * Build one catalogue entry from a skin directory.
 * @param skinRoot - the user skin root.
 * @param skinId - the directory name.
 * @returns the entry, or null when the directory is not one of ours.
 */
function entryFromSkin(skinRoot, skinId) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(skinRoot, skinId, "skin.json"), "utf8"));
  } catch {
    return null;
  }
  const tags = Array.isArray(manifest?.tags) ? manifest.tags : [];
  if (EXPORT_TAGS.some((tag) => tags.includes(tag)) === false) return null;
  const layer = manifest?.contributes?.backgroundMedia?.light;
  if (typeof layer?.src !== "string" || layer.src.startsWith("/") || layer.src.includes("..")) return null;
  const sizes = {};
  for (const [key, rel] of [
    ["media", layer.src],
    ["preview", "preview/wallpaper.jpg"],
    ["thumb", "thumb/wallpaper.jpg"],
  ]) {
    try {
      sizes[key] = statSync(join(skinRoot, skinId, rel)).size;
    } catch {
      sizes[key] = 0;
    }
  }
  const cluster = Object.keys(CLUSTER_META).find((key) => tags.includes(key)) ?? "custom";
  return {
    id: skinId,
    skin: skinId,
    name: typeof manifest.nameEn === "string" && manifest.nameEn !== "" ? manifest.nameEn : skinId,
    nameZh: typeof manifest.name === "string" && manifest.name !== "" ? manifest.name : skinId,
    cluster,
    kind: layer.type === "video" ? "video" : "image",
    accent: typeof manifest.accent === "string" ? manifest.accent : "#4a5fa8",
    source: readSourcePath(manifest.sourceUrl),
    bytes: sizes,
    order: CLUSTER_META[cluster]?.order ?? 9,
  };
}

/**
 * The one film a motion skin ships, as an absolute path, or null.
 *
 * @see FILM_CACHE_SUFFIX
 */
function filmAssetPath(skinRoot, skinId) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(skinRoot, skinId, "skin.json"), "utf8"));
  } catch {
    return null;
  }
  const src = manifest?.contributes?.backgroundMedia?.light?.src;
  if (typeof src !== "string" || src === "" || src.startsWith("/") || src.includes("..")) return null;
  return join(skinRoot, skinId, src);
}

/**
 * The cached cut of a film, as a suffix on the film's own path.
 *
 * A film has exactly one playable file, so the loop seam cannot be a second
 * asset the skin chooses between — but re-cutting a 4K 240fps source is minutes
 * of ffmpeg, and a switch the user flips twice must not cost that twice. The
 * cut that is *not* playing is therefore kept beside the film under the name
 * that says which cut it is, and a flip is two renames: the file on screen
 * becomes the cache and the cache becomes the file on screen. Re-cutting only
 * happens the first time a direction is asked for.
 *
 * @see filmAssetPath
 */
const FILM_CACHE_SUFFIX = { seam: ".seamless", plain: ".plain" };

/** Every exported skin on disk, as entries, ordered the way the panel groups them. */
function scanSkins(skinRoot) {
  let names;
  try {
    names = readdirSync(skinRoot).filter((name) => name.startsWith("wl-")).sort();
  } catch {
    return [];
  }
  const entries = [];
  for (const name of names) {
    const entry = entryFromSkin(skinRoot, name);
    if (entry !== null) entries.push(entry);
  }
  return entries.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Group entries the way the panel renders them. */
function groupEntries(entries) {
  return Object.entries(CLUSTER_META)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, meta]) => ({
      key,
      nameZh: meta.nameZh,
      blurb: meta.blurb,
      order: meta.order,
      ids: entries.filter((entry) => entry.cluster === key).map((entry) => entry.id),
    }))
    .filter((group) => group.ids.length > 0);
}

/** A signature over both sources, so a changed skin or export invalidates the cache. */
function catalogSignature(skinRoot, catalogPath) {
  const parts = [];
  try {
    const stat = statSync(catalogPath);
    parts.push(`catalog:${stat.mtimeMs}:${stat.size}`);
  } catch {
    parts.push("catalog:none");
  }
  // The seam preference is a file, not a skin, so nothing else in this
  // signature notices when it changes: without this line a toggle would answer
  // from the cache it just invalidated and report the state it was asked to
  // leave.
  try {
    const stat = statSync(join(skinRoot, LOOP_SEAM_FILENAME));
    parts.push(`seam:${stat.mtimeMs}:${stat.size}`);
  } catch {
    parts.push("seam:none");
  }
  try {
    parts.push(`skins:${statSync(skinRoot).mtimeMs}`);
    for (const name of readdirSync(skinRoot).filter((entry) => entry.startsWith("wl-")).sort()) {
      try {
        parts.push(`${name}:${statSync(join(skinRoot, name)).mtimeMs}`);
      } catch {
        parts.push(`${name}:gone`);
      }
    }
  } catch {
    parts.push("skins:none");
  }
  return parts.join("|");
}

/**
 * Read the library: the exported detail where it agrees with the disk, and the
 * scan where it does not.
 * @param skinRoot - the user skin root.
 * @returns the catalog document (never null).
 */
function readCatalog(skinRoot) {
  const catalogPath = join(skinRoot, CATALOG_FILENAME);
  const now = Date.now();
  const signature = catalogSignature(skinRoot, catalogPath);
  if (catalogCache.value !== null && catalogCache.signature === signature && now - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.value;
  }

  const onDisk = new Map(scanSkins(skinRoot).map((entry) => [entry.id, entry]));
  let exported = null;
  try {
    const parsed = JSON.parse(readFileSync(catalogPath, "utf8"));
    if (parsed !== null && typeof parsed === "object" && Array.isArray(parsed.wallpapers)) exported = parsed;
  } catch {
    exported = null;
  }

  // The export's detail wins where its skin is on disk; the scan fills in any
  // skin the export has not described yet (a hand-run `--file`, a half-written
  // catalogue, a skin dropped in by hand).
  const entries = [];
  const claimed = new Set();
  for (const entry of exported?.wallpapers ?? []) {
    if (typeof entry?.skin !== "string") continue;
    const diskEntry = onDisk.get(entry.skin);
    if (diskEntry === undefined || claimed.has(entry.skin)) continue;
    claimed.add(entry.skin);
    entries.push({ ...diskEntry, ...entry, bytes: { ...diskEntry.bytes, ...(entry.bytes ?? {}) } });
  }
  for (const [id, entry] of onDisk) if (!claimed.has(id)) entries.push(entry);
  entries.sort((a, b) => (a.order ?? 9) - (b.order ?? 9) || a.id.localeCompare(b.id));

  // Stamped here rather than in `entryFromSkin` so the one read of the
  // preference covers both the scan and the exported catalogue, and so a
  // picture — which has no seam to place — is never asked the question.
  const seamIds = new Set(readLoopSeamList(skinRoot));
  for (const entry of entries) {
    const skin = typeof entry.skin === "string" ? entry.skin : entry.id;
    entry.seamLoop = entry.kind === "video" && seamIds.has(skin);
  }

  const value = {
    version: exported?.version ?? 1,
    generatedAt: typeof exported?.generatedAt === "string" ? exported.generatedAt : null,
    built: entries.length > 0,
    storage: skinRoot,
    entry: exported?.entry ?? null,
    groups: groupEntries(entries),
    wallpapers: entries,
    diagnostics: Array.isArray(exported?.diagnostics) ? exported.diagnostics : [],
  };
  catalogCache = { signature, at: now, value };
  return value;
}

/**
 * The removal list, in the skin root beside the catalogue.
 *
 * The export is idempotent, which is exactly right for a first run and exactly
 * wrong for a deletion: a removed skin directory would simply be rebuilt on the
 * next run, because the wallpaper is still on this Mac to be discovered. So a
 * removal is remembered here first, and the export script reads this same file
 * and skips those ids. Removing the record is the undo.
 *
 * Written whole, through a temp file and a rename: a half-written list would
 * silently resurrect every wallpaper the user removed.
 */
const REMOVED_FILENAME = ".removed.json";

/**
 * The seamless-loop preference, in the skin root beside the removal list.
 *
 * A film is exported to one file, so "this wallpaper should loop without a
 * seam" is not a second asset to switch between — it is how that one file was
 * cut, and changing it means re-encoding. The preference therefore lives here
 * rather than on the entry: the export script reads this same file on its next
 * run, which is what lets a hand-run export and the panel agree, and what
 * keeps the setting after the panel that wrote it is closed.
 */
const LOOP_SEAM_FILENAME = "_loop-seam.json";

/** The manifest id rule the skin center enforces, applied to everything here. */
const SKIN_ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

/**
 * Read the removal list.
 *
 * Tolerant on purpose: a hand-written list of bare id strings works, unusable
 * entries are dropped rather than thrown over, and a corrupt file reads as
 * "nothing was removed" — recoverable, since the next removal rewrites it.
 * @param skinRoot - the user skin root.
 * @returns records `{id, nameZh, name, cluster, kind, source, bytes, removedAt}`.
 */
function readRemovedList(skinRoot) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(skinRoot, REMOVED_FILENAME), "utf8"));
  } catch {
    return [];
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.removed) ? parsed.removed : [];
  return list
    .map((item) => (typeof item === "string" ? { id: item } : item))
    .filter((item) => item !== null && typeof item === "object" && typeof item.id === "string" && SKIN_ID_PATTERN.test(item.id))
    .map((item) => ({
      id: item.id,
      nameZh: typeof item.nameZh === "string" ? item.nameZh : null,
      name: typeof item.name === "string" ? item.name : null,
      cluster: typeof item.cluster === "string" ? item.cluster : null,
      kind: item.kind === "video" ? "video" : "image",
      source: typeof item.source === "string" && item.source !== "" ? item.source : null,
      bytes: item.bytes ?? null,
      removedAt: typeof item.removedAt === "string" ? item.removedAt : null,
    }));
}

/**
 * Replace one document atomically.
 *
 * The scratch file lives in a directory made unique for this call, the shape
 * the skin center's own state writer uses: a fixed `${path}.${pid}.tmp` name
 * is shared by every write in one process, so two overlapping writers clobber
 * each other's scratch bytes and the loser's rename lands on a missing file
 * (reporting a failure for a write that actually succeeded).
 * @param path - the document to replace.
 * @param content - the exact bytes to write.
 */
function writeDocumentAtomic(path, content) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const tmpDir = mkdtempSync(join(dir, `${basename(path)}.tmp-`));
  const tmp = join(tmpDir, basename(path));
  try {
    writeFileSync(tmp, content, { encoding: "utf8", flag: "wx" });
    renameSync(tmp, path);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Write the removal list atomically. @see REMOVED_FILENAME */
function writeRemovedList(skinRoot, list) {
  writeDocumentAtomic(join(skinRoot, REMOVED_FILENAME), `${JSON.stringify({ version: 1, removed: list }, null, 2)}\n`);
}

/**
 * Read the seamless-loop preference as a list of skin ids.
 *
 * Tolerant like the removal list: a bare array of ids is accepted, anything
 * that could not be a skin id is dropped, and a corrupt file reads as "nothing
 * is opted in" — which is the safe default, because that is what the film on
 * disk already is.
 * @param skinRoot - the user skin root.
 * @returns the ids whose film is cut with a loop seam.
 */
function readLoopSeamList(skinRoot) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(skinRoot, LOOP_SEAM_FILENAME), "utf8"));
  } catch {
    return [];
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.ids) ? parsed.ids : [];
  const kept = list.filter((id) => typeof id === "string" && SKIN_ID_PATTERN.test(id));
  return [...new Set(kept)];
}

/**
 * Write the seamless-loop preference atomically.
 *
 * Sorted and de-duplicated so the file has one spelling per set of ids: the
 * export script compares nothing, but a stable file makes a hand-edit and a
 * panel toggle land on the same bytes.
 * @see LOOP_SEAM_FILENAME
 */
function writeLoopSeamList(skinRoot, ids) {
  const list = [...new Set(ids)].sort();
  writeDocumentAtomic(join(skinRoot, LOOP_SEAM_FILENAME), `${JSON.stringify({ version: 1, ids: list }, null, 2)}\n`);
}

/** The active skin id persisted by the skin center, or null. */
function readActiveSkinId(env = process.env) {
  try {
    const parsed = JSON.parse(readFileSync(resolveActiveStatePath(env), "utf8"));
    return typeof parsed?.active === "string" && parsed.active !== "" ? parsed.active : null;
  } catch {
    return null;
  }
}

/**
 * Point the skin center's selection at one skin.
 *
 * The document is replaced atomically (temp file + rename) and every unrelated
 * field — `initialized`, `background`, and anything a future version adds — is
 * carried over untouched, because the skin center owns this file and reads it
 * back whole.
 * @param skinId - the skin to activate.
 * @param env - environment supplying the harness home.
 * @returns the id that was written.
 */
function writeActiveSkinId(skinId, env = process.env) {
  const path = resolveActiveStatePath(env);
  let document = { active: null, initialized: true };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) document = parsed;
  } catch {
    // No selection yet (or an unreadable one): a fresh document is the same
    // thing the skin center would write on first apply.
  }
  document.active = skinId;
  document.initialized = true;
  writeDocumentAtomic(path, `${JSON.stringify(document, null, 2)}\n`);
  return skinId;
}

/* ── aerials ─────────────────────────────────────────────────────────────── */

/** Cached `plutil` reads, keyed by table path. */
const localeTableCache = new Map();

/**
 * Read one language section out of an Apple `.loctable`.
 *
 * The table is a binary property list, which Node cannot parse on its own, so
 * it goes through `plutil`. The read is cached by (mtime, size, language)
 * because it costs a process spawn while the file only changes when macOS
 * updates its wallpaper assets.
 *
 * @param path - the `.loctable` file.
 * @param lang - the section to read (zh_CN, zh_TW or en).
 * @returns the string table, or null when it cannot be read.
 */
function readLocaleTable(path, lang) {
  let signature;
  try {
    const stat = statSync(path);
    signature = `${stat.mtimeMs}:${stat.size}:${lang}`;
  } catch {
    return null;
  }
  const cached = localeTableCache.get(path);
  if (cached !== undefined && cached.signature === signature) return cached.value;
  let value = null;
  try {
    const json = execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", path], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const table = JSON.parse(json)?.[lang];
    if (table !== null && typeof table === "object" && Array.isArray(table) === false) value = table;
  } catch {
    value = null;
  }
  localeTableCache.set(path, { signature, value });
  return value;
}

/** Map a caller's locale tag onto one of the three sections Apple ships. */
function aerialLanguage(raw) {
  const tag = String(raw ?? "").toLowerCase().replace(/_/g, "-");
  if (tag.startsWith("zh") === false) return "en";
  if (tag.includes("tw") || tag.includes("hk") || tag.includes("hant")) return "zh_TW";
  return "zh_CN";
}

/** An empty inventory, for a Mac without the aerial collection. */
function emptyAerials(lang) {
  return { available: false, total: 0, downloaded: 0, pending: 0, lang, groups: [] };
}

/** Cached aerial inventory; see `readAerials`. */
let aerialCache = { signature: null, at: 0, value: null };

/**
 * Inventory the aerials this Mac has *not* downloaded yet.
 *
 * Three read-only sources: the manifest lists every asset Apple ships together
 * with its category tree, Apple's string table supplies the labels Settings
 * itself shows, and `videos/<assetID>.mov` is the download state — that file's
 * presence is exactly what Settings reports as downloaded.
 *
 * @param root - the aerial collection root.
 * @param rawLang - the requested locale tag; normalized here, so a caller may
 * pass whatever the shell reports.
 * @returns counts plus one group per category, each holding its pending assets.
 */
function readAerials(root, rawLang) {
  const lang = aerialLanguage(rawLang);
  const entriesPath = join(root, AERIAL_ENTRIES_REL);
  let signature;
  try {
    const stat = statSync(entriesPath);
    signature = `${stat.mtimeMs}:${stat.size}:${lang}`;
  } catch {
    return emptyAerials(lang);
  }
  const now = Date.now();
  if (aerialCache.value !== null && aerialCache.signature === signature && now - aerialCache.at < AERIAL_TTL_MS) {
    return aerialCache.value;
  }

  let document;
  try {
    document = JSON.parse(readFileSync(entriesPath, "utf8"));
  } catch {
    return emptyAerials(lang);
  }
  const assets = Array.isArray(document?.assets) ? document.assets : [];
  const categories = Array.isArray(document?.categories) ? document.categories : [];
  const names = readLocaleTable(join(root, AERIAL_STRINGS_REL), lang);
  const label = (key, fallback) => {
    if (typeof key !== "string" || key === "") return fallback;
    const value = names?.[key];
    return typeof value === "string" && value !== "" ? value : fallback;
  };

  const subcategoryKeys = new Map();
  const buckets = [];
  for (const category of categories) {
    const id = String(category?.id ?? "");
    if (id === "") continue;
    for (const sub of Array.isArray(category?.subcategories) ? category.subcategories : []) {
      if (typeof sub?.id === "string" && typeof sub?.localizedNameKey === "string") {
        subcategoryKeys.set(sub.id, sub.localizedNameKey);
      }
    }
    const fallback = AERIAL_CATEGORY_FALLBACK[category?.localizedNameKey];
    const base = fallback === undefined
      ? String(category?.localizedNameKey ?? "")
      : lang === "en"
        ? fallback.en
        : fallback.zh;
    buckets.push({
      id,
      key: String(category?.localizedNameKey ?? ""),
      name: label(category?.localizedNameKey, base),
      order: typeof category?.preferredOrder === "number" ? category.preferredOrder : 0,
      items: [],
    });
  }
  const byCategory = new Map(buckets.map((bucket) => [bucket.id, bucket]));
  const videosDir = join(root, AERIAL_VIDEOS_DIR);
  const thumbsDir = join(root, AERIAL_THUMBS_DIR);

  let downloaded = 0;
  /* Pending counts every asset the Mac lacks, independently of which category
     bucket it lands in: an asset whose category is unknown still exists, and
     `downloaded + pending === total` is the arithmetic the panel promises. */
  let pending = 0;
  for (const asset of assets) {
    const id = String(asset?.id ?? "");
    if (id === "") continue;
    if (existsSync(join(videosDir, `${id}.mov`))) {
      downloaded += 1;
      continue;
    }
    pending += 1;
    const shot = String(asset?.shotID ?? "");
    const subId = Array.isArray(asset?.subcategories) ? asset.subcategories[0] : undefined;
    const sceneKey = subId === undefined ? undefined : subcategoryKeys.get(String(subId));
    const item = {
      id,
      shot,
      name: label(asset?.localizedNameKey, String(asset?.accessibilityLabel ?? shot)),
      original: String(asset?.accessibilityLabel ?? ""),
      scene: sceneKey === undefined ? "" : label(sceneKey, ""),
      order: typeof asset?.preferredOrder === "number" ? asset.preferredOrder : 0,
      thumb: existsSync(join(thumbsDir, `${id}.png`)),
    };
    for (const categoryId of Array.isArray(asset?.categories) ? asset.categories : []) {
      const bucket = byCategory.get(String(categoryId));
      if (bucket === undefined) continue;
      bucket.items.push(item);
      break;
    }
  }

  const groups = buckets
    .filter((bucket) => bucket.items.length > 0)
    .sort((left, right) => left.order - right.order);
  for (const group of groups) {
    group.items.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "zh"));
  }
  const value = { available: true, total: assets.length, downloaded, pending, lang, groups };
  aerialCache = { signature, at: now, value };
  return value;
}

/* ── HTTP helpers ────────────────────────────────────────────────────────── */

/** Write one JSON response. */
function writeJson(res, status, body, extraHeaders) {
  const payload = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(payload.byteLength),
    "cache-control": "no-store",
    ...(extraHeaders ?? {}),
  });
  res.end(payload);
}

/**
 * Same-origin fence for writes: this API mutates files under the user's home,
 * so a cross-site page must not be able to drive it. A request without any
 * origin signal (curl, a test) is allowed — it is not a browser.
 */
function requireSameOrigin(req) {
  const site = req.headers["sec-fetch-site"];
  if (typeof site === "string" && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.origin;
  if (typeof origin !== "string" || origin === "") return true;
  const host = req.headers.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Read a request body as bytes, with a hard cap: an imported picture is the
 * one body this plugin accepts that is measured in megabytes, and the cap is
 * what keeps a mis-aimed upload from filling the disk. `tooLarge` marks the
 * overflow so the caller can answer 413 instead of a generic 400.
 */
function readBinaryBody(req, maxBytes = IMPORT_MAX_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        const error = new Error("body too large");
        error.tooLarge = true;
        reject(error);
        if (typeof req.destroy === "function") req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Read a JSON body with a hard cap. */
function readJsonBody(req, maxBytes = 16_384) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

/* ── routes ──────────────────────────────────────────────────────────────── */

/**
 * Build this plugin's route table.
 * @param deps - injectable seams for the offline tests.
 * @returns the route descriptors to hand to `ctx.webServer.register`.
 */
export function makeAppearanceRoutes(deps = {}) {
  const env = deps.env ?? process.env;
  const skinRoot = deps.skinRoot ?? resolveSkinRoot(env);
  const aerialRoot = deps.aerialRoot ?? resolveAerialRoot(env);
  const openSettings = deps.openSettings ?? ((url) => execFileAsync("/usr/bin/open", [url]));
  const importRoot = deps.importRoot ?? resolveImportRoot(env);
  const importMaxBytes = typeof deps.importMaxBytes === "number" && deps.importMaxBytes > 0 ? deps.importMaxBytes : IMPORT_MAX_BYTES;
  const runExportImpl = deps.runExport ?? runExport;
  const log = typeof deps.log === "function" ? deps.log : () => {};

  /**
   * Run one mutating task at a time, per skin root.
   *
   * Import, remove and restore all read-modify-write the same two documents
   * (`.removed.json` and the library) and all shell out to the same export, so
   * two overlapping requests would interleave those steps — losing a removal
   * record, or diffing the catalogue against a state that moved under it. The
   * panel is serial; this queue only ever holds a second window's or a retry's
   * work.
   * @param key - the resource the tasks contend for (the skin root).
   * @param task - the critical section.
   * @returns the task's own result.
   */
  const mutationChains = new Map();
  const serialize = (key, task) => {
    const previous = mutationChains.get(key) ?? Promise.resolve();
    const run = previous.then(task, task);
    mutationChains.set(key, run.then(() => undefined, () => undefined));
    return run;
  };

  /**
   * The catalogue as the panel reads it.
   *
   * One builder for every answer that carries a catalogue — the read route and
   * both mutations — so a delete cannot come back with a payload shaped
   * differently from a plain load. `removed` rides along because the panel
   * draws its "removed" strip from the same response that draws the grid.
   * @param lang - the page's language, for the aerial sub-group names.
   */
  const catalogPayload = (lang) => {
    const catalog = readCatalog(skinRoot);
    return {
      ok: true,
      version: catalog.version ?? 1,
      built: catalog.built === true,
      generatedAt: catalog.generatedAt ?? null,
      storage: skinRoot,
      activeSkin: readActiveSkinId(env),
      groups: catalog.groups,
      wallpapers: catalog.wallpapers,
      removed: readRemovedList(skinRoot),
      aerials: readAerials(aerialRoot, lang),
      diagnostics: catalog.diagnostics ?? [],
    };
  };

  const catalogHandler = (req, res) => {
    const params = new URL(req?.url ?? "/", "http://x").searchParams;
    writeJson(res, 200, catalogPayload(aerialLanguage(params.get("lang"))));
  };

  const statusHandler = (_req, res) => {
    const catalog = readCatalog(skinRoot);
    const activeSkin = readActiveSkinId(env);
    const active = catalog.wallpapers.find((entry) => entry.skin === activeSkin) ?? null;
    writeJson(res, 200, {
      ok: true,
      built: catalog.built === true,
      storage: skinRoot,
      activeSkin,
      activeWallpaperId: active?.id ?? null,
      count: catalog.wallpapers.length,
    });
  };

  const previewHandler = (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const id = url.searchParams.get("wallpaper") ?? "";
    const requestedSize = url.searchParams.get("size") ?? "thumb";
    const candidates = PREVIEW_SIZES[requestedSize] ?? PREVIEW_SIZES.thumb;
    const catalog = readCatalog(skinRoot);
    const entry = catalog.wallpapers.find((item) => item.id === id);
    if (entry === undefined) {
      writeJson(res, 404, { ok: false, error: "wallpaper-not-found" });
      return;
    }
    const skinDir = join(skinRoot, entry.skin);
    const rel = candidates.map((candidate) => join(skinDir, candidate)).find((candidate) => existsSync(candidate));
    if (rel === undefined) {
      writeJson(res, 404, { ok: false, error: "preview-not-found" });
      return;
    }
    let byteLength;
    try {
      const stat = statSync(rel);
      if (!stat.isFile()) throw new Error("not a file");
      byteLength = stat.size;
    } catch {
      writeJson(res, 404, { ok: false, error: "preview-not-found" });
      return;
    }
    // The bytes are content-addressed by the export (a re-export rewrites the
    // file under a new mtime), so a short private cache is both correct and
    // what keeps 35 tiles off the disk on every panel open.
    res.writeHead(200, {
      "content-type": "image/jpeg",
      "content-length": String(byteLength),
      "cache-control": "private, max-age=300",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(rel);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  };

  const applyHandler = async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin" });
      return;
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      writeJson(res, 400, { ok: false, error: "invalid-body" });
      return;
    }
    const id = typeof body?.id === "string" ? body.id : "";
    const catalog = readCatalog(skinRoot);
    const entry = catalog.wallpapers.find((item) => item.id === id);
    if (entry === undefined) {
      writeJson(res, 404, { ok: false, error: "wallpaper-not-found" });
      return;
    }
    try {
      const activeSkin = writeActiveSkinId(entry.skin, env);
      writeJson(res, 200, { ok: true, id: entry.id, skin: entry.skin, activeSkin });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: "apply-failed", detail: String(error?.message ?? error) });
    }
  };

  /**
   * Geometry diagnostics sink. The sidebar panel posts what the live shell
   * actually measures -- composer position, scrollport padding, the resting
   * distance between the last transcript row and the input box -- and this
   * handler writes it to disk so a run can be inspected without asking anyone
   * to open devtools. It returns no data and reads no state: it is a
   * write-only tap, and the file it writes is not part of the catalog.
   */
  const probeHandler = async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin" });
      return;
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      writeJson(res, 400, { ok: false, error: "invalid-body" });
      return;
    }
    const target = join(skinRoot, "..", "appearance-library-probe.json");
    try {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, `${JSON.stringify({ receivedAt: new Date().toISOString(), body }, null, 2)}\n`, "utf8");
      writeJson(res, 200, { ok: true });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: "probe-write-failed", detail: String(error?.message ?? error) });
    }
  };

  /**
   * One offline thumbnail from Apple's own cache: the PNGs ship beside the
   * manifest, so the pending grid costs the system nothing to draw.
   */
  const aerialPreviewHandler = (req, res) => {
    const id = new URL(req.url ?? "/", "http://x").searchParams.get("id") ?? "";
    if (/^[A-Za-z0-9-]{1,64}$/.test(id) === false) {
      writeJson(res, 400, { ok: false, error: "invalid-id" });
      return;
    }
    const file = join(aerialRoot, AERIAL_THUMBS_DIR, `${id}.png`);
    let byteLength;
    try {
      const stat = statSync(file);
      if (stat.isFile() === false) throw new Error("not a file");
      byteLength = stat.size;
    } catch {
      writeJson(res, 404, { ok: false, error: "aerial-thumbnail-not-found" });
      return;
    }
    res.writeHead(200, {
      "content-type": "image/png",
      "content-length": String(byteLength),
      "cache-control": "private, max-age=300",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(file);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  };

  /**
   * Open Settings → Wallpaper.
   *
   * There is no public API that downloads an aerial, so the panel hands the
   * user to the surface that owns the download instead of pretending to do it.
   * This is the only side-effecting route in the table and it runs only on an
   * explicit click.
   */
  const openSettingsHandler = async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin" });
      return;
    }
    try {
      await openSettings(WALLPAPER_SETTINGS_URL);
      writeJson(res, 200, { ok: true, url: WALLPAPER_SETTINGS_URL });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: "open-failed", detail: String(error?.message ?? error) });
    }
  };

  /**
   * Take one picture from the page and turn it into a wallpaper.
   *
   * Two writes happen here, in this order:
   *
   *  1. the picture is stored under the DSH home, in a folder named after its
   *     own bytes, so importing the same file twice is one file on disk and
   *     the export's source file stops being the user's to lose;
   *  2. the export runs with `--file`, which encodes the three tiers, writes the
   *     skin and rebuilds the catalogue. Nothing here reimplements the pipeline:
   *     the panel and a terminal produce byte-identical skins, and a wallpaper
   *     imported this way can be re-exported by hand later.
   *
   * The bytes are the request body and the picture's name is a query parameter,
   * because the name is the label the skin will carry, not something to guess
   * from a content type. POST-only and same-origin fenced: this route writes
   * inside the user's home.
   */
  /**
   * The crop rectangle the panel framed, as `x,y,w,h` in fractions of the source.
   *
   * It is handed straight to the export, which is the side that owns pixels;
   * this only keeps a malformed query out of an argument parser. Anything that
   * is not four sane fractions reads as "no crop" — the whole-picture
   * behaviour every earlier version had.
   * @returns the rectangle as a normalized string, or null.
   */
  function normalizeCrop(value) {
    if (typeof value !== "string" || value === "") return null;
    const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length !== 4 || parts.some((number) => Number.isFinite(number) === false)) return null;
    const [x, y, w, h] = parts;
    if (w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > 1.0001 || y + h > 1.0001) return null;
    return `${x},${y},${w},${h}`;
  }

  const importHandler = async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin" });
      return;
    }
    let bytes;
    try {
      bytes = await readBinaryBody(req, importMaxBytes);
    } catch (error) {
      const tooLarge = error?.tooLarge === true;
      writeJson(res, tooLarge ? 413 : 400, { ok: false, error: tooLarge ? "too-large" : "invalid-body", limit: importMaxBytes });
      return;
    }
    const format = sniffImage(bytes);
    if (format === null) {
      writeJson(res, 400, { ok: false, error: "unsupported-format", accepts: IMPORT_ACCEPTS });
      return;
    }
    const params = new URL(req.url ?? "/", "http://x").searchParams;
    const stem = safeImageStem(params.get("name"));
    // The framing the panel chose, before the picture was uploaded.
    const crop = normalizeCrop(params.get("crop"));
    const name = `${stem}.${format.ext}`;
    const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const folder = join(importRoot, digest);
    const stored = join(folder, name);

    // One mutation at a time (see `serialize`): the store, the export and the
    // catalogue diff must not interleave with another import/remove/restore,
    // or the diff reads a catalogue that moved under it.
    await serialize(skinRoot, async () => {
      // The copy lands through a scratch name and a rename, so a picture that
      // was interrupted mid-write is never mistaken for a stored one by the
      // `existsSync` shortcut below.
      let scratch = null;
      try {
        mkdirSync(folder, { recursive: true });
        if (existsSync(stored) === false) {
          scratch = join(folder, `.${name}.${process.pid}.part`);
          writeFileSync(scratch, bytes);
          renameSync(scratch, stored);
          scratch = null;
        }
      } catch (error) {
        if (scratch !== null) rmSync(scratch, { force: true });
        writeJson(res, 500, { ok: false, error: "store-failed", detail: String(error?.message ?? error) });
        return;
      }

      // Which custom skins existed before the run: the imported one is the id
      // that was not there, rather than a guess at the title a reader sees.
      const before = new Set(
        readCatalog(skinRoot)
          .wallpapers.filter((entry) => entry.cluster === "custom")
          .map((entry) => entry.id),
      );
      try {
        await runExportImpl(crop === null ? ["--file", stored] : ["--file", stored, "--crop", crop]);
      } catch (error) {
        const detail = String(error?.stderr ?? error?.message ?? error).trim().split("\n").slice(-3).join(" ");
        log(`[appearance-library] import failed for "${name}": ${detail}`);
        writeJson(res, 500, { ok: false, error: "export-failed", detail });
        return;
      }
      const catalog = readCatalog(skinRoot);
      const customs = catalog.wallpapers.filter((entry) => entry.cluster === "custom");
      // A second import of the same picture rewrites the very same skin, so no
      // new id turns up: fall back to the manifest's own record of where its
      // picture came from, then to the label with the spacing flattened — the
      // export tidies "我的 照片" into "我的照片".
      const tight = (value) => String(value ?? "").replace(/\s+/g, "").toLowerCase();
      const entry =
        customs.find((item) => before.has(item.id) === false) ??
        customs.find((item) => item.source === stored) ??
        customs.find((item) => tight(item.name) === tight(stem)) ??
        null;
      if (entry === null) {
        log(`[appearance-library] the export ran but produced no skin for "${name}"`);
        writeJson(res, 500, { ok: false, error: "export-produced-nothing", name });
        return;
      }
      writeJson(res, 200, {
        ok: true,
        imported: {
          id: entry.id,
          skin: entry.skin,
          name: entry.nameZh,
          kind: entry.kind,
          bytes: entry.bytes,
          stored,
        },
        count: catalog.wallpapers.length,
      });
    });
  };

  /**
   * Remove one wallpaper from the library.
   *
   * What is deleted is a skin directory this plugin authored under the skin
   * root. Apple's own asset is never touched — it is read-only and system
   * protected; what goes away is our exported copy, which the panel can bring
   * back from the removal record.
   *
   * Three guards, each protecting something different:
   *
   *  1. the id must start with `wl-` and match the manifest id rule, so a
   *     malformed body can never address a path outside the skin root;
   *  2. the manifest must be one of ours — tagged `wallpaper`, with a usable
   *     background layer — so no other skin that happens to live in the same
   *     root is ever deleted;
   *  3. the skin must not be the one in use. Deleting the active skin would
   *     leave the desktop pointing at a directory that no longer exists; the
   *     user is asked to switch first, which is one click away.
   *
   * The record is written after the deletion succeeds, never before: a crash
   * between the two loses the removal (the next export restores the skin)
   * instead of leaving a record for a deletion that never happened.
   */
  const removeHandler = async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin" });
      return;
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      writeJson(res, 400, { ok: false, error: "invalid-body" });
      return;
    }
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (SKIN_ID_PATTERN.test(id) === false || id.startsWith(SKIN_PREFIX) === false) {
      writeJson(res, 400, { ok: false, error: "invalid-id" });
      return;
    }
    const lang = aerialLanguage(new URL(req.url ?? "/", "http://x").searchParams.get("lang"));

    await serialize(skinRoot, async () => {
      const dir = join(skinRoot, id);
      let manifest;
      try {
        manifest = JSON.parse(readFileSync(join(dir, "skin.json"), "utf8"));
      } catch {
        writeJson(res, 404, { ok: false, error: "wallpaper-not-found" });
        return;
      }
      const tags = Array.isArray(manifest?.tags) ? manifest.tags : [];
      if (tags.includes("wallpaper") === false) {
        writeJson(res, 409, { ok: false, error: "not-a-wallpaper" });
        return;
      }
      if (readActiveSkinId(env) === id) {
        writeJson(res, 409, { ok: false, error: "in-use" });
        return;
      }
      const entry = readCatalog(skinRoot).wallpapers.find((item) => item.id === id) ?? null;
      const record = {
        id,
        nameZh: entry?.nameZh ?? (typeof manifest?.name === "string" ? manifest.name : id),
        name: entry?.name ?? (typeof manifest?.nameEn === "string" ? manifest.nameEn : id),
        cluster: entry?.cluster ?? "custom",
        kind: entry?.kind === "video" ? "video" : "image",
        source: entry?.source ?? null,
        bytes: entry?.bytes ?? null,
        removedAt: new Date().toISOString(),
      };
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        writeJson(res, 500, { ok: false, error: "remove-failed", detail: String(error?.message ?? error) });
        return;
      }
      writeRemovedList(skinRoot, [...readRemovedList(skinRoot).filter((item) => item.id !== id), record]);

      // The catalogue file is the export's, so the export rebuilds it — with the
      // record in place, so the rebuild cannot bring the skin back. A failure
      // here is reported but does not undo the removal: the directory is gone and
      // the read path scans the disk, so the panel is already correct.
      let detail = null;
      try {
        await runExportImpl(["--catalog-only"]);
      } catch (error) {
        detail = String(error?.stderr ?? error?.message ?? error).trim().split("\n").slice(-3).join(" ");
        log(`[appearance-library] catalogue rebuild failed after removing "${id}": ${detail}`);
      }
      writeJson(res, 200, {
        ...catalogPayload(lang),
        changed: { removed: id, nameZh: record.nameZh },
        catalogRebuilt: detail === null,
        ...(detail === null ? {} : { detail }),
      });
    });
  };

  /**
   * Bring a removed wallpaper back.
   *
   * The export runs again for exactly this id: `--ids` for a wallpaper that
   * came from this Mac — a name filter would drag its neighbours back with it —
   * and `--file <inbox copy>` for an imported picture, which is the only
   * source the export still knows about.
   *
   * The record is dropped only for the length of the run. If the export fails
   * it is put back, so a failed restore leaves the library exactly as it was.
   */
  const restoreHandler = async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin" });
      return;
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      writeJson(res, 400, { ok: false, error: "invalid-body" });
      return;
    }
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (SKIN_ID_PATTERN.test(id) === false) {
      writeJson(res, 400, { ok: false, error: "invalid-id" });
      return;
    }
    const lang = aerialLanguage(new URL(req.url ?? "/", "http://x").searchParams.get("lang"));

    await serialize(skinRoot, async () => {
      const list = readRemovedList(skinRoot);
      const record = list.find((item) => item.id === id) ?? null;
      if (record === null) {
        writeJson(res, 404, { ok: false, error: "not-removed" });
        return;
      }
      let args;
      if (record.cluster === "custom") {
        if (record.source === null || existsSync(record.source) === false) {
          writeJson(res, 409, { ok: false, error: "source-gone" });
          return;
        }
        args = ["--file", record.source];
      } else {
        args = ["--ids", id];
      }
      writeRemovedList(skinRoot, list.filter((item) => item.id !== id));
      try {
        await runExportImpl(args);
      } catch (error) {
        writeRemovedList(skinRoot, list);
        const detail = String(error?.stderr ?? error?.message ?? error).trim().split("\n").slice(-3).join(" ");
        log(`[appearance-library] restore of "${id}" failed: ${detail}`);
        writeJson(res, 500, { ok: false, error: "export-failed", detail });
        return;
      }
      const back = readCatalog(skinRoot).wallpapers;
      const restored = record.cluster === "custom" ? back.some((item) => item.source === record.source) : back.some((item) => item.id === id);
      if (restored === false) {
        writeRemovedList(skinRoot, list);
        log(`[appearance-library] the export ran but "${id}" did not come back`);
        writeJson(res, 500, { ok: false, error: "export-produced-nothing" });
        return;
      }
      writeJson(res, 200, { ...catalogPayload(lang), changed: { restored: id, nameZh: record.nameZh } });
    });
  };

  /**
   * Turn the loop seam on or off for one film.
   *
   * The seam is how the one exported file was cut, not a second asset, so the
   * first flip in either direction waits for ffmpeg. The cut that is not
   * playing is kept beside the film, though, so every later flip is two renames
   * and answers immediately — and a failure puts both the preference and the
   * film back the way they were: the panel's switch and the file on disk cannot
   * end up disagreeing, which the next export would otherwise make permanent.
   */
  const seamHandler = async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin" });
      return;
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      writeJson(res, 400, { ok: false, error: "invalid-body" });
      return;
    }
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (SKIN_ID_PATTERN.test(id) === false) {
      writeJson(res, 400, { ok: false, error: "invalid-id" });
      return;
    }
    const enabled = body?.enabled === true;
    const lang = aerialLanguage(new URL(req.url ?? "/", "http://x").searchParams.get("lang"));

    await serialize(skinRoot, async () => {
      const entry = readCatalog(skinRoot).wallpapers.find((item) => item.id === id) ?? null;
      if (entry === null) {
        writeJson(res, 404, { ok: false, error: "not-in-library" });
        return;
      }
      if (entry.kind !== "video") {
        writeJson(res, 409, { ok: false, error: "not-a-film" });
        return;
      }
      const before = readLoopSeamList(skinRoot);
      if (before.includes(id) === enabled) {
        writeJson(res, 200, { ...catalogPayload(lang), changed: null });
        return;
      }
      const film = filmAssetPath(skinRoot, id);
      if (film === null || !existsSync(film)) {
        writeJson(res, 404, { ok: false, error: "film-missing" });
        return;
      }
      // Only the cut that is not playing is kept, so the two names are roles:
      // `from` is the cut this flip wants and `to` is the name the cut on screen
      // takes over once it stops playing.
      const from = `${film}${enabled ? FILM_CACHE_SUFFIX.seam : FILM_CACHE_SUFFIX.plain}`;
      const to = `${film}${enabled ? FILM_CACHE_SUFFIX.plain : FILM_CACHE_SUFFIX.seam}`;
      const next = enabled ? [...before, id] : before.filter((item) => item !== id);
      if (existsSync(from)) {
        // Both cuts are already on disk: two renames, no bytes move, and the
        // switch answers as fast as the file system can do that.
        try {
          renameSync(film, to);
          renameSync(from, film);
        } catch (error) {
          log(`[appearance-library] could not swap the cached cut of "${id}": ${error?.message ?? error}`);
          writeJson(res, 500, { ok: false, error: "cache-failed" });
          return;
        }
        writeLoopSeamList(skinRoot, next);
        writeJson(res, 200, { ...catalogPayload(lang), changed: { seamLoop: id, enabled } });
        return;
      }
      // First time this direction is asked for. The playing cut is moved aside
      // first: it is what the next flip back will restore, and it is also the
      // way back if the encode dies with the film half-written.
      try {
        renameSync(film, to);
      } catch (error) {
        log(`[appearance-library] could not bank the current cut of "${id}": ${error?.message ?? error}`);
        writeJson(res, 500, { ok: false, error: "cache-failed" });
        return;
      }
      writeLoopSeamList(skinRoot, next);
      try {
        // The cut is a full re-encode of a 4K 240 fps source, which is minutes
        // of ffmpeg, not seconds: the default budget is for a catalogue pass
        // and would time out a real seam and leave the file half-written.
        await runExportImpl(["--ids", id, "--force"], { timeoutMs: 30 * 60_000 });
      } catch (error) {
        writeLoopSeamList(skinRoot, before);
        try {
          renameSync(to, film);
        } catch {
          // The banked cut is gone too, so the panel and the film disagree,
          // which the next export settles.
        }
        const detail = String(error?.stderr ?? error?.message ?? error).trim().split("\n").slice(-3).join(" ");
        log(`[appearance-library] loop seam for "${id}" failed: ${detail}`);
        writeJson(res, 500, { ok: false, error: "export-failed", detail });
        return;
      }
      writeJson(res, 200, { ...catalogPayload(lang), changed: { seamLoop: id, enabled } });
    });
  };

  return [
    { kind: "exact", path: `${API_PREFIX}/catalog`, handler: catalogHandler },
    { kind: "exact", path: `${API_PREFIX}/status`, handler: statusHandler },
    { kind: "exact", path: `${API_PREFIX}/preview`, handler: previewHandler },
    { kind: "exact", path: `${API_PREFIX}/aerial-preview`, handler: aerialPreviewHandler },
    { kind: "exact", path: `${API_PREFIX}/open-wallpaper-settings`, handler: openSettingsHandler },
    { kind: "exact", path: `${API_PREFIX}/import`, handler: importHandler },
    { kind: "exact", path: `${API_PREFIX}/remove`, handler: removeHandler },
    { kind: "exact", path: `${API_PREFIX}/restore`, handler: restoreHandler },
    { kind: "exact", path: `${API_PREFIX}/seam-loop`, handler: seamHandler },
    { kind: "exact", path: `${API_PREFIX}/apply`, handler: applyHandler },
    { kind: "exact", path: `${API_PREFIX}/probe`, handler: probeHandler },
  ];
}

/** Absolute path of the export script shipped beside this plugin. */
export function exportScriptPath() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "export-wallpapers.mjs");
}

/**
 * Run the export pipeline in this process (used by the offline tests and by a
 * hand-run `node scripts/export-wallpapers.mjs`).
 * @param args - extra CLI arguments.
 * @returns the child process stdout.
 */
export async function runExport(args = [], options = {}) {
  // The host this runs in is an Electron process (the Desktop app forks its
  // Host as an Electron utility process), so `process.execPath` is the Electron
  // binary: spawning it without ELECTRON_RUN_AS_NODE re-enters the GUI — the
  // app hits its single-instance lock and quits with status 0 — instead of
  // running the script. This is the same convention dsh-web-app and
  // dsh-subprocess-local use for their Node children.
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
  const { stdout } = await execFileAsync(process.execPath, [exportScriptPath(), ...args], {
    env,
    // An imported picture is one still, so the run is seconds; the bound is
    // there for the case where the same call also picks up a changed film.
    timeout: typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : 600_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  // The export always prints a header and a count, so a silent status-0 exit
  // means the child never ran the script — fail loudly rather than reporting a
  // run that changed nothing.
  if (String(stdout).trim() === "") {
    throw new Error("the export produced no output — the child did not run as Node (ELECTRON_RUN_AS_NODE)");
  }
  return stdout;
}

/* ── plugin ──────────────────────────────────────────────────────────────── */

/**
 * Mount the routes and report whether the sidebar panel reached the web boot
 * graph.
 *
 * Both halves ask for their service through `ctx.inject`, never by reading it
 * off the plugin context directly: cordis refuses an undeclared service read
 * with `cannot get property "…" without inject`, and because this plugin must
 * never take the GUI down with it, that refusal used to be logged as a warning
 * and swallowed — the routes simply were not there. Injecting is what makes the
 * read legal, and it also means the callback only runs once the service exists.
 *
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  try {
    ctx.inject(["webServer"], (webCtx) => {
      // Mutation failures are reported to the panel as codes; they also belong
      // in the host log, which is the only place a failed export can be read
      // after the toast is gone.
      const routes = makeAppearanceRoutes({ log: (line) => webCtx.logger.warn(line) });
      webCtx.effect(() => {
        const disposers = routes.map((route) => webCtx.webServer.register(route));
        return () => {
          for (const dispose of disposers) dispose();
        };
      }, "appearance-library: API routes");
      // Concatenated rather than `%d`/`%s`: this logger takes the message as it
      // finds it and does not substitute format specifiers, so a placeholder
      // would reach the log verbatim.
      webCtx.logger.info(`[appearance-library] ${routes.length} API routes mounted under ${API_PREFIX}`);
    });
  } catch (error) {
    ctx.logger.warn("[appearance-library] route registration failed: %s", String(error));
  }

  try {
    ctx.inject(["clientModules"], (clientCtx) => {
      const registry = clientCtx.clientModules;
      if (registry === undefined || typeof registry.graph !== "function") return;
      let settled = false;
      let unsubscribe;
      let deadline;
      const finish = (report) => {
        if (settled) return;
        settled = true;
        if (unsubscribe !== undefined) unsubscribe();
        clearTimeout(deadline);
        report();
      };
      const check = () => {
        if (settled) return;
        let entries;
        try {
          entries = registry.graph()?.entries ?? [];
        } catch (error) {
          finish(() => ctx.logger.warn("[appearance-library] could not read the web boot graph: %s", String(error)));
          return;
        }
        if (!entries.some((entry) => entry?.id === PACKAGE_NAME)) return;
        finish(() => ctx.logger.info("[appearance-library] sidebar panel is composed into the web boot graph"));
      };
      unsubscribe = typeof registry.onGraphChanged === "function" ? registry.onGraphChanged(check) : undefined;
      deadline = setTimeout(() => {
        finish(() => {
          ctx.logger.warn(
            "[appearance-library] the sidebar panel never reached the web boot graph; the row stays hidden until the Host composes it (check this package's dsh.client declaration and exports[\"./client\"])",
          );
        });
      }, GRAPH_DEADLINE_MS);
      if (typeof deadline?.unref === "function") deadline.unref();
      ctx.effect(() => () => {
        settled = true;
        if (unsubscribe !== undefined) unsubscribe();
        clearTimeout(deadline);
      }, "appearance-library: boot-graph self-check");
      check();
    });
  } catch (error) {
    ctx.logger.warn("[appearance-library] boot-graph self-check unavailable: %s", String(error));
  }
}

/** Exposed for this package's offline tests; the Loader ignores unknown exports. */
export const __internals = {
  PACKAGE_NAME,
  API_PREFIX,
  SKIN_PREFIX,
  CATALOG_FILENAME,
  resolveHarnessHome,
  resolveSkinRoot,
  resolveActiveStatePath,
  resolveAerialRoot,
  resolveImportRoot,
  sniffImage,
  safeImageStem,
  readBinaryBody,
  IMPORT_MAX_BYTES,
  IMPORT_ACCEPTS,
  readCatalog,
  readAerials,
  aerialLanguage,
  readActiveSkinId,
  writeActiveSkinId,
  readRemovedList,
  writeRemovedList,
  REMOVED_FILENAME,
  readLoopSeamList,
  writeLoopSeamList,
  LOOP_SEAM_FILENAME,
  SKIN_ID_PATTERN,
  requireSameOrigin,
  readJsonBody,
  makeAppearanceRoutes,
};
