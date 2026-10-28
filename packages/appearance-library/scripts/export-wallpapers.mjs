#!/usr/bin/env node
/**
 * Export the Mac's own wallpaper resources as DSH skins.
 *
 * Two resource families are collected, both read-only:
 *
 *  1. Desktop pictures — `/System/Library/Desktop Pictures/*.heic` (6016×6016)
 *     and the MobileAsset cache `/System/Library/AssetsV2/
 *     com_apple_MobileAsset_DesktopPicture/*.asset/AssetData/*.heic`.
 *     The `.madesktop` files beside them are plists carrying only metadata
 *     (id, size, thumbnail path) — the pixels are always in one of those two
 *     places, so the scan reads image files and never the descriptors.
 *  2. Dynamic wallpapers — `/System/Library/Desktop Pictures/.wallpapers/
 *     <set>/*.mov` (HEVC). Exported as a poster JPEG plus an H.264 MP4, since
 *     HEVC-in-MOV is not a safe thing to hand a `<video>` element and the skin
 *     center's asset route has no `.mov` MIME entry at all.
 *
 * Each wallpaper becomes one DSH skin directory under `$DSH_HOME/skins/`:
 *
 *     wl-<slug>/skin.json          manifest v2, backgroundMedia per theme
 *     wl-<slug>/skin.css           translucency only — no palette of its own
 *     wl-<slug>/assets/full.jpg    the wallpaper (or wallpaper.mp4 for video)
 *     wl-<slug>/preview/*.jpg      catalogue preview + grid tile
 *
 * Plus `_library.json` in the skin root: the catalogue the sidebar panel
 * reads. It lists only skins that were actually written, so the panel can
 * never offer a wallpaper it cannot render.
 *
 * Usage:
 *   node scripts/export-wallpapers.mjs                 # build everything
 *   node scripts/export-wallpapers.mjs --dry-run       # print the plan, touch nothing
 *   node scripts/export-wallpapers.mjs --only sonoma,big-sur   # substring filter on the id
 *   node scripts/export-wallpapers.mjs --force         # re-encode even when the asset exists
 *   node scripts/export-wallpapers.mjs --videos        # include the dynamic .mov wallpapers
 *   node scripts/export-wallpapers.mjs --report        # print the shipped catalogue
 *   node scripts/export-wallpapers.mjs --ids wl-sonoma # exactly these ids, nothing else
 *   node scripts/export-wallpapers.mjs --no-loop-seam # re-cut films *without* the loop dissolve
 *
 * The export is idempotent: an asset whose output already exists is skipped
 * unless `--force` is given, and a skin is rewritten only when its manifest or
 * stylesheet bytes would change.
 *
 * Loop seam: a film whose id sits in `_loop-seam.json` (beside the catalogue)
 * is re-cut so its tail cross-dissolves into its head over `VIDEO.seamSeconds`
 * — the jump at the loop join is a cut today, and a dissolve where the first
 * and last frames agree is nothing to see. It stays one file: the seam is a
 * property of the encode, not a second asset to switch between, so toggling it
 * re-encodes, and `--no-loop-seam` is the way back to the plain film.
 *
 * That idempotence is what makes removal need a record: deleting a skin
 * directory would otherwise be undone by the very next export, because the
 * wallpaper is still on this Mac to be discovered. So a removal appends an
 * entry to `.removed.json` in the skin root first, and every later run skips
 * those ids. `--ids` is the counterpart — the host uses it to bring back
 * exactly one wallpaper without re-encoding the whole library.
 */

import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SIPS = "/usr/bin/sips";
const FFMPEG = process.env.DSH_FFMPEG ?? "ffmpeg";
const FFPROBE = process.env.DSH_FFPROBE ?? "ffprobe";

/** Skin ids this exporter authors — the same prefix the host half scans for. */
const SKIN_PREFIX = "wl-";

/**
 * Where removed wallpapers are remembered, in the skin root beside
 * `_library.json`. The host's remove route appends to it and its restore
 * route deletes from it, so both halves must agree on the name and shape.
 */
const REMOVED_FILE = ".removed.json";

/** Manifest ids are checked with the skin center's own rule, here as everywhere. */
const ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

/**
 * Read the removal list: `{id, nameZh, cluster, source, removedAt}` records.
 *
 * Deliberately tolerant. A hand-written list of bare id strings is accepted,
 * entries that cannot be used are dropped rather than thrown over, and a
 * corrupt file reads as "nothing was removed" — losing the exclusions is
 * recoverable (the next removal rewrites the file), while refusing to export
 * because one line is malformed is not.
 */
function readRemoved(root) {
  const path = join(root, REMOVED_FILE);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.removed) ? parsed.removed : [];
    return list
      .map((item) => (typeof item === "string" ? { id: item } : item))
      .filter((item) => typeof item?.id === "string" && ID_PATTERN.test(item.id));
  } catch {
    return [];
  }
}

/**
 * Where the seamless-loop preference lives, in the skin root beside
 * `_library.json` and `.removed.json`.
 *
 * A film is exported to exactly one file, so "this wallpaper loops seamlessly"
 * is not a second asset to switch between — it is a property of how the film
 * was encoded, and toggling it means re-encoding. The preference therefore has
 * to outlive the run that wrote it: the host's seam route adds or drops an id
 * here, and the next export honours it. Both halves must agree on the name.
 */
const LOOP_SEAM_FILE = "_loop-seam.json";

/**
 * Read the seamless-loop preference as a set of skin ids.
 *
 * Tolerant in the same way as the removal list: a bare array is accepted, ids
 * that could not be skin ids are dropped, and a corrupt file reads as "nothing
 * is opted in". Off is the safe default — it is what the film already was.
 * @param root - the skin root.
 * @returns the ids whose film should be re-cut with a loop seam.
 */
function readLoopSeam(root) {
  const path = join(root, LOOP_SEAM_FILE);
  if (!existsSync(path)) return new Set();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.ids) ? parsed.ids : [];
    return new Set(list.filter((id) => typeof id === "string" && ID_PATTERN.test(id)));
  } catch {
    return new Set();
  }
}

/** Rendered sizes. `full` is the wallpaper itself; 2560 covers a 5K desktop. */
const TIERS = [
  { key: "full", max: 2560, quality: 82, file: "assets/wallpaper.jpg" },
  { key: "preview", max: 1080, quality: 78, file: "preview/wallpaper.jpg" },
  { key: "thumb", max: 320, quality: 75, file: "thumb/wallpaper.jpg" },
];

/**
 * Film encoding.
 *
 * These numbers are not arbitrary. The Apple films are smooth gradients
 * carrying fine film grain, and x264 spends most of its bitrate reproducing
 * that grain: at `crf 27` / `preset medium` a 90-second portrait clip came out
 * at 37 MB, which is far too much to hand a `<video>` element on every
 * wallpaper switch. A light temporal denoise (`hqdn3d`, 2 px luma) removes
 * exactly that grain — invisible behind the skin's readability scrim and the
 * shell's own background blur — and costs roughly half the bytes. `veryfast`
 * is used because at this CRF the result on gradients is indistinguishable
 * while the encode is several times quicker; the alternative was minutes per
 * clip for no visible gain. A portrait film is scaled on its long edge to
 * 1920, because a portrait wallpaper is letterboxed by a landscape display
 * anyway and 2160 px of height is wasted on it.
 */
const VIDEO = {
  maxLongEdge: 1920,
  crf: 28,
  preset: "veryfast",
  denoise: "hqdn3d=2:1:2:3",
  posterSeekSeconds: "2",
  /**
   * Length of the loop seam, in seconds, for a film whose skin has opted in.
   *
   * The wallpaper player runs the film with `loop`, so the last frame is
   * followed by the first one: a cut, and a visible jump whenever the two ends
   * do not match. Two seconds of cross-dissolve laid over that join — the tail
   * fading into the head — turns the cut into a dissolve, and the film's new
   * first and last frames are then the *same* frame, so the wrap is seamless.
   * Two seconds is long enough to read as a dissolve rather than a flash and
   * short enough that the overlap never looks like a frozen shot.
   */
  seamSeconds: 2,
};

/** Same bytes serve both themes; only the scrim differs, and it lives in the manifest. */
const THEME_PREVIEW = { light: "preview/wallpaper.jpg", dark: "preview/wallpaper.jpg" };

/** Readability scrim over the wallpaper, per theme. */
const SCRIM = {
  light: "linear-gradient(180deg, rgba(250,250,252,0.18) 0%, rgba(246,247,250,0.34) 46%, rgba(240,242,246,0.54) 100%)",
  dark: "linear-gradient(180deg, rgba(6,9,16,0.34) 0%, rgba(9,13,22,0.48) 46%, rgba(6,9,16,0.62) 100%)",
};

