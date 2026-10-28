# Muciya DSH macOS Suite

[简体中文](README.md) | **English**

## Introduction

Five DSH Web plugins that live in one repository and install independently: **Plugin Library, Skill Library,
Appearance Library, Agent Teams, Usage**. Each is a real bundle — its own `package.json`, its own
`cordis.patch.yml` row, its own Host half (`lib/index.js`) and its own browser half (`lib/client.js`).

This repository used to ship one package that painted four panels from a single `lib/client.js`. A DSH
client module *is* one package, and that shape had two costs: **every profile downloaded and executed every
panel before the first paint** (even panels it would never open), and **one panel whose `apply` threw took
the others down**. Each package now owns one row, one Host half and one browser half — install what you
want, and a broken one costs only itself.

The prebuilt `lib/` directories are committed and the releases carry packed assets, so neither route
requires you to install dependencies and build first.

## Requirements

| Item | Requirement | Notes |
| --- | --- | --- |
| DSH | `>= 0.2.0-rc.2` | Declared as `dsh.engines.dsh` in all five packages |
| Node | `>= 20` | Only for installing from source or running the structural check |
| Platform | **macOS** for Appearance Library and the automation console | The former drives `sips`/`plutil` (optionally `ffmpeg`); the latter reads `launchd`/`crontab`. The other three are platform-neutral |
| Optional | `ffmpeg` | Film remux and compression in the Appearance Library; without it the "native" and "seamless" actions stay unavailable |
| Optional | Four packages | The Plugin Library is an upstream fork and imports `zod`, `@deepseek-ai/schemastery`, `@deepseek-ai/dsh-timeout`, `@deepseek-ai/dsh-typert-protocol`. A profile does not ship them; without them its sidebar row is **silently absent** (no error). The two `ln -sfn` lines are in `packages/plugin-library/README.md` |

## Usage

### Install (pick one)

**1. From the release assets (recommended, no build approval)**

```sh
dsh plugin add https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/download/v1.0.0/muciya-dsh-plugin-usage-1.0.0.tgz
```

Swap the asset name for `muciya-dsh-plugin-skill-library`, `muciya-dsh-plugin-appearance-library`,
`muciya-dsh-plugin-agent-teams` or `muciya-plugin-library`; all at version `1.0.0`.

**2. From the repository** (runs a build inside the target profile, so DSH asks for `allowBuilds`)

```sh
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/usage
```

**3. As a local plugin in a profile** (for when you edit the code)

Copy the package directory to `<profile>/plugins/muciya-<name>/` and mount it by path at the end of the
profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: muciya-usage
      name: ./plugins/muciya-usage/lib/index.js
