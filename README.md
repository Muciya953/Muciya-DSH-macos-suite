# Muciya DSH macOS Suite

Five DSH Web plugins that happen to live in one repository. Each one is a real bundle: its own
`package.json`, its own `cordis.patch.yml` row, its own Host half and its own browser half.

| Plugin | 中文 | Package | Category | What it does |
| --- | --- | --- | --- | --- |
| **Plugin Library** | 插件库 | `@deepseek-ai/dsh-client-ui-plugin-manager` (local fork) | `market` | Installed rows with their switches, the market with install/attribution, and the row detail that shows a composed config value where it was set. Also carries the sidebar **market entry** ported from the retired `dsh-plugin-market-launcher`. |
| **Skill Library** | 技能库 | `muciya-dsh-plugin-skill-library` | `skill` | Every skill the harness discovers, read from the skill roots instead of a copy: source root per row, filtering, no reinstall needed for a new skill to show up. |
| **Appearance Library** | 外观库 | `muciya-dsh-plugin-appearance-library` | `theme` | The full port of the retired appearance library: wallpaper catalog, film quality/loop, aerials, skin runtime (`/api/skin-center/v2`), startup splash with audio, the read-only usage card, and the skin settings section — plus the **hover-token stylesheet** ported from `dsh-plugin-hover-tokens`. |
| **Agent Teams** | 智能体团队 | `muciya-dsh-plugin-agent-teams` | `agi` | Roster, topology and shared task board for the agents a session is running, fed by the `agentTeam` projection. Also carries the **automation console** ported from `dsh-plugin-schedule-console` (launchd + crontab + DSH clocks under `/api/muciya-agent-teams/automation/v1`). |
| **Usage** | 用量统计 | `muciya-dsh-plugin-usage` | `usage` | A local day/provider/model ledger, CNY pricing with peak windows, read-only provider balance probes, and the sidebar foot card. |

## Why five packages instead of one

This repository used to ship one package that painted four panels from a single
`lib/client.js`. A DSH client module *is* one package, so that shape had two costs:

1. **Download before first paint.** Every profile had to fetch and execute every panel's browser half
   before the GUI could render, even for panels the profile would never open.
2. **One panel, everyone's problem.** A panel whose `apply` threw took the other panels down with it,
   because they shared one module and one row.

Each package now owns exactly one row, one Host half and one browser half. Install the plugin you
want; a broken one costs only itself.

## Install

### As marketplace plugins

```sh
dsh plugin add github:OWNER/REPO/packages/skill-library
dsh plugin add github:OWNER/REPO/packages/appearance-library
dsh plugin add github:OWNER/REPO/packages/agent-teams
dsh plugin add github:OWNER/REPO/packages/usage
dsh plugin add github:OWNER/REPO/packages/plugin-library
```

### As local plugins in a profile

Copy each package directory into `<profile>/plugins/muciya-<name>/` and mount it by path. The suite's
own `cordis.patch.yml` shows the five rows; the same rows work with `./plugins/...` paths instead of
package names. `MANUAL.zh.md` has the full walkthrough, including the two symlinks the Plugin Library
fork needs.

## Requirements

- DSH `>= 0.2.0-rc.2` (`dsh.engines.dsh` in every package), Node `>= 20`.
- macOS for the Appearance Library (it drives `sips`, `plutil` and optionally `ffmpeg`) and for the
  automation tooling that used to live here. The other four are platform-neutral.
- The Plugin Library fork imports four packages a profile does not ship by default. Without them its
  sidebar row is **silently absent**; `packages/plugin-library/README.md` has the two `ln -sfn` lines.

## Check before you ship

```sh
node scripts/check-packages.mjs
```

Offline structural check across the five packages: bundle patch declared, web client declared, row
names an id and an entry, browser half is a real `__ModuleLoader__.load` envelope with the identity the
Host half expects, no leftover suite-wide API prefix, README long enough to review. It does not boot
the harness.

## Layout

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

`src/` still holds the sources the split packages were built from, including the two panels that are
not part of the five (`automation-tasks`, the old `usage-glance` card). They are kept as sources, not
shipped as packages; `scripts/build-package.mjs` shows how to turn one into a package if it comes back.

## Documents

- `MANUAL.zh.md` — 安装、挂载、退役旧行、故障排查（中文）
- `PUBLISH.md` — 打包与发布前检查
- `CHANGELOG.md` — 版本变更

## License

MIT
