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

import { execFile, execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// The boot splash used to be a second profile-local plugin with its own mount
// and its own route prefix. It is now a module of this package: one plugin, one
// row in the plugin library, one boot graph entry — while the splash keeps its
// own assets, config file and diagnostics so it can be reasoned about alone.
import { apply as applyStartupSplash } from "./startup/boot.js";

const execFileAsync = promisify(execFile);

/** This package's manifest name — the loader id and the client module identity. */
const PACKAGE_NAME = "muciya-dsh-plugin-appearance-library";

/** Every HTTP path this plugin owns lives under one prefix. */
const API_PREFIX = "/api/muciya-appearance/v1";

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
 * `thumb` is the grid tile (320 px), `preview` the 1080 catalogue still the
 * grid's readable form asks for, and `full` the exported wallpaper itself
 * (long edge 2560) that the detail drawer shows at a size worth looking at.
 *
 * A film has no still at `full` — its media is the MP4 — so the list falls
 * back to the poster frame instead of 404ing.
 */
const PREVIEW_SIZES = {
  thumb: ["thumb/wallpaper.jpg", "preview/wallpaper.jpg"],
  preview: PREVIEW_CANDIDATES,
  full: ["assets/wallpaper.jpg", ...PREVIEW_CANDIDATES],
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

/**
 * The light/dark desktop pair, which Settings files under `dynamic-aerials`.
 *
 * The pane never shelves it, so neither does the panel: four near-identical
 * names in a group of their own would be the one category Settings does not
 * have. Its assets are left out of `total` as well, or the header would count
 * films that no shelf can hold.
 */
const AERIAL_HIDDEN_CATEGORY = "dynamic-aerials";

/** Category labels for the case where Apple's string table cannot be read. */
const AERIAL_CATEGORY_FALLBACK = {
  AerialCategoryLandscapes: { zh: "自然景观", en: "Landscape" },
  AerialCategoryCities: { zh: "城市景观", en: "Cityscape" },
  AerialCategoryUnderwater: { zh: "水下景观", en: "Underwater" },
  AerialCategorySpace: { zh: "地球", en: "Earth" },
  AerialCategoryMac: { zh: "Mac", en: "Mac" },
};

/* ── dynamic wallpapers ──────────────────────────────────────────────────── */

/**
 * Settings' "动态壁纸" set — the 35 items the pane shows above the aerials.
 *
 * Two kinds of item, and the difference matters to the panel:
 *
 *  - 30 `.madesktop` files in Desktop Pictures. Each is a tiny plist whose
 *    `isDynamic` flag marks it as a light/dark (and, for the solar ones,
 *    time-of-day) set, and whose `thumbnailPath` points at a 214 × 130 HEIC
 *    still shipped beside it.
 *  - 5 wallpapers macOS 26 draws from an ExtensionKit appex: Golden Gate
 *    (a film), Tahoe and Sonoma (6016² HEICs) and Sequoia / Macintosh (3-D
 *    scenes assembled from USDZ meshes). Only the first three can become a
 *    skin; the scenes are rendered live by the system and have no single
 *    image to export.
 *
 * Unlike the aerials, nothing here is a download: every bundle ships with the
 * system, so all 35 are always present. `kind` carries the export answer.
 */
const DYNAMIC_PICTURES_DIR = "/System/Library/Desktop Pictures";

/** Cache for the PNG derivatives of the HEIC stills the panel draws. */
const DYNAMIC_CACHE_DIR = join(homedir(), "Library", "Caches", "dsh-appearance-library", "dynamic-thumbs");

/** How long the parsed dynamic inventory is reused before the disk is re-read. */
const DYNAMIC_TTL_MS = 5 * 60_000;

/**
 * The five non-bundle wallpapers, in the order Settings lists them.
 *
 * `kind` is the panel's answer to "can this become a skin?": `video` and
 * `image` can, `scene` cannot — Apple renders those from USDZ meshes and
 * lighting EXRs, and there is no still frame that *is* the wallpaper.
 */
const DYNAMIC_EXTRAS = [
  {
    id: "ext-golden-gate",
    name: "金门海峡",
    nameEn: "Golden Gate",
    kind: "video",
    file: "/System/Library/Wallpapers/.default/Golden Gate.mov",
  },
  {
    id: "ext-tahoe",
    name: "太浩湖",
    nameEn: "Tahoe",
    kind: "image",
    file: "/System/Library/ExtensionKit/Extensions/NeptuneOneWallpaper.appex/Contents/Resources/TahoeLight.heic",
  },
  {
    id: "ext-sequoia",
    name: "红杉",
    nameEn: "Sequoia",
    kind: "scene",
    file: "/System/Library/ExtensionKit/Extensions/WallpaperSequoiaExtension.appex",
  },
  {
    id: "ext-macintosh",
    name: "Macintosh",
    nameEn: "Macintosh",
    kind: "scene",
    file: "/System/Library/ExtensionKit/Extensions/WallpaperMacintoshExtension.appex",
  },
  {
    id: "ext-sonoma",
    name: "索诺马",
    nameEn: "Sonoma",
    kind: "image",
    file: join("/System/Library/Desktop Pictures", "Sonoma.heic"),
  },
];

/** First ffmpeg on this Mac, for sampling a film's first frame as a tile. */
const FFMPEG_BIN = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].find((candidate) => existsSync(candidate)) ?? "ffmpeg";

/** Its sibling probe, for reading a film's real resolution back off the disk. */
const FFPROBE_BIN = ["/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"].find((candidate) => existsSync(candidate)) ?? "ffprobe";

/** The Settings pane that lists aerials; still one click away from the panel. */
const WALLPAPER_SETTINGS_URL = "x-apple.systempreferences:com.apple.Wallpaper-Settings.extension";

/**
 * Where macOS records which wallpaper is in use, beside the aerial collection:
 * `com.apple.wallpaper/Store/Index.plist`, a binary plist whose desktop choice
 * is `{ Provider: com.apple.wallpaper.choice.aerials, Configuration: {assetID} }`.
 *
 * This file — not the presence of a `videos/<assetID>.mov` — is what Settings
 * reports as the current wallpaper, and WallpaperAgent reloads it on launch.
 * Writing it is therefore the only way this panel can *apply* a film it fetched
 * itself; the download just has to land in `videos/` first.
 */
const AERIAL_STORE_DIR = "Store";

/** The file inside that directory; rewritten whole, through a temp + rename. */
const AERIAL_STORE_FILE = "Index.plist";

/** A film in flight lands here first; the rename is what publishes it. */
const AERIAL_PART_SUFFIX = ".part";

/** How long a finished job stays readable by the panel that started it. */
const AERIAL_JOB_TTL_MS = 10 * 60_000;

/**
 * How long the export may take for one film.
 *
 * The film arrives as HEVC 4K 10-bit and the skin it becomes is H.264 1080p, so
 * the export decodes and re-encodes 97 seconds of 4K on one core. Three minutes
 * covered the films measured here; the bound is 45 so a slower machine fails
 * with a message instead of being killed halfway through a good encode.
 */
const AERIAL_EXPORT_TIMEOUT_MS = 45 * 60_000;

/** The one choice the panel rewrites: the desktop, never the screen saver's. */
const AERIAL_DESKTOP_KEY = "Desktop";

/** An asset id, and the only shape this API accepts in an `assetID` slot. */
const AERIAL_UUID = /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/;

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
 * The shelf a wallpaper sits on.
 *
 * macOS files its aerials under five themes — 自然景观 / 城市景观 / 水下景观 /
 * 地球 / Mac — and keeps the light/dark pair in a hidden sixth. Those themes
 * only describe films Apple ships, so this library adds the two families the
 * system has no slot for: abstract graphics, and the Sonoma films the system
 * itself calls 动态桌面. `category` is what the panel groups by; `cluster`
 * still records where a file came from and is what removal/restore keys off.
 */
const CATEGORY_META = {
  landscapes: { nameZh: "自然景观", blurb: "海岸、山脉与森林 — 系统「自然景观」的一支", order: 1 },
  cities: { nameZh: "城市景观", blurb: "城市天际线与地标 — 系统「城市景观」的一支", order: 2 },
  underwater: { nameZh: "水下景观", blurb: "海浪与珊瑚礁 — 系统「水下景观」的一支", order: 3 },
  earth: { nameZh: "地球", blurb: "从太空看地球 — 系统「地球」的一支", order: 4 },
  mac: { nameZh: "Mac", blurb: "Apple 的硬件与系统视觉", order: 5 },
  graphic: { nameZh: "图形与颜色", blurb: "渐变、几何与品牌图形", order: 6 },
  "motion-desktop": { nameZh: "动态桌面", blurb: "随浅色 / 深色变化的桌面影片", order: 7 },
};

/** The tag a manifest carries its shelf in, e.g. `category:landscapes`. */
const CATEGORY_TAG_PREFIX = "category:";

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
  const category = categoryFor(tags, cluster);
  return {
    id: skinId,
    skin: skinId,
    name: typeof manifest.nameEn === "string" && manifest.nameEn !== "" ? manifest.nameEn : skinId,
    nameZh: typeof manifest.name === "string" && manifest.name !== "" ? manifest.name : skinId,
    cluster,
    category,
    kind: layer.type === "video" ? "video" : "image",
    accent: typeof manifest.accent === "string" ? manifest.accent : "#4a5fa8",
    source: readSourcePath(manifest.sourceUrl),
    bytes: sizes,
    order: CATEGORY_META[category]?.order ?? 9,
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
 * What resolution a film file actually has, in pixels.
 *
 * The panel offers "native" and "1080p" as two states, and the only honest
 * source for which one a film is in is the file itself: it is written by the
 * export script (a remux keeps 3840, an encode lands on 1920) and can also be
 * replaced by hand. Probing is therefore the same cost whether the export
 * remembers a preference or not, so it is cached on `mtime` + size — a film
 * only costs one `ffprobe` until something rewrites it.
 *
 * @param path - the film file.
 * @returns the stream height, or null when it cannot be read.
 */
const filmHeightCache = new Map();
function probeFilmSize(path) {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return null;
  }
  const key = `${stat.mtimeMs}:${stat.size}`;
  const hit = filmHeightCache.get(path);
  if (hit !== undefined && hit.key === key) return hit.size;
  let size = null;
  try {
    const out = execFileSync(
      FFPROBE_BIN,
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
      { encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "ignore"] },
    );
    const [width, height] = String(out).trim().split("\n")[0].split(",").map((cell) => Number.parseInt(cell, 10));
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) size = { width, height };
  } catch {
    size = null;
  }
  filmHeightCache.set(path, { key, size });
  return size;
}

