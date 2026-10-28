# Muciya DSH macOS 套件

**简体中文** | [English](README.en.md)

## 简介

五套装在同一个仓库里、但可以各自独立安装的 DSH Web 插件：**插件库、技能库、外观库、智能体团队、用量统计**。
每个都是完整的 bundle——自己的 `package.json`、自己的 `cordis.patch.yml` 挂载行、自己的宿主半
（`lib/index.js`）和自己的浏览器半（`lib/client.js`）。

仓库以前是一个包用一份 `lib/client.js` 画四个面板。DSH 的客户端模块*就是*一个包，那种形态有两个代价：
**首屏前要下载并执行所有面板**（哪怕永远不会打开），**一个面板的 `apply` 抛异常会带走其他面板**。现在每个包
只占一行、一个宿主半、一个浏览器半——装你想用的，坏一个只损失它自己。

预构建的 `lib/` 已入库，Release 里也有打包好的资产，两条路都不用你先装 Node 依赖再构建。

## 环境要求

| 项 | 要求 | 说明 |
| --- | --- | --- |
| DSH | `>= 0.2.0-rc.2` | 五个包的 `dsh.engines.dsh` 都写了这条 |
| Node | `>= 20` | 只在从源码装或跑自检时需要 |
| 平台 | 外观库、自动化控制台需要 **macOS** | 前者调 `sips`/`plutil`（可选 `ffmpeg`），后者读 `launchd`/`crontab`；其余三个平台无关 |
| 可选 | `ffmpeg` | 外观库的影片转封装与压缩；没有它时「原画」与「无缝」两个动作不可用 |
| 可选 | 四个依赖 | 插件库是上游 fork，import 了 `zod`、`@deepseek-ai/schemastery`、`@deepseek-ai/dsh-timeout`、`@deepseek-ai/dsh-typert-protocol`。profile 默认不带，缺了它的侧栏行会**静默消失**（不报错）；两条 `ln -sfn` 见 `packages/plugin-library/README.md` |

## 使用说明

### 装（三种方式任选）

**一、从 Release 装（推荐，不需要构建授权）**

```sh
dsh plugin add https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/download/v1.0.0/muciya-dsh-plugin-usage-1.0.0.tgz
```

资产名换成 `muciya-dsh-plugin-skill-library`、`muciya-dsh-plugin-appearance-library`、
`muciya-dsh-plugin-agent-teams`、`muciya-plugin-library`，版本都是 `1.0.0`。

**二、从仓库装**（会在目标 profile 里跑构建，DSH 会要 `allowBuilds` 授权）

```sh
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/usage
```

**三、作为 profile 里的本地插件**（自己改代码时用）

把包目录复制到 `<profile>/plugins/muciya-<名字>/`，在 profile 的 `cordis.patch.yml` 末尾按路径挂：

```yaml
- insert:
    - id: muciya-usage
      name: ./plugins/muciya-usage/lib/index.js
```

### 装完怎么验

1. `dsh plugin list` 里出现对应包名；
2. 侧栏出现该插件的行（插件库/技能库/外观库/智能体团队/用量统计，或它们注册的入口）；
3. 宿主日志有自检行，例如
   `[appearance-library] 15 API routes mounted under /api/muciya-appearance/v1 …`、
   `[schedule-console] 4 API routes mounted under /api/muciya-agent-teams/automation/v1`。

日志位置：`~/Library/Application Support/DSH Desktop*/logs/host/`（桌面版）或 `~/.dsh/logs/`（CLI）。

### 日常操作

- **启停单个插件**：设置 → 插件，展开对应行开关即生效（写入 profile 覆盖层，不用改文件）。
- **改配置**：同一面板里逐行编辑；每个插件的配置字段与它的行 id 前缀一致（`muciya-*`）。
- **卸载**：`dsh plugin remove <包名>`，或删掉 profile patch 里那一行再移除目录。
- **出问题**：先看宿主日志有没有 `failed to import` / `never reached the web boot graph`；外观库另有一个只读诊断端点
  `GET /api/muciya-appearance/v1/usage`（用量卡数据）与 `GET /api/dsh-web-all/degraded`（若同时装了 web-all）。

### 自检（改代码后）

```sh
node scripts/check-packages.mjs      # 174 项：bundle/client 声明、行 id 与 entry、loader 外壳身份、旧前缀残留、合并模块仍被调用
```

## 组件功能亮点

### 插件库 · 插件库面板与插件市场

包名 `@deepseek-ai/dsh-client-ui-plugin-manager`（上游 fork，保留原包名以维持 typert RPC 命名空间），分类 `market`。

- **逐行开关**：已安装插件的每一行单独启停，父子插件（bundle 与其子行）分开展示，不必整包开关。
- **插件市场**：浏览、安装、看来源归属与版本；安装日志与失败原因在同一条目里可见。
- **配置来源可见**：条目详情会显示某个配置值**来自哪一层**（profile 覆盖层 / bundle 默认 / 出厂），而不是只显示最终值。
- **市场入口**：从已退役的 `dsh-plugin-market-launcher` 搬来的导航入口，默认快捷键 <kbd>⌘</kbd><kbd>⇧</kbd><kbd>M</kbd>，
  直接跳进设置里的市场页（不再额外占一条侧栏行）。
- **本地化**：完整中文界面，与上游英文条目共存不冲突。