/** The manifest declares the wallpaper; the stylesheet only decides transparency. */
const SKIN_CSS = `/*
 * Wallpaper skin — %NAME%
 *
 * Palette deliberately untouched: every colour token stays the official shell's,
 * so light and dark keep the exact contrast the GUI was audited with and this
 * skin cannot make text unreadable. Only the surfaces are opened up, so the
 * wallpaper reads through them.
 *
 * The rules the whole look depends on, copied from the official blue-fantasy
 * skin because getting any of them wrong makes the wallpaper invisible:
 *
 *  1. --dsw-alias-bg-base must be ABSENT at rest. The Desktop shell paints it
 *     straight onto .dshDesktopConversationSurface (the whole area between the
 *     rails) and the caption rows, so anything opaque there is a shield over
 *     the art. It therefore scales UP from zero, and the shell's own background
 *     is what holds the line when a stronger scrim is asked for.
 *  2. Dark mode is selected by body[data-ds-dark-theme], NOT by an attribute on
 *     the html element: the theme presenter sets it on the body
 *     (document.body.setAttribute). A dark block keyed on html never matches,
 *     which silently leaves dark mode wearing the light palette.
 *  3. The surface values must stay PARSEABLE CSS. An earlier revision wrote them
 *     as colour-mix with a math.max() weight, which is invalid twice over:
 *     math.max is not a CSS function (it is max), and even then a colour-mix
 *     weight must be a percentage, not a plain number. Custom properties are not
 *     validated on declaration, so the skin still loaded; the failure only
 *     surfaced where var() consumed them, where the whole declaration went
 *     invalid at computed-value time and background fell back to transparent.
 *     Every sheet that paints --dsw-alias-bg-layer-2 (Settings, remote control)
 *     became see-through and its text collided with the conversation behind it.
 *     Use rgba() with a clamp() alpha instead.
 *  4. Those sheets also darken their backdrop with --dsw-alias-bg-mask-1 and blur
 *     it with --dsw-mask-blur. The shell defaults them to 24%-black and no blur,
 *     which is not enough separation over a photograph, so this skin states both.
 *     This skin asks for 5px: the scrim already holds the line, and a heavier
 *     blur turns the wallpaper into grey mush behind every dialog.
 *  5. The secondary panels and the composer card wear the menu material, not
 *     the flat layer-2 fill. A shared rule cannot set position for them (the
 *     settings panel is a static flex child, the market layer is fixed), so
 *     the material rides background-color and backdrop-filter instead. The
 *     fill is --dsw-skin-glass-fill, a literal: the Desktop shell rewrites
 *     --dsw-menu-surface-fill to layer-2 inside the glass window. See below.
 *
 *  6. The transcript reserves 24px at both ends, so a line never butts against
 *     the header rule or the composer card. The top padding rides the
 *     scrollport; the bottom one has to ride the message container instead,
 *     because the skin center pins the scrollport's own bottom padding to 0
 *     with !important. See the block at the end of this sheet.
 *
 *  7. In the Desktop modes the shell paints a second set of surfaces - the
 *     titlebar's version-and-mode popover, the native-action menus, the LAN
 *     warning dialog - from its own sheet, which the rules above never reach.
 *     Worse, it re-points two tokens this skin had already opened up: the menu
 *     fill in the glass window, and the sidebar surface in the opaque one. The
 *     section before the reduced-transparency block matches it on specificity
 *     to bring all of those back in line. See it for the exact selectors.
 *
 * Every value also scales with --dsw-skin-scrim, which the skin center publishes
 * on the body for its background-opacity slider (0 at rest).
 */

:root {
  color-scheme: light dark;
}

:root {
  color-scheme: light;
  --dsw-alias-bg-base: rgba(250, 250, 252, calc(var(--dsw-skin-scrim, 0) * 0.46));
  --dsw-alias-bg-layer-1: rgba(252, 252, 254, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.34), 1));
  --dsw-alias-bg-layer-2: rgba(246, 247, 250, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.30), 1));
  --dsw-alias-bg-layer-3: rgba(240, 242, 246, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.26), 1));
  --dsw-alias-bg-module-platform: rgba(246, 247, 250, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.30), 1));
  --dsw-specific-sidebar-fill: rgba(250, 250, 252, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.36), 1));
  --dsw-specific-input-major: rgba(252, 252, 254, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.28), 1));
  --dsw-alias-bg-mask-1: rgba(0, 0, 0, 0.36);
  --dsw-skin-glass-fill: rgba(248, 249, 250, 0.58);
  --dsw-skin-scrim-band: linear-gradient(180deg, rgba(250,250,252,0.18) 0%, rgba(246,247,250,0.34) 46%, rgba(240,242,246,0.54) 100%);
  --dsw-mask-blur: blur(5px) saturate(140%);
}

body[data-ds-dark-theme] {
  color-scheme: dark;
  --dsw-alias-bg-base: rgba(8, 11, 19, calc(var(--dsw-skin-scrim, 0) * 0.5));
  --dsw-alias-bg-layer-1: rgba(15, 20, 32, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.32), 1));
  --dsw-alias-bg-layer-2: rgba(20, 26, 41, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.27), 1));
  --dsw-alias-bg-layer-3: rgba(25, 32, 50, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.23), 1));
  --dsw-alias-bg-module-platform: rgba(20, 26, 41, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.27), 1));
  --dsw-specific-sidebar-fill: rgba(13, 18, 29, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.34), 1));
  --dsw-specific-input-major: rgba(18, 23, 37, clamp(0.28, calc(1 - var(--dsw-skin-scrim, 0) * 0.25), 1));
  --dsw-alias-bg-mask-1: rgba(0, 0, 0, 0.55);
  --dsw-skin-glass-fill: rgba(67, 69, 74, 0.45);
  --dsw-skin-scrim-band: linear-gradient(180deg, rgba(6,9,16,0.34) 0%, rgba(9,13,22,0.48) 46%, rgba(6,9,16,0.62) 100%);
  --dsw-mask-blur: blur(5px) saturate(140%);
}

/* ── Menu material on the secondary panels and the composer card ──────────
 * Settings and remote control used to paint the flat --dsw-alias-bg-layer-2
 * fill, which reads as a hole cut into the wallpaper. They now wear the menu
 * material: the fill the slash menu's surface layer paints, plus the frost it
 * filters the page through. The stroke rides --dsw-elevation-stroke-color,
 * which the shell's elevation shadows already consume.
 *
 * The fill is a LITERAL, never --dsw-menu-surface-fill, and that is the whole
 * fix of 2026-10-10. The Desktop shell re-points that token to
 * --dsw-alias-bg-layer-2 for body:is([data-dsh-desktop-mode="extended"],
 * [data-dsh-desktop-mode="advanced"])[data-dsh-desktop-platform="darwin"]
 * [data-dsh-desktop-material="transparent"] - the glass window, and the one
 * this reader runs: mode=advanced, platform=darwin, material=transparent, read
 * straight off the renderer URL in the shell's own cache. Inside that window
 * the menu fill IS layer-2, so reading the token made every rule below resolve
 * to the very fill these surfaces already painted: the sheet loaded, the rules
 * matched, and nothing changed on screen. The literals are the theme's own menu
 * surface, #f8f9fa94 light and #43454a73 dark (58% and 45% alpha), so the
 * material no longer depends on a token the shell is free to rewrite. The frost
 * still reads --dsw-menu-backdrop-filter, which the shell leaves alone.
 *
 * (Historical note: the fill must be the MENU's own surface, never
 * --dsw-specific-menu, which the skin center re-derives per skin as
 * color-mix(layer-1 60%, transparent) and which resolves visibly darker.)
 *
 * Three structural facts, all checked against this build:
 *  - A full-screen layer keeps its card in a CHILD (the market overlay, the
 *    image lightbox, the account platform), so such a layer must never take a
 *    fill itself: that would wash the whole viewport. The market layer is
 *    excluded by name and its card named directly; the lightbox is excluded by
 *    the aria-hidden mask it holds; the account platform is the one that puts a
 *    real header element first, which none of the panels that want the menu
 *    material does.
 *  - Nothing here touches position or inset. The settings panel is a static
 *    flex child while the market layer is position: fixed, and no single rule
 *    can set position for both without breaking one of them.
 *  - The composer card takes the fill only. Its frost already belongs to the
 *    skin center's input-card-blur slider, and a backdrop-filter here would
 *    hand the composer card a containing block again (issue #1724).
 */
[data-shortcut-modal="settings"],
[role="dialog"][aria-modal="true"]:not(.dshMarketOverlay):not(:has(> header)):not(:has(> [aria-hidden="true"])),
[role="alertdialog"][aria-modal="true"]:not(.dshMarketOverlay):not(:has(> header)):not(:has(> [aria-hidden="true"])),
.dshMarketOverlayPanel {
  background-color: var(--dsw-skin-glass-fill, var(--dsw-alias-bg-layer-2));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l3);
}

[data-composer-card] {
  background-color: var(--dsw-skin-glass-fill, var(--dsw-alias-bg-layer-2));
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l3);
}

/* ── The transcript stops dead where the composer begins ─────────────────
 * The composer seat is sticky at the bottom of the scroll area (z-index 7), so
 * message text keeps rolling underneath it. The shell hides that with a 36px
 * occlusion gradient painted in --dsw-alias-bg-base, and the skin center
 * deletes that gradient outright while a skin paints a backdrop so the art
 * reaches the viewport edge. The frost that would otherwise disguise the text
 * cannot help either: issue #1724 forces it onto a body-level sibling at
 * z-index -1, which sits BEHIND the very text it should hide, so blurring the
 * band only turns the collision into a smudge - the text is still there.
 *
 * So this band does not frost anything: it paints the backdrop it stands on.
 * The wallpaper is one image (the skin layer's own assets/wallpaper.jpg under
 * the manifest's scrim gradient), and a fixed background attachment
 * reproduces exactly the pixels the reader would see there anyway. Being
 * opaque, the band hides everything painted below it - the transcript - while
 * the band itself is invisible against the art it copies. Above the seat the
 * transcript is untouched: the text is simply gone from the line where the
 * composer starts, with no blur and no fade involved.
 *
 * The card is not touched: the band rides in the seat's own stacking context
 * at z-index -1, above the transcript and below the input card, so the card
 * keeps its translucent fill and its own frost. Every skin here ships an
 * image wallpaper, so the copy always has a source.
 */
[data-phase="active"] [data-dsh-part="scrollport"] > [data-composer-seat]::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: var(--dsw-skin-scrim-band, linear-gradient(180deg, rgba(250,250,252,0.18) 0%, rgba(246,247,250,0.34) 46%, rgba(240,242,246,0.54) 100%)), url("assets/wallpaper.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

/* ── Menu material on the sidebar, and the wallpaper behind it ─────────────
 * The wallpaper is already a fixed, full-window layer (z-index -2); it only
 * LOOKED cut off because the sidebar painted an opaque slab over it. That slab
 * belongs to the sidebar plugin's root, a CSS-Modules hashed class we must not
 * name, so the fill is swapped by re-pointing the skin's own
 * --dsw-specific-sidebar-fill token on the column that carries the stable
 * data-pane="sidebar" hook. That column goes transparent and takes the frost
 * instead, which leaves exactly the menu surface: the fill still painted by the
 * inner root, the blur now on the column, over the wallpaper.
 * That inner root is the ONLY element in the subtree that reads the token; the
 * column has no fixed descendant to re-anchor; and the menus opened from the
 * sidebar are portalled to the body, so they keep blurring the page.
 */
[data-pane="sidebar"] {
  --dsw-specific-sidebar-fill: var(--dsw-skin-glass-fill, var(--dsw-alias-bg-layer-1));
  background-color: transparent;
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
}

/* ── The sidebar column is the sheet of glass ─────────────────────────────
 * The glass this skin paints on the sidebar belongs on the box that spans the
 * whole column, not on the pane inside it, for two measured reasons:
 *
 *   collapsed. Darwin gives the rail a width of its own -
 *     [advanced][darwin][data-sidebar-collapsed] .dshDesktopUpstreamSidebar
 *       { width: 56px; margin: 0 auto }
 *   - centring that 56px rail inside a 90px column, so a fill painted on the
 *   pane stopped 17px short of each edge and the raw, unblurred wallpaper came
 *   through as a hard vertical seam down both sides of the icons.
 *
 *   expanded. The shell reserves the top 20px of the column for the traffic
 *   lights ([advanced][darwin] .dshDesktopUpstreamSidebar { padding-top: 20px })
 *   and the pane, the element that paints --dsw-specific-sidebar-fill, starts
 *   below it, so the strip above carried the column's frost but no fill and read
 *   a full 20px band lighter than the sidebar under it.
 *
 * Both are one and the same gap: fill on a box narrower than the column. So the
 * fill and the frost live on .dshDesktopSidebarSurface - opened up in the
 * desktop-modes block further down - and the pane gives its own up: its
 * --dsw-specific-sidebar-fill goes transparent, so the inner root, the only
 * reader of that token, paints nothing, and its frost is dropped so the
 * wallpaper is not blurred twice over the middle.
 *
 * The caption strip the motion sheet used to draw across those 20px goes with
 * it. It is neutralised here rather than deleted, so that a skin still shipping
 * it cannot stack a second sheet of glass on the top of the column.
 */
body[data-dsh-desktop-mode] [data-pane="sidebar"] {
  --dsw-specific-sidebar-fill: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* ── The collapsed rail sits in a narrower column ─────────────────────────
 * The shell sizes that column in JavaScript - collapsedSidebarWidth() returns
 * 90 for advanced mode on darwin - and writes the width inline on
 * .dshDesktopFrame, so an author-important declaration is the one lever CSS
 * has here. 72px leaves the shell's own 56px rail centred with 8px of glass on
 * either side, and the rail keeps the plugin's 36px icon buttons on the
 * column's centre line: the collapsed pane pads itself 10px inline, leaving
 * exactly 36px of content box for them to fill edge to edge rather than hug
 * one side.
 *
 * Scoped to advanced mode on darwin and to a closed rightbar on purpose. Only
 * that combination starts from the 90px column; extended mode and win32 use
 * the 56px rail, which this rule would widen, and with the rightbar open its
 * width is computed in JavaScript too - the rule replaces the whole
 * grid-template-columns declaration, so it must not run while that column is
 * anything but zero.
 */
body[data-dsh-desktop-mode] .dshDesktopFrame[data-desktop-mode="advanced"][data-desktop-platform="darwin"][data-sidebar-collapsed][data-rightbar-collapsed] {
  grid-template-columns: 72px minmax(0, 1fr) 0px !important;
}

/* ── The collapsed rail drops the workspace region's two icons ────────────
 * ui-workspace fills the sidebar's "sidebar.workspaces" hole and branches on
 * the shell's wide flag. The expanded browser draws a full section header -
 * the "工作区" label, the view-options menu, the search field and the
 * add-workspace button - while the rail state renders only two 36px entry
 * controls off that same header: the search button and the add-workspace
 * button. Those two are the only workspace controls left once the column
 * collapses, and they read as two more rows of a primary navigation the rail
 * otherwise mirrors one for one, so they are hidden there.
 *
 * Located by accessible name, not by className: this package's classes are
 * CSS-Modules hashes (tPVXea_*) that move with every build, while aria-label
 * is the component's own contract - t("search.sessions.aria") and
 * t("workspace.add"). Both dictionaries are stated because the panel follows
 * the interface language, not the skin. Only the collapsed state is scoped,
 * so the expanded header keeps all four of its controls; the two shortcuts
 * (session.search, workspace.add) keep working too - each expands the rail
 * before it acts.
 */
[data-sidebar-collapsed] [data-pane="sidebar"] button[aria-label="搜索会话"],
[data-sidebar-collapsed] [data-pane="sidebar"] button[aria-label="Search sessions"],
[data-sidebar-collapsed] [data-pane="sidebar"] button[aria-label="添加工作区"],
[data-sidebar-collapsed] [data-pane="sidebar"] button[aria-label="Add workspace"] {
  display: none !important;
}

/* ── Desktop modes: the shell's own panels and menus ──────────────────────
 * 兼容/扩展/增强 mode is drawn by the Desktop shell, not by the client, and
 * four of its surfaces are styled from the shell's own sheet: the fixed
 * titlebar, the version-and-mode popover, the native-action menus and the LAN
 * warning dialog. The rules above never reach them, and two shell rules
 * actively repaint what this skin had already opened up:
 *
 *   body:is([data-dsh-desktop-mode="extended"], [data-dsh-desktop-mode="advanced"])
 *       [data-dsh-desktop-platform="darwin"][data-dsh-desktop-material="transparent"]
 *     { --dsw-menu-surface-fill: var(--dsw-alias-bg-layer-2) }
 *       the glass window. Every menu - the slash menu, context menus, dropdowns
 *       - reads that token, so in 增强模式 the menus went opaque again. The rule
 *       below states the same three attributes plus the one the skin scoper
 *       adds (data-dsh-skin), so it outranks the shell and the menus are glass
 *       once more, wearing the same literal the panels, the composer card and
 *       the sidebar already wear.
 *   body:is([data-dsh-desktop-mode="extended"], [data-dsh-desktop-mode="advanced"])
 *       [data-dsh-desktop-material="off"] .dshDesktopSidebarSurface
 *     { background: var(--dsw-alias-bg-layer-1) }
 *       the opaque window. There the slab is painted by the sidebar SURFACE
 *       instead of by the inner root, so it has to be re-opened on that
 *       element too, or the sidebar is the one opaque thing left.
 *
 * The dialog roles, data-pane and data-composer-card are stable hooks; these
 * dshDesktop classes are the shell's own and equally stable. Nothing here uses
 * !important: every selector carries body[data-dsh-desktop-mode], one
 * attribute more than the shell's, which is exactly the margin needed.
 */
body[data-dsh-desktop-mode="extended"][data-dsh-desktop-platform="darwin"][data-dsh-desktop-material="transparent"],
body[data-dsh-desktop-mode="advanced"][data-dsh-desktop-platform="darwin"][data-dsh-desktop-material="transparent"] {
  --dsw-menu-surface-fill: var(--dsw-skin-glass-fill);
}

body[data-dsh-desktop-mode] .dshDesktopSidebarSurface {
  --dsw-specific-sidebar-fill: var(--dsw-skin-glass-fill, var(--dsw-alias-bg-layer-1));
  background-color: var(--dsw-skin-glass-fill, var(--dsw-alias-bg-layer-1));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
}

body[data-dsh-desktop-mode] .dshDesktopVersionPopover,
body[data-dsh-desktop-mode] .dshDesktopActionMenu,
body[data-dsh-desktop-mode] .dshDesktopSettingsDialog {
  background-color: var(--dsw-skin-glass-fill, var(--dsw-alias-bg-layer-1));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l3);
}

body[data-dsh-desktop-mode] .dshDesktopSettingsDialogBackdrop {
  background-color: var(--dsw-alias-bg-mask-1);
  -webkit-backdrop-filter: var(--dsw-mask-blur);
  backdrop-filter: var(--dsw-mask-blur);
}

/* ── Breathing room at both ends of the transcript ────────────────────────
 * Scrolled to either end the text used to butt straight against the chrome:
 * the first line touched the header rule, the last ran under the composer
 * card. Both ends now reserve 24px, the band a line fades into as it leaves
 * the viewport.
 *
 * The top padding sits on the scrollport itself. The bottom one cannot: the
 * skin center's own runtime sheet pins the scrollport's padding-bottom to 0
 * with !important (its composer clearance) and the composer seat is sticky to
 * the bottom edge, so anything there is swallowed. It sits on the message
 * container instead, which terminates exactly at the seat's top edge, so its
 * padding is the gap the reader actually sees.
 *
 * Both rules are scoped to data-phase="active", the value the conversation
 * root carries only while a transcript is mounted. In the hero phase the
 * scrollport centres its children, where an extra 24px would push the
 * greeting off centre by half of it.
 */
[data-phase="active"] [data-dsh-part="scrollport"] {
  padding-top: 24px;
}
[data-phase="active"] [data-dsh-part="scrollport"] > [data-slot="conversation.session"] > div {
  padding-bottom: 24px;
}

/* ── Reduced transparency ─────────────────────────────────────────────────
 * The shell already hands its darwin sidebar an opaque fill when the reader
 * asks for reduced transparency, but these rules outrank it, so the same
 * surfaces are restored to plain opaque fills here. The sidebar keeps its
 * transparent column: only the token it hands down changes, so the inner root
 * paints the opaque layer instead of the menu fill.
 */
@media (prefers-reduced-transparency: reduce) {
  [data-shortcut-modal="settings"],
  [role="dialog"][aria-modal="true"]:not(.dshMarketOverlay):not(:has(> header)):not(:has(> [aria-hidden="true"])),
[role="alertdialog"][aria-modal="true"]:not(.dshMarketOverlay):not(:has(> header)):not(:has(> [aria-hidden="true"])),
  .dshMarketOverlayPanel {
    background-color: var(--dsw-alias-bg-layer-2);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  [data-composer-card] {
    background-color: var(--dsw-specific-input-major, var(--dsw-alias-bg-layer-2));
  }

  [data-pane="sidebar"] {
    --dsw-specific-sidebar-fill: var(--dsw-alias-bg-layer-1);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  body[data-dsh-desktop-mode="extended"][data-dsh-desktop-platform="darwin"][data-dsh-desktop-material="transparent"],
  body[data-dsh-desktop-mode="advanced"][data-dsh-desktop-platform="darwin"][data-dsh-desktop-material="transparent"] {
    --dsw-menu-surface-fill: var(--dsw-alias-bg-layer-2);
  }

  body[data-dsh-desktop-mode] .dshDesktopSidebarSurface {
    --dsw-specific-sidebar-fill: var(--dsw-alias-bg-layer-1);
    background-color: var(--dsw-alias-bg-layer-1);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  body[data-dsh-desktop-mode] .dshDesktopVersionPopover,
  body[data-dsh-desktop-mode] .dshDesktopActionMenu,
  body[data-dsh-desktop-mode] .dshDesktopSettingsDialog {
    background-color: var(--dsw-alias-bg-layer-1);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  body[data-dsh-desktop-mode] .dshDesktopSettingsDialogBackdrop {
    background-color: var(--dsw-alias-bg-mask-1);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
`;