/** The film's height alone, for the 4K-or-not comparison the panel asks. */
function probeFilmHeight(path) {
  const size = probeFilmSize(path);
  return size === null ? null : size.height;
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

/**
 * The shelf a skin belongs on, from its manifest tags.
 *
 * A skin exported before categories existed — or one hand-copied into the root
 * — has no `category:` tag, so the source cluster decides as a fallback: the
 * four Apple families land where the system would put them, and anything
 * unrecognised reads as a landscape rather than disappearing from the panel.
 */
function categoryFor(tags, cluster) {
  const tag = tags.find((item) => typeof item === "string" && item.startsWith(CATEGORY_TAG_PREFIX));
  if (tag !== undefined) {
    const key = tag.slice(CATEGORY_TAG_PREFIX.length);
    if (CATEGORY_META[key] !== undefined) return key;
  }
  if (cluster === "desktop-pictures") return "mac";
  if (cluster === "custom") return "graphic";
  return "landscapes";
}

/** Group entries the way the panel renders them. */
function groupEntries(entries) {
  return Object.entries(CATEGORY_META)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, meta]) => ({
      key,
      nameZh: meta.nameZh,
      blurb: meta.blurb,
      order: meta.order,
      ids: entries.filter((entry) => entry.category === key).map((entry) => entry.id),
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
/**
 * Stamp every film entry with the resolution of the file it actually points at.
 *
 * `filmHeight` is the panel's only way to tell “this is the 4K download” from
 * “this was compressed to 1080p”: both are one `wallpaper.mp4`, and the size
 * alone is not a reliable signal. A picture has no height to report.
 * @param skinRoot - the user skin root.
 * @param value - a catalogue document, mutated in place.
 * @returns the same document.
 */
function withFilmHeights(skinRoot, value) {
  for (const entry of value.wallpapers ?? []) {
    if (entry?.kind !== "video") continue;
    const skin = typeof entry.skin === "string" ? entry.skin : entry.id;
    const film = typeof skin === "string" ? filmAssetPath(skinRoot, skin) : null;
    const size = film === null ? null : probeFilmSize(film);
    entry.filmHeight = size === null ? null : size.height;
    entry.filmWidth = size === null ? null : size.width;
    // Whether the *source* film is still on this Mac. A native cut is made from
    // it, so the drawer greys that corner out when it is gone instead of
    // offering an operation that would fail at the first ffmpeg call.
    entry.sourceExists = typeof entry.source === "string" && entry.source !== "" && existsSync(entry.source);
  }
  return value;
}

function readCatalog(skinRoot) {
  const catalogPath = join(skinRoot, CATALOG_FILENAME);
  const now = Date.now();
  const signature = catalogSignature(skinRoot, catalogPath);
  if (catalogCache.value !== null && catalogCache.signature === signature && now - catalogCache.at < CATALOG_TTL_MS) {
    // The catalogue is cached, but the films it points at are not: a compress
    // or a seam cut rewrites one in place and asks for the catalogue back in
    // the same breath. Heights are cheap to refresh (one stat each, `ffprobe`
    // only when the file changed) and they are what tells the panel whether it
    // is looking at a 4K cut or a 1080p one.
    return withFilmHeights(skinRoot, catalogCache.value);
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
  return withFilmHeights(skinRoot, value);
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
 * Inventory the aerials Settings lists, downloaded or not.
 *
 * Three read-only sources: the manifest lists every asset Apple ships together
 * with its category tree, Apple's string table supplies the labels Settings
 * itself shows, and `videos/<assetID>.mov` is the download state — that file's
 * presence is exactly what Settings reports as downloaded.
 *
 * @param root - the aerial collection root.
 * @param rawLang - the requested locale tag; normalized here, so a caller may
 * pass whatever the shell reports.
 * @returns counts plus one group per category, each holding every asset of that
 * category with its own `downloaded` flag.
 */
function readAerials(root, rawLang) {
  const lang = aerialLanguage(rawLang);
  const entriesPath = join(root, AERIAL_ENTRIES_REL);
  let signature;
  try {
    const stat = statSync(entriesPath);
    /* The videos folder is the download state: when a film lands or leaves,
       its mtime and size change, so the signature misses and the next poll
       sees the new shelf instead of waiting out the TTL on a stale one. */
    let videos = "none";
    try {
      const dir = statSync(join(root, AERIAL_VIDEOS_DIR));
      videos = `${dir.mtimeMs}:${dir.size}`;
    } catch {
      /* No videos folder yet: that is the all-pending state, not a miss. */
    }
    signature = `${stat.mtimeMs}:${stat.size}:${videos}:${lang}`;
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
    if (id === AERIAL_HIDDEN_CATEGORY) continue;
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
  /* Every asset lands in its bucket, downloaded or not: a group's size is then
     the category's size as Settings shows it, and a film already on this Mac
     keeps its place on the shelf instead of vanishing from it. Both counters
     still run over the whole manifest — an asset whose category is unknown is
     not on any shelf but is still counted, so `downloaded + pending === total`
     remains the arithmetic the panel promises. */
  let pending = 0;
  for (const asset of assets) {
    const id = String(asset?.id ?? "");
    if (id === "") continue;
    /* Counters and shelves agree: an asset no shelf can hold is not in `total`
       either, so the header adds up to what the groups below it show. */
    const shelved = (Array.isArray(asset?.categories) ? asset.categories : []).some((categoryId) =>
      byCategory.has(String(categoryId))
    );
    if (shelved === false) continue;
    const done = existsSync(join(videosDir, `${id}.mov`));
    if (done) downloaded += 1;
    else pending += 1;
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
      downloaded: done,
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
  const value = { available: true, total: downloaded + pending, downloaded, pending, lang, groups };
  aerialCache = { signature, at: now, value };
  return value;
}

/* ── dynamic wallpapers ──────────────────────────────────────────────────── */

/** Cached dynamic inventory; see `readDynamicWallpapers`. */
let dynamicCache = { signature: null, at: 0, value: null };

/**
 * id → the still a thumbnail can be cut from.
 *
 * Kept beside the cached inventory rather than inside it: the panel never needs
 * a filesystem path, and the preview route is the only reader that does.
 */
let dynamicStills = new Map();

/** `Big Sur` → `dp-big-sur`; the id the preview route round-trips. */
function dynamicId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug !== "") return `dp-${slug}`;
  return `dp-${createHash("sha1").update(name).digest("hex").slice(0, 10)}`;
}

/** Read one `.madesktop` plist as JSON; `null` when it is not readable. */
function readMadesktopPlist(file) {
  try {
    const text = execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Inventory Settings' "动态壁纸" set: the 35 items the pane lists above the
 * aerials, in the same order and with the same names.
 *
 * Counterpart to `readAerials`, with one deliberate difference: nothing here is
 * a download. These bundles ship with macOS, so `total` is also what the panel
 * can act on, and there is no `downloaded`/`pending` split to report.
 *
 * @returns the item list, grouped and counted the way the panel renders it.
 */
function readDynamicWallpapers() {
  let names = [];
  let signature = "missing";
  try {
    names = readdirSync(DYNAMIC_PICTURES_DIR)
      .filter((name) => name.endsWith(".madesktop"))
      .sort();
    const stat = statSync(DYNAMIC_PICTURES_DIR);
    signature = `${stat.mtimeMs}:${names.length}`;
  } catch {
    names = [];
  }
  const now = Date.now();
  if (dynamicCache.value !== null && dynamicCache.signature === signature && now - dynamicCache.at < DYNAMIC_TTL_MS) {
    return dynamicCache.value;
  }

  const items = [];
  const stills = new Map();
  for (const name of names) {
    const base = name.slice(0, -".madesktop".length);
    const plist = readMadesktopPlist(join(DYNAMIC_PICTURES_DIR, name));
    if (plist === null || plist.isDynamic !== true) continue;
    const id = dynamicId(base);
    const still = typeof plist.thumbnailPath === "string" ? plist.thumbnailPath : "";
    if (still !== "" && existsSync(still)) {
      stills.set(id, still);
      items.push({
        id,
        name: base,
        nameEn: base,
        kind: "image",
        source: "bundle",
        exportable: false,
        thumb: `${API_PREFIX}/dynamic-preview?id=${id}`,
      });
    } else {
      items.push({ id, name: base, nameEn: base, kind: "image", source: "bundle", exportable: false, thumb: null });
    }
  }
  for (const extra of DYNAMIC_EXTRAS) {
    if (existsSync(extra.file) === false) continue;
    stills.set(extra.id, extra.file);
    items.push({
      id: extra.id,
      name: extra.name,
      nameEn: extra.nameEn,
      kind: extra.kind,
      source: "extension",
      exportable: extra.kind !== "scene",
      thumb: `${API_PREFIX}/dynamic-preview?id=${extra.id}`,
    });
  }

  /* Settings lists the five new wallpapers first and the bundles after them;
     the panel keeps that order rather than the order the disk hands them over. */
  const extraOrder = new Map(DYNAMIC_EXTRAS.map((extra, index) => [extra.id, index]));
  items.sort((left, right) => {
    const leftIndex = extraOrder.get(left.id);
    const rightIndex = extraOrder.get(right.id);
    if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex;
    if (leftIndex !== undefined) return -1;
    if (rightIndex !== undefined) return 1;
    return left.name.localeCompare(right.name, "en");
  });

  const value = {
    available: true,
    total: items.length,
    groups: [{ key: "dynamic", name: "动态壁纸", items }],
  };
  dynamicStills = stills;
  dynamicCache = { signature, at: now, value };
  return value;
}

/* ── aerial downloads ────────────────────────────────────────────────────── */

/**
 * Cached asset id → film URL map; see `readAerialSources`.
 *
 * Keyed by the manifest's (mtime, size) because that is the only thing that
 * changes when macOS adds or retires a film.
 */
let aerialSourceCache = { signature: null, value: null };

/**
 * Every asset Apple ships, mapped to the URL of its 4K film.
 *
 * `entries.json` is the same manifest `readAerials` reads for names; this second
 * reader exists because the inventory is deliberately about what is *missing*
 * and drops the URL once a film is on disk, while the download route needs it
 * the other way round. Cached on the same signature.
 *
 * @param root - the aerial collection root.
 * @returns a Map of asset id to `url-4K-SDR-240FPS`, empty when unreadable.
 */
function readAerialSources(root) {
  const entriesPath = join(root, AERIAL_ENTRIES_REL);
  let signature;
  try {
    const stat = statSync(entriesPath);
    signature = `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return new Map();
  }
  if (aerialSourceCache.value !== null && aerialSourceCache.signature === signature) return aerialSourceCache.value;
  let document;
  try {
    document = JSON.parse(readFileSync(entriesPath, "utf8"));
  } catch {
    return new Map();
  }
  const sources = new Map();
  for (const asset of Array.isArray(document?.assets) ? document.assets : []) {
    const id = String(asset?.id ?? "");
    const url = String(asset?.["url-4K-SDR-240FPS"] ?? "");
    if (id !== "" && url !== "") sources.set(id, url);
  }
  aerialSourceCache = { signature, value: sources };
  return sources;
}

/**
 * Rewrite the desktop choice inside an `Index.plist` XML dump.
 *
 * The store keeps one `Configuration` blob per surface — desktop, screen saver,
 * system default — and every blob is a nested binary plist holding exactly one
 * `assetID`. Only the `Desktop` subtree is touched: the screen saver and the
 * system default are somebody else's choice, and rewriting them would set three
 * things when the reader asked for one.
 *
 * The blob is base64 inside the XML, so the swap happens on the decoded bytes
 * and is re-encoded; the id is the same length either way, which is why the
 * nested plist stays valid.
 *
 * @param xml - `plutil -convert xml1` output for the store.
 * @param assetID - the asset to point the desktop at.
 * @returns the rewritten XML, or null when the shape was not what this expects.
 */
export function patchDesktopAerial(xml, assetID) {
  if (typeof xml !== "string" || AERIAL_UUID.test(assetID) === false) return null;
  const keyAt = xml.indexOf(`<key>${AERIAL_DESKTOP_KEY}</key>`);
  if (keyAt < 0) return null;
  const openAt = xml.indexOf("<dict>", keyAt);
  if (openAt < 0) return null;
  let depth = 0;
  let closeAt = -1;
  for (let at = openAt; at < xml.length; ) {
    if (xml.startsWith("<dict>", at)) {
      depth += 1;
      at += 6;
      continue;
    }
    if (xml.startsWith("</dict>", at)) {
      depth -= 1;
      at += 7;
      if (depth === 0) {
        closeAt = at;
        break;
      }
      continue;
    }
    at += 1;
  }
  if (closeAt < 0) return null;
  let touched = 0;
  const body = xml.slice(openAt, closeAt).replace(/<data>([\s\S]*?)<\/data>/g, (match, raw) => {
    const text = Buffer.from(raw.replace(/\s+/g, ""), "base64").toString("latin1");
    const found = text.match(AERIAL_UUID);
    if (found === null) return match;
    touched += 1;
    return `<data>${Buffer.from(text.split(found[0]).join(assetID), "latin1").toString("base64")}</data>`;
  });
  if (touched === 0) return null;
  return xml.slice(0, openAt) + body + xml.slice(closeAt);
}

/**
 * Point the desktop at one aerial and make WallpaperAgent notice.
 *
 * The store is read-modify-written: `plutil` renders it to XML, one subtree is
 * patched, and the result goes back through a temp file and a rename, so a
 * crash mid-write cannot leave a half-written preference behind. `killall
 * WallpaperAgent` is what turns the file into pixels — the agent reads the
 * store on launch, and it comes straight back.
 *
 * @param storePath - absolute path of `Store/Index.plist`.
 * @param assetID - the asset to apply.
 * @param run - the `execFile` seam, for the offline tests.
 * @returns true once the agent was asked to reload.
 */
export async function applyAerialWallpaper(storePath, assetID, run = execFileAsync) {
  const { stdout } = await run("/usr/bin/plutil", ["-convert", "xml1", "-o", "-", storePath], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const patched = patchDesktopAerial(stdout, assetID);
  if (patched === null) throw new Error("index-shape-unexpected");
  const dir = dirname(storePath);
  const stamp = `${process.pid}-${Date.now()}`;
  const xmlPath = join(dir, `.Index.${stamp}.xml`);
  const binPath = join(dir, `.Index.${stamp}.plist`);
  writeFileSync(xmlPath, patched, "utf8");
  try {
    await run("/usr/bin/plutil", ["-convert", "binary1", "-o", binPath, xmlPath]);
    renameSync(binPath, storePath);
  } finally {
    rmSync(xmlPath, { force: true });
    rmSync(binPath, { force: true });
  }
  try {
    await run("/usr/bin/killall", ["WallpaperAgent"]);
  } catch {
    // The agent is not always running; the next launch reads the same store.
  }
  return true;
}

/**
 * Fetch one film with curl.
 *
 * Not `fetch`: the host runs inside Electron, whose net stack ignores the
 * system proxy that `curl` honours, and Apple's CDN is reachable only through
 * that proxy on this network. `--fail` keeps an HTML error page from being
 * renamed into `videos/`, and the file goes to a `.part` name that the caller
 * publishes with a rename.
 *
 * @param url - the film's CDN URL.
 * @param dest - the `.part` path to write.
 */
function downloadAerial(url, dest) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "/usr/bin/curl",
      ["--noproxy", "*", "-L", "--fail", "--retry", "2", "--connect-timeout", "20", "-sS", "-o", dest, url],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let detail = "";
    child.stderr.on("data", (chunk) => {
      if (detail.length < 4096) detail += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const tail = detail.trim().split("\n").slice(-2).join(" ");
      reject(new Error(tail === "" ? `curl exited ${code}` : tail));
    });
  });
}

/**
 * Ask the CDN how large a film is, for the progress readout.
 * @returns the byte count, or 0 when the header is unavailable.
 */
async function aerialSize(url) {
  try {
    const { stdout } = await execFileAsync("/usr/bin/curl", ["--noproxy", "*", "-sIL", "--max-time", "20", url], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    const lengths = [...String(stdout).matchAll(/^content-length:\s*(\d+)\s*$/gim)].map((match) => Number(match[1]));
    return lengths.length === 0 ? 0 : lengths[lengths.length - 1];
  } catch {
    return 0;
  }
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
      dynamics: readDynamicWallpapers(),
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
   * One tile for the dynamic grid.
   *
   * The stills Apple ships are HEIC, which Chromium cannot decode, so the first
   * ask converts one to a 480 px PNG under `DYNAMIC_CACHE_DIR` and every later
   * ask streams that file. Golden Gate is a film rather than a still, so its
   * tile is sampled at two seconds — the same frame Settings uses.
   */
  const dynamicPreviewHandler = (req, res) => {
    const id = new URL(req.url ?? "/", "http://x").searchParams.get("id") ?? "";
    if (/^[A-Za-z0-9-]{1,64}$/.test(id) === false) {
      writeJson(res, 400, { ok: false, error: "invalid-id" });
      return;
    }
    const source = dynamicStills.get(id);
    if (source === undefined) {
      writeJson(res, 404, { ok: false, error: "dynamic-thumbnail-not-found" });
      return;
    }
    const target = join(DYNAMIC_CACHE_DIR, `${id}.png`);
    try {
      if (existsSync(target) === false) {
        mkdirSync(DYNAMIC_CACHE_DIR, { recursive: true });
        const temp = `${target}.part`;
        if (source.toLowerCase().endsWith(".mov")) {
          execFileSync(FFMPEG_BIN, ["-y", "-loglevel", "error", "-ss", "2", "-i", source, "-frames:v", "1", "-vf", "scale=480:-2", temp], { stdio: "ignore" });
        } else {
          execFileSync("/usr/bin/sips", ["-s", "format", "png", "-Z", "480", source, "--out", temp], { stdio: "ignore" });
        }
        renameSync(temp, target);
      }
    } catch {
      writeJson(res, 500, { ok: false, error: "dynamic-thumbnail-failed" });
      return;
    }
    let byteLength;
    try {
      const stat = statSync(target);
      if (stat.isFile() === false) throw new Error("not a file");
      byteLength = stat.size;
    } catch {
      writeJson(res, 404, { ok: false, error: "dynamic-thumbnail-not-found" });
      return;
    }
    res.writeHead(200, {
      "content-type": "image/png",
      "content-length": String(byteLength),
      "cache-control": "private, max-age=86400",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(target);
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

  /* ── aerial download ─────────────────────────────────────────────────────── */

  /**
   * The films in flight, keyed by asset id.
   *
   * In memory on purpose: a job is an interaction between the panel and the
   * CDN, not a durable record. If the host restarts mid-download the panel
   * simply offers the tile again, and the `.part` file the next attempt finds
   * is overwritten rather than resumed.
   */
  const aerialJobs = new Map();

  const fetchFilm = deps.downloadAerial ?? downloadAerial;
  const measureFilm = deps.aerialSize ?? aerialSize;
  /**
   * Turn the downloaded film into a skin of its own.
   *
   * The export script is the only thing that knows how to name a skin, pick its
   * accent, re-container HEVC 4K for Chromium, and rebuild the catalogue, so the
   * host shells out to it instead of keeping a second copy of those rules.
   *
   * `--remux` is the difference between waiting and not: it copies the source
   * codec into a faststart MP4 (under a second for a 320 MB film) instead of
   * decoding and re-encoding five minutes of 4K, so the wallpaper appears as
   * soon as the bytes are on disk. Compression stays available afterwards
   * through the panel, where the trade — smaller file, 1080p — is the user's
   * to make. The long bound stays because a film with a loop seam still has to
   * be re-cut.
   */
  const recordFilm = deps.exportFilm ?? ((filmPath) => runExportImpl(["--film", filmPath, "--remux"], { timeoutMs: AERIAL_EXPORT_TIMEOUT_MS }));
  const activateSkin = deps.applySkin ?? ((skinId) => writeActiveSkinId(skinId, env));

  /** A file's size, with "not on disk yet" folded into 0. */
  const sizeOf = (path) => {
    try {
      return statSync(path).size;
    } catch {
      return 0;
    }
  };

  /** Drop jobs the panel can no longer be waiting on. */
  const pruneJobs = () => {
    const now = Date.now();
    for (const [id, job] of aerialJobs) {
      if (job.finishedAt !== null && now - job.finishedAt > AERIAL_JOB_TTL_MS) aerialJobs.delete(id);
    }
  };

  /** What the panel polls: the film on disk is the progress bar. */
  const describeJob = (job) => ({
    id: job.id,
    name: job.name,
    state: job.state,
    received: job.state === "downloading" ? sizeOf(job.part ?? "") : job.received,
    total: job.total,
    skin: job.skin,
    error: job.error,
  });

  /**
   * Fetch one film, then give it a skin and switch to it.
   *
   * Three side effects in a fixed order, each one the precondition of the next:
   * the film lands in macOS's own `videos/` folder under its asset id, the
   * export turns that file into a `wl-*` skin, and the skin center's document is
   * pointed at the new skin. Nothing touches the desktop: an aerial the panel
   * downloads becomes a wallpaper of the panel, not the system's own.
   *
   * A failure at any step leaves the active skin where it was — the document is
   * only rewritten once a skin exists to point at.
   *
   * @param job - the record the panel polls.
   * @param url - the film's CDN URL.
   */
  const runAerialJob = (job, url) => {
    const videosDir = join(aerialRoot, AERIAL_VIDEOS_DIR);
    const dest = join(videosDir, `${job.id}.mov`);
    const part = `${dest}${AERIAL_PART_SUFFIX}`;
    job.part = part;
    void (async () => {
      try {
        mkdirSync(videosDir, { recursive: true });
        if (existsSync(dest) === false) {
          job.total = await measureFilm(url);
          await fetchFilm(url, part);
          if (existsSync(part) === false) throw new Error("download-produced-nothing");
          renameSync(part, dest);
        }
        job.received = job.total;
        job.state = "exporting";
        // Serialized against import/remove/restore: the export rewrites the
        // catalogue, and two of them at once would drop each other's skins.
        const stdout = await serialize(skinRoot, () => recordFilm(dest));
        const reported = /^exported=(.*)$/m.exec(String(stdout));
        const skin = reported === null ? "" : (reported[1].split(",")[0] ?? "").trim();
        if (skin === "") throw new Error("export-named-no-skin");
        job.skin = skin;
        job.state = "applying";
        await serialize(skinRoot, () => activateSkin(skin));
        job.state = "done";
      } catch (error) {
        job.state = "failed";
        job.error = String(error?.message ?? error);
        log(`[appearance-library] aerial "${job.id}" failed: ${job.error}`);
      } finally {
        job.part = null;
        job.finishedAt = Date.now();
        rmSync(part, { force: true });
      }
    })();
  };

  /**
   * Download and apply one aerial.
   *
   * POST starts a job and answers immediately: a 4K film is 37 MB at the
   * smallest and 460 MB at the largest, which is far longer than a request
   * should be held open. GET (`?id=`) is the progress readout, and the panel
   * polls it until `state` settles on `done` or `failed`.
   */
  const aerialDownloadHandler = async (req, res) => {
    if (req.method === "POST") {
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
      if (AERIAL_UUID.test(id) === false) {
        writeJson(res, 400, { ok: false, error: "invalid-id" });
        return;
      }
      const running = aerialJobs.get(id);
      if (running !== undefined && (running.state === "downloading" || running.state === "exporting" || running.state === "applying")) {
        writeJson(res, 202, { ok: true, job: describeJob(running) });
        return;
      }
      const url = readAerialSources(aerialRoot).get(id);
      if (url === undefined) {
        writeJson(res, 404, { ok: false, error: "unknown-aerial" });
        return;
      }
      const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
      const job = { id, name, state: "downloading", received: 0, total: 0, skin: null, error: null, part: null, startedAt: Date.now(), finishedAt: null };
      aerialJobs.set(id, job);
      pruneJobs();
      runAerialJob(job, url);
      writeJson(res, 202, { ok: true, job: describeJob(job) });
      return;
    }
    const id = new URL(req.url ?? "/", "http://x").searchParams.get("id") ?? "";
    const job = aerialJobs.get(id);
    if (job === undefined) {
      writeJson(res, 404, { ok: false, error: "no-such-job" });
      return;
    }
    writeJson(res, 200, { ok: true, job: describeJob(job) });
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

  /**
   * Re-encode one film at the library's own size.
   *
   * A download lands as a remux of the source — 4K, source codec — so the
   * wallpaper is playable in under a second. This is the deliberate trade
   * back: minutes of ffmpeg for a quarter of the bytes and a resolution every
   * GPU decodes without effort. The cut on disk is banked first and put back
   * if the encode dies, because a half-written MP4 would leave the panel
   * pointing at a film that no longer plays.
   */
  const compressHandler = async (req, res) => {
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
      const entry = readCatalog(skinRoot).wallpapers.find((item) => item.id === id) ?? null;
      if (entry === null) {
        writeJson(res, 404, { ok: false, error: "not-in-library" });
        return;
      }
      if (entry.kind !== "video") {
        writeJson(res, 409, { ok: false, error: "not-a-film" });
        return;
      }
      const film = filmAssetPath(skinRoot, id);
      if (film === null || !existsSync(film)) {
        writeJson(res, 404, { ok: false, error: "film-missing" });
        return;
      }
      const backup = `${film}.compressing`;
      try {
        renameSync(film, backup);
      } catch (error) {
        log(`[appearance-library] could not bank the film of "${id}": ${error?.message ?? error}`);
        writeJson(res, 500, { ok: false, error: "cache-failed" });
        return;
      }
      try {
        // No `--remux` on purpose: reaching the encoder is the whole point.
        await runExportImpl(["--ids", id, "--force"], { timeoutMs: 45 * 60_000 });
        rmSync(backup, { force: true });
      } catch (error) {
        try {
          renameSync(backup, film);
        } catch {
          // The banked cut is gone as well; the next export settles it.
        }
        const detail = String(error?.stderr ?? error?.message ?? error).trim().split("\n").slice(-3).join(" ");
        log(`[appearance-library] compress for "${id}" failed: ${detail}`);
        writeJson(res, 500, { ok: false, error: "export-failed", detail });
        return;
      }
      writeJson(res, 200, { ...catalogPayload(lang), changed: { compressed: id } });
    });
  };

  /**
   * Put one film into a specific state: resolution and loop cut together.
   *
   * The panel asks this question as a 2×2 — native or 1080p, plain loop or
   * seamless — and every corner of that square is the *same* operation: rewrite
   * one file with (or without) a seam and at (or below) source resolution. So
   * this route takes both answers at once instead of making the client chain a
   * seam call and a compress call, which could leave a half-applied state if
   * the second one failed.
   *
   * Both cached cuts are dropped first. They were cut from a film of the *other*
   * resolution, so keeping them would let a later seam flip swap a stale 1080p
   * cut in for a 4K film — the exact mismatch `probeFilmHeight` exists to make
   * visible.
   */
  const filmHandler = async (req, res) => {
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
    const quality = body?.quality === "native" ? "native" : "compressed";
    const seam = body?.seam === true;
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
      const film = filmAssetPath(skinRoot, id);
      if (film === null || !existsSync(film)) {
        writeJson(res, 404, { ok: false, error: "film-missing" });
        return;
      }
      const nativeNow = typeof entry.filmHeight === "number" && entry.filmHeight >= 2000;
      if (nativeNow === (quality === "native") && entry.seamLoop === seam) {
        writeJson(res, 200, { ...catalogPayload(lang), changed: null });
        return;
      }
      if (quality === "native") {
        const source = typeof entry.source === "string" ? entry.source : "";
        if (source === "" || !existsSync(source)) {
          // The source film is what a native cut is made from. Without it there
          // is nothing to go back to, so the panel greys that corner out.
          writeJson(res, 409, { ok: false, error: "no-source" });
          return;
        }
      }
      const before = readLoopSeamList(skinRoot);
      const next = seam ? [...new Set([...before, id])] : before.filter((item) => item !== id);
      writeLoopSeamList(skinRoot, next);
      for (const suffix of Object.values(FILM_CACHE_SUFFIX)) rmSync(`${film}${suffix}`, { force: true });

      const args = ["--ids", id, "--force"];
      if (quality === "native") args.push("--remux");
      // A seam is a re-cut, so it can never ride `--remux`; native therefore
      // has to be asked for explicitly or the cut would land at 1920.
      if (quality === "native" && seam) args.push("--native-resolution");
      try {
        await runExportImpl(args, { timeoutMs: 90 * 60_000 });
      } catch (error) {
        writeLoopSeamList(skinRoot, before);
        const detail = String(error?.stderr || error?.message || error).trim().split("\n").slice(-3).join(" ");
        log(`[appearance-library] film cut for "${id}" failed: ${detail}`);
        writeJson(res, 500, { ok: false, error: "export-failed", detail });
        return;
      }
      writeJson(res, 200, { ...catalogPayload(lang), changed: { film: id, quality, seam } });
    });
  };

  return [
    { kind: "exact", path: `${API_PREFIX}/catalog`, handler: catalogHandler },
    { kind: "exact", path: `${API_PREFIX}/status`, handler: statusHandler },
    { kind: "exact", path: `${API_PREFIX}/preview`, handler: previewHandler },
    { kind: "exact", path: `${API_PREFIX}/aerial-preview`, handler: aerialPreviewHandler },
    { kind: "exact", path: `${API_PREFIX}/dynamic-preview`, handler: dynamicPreviewHandler },
    { kind: "exact", path: `${API_PREFIX}/open-wallpaper-settings`, handler: openSettingsHandler },
    { kind: "exact", path: `${API_PREFIX}/import`, handler: importHandler },
    { kind: "exact", path: `${API_PREFIX}/remove`, handler: removeHandler },
    { kind: "exact", path: `${API_PREFIX}/restore`, handler: restoreHandler },
    { kind: "exact", path: `${API_PREFIX}/seam-loop`, handler: seamHandler },
    { kind: "exact", path: `${API_PREFIX}/apply`, handler: applyHandler },
    { kind: "exact", path: `${API_PREFIX}/probe`, handler: probeHandler },
    // Newest route last: the table is read top to bottom, and appending keeps
    // the order every existing reader already knows.
    { kind: "exact", path: `${API_PREFIX}/aerial-download`, handler: aerialDownloadHandler },
    // Appended rather than inserted: the self-test indexes a few routes by
    // position, and a row in the middle would shift them all.
    { kind: "exact", path: `${API_PREFIX}/compress`, handler: compressHandler },
    { kind: "exact", path: `${API_PREFIX}/film`, handler: filmHandler },
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
/**
 * The skin that ships with the plugin, planted once into the user root.
 *
 * A preset lives in `assets/presets/` as a complete skin directory, and the
 * skin center can only serve skins under `~/.dsh-beta/skins`, so seeding is a
 * copy rather than a pointer. The marker file is what makes removal stick: an
 * id listed there is never planted again, so deleting 大苏尔航拍 from the panel
 * removes it for good instead of resurrecting it on the next launch.
 *
 * On a machine with no selection yet the seeded skin also becomes the active
 * one — a fresh install should open on a real wallpaper, not on the default
 * chrome. A machine that already chose something keeps its choice.
 */
const PRESET_SEED_MARK = ".presets-seeded.json";

function presetSkinSource() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "presets");
}

function seedPresetSkins(env = process.env, warn = () => {}) {
  if (env.DSH_PRESET_SEED === "0") return [];
  const skinRoot = resolveSkinRoot(env);
  const markPath = join(skinRoot, PRESET_SEED_MARK);
  if (existsSync(markPath)) return [];
  const source = presetSkinSource();
  let names;
  try {
    names = readdirSync(source).filter((name) => name.startsWith("wl-")).sort();
  } catch {
    return [];
  }
  if (names.length === 0) return [];
  try {
    mkdirSync(skinRoot, { recursive: true });
  } catch (error) {
    warn(`[appearance-library] preset skins were not seeded: ${String(error)}`);
    return [];
  }
  const planted = [];
  for (const name of names) {
    const dest = join(skinRoot, name);
    if (existsSync(dest)) continue;
    try {
      cpSync(join(source, name), dest, { recursive: true });
      planted.push(name);
    } catch (error) {
      warn(`[appearance-library] preset skin "${name}" was not seeded: ${String(error)}`);
    }
  }
  try {
    writeFileSync(markPath, `${JSON.stringify({ version: 1, seeds: names, planted, at: new Date().toISOString() }, null, 2)}\n`);
  } catch {
    // A read-only root still gets the skins; it just re-checks next launch.
  }
  if (planted.length > 0 && readActiveSkinId(env) === null) {
    try {
      writeActiveSkinId(planted[0], env);
    } catch {
      // The skin center treats a missing selection as "stock look" anyway.
    }
  }
  return planted;
}

import { Config as SkinRuntimeConfig, makeSkinRuntimeRoutes } from "./skin/host.js";
import { makeUsageRoutes } from "./usage/host.js";

/**
 * This profile entry's editable configuration.
 *
 * `skin-background` is the section the Appearance Library panel reads for its
 * skin settings (master switch, scrim, blur). It used to belong to the skin
 * center's own row; it lives here now that the runtime does.
 */
export const Config = SkinRuntimeConfig;

export function apply(ctx) {
  // Mounted first and on its own: a splash that fails must not cost the panel,
  // and the panel failing must not cost the splash. Both halves are wrapped by
  // their own try/catch, so this call only guards against a broken import.
  try {
    applyStartupSplash(ctx);
  } catch (error) {
    ctx.logger.warn("[appearance-library] startup splash did not mount: %s", String(error));
  }

  // Before any route is mounted: a fresh install should already have the
  // bundled wallpaper on disk when the panel asks for the catalogue.
  try {
    const seeded = seedPresetSkins(process.env, (line) => ctx.logger.warn(line));
    if (seeded.length > 0) {
      ctx.logger.info(`[appearance-library] seeded ${seeded.length} bundled skin preset(s): ${seeded.join(", ")}`);
    }
  } catch (error) {
    ctx.logger.warn("[appearance-library] preset seed skipped: %s", String(error));
  }

  try {
    ctx.inject(["webServer"], (webCtx) => {
      // Mutation failures are reported to the panel as codes; they also belong
      // in the host log, which is the only place a failed export can be read
      // after the toast is gone.
      const routes = makeAppearanceRoutes({ log: (line) => webCtx.logger.warn(line) });
      /* The skin runtime's own surface: catalog, scoped stylesheets, skin assets
         and the persisted selection. Same `/api/skin-center/v2` prefix the
         browser runtime addresses, so no translation layer sits in between. */
      const skinRoutes = makeSkinRuntimeRoutes({
        skinRoot: resolveSkinRoot(process.env),
        activeStatePath: resolveActiveStatePath(process.env),
      });
      /* The sidebar card's read-only overview: today's spend, balances and a
         seven-day trend, folded from `$DSH_HOME/dsh-usage/*.json`. */
      const usageRoutes = makeUsageRoutes({ env: process.env });
      webCtx.effect(() => {
        const disposers = [...routes, ...skinRoutes, ...usageRoutes].map((route) => webCtx.webServer.register(route));
        return () => {
          for (const dispose of disposers) dispose();
        };
      }, "appearance-library: API routes");
      // Concatenated rather than `%d`/`%s`: this logger takes the message as it
      // finds it and does not substitute format specifiers, so a placeholder
      // would reach the log verbatim.
      webCtx.logger.info(
        `[appearance-library] ${routes.length} API routes mounted under ${API_PREFIX} + ${skinRoutes.length} skin runtime routes under /api/skin-center/v2 + ${usageRoutes.length} usage route`,
      );
      // 诊断标记：把这一进程真正挂上的路由落盘。热重载后看它是否更新，
      // 就能分清「代码没被重新加载」和「路由没匹配上」。
      try {
        const marker = join(homedir(), ".dsh-beta", "appearance-library", "mounted.json");
        mkdirSync(dirname(marker), { recursive: true });
        writeFileSync(marker, JSON.stringify({ at: new Date().toISOString(), pid: process.pid, routes: [...routes, ...skinRoutes, ...usageRoutes].map((route) => route.path) }, null, 2));
      } catch {
        /* 诊断失败不影响挂载 */
      }
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
  seedPresetSkins,
  presetSkinSource,
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
  readDynamicWallpapers,
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
  readAerialSources,
  patchDesktopAerial,
  applyAerialWallpaper,
  makeAppearanceRoutes,
};
