# Muciya DSH macOS suite · 使用手册

仓库 `Muciya-DSH-plugin-macos-suite`，**2.0.0** 起是**五个可独立安装的插件**，不再是
"一个包装四个面板"。五个包各有自己的 `package.json`、`cordis.patch.yml`、宿主半与浏览器半；
本仓库只剩 bundle 身份（`src/index.js`，不挂任何面板）。MIT。

| 插件 | 中文 | 包名 | 分类 |
| --- | --- | --- | --- |
| 插件库 | 插件库 | `@deepseek-ai/dsh-client-ui-plugin-manager`（本地 fork，保留上游名） | `market` |
| 技能库 | 技能库 | `muciya-dsh-plugin-skill-library` | `skill` |
| 外观库 | 外观库 | `muciya-dsh-plugin-appearance-library` | `theme` |
| 智能体团队 | 智能体团队 | `muciya-dsh-plugin-agent-teams` | `agi` |
| 用量统计 | 用量统计 | `muciya-dsh-plugin-usage` | `usage` |

---

## 1. 为什么要拆

一个 DSH 客户端模块就是**一个包**。以前四个面板挤在一个 `lib/client.js` 里，代价是两条：

1. **首屏前必须下载完**：不管你会不会打开某个面板，浏览器半都得先拉到并执行，页面才能渲染。
2. **一个面板出事，全体陪葬**：它们共用一个模块、一行 entry，某个面板 `apply` 抛错就一起消失。

现在每个插件只有一行、一个宿主半、一个浏览器半。装哪个用哪个，坏一个只坏它自己。

## 2. 安装（2.0.0）

### 2.1 市场安装

```sh
dsh plugin add github:OWNER/REPO/packages/skill-library
dsh plugin add github:OWNER/REPO/packages/appearance-library
dsh plugin add github:OWNER/REPO/packages/agent-teams
dsh plugin add github:OWNER/REPO/packages/usage
dsh plugin add github:OWNER/REPO/packages/plugin-library
```

### 2.2 本地 profile 挂载（本机采用）

把五个目录复制到 `<profile>/plugins/muciya-<名字>/`，再在 profile 的 `cordis.patch.yml`
里插一段：

```yaml
- insert:
    - id: muciya-plugin-library
      name: ./plugins/muciya-plugin-library/lib/entry.js
    - id: muciya-skill-library
      name: ./plugins/muciya-skill-library/lib/index.js
    - id: muciya-appearance-library
      name: ./plugins/muciya-appearance-library/lib/index.js
    - id: muciya-agent-teams
      name: ./plugins/muciya-agent-teams/lib/index.js
    - id: muciya-usage
      name: ./plugins/muciya-usage/lib/index.js
```

**插件库那行必须用 `lib/entry.js`**：它的宿主半与两个 typert 半都以
`@deepseek-ai/dsh-client-ui-plugin-manager` 注册，改名或换入口会让 RPC 命名空间失去归属。
另外它 import 四个 profile 默认没有的裸包（`zod`、`@deepseek-ai/schemastery`、
`@deepseek-ai/dsh-timeout`、`@deepseek-ai/dsh-typert-protocol`），缺了会**侧栏行静默消失**：

```sh
APP=/Applications/DSH\ Desktop\ Beta.app/Contents/Resources/app/node_modules/@deepseek-ai
PROFILE=~/.dsh-beta/profiles/desktop
ln -sfn "$APP/dsh-timeout" "$PROFILE/node_modules/@deepseek-ai/dsh-timeout"
ln -sfn "$APP/dsh-typert-protocol" "$PROFILE/node_modules/@deepseek-ai/dsh-typert-protocol"
```

### 2.3 装完怎么验

profile patch 由宿主 HMR 热重载，不用重启。看宿主日志
`~/.dsh-beta/logs/desktop-next.log`，应出现：

- `pluginId: "include:muciya-skill-library"` → `[skill-library] sidebar panel is composed into the web boot graph`
- `pluginId: "include:muciya-agent-teams"` → `[agent-team-panel] sidebar panel is composed into the web boot graph`
- `pluginId: "include:muciya-appearance-library"` → `[appearance-library] 11 API routes mounted under /api/muciya-appearance/v1`
- `~/.dsh-beta/muciya-usage/provider-snapshots.json` 被创建（用量统计真的在跑）

