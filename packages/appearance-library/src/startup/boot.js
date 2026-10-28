/**
 * Startup Splash — host half.
 *
 * Plays a real boot film over the app's own boot gap: the interval between the
 * window appearing and the shell's first React commit. Everything here rides the
 * platform's documented index-injection surface — the same
 * `webserver/index-inject` table the theme raster and the module loader use — so
 * no part of the app bundle, and nothing inside the signed `.app`, is touched.
 *
 * The load-bearing decisions:
 *
 *  1. **Rows are read from disk on every index render.** `renderIndex` collects
 *     the table per request, so `assets/splash.{html,css,js}` are re-read then.
 *     Editing the animation and hitting ⌘R is therefore a complete iteration
 *     loop: only this file's own code would need a DSH restart, which is why
 *     the logic that changes often lives in the assets, not here.
 *  2. **The splash never owns an app DOM contract.** It mounts as
 *     `#dsh-startup-splash`, not as the kernel's `[data-dsh-boot]` loading node
 *     — that node is the renderer's `hydrateRoot` contract, and a second author
 *     on it would collide with a real hydration.
 *  3. **The film is black-backed and blended, not alpha-encoded.** The source is
 *     an H.264 clip whose background is exactly `(0,0,0)`; `mix-blend-mode:
 *     screen` makes that black a no-op, which is the same arithmetic as the
 *     `plusLighter` overlay the Swift prototype used. No alpha channel to lose,
 *     and Chromium plays H.264 everywhere (it cannot decode ProRes at all).
 *  4. **The veil is what makes screen blending work.** Additive light over a
 *     bright page disappears; a dark veil under the film puts the backdrop at
 *     ≈0.92 black, so every emitted pixel reads. The veil and the film leave
 *     together, split at the film's own waterline.
 *  5. **Failure is contained.** A throw from `apply` fails the whole web boot, so
 *     every path logs and degrades: a missing clip, an unreadable asset or a
 *     refused autoplay just drops the layer and leaves the app as it was.
 *  6. **`config.debug` is the only in-app view.** The desktop fences every
 *     request that is not its own renderer's — status 403, no exceptions, not
 *     even with the renderer's own cookie — so a plugin cannot be inspected over
 *     HTTP. Under `debug` this plugin therefore reports through three channels
 *     it owns: the host log (`self-check` on every activation), `diag/*.jsonl`
 *     plus the verbatim `diag/served.html` from an index tap, and a beacon the
 *     splash page posts back with its own geometry and playback state.
 *  7. **No asset may spell a tag name.** The platform splices the body rows at
 *     the first `body` tag it finds in the *already head-injected* document, so
 *     a tag literal inside this plugin's own CSS would capture them into the
 *     `<style>` block, where the browser reads markup as CSS text: no paint, no
 *     script, no error. `test/harness.mjs` guards every asset against it.
 *
 * @module dsh-plugin-appearance-library/startup/boot
 */

