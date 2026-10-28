<p align="center">
  <img src="assets/brand/dsh.png" width="62" height="62" alt="DSH" align="middle">&nbsp;&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/apple-on-dark.svg">
    <img src="assets/brand/apple-on-light.svg" width="56" height="56" alt="macOS">
  </picture>
</p>

<h1 align="center">Muciya DSH macOS suite</h1>

<p align="center"><sub>Five independently installable DSH Web plugins, built for DSH Desktop on macOS</sub></p>

<p align="center">
  <img alt="DSH" src="https://img.shields.io/badge/DSH-%E2%89%A5%200.2.0--rc.2-4d6bfe?style=flat-square">
  <img alt="packages" src="https://img.shields.io/badge/packages-5-1d1d1f?style=flat-square">
  <img alt="macOS" src="https://img.shields.io/badge/platform-macOS-1d1d1f?style=flat-square">
  <a href="https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/tag/v1.0.0"><img alt="release" src="https://img.shields.io/github/v/release/Muciya953/Muciya-DSH-macos-suite?style=flat-square&color=4d6bfe"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-1d1d1f?style=flat-square">
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <b>English</b>
</p>

## Introduction

Five DSH Web plugins that install independently: **Plugin Library, Skill Library, Appearance Library, Agent
Teams, Usage**. Each is a real bundle — its own `package.json`, its own `cordis.patch.yml` row, its own Host
half (`lib/index.js`) and its own browser half (`lib/client.js`).

| Plugin | Package | Category | What it covers |
| --- | --- | --- | --- |
| Plugin Library | `@deepseek-ai/dsh-client-ui-plugin-manager` | `market` | Plugin panel and plugin market |
| Skill Library | `muciya-dsh-plugin-skill-library` | `skill` | Local skill overview and filtering |
| Appearance Library | `muciya-dsh-plugin-appearance-library` | `theme` | Wallpapers, film skins, aerials, startup splash |
| Agent Teams | `muciya-dsh-plugin-agent-teams` | `agi` | Roster, task board, automation console |
| Usage | `muciya-dsh-plugin-usage` | `usage` | Ledger, balances, pricing, voucher |

This repository used to ship one package that painted four panels from a single `lib/client.js`. A DSH client
module *is* one package, and that shape cost two things: every profile downloaded and executed every panel
before the first paint, and one panel whose `apply` threw took the others down. Each package now owns one row,
one Host half and one browser half.

## Requirements

| Item | Requirement | Notes |
| --- | --- | --- |
| DSH | `>= 0.2.0-rc.2` | Declared in all five packages |
| Node | `>= 20` | For installing from source or running the check |
| Platform | **macOS** for Appearance Library and the automation console | The former drives `sips`/`plutil`, the latter reads `launchd`/`crontab`. The other three are platform-neutral |
| Optional | `ffmpeg` | Film remux and compression; without it "native" and "seamless" are unavailable |
| Optional | Four packages | The Plugin Library fork imports `zod`, `@deepseek-ai/schemastery`, `@deepseek-ai/dsh-timeout` and `@deepseek-ai/dsh-typert-protocol`. Without them its sidebar row is silently absent; the two `ln -sfn` lines are in `packages/plugin-library/README.md` |

## Usage

The prebuilt `lib/` directories are committed and the releases carry packed assets, so neither route needs a
build first.

### Install (pick one)

**1. From the release assets** (no build approval)

```sh
dsh plugin add https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/download/v1.0.0/muciya-dsh-plugin-usage-1.0.0.tgz
```

Swap the asset name for `muciya-dsh-plugin-skill-library`, `muciya-dsh-plugin-appearance-library`,
`muciya-dsh-plugin-agent-teams` or `muciya-plugin-library`; all at `1.0.0`.

**2. From the repository** (runs a build inside the target profile, so DSH asks for `allowBuilds`)

```sh
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/usage
```

**3. As a local plugin in a profile** (when you edit the code)

Copy the package to `<profile>/plugins/muciya-<name>/` and mount it by path at the end of the profile's
`cordis.patch.yml`:

```yaml
- insert:
    - id: muciya-usage
      name: ./plugins/muciya-usage/lib/index.js
```

### Verify the install

1. `dsh plugin list` shows the package;
2. the sidebar shows its row;
3. the host log carries a self-check line, for example
   `[appearance-library] 15 API routes mounted under /api/muciya-appearance/v1 …` or
   `[schedule-console] 4 API routes mounted under /api/muciya-agent-teams/automation/v1`.

Logs live in `~/Library/Application Support/DSH Desktop*/logs/host/` (desktop) or `~/.dsh/logs/` (CLI).

### Day to day

- **Enable or disable one plugin**: Settings → Plugins, flip the row; the change goes to the profile overlay.
- **Change configuration**: edit the same row's fields; keys follow the row id prefix (`muciya-*`).
- **Uninstall**: `dsh plugin remove <package>`, or drop the row from the profile patch and delete the directory.
- **Troubleshooting**: look for `failed to import` or `never reached the web boot graph` in the host log. The
  Appearance Library also exposes a read-only `GET /api/muciya-appearance/v1/usage`, plus
  `GET /api/dsh-web-all/degraded` when web-all is installed.

### Structural check (after editing code)