/**
 * The composer band paints a copy of the wallpaper into itself. That only works while
 * the wallpaper is a still: the copy reproduces the pixels already underneath, so no
 * seam shows. A film cannot be copied that way - the copy would be one frozen frame,
 * and the band would read as a still rectangle butted against moving pixels. Motion
 * skins frost the live film instead: the scrim still rides on top, the transcript stays
 * covered, and nothing in the band can go stale.
 *
 * The desktop shell also pads the sidebar column by 20px on darwin (advanced mode) to
 * clear the traffic lights. This sheet used to paint that band itself, on the pane's
 * ::before; the base sheet now carries the sidebar's fill and frost on the column,
 * which covers the band without stacking a second sheet of glass on top of it.
 */
const SKIN_CSS_MOTION = `
/* --- motion: the composer band keeps the film, it does not frost it ---------- */
/* A still can copy the wallpaper into this band: the copy reproduces the pixels
   that are there anyway, so the band stays invisible. A film cannot be copied
   that way, so the band paints nothing at all and lets the film through. */
[data-phase="active"] [data-dsh-part="scrollport"] > [data-composer-seat]::after {
  background-image: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  -webkit-mask-image: none;
  mask-image: none;
}

/* The seat paints its own base-fill gradient as well; on a still the band above
   covered it, on a film the extra layer flattens the picture into a grey slab. */
[data-phase="active"] [data-dsh-part="scrollport"] > [data-composer-seat] {
  background: none;
}


@media (prefers-reduced-transparency: reduce) {
  [data-phase="active"] [data-dsh-part="scrollport"] > [data-composer-seat]::after {
    background-image: none;
    background-color: var(--dsw-alias-bg-base);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    -webkit-mask-image: none;
    mask-image: none;
  }

  [data-phase="active"] [data-dsh-part="scrollport"] > [data-composer-seat] {
    background: var(--dsw-alias-bg-base);
  }
}
`;

