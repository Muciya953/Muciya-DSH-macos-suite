## 2.1.0 — 2026-10-28

把七个本地旧插件的功能全部搬进五包并停用旧行；旧插件本身已备份归档。

### Added

- 外观库：完整版移植（`src/{index,client}.js` + `src/skin/host.js` + `src/startup/boot.js` + `src/usage/host.js`，
  15345 行），前缀统一为 `/api/muciya-appearance/v1`，皮肤运行时仍保留 `/api/skin-center/v2`（第三方皮肤中心
  客户端写死了该前缀）；`assets/` 22M 与 `catalog/` 随包走。
- 外观库：`dsh-plugin-hover-tokens` 的样式层并入浏览器半（`__hoverTokens`，纯 CSS，无 slot、无路由）。
- 插件库：`dsh-plugin-market-launcher` 的侧栏市场入口并入浏览器半（`__marketLauncher`，一个 slot + 一个
  快捷键），`inject` 增加 `shortcuts`。
- 智能体团队：`dsh-plugin-schedule-console` 的宿主半并入 `lib/automation-panel.js`（`applyAutomationPanel`，
  4 条路由落在 `/api/muciya-agent-teams/automation/v1`），浏览器半并入（`__automationPanel`），`inject` 增加
  `remote` / `remote.schedule`。
- `scripts/check-packages.mjs`：172 项断言，新增「合并模块存在且被调用」「不得残留已退役 API 前缀」两组。

### Changed

- `packages/appearance-library/scripts/build-package.mjs` 改为幂等镜像构建（`src/` → `lib/`，五个入口），
  不再从仓库根的简化版源码生成。
- `packages/appearance-library/package.json`：`files` 补 `src`/`assets`/`catalog`，`peerDependencies` 补
  `@deepseek-ai/cordis ~4.0.4`（与旧插件一致）。

### Removed

- profile 侧停用（保留目录与备份，不删除）：`dsh-plugin-appearance-library`、`dsh-plugin-skill-library`、
  `dsh-plugin-agent-team-panel`、`dsh-plugin-plugin-library`、`dsh-plugin-hover-tokens`、
  `dsh-plugin-schedule-console`、`dsh-plugin-market-launcher`（最后一个本就未挂载）。
- 旧插件目录已从 `~/.dsh-beta/profiles/desktop/plugins/` 删除，整份归档移到仓库内的
  `_backup/legacy-plugins-20261028/`（`plugins-all.tgz` 23M / 199 条目，含七个旧包与五个新包；
  `profile-patch-before-cleanup.yml`；`profile-package.json`）。该目录被 `.gitignore` 忽略，不入版本库。
- `cordis.patch.yml` 里六条指向已删目录的行（`disabled: true` 死路径）一并移除，改为文件顶部一段
  归档说明；恢复方式：解开 tgz 到 `plugins/` 再把行加回。

## 2.0.0 — 2026-10-28

拆成五个可独立安装的插件，本仓库不再是"一个包装四个面板"。

### Added

- `packages/plugin-library` — 插件库（`@deepseek-ai/dsh-client-ui-plugin-manager` 的本地 fork，保留上游包名以维持 typert RPC 命名空间）。
- `packages/skill-library` — 技能库（读取真实技能根，非副本）。
- `packages/appearance-library` — 外观库（壁纸导出为 DSH 皮肤 + 皮肤设置分区）。
- `packages/agent-teams` — 智能体团队（roster / topology / task board）。
- `packages/usage` — 用量统计（台账 + 余额探针 + CNY 峰谷定价 + 侧栏卡 + 设置分区），数据落
  `$DSH_HOME/muciya-usage/`，API 前缀 `/api/muciya-usage/…`，可与 `@linxin666/dsh-usage` 并存。
- `scripts/check-packages.mjs` — 五包离线结构自检（126 项）。
- `scripts/build-package.mjs` — 从 `src/` 构建 `packages/appearance-library`。

### Changed