`muciya-plugin-library` 与 `muciya-usage` 不打印装载行；前者只注册 typert 服务，后者直接挂路由，
没有日志是正常的（路由冲突会在同文件里报错）。

## 3. 退役旧行与回滚

> 2026-10-28：七个旧插件目录已删除，行也已从 `cordis.patch.yml` 移除。完整归档在仓库
> `_backup/legacy-plugins-20261028/plugins-all.tgz`（含七个旧包与五个新包的当时状态）；
> 恢复＝解压回 `plugins/` 并把对应 `- insert:` 行加回（备份里的
> `profile-patch-before-cleanup.yml` 可整份覆盖回去）。


五个新包取代了本机原有的四个单面板插件。挂新行的同时给旧行加 `disabled: true`：

| 旧行 id | 旧入口 | 被谁取代 |
| --- | --- | --- |
| `skill-library` | `./plugins/dsh-plugin-skill-library/lib/index.js` | `muciya-skill-library` |
| `appearance-library-v12` | `./plugins/dsh-plugin-appearance-library/lib/entry-v12.js` | `muciya-appearance-library` |
| `plugin-library` | `./plugins/dsh-plugin-plugin-library/lib/entry.js` | `muciya-plugin-library` |
| `agent-team-panel` | `./plugins/dsh-plugin-agent-team-panel/lib/index.js` | `muciya-agent-teams` |
| `web-ui-usage`（生成区那条 `disabled: false`） | `@linxin666/dsh-usage` | `muciya-usage` |

旧插件目录留在磁盘上，回滚只要把这些 `disabled: true` 去掉、并停用对应的 `muciya-*` 行。

## 4. 自检

```sh
node scripts/check-packages.mjs
```

离线结构校验（126 项）：`dsh.bundle` / `dsh.client` 是否声明、patch 行是否有 id 与入口、
浏览器半是否是 `__ModuleLoader__.load` 信封且 id 与包名一致、有没有残留旧的套件 API 前缀、
README 是否够评审。它**不启动宿主**。

---

## 附录 A. 1.x 组合包的四面板（legacy）

| 面板 | 一句话 | 管的东西 |
| --- | --- | --- |
| **技能库**（skills，侧边栏第 5 位） | 当前会话能用的 skill 全在这 | 发现、分组、搜索、一键调用 |
| **外观库**（appearance，第 6 位） | 把本机壁纸变成 DSH 皮肤 | 预览、导入、应用、移除、循环接缝 |
| **自动化任务**（automation，第 7 位） | 这台 Mac 上什么时候会自己跑什么 | launchd、crontab、DSH 定时 |
| **用量速览**（侧栏底部卡片，不占侧栏行） | 今天花了多少、用掉多少 tokens | 只读聚合：今日成本、7 天条、各路由余额 |

四个面板各自独立：某个面板依赖的服务不在时，它自己不挂载并写一条告警，其余照常工作。
用量速览卡片连 slot 都不注册，它自己在侧栏底部容器里放一个 `div`，被 React 重建后
自动补回去。

---

### A.2 安装（1.x）

**从插件市场**：在市场里搜「Muciya DSH macOS suite」，或按包名安装：

```sh
dsh plugin install muciya-dsh-plugin-macos-suite
```

**离线 / 手动**：拿到 `.tgz` 或克隆仓库后 `npm run build && npm pack`，再在 profile 的
`cordis.patch.yml` 里按路径挂载：

```yaml
- insert:
    - id: macos-suite
      name: ./plugins/muciya-dsh-plugin-macos-suite/lib/index.js
```

> 客户端半（面板）刷新页面即生效；宿主半（路由）每个进程只 import 一次，改完要重启 DSH Desktop。

**环境要求**：DSH `>= 0.2.0-rc.2`、Node `>= 20`。外观库的导出脚本用
`/usr/bin/sips` 与 `/usr/bin/plutil`，自动化任务读 `launchctl`(`/bin/launchctl`) 与
`crontab`(`/usr/bin/crontab`)，因此这两个面板是 macOS 专属；技能库与平台无关。