/* ── names ───────────────────────────────────────────────────────────────── */

/**
 * Word-level Chinese naming, so a wallpaper reads in the GUI the way it does
 * in System Settings. Keyed on the English name words; the longest phrase wins
 * at replacement time, so `hello Yellow` becomes 你好 黄 rather than 你好黄.
 */
const WORD_ZH = {
  "Big Sur": "大苏尔",
  "Catalina": "卡塔利娜",
  "Ventura": "文图拉",
  "Sonoma": "索诺马",
  "Tahoe": "太浩湖",
  "iMac": "iMac",
  "Mac": "Mac",
  "Blue": "蓝",
  "Green": "绿",
  "Orange": "橙",
  "Pink": "粉",
  "Purple": "紫",
  "Silver": "银",
  "Yellow": "黄",
  "Grey": "灰",
  "Beige": "米",
  "Aerial": "航拍",
  "Coastline": "海岸线",
  "Clouds": "云海",
  "Edge": "水畔",
  "Graphic": "图形",
  "Grasses": "夜草",
  "Horizon": "地平线",
  "Metallic": "金属",
  "Mountains": "群山",
  "Motion": "流动",
  "Night": "夜色",
  "Radial Sky": "放射天空",
  "Road": "公路",
  "Shoreline": "海岸",
  "Silhouette": "剪影",
  "Succulents": "多肉",
  "The Beach": "海滩",
  "Waters": "水域",
  "Waters Edge": "水畔",
  "Dark": "暗色",
  "Light": "浅色",
  "Landscape": "横版",
  "Portrait": "竖版",
  "Day": "白昼",
  "Night Grasses": "夜草",
  "hello": "你好",
  // Aerial place names. These are shot locations, not colour swatches, so they
  // read as the place rather than as a word-by-word transliteration.
  "Del Norte Coast Redwoods State Park": "德尔诺特海岸红杉州立公园",
  "California": "加利福尼亚",
  "Tahiti Waves": "大溪地海浪",
  // Pictures and films macOS offers for download that this Mac has not fetched
  // yet. They are named here so the day they arrive the export labels them in
  // Chinese like every wallpaper that is already on disk.
  "Big Sur Shore Rocks": "大苏尔海岸礁石",
  "Catalina Coast": "卡塔利娜海滨",
  "Catalina Evening": "卡塔利娜黄昏",
  "Catalina Rock": "卡塔利娜礁石",
  "Catalina Sunset": "卡塔利娜日落",
  "Hello Metallic Green": "你好金属绿",
  "Hello Metallic Orange": "你好金属橙",
  "Hello Metallic Pink": "你好金属粉",
  "Hello Metallic Purple": "你好金属紫",
  "Hello Metallic Silver": "你好金属银",
  "Hello Metallic Yellow": "你好金属黄",
  "Light Stream Blue": "流光蓝",
  "Light Stream Green": "流光绿",
  "Light Stream Pink": "流光粉",
  "Light Stream Red": "流光红",
  "Pro Black": "专业黑",
  "Radial Blue": "放射蓝",
  "Radial Green": "放射绿",
  "Radial Purple": "放射紫",
  "Radial Yellow": "放射黄",
  "Studio Color": "影棚彩",
  "Chroma Blue": "色度蓝",
  "Chroma Red": "色度红",
  "Dome": "穹顶",
  "Grid Green": "网格绿",
  "Grid Magenta": "网格洋红",
  "Iridescence": "虹彩",
  "Monterey Graphic": "蒙特雷图形",
  "Motion Blue": "流动蓝",
  "Motion Green": "流动绿",
  "Peak": "山峰",
  "Solar Gradients": "太阳渐变",
  "The Cliffs": "悬崖",
  "The Desert": "沙漠",
  "The Lake": "湖泊",
  "Tree": "树木",
  "Valley": "山谷",
  "hello Blue": "你好蓝",
  "hello Green": "你好绿",
  "hello Orange": "你好橙",
  "hello Purple": "你好紫",
  "hello Red": "你好红",
};

/** Words that stay as-is in a skin id even when the Chinese name differs. */
const ID_WORD = { "The Beach": "beach", "Radial Sky": "radial-sky" };

/** Glyphs that need no separator beside them, so 你好 黄 reads as 你好黄 — never as 你好 黄 in a label. */


const CLUSTERS = {
  "desktop-pictures": { zh: "桌面图片", order: 1, blurb: "macOS 自带的桌面图片，6K 母版" },
  "assets-v2": { zh: "MobileAsset", order: 2, blurb: "桌面图片的 MobileAsset 缓存，6K 母版" },
  "wallpapers.video": { zh: "动态壁纸", order: 3, blurb: "随时间或外观变化的动态桌面" },
  "aerials": { zh: "航拍壁纸", order: 4, blurb: "系统已下载的 4K 航拍影片 — 红杉林、太浩湖一类实拍" },
  "custom": { zh: "本机图片", order: 5, blurb: "用 --file 交进来的本机图片，做成同规格的皮肤" },
};

/**
 * Where the aerial films live once macOS has downloaded the one you picked.
 *
 * These are the wallpaper you are actually looking at. Their filenames are
 * bare UUIDs and the only thing that says which is which is the manifest
 * beside them, whose `accessibilityLabel` carries the real name — so a scan
 * has to join the two. Only downloaded films appear here; the other ~150 named
 * entries in the manifest are previews until macOS fetches them.
 */
const AERIAL_ROOT = join(homedir(), "Library", "Application Support", "com.apple.wallpaper", "aerials");
const AERIAL_VIDEOS = join(AERIAL_ROOT, "videos");
const AERIAL_MANIFEST = join(AERIAL_ROOT, "manifest", "entries.json");

/**
 * Skin ids are globally unique lowercase short ids capped at 32 characters by
 * the manifest schema, so the four Sonoma films — whose names carry their set
 * name twice — need shortening before the cap applies.
 */
const MAX_SKIN_ID = 32;
const ID_ABBREVIATIONS = { landscape: "ls", portrait: "pt" };
/** Dropped from a video id when the set name repeats as the file's first word. */
const SET_PREFIXES = ["sonoma", "tahoe-day"];
/** Long cluster suffixes, used when a clash forces one and the id has room. */
const CLUSTER_SUFFIX = { "desktop-pictures": "pictures", "assets-v2": "asset", "wallpapers.video": "motion" };

/** The CJK range, as a source string shared by both name joiners. */
const CJK_SOURCE = "\\u4e00-\\u9fff";

/**
 * Join CJK neighbours without a space and Latin words with one, so a label
 * reads 金属蓝 on one side and `iMac 蓝` on the other.
 */
function tidySpacing(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(new RegExp(`([${CJK_SOURCE}]) (?=[${CJK_SOURCE}])`, "g"), "$1")
    // Word replacement leaves the original separators behind: `…Park , California`
    // and a trailing comma both have to go, half-width or full-width.
    .replace(/\s+([,，、。：；)）])/g, "$1")
    // A half-width comma that now sits inside Chinese text ("…州立公园, 加利福尼亚")
    // reads as a typo in a label; give it its full-width form and drop the space.
    .replace(new RegExp(`,\\s*(?=[${CJK_SOURCE}])`, "g"), "，")
    .replace(/[,，、]+$/, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Whether one id fits the manifest's 32-character cap. */
function idFits(id) {
  return id.length <= MAX_SKIN_ID;
}

/**
 * The id for one record: the slug when it fits, else the same slug with its
 * decorative words abbreviated, else truncated. A name is never mangled unless
 * it has to be — `Sonoma Graphic Light Landscape` fits exactly as it is.
 */
function idFor(record, suffix) {
  const slug = slugify(record.name);
  // A filename of pure CJK slugifies to nothing; falling back to the literal
  // word "wallpaper" would collide for every such file, so the fallback is
  // keyed on the source path instead.
  const base = `${SKIN_PREFIX}${slug !== "" ? slug : `picture-${hash(record.source).toString(36).slice(0, 6)}`}`;
  const candidates = [suffix === undefined ? base : `${base}-${suffix}`, base];
  for (const candidate of candidates) if (idFits(candidate)) return candidate;
  const abbreviated = `${base.split("-").map((word) => ID_ABBREVIATIONS[word] ?? word).join("-")}${suffix === undefined ? "" : `-${suffix}`}`;
  if (idFits(abbreviated)) return abbreviated;
  // Drop whole words rather than slicing mid-word: the schema caps the id at 32
  // characters, and `wl-del-norte-coast-redwoods-stat` is not an id, it is a
  // truncation — the skin center would refuse it, so the cut has to land on a
  // word boundary and still fit.
  const words = abbreviated.split("-");
  let kept = "";
  for (const word of words) {
    const next = kept === "" ? word : `${kept}-${word}`;
    if (next.length > MAX_SKIN_ID) break;
    kept = next;
  }
  return kept.replace(/-+$/, "") || abbreviated.slice(0, MAX_SKIN_ID);
}

/** Deterministic pool for the per-skin accent, so a tile looks the same every export. */
const ACCENTS = ["#4a5fa8", "#3f7d8c", "#7a5ea8", "#a8695e", "#4f7f5a", "#8a6f3f", "#5a6b8c", "#8c5a72"];

/** One `Big Sur Aerial`-style name to a kebab-case slug. */
function slugify(name) {
  let text = String(name);
  for (const [phrase, replacement] of Object.entries(ID_WORD)) text = text.replaceAll(phrase, replacement);
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // The film names repeat their set name (`Sonoma/Sonoma Graphic …`); the
  // directory already said it, so the id does not have to.
  for (const prefix of SET_PREFIXES) if (slug.startsWith(`${prefix}-`)) slug = slug.slice(prefix.length + 1);
  return slug;
}

/**
 * Names that must survive the word table untouched.
 *
 * `iMac` is the reason this exists: the table maps `Mac` on its own, and a
 * naive pass turns the brand into `i Mac`. Protecting it with a placeholder is
 * exact, where a casing heuristic would only be a guess.
 */
const PROTECTED = ["iMac"];

/** Chinese display name for one wallpaper. */
function nameZh(name) {
  let text = String(name);
  // The film names repeat their set name; collapse the repeat before mapping.
  const match = new RegExp(`^(\\S+(?: \\S+)?) \\1 `).exec(`${text} `);
  if (match !== null) text = text.slice(match[1].length).trim();
  const restored = [];
  for (const [index, token] of PROTECTED.entries()) {
    if (!text.includes(token)) continue;
    const placeholder = `\u0000${index}\u0000`;
    restored.push([placeholder, token]);
    text = text.replaceAll(token, placeholder);
  }
  const phrases = Object.keys(WORD_ZH).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    // Case-insensitive on purpose: Apple ships "hello Yellow" and "Hello
    // Metallic Blue" in the same family, and a case-sensitive pass translated
    // one and left the other half in English.
    text = text.replace(new RegExp(escapeRegExp(phrase), "gi"), ` ${WORD_ZH[phrase]} `);
  }
  for (const [placeholder, token] of restored) text = text.replaceAll(placeholder, token);
  return tidySpacing(text);
}

