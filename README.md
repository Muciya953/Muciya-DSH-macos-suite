<p align="center">
  <img src="assets/brand/dsh.png" width="56" height="56" alt="DSH">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/apple-on-dark.svg">
    <img src="assets/brand/apple-on-light.svg" width="52" height="52" alt="macOS">
  </picture>
</p>

<h1 align="center">Muciya DSH macOS 套件</h1>

<p align="center"><sub>五个可独立安装的 DSH Web 插件，为 macOS 上的 DSH Desktop 打造</sub></p>

<p align="center">
  <img alt="DSH" src="https://img.shields.io/badge/DSH-%E2%89%A5%200.2.0--rc.2-4d6bfe?style=flat-square">
  <img alt="packages" src="https://img.shields.io/badge/packages-5-1d1d1f?style=flat-square">
  <img alt="macOS" src="https://img.shields.io/badge/platform-macOS-1d1d1f?style=flat-square">
  <a href="https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/tag/v1.0.0"><img alt="release" src="https://img.shields.io/github/v/release/Muciya953/Muciya-DSH-macos-suite?style=flat-square&color=4d6bfe"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-1d1d1f?style=flat-square">
</p>

<p align="center">
  <b>简体中文</b> · <a href="README.en.md">English</a>
</p>

## 简介

五个可以各自独立安装的 DSH Web 插件：**插件库、技能库、外观库、智能体团队、用量统计**。每个都是完整
bundle：自己的 `package.json`、自己的 `cordis.patch.yml` 挂载行、自己的宿主半（`lib/index.js`）和浏览器半
（`lib/client.js`）。

| 插件 | 包名 | 分类 | 管什么 |
| --- | --- | --- | --- |
| 插件库 | `@deepseek-ai/dsh-client-ui-plugin-manager` | `market` | 插件面板与插件市场 |
| 技能库 | `muciya-dsh-plugin-skill-library` | `skill` | 本机技能总览与筛选 |
| 外观库 | `muciya-dsh-plugin-appearance-library` | `theme` | 壁纸、影片皮肤、航拍、开机动画 |
| 智能体团队 | `muciya-dsh-plugin-agent-teams` | `agi` | 花名册、任务看板、自动化控制台 |
| 用量统计 | `muciya-dsh-plugin-usage` | `usage` | 台账、余额、定价、鲸元券 |

以前是一个包用一份 `lib/client.js` 画四个面板。DSH 的客户端模块就是一个包，那种形态有两个代价：首屏前
要下载并执行全部面板，一个面板的 `apply` 抛异常会带走其他面板。现在每包一行、一个宿主半、一个浏览器半。

## 环境要求

| 项 | 要求 | 说明 |
| --- | --- | --- |
| DSH | `>= 0.2.0-rc.2` | 五个包都声明了这条 |
| Node | `>= 20` | 从源码装或跑自检时需要 |
| 平台 | 外观库、自动化控制台要 **macOS** | 前者调 `sips`/`plutil`，后者读 `launchd`/`crontab`；其余三个平台无关 |
| 可选 | `ffmpeg` | 外观库的影片转封装与压缩；缺它时「原画」「无缝」不可用 |
| 可选 | 四个依赖 | 插件库 fork import 了 `zod`、`@deepseek-ai/schemastery`、`@deepseek-ai/dsh-timeout`、`@deepseek-ai/dsh-typert-protocol`。缺了它的侧栏行会静默消失；两条 `ln -sfn` 见 `packages/plugin-library/README.md` |

## 使用说明

预构建的 `lib/` 已入库，Release 也有打包资产，两条路都不用先构建。

### 装（三种方式任选）

**一、从 Release 装**（不需要构建授权）

```sh
dsh plugin add https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/download/v1.0.0/muciya-dsh-plugin-usage-1.0.0.tgz
```

资产名换成 `muciya-dsh-plugin-skill-library`、`muciya-dsh-plugin-appearance-library`、
`muciya-dsh-plugin-agent-teams`、`muciya-plugin-library`，版本都是 `1.0.0`。

