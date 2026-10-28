# Muciya DSH macOS 套件

[English](README.md) | **简体中文**

五个 DSH Web 插件，恰好放在同一个仓库里。每一个都是独立的 bundle：自己的 `package.json`、自己的
`cordis.patch.yml` 行、自己的宿主半和自己的浏览器半。

| 插件 | Plugin | 包名 | 分类 | 它做什么 |
| --- | --- | --- | --- | --- |
| **插件库** | Plugin Library | `@deepseek-ai/dsh-client-ui-plugin-manager`（本地 fork） | `market` | 已安装条目及其开关、带安装与来源归属的市场、以及能在「配置来自哪一层」的位置显示合成值的条目详情。另含从已退役的 `dsh-plugin-market-launcher` 搬来的侧栏**市场入口**。 |
| **技能库** | Skill Library | `muciya-dsh-plugin-skill-library` | `skill` | 把 harness 实际发现的技能列出来——直接读技能根目录而不是读副本：每行标来源根、可筛选、新装技能不用重装插件就能出现。 |
| **外观库** | Appearance Library | `muciya-dsh-plugin-appearance-library` | `theme` | 已退役外观库的完整移植：壁纸目录、影片画质/循环、航拍壁纸、皮肤运行时（`/api/skin-center/v2`）、带声音的开机动画、只读用量卡、皮肤设置分区；另含从 `dsh-plugin-hover-tokens` 搬来的**悬停色样式层**。 |
| **智能体团队** | Agent Teams | `muciya-dsh-plugin-agent-teams` | `agi` | 会话正在运行的智能体的花名册、拓扑图与共享任务看板，数据来自 `agentTeam` 会话投影。另含从 `dsh-plugin-schedule-console` 搬来的**自动化任务控制台**（launchd + crontab + DSH 自己的定时，路由在 `/api/muciya-agent-teams/automation/v1`）。 |
| **用量统计** | Usage | `muciya-dsh-plugin-usage` | `usage` | 本地台账按日/供应商/模型记录 token，按人民币计价（含峰谷时段），对提供余额接口的供应商做只读探测，并在侧栏显示消费卡。 |

## 为什么拆成五个包，而不是一个

这个仓库以前是一个包，用一份 `lib/client.js` 画四个面板。但 DSH 的客户端模块**就是**一个包，那种
形态有两个代价：

1. **先下载，才能首屏。** 每个 profile 都得先拉取并执行所有面板的浏览器半，界面才能渲染——哪怕
   这个 profile 永远不会打开其中某个面板。
2. **一个面板出错，所有人陪葬。** 某个面板的 `apply` 抛异常，会把其他面板一起带下去，因为它们共用
   一个模块、一行挂载。

现在每个包只占一行、一个宿主半、一个浏览器半。想用哪个装哪个；坏一个只损失它自己。

## 安装

### 从 Release 资产装（不需要构建）

每个插件都以预构建 tarball 发布在
[releases 页](https://github.com/Muciya953/Muciya-DSH-macos-suite/releases)，安装时不需要任何构建授权：

```sh
dsh plugin add https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/download/v1.0.0/muciya-dsh-plugin-usage-1.0.0.tgz
```

把资产名换成 `muciya-dsh-plugin-skill-library`、`muciya-dsh-plugin-appearance-library`、
`muciya-dsh-plugin-agent-teams` 或 `muciya-plugin-library`，版本都是 `1.0.0`。

### 从仓库装

```sh
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/skill-library
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/appearance-library
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/agent-teams
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/usage
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/plugin-library
```

这条路会在目标 profile 里跑构建，所以 DSH 会要 `allowBuilds` 授权。预构建的 `lib/` 已经入库，
因此单纯 clone 下来就是可直接安装的包。

### 作为 profile 里的本地插件

把每个包目录复制到 `<profile>/plugins/muciya-<名字>/`，再按路径挂载。套件自己的
`cordis.patch.yml` 就是那五行；把包名换成本地路径（`./plugins/…`）同样可用。完整走查见
`MANUAL.zh.md`，其中包括插件库 fork 需要的那两条符号链接。

## 环境要求

- DSH `>= 0.2.0-rc.2`（每个包都写了 `dsh.engines.dsh`），Node `>= 20`。
- 外观库需要 macOS（它调用 `sips`、`plutil`，可选 `ffmpeg`）；原先放在这里的自动化工具同样需要
  macOS。其余四个与平台无关。
- 插件库 fork 会 import 四个 profile 默认不带的包。缺了它们，它的侧栏行会**静默消失**；
  `packages/plugin-library/README.md` 里写了那两条 `ln -sfn`。

## 发布前自检

```sh
node scripts/check-packages.mjs
```

五个包的离线结构检查：是否声明 bundle patch、是否声明 web client、行里有没有 id 与 entry、浏览器半是不是
真正的 `__ModuleLoader__.load` 外壳且身份与宿主半期望的一致、有没有残留的旧 API 前缀、README 够不够长
能被评审，以及每个合并进来的功能模块是否仍在且被调用。它不启动 harness。

## 目录结构

```
packages/<plugin>/        每个都是一个可独立发布的 bundle
  package.json            dsh.bundle + dsh.client + dsh.engines
  cordis.patch.yml        恰好一行
  lib/index.js            宿主半
  lib/client.js           浏览器半（__ModuleLoader__.load 外壳）
  README.md
src/index.js              套件自身的 bundle 身份；不挂任何东西
scripts/check-packages.mjs
scripts/build-package.mjs 从 src/ 构建 packages/appearance-library
scripts/export-wallpapers.mjs
```

`src/` 里还留着拆分时用的源码，包括不属于这五个的两个面板（`automation-tasks`、旧版 `usage-glance`
卡）。它们只作为源码保留、不作为包发布；如果哪天要用，`scripts/build-package.mjs` 演示了怎么把一个
源码目录变成包。

## 文档

- `README.md` — 本文件的英文版
- `MANUAL.zh.md` — 安装、挂载、退役旧行、故障排查
- `PUBLISH.md` — 打包、发布与投稿收录的完整流程
- `CHANGELOG.md` — 版本变更

## 许可

MIT