/** Escape one literal for use inside a RegExp. */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Stable non-cryptographic hash, used only to pick an accent. */
function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/* ── discovery ───────────────────────────────────────────────────────────── */

const DESKTOP_PICTURES = "/System/Library/Desktop Pictures";
const ASSETS_V2 = "/System/Library/AssetsV2/com_apple_MobileAsset_DesktopPicture";
const DYNAMIC_ROOT = join(DESKTOP_PICTURES, ".wallpapers");

/**
 * A crop rectangle handed in as `x,y,w,h`, each a fraction of the source.
 *
 * The panel frames a picture in normalized coordinates, so the numbers mean
 * the same thing whatever the picture's pixel size is. Anything that is not
 * four sane fractions reads as "no crop" rather than an error: an older host,
 * a hand-typed command or a truncated query then exports the whole picture,
 * which is what every earlier version did.
 * @returns `{ x, y, w, h }`, or null when the rectangle cannot be trusted.
 */
function parseCrop(value) {
  if (typeof value !== "string" || value === "") return null;
  const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 4 || parts.some((number) => Number.isFinite(number) === false)) return null;
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > 1.0001 || y + h > 1.0001) return null;
  return { x, y, w, h };
}

/** `plutil` reads the metadata plists this script cannot parse in JavaScript. */
const PLUTIL = "/usr/bin/plutil";

/**
 * The names whose wallpaper follows the system appearance.
 *
 * Every such picture ships two thumbnails, `<name> Dark.heic` and `<name>
 * Light.heic`, and those twins are the only marker left for a picture macOS
 * keeps built in — Sonoma has no `.madesktop` beside it, so nothing else in
 * the resource folder says it animates.
 * @returns bare names, e.g. `Sonoma`.
 */
function appearanceNames() {
  const names = new Set();
  const dir = join(DESKTOP_PICTURES, ".thumbnails");
  if (existsSync(dir) === false) return names;
  for (const file of readdirSync(dir)) {
    if (file.toLowerCase().endsWith(".heic") === false) continue;
    const stem = file.replace(/\.[^.]+$/, "");
    for (const suffix of [" Dark", " Light"]) {
      if (stem.endsWith(suffix)) names.add(stem.slice(0, -suffix.length));
    }
  }
  return names;
}

/**
 * The pictures that animate, by name.
 *
 * `.madesktop` is Apple's own metadata for a downloadable picture, and its
 * `isDynamic` is the field that decides which group the system's own picker
 * files it under. The appearance twins above are folded in as well: the two
 * sources together cover every dynamic wallpaper the system offers.
 * @returns bare names, e.g. `Big Sur Graphic`.
 */
function dynamicNames() {
  const names = appearanceNames();
  if (existsSync(DESKTOP_PICTURES) === false) return names;
  for (const file of readdirSync(DESKTOP_PICTURES).filter((name) => name.endsWith(".madesktop")).sort()) {
    try {
      const meta = JSON.parse(execFileSync(PLUTIL, ["-convert", "json", "-o", "-", join(DESKTOP_PICTURES, file)], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));
      if (meta?.isDynamic === true) names.add(basename(file, ".madesktop"));
    } catch {
      // Metadata that cannot be read decides nothing; the twins still count.
    }
  }
  return names;
}

/**
 * The label one file inside a `.wallpapers` set goes by.
 *
 * The folder and the filename both open with the set name (`Sonoma/Sonoma
 * Graphic Light Landscape.mov`), so the prefix is added only when the filename
 * does not already carry it — `Sonoma Graphic Light Landscape` is exactly the
 * name the id cap was measured against.
 */
function setName(set, stem) {
  return stem.toLowerCase().startsWith(set.toLowerCase()) ? stem : `${set} ${stem}`.replace(/\s+/g, " ").trim();
}

/**
 * Scan both resource families.
 * @param options - `{ videos }` toggles the dynamic `.mov` family, `{ crop }`
 *   is the framing a panel-chosen picture arrives with.
 * @returns raw records, before ids are assigned.
 */
function discover({ videos = true, files = [], crop = null } = {}) {
  const found = [];
  // Decided once: every branch below asks the same set whether a picture
  // animates, and the answer changes only when macOS ships a new wallpaper.
  const dynamic = dynamicNames();

  // Pictures handed in on the command line. They are copied through the same
  // three tiers as everything else, so a screenshot or a download becomes a
  // wallpaper with exactly the same contract as a system asset.
  for (const file of files) {
    if (!existsSync(file)) throw new Error(`--file: no such file: ${file}`);
    const stat = statSync(file);
    if (!stat.isFile()) throw new Error(`--file: not a file: ${file}`);
    found.push({
      cluster: "custom",
      kind: "image",
      name: basename(file).replace(/\.[^.]+$/, ""),
      source: file,
      // Only a picture handed in on the command line can be framed: the
      // rectangle belongs to the one import the panel is running.
      crop,
    });
  }

  if (existsSync(DESKTOP_PICTURES)) {
    for (const file of readdirSync(DESKTOP_PICTURES).filter((name) => name.toLowerCase().endsWith(".heic")).sort()) {
      const name = basename(file, ".heic");
      // A picture that animates is filed with the dynamic set even though the
      // export writes a still: the group describes the wallpaper, not the file.
      found.push({ cluster: dynamic.has(name) ? "wallpapers.video" : "desktop-pictures", kind: "image", name, source: join(DESKTOP_PICTURES, file) });
    }
  }

  if (existsSync(ASSETS_V2)) {
    for (const dir of readdirSync(ASSETS_V2).filter((name) => name.endsWith(".asset")).sort()) {
      const assetData = join(ASSETS_V2, dir, "AssetData");
      if (!existsSync(assetData)) continue;
      for (const file of readdirSync(assetData).filter((name) => name.toLowerCase().endsWith(".heic")).sort()) {
        const name = basename(file, ".heic");
        found.push({ cluster: dynamic.has(name) ? "wallpapers.video" : "assets-v2", kind: "image", name, source: join(assetData, file) });
      }
    }
  }

  if (existsSync(DYNAMIC_ROOT)) {
    for (const set of readdirSync(DYNAMIC_ROOT).sort()) {
      const dir = join(DYNAMIC_ROOT, set);
      if (!statSync(dir).isDirectory()) continue;
      for (const file of readdirSync(dir).sort()) {
        const lower = file.toLowerCase();
        if (lower.endsWith(".mov")) {
          // A film is minutes of transcoding, so `--no-videos` still turns the
          // whole family off; the set's own still below takes seconds and stays.
          if (videos === false) continue;
          found.push({ cluster: "wallpapers.video", kind: "video", name: setName(set, basename(file, ".mov")), source: join(dir, file) });
        } else if (lower.endsWith(".heic") && lower.includes("thumbnail") === false) {
          // The set's own still — Sonoma Horizon ships beside the Sonoma films
          // and belongs to the same group.
          found.push({ cluster: "wallpapers.video", kind: "image", name: setName(set, basename(file, ".heic")), source: join(dir, file) });
        }
      }
    }
  }

  if (videos && existsSync(AERIAL_VIDEOS)) {
    // Join the bare UUID filenames to the manifest that names them; a film with
    // no manifest entry is left alone rather than exported as a UUID.
    let named = new Map();
    try {
      const manifest = JSON.parse(readFileSync(AERIAL_MANIFEST, "utf8"));
      named = new Map((manifest.assets ?? []).map((asset) => [asset.id, asset]));
    } catch {
      named = new Map();
    }
    for (const file of readdirSync(AERIAL_VIDEOS).filter((name) => name.toLowerCase().endsWith(".mov")).sort()) {
      const id = basename(file, ".mov");
      const asset = named.get(id);
      const label = typeof asset?.accessibilityLabel === "string" && asset.accessibilityLabel.trim() !== "" ? asset.accessibilityLabel.trim() : null;
      if (label === null) continue;
      found.push({
        cluster: "aerials",
        kind: "video",
        name: label,
        source: join(AERIAL_VIDEOS, file),
        shotId: asset.shotID ?? null,
      });
    }
  }

  return found;
}

/**
 * Assign skin ids, disambiguating the two names that exist in more than one
 * cluster (Catalina Graphic and Big Sur Graphic) with a cluster suffix, so an
 * id is stable and unique without a hand-maintained exception list.
 * @param records - discovered records.
 * @returns records carrying `id`, `skin`, `nameZh`, `accent`.
 */