- 根 `cordis.patch.yml` 改为挂五个包行；根 `src/index.js` 只声明 bundle 身份、不挂任何面板。
- 根 `package.json` 升到 2.0.0，移除 `dsh.client`（本包已无浏览器半），dependencies 指向五个 `packages/*`。
- 外观库 API 前缀由 `/api/macos-suite/appearance/v1` 改为 `/api/muciya-appearance/v1`。

### Removed

- 组合产物 `lib/`（三面板单 bundle）、`test/harness.mjs` 与 `scripts/build.mjs`（由 `check-packages.mjs` 与
  `build-package.mjs` 取代）。备份见 `/tmp/macos-suite-legacy-20261028/`。
- `automation-tasks` 与旧 `usage-glance` 面板不再随包发布；源码保留在 `src/`。

# Changelog

## 1.2.0 — 2026-10-28

A fourth panel: the sidebar "today's spend" card, ported from `@linxin666/dsh-usage`.

### Added

- **Usage Glance (用量速览).** A read-only card in the sidebar footer showing today's
  cost, call count and billed tokens, a seven-day strip and up to three provider
  balances. It reads the two documents `@linxin666/dsh-usage` maintains and never
  writes them, so nothing in this package folds an event, prices a token or reaches
  the network.
- `GET /api/macos-suite/usage/v1/overview` and `…/probe` — the card's only source,
  plus the page-side self-report the desktop fence otherwise hides.
- Four new offline checks: the card's mount without timers or `fetch`, the
  no-ledger / empty-day / filled branches, both routes, and the client/Host prefix
  agreement.

### Changed

- `lib/index.js` composes four Host halves; `lib/client.js` carries four panel
  factories. The suite's own harness grew from 62 to 66 checks.
- Panels without a ledger plugin still mount: the card says "no ledger yet" instead
  of rendering a `¥0.00` that would read as real usage.

### Known limitations

- The card's copy is Simplified Chinese only; it does not join the panel dictionary
  (the three slot panels stay bilingual).
- Balances come from whatever `@linxin666/dsh-usage` last probed. With that plugin
  absent there is no browser half to fold usage, so the card stays at its install hint.

## 1.1.0 — 2026-10-26

An English interface, empty states that tell two apart, and a reload that keeps what it
already knows.

### Breaking

- **Appearance Library API prefix.** The Host now serves
  `/api/macos-suite/appearance/v1` (was `/api/appearance-library/v1`). Nothing in the UI
  changes — the client bundle and the Host entry ship together. Only code that called the
  old routes directly needs the new prefix; no compatibility alias is served.
- **One Appearance Library per profile.** `dsh-plugin-appearance-library` and this package
  both register a sidebar entry named "Appearance Library". The prefixes no longer collide,
  but two same-named panels are confusing — uninstall or disable one.
- **Your data is untouched.** Skins and catalogs stay in `$DSH_HOME/skins/`
  (default `~/.dsh-beta/skins`).

- **P0-1 · English UI**: every user-visible sentence in the Automation Tasks Host goes
  through `pick(lang, zh, en)`. `GET /list` accepts `?lang=en` and otherwise follows
  `Accept-Language`; `buildSnapshot({ lang })` echoes the language it was built in.
  `data/about.json` is now version 2 with a `{ zh, en }` pair per item, so a job without
  an English line falls back to a readable generic sentence instead of leaking Chinese.
  Failure responses promise only a stable `error` code: the panel renders `error.<code>`
  from its own dictionary (`error.http`, `error.not-found`, …) and the Host's `detail`
  stays in the log.
- **P0-2 · stale, not blank**: a reload that fails while rows are on screen keeps them,
  records `lastGoodAt`, and paints the stale face; only a load with nothing to show
  becomes the error face. `bodyKind()` names the single face that renders (`loading` /
  `failed` / `stale` / `empty` / `list`), and all three panels answer `stale` for a
  `ready + stale` state.