**二、从仓库装**（在目标 profile 里跑构建，DSH 会要 `allowBuilds`）

```sh
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/usage
```

**三、作为 profile 本地插件**（自己改代码时用）

把包目录复制到 `<profile>/plugins/muciya-<名字>/`，在 profile 的 `cordis.patch.yml` 末尾按路径挂：

```yaml
- insert:
    - id: muciya-usage
      name: ./plugins/muciya-usage/lib/index.js
```

### 装完怎么验

1. `dsh plugin list` 里出现对应包名；
2. 侧栏出现该插件的行；
3. 宿主日志有自检行，例如
   `[appearance-library] 15 API routes mounted under /api/muciya-appearance/v1 …`、
   `[schedule-console] 4 API routes mounted under /api/muciya-agent-teams/automation/v1`。

日志在 `~/Library/Application Support/DSH Desktop*/logs/host/`（桌面版）或 `~/.dsh/logs/`（CLI）。

### 日常操作

- **启停单个插件**：设置 → 插件，展开对应行开关即生效，写入 profile 覆盖层。
- **改配置**：同一面板里逐行编辑，字段前缀与行 id 一致（`muciya-*`）。
- **卸载**：`dsh plugin remove <包名>`，或删掉 profile patch 里那一行再移除目录。
- **出问题**：查宿主日志有无 `failed to import` / `never reached the web boot graph`；外观库另有只读诊断端点
  `GET /api/muciya-appearance/v1/usage`；装了 web-all 时还有 `GET /api/dsh-web-all/degraded`。

### 自检（改代码后）

```sh
node scripts/check-packages.mjs      # 174 项：bundle/client 声明、行 id 与 entry、loader 外壳身份、旧前缀残留、合并模块仍被调用
```

## 组件功能亮点

### 插件库 — 插件面板与插件市场

<sub>`@deepseek-ai/dsh-client-ui-plugin-manager` · `market` · 上游 fork</sub>

- **逐行开关**：已安装插件的每一行单独启停，bundle 与子行分开展示。
- **插件市场**：浏览、安装、看来源归属与版本；安装日志与失败原因在同一条目里。
- **配置来源**：条目详情显示配置值来自哪一层——profile 覆盖层 / bundle 默认 / 出厂。
- **市场入口**：默认快捷键 <kbd>⌘</kbd><kbd>⇧</kbd><kbd>M</kbd>，直接打开设置里的市场页，不占侧栏行。
- **中文界面**：与上游英文条目共存。

### 技能库

<sub>`muciya-dsh-plugin-skill-library` · `skill` · 零依赖</sub>

- **读真实技能根**：扫描 `~/.dsh-beta/skills`、`~/.agents/skills`、工作区 `.dsh/skills` 与 `.agents/skills`，
  新装 skill 不用重装插件就能出现。
- **每行标来源根**：排查同名 skill 时能看出加载的是哪个目录。
- **筛选与搜索**：按名字、来源、描述过滤。
- **不轮询**：宿主半只做一次「面板是否进了 web boot graph」自检。

### 外观库

<sub>`muciya-dsh-plugin-appearance-library` · `theme` · 需要 macOS</sub>

- **壁纸导出成皮肤**：把本机壁纸整理成 DSH 皮肤（`skin.json` + `skin.css` + 预览图），可应用、移除、恢复默认。
- **影片画质与循环**：每张影片皮肤可选「原画 / 压缩」与「普通 / 无缝」；压缩走 ffmpeg 重编码，无缝是交叉淡化循环。
- **航拍壁纸**：读系统 aerial 资源，下载并转封装成 mp4；用 Apple 自带中文名（164 条映射），按六类归档
  （风景 / 城市 / 水下 / 地球 / Mac / 动态桌面）。