### A.3 从 1.0.0 升级

- **面板不用动。** 客户端与宿主在同一个包里，一起升级；界面上没有任何要改的配置。
- **只有直接调 API 的脚本要改。** 外观库宿主的接口前缀从 `/api/appearance-library/v1`
  改成 `/api/macos-suite/appearance/v1`。自己写脚本调这几个路由的，把前缀换掉即可；
  不提供兼容别名，旧前缀不再响应。
- **一个 profile 只留一个外观库。** `dsh-plugin-appearance-library` 与本包的侧栏条目
  **同名**（都叫「外观库」）。两边前缀已经分开、技术上能同时挂，但侧栏会出现两套同名面板，
  建议卸载或停用其中一个。
- **皮肤数据不会丢。** 皮肤与目录都在 `$DSH_HOME/skins/`（默认 `~/.dsh-beta/skins`），
  升级、重装、卸载插件都不会碰这个目录。

---

### A.4 技能库

### 功能点

- **列出当前会话可见的 skill**：数据来自宿主自己的 skill 发现结果，面板不另建索引。
- **按来源库分组**：同一个库里装着两个以上 skill 时折成一行，行上标「{n} 个子技能」，可展开/收起。
- **成套库折叠到入口**：例如 Leonxlnx/taste-skill 的 11 个 skill 收进 `design-taste-frontend`，
  heygen-com/hyperframes 的 `media-use`、`motion-graphics` 收进 `hyperframes`（表在
  `src/client/skill-library.js` 的 `FAMILY_PARENT`）。入口 skill 没装时，成员各自成行。
- **搜索**：按名字过滤。
- **刷新**：重新读取 skill 列表，不用重开页面。
- **调用**：点「调用」把 `/技能名` 当链接插进输入框；**发送后**宿主才真正加载该技能。
- **仅限手动调用**：标了 `userOnly` 的 skill 会提示它只接受手动调用。
- **三行简介**：面板按 frontmatter 的 `description` 渲染中文三行说明（一句话定位 / 功能 / 边界）。

### 怎么用

1. 打开任意会话 → 看侧边栏「技能库」，或直接在主区打开面板。
2. 找不到想要的 skill 就先 `refresh`；还是没有，说明这个会话看不到它。
3. 点「调用」→ 输入框里出现 `/skill-name` →（可继续补需求）回车发送。

### skill 放在哪

DSH 按优先级发现：`~/.dsh-beta/skills`、`~/.agents/skills`、工作区的 `.dsh/skills`、`.agents/skills`。
面板全空时，页面上的提示就是这句：把 skill 目录放进 `~/.dsh-beta/skills`（或工作区的 `.dsh/skills`），然后点刷新。

---

### A.5 外观库

### 功能点

- **壁纸目录**：读 `$DSH_HOME/skins/_library.json`（`DSH_HOME` 未设时回落 `~/.dsh-beta`），
  每条一个预览瓦片；目录里只列真正写出来的皮肤，所以不会出现点不开的瓦片。
- **每条的信息**：分辨率、母版尺寸、朝向、类型（图片 / 动态）、来源。
- **应用**：把选中壁纸设为当前皮肤——和「设置 → 皮肤」写的是同一份配置，两边随时互通。
- **导入**：把本地图片收进皮肤目录。
- **移除 / 恢复**：移除会在皮肤根写一条 `.removed.json` 记录；不记的话，下次导出会把它当
  "本机还有这张壁纸" 又装回来。恢复走 `--ids` 那条路，只补一个 id，不重编整个库。
- **循环接缝（loop seam）**：视频壁纸的循环点是硬切，勾上接缝后尾帧会与首帧做一次交叉溶解，
  同一条文件重编，不另生成资源；取消勾选（`--no-loop-seam`）回到普通版本。
- **打开系统壁纸设置**：一键跳到 macOS 的壁纸面板。
- **导出脚本** `scripts/export-wallpapers.mjs`（等价 `npm run export`）：只读地扫本机壁纸资源
  ——桌面图片 `/System/Library/Desktop Pictures/*.heic` 与 MobileAsset 缓存、动态壁纸
  `.wallpapers/<set>/*.mov`（导出成 poster JPEG + H.264 MP4），经 `sips` 与 `plutil` 落成 DSH 皮肤。