- **P0-3 · empty vs filtered**: `emptyReason()` separates "nothing is scheduled on this
  Mac" from "the filter hid everything", so an empty scan no longer wears the filter's
  copy, and the two empty titles are owned by exactly one branch each.
- **Route prefix**: the Appearance Library Host half moved to
  `/api/macos-suite/appearance/v1` (was `/api/appearance-library/v1`) — see *Breaking*
  above for who is affected.
- **Build**: `src/index.js` is now the source of `lib/index.js`; a clean
  `rm -rf lib && npm run build` produces a complete package again.
- **Token layer**: all three panel stylesheets now carry one byte-identical 66-token
  block (`--mds-surface-*`, `--mds-text-*`, `--mds-space-*`, `--mds-radius-*`,
  `--mds-control-*`, `--mds-dur-*`, `--mds-ease-*`, `--mds-focus-*`, …). `build.mjs`
  extracts it as `tokens.css` and installs it **before** any panel sheet, so a panel can
  no longer paint before its variables exist.
- **Type, weights and radii**: every `font-size`, `font-weight` and `border-radius`
  literal in the three panels resolves through the scale (92 / 34 / 42 literals → 0).
  Control heights moved onto `--mds-control-*`; decorative sizes (icon frames, status
  dots, switch knobs, progress bars) deliberately keep their literal pixels.
- **Surfaces and materials**: each panel paints its surface exactly once with
  `--mds-surface-panel`, backdrop blurs are limited to `4 / 14 / 20 px`, and the sticky
  toolbar trades its 28 px drop shadow for a 1 px hairline.
- **Motion**: 33 hand-written `cubic-bezier(…)` calls collapse onto three easings and 84
  raw millisecond values onto four duration tokens; letter spacing moved onto
  `--mds-tracking-*`.
- **Focus rings**: fifteen rings that pointed at the raw brand colour now use
  `--mds-focus-width` / `--mds-focus-color`, and three controls that shipped no ring at
  all (the search clear button, the Automation log tabs, the crop ratio buttons) got one.
- **Panel headers**: the Skill Library and Automation Tasks headers wrap instead of
  overflowing, their top padding joins the spacing scale, and the three state containers
  announce themselves with `role="status"`.
- **Tests**: `test/harness.mjs` grew from 18 to 40+ offline checks — package shape, entry
  copy, two-level `__internals`, dictionary parity, zero Chinese in every English value,
  a real English snapshot, error-code rendering, the primitive inventory of the installed
  primitives package, the stale state machine, and the whole visual contract: token
  parity and coverage, type / weight / radius / control-height scales, blur recipe,
  surface layers, focus rings, tokenised motion, and header wrapping.

## 1.0.0 — 2026-10-12

First release. Three local plugins — Skill Library, Appearance Library and Automation
Tasks — become one package with one client bundle and one Host entry:

- **Client**: one `window.__ModuleLoader__.load` registration under the package name,
  each panel wrapped in its own scope so the three panels no longer share
  `PACKAGE_NAME` / `NS` / `PANEL_ID` / `CSS_TAG_ID` constants. Panels mount through
  `ctx.inject(...)` one at a time, so a missing service costs one panel, not three.
- **Host**: `lib/index.js` mounts the three halves in order; each keeps its own route
  prefix (`/api/appearance-library/v1`, `/api/automation-tasks/v1`) and its own
  `clientModules` boot-graph self-check. Resource paths (`scripts/export-wallpapers.mjs`,
  `data/about.json`) were re-pointed one directory deeper.
- **Build**: `src/` -> `lib/` with asserted rewrites, so a moved anchor fails the build
  instead of shipping stale code.
- **Tests**: `test/harness.mjs` — 18 offline checks over the manifest, locales, patch,
  client mount and Host mount.

Renamed from `dsh-plugin-skill-library` / `dsh-plugin-appearance-library` /
`dsh-plugin-automation-tasks` to `muciya-dsh-plugin-macos-suite`. The old three can stay
installed side by side; this package does not read or write their data.