- **皮肤运行时**：提供 `/api/skin-center/v2` 一组路由（皮肤列表、版本、应用、校验、外部壁纸），第三方皮肤中心
  客户端依赖它。
- **开机动画**：换影片与音轨，拖「时长」自动推导倍速（`2–10s`）；支持 `Range` 分片播放。
- **悬停色样式层**：纯 CSS，把界面 hover 背景收敛到三层色阶（中性 / 强调 / 危险）。
- **只读用量卡**：聚合本机用量台账与供应商余额，只读，写入由用量统计插件负责。
- **路由**：15 条外观 API + 3 条皮肤运行时 + 7 条启动动画 + 2 条用量，挂在 `/api/muciya-appearance/v1` 与
  `/api/skin-center/v2`。

### 智能体团队

<sub>`muciya-dsh-plugin-agent-teams` · `agi` · 自动化控制台需要 macOS</sub>

- **花名册与拓扑**：列出会话正在跑的智能体，按父子关系画拓扑，点成员跳到它的会话。
- **共享任务看板**：按成员筛选团队共享任务，只读刷新投影。
- **自动化任务控制台**：一页看完这台 Mac 的定时任务——`~/Library/LaunchAgents` 里用户自己的 job、
  系统已加载的 agent/daemon、`crontab` 条目，以及 DSH 自己的定时器（任务看板 cron、会话归档的下次检查）。
- **可执行的动作**：对用户自己的 launchd agent 做 `start` / `stop` / `kickstart`；`crontab` 与系统 job 只读。
- **失败隔离**：路由挂载失败只记日志，不抛异常。

### 用量统计

<sub>`muciya-dsh-plugin-usage` · `usage` · 台账与探测分离</sub>

- **本地台账**：按本地日（不是 UTC）分桶，记到「日 / 供应商 / 模型」，含 input、output、cache 读、cache 写、
  reasoning、调用次数。
- **人民币定价**：内置峰谷时段（工作日 9–12、14–18 为峰时），input / output / cache 读 / cache 写四档价，
  模型别名（`deepseek-chat`、`deepseek-reasoner` 等）折算到对应档位；计价在折叠时完成，历史成本不随后续调价变化。
- **余额探测**：对提供余额接口的供应商查询余额与套餐，覆盖 DeepSeek、Moonshot、OpenRouter、SiliconFlow、
  Z.ai、MiniMax、Kimi Coding、Codex 等十余家；单条失败只清该条，不影响另一条。
- **观测消费**：余额下降量单独累计（充值只让余额上升），与折叠估算并列显示。
- **鲸元券**：累计消费换算成券面值（100 万 tokens = 1 鲸元）。
- **侧栏卡与设置分区**：卡片随 token 流式刷新，写盘 3 秒防抖；设置分区可调保留天数与轮询间隔。
- **数据落点**：`$DSH_HOME/muciya-usage/{usage-ledger.json,provider-snapshots.json}`，可与上游
  `@linxin666/dsh-usage` 并存。

## 更多

**目录结构**

```
packages/<plugin>/        每个都是可独立发布的 bundle
  package.json            dsh.bundle + dsh.client + dsh.engines
  cordis.patch.yml        恰好一行挂载
  lib/index.js            宿主半
  lib/client.js           浏览器半（__ModuleLoader__.load 外壳）
  README.md
src/index.js              套件自身的 bundle 身份；不挂任何东西
scripts/check-packages.mjs
scripts/build-package.mjs 从 src/ 构建 packages/appearance-library
scripts/export-wallpapers.mjs
```

`src/` 保留拆分前的源码，包括不在五包内的两个面板（`automation-tasks`、旧版 `usage-glance` 卡），只作源码
保留，不作为包发布。

**文档**

- `README.en.md` — 本文件的英文版
- `MANUAL.zh.md` — 安装、挂载、退役旧行、故障排查
- `PUBLISH.md` — 打包、发布与投稿收录
- `CHANGELOG.md` — 版本变更

## 许可

MIT