```sh
node scripts/check-packages.mjs      # 174 assertions: bundle/client declarations, row id and entry, loader identity, retired prefixes, merged modules still wired
```

## Feature highlights

### Plugin Library — plugin panel and market

<sub>`@deepseek-ai/dsh-client-ui-plugin-manager` · `market` · upstream fork</sub>

- **Per-row switches**: each installed row toggles on its own; bundles and their child rows are listed separately.
- **Market**: browse, install, and see provenance plus version; the install log and the failure reason sit on the
  same entry.
- **Config provenance**: the row detail shows which layer produced a value — profile overlay, bundle default, or
  factory.
- **Market entry**: default shortcut <kbd>⌘</kbd><kbd>⇧</kbd><kbd>M</kbd>, opens the market page inside Settings
  without occupying a sidebar row.
- **Chinese UI**: coexists with upstream entries.

### Skill Library

<sub>`muciya-dsh-plugin-skill-library` · `skill` · no dependencies</sub>

- **Reads the real skill roots**: scans `~/.dsh-beta/skills`, `~/.agents/skills`, and the workspace's
  `.dsh/skills` and `.agents/skills`, so a new skill appears without reinstalling the plugin.
- **Source root per row**: tells you which directory a same-named skill actually loads from.
- **Filtering and search**: by name, source root or description.
- **No polling**: the Host half runs one "did the panel reach the web boot graph" self-check.

### Appearance Library

<sub>`muciya-dsh-plugin-appearance-library` · `theme` · requires macOS</sub>

- **Wallpapers exported as skins**: turns this Mac's wallpapers into DSH skins (`skin.json` + `skin.css` +
  previews) that you can apply, remove and restore.
- **Film quality and loop**: each film skin offers "native / compressed" and "plain / seamless"; compression is an
  ffmpeg re-encode, seamless is a cross-faded loop.
- **Aerial wallpapers**: reads the system aerial assets, downloads and remuxes them into mp4, names them with
  Apple's own Chinese labels (164 entries) and files them under six categories (landscapes / cities / underwater /
  earth / mac / motion desktop).
- **Skin runtime**: serves the `/api/skin-center/v2` routes (skin list, versions, apply, verify, external
  wallpapers) that the third-party skin center client depends on.
- **Startup splash**: replace the film and the audio track; drag "duration" (`2–10s`) and the playback rate is
  derived; `Range` requests are served.
- **Hover-token layer**: pure CSS that pins every hover background to three layers (neutral / accent / danger).
- **Read-only usage card**: aggregates the local ledger and provider balances; the Usage plugin owns the writes.
- **Routes**: 15 appearance + 3 skin-runtime + 7 startup + 2 usage, under `/api/muciya-appearance/v1` and
  `/api/skin-center/v2`.

### Agent Teams

<sub>`muciya-dsh-plugin-agent-teams` · `agi` · the automation console requires macOS</sub>

- **Roster and topology**: lists the agents a session is running, draws the parent/child topology, jumps to a
  member's session.
- **Shared task board**: filters shared tasks by member, refreshing the projection read-only.
- **Automation console**: one page for every scheduled job on this Mac — your own jobs in
  `~/Library/LaunchAgents`, the loaded system agents/daemons, the `crontab` entries, and DSH's own clocks (the
  task board cron and the session archive's next check).
- **Real actions**: `start` / `stop` / `kickstart` your own launchd agents; `crontab` and system jobs are
  read-only.
- **Failure isolation**: route mounting problems are logged, never thrown.

### Usage

<sub>`muciya-dsh-plugin-usage` · `usage` · ledger and probes kept apart</sub>

- **Local ledger**: bucketed by local day (not UTC), recorded per day / provider / model with input, output,
  cache read, cache write, reasoning and call counts.
- **CNY pricing**: built-in peak windows (weekdays 9–12 and 14–18), four tiers (input / output / cache read /
  cache write), model aliases (`deepseek-chat`, `deepseek-reasoner`, …) folded onto the right tier. Cost is
  computed at fold time, so history does not change when the table is updated later.
- **Balance probes**: queries balance and plan where a provider exposes one — DeepSeek, Moonshot, OpenRouter,
  SiliconFlow, Z.ai, MiniMax, Kimi Coding, Codex and more; a failed probe clears only that fact.
- **Observed spend**: balance drops accumulate separately (a top-up only raises a balance) and are shown next to
  the folded estimate.
- **Voucher**: converts accumulated spend into a voucher face value (1,000,000 tokens = 1 whale yuan).
- **Sidebar card and settings**: the card follows token streaming and debounces disk writes by 3 seconds; the
  settings section exposes retention days and the poll interval.
- **Data location**: `$DSH_HOME/muciya-usage/{usage-ledger.json,provider-snapshots.json}`, so it coexists with
  the upstream `@linxin666/dsh-usage`.

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

`src/` keeps the sources the packages were split from, including the two panels that are not among the five
(`automation-tasks`, the old `usage-glance` card). They are sources only, not shipped as packages.

**Documents**

- `README.md` — 简体中文版（仓库默认展示）
- `MANUAL.zh.md` — install, mount, retiring old rows, troubleshooting (Chinese)
- `PUBLISH.md` — packaging, publishing and submission
- `CHANGELOG.md` — version history

## License

MIT