import {
  appendFileSync,
  closeSync,
  createReadStream,
  createWriteStream,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** This package's manifest name — the loader id. */
const PACKAGE_NAME = "muciya-dsh-plugin-appearance-library";

/** Every HTTP path this plugin owns lives under one prefix. */
const API_PREFIX = "/api/muciya-appearance/v1/startup";

/** The plugin root, and the asset directory the render path reads per request. */
const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ASSET_DIR = join(PLUGIN_ROOT, "assets", "startup");

/**
 * The film that ships with the plugin; "restore built-in" points back here.
 *
 * `setup-1080.mp4` replaced the original whale ascent in 2026-10-19: it is the
 * launch the user tuned by hand, copied in so a fresh install opens with the
 * same five-second launch instead of the older, longer film. The previous
 * `boot.mp4` was dropped from the package on 2026-10-28 to keep the release
 * small; it is still reachable through the repository history.
 */
const DEFAULT_CLIP = "setup-1080.mp4";

/** Playback speeds the Appearance Library panel offers. */
const RATE_CHOICES = [0.75, 1, 1.25, 1.5];

/**
 * Tuning knobs. The live values live in `$DSH_HOME/startup-splash.json` — the
 * same layer as `skin-center-active.json` — so a plugin reinstall never eats a
 * user's choices, and the Appearance Library panel can write them without
 * touching the signed app or this package.
 */
const DEFAULT_CONFIG = {
  /** Master switch: false keeps the rows out of the document entirely. */
  enabled: true,
  /** The film: a name inside `$DSH_HOME/startup-splash/clips`, else `assets/`. */
  clip: DEFAULT_CLIP,
  /** Sound on launch. Off by default: an app should not speak on launch. */
  muted: false,
  /** Playback gain when `muted` is false, 0..1. */
  volume: 0.62,
  /** A soundtrack of its own; `""` plays the film's own track instead. */
  audio: "",
  /** Keep the film's own audio as well, when a soundtrack of its own plays. */
  keepFilmAudio: false,
  /** Seconds into the launch before that soundtrack starts. */
  audioStart: 0,
  /** Let the soundtrack run past the reveal instead of fading it out. */
  audioOverrun: false,
  /**
   * Whole launch length in seconds — film, hold and the split together. The
   * playback rate is derived from it (`filmSeconds / (duration - reveal)`), so
   * "3 seconds" means three seconds end to end rather than a speed multiplier
   * whose real length the user has to work out.
   */
  duration: 5,
  /**
   * Fallback speed, used only when the film's own duration cannot be read
   * (a WebM import, for instance). Kept so an unreadable clip still plays.
   */
  rate: 1,
  /** Skip the film when the machine is running on battery. */
  acPowerOnly: false,
  /** Show a still of the first frame while the film decodes (no black flash). */
  poster: true,
  /** Opacity of the dark veil the film is screened over. */
  veilAlpha: 0.92,
  /** Where the film's waterline sits inside its own frame, 0..1 from the top. */
  waterline: 0.62,
  /** How long the waterline takes to split the layer open. */
  revealMs: 900,
  /** Beat between the film ending and the split starting. */
  holdMs: 0,
  /** Hard ceiling: the layer leaves by itself even if the film never ends. */
  forceExitMs: 9_000,
  /** Play only in a freshly created window, not on a page reload. */
  newWindowOnly: true,
  /** Keep the layer up for this long regardless of readiness (visual checks). */
  debugHoldMs: 0,
  /** Write the self-check under `diag/`, and beacon the film's state. */
  debug: false,
};

/** Video types this route will hand to the browser, by file extension. */
const CLIP_TYPES = new Map([
  [".mp4", "video/mp4"],
  [".m4v", "video/mp4"],
  [".webm", "video/webm"],
]);

/** A clip name is one file name inside `assets/`; anything else never resolves. */
const CLIP_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.(mp4|m4v|webm)$/;

/** Audio types the `/audio` route hands to the browser, by file extension. */
const AUDIO_TYPES = new Map([
  [".mp3", "audio/mpeg"],
  [".m4a", "audio/mp4"],
  [".aac", "audio/aac"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".opus", "audio/ogg"],
  [".flac", "audio/flac"],
]);

/** An imported soundtrack's name; the empty string means "the film's own track". */
const AUDIO_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.(mp3|m4a|aac|wav|ogg|opus|flac)$/;

/* ── config ──────────────────────────────────────────────────────────────── */

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

/** One asset of this plugin, re-read per request. Binary assets are refused. */
function readAsset(name) {
  const file = join(ASSET_DIR, name);
  try {
    const stat = statSync(file);
    if (!stat.isFile()) return undefined;
    return { text: readFileSync(file, "utf8"), mtimeMs: stat.mtimeMs };
  } catch {
    return undefined;
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Overlay a user config onto the defaults, dropping anything that is not a
 * value of the same type and shape the default has.
 *
 * A hand-edited `startup-splash.json` is the most likely way this plugin breaks, and a
 * bad key must never be able to take the splash — or worse, the page — down. So
 * every field is validated against its default rather than trusted.
 */
export function mergeConfig(overrides, defaults = DEFAULT_CONFIG) {
  const out = { ...defaults };
  if (!isPlainObject(overrides)) return out;
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = overrides[key];
    if (value === undefined) continue;
    if (typeof fallback === "boolean") {
      if (typeof value === "boolean") out[key] = value;
      continue;
    }
    if (typeof fallback === "number") {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
      continue;
    }
    if (typeof fallback === "string") {
      /* Every string field rejects "" — except `audio`, where "" is the
         meaningful value "use the film's own track". */
      if (typeof value === "string" && (value.trim() !== "" || key === "audio")) out[key] = value.trim();
    }
  }
  if (!CLIP_NAME.test(out.clip)) out.clip = DEFAULT_CONFIG.clip;
  if (out.audio !== "" && !AUDIO_NAME.test(out.audio)) out.audio = "";
  if (!RATE_CHOICES.includes(out.rate)) out.rate = DEFAULT_CONFIG.rate;
  /* The slider moves in half seconds; anything else snaps to the grid so the
     panel and the file never disagree by a rounding error. */
  out.duration = Math.round(clamp(out.duration, 2, 10) * 2) / 2;
  out.audioStart = Math.round(clamp(out.audioStart, 0, 10) * 10) / 10;
  out.volume = clamp(out.volume, 0, 1);
  out.veilAlpha = clamp(out.veilAlpha, 0, 1);
  out.waterline = clamp(out.waterline, 0.05, 0.95);
  out.revealMs = clamp(out.revealMs, 0, 4_000);
  out.holdMs = clamp(out.holdMs, 0, 4_000);
  out.forceExitMs = clamp(out.forceExitMs, 500, 60_000);
  out.debugHoldMs = clamp(out.debugHoldMs, 0, 60_000);
  return out;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** The harness home: `$DSH_HOME`, else `~/.dsh-beta`, exactly like the skins. */
export function resolveHarnessHome(env = process.env) {
  const raw = typeof env?.DSH_HOME === "string" ? env.DSH_HOME.trim() : "";
  return raw === "" ? join(homedir(), ".dsh-beta") : resolve(raw);
}

/** The one file the splash reads its settings from; the panel writes it. */
export function configFile(env = process.env) {
  return join(resolveHarnessHome(env), "startup-splash.json");
}

/** Where imported films live; a file here wins over the built-in clip. */
export function clipsDir(env = process.env) {
  return join(resolveHarnessHome(env), "startup-splash", "clips");
}

/** Where imported soundtracks live; a file here replaces the film's own track. */
export function audioDir(env = process.env) {
  return join(resolveHarnessHome(env), "startup-splash", "audio");
}

/** The live config: `$DSH_HOME/startup-splash.json` merged onto the defaults. */
export function readConfig(env = process.env) {
  return mergeConfig(readJson(configFile(env)));
}

/**
 * Merge a patch into the live config and persist it atomically.
 *
 * The write goes to a sibling temp file first: a half-written settings file
 * would be read by the very next index render, and a boot-time parse failure is
 * the one way this plugin could leave a blank launch screen behind.
 */
export function writeConfig(env, patch) {
  const next = mergeConfig({ ...readConfig(env), ...(isPlainObject(patch) ? patch : {}) });
  const file = configFile(env);
  const dir = dirname(file);
  mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(tmp, file);
  return next;
}

/* ── files ───────────────────────────────────────────────────────────────── */

/** Resolve `relative` under `baseDir`, refusing anything that escapes it. */
export function resolveInside(baseDir, relative) {
  if (typeof relative !== "string" || relative === "") return undefined;
  const target = resolve(baseDir, relative);
  return target === baseDir || target.startsWith(baseDir + sep) ? target : undefined;
}

function statFile(file) {
  if (file === undefined) return undefined;
  try {
    const stat = statSync(file);
    return stat.isFile() ? stat : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The film on disk, or `undefined` when it is missing or not a video.
 *
 * An imported film wins over the built-in one: the panel writes an imported
 * file's name into `config.clip`, and the same name must keep resolving to that
 * file even when the plugin happens to ship a clip with the same name.
 */
export function describeClip(config = DEFAULT_CONFIG, env = process.env) {
  if (!CLIP_NAME.test(config.clip)) return undefined;
  const candidates = [resolveInside(clipsDir(env), config.clip), resolveInside(ASSET_DIR, config.clip)];
  for (const file of candidates) {
    const stat = statFile(file);
    if (file === undefined || stat === undefined) continue;
    const type = CLIP_TYPES.get(extname(file).toLowerCase());
    if (type === undefined) continue;
    const builtin = file.startsWith(ASSET_DIR + sep);
    const poster = posterFor(file, builtin);
    return {
      name: config.clip,
      src: config.clip,
      abs: file,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      type,
      builtin,
      poster,
    };
  }
  return undefined;
}

/** Parsed film lengths, keyed by path + size + mtime so a re-encode is seen. */
const CLIP_SECONDS = new Map();

/**
 * The film's own length in seconds, read from the MP4 `mvhd` header.
 *
 * The panel needs it to turn "5 seconds end to end" into a playback rate, and
 * the host is the only side that can read the file. `mvhd` sits in `moov`,
 * which faststart files put at the front and plain ffmpeg files put at the end,
 * so both ends are scanned; anything that is not MP4 (WebM) returns
 * `undefined` and the fixed `rate` fallback takes over.
 */
export function clipSeconds(abs) {
  const stat = statFile(abs);
  if (stat === undefined) return undefined;
  const key = `${abs}:${stat.size}:${Math.round(stat.mtimeMs)}`;
  if (CLIP_SECONDS.has(key)) return CLIP_SECONDS.get(key);
  let seconds;
  try {
    const fd = openSync(abs, "r");
    try {
      seconds = readMvhd(fd, stat.size);
    } finally {
      closeSync(fd);
    }
  } catch {
    seconds = undefined;
  }
  CLIP_SECONDS.set(key, seconds);
  return seconds;
}

function readMvhd(fd, size) {
  const span = 4 * 1024 * 1024;
  const windows = [[0, Math.min(span, size)]];
  if (size > span) windows.push([size - span, span]);
  for (const [offset, length] of windows) {
    const buffer = Buffer.alloc(length);
    const read = readSync(fd, buffer, 0, length, offset);
    const at = buffer.subarray(0, read).indexOf("mvhd", 0, "latin1");
    /* mvhd v1 is 36 bytes from the box name; v0 is 24. */
    if (at < 0 || at + 36 > read) continue;
    const version = buffer[at + 4];
    if (version === 1) {
      const timescale = buffer.readUInt32BE(at + 24);
      const units = Number(buffer.readBigUInt64BE(at + 28));
      if (timescale > 0 && units > 0) return units / timescale;
    } else if (version === 0) {
      const timescale = buffer.readUInt32BE(at + 16);
      const units = buffer.readUInt32BE(at + 20);
      if (timescale > 0 && units > 0) return units / timescale;
    }
  }
  return undefined;
}

/**
 * Turn "the whole launch takes N seconds" into the numbers playback needs.
 *
 * The split is part of the launch, so the film gets whatever is left after
 * `revealMs` (and `holdMs`); the rate follows from that. Speeds outside
 * 0.25..4× are clamped because browsers refuse to play them, which means a very
 * short duration on a long film ends up longer than asked — the panel says so.
 */
export function timeline(config, clip) {
  const durationMs = Math.round(config.duration * 1000);
  const revealMs = clamp(config.revealMs, 0, 4_000);
  const holdMs = clamp(config.holdMs, 0, 4_000);
  const playbackMs = Math.max(400, durationMs - revealMs - holdMs);
  const filmSeconds = clip === undefined ? undefined : clipSeconds(clip.abs);
  const rate =
    filmSeconds === undefined
      ? clamp(config.rate, 0.25, 4)
      : clamp((filmSeconds * 1000) / playbackMs, 0.25, 4);
  return { durationMs, revealMs, holdMs, playbackMs, filmSeconds, rate };
}

/**
 * The soundtrack the splash plays, when it is not the film's own.
 *
 * A soundtrack lives only in `$DSH_HOME/startup-splash/audio`: unlike the film
 * there is no built-in candidate, because the film already ships its mix. An
 * empty or stale `config.audio` therefore means "use the film's track".
 */
export function describeAudio(config = DEFAULT_CONFIG, env = process.env) {
  if (!AUDIO_NAME.test(config.audio)) return undefined;
  const file = resolveInside(audioDir(env), config.audio);
  const stat = statFile(file);
  if (file === undefined || stat === undefined) return undefined;
  const type = AUDIO_TYPES.get(extname(file).toLowerCase());
  if (type === undefined) return undefined;
  return { name: config.audio, abs: file, size: stat.size, mtimeMs: stat.mtimeMs, type };
}

/**
 * The still shown while the film decodes.
 *
 * The built-in film ships with a pre-extracted frame. An imported film has no
 * frame until someone extracts one, so the panel's import route writes a
 * sibling JPEG (same base name) and this looks for exactly that.
 */
function posterFor(file, builtin) {
  const candidate = builtin ? join(ASSET_DIR, "poster.jpg") : file.replace(/\.[^.]+$/, ".jpg");
  const stat = statFile(candidate);
  if (stat === undefined) return undefined;
  return { abs: candidate, mtimeMs: stat.mtimeMs };
}

/** The URL the film is served from — content-versioned by its mtime. */
function clipUrl(clip) {
  return `${API_PREFIX}/clip?v=${Math.round(clip.mtimeMs)}`;
}

/** The URL the soundtrack is served from — content-versioned by its mtime. */
function audioUrl(audio) {
  return `${API_PREFIX}/audio?v=${Math.round(audio.mtimeMs)}`;
}

/** The URL of the film's poster, versioned by the poster's own mtime. */
function posterUrl(clip) {
  if (clip?.poster === undefined) return undefined;
  return `${API_PREFIX}/poster?v=${Math.round(clip.poster.mtimeMs)}`;
}

function attr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/* ── markup ──────────────────────────────────────────────────────────────── */

/**
 * The stage: the two veil halves, the film between them, and the seam.
 *
 * Order is the stacking order — none of these carries a `z-index`, on purpose:
 * a `z-index` would make the film's wrapper a stacking context of its own, and
 * `mix-blend-mode: screen` would then blend against nothing instead of against
 * the veil, leaving the film's black background opaque and the whole picture
 * dark. Both halves therefore come first in the DOM, the film last but for the
 * seam.
 */
function stageMarkup(clip, config, audio) {
  /* The built-in film ships without a still on purpose: its poster was captured
     at 0.12s, so it held a later frame on screen while the decoder produced
     frame zero — the picture appeared to stop and then rewind. With no poster
     the veil's own waterline carries that moment instead. An imported film
     keeps its still, which the panel captures from frame zero. */
  const poster = config.poster === true && clip.builtin !== true ? posterUrl(clip) : undefined;
  /* A soundtrack of its own replaces the film's mix: two water sounds at once
     muddy each other, and the panel offers no way to level them separately. */
  const silent = config.muted === true || (audio !== undefined && config.keepFilmAudio !== true);
  const video =
    `<video class="dsh-splash__film" src="${attr(clipUrl(clip))}" ` +
    `${silent ? "muted " : ""}playsinline preload="none" ` +
    `${poster === undefined ? "" : `poster="${attr(poster)}" `}` +
    `disablepictureinpicture aria-hidden="true"></video>`;
  return (
    `<div class="dsh-splash__split dsh-splash__split--top"></div>` +
    `<div class="dsh-splash__split dsh-splash__split--bottom"></div>` +
    `<div class="dsh-splash__stage">${video}</div>` +
    `<div class="dsh-splash__waterline" aria-hidden="true"></div>`
  );
}

/**
 * Render the splash markup from the assets on disk.
 *
 * `{{stage}}` and `{{clip}}` are the only template holes; everything else in
 * `splash.html` stays editable without touching this file. HTML comments are
 * stripped first — an authoring note that names a hole (as the template's own
 * header does) would otherwise be filled as well.
 * @returns the markup, or `undefined` when the template cannot be read.
 */
export function buildSplashMarkup({ clip, config, audio }) {
  const template = readAsset("splash.html");
  if (template === undefined || clip === undefined) return undefined;
  return template.text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replaceAll("{{stage}}", stageMarkup(clip, config, audio))
    .replaceAll("{{clip}}", attr(clip.src))
    .trim();
}

/** The data the behaviour script reads back out of the document. */
function splashData({ clip, config, audio, plan }) {
  return {
    clipUrl: clip === undefined ? undefined : clipUrl(clip),
    muted: config.muted === true || (audio !== undefined && config.keepFilmAudio !== true),
    audio:
      audio === undefined
        ? undefined
        : {
            url: audioUrl(audio),
            volume: config.volume,
            /* Seconds into the launch before it starts, so a sound meant to
               land with the breach can be lined up against the picture. */
            startMs: Math.round(config.audioStart * 1000),
            /* The film's own trim: the layer is gone by then, so the tail is
               faded rather than played into an open window. */
            fadeMs: 150,
            /* Let the soundtrack finish after the reveal instead of fading it
               out with the layer. */
            overrun: config.audioOverrun === true,
          },
    volume: config.volume,
    rate: plan === undefined ? config.rate : plan.rate,
    /* When the split starts, measured from the layer mounting: the clock owns
       the launch length, so a target shorter than the film cuts it instead of
       overrunning. */
    revealAtMs:
      plan === undefined
        ? Math.max(400, Math.round(config.duration * 1000) - config.revealMs)
        : plan.playbackMs + plan.holdMs,
    acPowerOnly: config.acPowerOnly === true,
    poster: clip?.poster === undefined ? undefined : posterUrl(clip),
    veilAlpha: config.veilAlpha,
    waterline: config.waterline,
    revealMs: config.revealMs,
    holdMs: config.holdMs,
    forceExitMs: config.forceExitMs,
    newWindowOnly: config.newWindowOnly,
    debugHoldMs: config.debugHoldMs,
    debug: config.debug === true,
  };
}

/**
 * The injection table rows for one index render.
 *
 * Order matters and mirrors the platform's own rows: style in `head` so the
 * canvas is covered at first paint, markup and behaviour in `body` after the
 * theme row has stamped `data-ds-dark-theme`.
 * @returns rows, or an empty list when the splash is switched off or unreadable.
 */
export function splashRows({ env = process.env, config = readConfig(env) } = {}) {
  if (config.enabled !== true) return [];
  const css = readAsset("splash.css");
  const js = readAsset("splash.js");
  const clip = describeClip(config, env);
  if (css === undefined || js === undefined || clip === undefined) return [];
  const audio = describeAudio(config, env);
  const markup = buildSplashMarkup({ clip, config, audio });
  if (markup === undefined) return [];
  const plan = timeline(config, clip);
  const data = splashData({ clip, config, audio, plan });
  return [
    { kind: "style", text: css.text },
    { kind: "html", placement: "body", html: markup },
    { kind: "script", placement: "body", text: `(() => {\nconst DATA = ${JSON.stringify(data)};\n${js.text}\n})()` },
  ];
}

/* ── self-check ──────────────────────────────────────────────────────────── */

/** Where the debug self-check lands; created on first write. */
const DIAG_DIR = join(PLUGIN_ROOT, "diag");

/** Append one JSON line to a diag file. Never throws, never blocks a boot. */
function diagLine(file, data) {
  try {
    mkdirSync(DIAG_DIR, { recursive: true });
    appendFileSync(join(DIAG_DIR, file), `${JSON.stringify({ t: Date.now(), ...data })}\n`);
  } catch {
    /* diagnostics must never be the reason a page fails to load */
  }
}

/**
 * Report what the splash would render, and prove it end to end.
 *
 * Runs once per activation, unconditionally into the host log, and under
 * `debug` into `diag/apply.jsonl`. The `render` section runs the *production*
 * index renderer over a minimal document, which is the only way to see the
 * served rows without the desktop shell's own request credentials.
 */
export function reportBoot({ env = process.env, webServer, log = () => {} } = {}) {
  const config = readConfig(env);
  const clip = describeClip(config, env);
  const assets = {};
  for (const name of ["splash.html", "splash.css", "splash.js"]) {
    const asset = readAsset(name);
    assets[name] = asset === undefined ? undefined : Buffer.byteLength(asset.text);
  }
  let rows = [];
  let render = "skipped";
  try {
    rows = splashRows({ env, config });
    if (webServer !== undefined) {
      const html = webServer.renderIndex('<!doctype html><html><head></head><body><div id="root"></div></body></html>');
      render = html.includes('id="dsh-startup-splash"') ? "carries" : "lacks";
    }
  } catch (error) {
    render = `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  const missing = Object.entries(assets).filter(([, bytes]) => bytes === undefined).map(([name]) => name);
  const clipPart = clip === undefined ? "clip missing" : `clip ${clip.name} ${Math.round(clip.size / 1024)}KB`;
  const plan = timeline(config, clip);
  const audio = describeAudio(config, env);
  const audioPart = audio === undefined ? "sound: film" : `sound: ${audio.name} ${Math.round(audio.size / 1024)}KB`;
  log(
    `[startup-splash] self-check: ${rows.length} rows · render ${render} the splash · ${clipPart} · ` +
      `${config.duration}s launch @${plan.rate.toFixed(2)}x · ` +
      `sound ${config.muted === true ? "muted" : `${Math.round(config.volume * 100)}%`} (${audioPart}) · ` +
      (missing.length === 0 ? "assets readable" : `assets missing: ${missing.join(", ")}`),
  );
  if (config.debug === true) {
    diagLine("apply.jsonl", {
      event: "self-check",
      rows: rows.length,
      render,
      clip: clip === undefined ? null : { name: clip.name, bytes: clip.size },
      assets,
      config,
    });
  }
  return { rows: rows.length, render, clip, assets, config };
}

/**
 * Capture the document the server is about to send, without altering it.
 *
 * `tapIndex` runs after the structured rows are spliced in, which makes it the
 * only place a plugin can see the finished document — the debugger's view of
 * "what did the browser actually receive".
 */
function debugTap() {
  return (html) => {
    try {
      if (readConfig(process.env).debug !== true) return html;
      mkdirSync(DIAG_DIR, { recursive: true });
      const anchorIndex = html.indexOf('id="dsh-startup-splash"');
      diagLine("served.jsonl", {
        event: "write",
        bytes: Buffer.byteLength(html),
        splash: anchorIndex >= 0,
        scripts: (html.match(/script/g) ?? []).length,
        anchor: anchorIndex,
        head: html.indexOf("head"),
      });
      writeFileSync(join(DIAG_DIR, "served.html"), html);
    } catch {
      /* never break a page for diagnostics */
    }
    return html;
  };
}

/* ── routes ──────────────────────────────────────────────────────────────── */

function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": String(Buffer.byteLength(text)), "cache-control": "no-store" });
  res.end(text);
}

/**
 * Hand a path to the Finder. The web page cannot do this itself — only the
 * host process can spawn `open` — and it is the whole point of the "open the
 * film folder" control: the panel tells the user where the films live, this
 * shows them.
 *
 * A *file* is revealed with `-R` so the Finder selects it: the built-in film
 * lives in the plugin's own `assets/`, and opening the (empty) import folder
 * instead would look like the current film is missing.
 * @param target - absolute path to open (a folder, or a file to select).
 * @param select - true to reveal the file itself rather than opening a folder.
 */
function openPath(target, select = false) {
  return new Promise((resolveOpen, rejectOpen) => {
    const args = select ? ["-R", target] : [target];
    execFile("/usr/bin/open", args, (error) => {
      if (error === null) resolveOpen();
      else rejectOpen(error);
    });
  });
}

/** Parse `bytes=start-end` against a known size; `undefined` means "whole file". */
function parseRange(header, size) {
  if (typeof header !== "string") return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (match === null) return { invalid: true };
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return { invalid: true };
  let start;
  let end;
  if (rawStart === "") {
    // Suffix form: the last N bytes.
    const length = Number(rawEnd);
    if (!Number.isFinite(length) || length <= 0) return { invalid: true };
    start = Math.max(0, size - length);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return { invalid: true };
  return { start, end: Math.min(end, size - 1) };
}

/**
 * Serve the film.
 *
 * Chromium seeks video with `Range` requests and refuses a source that answers
 * `200` to one, so this route speaks `206` properly: byte ranges, `accept-ranges`,
 * `content-range`, and `416` for a range it cannot satisfy. The file is opened
 * per request; nothing is buffered in memory.
 */
function clipHandler({ log, env }) {
  const serve = (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    const config = readConfig(env);
    const clip = describeClip(config, env);
    const stat = statFile(clip?.abs);
    if (clip === undefined || stat === undefined) {
      log("clip miss");
      writeJson(res, 404, { ok: false, error: "clip-not-found" });
      return;
    }
    const size = stat.size;
    const range = parseRange(req.headers.range, size);
    const base = {
      "content-type": clip.type,
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
      "content-disposition": `inline; filename="${clip.name}"`,
    };
    if (range?.invalid === true) {
      res.writeHead(416, { ...base, "content-range": `bytes */${size}`, "content-length": "0" });
      res.end();
      return;
    }
    if (range === undefined) {
      res.writeHead(200, { ...base, "content-length": String(size) });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const stream = createReadStream(clip.abs);
      stream.on("error", () => res.destroy());
      stream.pipe(res);
      return;
    }
    const length = range.end - range.start + 1;
    res.writeHead(206, {
      ...base,
      "content-range": `bytes ${range.start}-${range.end}/${size}`,
      "content-length": String(length),
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(clip.abs, { start: range.start, end: range.end });
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  };
  return (req, res) => {
    if (req.method === "POST") {
      importClip({ req, res, env, log });
      return;
    }
    if (req.method === "DELETE") {
      dropImported({ res, env, log });
      return;
    }
    serve(req, res);
  };
}

/**
 * Go back to the built-in film: remove the imported file the config points at,
 * then point the config at the built-in name.
 */
function dropImported({ res, env, log }) {
  const config = readConfig(env);
  const clip = describeClip(config, env);
  if (clip !== undefined && clip.builtin === false) {
    try {
      unlinkSync(clip.abs);
      const poster = clip.abs.replace(/\.[^.]+$/, ".jpg");
      try {
        unlinkSync(poster);
      } catch {
        /* a film may have no poster */
      }
    } catch (error) {
      log(`drop imported failed: ${error instanceof Error ? error.message : String(error)}`);
      writeJson(res, 500, { ok: false, error: "delete-failed" });
      return;
    }
  }
  let next;
  try {
    next = writeConfig(env, { clip: DEFAULT_CLIP });
  } catch (error) {
    log(`restore failed: ${error instanceof Error ? error.message : String(error)}`);
    writeJson(res, 500, { ok: false, error: "write-failed" });
    return;
  }
  writeJson(res, 200, { ...configPayload(env), changed: next });
}

/**
 * Whether the first bytes of an upload look like the container its extension
 * promises. The panel can only be asked this much: a real decode check would
 * need a decoder the host process does not have.
 */
function looksLikeAudio(head, ext) {
  const at = (offset, text) => head.subarray(offset, offset + text.length).toString("latin1") === text;
  switch (ext) {
    case ".mp3":
      return at(0, "ID3") || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
    case ".m4a":
      return at(4, "ftyp");
    case ".aac":
      return at(4, "ftyp") || (head[0] === 0xff && (head[1] & 0xf0) === 0xf0);
    case ".wav":
      return at(0, "RIFF") && at(8, "WAVE");
    case ".ogg":
    case ".opus":
      return at(0, "OggS");
    case ".flac":
      return at(0, "fLaC");
    default:
      return false;
  }
}

/** Store an uploaded soundtrack under its ASCII-folded name and select it. */
function importAudio({ req, res, env, log }) {
  const requested = String(req.headers["x-filename"] ?? "").trim();
  const folded = storedClipName(requested);
  if (!AUDIO_NAME.test(folded)) {
    writeJson(res, 400, { ok: false, error: "bad-filename", expected: AUDIO_NAME.source });
    return;
  }
  const declared = Number(req.headers["content-length"] ?? "0");
  if (Number.isFinite(declared) && declared > AUDIO_IMPORT_LIMIT) {
    writeJson(res, 413, { ok: false, error: "too-large", limit: AUDIO_IMPORT_LIMIT });
    return;
  }
  const dir = audioDir(env);
  const target = resolveInside(dir, folded);
  if (target === undefined) {
    writeJson(res, 400, { ok: false, error: "bad-filename" });
    return;
  }
  log(`[startup-splash] import audio ${JSON.stringify(requested)} as ${folded}`);
  mkdirSync(dir, { recursive: true });
  const part = `${target}.part`;
  const out = createWriteStream(part);
  let bytes = 0;
  let failed = false;
  const fail = (status, error) => {
    if (failed) return;
    failed = true;
    try {
      unlinkSync(part);
    } catch {
      /* the part file may not exist yet */
    }
    writeJson(res, status, { ok: false, error });
  };
  req.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > AUDIO_IMPORT_LIMIT) {
      req.destroy();
      fail(413, "too-large");
    }
  });
  req.pipe(out);
  out.on("error", () => fail(500, "write-failed"));
  out.on("finish", () => {
    if (failed) return;
    let ok = false;
    try {
      const head = Buffer.alloc(16);
      const fd = openSync(part, "r");
      readSync(fd, head, 0, 16, 0);
      closeSync(fd);
      ok = looksLikeAudio(head, extname(folded).toLowerCase());
    } catch {
      ok = false;
    }
    if (ok === false) {
      fail(415, "not-audio");
      return;
    }
    try {
      renameSync(part, target);
    } catch {
      fail(500, "rename-failed");
      return;
    }
    let config;
    try {
      config = writeConfig(env, { audio: folded });
    } catch (error) {
      log(`import audio: config write failed: ${error instanceof Error ? error.message : String(error)}`);
      writeJson(res, 500, { ok: false, error: "config-write-failed" });
      return;
    }
    log(`[startup-splash] imported audio ${folded} (${Math.round(bytes / 1024)}KB)`);
    writeJson(res, 200, { ok: true, bytes, config, audio: { name: folded, bytes } });
  });
}

/** Drop the imported soundtrack and go back to the film's own mix. */
function dropAudio({ res, env, log }) {
  const config = readConfig(env);
  const audio = describeAudio(config, env);
  if (audio !== undefined) {
    try {
      unlinkSync(audio.abs);
    } catch (error) {
      log(`drop audio failed: ${error instanceof Error ? error.message : String(error)}`);
      writeJson(res, 500, { ok: false, error: "delete-failed" });
      return;
    }
  }
  let next;
  try {
    next = writeConfig(env, { audio: "" });
  } catch (error) {
    log(`restore audio failed: ${error instanceof Error ? error.message : String(error)}`);
    writeJson(res, 500, { ok: false, error: "write-failed" });
    return;
  }
  writeJson(res, 200, { ...configPayload(env), changed: next });
}

/**
 * Serve the imported soundtrack.
 *
 * Same `Range` contract as the film: Chromium asks for byte ranges even on
 * audio, and a `200` answer to a range request makes the element refuse to play.
 */
function audioHandler({ log, env }) {
  return (req, res) => {
    if (req.method === "POST") {
      importAudio({ req, res, env, log });
      return;
    }
    if (req.method === "DELETE") {
      dropAudio({ res, env, log });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    const audio = describeAudio(readConfig(env), env);
    const stat = statFile(audio?.abs);
    if (audio === undefined || stat === undefined) {
      writeJson(res, 404, { ok: false, error: "audio-not-found" });
      return;
    }
    const size = stat.size;
    const range = parseRange(req.headers.range, size);
    const base = {
      "content-type": audio.type,
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
      "content-disposition": `inline; filename="${audio.name}"`,
    };
    if (range?.invalid === true) {
      res.writeHead(416, { ...base, "content-range": `bytes */${size}`, "content-length": "0" });
      res.end();
      return;
    }
    if (range === undefined) {
      res.writeHead(200, { ...base, "content-length": String(size) });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const stream = createReadStream(audio.abs);
      stream.on("error", () => res.destroy());
      stream.pipe(res);
      return;
    }
    const length = range.end - range.start + 1;
    res.writeHead(206, {
      ...base,
      "content-range": `bytes ${range.start}-${range.end}/${size}`,
      "content-length": String(length),
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(audio.abs, { start: range.start, end: range.end });
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  };
}

/** A request body, capped; resolves `undefined` when it is too large. */
function readBody(req, limit) {
  return new Promise((resolve_) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      resolve_(value);
    };
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        finish(undefined);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => finish(Buffer.concat(chunks)));
    req.on("error", () => finish(undefined));
  });
}

/** Largest film this plugin will accept from the panel, in bytes. */
const IMPORT_LIMIT = 160 * 1024 * 1024;

/** A soundtrack is minutes at most; 40 MB is generous for a lossless rip. */
const AUDIO_IMPORT_LIMIT = 40 * 1024 * 1024;

/**
 * Accept a film from the Appearance Library panel.
 *
 * The upload is a raw body plus `x-filename`, not multipart: the panel already
 * has the File object, and a `fetch` body stream needs no parser here. The file
 * is written to a `.part` sibling, checked for its container magic, then renamed
 * into place — a half-uploaded film must never become the boot film.
 */
/**
 * The name an imported film is stored under.
 *
 * `x-filename` is whatever the user's file was called, and a Finder file is
 * routinely `启动页.mp4`. HTTP headers cannot carry that (fetch rejects it, and
 * the panel already rewrites it to dashes), so the host folds any name onto the
 * ASCII shape `CLIP_NAME` promises: letters, digits, dot, dash, underscore, in
 * one flat directory. A name with nothing usable left gets a short timestamp so
 * two imports never collide on the empty string.
 * @param raw - the filename the panel sent.
 */
export function storedClipName(raw) {
  const original = String(raw ?? "").trim();
  const extension = extname(original).toLowerCase();
  const stem = original
    .slice(0, Math.max(0, original.length - extension.length))
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-._]+/, "")
    .replace(/[-._]+$/, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
  const base = /^[A-Za-z0-9]/.test(stem) ? stem : `clip-${Date.now().toString(36)}`;
  return `${base}${extension}`;
}

function importClip({ req, res, env, log }) {
  const requested = String(req.headers["x-filename"] ?? "").trim();
  const name = storedClipName(requested);
  if (!CLIP_NAME.test(name) || !CLIP_TYPES.has(extname(name).toLowerCase())) {
    writeJson(res, 400, { ok: false, error: "bad-filename", expected: CLIP_NAME.source });
    return;
  }
  log(`[startup-splash] import ${JSON.stringify(requested)} as ${name}`);
  const type = CLIP_TYPES.get(extname(name).toLowerCase());
  if (type === undefined) {
    writeJson(res, 415, { ok: false, error: "unsupported-type" });
    return;
  }
  const declared = Number(req.headers["content-length"] ?? "0");
  if (Number.isFinite(declared) && declared > IMPORT_LIMIT) {
    writeJson(res, 413, { ok: false, error: "too-large", limit: IMPORT_LIMIT });
    return;
  }
  const dir = clipsDir(env);
  const target = resolveInside(dir, name);
  if (target === undefined) {
    writeJson(res, 400, { ok: false, error: "bad-filename" });
    return;
  }
  mkdirSync(dir, { recursive: true });
  const part = `${target}.part`;
  const out = createWriteStream(part);
  let bytes = 0;
  let failed = false;
  const fail = (status, error) => {
    if (failed) return;
    failed = true;
    try {
      unlinkSync(part);
    } catch {
      /* the part file may not exist yet */
    }
    writeJson(res, status, { ok: false, error });
  };
  req.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > IMPORT_LIMIT) {
      req.destroy();
      fail(413, "too-large");
    }
  });
  req.pipe(out);
  out.on("error", () => fail(500, "write-failed"));
  out.on("finish", () => {
    if (failed) return;
    let magic = false;
    try {
      const head = Buffer.alloc(12);
      const fd = openSync(part, "r");
      readSync(fd, head, 0, 12, 0);
      closeSync(fd);
      magic =
        type === "video/webm"
          ? head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
          : head.subarray(4, 8).toString("latin1") === "ftyp";
    } catch {
      magic = false;
    }
    if (magic === false) {
      fail(415, "not-a-video");
      return;
    }
    try {
      renameSync(part, target);
    } catch {
      fail(500, "rename-failed");
      return;
    }
    let config;
    try {
      config = writeConfig(env, { clip: name });
    } catch (error) {
      log(`import: config write failed: ${error instanceof Error ? error.message : String(error)}`);
      writeJson(res, 500, { ok: false, error: "config-write-failed" });
      return;
    }
    log(`[startup-splash] imported ${name} (${Math.round(bytes / 1024)}KB)`);
    writeJson(res, 200, { ok: true, bytes, config, clip: { name, bytes } });
  });
}

/** The still the panel and the splash show before the film decodes. */
function posterHandler({ env, log }) {
  return async (req, res) => {
    if (req.method === "POST") {
      /* The panel captures the first frame of an imported film in a canvas and
         posts it here, so an imported film gets a poster without a decoder. */
      const body = await readBody(req, 4 * 1024 * 1024);
      if (body === undefined) {
        writeJson(res, 413, { ok: false, error: "too-large" });
        return;
      }
      const jpeg = body.length > 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
      if (jpeg === false) {
        writeJson(res, 415, { ok: false, error: "not-a-jpeg" });
        return;
      }
      const clip = describeClip(readConfig(env), env);
      if (clip === undefined || clip.builtin === true) {
        writeJson(res, 409, { ok: false, error: "no-imported-clip" });
        return;
      }
      const target = clip.abs.replace(/\.[^.]+$/, ".jpg");
      try {
        writeFileSync(target, body);
      } catch (error) {
        log(`poster write failed: ${error instanceof Error ? error.message : String(error)}`);
        writeJson(res, 500, { ok: false, error: "write-failed" });
        return;
      }
      writeJson(res, 200, { ok: true, bytes: body.length, poster: posterUrl(describeClip(readConfig(env), env)) });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    const clip = describeClip(readConfig(env), env);
    const stat = statFile(clip?.poster?.abs);
    if (clip === undefined || stat === undefined) {
      writeJson(res, 404, { ok: false, error: "poster-not-found" });
      return;
    }
    res.writeHead(200, {
      "content-type": "image/jpeg",
      "content-length": String(stat.size),
      "cache-control": "private, max-age=3600",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(clip.poster.abs);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  };
}

/** What the panel reads: the live config plus what the film resolves to. */
function configPayload(env) {
  const config = readConfig(env);
  const clip = describeClip(config, env);
  let imported = [];
  try {
    imported = readdirSync(clipsDir(env))
      .filter((name) => CLIP_NAME.test(name))
      .map((name) => {
        const stat = statFile(join(clipsDir(env), name));
        return { name, bytes: stat === undefined ? 0 : stat.size };
      });
  } catch {
    imported = [];
  }
  const audio = describeAudio(config, env);
  const plan = timeline(config, clip);
  let audioImported = [];
  try {
    audioImported = readdirSync(audioDir(env))
      .filter((name) => AUDIO_NAME.test(name))
      .map((name) => {
        const stat = statFile(join(audioDir(env), name));
        return { name, bytes: stat === undefined ? 0 : stat.size };
      });
  } catch {
    audioImported = [];
  }
  return {
    ok: true,
    package: PACKAGE_NAME,
    home: resolveHarnessHome(env),
    configFile: configFile(env),
    config,
    defaults: DEFAULT_CONFIG,
    rates: RATE_CHOICES,
    clip:
      clip === undefined
        ? null
        : {
            name: clip.name,
            builtin: clip.builtin,
            bytes: clip.size,
            type: clip.type,
            poster: clip.poster === undefined ? null : posterUrl(clip),
          },
    imported,
    audio:
      audio === undefined
        ? null
        : { name: audio.name, bytes: audio.size, type: audio.type, url: audioUrl(audio) },
    audioImported,
    audioDir: audioDir(env),
    filmSeconds: plan.filmSeconds === undefined ? null : plan.filmSeconds,
    rate: plan.rate,
    durationMs: plan.durationMs,
  };
}

/**
 * Read and write the settings the panel exposes.
 *
 * `PUT` takes a partial config so the panel can write one field at a time; the
 * body is validated by `mergeConfig`, so a malformed value degrades to the
 * default instead of reaching the markup.
 */
function configHandler({ env, log }) {
  return async (req, res) => {
    if (req.method === "GET") {
      writeJson(res, 200, configPayload(env));
      return;
    }
    if (req.method !== "PUT" && req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    const body = await readBody(req, 16 * 1024);
    if (body === undefined) {
      writeJson(res, 413, { ok: false, error: "too-large" });
      return;
    }
    let patch;
    try {
      patch = JSON.parse(body.toString("utf8") || "{}");
    } catch {
      writeJson(res, 400, { ok: false, error: "bad-json" });
      return;
    }
    let config;
    try {
      config = writeConfig(env, patch);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`config write failed: ${message}`);
      writeJson(res, 500, { ok: false, error: "write-failed", detail: message });
      return;
    }
    writeJson(res, 200, { ...configPayload(env), changed: config });
  };
}

/**
 * Report what the splash would render, and prove it end to end.
 *
 * The `render` section runs the *production* index renderer over a minimal
 * document, which is the only way to see the served rows without the desktop
 * shell's own request credentials: it fails if the table, the row shapes or the
 * renderer disagree about anything.
 */
function probeHandler({ webServer, log, env }) {
  return (req, res) => {
    if (req.method !== "GET") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    const config = readConfig(env);
    const clip = describeClip(config, env);
    const rows = splashRows({ env, config });
    const assets = {};
    for (const name of ["splash.html", "splash.css", "splash.js"]) {
      const asset = readAsset(name);
      assets[name] = asset === undefined ? null : { bytes: Buffer.byteLength(asset.text), mtimeMs: Math.round(asset.mtimeMs) };
    }
    let render;
    try {
      const html = webServer.renderIndex('<!doctype html><html><head></head><body><div id="root"></div></body></html>');
      render = {
        ok: html.includes('id="dsh-startup-splash"'),
        bytes: Buffer.byteLength(html),
        rows: rows.map((row) => ({ kind: row.kind, placement: row.placement ?? "head" })),
      };
    } catch (error) {
      render = { ok: false, error: error instanceof Error ? error.message : String(error) };
      log(`probe render failed: ${render.error}`);
    }
    writeJson(res, 200, {
      ok: true,
      package: PACKAGE_NAME,
      prefix: API_PREFIX,
      config,
      assets,
      clip:
        clip === undefined
          ? null
          : { name: clip.name, bytes: clip.size, type: clip.type, url: clipUrl(clip), mtimeMs: Math.round(clip.mtimeMs) },
      render,
    });
  };
}

/**
 * Record one line the page wants to report.
 *
 * The desktop fences every request that is not its own renderer, which leaves a
 * plugin with no in-app view at all: this route is that view. The splash page
 * sends its own mount, film state and exit as a GET whose payload rides in the
 * query, so the report survives the page's unload (`keepalive`) and needs no
 * request-body plumbing here. Silent unless `config.debug` is on.
 */
function beaconHandler({ log, env }) {
  return (req, res) => {
    if (req.method !== "GET") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    if (readConfig(env).debug !== true) {
      writeJson(res, 200, { ok: true, stored: false });
      return;
    }
    let params;
    try {
      params = new URL(req.url ?? "/", "http://x").searchParams;
    } catch {
      writeJson(res, 400, { ok: false, error: "bad-url" });
      return;
    }
    const event = (params.get("event") ?? "?").slice(0, 40);
    let data;
    try {
      data = JSON.parse(params.get("data") ?? "{}");
    } catch {
      data = { raw: (params.get("data") ?? "").slice(0, 200) };
    }
    diagLine("renderer.jsonl", { event, data });
    log(`[startup-splash] renderer: ${event}`);
    writeJson(res, 200, { ok: true, stored: true });
  };
}

/**
 * Show the film that is actually playing in the Finder.
 *
 * The first version opened the import folder, which is empty while the built-in
 * film is in use — the panel then looked like it had lost the film. Now the
 * current film is revealed and selected; the import folder is only the fallback
 * for a config that points at a file that is no longer there.
 */
export function revealHandler({ env, log, open = openPath }) {
  return async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method-not-allowed" });
      return;
    }
    const dir = clipsDir(env);
    const current = describeClip(readConfig(env), env);
    try {
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      log(`[startup-splash] reveal could not create the film folder: ${error instanceof Error ? error.message : String(error)}`);
      writeJson(res, 500, { ok: false, error: "mkdir-failed" });
      return;
    }
    try {
      if (current === undefined) {
        await open(dir, false);
        writeJson(res, 200, { ok: true, path: dir, selected: null });
        return;
      }
      await open(current.abs, true);
      writeJson(res, 200, { ok: true, path: dirname(current.abs), selected: current.abs });
    } catch (error) {
      log(`[startup-splash] reveal failed: ${error instanceof Error ? error.message : String(error)}`);
      writeJson(res, 500, { ok: false, error: "open-failed" });
    }
  };
}

/** Every route this plugin owns, as descriptors for `ctx.webServer.register`. */
export function makeRoutes({ env = process.env, webServer, log = () => {} } = {}) {
  return [
    { kind: "exact", path: `${API_PREFIX}/clip`, handler: clipHandler({ log, env }) },
    { kind: "exact", path: `${API_PREFIX}/audio`, handler: audioHandler({ log, env }) },
    { kind: "exact", path: `${API_PREFIX}/poster`, handler: posterHandler({ env, log }) },
    { kind: "exact", path: `${API_PREFIX}/config`, handler: configHandler({ env, log }) },
    { kind: "exact", path: `${API_PREFIX}/probe`, handler: probeHandler({ webServer, log, env }) },
    { kind: "exact", path: `${API_PREFIX}/beacon`, handler: beaconHandler({ log, env }) },
    { kind: "exact", path: `${API_PREFIX}/reveal`, handler: revealHandler({ env, log }) },
  ];
}

/* ── plugin ──────────────────────────────────────────────────────────────── */

/**
 * Mount the routes and subscribe the injection table.
 *
 * Both halves are wrapped: the web shell fails its whole boot when a plugin
 * `apply` throws, and a splash must never be the reason the GUI does not open.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  const log = (line) => ctx.logger.warn(line);
  try {
    ctx.inject(["webServer"], (webCtx) => {
      const routes = makeRoutes({
        env: process.env,
        webServer: webCtx.webServer,
        log: (line) => webCtx.logger.warn(line),
      });
      webCtx.effect(() => {
        const disposers = routes.map((route) => webCtx.webServer.register(route));
        return () => {
          for (const dispose of disposers) dispose();
        };
      }, "startup-splash: routes");
      webCtx.effect(() => {
        const dispose = webCtx.webServer.tapIndex(debugTap());
        return () => dispose();
      }, "startup-splash: debug tap");
      webCtx.logger.info(`[startup-splash] ${routes.length} routes mounted under ${API_PREFIX}`);
      try {
        reportBoot({ env: process.env, webServer: webCtx.webServer, log: (line) => webCtx.logger.warn(line) });
      } catch (error) {
        webCtx.logger.warn(`[startup-splash] self-check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  } catch (error) {
    log(`[startup-splash] no web server to mount on: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    ctx.on("webserver/index-inject", (table) => {
      try {
        const rows = splashRows({ env: process.env });
        for (const row of rows) table.push(row);
        if (readConfig(process.env).debug === true) diagLine("inject.jsonl", { event: "inject", rows: rows.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`[startup-splash] rows skipped: ${message}`);
        diagLine("inject.jsonl", { event: "inject", rows: 0, error: message });
      }
    });
  } catch (error) {
    log(`[startup-splash] index injection unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export { API_PREFIX, DEFAULT_CLIP, DEFAULT_CONFIG, PACKAGE_NAME, PLUGIN_ROOT };