### 技能库

包名 `muciya-dsh-plugin-skill-library`，分类 `skill`。零依赖。

- **读真实技能根，不读副本**：直接扫 `~/.dsh-beta/skills`、`~/.agents/skills`、工作区 `.dsh/skills` 与 `.agents/skills`，
  所以新装一个 skill 不用重装插件就能出现在列表里。
- **每行标来源根**：一眼看出某个 skill 来自哪个目录，排查「同名 skill 到底加载了哪个」时有直接用。
- **筛选与搜索**：按名字、来源、描述过滤，长列表也能定位。
- **开销低**：宿主半只做一次「面板是否进了 web boot graph」的自检，不常驻轮询。

### 外观库

包名 `muciya-dsh-plugin-appearance-library`，分类 `theme`。需要 macOS。

- **壁纸导出成真皮肤**：把本机壁纸整理成 DSH 皮肤（`skin.json` + `skin.css` + 预览图），可应用、可移除、可恢复默认。
- **影片画质与循环**：每张影片皮肤可选「原画 / 压缩」与「普通 / 无缝」；压缩走 ffmpeg 重编码，无缝是交叉淡化循环。
- **航拍壁纸**：读取系统 aerial 资源，下载并转封装成可直接播放的 mp4；命名用 Apple 自带中文名（164 条映射），
  按官方六类归档（风景 / 城市 / 水下 / 地球 / Mac / 动态桌面）。
- **皮肤运行时**：提供 `/api/skin-center/v2` 一组路由（皮肤列表、版本、应用、校验、外部壁纸），第三方皮肤中心客户端靠它工作。
- **开机动画**：可换影片与音轨，拖「时长」自动推导倍速（`2–10s`）；支持 `Range` 请求分片播放，片尾裂开过渡不用 `clip-path`。
- **悬停色样式层**：从 `dsh-plugin-hover-tokens` 搬来的纯 CSS 层，把界面所有 hover 背景收敛到三层色阶（中性 / 强调 / 危险）。
- **只读用量卡**：侧栏消费卡直接聚合本机用量台账与供应商余额，不做写操作（写者永远是用量统计插件）。
- **路由规模**：15 条外观 API + 3 条皮肤运行时 + 7 条启动动画 + 2 条用量，全部挂在 `/api/muciya-appearance/v1` 与 `/api/skin-center/v2`。

### 智能体团队

包名 `muciya-dsh-plugin-agent-teams`，分类 `agi`。自动化控制台部分需要 macOS。

- **花名册与拓扑**：列出会话正在跑的智能体，按父子关系画拓扑，点成员可跳到它自己的会话。
- **共享任务看板**：把团队共享任务按成员筛选，只读刷新投影，不会改动团队状态。
- **自动化任务控制台**（从 `dsh-plugin-schedule-console` 搬来）：一页看完这台 Mac 上的定时任务——
  `~/Library/LaunchAgents` 里用户自己的 job、系统**已加载**的 agent/daemon、`crontab` 条目，以及 DSH 自己的
  定时器（任务看板 cron、会话归档的下次检查）。
- **可执行的动作**：对用户自己的 launchd agent 做 `start` / `stop` / `kickstart`；`crontab` 与系统 job **只读展示**
  （没有安全的编辑 API，所以不给假按钮）。
- **失败不拖垮宿主**：路由挂载失败只记日志不抛异常——任务列表不该把整个 GUI 带走。

### 用量统计

包名 `muciya-dsh-plugin-usage`，分类 `usage`。

- **本地台账**：按**本地日**（不是 UTC）分桶，记到「日 / 供应商 / 模型」粒度，含 input、output、cache 读、cache 写、reasoning、调用次数。
- **人民币定价**：内置峰谷时段（工作日 9–12、14–18 为峰时），区分 input / output / cache 读 / cache 写四档价，模型别名
  （`deepseek-chat`、`deepseek-reasoner` 等）统一折算到对应档位；计价在折叠瞬间完成，历史成本不随未来调价漂移。
- **余额探测（只读）**：对提供余额接口的供应商查询余额与套餐，当前覆盖 DeepSeek、Moonshot、OpenRouter、SiliconFlow、
  Z.ai、MiniMax、Kimi Coding、Codex 等十余家；探测失败只清该条 fact，不影响另一条。
- **观测消费**：余额下降量单独累计（充值只会让余额上升），与折叠估算并列显示，两者算法不同所以分开看。
- **鲸元券**：把累计消费换算成可分享的券面值（100 万 tokens = 1 鲸元）。
- **侧栏消费卡 + 设置分区**：卡片随 token 流式刷新但不逐条写盘（3 秒防抖），设置分区可调保留天数与轮询间隔。
- **数据落点**：`$DSH_HOME/muciya-usage/{usage-ledger.json,provider-snapshots.json}`，可与上游 `@linxin666/dsh-usage` 并存（各写各的目录）。

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

`src/` 里还留着拆分时的源码，包括不在五包内的两个面板（`automation-tasks`、旧版 `usage-glance` 卡）——只作源码保留，
不作为包发布。

**文档**

- `README.en.md` — 本文件的英文版
- `MANUAL.zh.md` — 安装、挂载、退役旧行、故障排查
- `PUBLISH.md` — 打包、发布与投稿收录的完整流程
- `CHANGELOG.md` — 版本变更

## 许可

MIT