function identify(records, { nameOverride = null } = {}) {
  // A name handed in with the picture is applied before anything is derived
  // from it, so the id, the Chinese label and the manifest all agree — a
  // catalogue rebuilt later must not read a different name back.
  if (nameOverride !== null) records = records.map((record) => (record.cluster === "custom" ? { ...record, name: nameOverride } : record));
  const plain = new Map();
  for (const record of records) {
    const id = idFor(record);
    if (!plain.has(id)) plain.set(id, []);
    plain.get(id).push(record);
  }
  const taken = new Set();
  return records.map((record) => {
    // Two clusters can share a name (`Big Sur Graphic` exists as both a
    // desktop picture and a MobileAsset entry); the later one takes its
    // cluster's suffix so both stay reachable.
    const clashes = (plain.get(idFor(record)) ?? []).length > 1;
    let id = clashes ? idFor(record, CLUSTER_SUFFIX[record.cluster]) : idFor(record);
    if (taken.has(id)) id = idFor(record, CLUSTER_SUFFIX[record.cluster]);
    // Same cluster, same name, no shot to tell them apart: two Tahiti Waves
    // clips both wanted `wl-tahiti-waves`, and the cluster suffix is undefined
    // for that family, so the second one silently overwrote the first and a
    // wallpaper disappeared from the library. A numeric tail keeps both on
    // disk; the shot id in the label below is what a reader actually sees.
    for (let index = 2; taken.has(id) && index < 100; index += 1) {
      id = idFor(record, `${index}`);
    }
    taken.add(id);
    // Two shots of the same place share a name; the shot id is the only thing
    // that tells them apart, so it becomes part of the label.
    const sameName = records.filter((other) => other !== record && other.name === record.name).length > 0;
    const label = sameName && typeof record.shotId === "string" ? `${nameZh(record.name)} · ${record.shotId}` : nameZh(record.name);
    return {
      ...record,
      id,
      skin: id,
      slug: id.slice(SKIN_PREFIX.length),
      nameZh: label,
      accent: ACCENTS[hash(id) % ACCENTS.length],
    };
  });
}

/* ── encoding ────────────────────────────────────────────────────────────── */

/** One image tier through `sips`, at the exact pixel width the export declares. */
async function encodeTier(source, out, max, quality, label) {
  await execFileAsync(SIPS, ["-s", "format", "jpeg", "-s", "formatOptions", String(quality), "-Z", String(max), source, "--out", out], { maxBuffer: 32 * 1024 * 1024 });
  return `${label} ${(statSync(out).size / 1024).toFixed(0)} KB`;
}

/**
 * Cut a picture down to the rectangle the panel framed.
 *
 * `sips -c` and `-Z` cannot share a command: the resample lands on the crop
 * geometry and the result is neither size (`-c 2500 4000 … -Z 1080` answers
 * 449×718). So the cut is one pass into a scratch file and the three tiers are
 * read from that — the same shape the film still lane already uses.
 * @throws when the source cannot be measured or the cut cannot be written.
 */
async function cropImage(source, out, rect, log) {
  const size = await probeSourceSize(source, "image");
  if (size === null) throw new Error(`cannot measure ${source} for cropping`);
  const width = Math.max(1, Math.min(size.width, Math.round(rect.w * size.width)));
  const height = Math.max(1, Math.min(size.height, Math.round(rect.h * size.height)));
  const x = Math.max(0, Math.min(size.width - width, Math.round(rect.x * size.width)));
  const y = Math.max(0, Math.min(size.height - height, Math.round(rect.y * size.height)));
  await execFileAsync(
    SIPS,
    ["-s", "format", "jpeg", "-s", "formatOptions", "100", "-c", String(height), String(width), "--cropOffset", String(y), String(x), source, "--out", out],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  if (!existsSync(out)) throw new Error(`no crop could be written for ${source}`);
  log(`crop ${width}×${height} at ${x},${y} of ${size.width}×${size.height}`);
}

/**
 * The rectangle a skin was exported with, read back from its own directory.
 *
 * Re-importing the same picture with a different framing rewrites the same
 * skin — the bytes hash the same, so the id does too — and this rectangle is
 * the only thing that can tell the two runs apart.
 * @returns `{ x, y, w, h }`, or null when there is nothing trustworthy there.
 */
function readCropRect(path) {
  if (!existsSync(path)) return null;
  try {
    const rect = JSON.parse(readFileSync(path, "utf8"))?.rect;
    if (rect === null || typeof rect !== "object") return null;
    const values = [rect.x, rect.y, rect.w, rect.h];
    if (values.some((value) => Number.isFinite(value) === false)) return null;
    return { x: values[0], y: values[1], w: values[2], h: values[3] };
  } catch {
    return null;
  }
}

/** Two crop rectangles are the same when every edge is, to a pixel's worth. */
function sameRect(a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return false;
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.w - b.w) < 1e-6 && Math.abs(a.h - b.h) < 1e-6;
}

/**
 * Pull one frame out of a film, at the film's own full resolution.
 *
 * Seeks before the input (`-ss` ahead of `-i`) rather than decoding up to the
 * timestamp: these sources are 4K at 240 fps, and decoding two minutes of that
 * to reach frame one is the whole reason the film lane is slow.
 */
async function grabFrame(source, out, log) {
  await execFileAsync(FFMPEG, ["-y", "-loglevel", "error", "-ss", VIDEO.posterSeekSeconds, "-i", source, "-frames:v", "1", "-q:v", "2", out], { maxBuffer: 64 * 1024 * 1024 });
  if (!existsSync(out)) throw new Error(`no frame could be read from ${source}`);
  log(`frame ${(statSync(out).size / 1024).toFixed(0)} KB`);
}

/**
 * The duration of a film, in seconds, as ffprobe reports it.
 *
 * The loop seam cuts at `duration − seam`, so this number is not decoration:
 * it *is* the offset the filter graph is built from, and the source film and
 * the exported film do not share it (the export is a re-encode, and the two
 * containers disagree in the last decimal).
 */