### 导出命令

```sh
node scripts/export-wallpapers.mjs                 # 全量构建
node scripts/export-wallpapers.mjs --dry-run       # 只打印计划，不落盘
node scripts/export-wallpapers.mjs --only sonoma,big-sur   # 按 id 子串过滤
node scripts/export-wallpapers.mjs --force         # 资源已存在也重编
node scripts/export-wallpapers.mjs --videos        # 带上动态 .mov 壁纸
node scripts/export-wallpapers.mjs --report        # 打印已上架的目录
node scripts/export-wallpapers.mjs --ids wl-sonoma # 只处理这些 id
node scripts/export-wallpapers.mjs --no-loop-seam  # 重编影片时不做循环溶解
```

导出是**幂等**的：产物已存在就跳过（`--force` 才重编），manifest 与样式字节没变就不重写皮肤。

### 产物落点

```
$DSH_HOME/skins/
├── _library.json                    面板读的目录
├── _loop-seam.json                  记住哪些影片做了循环接缝
├── .removed.json                    被你移除过的 id，导出时跳过
└── wl-<slug>/
    ├── skin.json                    manifest v2，backgroundMedia 按主题分
    ├── skin.css                     只做半透明，不带自己的配色
    ├── assets/full.jpg | wallpaper.mp4
    └── preview/*.jpg                目录预览 + 网格小图
```

对 `/System/Library` 下的壁纸资源全程只读，脚本不写系统目录。

---

### A.6 自动化任务

### 功能点

一份清单，把这台 Mac 上所有「到点会自己跑」的东西列在一起：

| 分组 | 位置 | 能做什么 |
| --- | --- | --- |
| 用户级 launchd | `~/Library/LaunchAgents` | 启用、停用、立即运行 |
| 系统级 Agents（已加载） | `/Library/LaunchAgents` | 只读 |
| 系统级 Daemons（已加载） | `/Library/LaunchDaemons` | 只读 |
| 计划任务（crontab） | macOS 保留的 cron | 只读 |
| DSH 内部定时 | DSH 自己维护的调度与周期检查 | 只读 |

- 每条显示：跑什么、下一次什么时候触发（cron 也会算）、上次结果。
- **启用 / 停用 / 立即运行**只对用户级 LaunchAgent 开放——改的是你自己的
  `launchctl` 域，系统域不动。
- **日志**：面板里直接看任务日志尾部，不用开终端。
- 二进制 plist 与 XML plist 都读（走 `plutil -convert json`）；`launchctl list` 只看得到调用者
  自己的域，所以系统级守护进程用 `launchctl print system/<label>` 判活。

---

### A.7 用量速览

侧栏底部那张「今日消费」卡。

### 数据从哪来

卡片自己**不算账**。台账由 `@linxin666/dsh-usage` 折叠 `session/event` 后写到：

- `$DSH_HOME/dsh-usage/usage-ledger.json` —— 日 → 路由 → 模型 → 用量与成本
- `$DSH_HOME/dsh-usage/provider-snapshots.json` —— 各路由最近一次余额/套餐探测

本插件**只读**这两份文件（每次请求重新读，不缓存），从不写、不折叠、不发网络请求，
所以台账永远只有一个写者。那张卡换成别人做的只读聚合也能跑。

### 卡片显示什么

- 今日成本（¥）、调用次数、计费 tokens；
- 近 7 天 tokens 条（今天那根加深）；
- 最多 3 条路由余额。

三种「空」要分清：没有装 dsh-usage → 提示装；装了但今天没调用 → 「今天还没有调用」；
有调用但该路由不提供计价 → 「仅统计 tokens」。**不会**用 0 冒充未知。

### 交互

点卡片标题折叠/展开，选择存 `localStorage`；页面可见时每 30 秒刷新一次，
切到后台就停（后台标签页不轮询）。

### 已知限制

卡片文案目前固定简体中文，还没接进面板字典（三个 slot 面板是中英双语）。

---

### A.8 接口一览（1.x）

宿主半在本 GUI 同源下注册三组路由，均要求同源请求：

