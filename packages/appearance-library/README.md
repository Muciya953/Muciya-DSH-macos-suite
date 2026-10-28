# Muciya Appearance Library

The wallpaper picker for this GUI, and the settings section that tunes the skin it applies.

## What it does

A wallpaper here is not a new kind of object: it is **exported as a real DSH skin**, and this panel is a
purpose-built picker for that family of skins. Styling, background opacity, blur sliders, first-paint
stamping and the atomic switch all come from the skin center unchanged.

- **Library** — every exported skin under `$DSH_HOME/skins`, grouped by source (macOS wallpapers,
  aerial stills, MobileAsset masters), with real previews, resolution and file size.
- **Import** — hand it an image, pick a crop ratio, and it is exported into the same skin family as
  everything else.
- **Aerials** — the system's own aerial set, downloaded and re-muxed to a playable fast-start MP4 when
  the source is HEVC; exports the still frame as the skin preview.
- **Apply / remove / restore** — writes the skin center's own persistence document
  (`$DSH_HOME/skin-center-active.json`), so the applied wallpaper also shows up as the active skin in
  the skin center. There is exactly one owner of that state and it stays the skin center's document.
- **Skin settings** — the section that edits the active skin: scrim, blur, corner radius, tint.

## Failure policy

Route-mounting problems are logged, never thrown. The web shell fails its whole boot when a plugin
`apply` throws, and a wallpaper picker must not be able to take the GUI down with it.

## Requirements

`ffmpeg` on `PATH` (or `DSH_FFMPEG`) for exports and aerial re-muxing; everything else is Node core.
The Host half resolves `scripts/export-wallpapers.mjs` relative to itself, so the `scripts/` directory
ships with this package.

## Install

```sh
dsh plugin add github:OWNER/REPO/packages/appearance-library
```

Or mount a checkout by hand from your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: muciya-appearance-library
      name: ./plugins/appearance-library/lib/index.js
```

Do not mount this row and another wallpaper panel that registers the same panel id at the same time.