async function probeDuration(source) {
  const { stdout } = await execFileAsync(
    FFPROBE,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", source],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  return Number.parseFloat(String(stdout).trim());
}

/**
 * The pixel size of a source, as the system reports it.
 *
 * Stills go through sips (HEIC included) and films through ffprobe. A source
 * this Mac only holds a manifest for cannot be read at all, so a miss answers
 * null instead of throwing: the entry then carries no source size and the
 * panel falls back to whatever the exported preview measures.
 */
async function probeSourceSize(source, kind) {
  if (typeof source !== "string" || source === "") return null;
  try {
    if (kind === "video") {
      const probe = await execFileAsync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", source], { maxBuffer: 4 * 1024 * 1024 });
      const parts = String(probe.stdout).trim().split(",");
      const width = Number.parseInt(parts[0], 10);
      const height = Number.parseInt(parts[1], 10);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    const probe = await execFileAsync(SIPS, ["-g", "pixelWidth", "-g", "pixelHeight", source], { maxBuffer: 4 * 1024 * 1024 });
    const read = (key) => {
      const found = new RegExp("^\\s*" + key + ":\\s*(\\d+)\\s*$", "m").exec(String(probe.stdout));
      return found === null ? Number.NaN : Number.parseInt(found[1], 10);
    };
    const width = read("pixelWidth");
    const height = read("pixelHeight");
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

/**
 * The filter arguments for one film, and the scale chain the poster reuses.
 *
 * Without a seam this is the plain denoise-and-scale chain. With one it becomes
 * a two-input graph, built so the *output* opens and closes on the same frame:
 *
 *   [0:v] stage ─┬─ [b0] trim=start=seam ── A = V[seam .. T]
 *                └─ [b1] trim=end=seam   ── B = V[0 .. seam]
 *   A × B ─ xfade(offset = T − 2·seam) ── V[seam .. T−seam] + dissolve(V[T−seam .. T], V[0 .. seam])
 *
 * A is the film from just after its head; the dissolve begins `seam` seconds
 * before A runs out, so the film's tail (the end of A) fades into B, its head.
 * A's last frame and B's last frame are both V[seam] — which is exactly why the
 * result wraps: the player's jump from the end back to the start lands on the
 * frame it just left, so there is no seam left to see.
 *
 * `settb=AVTB,setpts=PTS-STARTPTS` before the split is what makes the two
 * branches agree on a timebase; `xfade` refuses inputs that do not, and the
 * 240 fps sources arrive with a timebase no arithmetic on `offset` survives.
 * @param source - the film being encoded (unused; kept for the scale comment).
 * @param seamSeconds - 0 for a straight transcode.
 * @param duration - the source duration, required when `seamSeconds > 0`.
 * @returns `{ args, scale }`.
 */
function videoFilterArgs(source, seamSeconds, duration) {
  // `-2` keeps the aspect ratio and rounds to an even number, which yuv420p
  // requires; the `min()` guard means a smaller source is never upscaled.
  void source;
  const scale = `scale='min(${VIDEO.maxLongEdge},iw)':'min(${VIDEO.maxLongEdge},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos`;
  const stage = `${VIDEO.denoise},${scale}`;
  if (!(seamSeconds > 0)) return { args: ["-vf", stage], scale };
  const offset = (duration - seamSeconds * 2).toFixed(3);
  const graph = [
    `[0:v]${stage},settb=AVTB,setpts=PTS-STARTPTS,split=2[b0][b1]`,
    `[b0]trim=start=${seamSeconds},setpts=PTS-STARTPTS[from_d]`,
    `[b1]trim=end=${seamSeconds},setpts=PTS-STARTPTS[head]`,
    `[from_d][head]xfade=transition=fade:duration=${seamSeconds}:offset=${offset}[vout]`,
  ].join(";");
  return { args: ["-filter_complex", graph, "-map", "[vout]"], scale };
}

/**
 * Transcode one AVFoundation wallpaper film into something a `<video>` element
 * plays everywhere — optionally re-cutting it so it loops without a seam.
 * @param seamSeconds - length of the cross-dissolve laid over the loop join.
 */
async function encodeVideo(source, out, poster, log, seamSeconds = 0) {
  let duration = 0;
  if (seamSeconds > 0) {
    duration = await probeDuration(source);
    // Three seams' worth is the shortest film this graph can still be built
    // for: below it the two trims would overlap and the offset would go
    // negative, which ffmpeg answers with a graph that silently drops frames.
    if (!Number.isFinite(duration) || duration <= seamSeconds * 3) {
      throw new Error(`cannot lay a ${seamSeconds}s loop seam on ${source}: duration ${duration}`);
    }
  }
  const { args, scale } = videoFilterArgs(source, seamSeconds, duration);
  await execFileAsync(
    FFMPEG,
    [
      "-y",
      "-loglevel", "error",
      "-i", source,
      "-an",
      ...args,
      "-c:v", "libx264",
      "-profile:v", "high",
      "-pix_fmt", "yuv420p",
      "-crf", String(VIDEO.crf),
      "-preset", VIDEO.preset,
      "-movflags", "+faststart",
      out,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  log(seamSeconds > 0
    ? `video ${(statSync(out).size / 1048576).toFixed(1)} MB · loop seam ${seamSeconds}s`
    : `video ${(statSync(out).size / 1048576).toFixed(1)} MB`);
  // The poster has to be the frame the seam now opens on, or the still the grid
  // tiles with would be a different picture from the film it stands for.
  const seek = String(seamSeconds > 0 ? seamSeconds : VIDEO.posterSeekSeconds);
  await execFileAsync(
    FFMPEG,
    ["-y", "-loglevel", "error", "-ss", seek, "-i", source, "-frames:v", "1", "-vf", scale, "-q:v", "3", poster],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  log(`poster ${(statSync(poster).size / 1024).toFixed(0)} KB`);
}

/* ── export ──────────────────────────────────────────────────────────────── */

/** Write a file only when its bytes would change, so a re-run does not churn mtimes. */
function writeIfChanged(path, content) {
  try {
    if (readFileSync(path, "utf8") === content) return false;
  } catch {
    // absent or unreadable: write it
  }
  writeFileSync(path, content, "utf8");
  return true;
}

/** Build the manifest one skin is described by. */
function manifestFor(record, mediaSrc, kind) {
  const layer = (theme) => ({
    type: kind,
    src: mediaSrc,
    scrim: SCRIM[theme],
  });
  return {
    $schema: "https://schemas.linxin666.org/dsh-skin/v2.json",
    skinManifestVersion: 2,
    id: record.skin,
    name: record.nameZh,
    // A picture the user brought has one name, not two: repeating the Chinese
    // name in the English slot would just render the same label twice in the
    // skin center's list.
    nameEn: /[A-Za-z]/.test(record.name) ? record.name : record.nameZh,
    author: record.cluster === "custom" ? "本机图片 · DSH 外观库导出" : "macOS 系统壁纸 · DSH 外观库导出",
    tagline: record.cluster === "custom" ? `${CLUSTERS.custom.blurb}` : `${CLUSTERS[record.cluster].blurb} · 起于 Apple 资源`,
    description: `${record.name}（${record.nameZh}）由${record.cluster === "custom" ? "你提供的本机图片" : "本机 macOS 资源"}导出为 DSH 皮肤：壁纸垫在半透明面板之下，浅色与深色各自带一层可读性纱罩，配色 token 完全沿用官方外壳，只放开表面透明度。`,
    tags: ["wallpaper", ...(record.cluster === "custom" ? ["local"] : ["macos"]), record.cluster, kind === "video" ? "motion" : "still"],
    accent: record.accent,
    order: CLUSTERS[record.cluster].order * 1000,
    version: "1.0.0",
    license: "Apple 系统资源，仅供本机个人使用",
    sourceUrl: `file://${encodeURI(record.source)}`,
    preview: { ...THEME_PREVIEW },
    contributes: {
      stylesheet: "skin.css",
      backgroundMedia: { light: layer("light"), dark: layer("dark") },
    },
  };
}

/**
 * Export one wallpaper.
 *
 * `videoStills` is the difference between "show me this wallpaper now" and
 * "build the whole library": a downloaded aerial film is 4K at 60 fps and runs
 * five minutes, so transcoding it takes minutes while a poster frame of the
 * same footage takes a second. The panel's detail card shows the still either
 * way, so the still lane is a legitimate end state — the film lane is the
 * upgrade.
 * @returns the catalogue entry, or null when the source could not be encoded.
 */
async function exportOne(record, { root, force, log, videoStills = false, seamIds = null }) {
  const dir = join(root, record.skin);
  const previewFile = join(dir, "preview/wallpaper.jpg");
  const thumbFile = join(dir, "thumb/wallpaper.jpg");
  mkdirSync(join(dir, "assets"), { recursive: true });
  mkdirSync(join(dir, "preview"), { recursive: true });
  mkdirSync(join(dir, "thumb"), { recursive: true });

  const mediaName = record.kind === "video" && videoStills === false ? "wallpaper.mp4" : "wallpaper.jpg";
  const mediaSrc = `assets/${mediaName}`;
  const mediaPath = join(dir, mediaSrc);
  const cropPath = join(dir, "crop.json");
  const framed = record.crop !== null && record.crop !== undefined;
  // The media being on disk is not a reason to skip a framed import: the
  // rectangle is what says whether those bytes are the framed ones. Dropping
  // the framing is a change too — the whole picture has to be cut back — and
  // that is the one case where the new rectangle is null and the old is not.
  const stored = readCropRect(cropPath);
  const reframe = sameRect(stored, record.crop ?? null) === false && (framed || stored !== null);
  let encoded = "cached";

  try {
    if (force || reframe || !existsSync(mediaPath)) {
      if (record.kind === "video" && videoStills) {
        // Fast lane: one poster frame through the still pipeline. A 4K 240 fps
        // HEVC film takes minutes to decode and encode, which is far too slow
        // to answer "show me this one wallpaper"; a still of the same frame
        // takes seconds and is exactly what the panel's detail card shows.
        const frame = join(dir, ".poster-frame.jpg");
        await grabFrame(record.source, frame, log);
        const notes = [];
        for (const tier of TIERS) {
          notes.push(await encodeTier(frame, join(dir, tier.file), tier.max, tier.quality, tier.key));
        }
        rmSync(frame, { force: true });
        encoded = `still from film · ${notes.join(" · ")}`;
      } else if (record.kind === "video") {
        // The seam is a property of the encode, not a second asset to switch
        // between: a skin that opted in is re-cut right here, and one that did
        // not is written exactly as before. `--no-loop-seam` blanks the set,
        // which is how a toggle back to "off" gets its plain film back.
        const seam = seamIds !== null && seamIds.has(record.id) ? VIDEO.seamSeconds : 0;
        await encodeVideo(record.source, mediaPath, previewFile, log, seam);
        encoded = seam > 0 ? `transcoded · loop seam ${seam}s` : "transcoded";
      } else {
        // A framed picture is cut first and the tiers read the cut file; an
        // unframed one is read straight from its source, exactly as before.
        const cut = framed ? join(dir, ".crop-source.jpg") : record.source;
        try {
          if (framed) await cropImage(record.source, cut, record.crop, log);
          const notes = [];
          for (const tier of TIERS) {
            notes.push(await encodeTier(cut, join(dir, tier.file), tier.max, tier.quality, tier.key));
          }
          encoded = notes.join(" · ");
        } finally {
          if (framed) rmSync(cut, { force: true });
        }
      }
    }
    // The grid tile is the preview at tile size: one more `sips` pass over the
    // preview, never a second read of the 6K source, so a re-export after
    // `--force` stays byte-consistent with what the preview shows.
    if (force || !existsSync(thumbFile)) {
      await encodeTier(previewFile, thumbFile, 320, 75, "thumb");
    }
  } catch (error) {
    log(`FAILED ${record.name}: ${String(error?.stderr ?? error?.message ?? error).slice(0, 200)}`);
    return null;
  }

  // The manifest has to describe the bytes that are actually there: the fast
  // lane leaves an image where the film would have been.
  const mediaKind = record.kind === "video" && videoStills ? "image" : record.kind === "video" ? "video" : "image";
  writeIfChanged(join(dir, "skin.json"), `${JSON.stringify(manifestFor(record, mediaSrc, mediaKind), null, 2)}\n`);
  // The rectangle is not part of the skin manifest — that schema belongs to the
  // skin center — so it rides beside it, in the skin's own directory.
  if (framed) writeIfChanged(cropPath, `${JSON.stringify({ version: 1, rect: record.crop }, null, 2)}\n`);
  else rmSync(cropPath, { force: true });
  // A film's stylesheet has to frost the live picture instead of copying it.
  const stylesheet = mediaKind === "video" ? SKIN_CSS + SKIN_CSS_MOTION : SKIN_CSS;
  writeIfChanged(join(dir, "skin.css"), stylesheet.replaceAll("%NAME%", `${record.name} · ${record.nameZh}`));
  log(`${mediaKind === "video" ? "film" : "still"} ${record.id}  ${encoded}`);

  const full = statSync(mediaPath).size;
  const previewBytes = statSync(previewFile).size;
  const thumbBytes = statSync(thumbFile).size;
  return {
    id: record.id,
    skin: record.skin,
    name: record.name,
    nameZh: record.nameZh,
    cluster: record.cluster,
    // The framing rides in the entry as well, so the catalogue alone can tell
    // a framed skin from one exported whole.
    crop: record.crop ?? null,
    // The kind the entry reports is the media that was actually written, not
    // the source family it came from: a film exported as a poster still is a
    // still, and the panel tags motion off this field.
    kind: mediaKind,
    accent: record.accent,
    source: record.source,
    bytes: { media: full, preview: previewBytes, thumb: thumbBytes },
    order: CLUSTERS[record.cluster].order,
  };
}

/**
 * The library's own card — a first tile that explains where the wallpapers
 * come from and what applying one costs. It is not a wallpaper (no skin, no
 * apply), so it lives beside the list instead of inside it.
 */
function libraryEntry(counts) {
  return {
    name: "About this library",
    nameZh: "关于外观库",
    accent: "#4a5fa8",
    counts,
    notes: [
      "来源：macOS 系统自带的桌面图片（6K 母版）与 MobileAsset 缓存，以及 .wallpapers 里的动态桌面。全部只读。",
      "接入方式：每张壁纸导出为一款真正的 DSH 皮肤，由皮肤中心渲染与持久化——背景遮罩、模糊滑杆、深浅色切换都直接沿用现有控件。",
      "配色：只放开表面透明度，所有颜色 token 仍是官方外壳的，因此换壁纸不会改变对比度，也不会让正文变得难读。",
      "动态壁纸已转码为 H.264 MP4（HEVC 的 .mov 在 <video> 里不可靠），静音循环播放。",
    ],
  };
}

/**
 * Rebuild catalogue entries from the skin directories on disk.
 *
 * The catalogue is derived data, and an interrupted export can leave the skins
 * complete but the catalogue unwritten. Reading the manifests back is the
 * recovery path: it also proves the panel's source of truth is the skins, not
 * a file that has to stay in step with them.
 */
function catalogFromDisk(root) {
  const entries = [];
  if (!existsSync(root)) return entries;
  for (const name of readdirSync(root).sort()) {
    if (!name.startsWith(SKIN_PREFIX)) continue;
    const manifestPath = join(root, name, "skin.json");
    if (!existsSync(manifestPath)) continue;
    const cropPath = join(root, name, "crop.json");
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      continue;
    }
    const media = manifest?.contributes?.backgroundMedia?.light;
    if (typeof media?.src !== "string") continue;
    const kind = media.type === "video" ? "video" : "image";
    const mediaPath = join(root, name, media.src);
    const previewPath = join(root, name, "preview/wallpaper.jpg");
    const thumbPath = join(root, name, "thumb/wallpaper.jpg");
    if (!existsSync(mediaPath) || !existsSync(previewPath)) continue;
    // The cluster is carried in the manifest's tag list, which is how a skin
    // directory remembers where in the library it belongs.
    const tags = Array.isArray(manifest.tags) ? manifest.tags : [];
    const cluster = Object.keys(CLUSTERS).find((key) => tags.includes(key)) ?? (kind === "video" ? "wallpapers.video" : "assets-v2");
    entries.push({
      id: name,
      skin: name,
      name: typeof manifest.nameEn === "string" ? manifest.nameEn : name,
      nameZh: typeof manifest.name === "string" ? manifest.name : name,
      cluster,
      kind,
      accent: typeof manifest.accent === "string" ? manifest.accent : ACCENTS[0],
      source: typeof manifest.sourceUrl === "string" ? decodeURI(manifest.sourceUrl.replace(/^file:\/\//, "")) : null,
      bytes: {
        media: statSync(mediaPath).size,
        preview: statSync(previewPath).size,
        thumb: existsSync(thumbPath) ? statSync(thumbPath).size : 0,
      },
      order: CLUSTERS[cluster]?.order ?? 9,
      crop: readCropRect(cropPath),
    });
  }
  return entries;
}

/**
 * Entries from an existing catalogue that this run did not touch.
 *
 * A filtered run (`--videos-only`, `--only`) re-encodes a subset, and the
 * catalogue it writes still has to describe the whole library — otherwise the
 * panel would lose every wallpaper the run skipped.
 */
function carriedEntries(root, covered) {
  return catalogFromDisk(root).filter((entry) => covered.has(entry.id) === false);
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const report = argv.includes("--report");
  const withVideos = !argv.includes("--no-videos");
  const videosOnly = argv.includes("--videos-only");
  const catalogOnly = argv.includes("--catalog-only");
  const videoStills = argv.includes("--video-stills");
  const noLoopSeam = argv.includes("--no-loop-seam");
  // `--file <path>` may repeat: every occurrence contributes one picture.
  const files = argv.reduce((all, arg, index) => (arg === "--file" && argv[index + 1] !== undefined ? [...all, argv[index + 1]] : all), []);
  // `--crop x,y,w,h`: the rectangle the panel framed, in fractions of the
  // source. It only means anything next to a `--file`.
  const cropArg = argv.indexOf("--crop");
  const crop = cropArg === -1 ? null : parseCrop(argv[cropArg + 1]);
  const nameArg = argv.indexOf("--name");
  const nameOverride = nameArg !== -1 && argv[nameArg + 1] !== undefined ? argv[nameArg + 1] : null;
  const onlyArg = argv.find((arg) => arg.startsWith("--only"));
  const only = onlyArg === undefined ? null : (onlyArg.includes("=") ? onlyArg.split("=")[1] : argv[argv.indexOf(onlyArg) + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // `--ids a,b` is an exact-id filter: the restore path needs one wallpaper
  // back, and substring matching on a name would drag its neighbours along.
  const idsArg = argv.find((arg) => arg.startsWith("--ids"));
  const ids = idsArg === undefined ? null : (idsArg.includes("=") ? idsArg.split("=")[1] : argv[argv.indexOf(idsArg) + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const root = process.env.DSH_SKINS_HOME ?? process.env.DSH_SKINS_DIR ?? join(process.env.DSH_HOME ?? join(homedir(), ".dsh-beta"), "skins");
  const removedIds = new Set(readRemoved(root).map((item) => item.id));
  // `--no-loop-seam` is the restore switch: it re-encodes the films this run
  // touches *without* the dissolve whatever the preference file says, which is
  // how the panel turns the feature back off for one wallpaper. Without it the
  // file is the whole answer, so a hand-run export and the host agree.
  const seamIds = noLoopSeam ? new Set() : readLoopSeam(root);

  const lines = [];
  const log = (line) => {
    lines.push(line);
    if (!report) console.log(line.startsWith("FAILED") ? line : `  ${line}`);
  };

  if (report) {
    const catalogPath = join(root, "_library.json");
    if (!existsSync(catalogPath)) {
      console.log(`no catalog at ${catalogPath} — run the export first`);
      process.exitCode = 1;
      return;
    }
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    let media = 0;
    let preview = 0;
    for (const group of catalog.groups) {
      console.log(`\n${group.nameZh}  (${group.ids.length})`);
      for (const id of group.ids) {
        const entry = catalog.wallpapers.find((item) => item.id === id);
        media += entry.bytes.media;
        preview += entry.bytes.preview;
        console.log(`  ${entry.id.padEnd(30)} ${entry.nameZh.padEnd(14)} ${(entry.bytes.media / 1048576).toFixed(1).padStart(7)} MB  ${entry.kind}`);
      }
    }
    console.log(`\ntotal ${catalog.wallpapers.length} wallpapers · media ${(media / 1048576).toFixed(0)} MB · previews ${(preview / 1048576).toFixed(1)} MB`);
    return;
  }

  let records = identify(discover({ videos: withVideos, files, crop }), { nameOverride });
  // Removals are applied before every other filter, so no later option — not
  // even a broad `--only` — can bring a deleted wallpaper back.
  if (removedIds.size > 0) {
    const kept = records.filter((record) => removedIds.has(record.id) === false);
    if (kept.length !== records.length) console.log(`  ${records.length - kept.length} removed wallpaper(s) skipped (${REMOVED_FILE})`);
    records = kept;
  }
  if (ids !== null) records = records.filter((record) => ids.includes(record.id));
  if (videosOnly) records = records.filter((record) => record.kind === "video");
  if (only !== null) records = records.filter((record) => only.some((token) => record.id.includes(token) || record.name.toLowerCase().includes(token.toLowerCase())));
  // Fail loudly rather than write a skin the skin center will refuse: this is
  // the manifest schema's own id rule, checked on the records this run is
  // actually about to write (including `--file` inputs). An earlier revision
  // ran a second system-only scan at module scope, after `main()` had already
  // started — it validated the wrong set, and a throw there raced the run.
  for (const record of records) {
    if (ID_PATTERN.test(record.id) === false) {
      throw new Error(`skin id "${record.id}" (${record.id.length} chars) violates the manifest id pattern`);
    }
  }

  console.log(`appearance library export → ${root}`);
  console.log(`${records.length} wallpaper(s): ${records.filter((r) => r.kind === "image").length} still, ${records.filter((r) => r.kind === "video").length} motion`);
  if (videosOnly) console.log("  --videos-only: films re-encoded, everything else carried over from the skin directories");
  if (videoStills) console.log("  --video-stills: films exported as one poster frame instead of an MP4 (seconds instead of minutes)");
  if (files.length > 0) console.log(`  --file: ${files.length} local picture(s) treated as their own source`);
  if (ids !== null) console.log(`  exact ids: ${ids.join(", ")}`);
  if (only !== null) console.log(`  filtered by: ${only.join(", ")}`);
  if (dryRun) {
    for (const record of records) console.log(`  ${record.id.padEnd(30)} ${record.nameZh.padEnd(14)} ${record.cluster.padEnd(18)} ${record.source}`);
    console.log("\n--dry-run: nothing was written");
    return;
  }

  const entries = [];
  if (catalogOnly) {
    console.log("  --catalog-only: rebuilding _library.json from the skins on disk, encoding nothing");
  } else {
    for (const record of records) {
      const entry = await exportOne(record, { root, force, log, videoStills, seamIds });
      if (entry !== null) entries.push(entry);
    }
  }

  const covered = new Set(entries.map((entry) => entry.id));
  // A skin directory that survived a half-failed removal must not sneak back
  // in through the carry-over path either.
  const carried = carriedEntries(root, covered).filter((entry) => removedIds.has(entry.id) === false);
  if (carried.length > 0) console.log(`  carried ${carried.length} unexported wallpaper(s) from the skin directories`);
  const all = [...entries, ...carried].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  // The drawer reports the pixel size of the *source*, and the exported tiers
  // are 2560 / 1080 / 320, so the catalogue has to carry the original numbers.
  // Probed here, once per entry after the carry-over merge, so a skin an
  // earlier run left on disk gets the same facts as one exported just now.
  for (const entry of all) {
    if (entry.sourceWidth > 0 && entry.sourceHeight > 0) continue;
    const sourceSize = await probeSourceSize(entry.source, entry.kind);
    entry.sourceWidth = sourceSize?.width ?? null;
    entry.sourceHeight = sourceSize?.height ?? null;
  }

  const groups = Object.entries(CLUSTERS)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, meta]) => ({
      key,
      nameZh: meta.zh,
      blurb: meta.blurb,
      order: meta.order,
      ids: all.filter((entry) => entry.cluster === key).map((entry) => entry.id),
    }))
    .filter((group) => group.ids.length > 0);

  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    storage: root,
    entry: libraryEntry({
      wallpapers: all.length,
      still: all.filter((entry) => entry.kind === "image").length,
      motion: all.filter((entry) => entry.kind === "video").length,
      clusters: groups.length,
      mediaMB: Math.round(all.reduce((sum, entry) => sum + (entry.bytes?.media ?? 0), 0) / 1048576),
    }),
    groups,
    wallpapers: all,
    diagnostics: lines.filter((line) => line.startsWith("FAILED")),
  };
  writeFileSync(join(root, "_library.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const media = all.reduce((sum, entry) => sum + (entry.bytes?.media ?? 0), 0);
  const previews = all.reduce((sum, entry) => sum + (entry.bytes?.preview ?? 0) + (entry.bytes?.thumb ?? 0), 0);
  console.log(`\nwrote ${entries.length} freshly exported skins + ${carried.length} carried = ${all.length} in _library.json`);
  console.log(`  wallpaper media ${(media / 1048576).toFixed(0)} MB · previews ${(previews / 1048576).toFixed(1)} MB`);
  if (catalog.diagnostics.length > 0) {
    console.log(`  ${catalog.diagnostics.length} failure(s) — see the lines above`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export { discover, identify, slugify, nameZh, SKIN_CSS, SKIN_CSS_MOTION, manifestFor, readRemoved, REMOVED_FILE };