| 前缀 | 路由 |
| --- | --- |
| `/api/macos-suite/appearance/v1` | `catalog`、`status`、`preview`、`aerial-preview`、`open-wallpaper-settings`、`import`、`remove`、`restore`、`seam-loop`、`apply`、`probe` |
| `/api/automation-tasks/v1` | `list`、`toggle`、`run`、`log` |
| `/api/macos-suite/usage/v1` | `overview`、`probe`（页面自检信标，落 `diag/usage-glance.jsonl`） |

用量前缀带上 `macos-suite` 命名空间，理由和外观库一致：同一 profile 若另外挂载了
`@linxin666/dsh-usage`，两边的路径不会撞。

---

### A.9 常见问题

### 界面语言

面板文案与宿主半都跟请求语言走：`GET /list?lang=en` 显式指定，不传则按
`Accept-Language` 推断。三份面板字典的中英键名完全一致（技能库 31 键、外观库
151 键、自动化任务 77 键），任何一侧漏键或英文值里掺了中文，`node test/harness.mjs`
会直接报错。失败响应只保证 `error` code 稳定，面板用 `error.<code>` 查自己的字典，
宿主的 `detail` 只进日志。


**面板里什么都没有？**
技能库先确认 skill 装没装、点没点刷新；外观库先跑一次导出脚本；自动化任务本来就空说明这台
Mac 上没有计划任务。

**改了皮肤，外观库和设置页对不上？**
两边读同一份 `$DSH_HOME/skins` 配置，刷新页面即可。

**删掉的壁纸又回来了？**
它的记录没写进 `.removed.json`。用面板上的「移除」，或手工在皮肤根补一条。

**面板提示找不到宿主服务 / 只挂载了两个面板？**
在客户端模块的 boot graph 里没找到这个包（5 秒超时），宿主半也可能没重载——重启 DSH Desktop，
再看页面刷新。

**视频壁纸没有循环接缝？**
那条 id 不在 `_loop-seam.json` 里，或者最近一次是带 `--no-loop-seam` 编的。

---

### A.10 界面视觉（令牌与主题）

技能库 / 外观库 / 自动化任务三个 slot 面板共用**同一份设计令牌**，不再各写各的字号与颜色
（侧栏底部那张用量卡自带一份极简样式表，好让它落在任何皮肤里都不抢戏）：

- **66 条令牌**覆盖表面、文字、描边、间距、圆角、控件高、时长、缓动、焦点环与动效。
  它们以 42 行的块放在三份 `src/client/*.js` 样式表开头，**三份逐字相同**；
  只要有一份被改偏，`node scripts/build.mjs` 会直接报错，不会带着不一致的样式出包。
- 构建时这份块会被抽成 `tokens.css`，并**排在三个面板样式表之前**装载——面板不会先画一帧
  再等变量到位。
- 颜色最终落到 DSH 自己的 `--dsw-alias-*` 变量上，所以本套件随 DSH 的明暗主题与系统强调色
  一起变，不需要第二套配色。
- 字号、字重、圆角、控件高四类**只认令牌**：在样式里写死一个 `font-size:13px` 会让
  `node test/harness.mjs` 直接失败。
- 想改观感：先改 `docs/design/tokens.json`（唯一事实源），再把同一段 42 行令牌块贴回三份
  样式表，最后 `node scripts/build.mjs && node test/harness.mjs` 确认 40+ 项全绿。

> 装饰性尺寸（图标框 34px、状态点 8px、进度条 2.5px、开关旋钮 17px）不在四类判据内，
> 保留字面量是有意的，别把它们硬塞进令牌。

### A.11 卸载与开发

```sh
npm run build   # 由 src/ 重新生成 lib/
npm test        # 40+ 项离线自检：清单、语言包、patch、客户端挂载、宿主挂载、视觉契约
```

`src/` 是唯一事实来源。构建脚本对每一处改写都做数量断言：锚点位置一变，`npm run build`
直接报错，而不是安静地发一个过期包。

卸载：从 `cordis.patch.yml` 里删掉那条 `insert`，或从 profile 的 `plugins/` 里删掉目录，
然后重启 DSH Desktop。