```

### Verify the install

1. `dsh plugin list` shows the package;
2. the sidebar shows its row (Plugin Library / Skill Library / Appearance Library / Agent Teams / Usage, or
   the entries they register);
3. the host log carries a self-check line such as
   `[appearance-library] 15 API routes mounted under /api/muciya-appearance/v1 …` or
   `[schedule-console] 4 API routes mounted under /api/muciya-agent-teams/automation/v1`.

Logs live in `~/Library/Application Support/DSH Desktop*/logs/host/` (desktop) or `~/.dsh/logs/` (CLI).

### Day to day

- **Enable or disable one plugin**: Settings → Plugins, expand the row and flip it — the switch is written to
  the profile overlay, no file editing.
- **Change configuration**: edit the same row's fields; each plugin's config keys follow its row id prefix
  (`muciya-*`).
- **Uninstall**: `dsh plugin remove <package>`, or drop the row from the profile patch and delete the directory.
- **When something is wrong**: check the host log for `failed to import` or `never reached the web boot graph`.
  The Appearance Library also exposes a read-only `GET /api/muciya-appearance/v1/usage` (the usage card data),
  and `GET /api/dsh-web-all/degraded` if you also run web-all.

### Structural check (after editing code)

```sh
node scripts/check-packages.mjs      # 174 assertions: bundle/client declarations, row id and entry, loader identity, retired prefixes, merged modules still wired
```

## Feature highlights

### Plugin Library — plugin panel and market

Package `@deepseek-ai/dsh-client-ui-plugin-manager` (upstream fork; the upstream name is kept so its typert
RPC namespace stays intact), category `market`.

- **Per-row switches**: enable or disable each installed row on its own; bundles and their child rows are
  shown separately, so you never have to toggle a whole bundle to silence one row.
- **Market**: browse, install, and see provenance plus version; the install log and the reason for a failure
  are visible on the same entry.
- **Where a value came from**: the row detail shows which layer produced a composed config value — profile
  overlay, bundle default, or factory — instead of only the final value.
- **Market entry**: a navigation entry ported from the retired `dsh-plugin-market-launcher`, default shortcut
  <kbd>⌘</kbd><kbd>⇧</kbd><kbd>M</kbd>, which opens the market page inside Settings without occupying an extra
  sidebar row.
- **Localized**: a complete Chinese UI that coexists with upstream entries.

### Skill Library

Package `muciya-dsh-plugin-skill-library`, category `skill`. No dependencies.

- **Reads the real skill roots, not a copy**: it scans `~/.dsh-beta/skills`, `~/.agents/skills`, and the
  workspace's `.dsh/skills` and `.agents/skills`, so a newly installed skill appears without reinstalling the
  plugin.
- **Source root per row**: you can tell at a glance which directory a skill came from — useful when two skills
  share a name and you need to know which one actually loads.
- **Filtering and search**: narrow by name, source root or description.
- **Cheap by design**: the Host half only runs one "did the panel reach the web boot graph" self-check; it does
  not poll.

### Appearance Library

Package `muciya-dsh-plugin-appearance-library`, category `theme`. Requires macOS.

- **Wallpapers exported as real skins**: turns this Mac's wallpapers into DSH skins (`skin.json` + `skin.css` +
  previews) that you can apply, remove and restore.
- **Film quality and loop**: each film skin offers "native / compressed" and "plain / seamless"; compression is
  an ffmpeg re-encode, seamless is a cross-faded loop.
- **Aerial wallpapers**: reads the system aerial assets, downloads and remuxes them into directly playable mp4,
  names them with Apple's own Chinese labels (164 entries) and files them under the six official categories
  (landscapes / cities / underwater / earth / mac / motion desktop).
- **Skin runtime**: serves the `/api/skin-center/v2` routes (skin list, versions, apply, verify, external
  wallpapers) that the third-party skin center client depends on.
- **Startup splash**: replace the film and the audio track; drag "duration" (`2–10s`) and the playback rate is
  derived; `Range` requests are served so playback starts immediately, and the reveal transition avoids
  `clip-path`.
- **Hover-token layer**: a pure CSS layer ported from `dsh-plugin-hover-tokens` that pins every hover background
  to three layers (neutral / accent / danger).
- **Read-only usage card**: aggregates the local ledger and provider balances for the sidebar card without ever
  writing them — the writer is always the Usage plugin.
- **Route surface**: 15 appearance routes + 3 skin-runtime routes + 7 startup routes + 2 usage routes, under
  `/api/muciya-appearance/v1` and `/api/skin-center/v2`.

### Agent Teams

Package `muciya-dsh-plugin-agent-teams`, category `agi`. The automation console part requires macOS.

- **Roster and topology**: lists the agents a session is running, draws the parent/child topology, and jumps to
  a member's own session.
- **Shared task board**: filters the team's shared tasks by member, refreshing the projection read-only — it
  never changes team state.
- **Automation console** (ported from `dsh-plugin-schedule-console`): one page showing every scheduled job on
  this Mac — your own jobs in `~/Library/LaunchAgents`, the system agents/daemons that are **currently loaded**,
  the `crontab` entries, and DSH's own clocks (the task board cron and the session archive's next check).
- **Actions that are real**: `start` / `stop` / `kickstart` your own launchd agents. `crontab` and system jobs
  are shown read-only, because there is no safe API to edit them — no fake buttons.
- **Failure isolation**: route mounting problems are logged, never thrown; a task list must not take the whole
  GUI down.

### Usage

Package `muciya-dsh-plugin-usage`, category `usage`.

- **Local ledger**: bucketed by **local day** (not UTC), recorded per day / provider / model with input, output,
  cache read, cache write, reasoning and call counts.
- **CNY pricing**: built-in peak windows (weekdays 9–12 and 14–18), four price tiers (input / output / cache read
  / cache write), and model aliases (`deepseek-chat`, `deepseek-reasoner`, …) folded onto the right tier. Cost is
  computed when the fold happens, so history does not drift when the table changes later.
- **Read-only balance probes**: queries balance and plan for the providers that expose one — currently DeepSeek,
  Moonshot, OpenRouter, SiliconFlow, Z.ai, MiniMax, Kimi Coding, Codex and more; a failed probe only clears that
  one fact and never hides the other.
- **Observed spend**: balance drops are accumulated separately (a top-up can only raise a balance) and shown next
  to the folded estimate, because the two are computed differently and are not interchangeable.
- **Voucher**: converts accumulated spend into a shareable voucher face value (1,000,000 tokens = 1 whale yuan).
- **Sidebar card and settings section**: the card follows token streaming but does not write to disk per event
  (3-second debounce); the settings section exposes retention days and the poll interval.
- **Data location**: `$DSH_HOME/muciya-usage/{usage-ledger.json,provider-snapshots.json}`, so it can coexist with
  the upstream `@linxin666/dsh-usage` — each writes its own directory.

## More

**Layout**

```
packages/<plugin>/        one publishable bundle each
  package.json            dsh.bundle + dsh.client + dsh.engines
  cordis.patch.yml        exactly one row
  lib/index.js            Host half
  lib/client.js           browser half (__ModuleLoader__.load envelope)
  README.md
src/index.js              bundle identity for the suite itself; mounts nothing
scripts/check-packages.mjs
scripts/build-package.mjs builds packages/appearance-library from src/
scripts/export-wallpapers.mjs
```

`src/` still holds the sources the split packages were built from, including the two panels that are not part of
the five (`automation-tasks`, the old `usage-glance` card). They are kept as sources only, not shipped as packages.

**Documents**

- `README.md` — 简体中文版（仓库默认展示）
- `MANUAL.zh.md` — install, mount, retiring old rows, troubleshooting (Chinese)
- `PUBLISH.md` — packaging, publishing and submission
- `CHANGELOG.md` — version history

## License

MIT
