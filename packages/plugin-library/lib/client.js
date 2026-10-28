window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-plugin-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_ui_slots = require("@deepseek-ai/dsh-client-ui-slots");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region lib/types/client/config-ledger.js
		/**
		* Which plugins bring their own configuration to the Plugins page, read from
		* the three slots the page declares: the official plugins listed beside the
		* official bundles, the bundles with a form on their page, and the rows with a
		* page of their own. The projection follows the slot ledgers and the active
		* locale and keeps its snapshot until one of them moves.
		*/
		/**
		* The key a row's configuration registers under.
		* @param bundle - the bundle's package name.
		* @param rowId - the row id the bundle's patch declares.
		* @returns the `plugins.row.config` key.
		*/
		function rowConfigKey(bundle, rowId) {
			return `${bundle}#${rowId}`;
		}
		const SLOTS = [
			"plugins.bundle.hidden",
			"plugins.item.hidden",
			"plugins.item",
			"plugins.bundle.config",
			"plugins.row.config"
		];
		/**
		* Project the configuration ledgers as one observable the page binds.
		* @param ctx - the page plugin's context, whose slot registry and locale the projection follows.
		* @returns the ledger source; its snapshot changes only when a ledger or the locale does.
		*/
		function configLedgerSource(ctx) {
			let versions = [];
			let revision = -1;
			let ledger = {
				items: [],
				hiddenBundles: new Set(),
				hiddenItems: new Set(),
				bundles: /* @__PURE__ */ new Set(),
				rows: /* @__PURE__ */ new Set()
			};
			const keysOf = (name) => new Set(ctx.slots.entries(name).flatMap((entry) => entry.options.key === void 0 ? [] : [entry.options.key]));
			return {
				getSnapshot: () => {
					const next = SLOTS.map((name) => ctx.slots.getVersion(name));
					const current = ctx.locale.getSnapshot().revision;
					if (current !== revision || next.some((version, index) => version !== versions[index])) {
						versions = next;
						revision = current;
						ledger = {
							items: ctx.slots.entries("plugins.item").map((entry) => ({
								/* v8 ignore next -- list-slot registration requires id */
								id: entry.options.id ?? "",
								label: (0, _deepseek_ai_dsh_client_ui_slots.resolveSlotLabel)(entry.options.label) ?? ""
							})),
							hiddenBundles: keysOf("plugins.bundle.hidden"),
							hiddenItems: keysOf("plugins.item.hidden"),
							bundles: keysOf("plugins.bundle.config"),
							rows: keysOf("plugins.row.config")
						};
					}
					return ledger;
				},
				subscribe: (listener) => {
					const offs = [...SLOTS.map((name) => ctx.slots.subscribe(name, listener)), ctx.locale.subscribe(listener)];
					return () => {
						for (const off of offs) off();
					};
				}
			};
		}
		/** Simplified Chinese dictionary and key source of truth. */
		const zh = {
			panel: "插件库",
			title: "插件库",
			intro: "安装、启用和配置插件",
			headSubtitle: "浏览插件市场和管理本地插件",
			infoLabel: "插件说明",
			infoDescription: "在这里配置官方插件，安装和管理其他插件。内置插件列表及运行状态可在「设置 → 内置插件」中查看",
			loading: "正在读取插件…",
			error: "可能由于网络问题，无法读取全部插件",
			unavailable: "本部署没有可管理的 profile，无法安装或启停插件。",
			retry: "重试",
			refresh: "刷新",
			refreshError: "刷新失败，请重试",
			empty: "还没有安装任何插件。",
			addPlugin: "添加插件",
			restartNotice: "更改将在下次启动生效",
			overriddenNotice: "{name} 已保存，但被更高优先级的配置覆盖，当前未生效",
			bundlesTitle: "本地",
			officialTitle: "官方",
			libraryTabsLabel: "插件库视图",
			tabMarket: "插件市场",
			tabInstalled: "本地插件",
			marketUnavailable: "插件市场界面尚未就绪。请确认「设置 → 插件市场」里的 dsh-market 已安装并加载，然后回到这里。",
			groupExpand: "展开{name}",
			groupCollapse: "折叠{name}",
			tuneOpen: "调参",
			tuneTitle: "插件库调参",
			tuneIntro: "所有改动实时生效，保存在这台机器的浏览器里；刷新和重启后仍在。",
			tuneExpandAll: "全部展开",
			tuneCollapseAll: "全部折叠",
			tuneGroupPage: "页面容器",
			tuneGroupTabs: "页签条",
			tuneGroupBand: "搜索背景带",
			tuneGroupSearch: "搜索框",
			tuneGroupChips: "分类条",
			tuneGroupNote: "提示行",
			tuneGroupResults: "结果区",
			tuneGroupCard: "插件卡片",
			tuneGroupList: "已安装列表",
			tuneGroupDock: "调参栏",
			tunePageGap: "页面区块间距",
			tunePageMax: "内容最大宽度",
			tunePagePadX: "页面左右内边距",
			tunePagePadBottom: "页面下留白",
			tuneTabsTop: "页签条上边距",
			tuneTabsOverlap: "页签条与正文重叠",
			tuneTabsGap: "页签与按钮间距",
			tuneHeadRadius: "背景带圆角",
			tuneHeadPadBottom: "带内下留白",
			tuneHeadGap: "带下到结果区",
			tuneSearchHeight: "搜索框高度",
			tuneSearchPadX: "搜索框左右内边距",
			tuneSearchRadius: "搜索框圆角",
			tuneSearchRowBottom: "搜索框下留白",
			tuneChipsGap: "分类间距",
			tuneChipsPadTop: "分类条上间距",
			tuneChipPadX: "分类内边距",
			tuneChipHeight: "分类高度",
			tuneChipFont: "分类字号",
			tuneNoteGap: "提示行上间距",
			tuneNoteSize: "提示行字号",
			tuneResultsPadTop: "结果区上留白",
			tuneResultsGap: "结果块间距",
			tuneCardRadius: "卡片圆角",
			tuneCardPadY: "卡片上下内边距",
			tuneCardPadX: "卡片左右内边距",
			tuneCardGap: "卡片内块间距",
			tuneGroupGap: "分组标题间距",
			tuneListGap: "列表项间距",
			tuneGroupTitleSize: "分组标题字号",
			tunePageTitleSize: "页面标题字号",
			tuneDockWidth: "调参栏宽度",
			tuneDockPad: "调参栏内边距",
			tuneReset: "恢复默认",
			tuneExport: "导出 JSON",
			tuneCopied: "调参 JSON 已复制到剪贴板",
			tuneCopyFailed: "复制失败，请手动记录数值",
			tuneNote: "把满意的数值导出后发给 Agent，即可固化成默认值。",
			statusProblem: "异常",
			statusBeta: "实验性",
			reasonLabel: "原因",
			metadataError: "包元信息错误：{error}",
			versionTag: "v{version}",
			partsLabel: "包含的组件",
			partsEmpty: "这个插件包不包含任何组件。",
			partsCountTotal: "共 {count} 个",
			partsCountRunning: "{count} 运行中",
			partsCountOff: "{count} 已停用",
			partOff: "已关闭",
			partsCountFailed: "{count} 异常",
			partsFilter: "筛选组件",
			partsFilterEmpty: "没有匹配的组件。",
			partToggle: "启用组件 {name}",
			rowPhasePending: "等待依赖",
			rowPhaseLoading: "加载中",
			rowPhaseActive: "运行中",
			rowPhaseFailed: "异常",
			rowPhaseUnloading: "卸载中",
			enableToggle: "启用 {name}",
			openDetail: "查看 {name}",
			backToList: "返回插件列表",
			crumbRoot: "插件列表",
			backToPackage: "返回 {name}",
			configureRow: "配置 {name}",
			rowStateIdle: "未运行",
			uninstall: "卸载",
			uninstallLabel: "卸载 {name}",
			installTitle: "添加插件",
			installDescription: "输入插件的包名、GitHub 仓库地址或本地目录路径。",
			installSpecLabel: "包名或地址",
			installSpecPlaceholder: "例如 dsh-plugin-whale-pet",
			installGuideToggle: "插件安装引导和示例",
			installGuideHide: "收起引导",
			installGuideIdTitle: "填入插件 npm 包名",
			installGuideIdExample: "dsh-plugin-whale-pet",
			installGuideIdHint: "插件包名即 npm 包名（如 dsh-xxx 或 @作者/插件名），社区插件的 README 安装命令中 dsh plugin add 或 pnpm add 之后的部分。",
			installGuideExampleLabel: "示例：",
			installGitTemplateHint: "请替换为实际的 Git 仓库地址",
			installPathTemplateHint: "请替换为本机插件目录的实际路径",
			installGuideFill: "填入示例",
			installGuideFillAria: "填入示例 {example}",
			installGuideSafety: "请确认插件来源可信。插件在本机以你的权限运行，来源不明的插件可能损坏 DeepSeek Harness，或读取和泄露你的数据。",
			installUpgradeNotice: "插件安装后，暂不支持自动更新。若需升级，请先卸载再安装新版，后续版本会持续改善升级体验。",
			registryToggle: "安装源",
			registryLegend: "从哪个 npm 源下载插件",
			registryDefault: "默认安装源",
			registryOfficial: "npm 官方源",
			registryNpmmirror: "中国大陆镜像源",
			registryCustom: "自定义地址",
			registryCustomPlaceholder: "https://npm.example.com/",
			registryCustomHint: "填写内网或私有 npm 源地址，以 http:// 或 https:// 开头。若为需要登录的源，请把凭据放在本机的 ~/.npmrc 里。",
			registryCustomInvalid: "请输入以 http:// 或 https:// 开头的地址",
			registryListSeparator: "、",
			sentenceSeparator: "",
			installRun: "安装",
			installChecking: "正在检查…",
			installProblemInvalid: "无法识别这个包名或地址：{reason}",
			installProblemInstalled: "该插件已安装。如需升级，请卸载后重新安装",
			installProblemShipped: "该插件随 DSH 提供，升级 DSH 即可获得新版本",
			installProblemNotFound: "未找到相关插件",
			installProblemNotPackage: "该路径不存在或不是有效的插件包",
			installProblemNotBundle: "这个包没有声明组合包，无法作为插件安装：{reason}",
			installProblemNetwork: "无法连接插件源，请检查网络后重试",
			installProblemNetworkAll: "所有安装源都无法连接（已尝试：{registries}），请检查网络或代理设置，或更换安装源",
			installProblemUnknown: "无法获取插件信息：{reason}",
			installingTitle: "插件安装中…",
			installedTitle: "已安装",
			installFailedTitle: "插件安装失败",
			installGithubFailedTitle: "无法访问 GitHub",
			installGithubTimeoutTitle: "连接 GitHub 超时",
			installGithubFailedDescription: "请尝试其他安装来源。",
			installUseGithubMirror: "改用国内镜像",
			installTryAnotherWay: "试试其他方式",
			installPackageLabel: "插件包名",
			installEdit: "编辑",
			installEditAria: "返回编辑",
			installCancelAndEdit: "取消安装并返回编辑",
			installApplyingCancellationError: "取消请求未得到确认；安装已进入收尾阶段，请等待结果。{reason}",
			installReconcile: "核对安装状态",
			installUnknownTitle: "未能获取安装结果",
			installUnknownDescription: "后端当前没有此安装任务。请检查插件列表后再尝试安装。",
			installResultUnconfirmed: "未收到安装结果，请核对安装状态。{reason}",
			installAwaitingAcceptance: "正在等待后端接收安装任务，收到确认后会自动重试取消。",
			installBackgroundUnknown: "未能获取安装结果，请检查插件列表。",
			installCancel: "取消安装",
			installCloseCancels: "取消安装并关闭",
			installViewTask: "查看安装任务",
			installUnconfirmedTitle: "安装状态尚未确认",
			installBackgroundDone: "插件安装已完成，可查看安装结果。",
			installBackgroundFailed: "插件安装失败，可查看安装详情。",
			installBackgroundUnconfirmed: "安装状态暂未确认，请查看安装任务了解详情。",
			installBackgroundApplying: "安装已进入收尾阶段，无法取消，可查看安装进度。",
			installStarting: "正在准备安装…",
			installCancelling: "正在停止安装…",
			installApplying: "正在应用配置，请稍候…",
			installCancelledShort: "已取消",
			installCancelled: "已取消安装，插件未启用，下载的文件可能保留",
			installCancelUnconfirmed: "尚未确认安装已停止，请重试取消或等待安装结果。{reason}",
			installEnableNow: "立即启用",
			installDetailsShow: "查看安装详情",
			installDetailsHide: "收起安装详情",
			installVersion: "版本 {version}",
			installSubjectPath: "本地目录",
			installSubjectGit: "Git 仓库",
			installSubjectTarball: "压缩包",
			installLocation: "安装位置：{dir}",
			installRetry: "重试",
			installChangeRegistry: "更换安装源",
			installAttempt: "{previous} 不可用，正在改用 {registry} 重试（第 {index} 个源，共 {total} 个）",
			installAttemptBadge: "第 {index} 次 · {registry}",
			installFailureNetwork: "网络连接失败",
			installFailureNetworkAll: "所有安装源都无法连接（已尝试：{registries}）。请检查网络或代理设置，或更换安装源后重试。",
			installFailureNetworkHost: "无法连接 {host}。GitHub 地址和 .tgz 直链不经过安装源，需要本机能直接访问它或配置代理；如果这个插件也发布到了 npm，请改填包名。",
			installFailureNotFound: "未找到相关插件",
			installFailureNoMatchingVersion: "没有匹配的版本",
			installFailureDiskFull: "磁盘空间不足，安装已停止",
			installFailurePermission: "没有写入权限，无法安装",
			installFailureBuildBlocked: "有依赖的安装脚本需要你允许后才能继续",
			installFailureBuildBlockedManual: "有依赖的安装脚本被 pnpm 拦下，请在 profile 的 pnpm-workspace.yaml 的 allowBuilds 中放行后重试",
			installFailureIntegrity: "下载的安装包校验失败",
			installFailureTimeout: "安装超时",
			installFailurePnpmMissing: "没有找到 pnpm，无法安装",
			installFailureGeneric: "安装过程中出错，原因见安装详情",
			terminalRunning: "运行中",
			terminalFailed: "失败",
			terminalDone: "已完成",
			terminalCopy: "复制",
			terminalCopied: "复制成功",
			terminalNoOutput: "无输出",
			terminalCollapseAria: "收起输出",
			terminalCollapse: "收起",
			terminalExpandAria: "展开其余 {n} 行输出",
			terminalExpand: "… 其余 {n} 行",
			terminalExitCode: "退出码 {code}",
			terminalSignal: "信号 {signal}",
			terminalNoExitCode: "未正常退出",
			installDoneNothing: "安装完成，没有新增依赖。",
			installDoneRestart: "已安装，下次启动后加载。",
			installDoneApproved: "已允许运行安装脚本：{names}",
			installApprovalTitle: "需要允许安装脚本",
			installApprovalDescription: "以下包声明了安装脚本，pnpm 默认不运行。",
			installApprovalConsequence: "允许后，脚本会以你的权限在本机运行，授权保存在当前 profile，之后不再询问。",
			installApprovalCaution: "只在信任这些包时允许。",
			installApproveAndRetry: "允许这些脚本并重试",
			installClose: "完成",
			close: "关闭",
			cancel: "取消",
			confirmUninstallTitle: "卸载「{name}」？",
			confirmUninstallDescription: "卸载后它提供的功能会消失。",
			confirmUninstall: "卸载",
			failedEnable: "启用失败：{reason}",
			failedDisable: "停用失败：{reason}",
			failedUninstall: "卸载失败：{reason}",
			failedRowEnable: "组件启用失败：{reason}",
			failedRowDisable: "组件停用失败：{reason}",
			reasonManagementRequired: "插件管理所需，不能停用或卸载",
			reasonUnaddressable: "当前 profile 的 patch 无法唯一定位这一项",
			reasonUnknownPlugin: "找不到该插件",
			reasonInvalidSpec: "请输入有效的包名或地址",
			reasonAmbiguousInstall: "无法从依赖变更中确定安装了哪一个包",
			reasonNotBundle: "这个包没有声明组合包，不能作为插件管理",
			reasonNotRemovable: "这个包不属于当前 profile，或者是插件管理所需的组件",
			reasonStopProfile: "这个 profile 没有启用 HMR，正在使用的包要停止后用 dsh plugin 卸载",
			reasonBundleInUse: "其他配置仍在使用这个组合包的组件，请先停用它们",
			reasonStaleApproval: "待允许的安装脚本列表已变化，请重新安装以刷新",
			reasonIncompatibleVersion: "{plugin} 与 DSH {runtime} 不兼容（要求 {peers}），运行它可能导致崩溃或数据丢失。",
			reasonIncompatibleVersionUnnamed: "这个插件与当前 DSH 版本不兼容，运行它可能导致崩溃或数据丢失。",
			reasonIncompatibleInstall: "请安装与当前 DSH 兼容的插件版本。",
			reasonIncompatibleInstalled: "请卸载后重新安装与当前 DSH 兼容的版本。",
			reasonOperationError: "Host 报告了一个错误"
		};
		/** English dictionary checked against the Chinese key set. */
		const en = {
			panel: "Plugin Library",
			title: "Plugin Library",
			intro: "Install, enable, and configure plugins",
			headSubtitle: "Browse the plugin market and manage local plugins",
			infoLabel: "About plugins",
			infoDescription: "Configure official plugins and install or manage other plugins here. View the built-in plugin list and runtime status in Settings → Built-in plugins.",
			loading: "Reading plugins…",
			error: "Could not read all plugins, possibly due to a network problem",
			unavailable: "This deployment runs without a manageable profile, so plugins cannot be installed or switched here.",
			retry: "Retry",
			refresh: "Refresh",
			refreshError: "Refresh failed. Please try again.",
			empty: "No plugins are installed yet.",
			addPlugin: "Add plugin",
			restartNotice: "The change takes effect at the next start",
			overriddenNotice: "{name} was saved, but a higher-priority configuration overrides it, so it is not in effect",
			bundlesTitle: "Local",
			officialTitle: "Official",
			libraryTabsLabel: "Plugin library view",
			tabMarket: "Plugin market",
			tabInstalled: "Local plugins",
			marketUnavailable: "The plugin market is not ready yet. Make sure dsh-market is installed and loaded under Settings → Plugin market, then return here.",
			groupExpand: "Expand {name}",
			groupCollapse: "Collapse {name}",
			tuneOpen: "Tune UI",
			tuneTitle: "Plugin library tuning",
			tuneIntro: "Every change applies live and is kept in this browser; it survives a refresh and a restart.",
			tuneExpandAll: "Expand all",
			tuneCollapseAll: "Collapse all",
			tuneGroupPage: "Page container",
			tuneGroupTabs: "Tab strip",
			tuneGroupBand: "Search band",
			tuneGroupSearch: "Search box",
			tuneGroupChips: "Category row",
			tuneGroupNote: "Hint row",
			tuneGroupResults: "Results",
			tuneGroupCard: "Plugin cards",
			tuneGroupList: "Installed list",
			tuneGroupDock: "Tuning dock",
			tunePageGap: "Page section gap",
			tunePageMax: "Content max width",
			tunePagePadX: "Page side padding",
			tunePagePadBottom: "Page bottom padding",
			tuneTabsTop: "Tab strip top margin",
			tuneTabsOverlap: "Tabs overlap content",
			tuneTabsGap: "Tabs to button gap",
			tuneHeadRadius: "Band radius",
			tuneHeadPadBottom: "Band bottom padding",
			tuneHeadGap: "Band to results",
			tuneSearchHeight: "Search box height",
			tuneSearchPadX: "Search box side padding",
			tuneSearchRadius: "Search box radius",
			tuneSearchRowBottom: "Gap under the search box",
			tuneChipsGap: "Category gap",
			tuneChipsPadTop: "Category row top gap",
			tuneChipPadX: "Category padding",
			tuneChipHeight: "Category height",
			tuneChipFont: "Category font size",
			tuneNoteGap: "Hint row gap",
			tuneNoteSize: "Hint row font size",
			tuneResultsPadTop: "Results top padding",
			tuneResultsGap: "Results block gap",
			tuneCardRadius: "Card radius",
			tuneCardPadY: "Card vertical padding",
			tuneCardPadX: "Card horizontal padding",
			tuneCardGap: "Card inner gap",
			tuneGroupGap: "Group heading gap",
			tuneListGap: "List row gap",
			tuneGroupTitleSize: "Group heading size",
			tunePageTitleSize: "Page title size",
			tuneDockWidth: "Dock width",
			tuneDockPad: "Dock padding",
			tuneReset: "Reset to defaults",
			tuneExport: "Export JSON",
			tuneCopied: "Tuning JSON copied to the clipboard",
			tuneCopyFailed: "Copy failed — note the values manually",
			tuneNote: "Send the exported values to the Agent to bake them in as defaults.",
			statusProblem: "Problem",
			statusBeta: "Experimental",
			reasonLabel: "Reason",
			metadataError: "Package metadata error: {error}",
			versionTag: "v{version}",
			partsLabel: "Components",
			partsEmpty: "This plugin pack contains no components.",
			partsCountTotal: "{count} total",
			partsCountRunning: "{count} running",
			partsCountOff: "{count} off",
			partOff: "Off",
			partsCountFailed: "{count} failed",
			partsFilter: "Filter components",
			partsFilterEmpty: "No component matches.",
			partToggle: "Enable component {name}",
			rowPhasePending: "Waiting for dependencies",
			rowPhaseLoading: "Loading",
			rowPhaseActive: "Running",
			rowPhaseFailed: "Problem",
			rowPhaseUnloading: "Unloading",
			enableToggle: "Enable {name}",
			openDetail: "View {name}",
			backToList: "Back to plugins",
			crumbRoot: "Plugins",
			backToPackage: "Back to {name}",
			configureRow: "Configure {name}",
			rowStateIdle: "Not running",
			uninstall: "Uninstall",
			uninstallLabel: "Uninstall {name}",
			installTitle: "Add plugin",
			installDescription: "Enter the plugin's package name, GitHub repository address, or local directory path.",
			installSpecLabel: "Package name or address",
			installSpecPlaceholder: "for example dsh-plugin-whale-pet",
			installGuideToggle: "Install guide and examples",
			installGuideHide: "Hide the guide",
			installGuideIdTitle: "Enter the plugin's npm package name",
			installGuideIdExample: "dsh-plugin-whale-pet",
			installGuideIdHint: "The plugin package name is the npm package name (like dsh-xxx or @author/plugin): the part after dsh plugin add or pnpm add in a community plugin's README install command.",
			installGuideExampleLabel: "Example: ",
			installGitTemplateHint: "Replace this with the actual Git repository address.",
			installPathTemplateHint: "Replace this with the actual path to your local plugin directory.",
			installGuideFill: "Use example",
			installGuideFillAria: "Use the example {example}",
			installGuideSafety: "Install only plugins you trust: they run with your permissions and can damage DeepSeek Harness or leak your data.",
			installUpgradeNotice: "Installed plugins do not update automatically yet. To upgrade a plugin, uninstall it and install the new version. Later releases will keep improving the upgrade experience.",
			registryToggle: "Registry",
			registryLegend: "The npm registry the plugin is downloaded from",
			registryDefault: "Default registry",
			registryOfficial: "Official npm registry",
			registryNpmmirror: "Mainland China mirror",
			registryCustom: "Custom address",
			registryCustomPlaceholder: "https://npm.example.com/",
			registryCustomHint: "Enter an internal or private npm registry address starting with http:// or https://. If it requires a login, store the credentials in ~/.npmrc on this machine.",
			registryCustomInvalid: "Enter an address starting with http:// or https://",
			registryListSeparator: ", ",
			sentenceSeparator: " ",
			installRun: "Install",
			installChecking: "Checking…",
			installProblemInvalid: "This is not a package name or address that can be installed: {reason}",
			installProblemInstalled: "This plugin is already installed. To upgrade it, uninstall it and install it again",
			installProblemShipped: "This plugin ships with DSH; upgrading DSH updates it",
			installProblemNotFound: "No such plugin was found",
			installProblemNotPackage: "The path does not exist or is not a valid plugin package",
			installProblemNotBundle: "This package declares no bundle, so it cannot be installed as a plugin: {reason}",
			installProblemNetwork: "The plugin registry could not be reached; check the network and try again",
			installProblemNetworkAll: "No registry could be reached (tried: {registries}); check the network or proxy settings, or change the registry",
			installProblemUnknown: "The plugin could not be looked up: {reason}",
			installingTitle: "Installing the plugin…",
			installedTitle: "Installed",
			installFailedTitle: "The plugin could not be installed",
			installGithubFailedTitle: "Cannot access GitHub",
			installGithubTimeoutTitle: "GitHub connection timed out",
			installGithubFailedDescription: "Try another installation source.",
			installUseGithubMirror: "Use mainland China mirror",
			installTryAnotherWay: "Try another way",
			installPackageLabel: "Plugin package name",
			installEdit: "Edit",
			installEditAria: "Back to editing",
			installCancelAndEdit: "Cancel installation and return to editing",
			installApplyingCancellationError: "Cancellation was not confirmed. Installation is being applied; wait for its result. {reason}",
			installReconcile: "Check installation status",
			installUnknownTitle: "Installation result unavailable",
			installUnknownDescription: "The Host has no active installation with this request id. Check the plugin list before trying again.",
			installResultUnconfirmed: "The installation result was not received. Check installation status. {reason}",
			installAwaitingAcceptance: "Waiting for the Host to accept installation. Cancellation will retry automatically after confirmation.",
			installBackgroundUnknown: "Installation result unavailable. Check the plugin list.",
			installCancel: "Cancel install",
			installCloseCancels: "Cancel install and close",
			installViewTask: "View installation",
			installUnconfirmedTitle: "Installation status unconfirmed",
			installBackgroundDone: "Installation finished. View installation details.",
			installBackgroundFailed: "Installation failed. View installation details.",
			installBackgroundUnconfirmed: "Installation status is unconfirmed. View the installation for details.",
			installBackgroundApplying: "Installation is being applied and cannot be cancelled. View installation progress.",
			installStarting: "Preparing installation…",
			installCancelling: "Stopping installation…",
			installApplying: "Applying configuration, please wait…",
			installCancelledShort: "Cancelled",
			installCancelled: "Installation cancelled; the plugin is not enabled, and downloaded files may remain",
			installCancelUnconfirmed: "Installation has not been confirmed stopped. Retry cancellation or wait for the installation result. {reason}",
			installEnableNow: "Enable now",
			installDetailsShow: "Show install details",
			installDetailsHide: "Hide install details",
			installVersion: "Version {version}",
			installSubjectPath: "Local directory",
			installSubjectGit: "Git repository",
			installSubjectTarball: "Tarball",
			installLocation: "Installs into {dir}",
			installRetry: "Retry",
			installChangeRegistry: "Change registry",
			installAttempt: "{previous} could not serve the package; retrying through {registry} (registry {index} of {total})",
			installAttemptBadge: "Attempt {index} · {registry}",
			installFailureNetwork: "The network connection failed",
			installFailureNetworkAll: "No registry could be reached (tried: {registries}). Check the network or proxy settings, or change the registry and retry.",
			installFailureNetworkHost: "{host} could not be reached. A GitHub address or a .tgz link is not fetched through the registry: this machine must reach it directly or through a proxy. If the plugin is also published to npm, enter its package name instead.",
			installFailureNotFound: "No such plugin was found",
			installFailureNoMatchingVersion: "No version matches the request",
			installFailureDiskFull: "The disk is full; the install stopped",
			installFailurePermission: "No write permission; the plugin cannot be installed",
			installFailureBuildBlocked: "A dependency's install scripts need your permission before the install can continue",
			installFailureBuildBlockedManual: "pnpm blocked install scripts; allow them under allowBuilds in pnpm-workspace.yaml and retry",
			installFailureIntegrity: "The downloaded package failed its integrity check",
			installFailureTimeout: "The install timed out",
			installFailurePnpmMissing: "pnpm was not found, so nothing can be installed",
			installFailureGeneric: "Something went wrong during the install; the details say what",
			terminalRunning: "Running",
			terminalFailed: "Failed",
			terminalDone: "Done",
			terminalCopy: "Copy",
			terminalCopied: "Copied",
			terminalNoOutput: "No output",
			terminalCollapseAria: "Collapse output",
			terminalCollapse: "Collapse",
			terminalExpandAria: "Expand the remaining {n} output lines",
			terminalExpand: "… {n} more lines",
			terminalExitCode: "exit code {code}",
			terminalSignal: "signal {signal}",
			terminalNoExitCode: "no exit code",
			installDoneNothing: "Install finished with no new dependency.",
			installDoneRestart: "Installed; it loads at the next start.",
			installDoneApproved: "Install scripts allowed for {names}",
			installApprovalTitle: "Install scripts need permission",
			installApprovalDescription: "These packages have install scripts that pnpm did not run.",
			installApprovalConsequence: "Once allowed, the scripts run here with your permissions, and the permission is saved in this profile.",
			installApprovalCaution: "Allow only packages you trust.",
			installApproveAndRetry: "Allow these scripts and retry",
			installClose: "Done",
			close: "Close",
			cancel: "Cancel",
			confirmUninstallTitle: "Uninstall \"{name}\"?",
			confirmUninstallDescription: "What it provides goes away once it is uninstalled.",
			confirmUninstall: "Uninstall",
			failedEnable: "Could not enable: {reason}",
			failedDisable: "Could not disable: {reason}",
			failedUninstall: "Could not uninstall: {reason}",
			failedRowEnable: "Could not enable the component: {reason}",
			failedRowDisable: "Could not disable the component: {reason}",
			reasonManagementRequired: "Plugin management needs it; it cannot be switched off or uninstalled.",
			reasonUnaddressable: "The profile patch cannot address this one uniquely.",
			reasonUnknownPlugin: "No such plugin.",
			reasonInvalidSpec: "Enter a valid package name or address.",
			reasonAmbiguousInstall: "Which package was installed cannot be told from the dependency change.",
			reasonNotBundle: "This package declares no bundle, so it cannot be managed as a plugin.",
			reasonNotRemovable: "This package is not owned by the profile, or plugin management needs it.",
			reasonStopProfile: "This profile runs without HMR; stop it and uninstall the package with dsh plugin.",
			reasonBundleInUse: "Other configuration still uses this bundle's components; switch them off first.",
			reasonStaleApproval: "The pending script approvals changed; install again to refresh them.",
			reasonIncompatibleVersion: "{plugin} is incompatible with DSH {runtime} (requires {peers}); running it may cause crashes or data loss.",
			reasonIncompatibleVersionUnnamed: "This plugin is incompatible with the running DSH version; running it may cause crashes or data loss.",
			reasonIncompatibleInstall: "Install a plugin version compatible with this DSH.",
			reasonIncompatibleInstalled: "Uninstall it and install a version compatible with this DSH.",
			reasonOperationError: "The Host reported an error."
		};
		//#endregion
		//#region lib/types/client/sanitize-install-input.js
		/** Privacy-safe installation input classification shared by click and result events. */
		/**
		* Keep registry package names and plain versions; classify other installer inputs without their contents.
		* @param spec - user-entered installation spec.
		* @returns an identifier safe to send without URL credentials, tokens, or local paths.
		*/
		function sanitizeInstallInput(spec) {
			if (/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*(?:@[a-z0-9.*^~+<>=| -]+)?$/iu.test(spec)) return spec;
			if (/^(?:git[+:]|git@|github:|gitlab:|bitbucket:)/iu.test(spec)) return "[git]";
			if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(spec)) return "[url]";
			return "[path-or-other]";
		}
		//#endregion
		//#region ../../util/crypto/lib/index.js
		/**
		* Random v4 UUID, minted from `crypto.getRandomValues`.
		* @returns the UUID string.
		*/
		function randomUUID() {
			const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
			const hex = Array.from(bytes, (byte, index) => {
				return (index === 6 ? byte & 15 | 64 : index === 8 ? byte & 63 | 128 : byte).toString(16).padStart(2, "0");
			}).join("");
			return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
		}
		/** Public npmmirror URL shared by the fallback configuration and public-registry comparison. */
		const NPMMIRROR_REGISTRY = "https://registry.npmmirror.com/";
		/** An http(s) URL, as pnpm's `--registry` takes it. */
		const REGISTRY_URL = /^https?:\/\/\S+$/;
		/**
		* Parse a registry URL into the form pnpm compares registries in: lower-case host, trailing slash.
		* @param url - the registry as configured or requested.
		* @returns the normalized URL.
		* @throws {Error} for anything but an http(s) URL.
		*/
		function normalizeRegistry(url) {
			let parsed;
			try {
				parsed = new URL(url);
			} catch {}
			if (parsed === void 0 || parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`a registry must be an http(s) URL: ${url}`);
			if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
			return parsed.href;
		}
		//#endregion
		//#region lib/types/client/presentation.js
		/** Display labels and toast sentences for global plugin management. */
		/** The registries with a name of their own, by host. */
		const REGISTRY_COPY = new Map([["registry.npmmirror.com", "registryNpmmirror"]]);
		/** npm's own registry, which reads by name rather than by host. */
		const OFFICIAL_NPM_HOST = "registry.npmjs.org";
		/**
		* What a registry reads as: npm's own by its name, a known mirror by its name, any other registry by its host;
		* and the host each names, for where the name alone would leave it unsaid. The registry pnpm's own configuration
		* names reads by the registry it names, so the label never claims npm's own for another one.
		* @param registry - the registry, null for the one pnpm's own configuration names.
		* @param t - the manager's translate seat.
		* @param resolved - the URL pnpm's own configuration names, null while the Host could not read it.
		* @returns the name and the host.
		*/
		function registryText(registry, t, resolved) {
			const url = registry ?? resolved;
			if (url === null) return {
				name: t("registryDefault"),
				host: OFFICIAL_NPM_HOST
			};
			const host = registryHost(url);
			const key = host === OFFICIAL_NPM_HOST ? "registryOfficial" : REGISTRY_COPY.get(host);
			return {
				name: key === void 0 ? host : t(key),
				host
			};
		}
		/** The host of a registry URL; the URL as written when it does not parse. */
		function registryHost(registry) {
			try {
				return new URL(registry).host;
			} catch {
				return registry;
			}
		}
		/** The sentence each of the Host's refusal codes reads as. */
		const CODE_KEYS = {
			"management-required": "reasonManagementRequired",
			"unaddressable": "reasonUnaddressable",
			"unknown-plugin": "reasonUnknownPlugin",
			"invalid-spec": "reasonInvalidSpec",
			"ambiguous-install": "reasonAmbiguousInstall",
			"not-bundle": "reasonNotBundle",
			"not-removable": "reasonNotRemovable",
			"stop-profile": "reasonStopProfile",
			"bundle-in-use": "reasonBundleInUse",
			"stale-approval": "reasonStaleApproval",
			"incompatible-version": "reasonIncompatibleVersionUnnamed",
			"operation-error": "reasonOperationError"
		};
		/** The sentence a failed action opens with, by what was being done. */
		const FAILED_KEYS = {
			enable: "failedEnable",
			disable: "failedDisable",
			uninstall: "failedUninstall",
			rowEnable: "failedRowEnable",
			rowDisable: "failedRowDisable"
		};
		/**
		* What a management error reads as: the code's sentence; for an incompatibility, one sentence per
		* package it names, then the remedy for an install or for an installed plugin; or, for an operation error, the Host's diagnostic as it is.
		* @param error - the Host's code, its diagnostic, and the packages an incompatibility names.
		* @param t - the manager's translate seat.
		* @returns the sentence.
		*/
		function managementText(error, t) {
			if (error.code === "incompatible-version") {
				const named = error.incompatible ?? [];
				return [...named.length === 0 ? [t("reasonIncompatibleVersionUnnamed")] : named.map((plugin) => t("reasonIncompatibleVersion", {
					plugin: `${plugin.name}@${plugin.version}`,
					runtime: plugin.runtimeVersion,
					peers: Object.entries(plugin.peers).map(([name, range]) => `${name} ${range}`).join(", ")
				})), t(error.installing ? "reasonIncompatibleInstall" : "reasonIncompatibleInstalled")].join(t("sentenceSeparator"));
			}
			if (error.code !== "operation-error") return t(CODE_KEYS[error.code]);
			return error.diagnostic === void 0 || error.diagnostic === "" ? t("reasonOperationError") : error.diagnostic;
		}
		/**
		* Compact a package name to what a person calls it.
		* @param name - the package name.
		* @returns the unscoped name without the harness prefixes.
		*/
		function shortName(name) {
			return (name.startsWith("@") ? name.slice(name.indexOf("/") + 1) : name).replace(/^dsh-(?:host-|client-)?/, "");
		}
		/**
		* Resolve installed package metadata without changing its technical identity.
		* @param pkg - package identity and local metadata.
		* @param resolveText - current-locale package text resolver.
		* @returns localized copy with a technical-name fallback and the independent beta status.
		*/
		function packageText(pkg, resolveText) {
			return {
				title: pkg.meta?.title === void 0 ? pkg.name : resolveText(pkg.meta.title),
				description: pkg.meta?.description === void 0 ? void 0 : resolveText(pkg.meta.description) || void 0,
				beta: pkg.name.startsWith("@deepseek-ai/dsh-experimental-")
			};
		}
		/**
		* Resolve a bundle row's plugin metadata, using its full module specifier as the final title fallback.
		* @param row - row identity and local metadata.
		* @param resolveText - current-locale package text resolver.
		* @returns the row's display title and optional description.
		*/
		function rowText(row, resolveText) {
			return {
				title: row.meta?.title === void 0 ? row.moduleName : resolveText(row.meta.title),
				description: row.meta?.description === void 0 ? void 0 : resolveText(row.meta.description) || void 0
			};
		}
		/**
		* The sentence one notice shows.
		* @param notice - the last action's outcome.
		* @param t - the manager's translate seat.
		* @returns the sentence.
		*/
		function noticeText(notice, t) {
			switch (notice.kind) {
				case "restart": return t("restartNotice");
				case "overridden": return t("overriddenNotice", { name: notice.packageName });
				case "cancelled": return t("installCancelled");
				case "refresh-failed": return t("refreshError");
				case "install": return t({
					done: "installBackgroundDone",
					failed: "installBackgroundFailed",
					unconfirmed: "installBackgroundUnconfirmed",
					applying: "installBackgroundApplying",
					unknown: "installBackgroundUnknown"
				}[notice.outcome]);
				case "failed": {
					const reason = notice.code === void 0 ? notice.reason : managementText({
						code: notice.code,
						diagnostic: notice.reason,
						...notice.incompatible === void 0 ? {} : { incompatible: notice.incompatible }
					}, t);
					return t(FAILED_KEYS[notice.action], { reason: reason === "" ? t("reasonOperationError") : reason });
				}
			}
		}
		//#endregion
		//#region lib/types/client/manager-store.js
		/** The choice shown until the Host has said which registry it asks first: the one pnpm's own configuration names. */
		const OFFICIAL_REGISTRY = {
			kind: "offered",
			registry: null
		};
		/** Hold the manual-refresh spinner at least this long so a fast read does not flash it. */
		const REFRESH_SPINNER_MIN_MS = 400;
		/**
		* The registry a choice asks, as the Host's install plan compares registries: pnpm's own configuration stands for
		* the URL it names, once the Host has read it.
		* @param registry - the registry, null for the one pnpm's own configuration names.
		* @param resolved - the URL pnpm's own configuration names, null while the Host could not read it.
		* @returns the comparison key; a registry that does not parse compares as written.
		*/
		function registryKey(registry, resolved) {
			const url = registry ?? resolved;
			if (url === null) return "";
			try {
				return normalizeRegistry(url);
			} catch {
				return url;
			}
		}
		/**
		* The registries the dialog offers: the Host's first, its fallbacks, and pnpm's own, each once. pnpm's own
		* configuration stands for the registry it names, so it never repeats a registry the Host already offers.
		* @param registries - what the Host configured, or null while unread.
		* @returns the registries in the order the dialog lists them.
		*/
		function offeredRegistries(registries) {
			const offered = [];
			const keys = [];
			for (const registry of [...registries === null ? [] : [registries.registry, ...registries.fallbackRegistries], null]) {
				const key = registryKey(registry, registries?.resolved ?? null);
				if (keys.includes(key)) continue;
				offered.push(registry);
				keys.push(key);
			}
			return offered;
		}
		/**
		* Whether an installation is still owned by the Host.
		* @param phase - the dialog's current installation phase.
		* @returns true while a Host result or a check for an active request is outstanding.
		*/
		function isInstallPending(phase) {
			return phase === "starting" || phase === "running" || phase === "cancelling" || phase === "applying" || phase === "unconfirmed";
		}
		/**
		* Offer the configured mainland mirror after a confirmed GitHub connection failure.
		* @param install - the installation and the Host's failure attribution.
		* @returns the offered entry that asks npmmirror, null when that entry is pnpm's own configuration, or undefined when
		* this recovery does not apply; test for undefined, because null is a valid entry.
		*/
		function githubRecoveryRegistry(install) {
			if (install.phase !== "failed" || install.failure?.failedAt !== "spec-host" || install.failure.kind !== "network" && install.failure.kind !== "timeout") return void 0;
			const host = install.subject?.host?.toLowerCase().split(":")[0];
			if (host !== "github.com" && !host?.endsWith(".github.com")) return void 0;
			const resolved = install.registries?.resolved ?? null;
			return offeredRegistries(install.registries).find((registry) => registryKey(registry, resolved) === NPMMIRROR_REGISTRY);
		}
		/**
		* Whether the install already asks npmmirror first, so switching to the offered mirror would not change the registry.
		* @param install - the installation and its registry choice.
		* @returns true when the chosen registry, offered or typed, compares as npmmirror.
		*/
		function asksMirror(install) {
			const choice = install.registry;
			return registryKey(choice.kind === "custom" ? choice.url.trim() : choice.registry, install.registries?.resolved ?? null) === NPMMIRROR_REGISTRY;
		}
		/** A refused answer or a change the Host could not apply, carrying what it said and, for a refusal, its code. */
		var RemoteAnswerError = class extends Error {
			reason;
			code;
			incompatible;
			constructor(reason, code, incompatible) {
				super(reason);
				this.reason = reason;
				this.code = code;
				this.incompatible = incompatible;
				this.name = "RemoteAnswerError";
			}
		};
		/** The dialog's reading of a failed change: the Host's code and diagnostic, and the run's classified failure. */
		function failureOf(error, kind, pendingBuilds, failedAt) {
			return {
				reason: error?.diagnostic ?? "",
				...error === void 0 ? {} : { code: error.code },
				...error?.incompatible === void 0 ? {} : { incompatible: error.incompatible },
				...kind === void 0 ? {} : { kind },
				...failedAt === void 0 ? {} : { failedAt },
				...pendingBuilds === void 0 || pendingBuilds.length === 0 ? {} : { pendingBuilds }
			};
		}
		/** The notice a thrown failure becomes: a refusal keeps its code, anything else its words. */
		function failedNotice(error, subject, seq) {
			const code = error instanceof RemoteAnswerError ? error.code : void 0;
			const incompatible = error instanceof RemoteAnswerError ? error.incompatible : void 0;
			return {
				kind: "failed",
				reason: reasonOf(error),
				...code === void 0 ? {} : { code },
				...incompatible === void 0 ? {} : { incompatible },
				...subject,
				seq
			};
		}
		/** The runs with every one still open settled at `exitCode`. */
		function settledRuns(runs, exitCode) {
			return runs.map((run) => run.exitCode === void 0 ? {
				...run,
				exitCode
			} : run);
		}
		/**
		* The key one row occupies in the busy list.
		* @param entryId - the row's Loader entry id.
		* @returns the busy key.
		*/
		function rowKey(entryId) {
			return `row:${entryId}`;
		}
		/**
		* One bundle as the page shows it: its rows joined with the Host's entries.
		* @param bundle - the Host's bundle.
		* @param plugins - the Host's plugin entries.
		* @returns the package view.
		*/
		function packageView(bundle, plugins) {
			const rows = bundle.rows.map((row) => {
				const live = row.entryId === void 0 ? void 0 : plugins.find((plugin) => plugin.entryId === row.entryId);
				return {
					rowId: row.rowId,
					moduleName: row.moduleName,
					enabled: live?.enabled ?? false,
					phase: live?.fiberPhase ?? null,
					...row.meta === void 0 ? {} : { meta: row.meta },
					...row.entryId === void 0 ? {} : { entryId: row.entryId },
					...live?.readOnlyReason === void 0 ? {} : { readOnlyReason: live.readOnlyReason }
				};
			});
			return {
				name: bundle.name,
				installed: bundle.installed,
				optional: bundle.optional,
				enabled: bundle.enabled,
				rows,
				...bundle.version === void 0 ? {} : { version: bundle.version },
				...bundle.description === void 0 ? {} : { description: bundle.description },
				...bundle.meta === void 0 ? {} : { meta: bundle.meta },
				...bundle.readOnlyReason === void 0 ? {} : { readOnlyReason: bundle.readOnlyReason },
				...bundle.error === void 0 ? {} : { error: bundle.error }
			};
		}
		/**
		* The order the list shows packages in: by the short name a person reads, so a
		* card stays put when its bundle is switched, whatever order the Host answers in.
		* @param packages - the Host's bundles as views.
		* @returns the views sorted by short name.
		*/
		function sortPackages(packages) {
			return [...packages].sort((a, b) => shortName(a.name).localeCompare(shortName(b.name)));
		}
		const IDLE_INSTALL = {
			open: false,
			spec: "",
			registries: null,
			registry: OFFICIAL_REGISTRY,
			registryOpen: false,
			registryError: false,
			attempts: null,
			phase: "idle",
			inputError: null,
			subject: null,
			runs: [],
			detailsOpen: false,
			installed: null,
			restartRequired: false,
			failure: null,
			approvedBuilds: [],
			enabling: false
		};
		/** The dialog back at its spec: the run and its outcome forgotten, the spec and the registries kept. */
		function specAgain(install) {
			const { open, spec, registries, registry, mirrorRecovery } = install;
			return {
				...IDLE_INSTALL,
				open,
				spec,
				registries,
				registry,
				...mirrorRecovery === void 0 ? {} : { mirrorRecovery }
			};
		}
		/**
		* The choice as the dialog can show it once the Host has answered: nothing remembered starts from the registry the
		* Host asks first; a remembered registry the Host now asks under another entry takes that entry, and one it no
		* longer offers is kept as a typed one.
		*/
		function reconciled(remembered, registries) {
			if (remembered === null) return {
				kind: "offered",
				registry: registries.registry
			};
			if (remembered.kind === "custom" || remembered.registry === null) return remembered;
			const key = registryKey(remembered.registry, registries.resolved);
			const offered = offeredRegistries(registries).find((registry) => registryKey(registry, registries.resolved) === key);
			return offered === void 0 ? {
				kind: "custom",
				url: remembered.registry
			} : {
				kind: "offered",
				registry: offered
			};
		}
		/** Only the shipped public mirror can replace an unconfigured official npm default. */
		function eligibleMirror(registries) {
			if (registries.registry !== null || registries.resolved === null) return void 0;
			let resolved;
			try {
				resolved = normalizeRegistry(registries.resolved);
			} catch (_error) {
				return;
			}
			if (resolved !== "https://registry.npmjs.org/") return void 0;
			return registries.fallbackRegistries.find((registry) => registry === NPMMIRROR_REGISTRY);
		}
		/** Reads and mutates the profile's plugins through the `pluginManager` Remote. */
		var PluginManagerController = class {
			ctx;
			store;
			inFlight;
			rerun = false;
			generation = 0;
			disposed = false;
			/** A successful managed-profile read remains usable even when it returned no bundles. */
			hasCachedInventory = false;
			pendingConfirm;
			/** Cancels the check the dialog has in flight. */
			inspectAbort;
			request;
			noticeSeq = 0;
			analyticsAttempt;
			registryRead;
			/** The registry last used from this browser, kept across dialogs and page loads; null until one was used. */
			registryMemory = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null, { persist: { name: "dsh.plugin-manager.install-registry" } });
			/**
			* @param ctx - the tab plugin's context, whose `remote.pluginManager` and `remote.pluginInventory` namespaces answer.
			*/
			constructor(ctx) {
				this.ctx = ctx;
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
					status: "idle",
					refreshStatus: "idle",
					packages: [],
					busy: [],
					notice: null,
					install: IDLE_INSTALL,
					confirm: null,
					highlight: null
				});
			}
			/**
			* Read the tab's state.
			* @returns the current sync snapshot (stable reference until the next change).
			*/
			getSnapshot() {
				return this.store.getSnapshot();
			}
			/** Stop publishing and drop every late settlement. */
			dispose() {
				this.disposed = true;
				this.registryRead = void 0;
				this.request = void 0;
				this.generation += 1;
			}
			/**
			* Build the face the tab's slot registration injects.
			* @param configLedger - the projection of the plugins carrying configuration, bound beside the tab's own state.
			* @param resolveText - render-time package text resolution supplied by the locale service.
			* @returns the tab's snapshot sources and its actions.
			*/
			inject(configLedger, resolveText) {
				return {
					resolveText,
					hooks: {
						pluginManager: this.store,
						configLedger,
						configurations: this.ctx.configForms.describe()
					},
					configForm: (id) => this.ctx.configForms.get(id),
					ensure: () => {
						if (this.getSnapshot().status === "idle") this.load();
					},
					refresh: () => {
						this.refresh();
					},
					openInstall: () => {
						this.ctx.get("productAnalytics")?.track("plugin_add_button_click", {});
						if (this.getSnapshot().install.requestId === void 0) {
							this.patch({ install: {
								...IDLE_INSTALL,
								open: true,
								registry: this.registryMemory.getSnapshot() ?? OFFICIAL_REGISTRY
							} });
							const read = { choice: this.getSnapshot().install.registry };
							this.registryRead = read;
							read.done = this.readRegistries(read).finally(() => {
								delete read.done;
							});
						} else this.patchInstall({ open: true });
						this.reconcileInstall();
					},
					closeInstall: () => {
						if (isInstallPending(this.getSnapshot().install.phase)) {
							this.patchInstall({ open: false });
							this.cancelInstall();
							return;
						}
						if (this.getSnapshot().install.phase === "checking") this.finishAnalytics("cancelled");
						this.abortInspect();
						this.registryRead = void 0;
						this.patch({ install: IDLE_INSTALL });
					},
					editInstallSpec: (text) => {
						const install = this.getSnapshot().install;
						if (install.phase === "checking" || isInstallPending(install.phase)) return;
						this.patchInstall(install.phase === "idle" ? {
							spec: text,
							inputError: null
						} : {
							...specAgain(install),
							spec: text
						});
					},
					runInstall: () => {
						this.runInstall();
					},
					toggleRegistryOptions: () => {
						this.patchInstall({ registryOpen: !this.getSnapshot().install.registryOpen });
					},
					chooseRegistry: (choice) => {
						if (this.getSnapshot().install.phase === "idle") this.patchInstall({
							registry: choice,
							registryError: false
						});
					},
					changeRegistry: () => {
						const install = this.getSnapshot().install;
						if (install.phase === "failed") this.patch({ install: {
							...specAgain(install),
							registryOpen: true
						} });
					},
					useGithubMirror: () => {
						const install = this.getSnapshot().install;
						const mirror = githubRecoveryRegistry(install);
						if (mirror === void 0) return;
						const recovered = {
							...specAgain(install),
							spec: "",
							mirrorRecovery: true
						};
						if (asksMirror(install)) {
							this.patch({ install: recovered });
							return;
						}
						const registry = {
							kind: "offered",
							registry: mirror
						};
						this.registryMemory.set(registry);
						this.patch({ install: {
							...recovered,
							registry
						} });
					},
					approveBuildsAndRetry: () => {
						this.approveBuildsAndRetry();
					},
					cancelInstall: () => {
						this.cancelInstall();
					},
					reconcileInstall: () => {
						this.reconcileInstall();
					},
					toggleInstallDetails: () => {
						this.patchInstall({ detailsOpen: !this.getSnapshot().install.detailsOpen });
					},
					enableInstalled: () => {
						this.enableInstalled();
					},
					clearHighlight: () => {
						if (this.getSnapshot().highlight !== null) this.patch({ highlight: null });
					},
					setEnabled: (packageName, enabled) => {
						this.run(packageName, {
							packageName,
							action: enabled ? "enable" : "disable"
						}, async () => {
							const result = await this.ctx.remote.pluginManager.setBundleEnabled(packageName, enabled);
							this.applied(result, packageName);
							if (result.ok && (result.value.application === "applied" || result.value.application === "restart-required")) this.trackToggle(packageName, enabled);
						});
					},
					uninstall: (packageName) => {
						this.pendingConfirm = () => this.run(packageName, {
							packageName,
							action: "uninstall"
						}, async () => {
							this.ctx.get("productAnalytics")?.track("confirm_uninstall_plugin", { plugin_name: packageName });
							this.applied(await this.ctx.remote.pluginManager.removeBundle(packageName), packageName);
						});
						this.patch({ confirm: {
							action: "uninstall",
							packageName
						} });
					},
					confirm: () => {
						this.confirm();
					},
					cancelConfirm: () => {
						this.pendingConfirm = void 0;
						this.patch({ confirm: null });
					},
					setRowEnabled: (entryId, enabled) => {
						this.run(rowKey(entryId), {
							packageName: entryId,
							action: enabled ? "rowEnable" : "rowDisable"
						}, async () => {
							const result = await this.ctx.remote.pluginManager.setPluginEnabled(entryId, enabled);
							this.applied(result, entryId);
							if (result.ok && (result.value.application === "applied" || result.value.application === "restart-required")) this.trackToggle(entryId, enabled, true);
						});
					},
					dismissNotice: () => {
						this.patch({ notice: null });
					}
				};
			}
			/**
			* Follow the Host's cancellation window for this dialog's installation.
			* @param progress - a request id and phase received from the Host.
			*/
			installProgress(progress) {
				const install = this.getSnapshot().install;
				if (install.requestId !== progress.requestId || !isInstallPending(install.phase)) return;
				const request = this.request;
				if (request === void 0) return;
				request.acknowledged = true;
				if (install.phase === "applying") return;
				if (progress.phase === "installing" && request.cancellation !== void 0) {
					if (request.cancellation.waitingForStart) this.sendCancellation(request, request.cancellation);
					return;
				}
				const attempt = progress.attempt;
				this.patchInstall({
					phase: progress.phase === "installing" ? "running" : progress.phase,
					...attempt === void 0 ? {} : { attempts: {
						registries: [...install.attempts?.registries ?? [], attempt.registry],
						total: attempt.total
					} }
				});
			}
			currentRegistryRead(read) {
				return !this.disposed && this.registryRead === read;
			}
			/** Read the registries the Host offers, for the dialog just opened; a refused read leaves pnpm's own and a typed one. */
			async readRegistries(read) {
				const answer = await this.ctx.remote.pluginManager.registries();
				const install = this.getSnapshot().install;
				if (!this.currentRegistryRead(read) || !install.open || !answer.ok) return;
				const remembered = this.registryMemory.getSnapshot();
				const untouched = install.registry === read.choice && (install.phase === "idle" || install.phase === "checking");
				if (untouched) read.choice = reconciled(remembered, answer.value);
				this.patchInstall({
					registries: answer.value,
					...untouched ? { registry: read.choice } : {}
				});
				const mirror = eligibleMirror(answer.value);
				if (!untouched || remembered !== null || mirror === void 0) return;
				const fastest = await this.ctx.remote.pluginRegistryProbe.fastest();
				const current = this.getSnapshot().install;
				if (!this.currentRegistryRead(read) || !current.open || current.phase !== "idle" && current.phase !== "checking" || current.registry !== read.choice || !fastest.ok || fastest.value !== mirror) return;
				read.choice = {
					kind: "offered",
					registry: mirror
				};
				this.patchInstall({ registry: read.choice });
			}
			/**
			* Fold a chunk belonging to this installation into its pnpm command.
			* A final chunk may arrive after the install answer and still updates an existing run.
			* @param chunk - the chunk the Host forwarded.
			*/
			appendLog(chunk) {
				const install = this.getSnapshot().install;
				if (chunk.requestId !== install.requestId) return;
				if (install.requestId !== void 0 && (install.phase === "starting" || install.phase === "cancelling" || install.phase === "unconfirmed")) this.installProgress({
					requestId: install.requestId,
					phase: "installing"
				});
				const index = install.runs.findIndex((run) => run.jobId === chunk.jobId);
				if (index === -1 && !isInstallPending(install.phase)) return;
				const settled = chunk.exitCode === void 0 ? {} : { exitCode: chunk.exitCode };
				const runs = index === -1 ? [...install.runs, {
					jobId: chunk.jobId,
					command: chunk.argv.join(" "),
					cwd: chunk.cwd,
					output: chunk.text,
					...settled
				}] : install.runs.map((run, at) => at === index ? {
					...run,
					output: run.output + chunk.text,
					...settled
				} : run);
				this.patchInstall({ runs });
			}
			/**
			* Read the bundles and the entries their rows run as. A call during an
			* in-flight read marks one rerun after it settles.
			* @returns settlement after this call's freshness is reflected.
			*/
			load() {
				if (this.disposed) return Promise.resolve();
				this.reconcileInstall();
				if (this.inFlight !== void 0) {
					this.rerun = true;
					return this.inFlight;
				}
				const run = Promise.resolve().then(() => this.read());
				this.inFlight = run;
				return run;
			}
			/** Keep manual refresh feedback until its coalesced reads settle, without clearing cached cards. */
			async refresh() {
				if (this.disposed || this.getSnapshot().refreshStatus === "refreshing") return;
				const startedAt = Date.now();
				this.patch({
					refreshStatus: "refreshing",
					...this.getSnapshot().notice?.kind === "refresh-failed" ? { notice: null } : {}
				});
				try {
					await this.load();
				} catch (_error) {
					this.patch({ status: "error" });
				} finally {
					const remaining = REFRESH_SPINNER_MIN_MS - (Date.now() - startedAt);
					if (remaining > 0) await new Promise((resolve) => {
						setTimeout(resolve, remaining);
					});
					this.settleRefresh();
				}
			}
			/** Publish refresh feedback only before disposal. */
			settleRefresh() {
				if (this.disposed) return;
				const failed = this.getSnapshot().status === "error";
				this.patch(failed && this.hasCachedInventory ? {
					status: "ready",
					refreshStatus: "idle",
					notice: {
						kind: "refresh-failed",
						seq: ++this.noticeSeq
					}
				} : { refreshStatus: failed ? "failed" : "idle" });
			}
			async read() {
				try {
					do {
						this.rerun = false;
						const generation = ++this.generation;
						if (this.getSnapshot().status === "idle") this.patch({ status: "loading" });
						const inventory = await this.ctx.remote.pluginInventory.list();
						if (generation !== this.generation) return;
						if (!inventory.ok) {
							this.patch({ status: "error" });
							continue;
						}
						if (inventory.value.managementAvailable !== true) {
							this.hasCachedInventory = false;
							this.patch({
								status: "unavailable",
								packages: []
							});
							continue;
						}
						const [bundles, plugins] = await Promise.all([this.ctx.remote.pluginManager.listBundles(), this.ctx.remote.pluginManager.listPlugins()]);
						if (generation !== this.generation) return;
						if (!bundles.ok || !plugins.ok) {
							this.patch({ status: "error" });
							continue;
						}
						this.hasCachedInventory = true;
						this.patch({
							status: "ready",
							refreshStatus: this.getSnapshot().refreshStatus === "refreshing" ? "refreshing" : "idle",
							packages: sortPackages(bundles.value.map((bundle) => packageView(bundle, plugins.value)))
						});
					} while (this.shouldRerun());
				} finally {
					this.inFlight = void 0;
				}
			}
			shouldRerun() {
				return this.rerun;
			}
			async confirm() {
				const pending = this.pendingConfirm;
				this.pendingConfirm = void 0;
				this.patch({ confirm: null });
				if (pending !== void 0) await pending();
			}
			/** Drop the check in flight; its answer is ignored. */
			abortInspect() {
				this.inspectAbort?.abort();
				this.inspectAbort = void 0;
			}
			/** Whether a settlement arrives too late to matter: the store is disposed, or the dialog moved on. */
			gone(signal) {
				return this.disposed || signal.aborted;
			}
			/**
			* Check the typed spec, then install it. The Host reads what the spec
			* names first; a refused spec returns to the field with the reason, an
			* accepted one becomes the subject the next screens show while pnpm runs.
			*/
			async runInstall() {
				const state = this.getSnapshot();
				const install = state.install;
				const spec = install.spec.trim();
				if (install.phase === "checking" || isInstallPending(install.phase) || spec === "") return;
				if (this.ctx.get("productAnalytics")?.enabled) {
					this.analyticsAttempt = {
						input: sanitizeInstallInput(spec),
						started: Date.now()
					};
					this.ctx.get("productAnalytics")?.track("plugin_install_click", { input_value: sanitizeInstallInput(spec) });
				}
				const listed = state.packages.find((pkg) => pkg.name === spec);
				if (listed !== void 0) {
					this.finishAnalytics("failed", "already-installed");
					this.patchInstall({
						phase: "idle",
						inputError: {
							problem: listed.installed ? "already-installed" : "shipped",
							reason: spec
						}
					});
					return;
				}
				const choice = install.registry;
				const typed = choice.kind === "custom" ? choice.url.trim() : void 0;
				if (typed !== void 0 && !REGISTRY_URL.test(typed)) {
					this.finishAnalytics("failed", "invalid-registry");
					this.patchInstall({
						phase: "idle",
						registryError: true,
						registryOpen: true
					});
					return;
				}
				this.abortInspect();
				const controller = new AbortController();
				this.inspectAbort = controller;
				this.patchInstall({
					phase: "checking",
					inputError: null,
					subject: null,
					runs: [],
					detailsOpen: false,
					attempts: null,
					registryOpen: false,
					installed: null,
					restartRequired: false,
					failure: null,
					approvedBuilds: []
				});
				const read = this.registryRead;
				if (read !== void 0 && choice === read.choice && read.done !== void 0) {
					await read.done;
					if (this.gone(controller.signal) || this.registryRead !== read) return;
				}
				const currentChoice = this.getSnapshot().install.registry;
				const selected = currentChoice.kind === "custom" ? {
					...currentChoice,
					url: currentChoice.url.trim()
				} : currentChoice;
				const registry = selected.kind === "custom" ? selected.url : selected.registry;
				this.registryMemory.set(selected);
				const inspected = await this.ctx.remote.pluginManager.inspect(spec, { registry }, controller.signal);
				if (this.gone(controller.signal)) return;
				this.inspectAbort = void 0;
				if (!inspected.ok) {
					this.finishAnalytics("failed", inspected.error.code);
					this.patchInstall({
						phase: "idle",
						inputError: {
							problem: "unknown",
							reason: inspected.error.message
						}
					});
					return;
				}
				if (inspected.value.status === "refused") {
					const { problem, reason, registries } = inspected.value;
					this.finishAnalytics("failed", problem);
					this.patchInstall({
						phase: "idle",
						inputError: {
							problem,
							reason,
							...registries === void 0 ? {} : { registries }
						}
					});
					return;
				}
				await this.startInstall({
					spec,
					...inspected.value
				});
			}
			/**
			* Hand the checked spec to the Host and settle the dialog from its answer.
			* `approvedBuilds` names the pending install scripts the person allowed;
			* the Host saves that permission for this profile before pnpm runs.
			*/
			async startInstall(subject, approvedBuilds) {
				const { spec, registry } = subject;
				const requestId = randomUUID();
				const request = {
					requestId,
					acknowledged: false,
					replyLost: false,
					recovering: false
				};
				this.request = request;
				this.patchInstall({
					phase: "starting",
					requestId,
					subject,
					runs: [],
					attempts: null,
					failure: null,
					installed: null,
					approvedBuilds: []
				});
				const result = await this.ctx.remote.pluginManager.installBundle(spec, {
					enabled: false,
					requestId,
					registry,
					...approvedBuilds === void 0 ? {} : { approvedBuilds: [...approvedBuilds] }
				});
				if (this.disposed || this.request !== request) return;
				if (!result.ok) {
					request.replyLost = true;
					this.installUncertain("result", result.error.message);
					this.reconcileInstall();
					return;
				}
				this.settleInstall(result.value);
			}
			/** A recovery call shares the Host's active result; absent results are explicitly unknown. */
			async reconcileInstall() {
				const request = this.request;
				if (request === void 0 || !request.replyLost || request.recovering) return;
				request.recovering = true;
				const result = await this.ctx.remote.pluginManager.waitForInstall(request.requestId);
				if (this.disposed || this.request !== request) return;
				request.recovering = false;
				if (!result.ok) {
					this.installUncertain("result", result.error.message);
					return;
				}
				if (result.value !== null) {
					this.settleInstall(result.value);
					return;
				}
				this.request = void 0;
				this.finishAnalytics("unknown");
				this.patchInstall({
					phase: "unknown",
					failure: null,
					runs: settledRuns(this.getSnapshot().install.runs, null)
				});
				this.notifyHiddenInstall("unknown");
				this.load();
			}
			settleInstall(result) {
				this.finishAnalytics(result.application === "failed" ? "failed" : result.application === "cancelled" ? "cancelled" : "success", result.application === "failed" ? result.error?.code : void 0, result.bundle);
				const { runs, attempts } = this.getSnapshot().install;
				this.request = void 0;
				const asked = result.registries === void 0 ? {} : { attempts: {
					registries: result.registries,
					total: Math.max(attempts?.total ?? 0, result.registries.length)
				} };
				if (result.application === "cancelled") this.offerSpecAgain({
					kind: "cancelled",
					seq: ++this.noticeSeq
				});
				else if (result.application === "failed") {
					const packages = result.packageResult;
					this.patchInstall({
						phase: "failed",
						runs: settledRuns(runs, packages?.exitCode ?? null),
						failure: failureOf(result.error, packages?.kind, result.pendingBuilds, result.failedAt),
						...asked
					});
				} else this.patchInstall({
					phase: "done",
					runs: settledRuns(runs, 0),
					failure: null,
					installed: result.bundle ?? null,
					restartRequired: result.application === "restart-required",
					approvedBuilds: result.approvedBuilds ?? [],
					...asked
				});
				const phase = this.getSnapshot().install.phase;
				if (phase === "done" || phase === "failed") this.notifyHiddenInstall(phase);
				this.load();
			}
			installUncertain(uncertainty, reason) {
				this.patchInstall({
					phase: this.getSnapshot().install.phase === "applying" ? "applying" : "unconfirmed",
					failure: {
						reason,
						uncertainty
					}
				});
				this.notifyHiddenInstall("unconfirmed");
			}
			/**
			* Allow the install scripts the failed run left pending and run the same
			* spec again. Only the failed screen with pending names offers this.
			*/
			async approveBuildsAndRetry() {
				const install = this.getSnapshot().install;
				const pending = install.failure?.pendingBuilds;
				if (install.phase !== "failed" || install.subject === null || pending === void 0 || pending.length === 0) return;
				if (this.ctx.get("productAnalytics")?.enabled) this.analyticsAttempt = {
					input: sanitizeInstallInput(install.subject.spec),
					started: Date.now()
				};
				await this.startInstall(install.subject, pending);
			}
			/**
			* Leave the check or the failed screen for the spec at once; a Host-owned
			* run is asked to stop and its state waits for the Host's word, since
			* neither a dropped RPC nor a closed connection means pnpm has stopped.
			*/
			async cancelInstall() {
				const install = this.getSnapshot().install;
				if (install.phase === "checking" || install.phase === "failed" || install.phase === "unknown") {
					if (install.phase === "checking") this.finishAnalytics("cancelled");
					this.abortInspect();
					this.offerSpecAgain();
					return;
				}
				const request = this.request;
				if (install.phase !== "starting" && install.phase !== "running" && install.phase !== "unconfirmed" || request === void 0) return;
				if (request.cancellation !== void 0 && !request.cancellation.waitingForStart) return;
				const cancellation = { waitingForStart: false };
				request.cancellation = cancellation;
				await this.sendCancellation(request, cancellation);
			}
			/** A cancellation that overtakes installation is retried after the Host acknowledges that request. */
			async sendCancellation(request, cancellation) {
				const acknowledged = request.acknowledged;
				cancellation.waitingForStart = false;
				this.patchInstall({
					phase: "cancelling",
					failure: null
				});
				const result = await this.ctx.remote.pluginManager.cancelInstall(request.requestId);
				if (this.disposed || this.request !== request || request.cancellation !== cancellation) return;
				if (!result.ok) {
					cancellation.waitingForStart = !request.acknowledged;
					if (request.acknowledged) request.cancellation = void 0;
					this.installUncertain(request.replyLost ? "result" : "cancellation", result.error.message);
					return;
				}
				if (result.value.status === "cancelled") {
					this.finishAnalytics("cancelled");
					this.offerSpecAgain({
						kind: "cancelled",
						seq: ++this.noticeSeq
					});
					this.load();
				} else if (result.value.status === "too-late") {
					request.acknowledged = true;
					request.cancellation = void 0;
					this.patchInstall({ phase: "applying" });
					this.notifyHiddenInstall("applying");
					this.reconcileInstall();
				} else if (request.replyLost) {
					request.cancellation = void 0;
					this.installUncertain("result", "");
					this.reconcileInstall();
				} else if (!acknowledged && this.getSnapshot().install.phase !== "applying") if (request.acknowledged) await this.sendCancellation(request, cancellation);
				else {
					cancellation.waitingForStart = true;
					this.installUncertain("acceptance", "");
				}
				else {
					request.cancellation = void 0;
					this.installUncertain("cancellation", "");
				}
			}
			notifyHiddenInstall(outcome) {
				if (!this.getSnapshot().install.open) this.patch({ notice: {
					kind: "install",
					outcome,
					seq: ++this.noticeSeq
				} });
			}
			/**
			* Release the tracked request and return to editing with its spec retained.
			* A cancellation notice is supplied only after the Host confirms it stopped.
			*/
			offerSpecAgain(notice = null) {
				this.request = void 0;
				this.patch({
					install: specAgain(this.getSnapshot().install),
					...notice === null ? {} : { notice }
				});
			}
			/**
			* Enable the bundle the finished install added, then close the dialog and
			* mark it in the list. A refusal toasts and still closes: the list shows
			* what did not switch on.
			*/
			async enableInstalled() {
				const install = this.getSnapshot().install;
				if (install.phase !== "done" || install.enabling) return;
				const name = install.installed;
				this.patchInstall({ enabling: true });
				if (name !== null) {
					const result = await this.ctx.remote.pluginManager.setBundleEnabled(name, true);
					if (this.disposed) return;
					try {
						this.applied(result, name);
						if (result.ok && (result.value.application === "applied" || result.value.application === "restart-required")) this.trackToggle(name, true);
					} catch (error) {
						this.patch({ notice: failedNotice(error, {
							packageName: name,
							action: "enable"
						}, ++this.noticeSeq) });
					}
				}
				this.patch({
					install: IDLE_INSTALL,
					highlight: name
				});
				await this.load();
			}
			/**
			* Run one action under a busy key, turn its failure into the notice, and
			* re-read the Host afterwards whatever happened.
			*/
			async run(key, subject, action) {
				if (this.disposed || this.getSnapshot().busy.includes(key)) return;
				this.patch({
					busy: [...this.getSnapshot().busy, key],
					notice: null
				});
				try {
					await action();
				} catch (error) {
					this.patch({ notice: failedNotice(error, subject, ++this.noticeSeq) });
				} finally {
					this.patch({ busy: this.getSnapshot().busy.filter((entry) => entry !== key) });
				}
				await this.load();
			}
			/**
			* Publish a change's outcome: a refused answer or a change the Host could
			* not apply throws for {@link run} to report; a change that waits for the
			* next start, that a higher layer overrides, or that the Host stopped is
			* said in passing.
			*/
			applied(answer, packageName) {
				if (!answer.ok) throw new RemoteAnswerError(answer.error.message);
				const result = answer.value;
				switch (result.application) {
					case "failed": throw new RemoteAnswerError(result.error?.diagnostic ?? "", result.error?.code, result.error?.incompatible);
					case "cancelled":
						this.patch({ notice: {
							kind: "cancelled",
							seq: ++this.noticeSeq
						} });
						return;
					case "restart-required":
						this.patch({ notice: {
							kind: "restart",
							packageName,
							seq: ++this.noticeSeq
						} });
						return;
					case "overridden":
						this.patch({ notice: {
							kind: "overridden",
							packageName,
							seq: ++this.noticeSeq
						} });
						return;
					case "applied": return;
				}
			}
			trackToggle(name, enabled, row = false) {
				const bundle = this.getSnapshot().packages.find((pkg) => row ? pkg.rows.some((item) => item.entryId === name) : pkg.name === name);
				const pluginName = row ? bundle?.rows.find((item) => item.entryId === name)?.moduleName : name;
				if (bundle === void 0 || pluginName === void 0) return;
				this.ctx.get("productAnalytics")?.track("plugin_toggle", {
					plugin_name: pluginName,
					plugin_type: row ? "plugin" : "bundle",
					is_enabled: enabled,
					is_builtin: !bundle.installed
				});
			}
			finishAnalytics(status, reason, name) {
				const attempt = this.analyticsAttempt;
				this.analyticsAttempt = void 0;
				if (attempt === void 0 || this.disposed) return;
				const errorReason = status === "cancelled" ? "user_cancelled" : status === "unknown" ? "unknown_result" : reason;
				this.ctx.get("productAnalytics")?.track("install_plugin_result", {
					input_value: attempt.input,
					is_success: status === "success",
					duration: Math.max(0, Date.now() - attempt.started),
					...errorReason === void 0 ? {} : { error_reason: errorReason },
					...name === void 0 ? {} : { plugin_name: name }
				});
			}
			patch(next) {
				if (this.disposed) return;
				this.store.set({
					...this.getSnapshot(),
					...next
				});
			}
			patchInstall(next) {
				this.patch({ install: {
					...this.getSnapshot().install,
					...next
				} });
			}
		};
		/** What a thrown failure said: a refused answer's reason, else the error's message. */
		function reasonOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion
		//#region \0dsh-css:D:\qwq\desktop\wt-dsh-master\deepseek-harness\packages\client\ui-plugin-manager\src\client\PluginManagerPage.module.css.mjs
		const css = ".u9Hv6q_page{box-sizing:border-box;height:100%;color:var(--dsw-alias-label-primary);flex-direction:column;align-items:center;gap:24px;padding:0 clamp(20px,4vw,40px) 48px;display:flex;overflow:auto}.u9Hv6q_page>*{width:100%;max-width:960px}.u9Hv6q_pageHead{box-sizing:border-box;justify-content:space-between;align-items:flex-start;gap:16px;padding-top:28px;display:flex}[data-platform=darwin] .u9Hv6q_pageHead{padding-top:0}.u9Hv6q_pageTitle{margin:0;font-size:20px;font-weight:500;line-height:28px}.u9Hv6q_pageIntro{color:var(--dsw-alias-label-secondary);align-items:center;gap:4px;margin:4px 0 0;font-size:13px;line-height:20px;display:flex}.u9Hv6q_infoButton{width:20px;height:20px;color:var(--dsw-alias-label-caption);flex:none;padding:0}.u9Hv6q_toolbar{justify-content:flex-end;align-items:center;gap:16px;display:flex}.u9Hv6q_status,.u9Hv6q_failure p,.u9Hv6q_empty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.u9Hv6q_failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;display:flex}.u9Hv6q_statusWithDot{align-items:center;gap:6px;display:inline-flex}.u9Hv6q_group{flex-direction:column;gap:8px;display:flex}.u9Hv6q_groupHead{align-items:baseline;gap:8px;display:flex}.u9Hv6q_groupTitle{margin:0;font-size:14px;font-weight:500;line-height:22px}.u9Hv6q_count{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;font-size:14px}.u9Hv6q_groupInfo{color:var(--dsw-alias-label-caption);align-self:center;align-items:center;display:inline-flex}.u9Hv6q_groupInfo:hover,.u9Hv6q_groupInfo:focus-visible{color:var(--dsw-alias-label-secondary)}.u9Hv6q_statusTag{height:18px;padding:0 7px;font-size:10px;line-height:1}.u9Hv6q_card[data-plugin-highlight]{animation:2.4s ease-out u9Hv6q_dsh-plugin-highlight}@keyframes u9Hv6q_dsh-plugin-highlight{0%,55%{box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent)}to{box-shadow:0 0 #0000}}@media (prefers-reduced-motion:reduce){.u9Hv6q_card[data-plugin-highlight]{box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);animation:none}}.u9Hv6q_iconButton:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}.u9Hv6q_cards{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.u9Hv6q_card{border-radius:var(--dsw-radius-xl);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);min-width:0;margin:0 -8px}.u9Hv6q_cardHead{align-items:center;gap:14px;padding:8px;display:flex}.u9Hv6q_cardIcon{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);width:48px;height:48px;color:var(--dsw-alias-label-secondary);flex:none;justify-content:center;align-items:center;display:inline-flex}.u9Hv6q_packageImage{object-fit:contain}.u9Hv6q_cardMain{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.u9Hv6q_titleRow{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;display:flex}.u9Hv6q_cardTitle{text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;overflow:hidden}.u9Hv6q_cardLink{position:relative}.u9Hv6q_cardLink:hover{background:var(--dsw-alias-interactive-bg-hover)}.u9Hv6q_cardOpen{max-width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;padding:0;font-size:14px;font-weight:500;line-height:20px}.u9Hv6q_cardOpen:after{content:\"\";border-radius:var(--dsw-radius-xl);position:absolute;inset:0}.u9Hv6q_cardOpen:focus-visible{outline:none}.u9Hv6q_cardOpen:focus-visible:after{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.u9Hv6q_cardDesc{color:var(--dsw-alias-label-tertiary);-webkit-line-clamp:1;-webkit-box-orient:vertical;font-size:13px;line-height:18px;display:-webkit-box;overflow:hidden}.u9Hv6q_skeletonFill{background:var(--dsw-alias-bg-skeleton);animation:2s cubic-bezier(.36,0,.64,1) infinite u9Hv6q_dsh-plugin-skeleton}.u9Hv6q_skeletonText{align-items:center;height:1lh;display:flex}.u9Hv6q_skeletonBar{border-radius:var(--dsw-radius-xs);width:100%;height:12px}.u9Hv6q_skeletonHeading{width:48px}.u9Hv6q_skeletonTitle{width:min(144px,60%)}.u9Hv6q_skeletonDescription{width:min(280px,85%)}.u9Hv6q_skeletonIcon{border-color:#0000}.u9Hv6q_skeletonActions{width:36px;height:20px}@keyframes u9Hv6q_dsh-plugin-skeleton{0%{opacity:1}40%{opacity:.6}80%,to{opacity:1}}@media (prefers-reduced-motion:reduce){.u9Hv6q_skeletonFill{animation:none}}.u9Hv6q_cardEnd{z-index:1;flex:none;align-items:center;gap:8px;display:inline-flex;position:relative}.u9Hv6q_iconButton{border-radius:var(--dsw-radius-sm);width:28px;height:28px;color:var(--dsw-alias-label-caption);cursor:pointer;background:0 0;border:0;justify-content:center;align-items:center;display:inline-flex}.u9Hv6q_iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.u9Hv6q_iconButton:disabled{opacity:.5;cursor:default}.u9Hv6q_addButton{border-radius:var(--dsw-radius-md);height:32px;padding:0 12px;font-size:13px;line-height:20px}.u9Hv6q_iconWrap{display:inline-flex}.u9Hv6q_danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);--dsw-alias-interactive-bg-hover:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)}.u9Hv6q_detailActions{flex:none;align-items:center;gap:16px;display:flex}.u9Hv6q_actions{align-items:center;gap:16px;display:flex}.u9Hv6q_deleteButton{border-radius:var(--dsw-radius-sm);width:28px;height:28px;color:var(--dsw-alias-state-error-primary);cursor:pointer;background:0 0;border:0;justify-content:center;align-items:center;display:inline-flex}.u9Hv6q_deleteButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsw-alias-interactive-bg-hover))}.u9Hv6q_deleteButton:disabled{opacity:.5;cursor:default}.u9Hv6q_deleteButton:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}.u9Hv6q_reason{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;white-space:pre-wrap;margin:0;font-size:12px;line-height:18px}.u9Hv6q_partsHead .u9Hv6q_subLabel{margin:0}.u9Hv6q_partsFilter{width:200px}.u9Hv6q_partsFilter:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}.u9Hv6q_installDialog{width:min(560px,100%);max-height:min(800px,100%)}.u9Hv6q_installContent{min-height:0;overflow-y:auto}.u9Hv6q_installBody{flex-direction:column;gap:12px;min-width:0;display:flex}.u9Hv6q_installFooter{flex-direction:column;flex:1;gap:20px;min-width:0;display:flex}.u9Hv6q_templateHint{color:var(--dsw-alias-label-secondary);margin:-4px 0 0;font-size:12px;line-height:18px}.u9Hv6q_installLocation{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.u9Hv6q_installField{flex-direction:column;gap:6px;font-size:13px;display:flex}.u9Hv6q_installField input[type=text]{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);height:40px;font:inherit;color:var(--dsw-alias-label-primary);outline:none;padding:0 14px;font-size:13px}.u9Hv6q_installField input[type=text]:focus,.u9Hv6q_registryCustomField:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-business-primary)}.u9Hv6q_installField input[type=text][aria-invalid=true],.u9Hv6q_registryCustomField[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary);box-shadow:none}.u9Hv6q_installField input[type=text][aria-invalid=true]:focus,.u9Hv6q_registryCustomField[aria-invalid=true]:focus{box-shadow:inset 0 0 0 .5px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.u9Hv6q_guideToggle{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;align-self:flex-start;align-items:center;gap:4px;margin-top:4px;padding:0;font-size:12.5px;display:inline-flex}.u9Hv6q_guideToggle:hover{color:var(--dsw-alias-label-primary)}.u9Hv6q_guideChevron{transition:transform .16s}.u9Hv6q_guideToggle[aria-expanded=true] .u9Hv6q_guideChevron{transform:rotate(180deg)}.u9Hv6q_guide{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);flex-direction:column;gap:10px;padding:8px 14px;display:flex}.u9Hv6q_guideHint{color:var(--dsw-alias-label-tertiary);margin:6px 0 0;font-size:12px;line-height:18px}.u9Hv6q_installSafety{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-label-secondary);align-items:flex-start;gap:8px;margin:0;padding:10px 12px;font-size:12px;line-height:18px;display:flex}.u9Hv6q_installSafetyText{flex-direction:column;gap:4px;min-width:0;display:flex}.u9Hv6q_installSafety>svg{color:var(--dsw-alias-state-warn-primary);flex:none;margin-top:2px}.u9Hv6q_guideList{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.u9Hv6q_guideItem{align-items:flex-start;gap:10px;padding:8px 0;display:flex}.u9Hv6q_guideItem>button{align-self:center}.u9Hv6q_guideMain{flex-direction:column;flex:1;gap:0;min-width:0;display:flex}.u9Hv6q_guideTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}.u9Hv6q_guideExample{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:12px;line-height:20px}.u9Hv6q_guideExample code{font-family:var(--ds-font-family-code)}.u9Hv6q_guideExampleLabel{color:var(--dsw-alias-label-tertiary)}.u9Hv6q_optionsRow{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 12px;display:flex}.u9Hv6q_registryToggle{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);height:28px;font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;align-items:center;gap:6px;padding:0 8px 0 10px;font-size:12.5px;display:inline-flex}.u9Hv6q_registryToggle:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.u9Hv6q_registryToggle:disabled{cursor:default;opacity:.6}.u9Hv6q_registryToggle[aria-expanded=true]{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-3)}.u9Hv6q_registryToggle[aria-expanded=true] .u9Hv6q_guideChevron{transform:rotate(180deg)}.u9Hv6q_registryChosen{color:var(--dsw-alias-label-primary);font-weight:500}.u9Hv6q_registry{z-index:1100;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border-radius:var(--dsw-radius-lg);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:min(440px,100vw - 24px);box-shadow:var(--dsw-elevation-prominent);border:0;flex-direction:column;gap:4px;min-width:0;margin:0;padding:8px;display:flex;position:fixed}.u9Hv6q_registryOption{border-radius:var(--dsw-radius-md);cursor:pointer;border:0;flex-direction:column;gap:4px;padding:8px 10px;display:flex}.u9Hv6q_registryOption:hover{background:var(--dsw-alias-interactive-bg-hover)}label.u9Hv6q_registryOption{flex-direction:row;align-items:flex-start;gap:10px}.u9Hv6q_registryOption input[type=radio]{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary);flex:none;margin:2px 0 0}.u9Hv6q_registryTitle{color:var(--dsw-alias-label-primary);flex-wrap:wrap;align-items:center;gap:8px;font-size:13px;line-height:20px;display:flex}.u9Hv6q_registryHint{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:12px;line-height:18px}.u9Hv6q_registryCustomPick{cursor:pointer;align-items:flex-start;gap:10px;display:flex}.u9Hv6q_registryCustomField{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);height:32px;font:inherit;color:var(--dsw-alias-label-primary);outline:none;margin-left:26px;padding:0 10px;font-size:13px}.u9Hv6q_registryOption>.u9Hv6q_inputError,.u9Hv6q_registryOption>.u9Hv6q_registryHint{margin-left:26px}.u9Hv6q_inputError{color:var(--dsw-alias-state-error-primary);margin:-4px 0 0;font-size:12px;line-height:18px}.u9Hv6q_wide{border-radius:var(--dsw-radius-md);justify-content:center;width:100%;height:40px}.u9Hv6q_wizard{flex-direction:column;flex:auto;gap:16px;min-width:0;min-height:0;padding:16px 20px 0;display:flex}.u9Hv6q_wizardScroll{flex-direction:column;flex:auto;gap:16px;min-height:0;display:flex;overflow-y:auto}.u9Hv6q_wizardHead{justify-content:space-between;align-items:center;min-height:24px;display:flex}.u9Hv6q_wizardBack{font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:0;align-items:center;gap:4px;padding:0;font-size:15px;font-weight:600;display:inline-flex}.u9Hv6q_wizardClose{border-radius:var(--dsw-radius-sm);width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;justify-content:center;align-items:center;padding:0;display:inline-flex}.u9Hv6q_wizardClose:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}.u9Hv6q_wizardHero{text-align:center;flex-direction:column;align-items:center;gap:10px;padding:8px 0 4px;display:flex}.u9Hv6q_wizardIcon{width:44px;height:44px;color:var(--dsw-alias-label-secondary);justify-content:center;align-items:center;display:inline-flex}.u9Hv6q_wizardIcon[data-state=done]{color:var(--dsw-alias-state-success-secondary)}.u9Hv6q_wizardIcon[data-state=error]{color:var(--dsw-alias-state-warn-label)}.u9Hv6q_wizardTitle{margin:0;font-size:18px;font-weight:600;line-height:26px}.u9Hv6q_wizardSub{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px}.u9Hv6q_subject{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);text-align:center;flex-direction:column;align-items:center;gap:6px;padding:16px;display:flex}.u9Hv6q_subjectName{overflow-wrap:anywhere;margin:0;font-size:15px;font-weight:600;line-height:22px}.u9Hv6q_subjectDesc,.u9Hv6q_subjectMeta{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px}.u9Hv6q_wizardFoot{justify-content:space-between;align-items:center;gap:12px;display:flex}.u9Hv6q_footAction{border-radius:var(--dsw-radius-md);height:32px}.u9Hv6q_detailsToggle{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;align-items:center;gap:4px;padding:0;font-size:13px;display:inline-flex}.u9Hv6q_detailsChevron{transition:transform .16s}.u9Hv6q_detailsToggle[aria-expanded=true] .u9Hv6q_detailsChevron{transform:rotate(180deg)}.u9Hv6q_detailsBody{flex-direction:column;gap:8px;min-width:0;display:flex}.u9Hv6q_wizardActions{align-items:center;gap:8px;display:flex}.u9Hv6q_run{flex-direction:column;gap:4px;min-width:0;display:flex}.u9Hv6q_attemptBadge{border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);align-self:flex-start;margin:0;padding:0 6px;font-size:11px;line-height:18px}@media (prefers-reduced-motion:reduce){.u9Hv6q_detailsChevron{transition:none}}.u9Hv6q_result,.u9Hv6q_resultWarn{border-radius:var(--dsw-radius-md);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-label-primary);margin:0;padding:8px 12px;font-size:13px;line-height:20px}.u9Hv6q_resultWarn{background:var(--dsw-alias-state-warn-tertiary)}.u9Hv6q_approval{border:.5px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-state-warn-tertiary);flex-direction:column;gap:8px;padding:12px 14px;display:flex}.u9Hv6q_approvalTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600}.u9Hv6q_approvalText{color:var(--dsw-alias-label-secondary);margin:0;font-size:12.5px;line-height:18px}.u9Hv6q_approvalCaution{color:var(--dsw-alias-label-secondary);margin:0;font-size:12.5px;font-weight:500;line-height:18px}.u9Hv6q_approvalList{flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;display:flex}.u9Hv6q_approvalList code{border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-3);font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-primary);padding:2px 8px;font-size:12px;display:inline-block}.u9Hv6q_terminal{--dsl-terminal-font:var(--dsw-font-markdown-code-block-small);--dsl-terminal-line-height:18px;--dsl-terminal-output-max-height:240px;border:.5px solid var(--dsw-alias-border-l1);margin:4px 0 0}.u9Hv6q_dependents{color:var(--dsw-alias-label-secondary);margin:8px 0 0;padding-left:18px;font-size:13px;line-height:20px}.u9Hv6q_dangerButton{--dsw-alias-button-primary-fill:var(--dsw-alias-state-error-primary);--dsw-alias-button-primary-hover:var(--dsw-alias-state-error-primary)}.u9Hv6q_detail{flex-direction:column;display:flex}.u9Hv6q_detailTop{flex-direction:column;padding-top:28px;display:flex}[data-platform=darwin] .u9Hv6q_detailTop{padding-top:0}.u9Hv6q_crumb{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;align-items:center;gap:6px;padding:0;font-size:12.5px;display:inline-flex}.u9Hv6q_crumb:hover{color:var(--dsw-alias-label-primary)}.u9Hv6q_crumb:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.u9Hv6q_crumbIcon{transform:rotate(90deg)}.u9Hv6q_detailHead{justify-content:space-between;align-items:center;gap:12px;margin:32px 0 0;display:flex}.u9Hv6q_detailMain{flex-direction:column;gap:8px;min-width:0;margin-top:20px;display:flex}.u9Hv6q_detailTitle{margin:0;font-size:20px;font-weight:500;line-height:28px}.u9Hv6q_versionTag{font-variant-numeric:tabular-nums;flex:none}.u9Hv6q_detailDesc{color:var(--dsw-alias-label-secondary);margin:0;font-size:14px;line-height:22px}.u9Hv6q_detailName{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}.u9Hv6q_detailName code{font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace)}.u9Hv6q_detail>.u9Hv6q_detailDesc{margin-top:12px}.u9Hv6q_detailSections{flex-direction:column;gap:32px;margin-top:32px;display:flex}.u9Hv6q_detailSection{flex-direction:column;gap:12px;display:flex}.u9Hv6q_sectionHead{align-items:baseline;gap:10px;display:flex}.u9Hv6q_sectionTitle{margin:0;font-size:14px;font-weight:500;line-height:20px}.u9Hv6q_sectionCount{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.u9Hv6q_cardArrow{color:var(--dsw-alias-label-tertiary);flex:none}.u9Hv6q_rows{flex-direction:column;margin:0;padding:0;list-style:none;display:flex}.u9Hv6q_row{border-bottom:.5px solid var(--dsw-alias-border-l2);padding:12px 2px}.u9Hv6q_row:last-child{border-bottom:0}.u9Hv6q_rowLine{align-items:center;gap:16px;min-width:0;display:flex}.u9Hv6q_rowIcon{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);width:40px;height:40px;color:var(--dsw-alias-label-secondary);flex:none;justify-content:center;align-items:center;display:inline-flex}.u9Hv6q_rowMain{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.u9Hv6q_rowId{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-size:13.5px;font-weight:500;line-height:20px}.u9Hv6q_row[data-state=off] .u9Hv6q_rowId{color:var(--dsw-alias-label-secondary)}.u9Hv6q_rowModule{font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:11.5px;line-height:16px}.u9Hv6q_rowOpen{color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:center;gap:2px;padding:0;display:inline-flex}.u9Hv6q_rowOpen:hover .u9Hv6q_rowId{text-underline-offset:3px;text-decoration:underline}.u9Hv6q_rowOpenIcon{color:var(--dsw-alias-label-tertiary);flex:none}.u9Hv6q_rowOpen:hover .u9Hv6q_rowOpenIcon{color:var(--dsw-alias-label-primary)}.u9Hv6q_rowState{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;align-items:center;gap:6px;font-size:12.5px;line-height:18px;display:inline-flex}.u9Hv6q_row[data-state=failed] .u9Hv6q_rowState{color:var(--dsw-alias-state-error-primary)}.u9Hv6q_rowFailure{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:4px 0 0 56px;font-size:12px;line-height:18px}";
		const tagId = "@deepseek-ai/dsh-client-ui-plugin-manager/PluginManagerPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-plugin-manager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		/* Additions for the plugin library tab strip, the collapsible groups, and the
		market search area's vertical rhythm (see the search-area rules at the end). */
		const libraryCss = ".dspl_shell{display:flex;align-items:stretch;height:100%;min-height:0;box-sizing:border-box;--dspl-top-inset:var(--dsh-frame-top-clearance,0px)}[data-platform=darwin] .dspl_shell{--dspl-top-inset:48px}.dspl_shell>.u9Hv6q_page{flex:1 1 auto;min-width:0}.dspl_tabsRow{display:flex;align-items:center;gap:var(--dspl-tabs-gap,8px);margin-top:calc(var(--dspl-tabs-top,28px) + var(--dspl-top-inset,0px));margin-bottom:calc(-1 * var(--dspl-tabs-overlap,16px))}.dspl_tabsRow>.dspl_libraryTabs{flex:1;min-width:0;margin:0}.dspl_tabsRow+.u9Hv6q_pageHead{padding-top:0}.dspl_tuneButton{flex:0 0 auto;width:34px;height:34px;padding:0;border-radius:var(--dsw-radius-md);border:0.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.dspl_tuneButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}.dspl_tuneButton:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dspl_shell .u9Hv6q_page{gap:var(--dspl-page-gap,32px);padding:0 clamp(24px,4vw,var(--dspl-page-pad-x,48px)) var(--dspl-page-pad-bottom,48px)}.dspl_shell .u9Hv6q_page>*{max-width:var(--dspl-page-max,960px)}.dspl_shell .u9Hv6q_pageTitle{font-size:var(--dspl-page-title-size,20px)}.dspl_shell .u9Hv6q_group{gap:var(--dspl-group-gap,8px)}.dspl_shell .u9Hv6q_groupTitle{font-size:var(--dspl-group-title-size,14px)}.dspl_shell .u9Hv6q_cards{gap:var(--dspl-list-gap,2px)}.u9Hv6q_groupHead{box-sizing:border-box;width:100%;margin:0;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;align-items:baseline;gap:8px;display:flex}.u9Hv6q_groupHead:hover .u9Hv6q_groupTitle{color:var(--dsw-alias-label-primary)}.u9Hv6q_groupHead:focus-visible{outline:none;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px}.u9Hv6q_groupChevron{flex:0 0 auto;color:var(--dsw-alias-label-caption);transition:transform 160ms ease}[data-plugin-group-open=\"true\"] .u9Hv6q_groupChevron{transform:rotate(90deg)}[data-dspl-market-head]{border-radius:0 0 var(--dspl-head-radius,12px) var(--dspl-head-radius,12px);padding-bottom:var(--dspl-head-pad-bottom,6px);margin-bottom:var(--dspl-head-gap,24px)}[data-dspl-market-head]::before{border-radius:var(--dspl-head-radius,12px) var(--dspl-head-radius,12px) 0 0}[data-dspl-market-head]>div:first-of-type{padding:4px 4px var(--dspl-search-row-bottom,16px)}[data-dspl-market-head]>div:first-of-type>div>span{height:var(--dspl-search-height,36px);padding:0 var(--dspl-search-pad-x,12px);border-radius:var(--dspl-search-radius,6px)}[data-dspl-market-head]>div:nth-of-type(2){margin-left:0;margin-right:0;padding:var(--dspl-chips-pad-top,8px) 4px 0}[data-dspl-market-head]>div:nth-of-type(2)>div:first-of-type>div:first-of-type{gap:var(--dspl-chips-gap,8px)}[data-dspl-market-head]>div:nth-of-type(2)>div:nth-of-type(2){margin-top:var(--dspl-note-gap,10px);font-size:var(--dspl-note-size,12px);line-height:calc(var(--dspl-note-size,12px) + 6px);letter-spacing:0.01em}[data-dspl-market-head] [data-chip=\"1\"]{height:var(--dspl-chip-height,24px);padding:0 var(--dspl-chip-pad-x,10px);font-size:var(--dspl-chip-font,12px)}[data-dspl-market-body]{padding-top:var(--dspl-results-pad-top,12px)}[data-dspl-market-flow]{gap:var(--dspl-results-gap,10px)}[data-dspl-market-card]{border-radius:var(--dspl-card-radius,12px);padding:var(--dspl-card-pad-y,12px) var(--dspl-card-pad-x,14px);gap:var(--dspl-card-gap,12px)}.dspl_dock{flex:0 0 var(--dspl-dock-width,320px);box-sizing:border-box;min-width:0;height:100%;overflow-y:auto;overscroll-behavior:contain;padding:calc(var(--dspl-tabs-top,28px) + var(--dspl-top-inset,0px)) var(--dspl-dock-pad,16px) 24px;border-left:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column}.dspl_dockHead{display:flex;align-items:center;gap:6px;margin-bottom:6px}.dspl_dockTitle{flex:1;min-width:0;margin:0;font-size:14px;font-weight:600;line-height:22px}.dspl_dockAction{flex:0 0 auto;width:26px;height:26px;padding:0;border:0;border-radius:var(--dsw-radius-sm,4px);background:none;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.dspl_dockAction:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.dspl_dockAction:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.dspl_dockIntro{margin:0 0 10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}.dspl_dockGroup{border-top:0.5px solid var(--dsw-alias-border-l2)}.dspl_dockGroupHead{box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;margin:0;padding:8px 0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}.dspl_dockGroupHead:hover .dspl_dockGroupTitle{color:var(--dsw-alias-label-primary)}.dspl_dockGroupHead:focus-visible{outline:none;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}.dspl_dockChevron{flex:0 0 auto;color:var(--dsw-alias-label-caption);transition:transform 160ms ease}[data-dspl-tune-group-open=\"true\"] .dspl_dockChevron{transform:rotate(90deg)}.dspl_dockGroupTitle{flex:1;min-width:0;font-size:13px;font-weight:600;line-height:20px}.dspl_dockGroupCount{flex:0 0 auto;font-size:11px;line-height:18px;color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums}.dspl_dockGroupBody{display:flex;flex-direction:column;padding:0 0 10px}.dspl_dockFooter{display:flex;gap:8px;padding-top:12px;margin-top:12px;border-top:0.5px solid var(--dsw-alias-border-l2)}.dspl_dockFooter>*{flex:1;min-width:0}.dspl_tuneRow{display:grid;grid-template-columns:104px minmax(0,1fr) 54px;align-items:center;gap:12px;padding:5px 0}.dspl_tuneLabel{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}.dspl_tuneRange{width:100%;min-width:0;height:20px;margin:0;accent-color:var(--dsw-alias-state-business-primary);cursor:pointer}.dspl_tuneValue{font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;text-align:right}.dspl_head{box-sizing:border-box;width:100%;max-width:var(--dspl-page-max,960px);margin:0 auto;padding:28px clamp(20px,4vw,40px) 0;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}[data-platform=darwin] .dspl_head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}.dspl_titles{display:flex;flex-direction:column;gap:2px;min-width:0}.dspl_sub{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:4px 0 0;font-size:13px;line-height:20px}.dspl_head~.dspl_tabsRow{margin-top:0}.dspl_head{margin-bottom:calc(-1 * var(--dspl-page-gap,32px))}.dspl_tuneNote{margin:10px 0 0;font-size:11px;line-height:17px;color:var(--dsw-alias-label-tertiary)}";
		const libraryTagId = "@deepseek-ai/dsh-client-ui-plugin-manager/PluginLibraryAdditions.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(libraryTagId) + "]") === null) {
			const libraryTag = document.createElement("style");
			libraryTag.dataset.plugin = "@deepseek-ai/dsh-client-ui-plugin-manager";
			libraryTag.dataset.pluginCss = libraryTagId;
			libraryTag.textContent = libraryCss;
			document.head.appendChild(libraryTag);
		}
		}
		//#region plugin-library: redesign of the market cards, spacing scale, and scroll edge
		/**
		* The market ships its own visual language: multi-column flex masonry, one border per
		* card, a 4px horizontal inset inside a page that insets by 48px, and an opaque sticky
		* header that crops the cards as they scroll under it. This sheet replaces that with
		* one scale: an equal-height card grid, the page's own inset, a translucent header, and
		* a 24px scroll edge that fades content out below the search field.
		*
		* Every rule doubles its attribute selector so it outweighs the market's class rule
		* without !important — the market's own build may land after this sheet.
		*/
		const libraryRedesignCss = "[data-dspl-market-flow]:has(>[data-dspl-market-flow]){display:grid!important;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))!important;grid-auto-rows:1fr!important;align-items:stretch!important;column-gap:12px!important;row-gap:12px!important;list-style:none!important;padding:0!important}\
[data-dspl-market-flow]:has(>[data-dspl-market-flow])>[data-dspl-market-flow]{display:contents!important}\
[data-dspl-market-title][data-dspl-market-title]{display:none}\
[data-dspl-market-head][data-dspl-market-head]{padding-top:16px;border-radius:12px!important;position:sticky;top:0;background:var(--dsw-alias-bg-base);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%)}\
[data-dspl-market-body][data-dspl-market-body]{padding:0 0 64px;scrollbar-width:none!important;-ms-overflow-style:none!important}\
[data-dspl-market-body][data-dspl-market-body]::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}\
[data-dspl-market-card][data-dspl-market-card]>*{padding-left:14px;padding-right:14px}\
[data-dspl-market-card][data-dspl-market-card]{display:flex;flex-direction:column;min-height:0;gap:8px;padding:16px 0;height:auto!important;align-self:stretch}\
[data-dspl-market-desc][data-dspl-market-desc]{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:3!important;overflow:hidden!important}\
[data-dspl-market-shots][data-dspl-market-shots]{display:none}\
[data-dspl-market-name][data-dspl-market-name]{font-size:13px;font-weight:600;line-height:20px}\
[data-dspl-market-byline][data-dspl-market-byline]{font-size:12px;line-height:18px}\
[data-dspl-market-desc][data-dspl-market-desc]{font-size:12px;line-height:18px}\
[data-dspl-market-desc][data-dspl-market-desc] [class*='descClamp']{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}\
[data-dspl-market-action][data-dspl-market-action]{flex:0 0 auto}\
[data-dspl-market-install][data-dspl-market-install]{min-width:68px}\
[data-dspl-market-tabs][data-dspl-market-tabs]{border-bottom:0;gap:4px;margin-bottom:4px}\
.dspl_libraryTabs [class*='_tab']:not([class*='_tabs']):hover{background:var(--dsh-hover-neutral)}\
.dspl_libraryTabs.dspl_libraryTabs{position:relative;background:transparent;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}.dspl_libraryTabs>[class*='indicator']{display:none}.dspl_libraryTabs [class*='_tab']:not([class*='_tabs']){border-radius:10px;transition:none}.dspl_libraryTabs [class*='_tab']:not([class*='_tabs'])[aria-selected='true']{color:var(--dsw-alias-label-primary);font-weight:600}.dspl_libraryTabs [class*='_tab']:not([class*='_tabs'])[aria-selected='false']{color:var(--dsw-alias-label-secondary)}@media (prefers-contrast:more){.dspl_libraryTabs.dspl_libraryTabs{border:1px solid var(--dsw-alias-label-primary)}}\
.dspl_tuneButton{display:none}\
.dspl_dock{display:none}\
[data-dspl-market-card][data-dspl-market-card]:hover{background:color-mix(in srgb,var(--dsh-panel-fill,var(--dsw-alias-bg-layer-1)) 72%,var(--dsh-hover-neutral,var(--dsw-alias-bg-layer-2)))}\
[data-dspl-market-foot][data-dspl-market-foot]{display:none!important}\
[data-dspl-market-card][data-dspl-market-card]{padding-bottom:16px!important}\
[data-dspl-market-card][data-dspl-market-card]{cursor:pointer;transition:transform .18s cubic-bezier(.32,.72,0,1),box-shadow .18s cubic-bezier(.32,.72,0,1)}\
[data-dspl-market-card][data-dspl-market-card]:hover{transform:translateY(-1px);box-shadow:0 6px 18px -10px rgb(0 0 0 / .45),0 0 0 1px color-mix(in srgb,var(--dsw-alias-border-l2) 70%,transparent)}\
@media (prefers-reduced-motion:reduce){[data-dspl-market-card][data-dspl-market-card]{transition:none!important}[data-dspl-market-card][data-dspl-market-card]:hover{transform:none!important}}\
[data-dspl-market-cats][data-dspl-market-cats]{padding-top:9px}\
[data-dspl-market-tabs][data-dspl-market-tabs] [data-chip='1'],[data-dspl-market-cats][data-dspl-market-cats] [data-chip='1']{height:26px;padding:0 12px;border-radius:999px}\
[data-dspl-market-head] input::placeholder{color:color-mix(in srgb,var(--dsw-alias-label-primary) 62%,transparent)!important;opacity:1!important}\
[data-dspl-market-cats] [data-chip='1'],[data-dspl-market-tabs] [data-chip='1']{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 60%,transparent)!important;color:color-mix(in srgb,var(--dsw-alias-label-primary) 94%,transparent)!important}\
[data-dspl-market-cats] [data-chip='1']:hover,[data-dspl-market-tabs] [data-chip='1']:hover{background:var(--dsh-hover-neutral,var(--dsw-alias-bg-layer-2))!important}\
[data-dspl-market-desc]{color:color-mix(in srgb,var(--dsw-alias-label-primary) 82%,transparent)!important}\
[data-dspl-market-byline],[data-dspl-market-nm]{color:color-mix(in srgb,var(--dsw-alias-label-primary) 78%,transparent)!important}\
[data-dspl-market-meta]{opacity:1!important;color:color-mix(in srgb,var(--dsw-alias-label-primary) 72%,transparent)!important}\
[data-dspl-market-head] *{color:color-mix(in srgb,var(--dsw-alias-label-primary) 68%,transparent)!important}\
[data-dspl-market-head] *::placeholder{color:color-mix(in srgb,var(--dsw-alias-label-primary) 55%,transparent)!important}\
[class*='_page']:has([data-dspl-market-head]){display:flex!important;flex-direction:column!important;height:100%!important;max-height:100%!important;overflow:hidden!important}\
/* 把 sticky head 从滚动容器里剥离：头部回到普通流，由 .root 的纵向 flex 分上下两段 */\
[data-dspl-market-head] [class*='searchField']{background:transparent!important}\
[data-dspl-market-head] [class*='searchInput']{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 78%,transparent)!important;border-radius:10px!important;box-shadow:inset 0 0 0 0.5px color-mix(in srgb,var(--dsw-alias-border-l2) 75%,transparent)!important}\
[data-dspl-market-head] [class*='searchInput'] input{background:transparent!important;box-shadow:none!important;border-radius:0!important}\
[data-dspl-market-head] [class*='tabSearchRow']{max-width:none!important;margin-left:0!important;margin-right:0!important;padding-left:24px!important;padding-right:24px!important}\
[data-dspl-market-head] [data-dspl-market-cats]{padding-left:24px!important;padding-right:24px!important}\
[data-dspl-market-head] [class*='tabSearchRow']{padding-right:24px!important}\
[class*='hostFilterNote']{display:none!important}\
[class*='catsWrap']{flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain!important;scrollbar-width:none!important;padding-bottom:2px!important;mask-image:linear-gradient(to right,transparent 0,#000 20px,#000 calc(100% - 20px),transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0,#000 20px,#000 calc(100% - 20px),transparent 100%)}\
@property --dspl-fade-l{syntax:'<length>';inherits:false;initial-value:0px}\
@property --dspl-fade-r{syntax:'<length>';inherits:false;initial-value:20px}\
@keyframes dspl-cats-fade{from{--dspl-fade-l:0px;--dspl-fade-r:20px}to{--dspl-fade-l:20px;--dspl-fade-r:0px}}\
@supports (animation-timeline:scroll()){[class*='catsWrap']{animation:dspl-cats-fade linear both!important;animation-timeline:scroll(self inline)!important;mask-image:linear-gradient(to right,transparent 0,#000 var(--dspl-fade-l),#000 calc(100% - var(--dspl-fade-r)),transparent 100%)!important;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 var(--dspl-fade-l),#000 calc(100% - var(--dspl-fade-r)),transparent 100%)!important}}\
[class*='catsWrap']::-webkit-scrollbar{display:none!important}\
[class*='catsWrap'] > *{flex:0 0 auto!important;white-space:nowrap!important}\
[data-dspl-market-cats][data-dspl-market-cats]{margin-left:0!important;margin-right:0!important;padding-left:24px!important;padding-right:24px!important}\
[data-dspl-market-desc]{min-height:54px!important}\
[data-dspl-market-head] input[type='text'],[data-dspl-market-head] input:not([type]){height:38px!important;border-radius:10px!important}\
";
		const libraryRedesignTagId = "@deepseek-ai/dsh-client-ui-plugin-manager/PluginLibraryRedesign.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(libraryRedesignTagId) + "]") === null) {
			const redesignTag = document.createElement("style");
			redesignTag.dataset.plugin = "@deepseek-ai/dsh-client-ui-plugin-manager";
			redesignTag.dataset.pluginCss = libraryRedesignTagId;
			redesignTag.textContent = libraryRedesignCss;
			document.head.appendChild(redesignTag);
		}
		//#endregion
		var PluginManagerPage_module_css_default = {
			"actions": "u9Hv6q_actions",
			"addButton": "u9Hv6q_addButton",
			"approval": "u9Hv6q_approval",
			"approvalCaution": "u9Hv6q_approvalCaution",
			"approvalList": "u9Hv6q_approvalList",
			"approvalText": "u9Hv6q_approvalText",
			"approvalTitle": "u9Hv6q_approvalTitle",
			"attemptBadge": "u9Hv6q_attemptBadge",
			"card": "u9Hv6q_card",
			"cardArrow": "u9Hv6q_cardArrow",
			"cardDesc": "u9Hv6q_cardDesc",
			"cardEnd": "u9Hv6q_cardEnd",
			"cardHead": "u9Hv6q_cardHead",
			"cardIcon": "u9Hv6q_cardIcon",
			"cardLink": "u9Hv6q_cardLink",
			"cardMain": "u9Hv6q_cardMain",
			"cardOpen": "u9Hv6q_cardOpen",
			"cardTitle": "u9Hv6q_cardTitle",
			"cards": "u9Hv6q_cards",
			"count": "u9Hv6q_count",
			"crumb": "u9Hv6q_crumb",
			"crumbIcon": "u9Hv6q_crumbIcon",
			"danger": "u9Hv6q_danger",
			"dangerButton": "u9Hv6q_dangerButton",
			"deleteButton": "u9Hv6q_deleteButton",
			"dependents": "u9Hv6q_dependents",
			"detail": "u9Hv6q_detail",
			"detailActions": "u9Hv6q_detailActions",
			"detailDesc": "u9Hv6q_detailDesc",
			"detailHead": "u9Hv6q_detailHead",
			"detailMain": "u9Hv6q_detailMain",
			"detailName": "u9Hv6q_detailName",
			"detailSection": "u9Hv6q_detailSection",
			"detailSections": "u9Hv6q_detailSections",
			"detailTitle": "u9Hv6q_detailTitle",
			"detailTop": "u9Hv6q_detailTop",
			"detailsBody": "u9Hv6q_detailsBody",
			"detailsChevron": "u9Hv6q_detailsChevron",
			"detailsToggle": "u9Hv6q_detailsToggle",
			"dsh-plugin-highlight": "u9Hv6q_dsh-plugin-highlight",
			"dsh-plugin-skeleton": "u9Hv6q_dsh-plugin-skeleton",
			"empty": "u9Hv6q_empty",
			"failure": "u9Hv6q_failure",
			"footAction": "u9Hv6q_footAction",
			"group": "u9Hv6q_group",
			"groupHead": "u9Hv6q_groupHead",
			"groupInfo": "u9Hv6q_groupInfo",
			"groupTitle": "u9Hv6q_groupTitle",
			"groupChevron": "u9Hv6q_groupChevron",
			"guide": "u9Hv6q_guide",
			"guideChevron": "u9Hv6q_guideChevron",
			"guideExample": "u9Hv6q_guideExample",
			"guideExampleLabel": "u9Hv6q_guideExampleLabel",
			"guideHint": "u9Hv6q_guideHint",
			"guideItem": "u9Hv6q_guideItem",
			"guideList": "u9Hv6q_guideList",
			"guideMain": "u9Hv6q_guideMain",
			"guideTitle": "u9Hv6q_guideTitle",
			"guideToggle": "u9Hv6q_guideToggle",
			"iconButton": "u9Hv6q_iconButton",
			"iconWrap": "u9Hv6q_iconWrap",
			"infoButton": "u9Hv6q_infoButton",
			"inputError": "u9Hv6q_inputError",
			"installBody": "u9Hv6q_installBody",
			"installContent": "u9Hv6q_installContent",
			"installDialog": "u9Hv6q_installDialog",
			"installField": "u9Hv6q_installField",
			"installFooter": "u9Hv6q_installFooter",
			"installLocation": "u9Hv6q_installLocation",
			"installSafety": "u9Hv6q_installSafety",
			"installSafetyText": "u9Hv6q_installSafetyText",
			"optionsRow": "u9Hv6q_optionsRow",
			"packageImage": "u9Hv6q_packageImage",
			"page": "u9Hv6q_page",
			"pageHead": "u9Hv6q_pageHead",
			"pageIntro": "u9Hv6q_pageIntro",
			"pageTitle": "u9Hv6q_pageTitle",
			"partsFilter": "u9Hv6q_partsFilter",
			"partsHead": "u9Hv6q_partsHead",
			"reason": "u9Hv6q_reason",
			"registry": "u9Hv6q_registry",
			"registryChosen": "u9Hv6q_registryChosen",
			"registryCustomField": "u9Hv6q_registryCustomField",
			"registryCustomPick": "u9Hv6q_registryCustomPick",
			"registryHint": "u9Hv6q_registryHint",
			"registryOption": "u9Hv6q_registryOption",
			"registryTitle": "u9Hv6q_registryTitle",
			"registryToggle": "u9Hv6q_registryToggle",
			"result": "u9Hv6q_result",
			"resultWarn": "u9Hv6q_resultWarn",
			"row": "u9Hv6q_row",
			"rowFailure": "u9Hv6q_rowFailure",
			"rowIcon": "u9Hv6q_rowIcon",
			"rowId": "u9Hv6q_rowId",
			"rowLine": "u9Hv6q_rowLine",
			"rowMain": "u9Hv6q_rowMain",
			"rowModule": "u9Hv6q_rowModule",
			"rowOpen": "u9Hv6q_rowOpen",
			"rowOpenIcon": "u9Hv6q_rowOpenIcon",
			"rowState": "u9Hv6q_rowState",
			"rows": "u9Hv6q_rows",
			"run": "u9Hv6q_run",
			"sectionCount": "u9Hv6q_sectionCount",
			"sectionHead": "u9Hv6q_sectionHead",
			"sectionTitle": "u9Hv6q_sectionTitle",
			"skeletonActions": "u9Hv6q_skeletonActions",
			"skeletonBar": "u9Hv6q_skeletonBar",
			"skeletonDescription": "u9Hv6q_skeletonDescription",
			"skeletonFill": "u9Hv6q_skeletonFill",
			"skeletonHeading": "u9Hv6q_skeletonHeading",
			"skeletonIcon": "u9Hv6q_skeletonIcon",
			"skeletonText": "u9Hv6q_skeletonText",
			"skeletonTitle": "u9Hv6q_skeletonTitle",
			"status": "u9Hv6q_status",
			"statusTag": "u9Hv6q_statusTag",
			"statusWithDot": "u9Hv6q_statusWithDot",
			"subLabel": "u9Hv6q_subLabel",
			"subject": "u9Hv6q_subject",
			"subjectDesc": "u9Hv6q_subjectDesc",
			"subjectMeta": "u9Hv6q_subjectMeta",
			"subjectName": "u9Hv6q_subjectName",
			"templateHint": "u9Hv6q_templateHint",
			"terminal": "u9Hv6q_terminal",
			"titleRow": "u9Hv6q_titleRow",
			"toolbar": "u9Hv6q_toolbar",
			"versionTag": "u9Hv6q_versionTag",
			"wide": "u9Hv6q_wide",
			"wizard": "u9Hv6q_wizard",
			"wizardActions": "u9Hv6q_wizardActions",
			"wizardBack": "u9Hv6q_wizardBack",
			"wizardClose": "u9Hv6q_wizardClose",
			"wizardFoot": "u9Hv6q_wizardFoot",
			"wizardHead": "u9Hv6q_wizardHead",
			"wizardHero": "u9Hv6q_wizardHero",
			"wizardIcon": "u9Hv6q_wizardIcon",
			"wizardScroll": "u9Hv6q_wizardScroll",
			"wizardSub": "u9Hv6q_wizardSub",
			"wizardTitle": "u9Hv6q_wizardTitle"
		};
		//#endregion
		//#region lib/types/client/PluginManagerPage.js
		/**
		* Global plugin management: the Official group's cards for the bundles the
		* installation ships switched off and for the official plugins that register
		* their configuration, the Installed group's cards for the profile's bundles,
		* their row switches, the install dialog with its guide and folded pnpm
		* output, the uninstall confirmation, and the toasts an action's outcome
		* becomes. A bundle's page lists the rows it contributes as the Host runs
		* them; a plugin's configuration renders on its own page through the slots
		* the page declares.
		*/
		/** How long the list marks a package an install just enabled. */
		const HIGHLIGHT_MS = 2400;
		/** Built-in profile bundles stay out of this page even when the profile declares them as dependencies. */
		const BUILTIN_PROFILE_BUNDLES = new Set([
			"@deepseek-ai/dsh-base",
			"@deepseek-ai/dsh-web-app",
			"@deepseek-ai/dsh-headless",
			"@deepseek-ai/dsh-sdk-app",
			"@deepseek-ai/dsh-acp-app",
			"@deepseek-ai/dsh-sdk-minimal"
		]);
		/** How long a toast holds: long enough to read a failure that names what broke. */
		function toastHoldMs(text) {
			return Math.min(8e3, Math.max(3e3, text.length * 80));
		}
		const PHASE_KEYS = {
			pending: "rowPhasePending",
			loading: "rowPhaseLoading",
			active: "rowPhaseActive",
			failed: "rowPhaseFailed",
			unloading: "rowPhaseUnloading"
		};
		/** Status dot naming a root-fiber phase; loading and unloading are live transitions. */
		const PHASE_STATES = {
			pending: "idle",
			loading: "ongoing",
			active: "done",
			failed: "error",
			unloading: "ongoing"
		};
		/** The count line over a pack's components: the total, then only the states that occur. */
		function partsSummary(rows, t) {
			const failed = rows.filter((row) => row.phase === "failed").length;
			const off = rows.filter((row) => !row.enabled).length;
			const running = rows.filter((row) => row.enabled && row.phase === "active").length;
			return [
				t("partsCountTotal", { count: String(rows.length) }),
				...running > 0 ? [t("partsCountRunning", { count: String(running) })] : [],
				...off > 0 ? [t("partsCountOff", { count: String(off) })] : [],
				...failed > 0 ? [t("partsCountFailed", { count: String(failed) })] : []
			].join(" · ");
		}
		/** Rows beyond this count get a filter box above the list. */
		const ROW_FILTER_THRESHOLD = 10;
		/** The size the 36-viewBox plugin artwork renders at inside a card's 48px frame. */
		const CARD_ARTWORK_SIZE = 36;
		/** The size the artwork renders at inside a row's 40px frame. */
		const ROW_ARTWORK_SIZE = 30;
		/** The artwork of the official plugins that registered their configuration, by registration id. */
		const ITEM_ARTWORK = new Map([
			["shell", _deepseek_ai_dsh_client_ui_primitives.PluginArtworkTerminal],
			["agent-loop", _deepseek_ai_dsh_client_ui_primitives.PluginArtworkLoop],
			["subagent", _deepseek_ai_dsh_client_ui_primitives.PluginArtworkSubagent],
			["web-search", _deepseek_ai_dsh_client_ui_primitives.PluginArtworkSearch]
		]);
		/** An official plugin's card and page artwork; plugins without their own get the default. */
		function itemArtwork(id) {
			return (0, react_jsx_runtime.jsx)(ITEM_ARTWORK.get(id) ?? _deepseek_ai_dsh_client_ui_primitives.PluginArtworkDefault, { size: CARD_ARTWORK_SIZE });
		}
		/** Manifest images remain isolated from the page DOM; a failed decode keeps the position's default artwork. */
		function PackageArtwork({ src, row = false, size = row ? ROW_ARTWORK_SIZE : CARD_ARTWORK_SIZE }) {
			const [failedSource, setFailedSource] = (0, react.useState)();
			return src === void 0 || src === failedSource ? (0, react_jsx_runtime.jsx)(row ? _deepseek_ai_dsh_client_ui_primitives.PluginArtworkSubagent : _deepseek_ai_dsh_client_ui_primitives.PluginArtworkDefault, { size }) : (0, react_jsx_runtime.jsx)("img", {
				className: PluginManagerPage_module_css_default.packageImage,
				src,
				width: size,
				height: size,
				alt: "",
				onError: () => {
					setFailedSource(src);
				}
			});
		}
		/** A row's switch: locked, saying why, when the Host refuses to address the row through the profile patch. */
		function RowSwitch({ row, title, t, busy, onChange }) {
			const locked = row.readOnlyReason !== void 0 || row.entryId === void 0;
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
				checked: row.enabled,
				label: t("partToggle", { name: title }),
				disabled: busy || locked,
				...row.readOnlyReason === void 0 ? {} : { title: managementText({ code: row.readOnlyReason }, t) },
				onChange
			});
		}
		/** What a row's state line says: off, or the phase its fiber is in. */
		function rowStateText(row, t) {
			if (!row.enabled) return t("partOff");
			return row.phase === null ? t("rowStateIdle") : t(PHASE_KEYS[row.phase]);
		}
		/** The dot beside a row: its fiber phase, or idle. */
		function rowDotState(row) {
			if (!row.enabled || row.phase === null) return "idle";
			return PHASE_STATES[row.phase];
		}
		/** A Host metadata diagnostic does not change the package's management permissions. */
		function MetadataError({ error, t }) {
			return error === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
				className: PluginManagerPage_module_css_default.reason,
				role: "status",
				"data-package-meta-error": true,
				children: t("metadataError", { error })
			});
		}
		/**
		* A pack's rows as a list in the order the pack declares them: a state dot,
		* the row id, one line saying its state, a configure control for a row that
		* registered a page, and, when the pack is on, a switch. A pack like base
		* carries close to a hundred rows, so a long list gets a filter.
		*/
		function RowsSection({ rows, t, resolveText, toggle, configure }) {
			const [filter, setFilter] = (0, react.useState)("");
			const query = filter.trim().toLowerCase();
			const localized = rows.map((row) => ({
				row,
				...rowText(row, resolveText)
			}));
			const shown = query === "" ? localized : localized.filter(({ row, title, description }) => [
				title,
				description,
				row.rowId,
				row.moduleName
			].some((value) => value?.toLowerCase().includes(query)));
			return (0, react_jsx_runtime.jsxs)("section", {
				className: PluginManagerPage_module_css_default.detailSection,
				"data-plugin-rows": true,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.sectionHead,
						children: [(0, react_jsx_runtime.jsx)("h4", {
							className: PluginManagerPage_module_css_default.sectionTitle,
							children: t("partsLabel")
						}), rows.length === 0 ? null : (0, react_jsx_runtime.jsx)("span", {
							className: PluginManagerPage_module_css_default.sectionCount,
							children: partsSummary(rows, t)
						})]
					}),
					rows.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginManagerPage_module_css_default.status,
						children: t("partsEmpty")
					}) : null,
					rows.length > ROW_FILTER_THRESHOLD ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						type: "search",
						className: PluginManagerPage_module_css_default.partsFilter,
						placeholder: t("partsFilter"),
						"aria-label": t("partsFilter"),
						value: filter,
						onChange: (event) => {
							setFilter(event.target.value);
						}
					}) : null,
					rows.length > 0 && shown.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginManagerPage_module_css_default.status,
						children: t("partsFilterEmpty")
					}) : null,
					shown.length === 0 ? null : (0, react_jsx_runtime.jsx)("ul", {
						className: PluginManagerPage_module_css_default.rows,
						children: shown.map(({ row, title, description }) => (0, react_jsx_runtime.jsxs)("li", {
							className: PluginManagerPage_module_css_default.row,
							"data-plugin-row": row.entryId ?? row.rowId,
							...row.phase === "failed" ? { "data-state": "failed" } : row.enabled ? {} : { "data-state": "off" },
							children: [(0, react_jsx_runtime.jsxs)("div", {
								className: PluginManagerPage_module_css_default.rowLine,
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: PluginManagerPage_module_css_default.rowIcon,
										"aria-hidden": "true",
										children: (0, react_jsx_runtime.jsx)(PackageArtwork, {
											src: row.meta?.icon,
											row: true
										}, row.meta?.icon)
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: PluginManagerPage_module_css_default.rowMain,
										children: [
											configure?.has(row) === true ? (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: PluginManagerPage_module_css_default.rowOpen,
												"aria-label": t("configureRow", { name: title }),
												onClick: () => {
													configure.open(row);
												},
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: PluginManagerPage_module_css_default.rowId,
													children: title
												}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, {
													className: PluginManagerPage_module_css_default.rowOpenIcon,
													"aria-hidden": "true"
												})]
											}) : (0, react_jsx_runtime.jsx)("span", {
												className: PluginManagerPage_module_css_default.rowId,
												children: title
											}),
											description === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
												className: PluginManagerPage_module_css_default.rowModule,
												children: description
											}),
											title === row.rowId ? null : (0, react_jsx_runtime.jsx)("code", {
												className: PluginManagerPage_module_css_default.rowModule,
												children: row.rowId
											}),
											title === row.moduleName ? null : (0, react_jsx_runtime.jsx)("code", {
												className: PluginManagerPage_module_css_default.rowModule,
												children: row.moduleName
											})
										]
									}),
									(0, react_jsx_runtime.jsxs)("span", {
										className: PluginManagerPage_module_css_default.rowState,
										children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: rowDotState(row) }), rowStateText(row, t)]
									}),
									toggle === void 0 ? null : (0, react_jsx_runtime.jsx)(RowSwitch, {
										row,
										title,
										t,
										busy: toggle.busy(row),
										onChange: (enabled) => {
											toggle.onSetEnabled(row, enabled);
										}
									})
								]
							}), (0, react_jsx_runtime.jsx)(MetadataError, {
								error: row.meta?.error,
								t
							})]
						}, row.rowId))
					})
				]
			});
		}
		/**
		* A bundle's enable switch on its card and its page: locked, saying why, for
		* one the Host protects; off and locked for one it cannot read.
		*/
		function EnableSwitch({ pkg, title, t, busy, onSetEnabled }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
				checked: pkg.enabled,
				label: t("enableToggle", { name: title }),
				disabled: busy || pkg.readOnlyReason !== void 0 || !pkg.enabled && pkg.error !== void 0,
				...pkg.readOnlyReason === void 0 ? {} : { title: managementText({ code: pkg.readOnlyReason }, t) },
				onChange: onSetEnabled
			});
		}
		/** The status one card carries: running, off, or a problem the Host reported. */
		function packageStatus(pkg) {
			if (pkg.error !== void 0) return "problem";
			return pkg.enabled ? "running" : "disabled";
		}
		/** The head every card shares: the artwork, the name that opens the page beside its tags, its one-liner, and what sits at the end. */
		function CardHead({ title, t, onOpen, icon, tags, description, end }) {
			const descriptionId = (0, react.useId)();
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginManagerPage_module_css_default.cardHead,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: PluginManagerPage_module_css_default.cardIcon,
						"aria-hidden": "true",
						children: icon
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.cardMain,
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: PluginManagerPage_module_css_default.titleRow,
							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${PluginManagerPage_module_css_default.cardTitle} ${PluginManagerPage_module_css_default.cardOpen}`,
								"aria-label": t("openDetail", { name: title }),
								"aria-describedby": description === void 0 ? void 0 : descriptionId,
								onClick: onOpen,
								children: title
							}), tags]
						}), description === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
							className: PluginManagerPage_module_css_default.cardDesc,
							id: descriptionId,
							children: description
						})]
					}),
					end === void 0 ? null : (0, react_jsx_runtime.jsx)("div", {
						className: PluginManagerPage_module_css_default.cardEnd,
						children: end
					})
				]
			});
		}
		/** First-read placeholders share the Official group's card and text-line layout. */
		function ListSkeleton({ label }) {
			return (0, react_jsx_runtime.jsxs)("section", {
				className: PluginManagerPage_module_css_default.group,
				role: "status",
				"aria-label": label,
				"data-plugin-loading": true,
				children: [(0, react_jsx_runtime.jsx)("div", {
					className: PluginManagerPage_module_css_default.groupHead,
					"aria-hidden": "true",
					children: (0, react_jsx_runtime.jsx)("span", {
						className: `${PluginManagerPage_module_css_default.groupTitle} ${PluginManagerPage_module_css_default.skeletonText} ${PluginManagerPage_module_css_default.skeletonHeading}`,
						children: (0, react_jsx_runtime.jsx)("span", { className: `${PluginManagerPage_module_css_default.skeletonFill} ${PluginManagerPage_module_css_default.skeletonBar}` })
					})
				}), (0, react_jsx_runtime.jsx)("ul", {
					className: PluginManagerPage_module_css_default.cards,
					"aria-hidden": "true",
					children: [
						0,
						1,
						2,
						3
					].map((index) => (0, react_jsx_runtime.jsx)("li", {
						className: PluginManagerPage_module_css_default.card,
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: PluginManagerPage_module_css_default.cardHead,
							children: [
								(0, react_jsx_runtime.jsx)("span", { className: `${PluginManagerPage_module_css_default.cardIcon} ${PluginManagerPage_module_css_default.skeletonFill} ${PluginManagerPage_module_css_default.skeletonIcon}` }),
								(0, react_jsx_runtime.jsxs)("div", {
									className: PluginManagerPage_module_css_default.cardMain,
									children: [(0, react_jsx_runtime.jsx)("div", {
										className: PluginManagerPage_module_css_default.titleRow,
										children: (0, react_jsx_runtime.jsx)("span", {
											className: `${PluginManagerPage_module_css_default.cardTitle} ${PluginManagerPage_module_css_default.skeletonText} ${PluginManagerPage_module_css_default.skeletonTitle}`,
											children: (0, react_jsx_runtime.jsx)("span", { className: `${PluginManagerPage_module_css_default.skeletonFill} ${PluginManagerPage_module_css_default.skeletonBar}` })
										})
									}), (0, react_jsx_runtime.jsx)("span", {
										className: `${PluginManagerPage_module_css_default.cardDesc} ${PluginManagerPage_module_css_default.skeletonText} ${PluginManagerPage_module_css_default.skeletonDescription}`,
										children: (0, react_jsx_runtime.jsx)("span", { className: `${PluginManagerPage_module_css_default.skeletonFill} ${PluginManagerPage_module_css_default.skeletonBar}` })
									})]
								}),
								(0, react_jsx_runtime.jsx)("div", { className: `${PluginManagerPage_module_css_default.cardEnd} ${PluginManagerPage_module_css_default.skeletonActions}` })
							]
						})
					}, index))
				})]
			});
		}
		/** The top every page shares: the crumb that leads back, then the icon with the page's actions at its right. */
		/** Sidebar control in native window chrome, independent of the scrolling page header. */
		function PluginSidebarControl({ renderSlot }) {
			if (!(0, _deepseek_ai_dsh_client_ui_primitives.isDarwinDesktop)()) return null;
			return (0, react_jsx_runtime.jsx)("div", { "data-plugin-sidebar-control": "", children: renderSlot("plugins.header.leading", {}) });
		}
		function DetailTop({ crumbLabel, crumbText, onBack, icon, actions }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginManagerPage_module_css_default.detailTop,
				"data-plugin-page-header": "detail",
				"data-window-drag": true,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: PluginManagerPage_module_css_default.crumb,
					"aria-label": crumbLabel,
					onClick: onBack,
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, {
						className: PluginManagerPage_module_css_default.crumbIcon,
						"aria-hidden": "true"
					}), (0, react_jsx_runtime.jsx)("span", { children: crumbText })]
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: PluginManagerPage_module_css_default.detailHead,
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: PluginManagerPage_module_css_default.cardIcon,
						"aria-hidden": "true",
						children: icon
					}), actions]
				})]
			});
		}
		/** One package as a card that opens its page: its name, its one-liner, its tags, and its bundle switch. */
		function PackageCard({ pkg, t, resolveText, busy, highlighted, onOpen, onSetEnabled, renderSlot }) {
			const { title, description, beta } = packageText(pkg, resolveText);
			const status = packageStatus(pkg);
			return (0, react_jsx_runtime.jsxs)("li", {
				className: `${PluginManagerPage_module_css_default.card} ${PluginManagerPage_module_css_default.cardLink}`,
				"data-plugin-package": pkg.name,
				"data-plugin-status": status,
				...highlighted ? { "data-plugin-highlight": "" } : {},
				children: [(0, react_jsx_runtime.jsx)(CardHead, {
					title,
					t,
					onOpen,
					icon: (0, react_jsx_runtime.jsx)(PackageArtwork, { src: pkg.meta?.icon }, pkg.meta?.icon),
					tags: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [beta ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
						className: PluginManagerPage_module_css_default.statusTag,
						tone: "info",
						children: t("statusBeta")
					}) : null, status === "problem" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
						className: PluginManagerPage_module_css_default.statusTag,
						tone: "danger",
						children: t("statusProblem")
					}) : null] }),
					description,
					end: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						renderSlot("plugins.bundle.actions", { subject: { kind: "bundle", pkg: packageRef(pkg) } }, { entryKey: pkg.name }),
						(0, react_jsx_runtime.jsx)(EnableSwitch, {
						pkg,
						title,
						t,
						busy,
						onSetEnabled
					})] })
				}), (0, react_jsx_runtime.jsx)(MetadataError, {
					error: pkg.meta?.error,
					t
				})]
			});
		}
		/**
		* One official plugin as a card that opens its page: its icon, its title from
		* the registration, and the one-liner the entry renders in its summary view.
		*/
		function ItemCard({ item, t, onOpen, renderSlot }) {
			return (0, react_jsx_runtime.jsx)("li", {
				className: `${PluginManagerPage_module_css_default.card} ${PluginManagerPage_module_css_default.cardLink}`,
				"data-plugin-item": item.id,
				children: (0, react_jsx_runtime.jsx)(CardHead, {
					title: item.label,
					t,
					onOpen,
					icon: itemArtwork(item.id),
					description: renderSlot("plugins.item", { view: "summary" }, { only: item.id })
				})
			});
		}
		/** One row as the detail slots see it. */
		function rowRef(row) {
			return {
				rowId: row.rowId,
				moduleName: row.moduleName,
				enabled: row.enabled
			};
		}
		/** One bundle as the detail slots see it. */
		function packageRef(pkg) {
			return {
				name: pkg.name,
				...pkg.version === void 0 ? {} : { version: pkg.version },
				installed: pkg.installed,
				enabled: pkg.enabled,
				rows: pkg.rows.map(rowRef)
			};
		}
		/**
		* An official plugin's page: the crumb back to the cards, its icon with the
		* contributed actions, its title with the contributed badges over its
		* one-liner, the form the entry renders, and the contributed sections.
		*/
		function ItemDetail({ item, t, onBack, renderSlot, form, renderComponents }) {
			const subject = {
				kind: "item",
				id: item.id
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginManagerPage_module_css_default.detail,
				"data-plugin-item-detail": item.id,
				children: [
					(0, react_jsx_runtime.jsx)(DetailTop, {
						crumbLabel: t("backToList"),
						crumbText: t("crumbRoot"),
						onBack,
						icon: itemArtwork(item.id),
						actions: (0, react_jsx_runtime.jsx)("div", {
							className: PluginManagerPage_module_css_default.detailActions,
							children: renderSlot("plugins.detail.actions", { subject })
						})
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.detailMain,
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: PluginManagerPage_module_css_default.titleRow,
							children: [(0, react_jsx_runtime.jsx)("h3", {
								className: PluginManagerPage_module_css_default.detailTitle,
								children: item.label
							}), renderSlot("plugins.detail.badge", { subject })]
						}), (0, react_jsx_runtime.jsx)("p", {
							className: PluginManagerPage_module_css_default.detailDesc,
							children: renderSlot("plugins.item", { view: "summary" }, { only: item.id })
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.detailSections,
						children: [(0, react_jsx_runtime.jsx)("section", {
							className: PluginManagerPage_module_css_default.detailSection,
							"data-plugin-config": true,
							children: renderSlot("plugins.item", {
								view: "page",
								form, renderComponents
							}, { only: item.id })
						}), renderSlot("plugins.detail.section", { subject })]
					})
				]
			});
		}
		/**
		* A row's configuration page keeps its technical identity beside local package
		* text and the form supplied by its configuration entry.
		*/
		function RowDetail({ pkg, row, t, resolveText, onBack, renderSlot, form }) {
			const { title } = packageText(pkg, resolveText);
			const { title: rowTitle, description } = rowText(row, resolveText);
			const key = rowConfigKey(pkg.name, row.rowId);
			const subject = {
				kind: "row",
				pkg: packageRef(pkg),
				row: rowRef(row)
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginManagerPage_module_css_default.detail,
				"data-plugin-row-detail": key,
				children: [
					(0, react_jsx_runtime.jsx)(DetailTop, {
						crumbLabel: t("backToPackage", { name: title }),
						crumbText: title,
						onBack,
						icon: (0, react_jsx_runtime.jsx)(PackageArtwork, {
							src: row.meta?.icon,
							row: true,
							size: CARD_ARTWORK_SIZE
						}, row.meta?.icon),
						actions: (0, react_jsx_runtime.jsx)("div", {
							className: PluginManagerPage_module_css_default.detailActions,
							children: renderSlot("plugins.detail.actions", { subject })
						})
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.detailMain,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: PluginManagerPage_module_css_default.titleRow,
								children: [(0, react_jsx_runtime.jsx)("h3", {
									className: PluginManagerPage_module_css_default.detailTitle,
									children: rowTitle
								}), renderSlot("plugins.detail.badge", { subject })]
							}),
							rowTitle === row.rowId ? null : (0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.detailName,
								children: (0, react_jsx_runtime.jsx)("code", { children: row.rowId })
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.detailName,
								children: (0, react_jsx_runtime.jsx)("code", { children: row.moduleName })
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.detailDesc,
								children: description ?? renderSlot("plugins.row.config", { view: "summary" }, { entryKey: key })
							})
						]
					}),
					(0, react_jsx_runtime.jsx)(MetadataError, {
						error: row.meta?.error,
						t
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.detailSections,
						"data-plugin-config": true,
						children: [renderSlot("plugins.row.config", {
							view: "page",
							form
						}, { entryKey: key }), renderSlot("plugins.detail.section", { subject })]
					})
				]
			});
		}
		/**
		* One package's page: the crumb back to the list; its icon with its switch
		* and, for a package the profile installed, uninstall; its title beside its
		* version tag, its beta tag, and its problem tag; the package name the title
		* stands for, which is what installs it elsewhere; its one-liner; the Host's
		* problem when it reports one; the configuration the bundle registered for
		* itself; and its rows with their switches and configure controls.
		*/
		function PackageDetail({ pkg, t, resolveText, busy, rowBusy, configured, configure, renderSlot, onBack, onSetEnabled, onUninstall, onSetRowEnabled }) {
			const { title, description, beta } = packageText(pkg, resolveText);
			const status = packageStatus(pkg);
			const subject = {
				kind: "bundle",
				pkg: packageRef(pkg)
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginManagerPage_module_css_default.detail,
				"data-plugin-detail": pkg.name,
				children: [
					(0, react_jsx_runtime.jsx)(DetailTop, {
						crumbLabel: t("backToList"),
						crumbText: t("crumbRoot"),
						onBack,
						icon: (0, react_jsx_runtime.jsx)(PackageArtwork, { src: pkg.meta?.icon }, pkg.meta?.icon),
						actions: (0, react_jsx_runtime.jsxs)("div", {
							className: PluginManagerPage_module_css_default.detailActions,
							children: [
								renderSlot("plugins.detail.actions", { subject }),
								pkg.installed ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									className: PluginManagerPage_module_css_default.danger,
									icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }),
									"aria-label": t("uninstallLabel", { name: title }),
									disabled: busy || pkg.readOnlyReason !== void 0,
									onClick: onUninstall,
									children: t("uninstall")
								}) : null,
								(0, react_jsx_runtime.jsx)(EnableSwitch, {
									pkg,
									title,
									t,
									busy,
									onSetEnabled
								})
							]
						})
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.detailMain,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: PluginManagerPage_module_css_default.titleRow,
								children: [
									(0, react_jsx_runtime.jsx)("h3", {
										className: PluginManagerPage_module_css_default.detailTitle,
										children: title
									}),
									pkg.version === void 0 ? null : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										className: PluginManagerPage_module_css_default.versionTag,
										tone: "neutral",
										children: t("versionTag", { version: pkg.version })
									}),
									beta ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										className: PluginManagerPage_module_css_default.statusTag,
										tone: "info",
										children: t("statusBeta")
									}) : null,
									status === "problem" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										className: PluginManagerPage_module_css_default.statusTag,
										tone: "danger",
										children: t("statusProblem")
									}) : null,
									renderSlot("plugins.detail.badge", { subject })
								]
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.detailName,
								children: (0, react_jsx_runtime.jsx)("code", {
									"data-plugin-name": true,
									children: pkg.name
								})
							}),
							description === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.detailDesc,
								children: description
							})
						]
					}),
					(0, react_jsx_runtime.jsx)(MetadataError, {
						error: pkg.meta?.error,
						t
					}),
					pkg.error === void 0 ? null : (0, react_jsx_runtime.jsxs)("p", {
						className: PluginManagerPage_module_css_default.reason,
						role: "status",
						children: [
							t("reasonLabel"),
							": ",
							managementText(pkg.error, t)
						]
					}),
					pkg.readOnlyReason === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
						className: PluginManagerPage_module_css_default.reason,
						role: "status",
						children: managementText({ code: pkg.readOnlyReason }, t)
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.detailSections,
						children: [
							configured ? (0, react_jsx_runtime.jsx)("section", {
								className: PluginManagerPage_module_css_default.detailSection,
								"data-plugin-config": true,
								children: renderSlot("plugins.bundle.config", { view: "page" }, { entryKey: pkg.name })
							}) : null,
							(0, react_jsx_runtime.jsx)(RowsSection, {
								rows: pkg.rows,
								t,
								resolveText,
								toggle: pkg.enabled ? {
									busy: (row) => busy || rowBusy(row),
									onSetEnabled: onSetRowEnabled
								} : void 0,
								configure
							}),
							renderSlot("plugins.detail.section", { subject })
						]
					})
				]
			});
		}
		/** Output lines an install run's terminal shows before its middle folds: the first and last six of a long pnpm log. */
		const INSTALL_TERMINAL_LINES = 12;
		/** The install terminal's display copy, from the tab's dictionary. */
		function terminalLabels(t) {
			return {
				/* v8 ignore next -- the Host reports a killed pnpm as a null exit code, never a signal name; the label interface needs one */
				signal: (signal) => t("terminalSignal", { signal }),
				exitCode: (code) => t("terminalExitCode", { code: String(code) }),
				noExitCode: t("terminalNoExitCode"),
				running: t("terminalRunning"),
				failed: t("terminalFailed"),
				done: t("terminalDone"),
				copy: t("terminalCopy"),
				copied: t("terminalCopied"),
				noOutput: t("terminalNoOutput"),
				collapseAria: t("terminalCollapseAria"),
				collapse: t("terminalCollapse"),
				expandAria: (hidden) => t("terminalExpandAria", { n: String(hidden) }),
				expand: (hidden) => t("terminalExpand", { n: String(hidden) })
			};
		}
		/** The sentence under the field for a spec the check refused. */
		const INPUT_PROBLEM_KEYS = {
			"invalid-spec": "installProblemInvalid",
			"already-installed": "installProblemInstalled",
			"shipped": "installProblemShipped",
			"not-found": "installProblemNotFound",
			"not-a-package": "installProblemNotPackage",
			"not-a-bundle": "installProblemNotBundle",
			"network": "installProblemNetwork",
			"unknown": "installProblemUnknown"
		};
		/** The spec form the install guide shows, with an example the person can drop into the field. */
		const GUIDE_EXAMPLES = [{
			key: "id",
			titleKey: "installGuideIdTitle",
			exampleKey: "installGuideIdExample",
			hintKey: "installGuideIdHint"
		}];
		/** The one-line reading of a classified pnpm failure. */
		const FAILURE_KIND_KEYS = {
			"pnpm-missing": "installFailurePnpmMissing",
			"timeout": "installFailureTimeout",
			"not-found": "installFailureNotFound",
			"no-matching-version": "installFailureNoMatchingVersion",
			"network": "installFailureNetwork",
			"disk-full": "installFailureDiskFull",
			"permission": "installFailurePermission",
			"build-blocked": "installFailureBuildBlocked",
			"integrity": "installFailureIntegrity",
			"unknown": "installFailureGeneric"
		};
		/** The heading of each screen past the spec. */
		const SCREEN_TITLE_KEYS = {
			starting: "installStarting",
			running: "installingTitle",
			cancelling: "installCancelling",
			applying: "installApplying",
			unconfirmed: "installUnconfirmedTitle",
			unknown: "installUnknownTitle",
			done: "installedTitle",
			failed: "installFailedTitle"
		};
		/** What the spec's kind reads as when the package carries no description of its own. */
		const SUBJECT_KIND_KEYS = {
			registry: void 0,
			path: "installSubjectPath",
			git: "installSubjectGit",
			tarball: "installSubjectTarball"
		};
		/** The registries asked, by name, in the dictionary's list form. */
		function registryList(registries, t, resolved) {
			return registries.map((registry) => registryText(registry, t, resolved).name).join(t("registryListSeparator"));
		}
		/** An option's name with its host in tertiary text, unless the host is the name. */
		function registryOption(registry, t, resolved) {
			const { name, host } = registryText(registry, t, resolved);
			return name === host ? name : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				name,
				" ",
				(0, react_jsx_runtime.jsx)("span", {
					className: PluginManagerPage_module_css_default.registryHint,
					children: host
				})
			] });
		}
		/**
		* The failed screen's one line: a pnpm failure by its kind, a refusal by its
		* code, any other failure in the Host's words; the run's output stays behind the details.
		* A run the Host laid at the spec's own host says so; one it laid at a registry
		* names every registry asked when there were several.
		*/
		function failureText(failure, t, install) {
			if (failure === null) return t("installFailureGeneric");
			if (failure.code === "incompatible-version") {
				const incompatible = failure.incompatible === void 0 ? {} : { incompatible: failure.incompatible };
				return managementText({
					code: failure.code,
					installing: true,
					...incompatible
				}, t);
			}
			if (failure.kind === "build-blocked" && !failure.pendingBuilds?.length) return t("installFailureBuildBlockedManual");
			const host = install?.subject?.host;
			if (failure.failedAt === "spec-host" && host !== void 0) return t("installFailureNetworkHost", { host });
			const asked = install?.attempts?.registries ?? [];
			if (failure.failedAt === "registry" && (failure.kind === "network" || failure.kind === "timeout") && asked.length > 1) return t("installFailureNetworkAll", { registries: registryList(asked, t, install?.registries?.resolved ?? null) });
			if (failure.kind !== void 0) return t(FAILURE_KIND_KEYS[failure.kind]);
			if (failure.code !== void 0) return managementText({
				code: failure.code,
				diagnostic: failure.reason
			}, t);
			return failure.reason === "" ? t("installFailureGeneric") : failure.reason;
		}
		/** The package the install is about: its name, one-liner, and version, as the Host read them before installing. */
		function SubjectCard({ subject, t }) {
			const title = subject.name ?? subject.spec;
			const kindKey = SUBJECT_KIND_KEYS[subject.kind];
			const description = subject.description ?? (kindKey === void 0 ? void 0 : t(kindKey));
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginManagerPage_module_css_default.subject,
				"data-install-subject": subject.spec,
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: PluginManagerPage_module_css_default.subjectName,
						children: title
					}),
					description === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
						className: PluginManagerPage_module_css_default.subjectDesc,
						children: description
					}),
					subject.version === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
						className: PluginManagerPage_module_css_default.subjectMeta,
						children: t("installVersion", { version: subject.version })
					})
				]
			});
		}
		/** Track one install field's composition, including Safari's 10ms post-composition Enter window. */
		function useInstallComposition(active) {
			const composition = (0, react.useRef)({
				active: false,
				until: 0
			});
			(0, react.useEffect)(() => {
				composition.current = {
					active: false,
					until: 0
				};
			}, [active]);
			return {
				onCompositionStart: () => {
					composition.current.active = true;
				},
				onCompositionEnd: () => {
					composition.current = {
						active: false,
						until: Date.now() + 10
					};
				},
				onBlur: () => {
					composition.current = {
						active: false,
						until: 0
					};
				},
				isComposing: (event) => event.isComposing || Reflect.get(event, "keyCode") === 229 || composition.current.active || Date.now() < composition.current.until
			};
		}
		/**
		* The install dialog: the spec and its check, then the installing, installed,
		* and failed screens over the same subject card. A failed run that left
		* install scripts undecided shows them for approval in place of plain retry.
		*/
		function InstallDialog({ install, t, onClose, onEditSpec, onRun, onCancel, onReconcile, onToggleDetails, onEnableNow, onApproveBuilds, onToggleRegistry, onChooseRegistry, onChangeRegistry, onUseGithubMirror }) {
			const errorId = (0, react.useId)();
			const templateHintId = (0, react.useId)();
			const guideId = (0, react.useId)();
			const approvalId = (0, react.useId)();
			const registryId = (0, react.useId)();
			const registryErrorId = (0, react.useId)();
			const [guideOpen, setGuideOpen] = (0, react.useState)(false);
			const [customRegistryDraft, setCustomRegistryDraft] = (0, react.useState)("");
			const { phase } = install;
			const registryToggleRef = (0, react.useRef)(null);
			const registryPanelRef = (0, react.useRef)(null);
			const registryCustomRef = (0, react.useRef)(null);
			const registryShown = install.registryOpen && phase === "idle";
			const specComposition = useInstallComposition(install.open && phase === "idle");
			const registryComposition = useInstallComposition(install.open && registryShown);
			const registryPosition = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open: registryShown,
				anchorRef: registryToggleRef,
				panelRef: registryPanelRef,
				align: "end",
				gap: 6,
				margin: 12
			});
			const registryReady = registryShown && registryPosition !== null;
			(0, react.useEffect)(() => {
				if (registryReady && install.registryError) registryCustomRef.current?.focus();
			}, [registryReady, install.registryError]);
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(registryToggleRef, registryShown, onToggleRegistry, registryPanelRef);
			(0, react.useEffect)(() => {
				if (!registryShown) return;
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					onToggleRegistry();
				};
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [registryShown, onToggleRegistry]);
			if (githubRecoveryRegistry(install) !== void 0) {
				const anotherWay = asksMirror(install);
				return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: install.open,
					onClose,
					title: t(install.failure?.kind === "timeout" ? "installGithubTimeoutTitle" : "installGithubFailedTitle"),
					closeLabel: t("close"),
					description: t("installGithubFailedDescription"),
					footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: onClose,
						children: t("cancel")
					}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						autoFocus: true,
						onClick: () => {
							if (anotherWay) setGuideOpen(true);
							onUseGithubMirror();
						},
						children: t(anotherWay ? "installTryAnotherWay" : "installUseGithubMirror")
					})] })
				});
			}
			if (phase === "idle" || phase === "checking") {
				const checking = phase === "checking";
				const empty = install.spec.trim() === "";
				const choice = install.registry;
				const resolved = install.registries?.resolved ?? null;
				const chosenTitle = choice.kind === "custom" ? t("registryCustom") : registryText(choice.registry, t, resolved).name;
				const inputProblem = install.inputError;
				const askedByCheck = inputProblem?.registries ?? [];
				const inputSentence = inputProblem === null ? null : inputProblem.problem === "network" && askedByCheck.length > 1 ? t("installProblemNetworkAll", { registries: registryList(askedByCheck, t, resolved) }) : t(INPUT_PROBLEM_KEYS[inputProblem.problem], { reason: inputProblem.reason });
				const templateHint = install.spec === "https://github.com/author/dsh-plugin" ? t("installGitTemplateHint") : install.spec === "/Users/name/my-plugin" ? t("installPathTemplateHint") : null;
				return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: install.open,
					onClose,
					title: t("installTitle"),
					closeLabel: t("close"),
					...install.mirrorRecovery ? {} : { description: t("installDescription") },
					className: PluginManagerPage_module_css_default.installDialog,
					contentClassName: PluginManagerPage_module_css_default.installContent,
					footer: (0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.installFooter,
						children: [(0, react_jsx_runtime.jsxs)("p", {
							className: PluginManagerPage_module_css_default.installSafety,
							role: "note",
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, {
								size: 14,
								"aria-hidden": "true"
							}), (0, react_jsx_runtime.jsxs)("span", {
								className: PluginManagerPage_module_css_default.installSafetyText,
								children: [(0, react_jsx_runtime.jsx)("span", { children: t("installGuideSafety") }), (0, react_jsx_runtime.jsx)("span", { children: t("installUpgradeNotice") })]
							})]
						}), (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							className: PluginManagerPage_module_css_default.wide,
							disabled: checking || empty,
							"aria-busy": checking,
							onClick: onRun,
							children: [checking ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }) : null, t(checking ? "installChecking" : "installRun")]
						})]
					}),
					children: (0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.installBody,
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								className: PluginManagerPage_module_css_default.installField,
								children: (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									autoFocus: install.mirrorRecovery === true,
									value: install.spec,
									placeholder: t("installSpecPlaceholder"),
									disabled: checking,
									"aria-label": t(install.mirrorRecovery ? "installPackageLabel" : "installSpecLabel"),
									"aria-invalid": install.inputError !== null,
									"aria-describedby": inputSentence !== null ? errorId : templateHint !== null ? templateHintId : void 0,
									onChange: (event) => {
										onEditSpec(event.currentTarget.value);
									},
									onCompositionStart: specComposition.onCompositionStart,
									onCompositionEnd: specComposition.onCompositionEnd,
									onBlur: specComposition.onBlur,
									onKeyDown: (event) => {
										if (specComposition.isComposing(event.nativeEvent)) return;
										if (event.key === "Enter" && !empty && !checking) onRun();
									}
								})
							}),
							inputSentence === null ? null : (0, react_jsx_runtime.jsx)("p", {
								id: errorId,
								className: PluginManagerPage_module_css_default.inputError,
								role: "alert",
								children: inputSentence
							}),
							inputSentence === null && templateHint !== null ? (0, react_jsx_runtime.jsx)("p", {
								id: templateHintId,
								className: PluginManagerPage_module_css_default.templateHint,
								role: "status",
								children: templateHint
							}) : null,
							(0, react_jsx_runtime.jsxs)("div", {
								className: PluginManagerPage_module_css_default.optionsRow,
								children: [(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: PluginManagerPage_module_css_default.guideToggle,
									"aria-expanded": guideOpen,
									"aria-controls": guideId,
									onClick: () => {
										setGuideOpen((open) => !open);
									},
									children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, {
										className: PluginManagerPage_module_css_default.guideChevron,
										"aria-hidden": "true"
									}), (0, react_jsx_runtime.jsx)("span", { children: t(guideOpen ? "installGuideHide" : "installGuideToggle") })]
								}), (0, react_jsx_runtime.jsxs)("button", {
									ref: registryToggleRef,
									type: "button",
									className: PluginManagerPage_module_css_default.registryToggle,
									"aria-expanded": install.registryOpen,
									"aria-controls": registryId,
									"aria-haspopup": "dialog",
									disabled: checking,
									onClick: onToggleRegistry,
									children: [
										(0, react_jsx_runtime.jsx)("span", { children: t("registryToggle") }),
										" ",
										(0, react_jsx_runtime.jsx)("span", {
											className: PluginManagerPage_module_css_default.registryChosen,
											children: chosenTitle
										}),
										(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, {
											className: PluginManagerPage_module_css_default.guideChevron,
											"aria-hidden": "true"
										})
									]
								})]
							}),
							guideOpen ? (0, react_jsx_runtime.jsx)("div", {
								id: guideId,
								className: PluginManagerPage_module_css_default.guide,
								"data-install-guide": true,
								children: (0, react_jsx_runtime.jsx)("ol", {
									className: PluginManagerPage_module_css_default.guideList,
									children: GUIDE_EXAMPLES.map(({ key, titleKey, exampleKey, hintKey }) => (0, react_jsx_runtime.jsxs)("li", {
										className: PluginManagerPage_module_css_default.guideItem,
										children: [(0, react_jsx_runtime.jsxs)("div", {
											className: PluginManagerPage_module_css_default.guideMain,
											children: [
												(0, react_jsx_runtime.jsx)("span", {
													className: PluginManagerPage_module_css_default.guideTitle,
													children: t(titleKey)
												}),
												(0, react_jsx_runtime.jsx)("span", {
													className: PluginManagerPage_module_css_default.guideHint,
													children: t(hintKey)
												}),
												(0, react_jsx_runtime.jsxs)("span", {
													className: PluginManagerPage_module_css_default.guideExample,
													children: [(0, react_jsx_runtime.jsx)("span", {
														className: PluginManagerPage_module_css_default.guideExampleLabel,
														children: t("installGuideExampleLabel")
													}), (0, react_jsx_runtime.jsx)("code", { children: t(exampleKey) })]
												})
											]
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											"aria-label": t("installGuideFillAria", { example: t(exampleKey) }),
											disabled: checking,
											onClick: () => {
												onEditSpec(t(exampleKey));
											},
											children: t("installGuideFill")
										})]
									}, key))
								})
							}) : null,
							registryShown ? (0, react_dom.createPortal)((0, react_jsx_runtime.jsxs)("fieldset", {
								ref: registryPanelRef,
								id: registryId,
								className: PluginManagerPage_module_css_default.registry,
								style: registryPosition ?? {
									visibility: "hidden",
									left: 0,
									top: 0
								},
								"data-install-registry": true,
								"aria-label": t("registryLegend"),
								onKeyDown: (event) => {
									if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
									event.preventDefault();
									event.stopPropagation();
									const radio = event.currentTarget.querySelector("input[type=\"radio\"]:checked");
									const field = registryCustomRef.current;
									if (event.shiftKey && event.target === field) radio?.focus();
									else if (!event.shiftKey && event.target !== field) field?.focus();
									else {
										onToggleRegistry();
										registryToggleRef.current?.focus();
									}
								},
								children: [offeredRegistries(install.registries).map((registry) => {
									const checked = choice.kind === "offered" && choice.registry === registry;
									return (0, react_jsx_runtime.jsxs)("label", {
										className: PluginManagerPage_module_css_default.registryOption,
										"data-checked": checked,
										children: [(0, react_jsx_runtime.jsx)("input", {
											type: "radio",
											name: registryId,
											checked,
											onChange: () => {
												if (choice.kind === "custom") setCustomRegistryDraft(choice.url);
												onChooseRegistry({
													kind: "offered",
													registry
												});
											}
										}), (0, react_jsx_runtime.jsx)("span", {
											className: PluginManagerPage_module_css_default.registryTitle,
											children: registryOption(registry, t, resolved)
										})]
									}, registry ?? "");
								}), (0, react_jsx_runtime.jsxs)("div", {
									className: PluginManagerPage_module_css_default.registryOption,
									"data-checked": choice.kind === "custom",
									onClick: (event) => {
										if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
										registryCustomRef.current?.focus();
									},
									children: [
										(0, react_jsx_runtime.jsxs)("label", {
											className: PluginManagerPage_module_css_default.registryCustomPick,
											children: [(0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: registryId,
												checked: choice.kind === "custom",
												onChange: () => {
													onChooseRegistry({
														kind: "custom",
														url: customRegistryDraft
													});
													registryCustomRef.current?.focus();
												}
											}), (0, react_jsx_runtime.jsx)("span", {
												className: PluginManagerPage_module_css_default.registryTitle,
												children: (0, react_jsx_runtime.jsx)("span", { children: t("registryCustom") })
											})]
										}),
										(0, react_jsx_runtime.jsx)("input", {
											ref: registryCustomRef,
											type: "text",
											className: PluginManagerPage_module_css_default.registryCustomField,
											"aria-label": t("registryCustom"),
											placeholder: t("registryCustomPlaceholder"),
											value: choice.kind === "custom" ? choice.url : customRegistryDraft,
											"aria-invalid": install.registryError,
											"aria-describedby": install.registryError ? registryErrorId : void 0,
											onFocus: () => {
												if ((0, _deepseek_ai_dsh_client_ui_primitives.pointerModality)() && choice.kind !== "custom") onChooseRegistry({
													kind: "custom",
													url: customRegistryDraft
												});
											},
											onChange: (event) => {
												onChooseRegistry({
													kind: "custom",
													url: event.currentTarget.value
												});
											},
											onCompositionStart: registryComposition.onCompositionStart,
											onCompositionEnd: registryComposition.onCompositionEnd,
											onBlur: registryComposition.onBlur,
											onKeyDown: (event) => {
												if (registryComposition.isComposing(event.nativeEvent)) return;
												if (event.key === "Enter" && !empty) onRun();
											}
										}),
										install.registryError ? (0, react_jsx_runtime.jsx)("p", {
											id: registryErrorId,
											className: PluginManagerPage_module_css_default.inputError,
											role: "alert",
											children: t("registryCustomInvalid")
										}) : null,
										(0, react_jsx_runtime.jsx)("span", {
											className: PluginManagerPage_module_css_default.registryHint,
											children: t("registryCustomHint")
										})
									]
								})]
							}), document.body) : null
						]
					})
				});
			}
			const heading = t(SCREEN_TITLE_KEYS[phase]);
			const pending = isInstallPending(phase);
			const cancellable = phase === "starting" || phase === "running" || phase === "unconfirmed";
			const stoppable = cancellable || phase === "failed" || phase === "unknown";
			const failure = install.failure;
			const uncertainty = failure?.uncertainty;
			const uncertaintyText = failure?.uncertainty === void 0 ? null : t({
				result: "installResultUnconfirmed",
				cancellation: phase === "applying" ? "installApplyingCancellationError" : "installCancelUnconfirmed",
				acceptance: "installAwaitingAcceptance"
			}[failure.uncertainty], { reason: failure.reason });
			const pendingBuilds = phase === "failed" ? install.failure?.pendingBuilds ?? [] : [];
			const approvable = pendingBuilds.length > 0;
			const firstRun = install.runs[0];
			const asked = install.attempts !== null && install.attempts.registries.length > 1 ? install.attempts : null;
			const current = asked === null ? void 0 : asked.registries.at(-1);
			const previous = asked === null ? void 0 : asked.registries.at(-2);
			const resolved = install.registries?.resolved ?? null;
			const attemptLine = pending && asked !== null && current !== void 0 && previous !== void 0 ? t("installAttempt", {
				previous: registryText(previous, t, resolved).name,
				registry: registryText(current, t, resolved).name,
				index: String(asked.registries.length),
				total: String(asked.total)
			}) : null;
			const changeable = phase === "failed" && !approvable && install.failure?.failedAt === "registry";
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: install.open,
				onClose,
				title: heading,
				headless: true,
				className: PluginManagerPage_module_css_default.installDialog,
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: PluginManagerPage_module_css_default.wizard,
					"data-install-phase": phase,
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.wizardHead,
						children: [phase === "done" ? (0, react_jsx_runtime.jsx)("span", {}) : (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: PluginManagerPage_module_css_default.wizardBack,
							"aria-label": t(pending ? "installCancelAndEdit" : "installEditAria"),
							disabled: !stoppable,
							onClick: onCancel,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineMedium, { "aria-hidden": "true" }), (0, react_jsx_runtime.jsx)("span", { children: t(pending ? "installCancelAndEdit" : "installEdit") })]
						}), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: PluginManagerPage_module_css_default.wizardClose,
							"aria-label": t(cancellable ? "installCloseCancels" : "close"),
							onClick: onClose,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineMedium, { size: 14 })
						})]
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.wizardScroll,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: PluginManagerPage_module_css_default.wizardHero,
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: PluginManagerPage_module_css_default.wizardIcon,
										"data-state": pending ? "ongoing" : phase === "done" ? "done" : "error",
										"aria-hidden": "true",
										children: pending ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
											state: "ongoing",
											size: 28
										}) : phase === "done" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckCircleFillRegular, { size: 28 }) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 28 })
									}),
									(0, react_jsx_runtime.jsx)("h2", {
										className: PluginManagerPage_module_css_default.wizardTitle,
										role: phase === "failed" ? "alert" : "status",
										children: heading
									}),
									phase === "failed" ? (0, react_jsx_runtime.jsx)("p", {
										className: PluginManagerPage_module_css_default.wizardSub,
										children: failureText(install.failure, t, install)
									}) : null,
									attemptLine === null ? null : (0, react_jsx_runtime.jsx)("p", {
										className: PluginManagerPage_module_css_default.wizardSub,
										children: attemptLine
									}),
									uncertaintyText === null ? null : (0, react_jsx_runtime.jsx)("p", {
										className: PluginManagerPage_module_css_default.wizardSub,
										role: "alert",
										children: uncertaintyText
									}),
									phase === "unknown" ? (0, react_jsx_runtime.jsx)("p", {
										className: PluginManagerPage_module_css_default.wizardSub,
										children: t("installUnknownDescription")
									}) : null
								]
							}),
							install.subject === null ? null : (0, react_jsx_runtime.jsx)(SubjectCard, {
								subject: install.subject,
								t
							}),
							approvable ? (0, react_jsx_runtime.jsxs)("section", {
								className: PluginManagerPage_module_css_default.approval,
								role: "group",
								"aria-labelledby": approvalId,
								"data-install-approval": true,
								children: [
									(0, react_jsx_runtime.jsx)("h3", {
										id: approvalId,
										className: PluginManagerPage_module_css_default.approvalTitle,
										children: t("installApprovalTitle")
									}),
									(0, react_jsx_runtime.jsx)("p", {
										className: PluginManagerPage_module_css_default.approvalText,
										children: t("installApprovalDescription")
									}),
									(0, react_jsx_runtime.jsx)("ul", {
										className: PluginManagerPage_module_css_default.approvalList,
										children: pendingBuilds.map((name) => (0, react_jsx_runtime.jsx)("li", { children: (0, react_jsx_runtime.jsx)("code", { children: name }) }, name))
									}),
									(0, react_jsx_runtime.jsx)("p", {
										className: PluginManagerPage_module_css_default.approvalText,
										children: t("installApprovalConsequence")
									}),
									(0, react_jsx_runtime.jsx)("p", {
										className: PluginManagerPage_module_css_default.approvalCaution,
										children: t("installApprovalCaution")
									}),
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										className: PluginManagerPage_module_css_default.wide,
										onClick: onApproveBuilds,
										children: t("installApproveAndRetry")
									})
								]
							}) : null,
							phase === "done" && install.installed === null ? (0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.result,
								role: "status",
								children: t("installDoneNothing")
							}) : null,
							phase === "done" && install.restartRequired ? (0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.resultWarn,
								role: "status",
								children: t("installDoneRestart")
							}) : null,
							phase === "done" && install.approvedBuilds.length > 0 ? (0, react_jsx_runtime.jsx)("p", {
								className: PluginManagerPage_module_css_default.result,
								role: "status",
								children: t("installDoneApproved", { names: install.approvedBuilds.join(", ") })
							}) : null,
							(0, react_jsx_runtime.jsxs)("div", {
								className: PluginManagerPage_module_css_default.wizardFoot,
								children: [
									(0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: PluginManagerPage_module_css_default.detailsToggle,
										"aria-expanded": install.detailsOpen,
										onClick: onToggleDetails,
										children: [(0, react_jsx_runtime.jsx)("span", { children: t(install.detailsOpen ? "installDetailsHide" : "installDetailsShow") }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, {
											className: PluginManagerPage_module_css_default.detailsChevron,
											"aria-hidden": "true"
										})]
									}),
									uncertainty === "result" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										className: PluginManagerPage_module_css_default.footAction,
										onClick: onReconcile,
										children: t("installReconcile")
									}) : null,
									pending ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										className: PluginManagerPage_module_css_default.footAction,
										disabled: !cancellable,
										onClick: onCancel,
										children: t(phase === "cancelling" ? "installCancelling" : "installCancel")
									}) : null,
									phase === "failed" && !approvable ? (0, react_jsx_runtime.jsxs)("span", {
										className: PluginManagerPage_module_css_default.wizardActions,
										children: [changeable ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											className: PluginManagerPage_module_css_default.footAction,
											onClick: onChangeRegistry,
											children: t("installChangeRegistry")
										}) : null, (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "primary",
											size: "sm",
											className: PluginManagerPage_module_css_default.footAction,
											onClick: onRun,
											children: t("installRetry")
										})]
									}) : null
								]
							}),
							install.detailsOpen ? (0, react_jsx_runtime.jsxs)("div", {
								className: PluginManagerPage_module_css_default.detailsBody,
								children: [(0, react_jsx_runtime.jsx)("p", {
									className: PluginManagerPage_module_css_default.installLocation,
									children: firstRun === void 0 ? t("terminalNoOutput") : t("installLocation", { dir: firstRun.cwd })
								}), install.runs.map((run, index) => {
									const registry = asked?.registries[index];
									return (0, react_jsx_runtime.jsxs)("div", {
										className: PluginManagerPage_module_css_default.run,
										children: [registry === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
											className: PluginManagerPage_module_css_default.attemptBadge,
											children: t("installAttemptBadge", {
												index: String(index + 1),
												registry: registryText(registry, t, resolved).name
											})
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TerminalBlock, {
											command: run.command,
											output: run.output,
											running: run.exitCode === void 0,
											exitCode: run.exitCode,
											maxLines: INSTALL_TERMINAL_LINES,
											labels: {
												...terminalLabels(t),
												...phase === "cancelling" ? { failed: t("installCancelledShort") } : {}
											},
											className: PluginManagerPage_module_css_default.terminal
										})]
									}, run.jobId);
								})]
							}) : null,
							phase !== "done" ? null : install.installed !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								className: PluginManagerPage_module_css_default.wide,
								disabled: install.enabling,
								"aria-busy": install.enabling,
								onClick: onEnableNow,
								children: t("installEnableNow")
							}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								className: PluginManagerPage_module_css_default.wide,
								onClick: onClose,
								children: t("installClose")
							})
						]
					})]
				})
			});
		}
		/** The confirmation an uninstall waits on. */
		function ConfirmDialog({ name, t, onConfirm, onCancel }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: onCancel,
				title: t("confirmUninstallTitle", { name }),
				closeLabel: t("close"),
				description: t("confirmUninstallDescription"),
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: onCancel,
					children: t("cancel")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					className: PluginManagerPage_module_css_default.dangerButton,
					onClick: onConfirm,
					children: t("confirmUninstall")
				})] })
			});
		}
		//#region plugin-library: the tuning panel
		/**
		* Every number this page dresses the market with is a CSS custom property, so
		* tuning only moves a variable: each one keeps a usable default in the
		* stylesheet, and a broken panel cannot blank the page.
		*/
		const TUNE_STORAGE_KEY = "dspl.tune.v1";
		const TUNE_TOKENS = [
			{
				id: "pageGap",
				varName: "--dspl-page-gap",
				labelKey: "tunePageGap",
				group: "page",
				def: 32,
				min: 8,
				max: 64,
				step: 1,
				suffix: "px"
			},
			{
				id: "pageMax",
				varName: "--dspl-page-max",
				labelKey: "tunePageMax",
				group: "page",
				def: 960,
				min: 600,
				max: 1400,
				step: 20,
				suffix: "px"
			},
			{
				id: "pagePadX",
				varName: "--dspl-page-pad-x",
				labelKey: "tunePagePadX",
				group: "page",
				def: 48,
				min: 0,
				max: 96,
				step: 2,
				suffix: "px"
			},
			{
				id: "pagePadBottom",
				varName: "--dspl-page-pad-bottom",
				labelKey: "tunePagePadBottom",
				group: "page",
				def: 48,
				min: 0,
				max: 120,
				step: 4,
				suffix: "px"
			},
			{
				id: "tabsTop",
				varName: "--dspl-tabs-top",
				labelKey: "tuneTabsTop",
				group: "tabs",
				def: 28,
				min: 0,
				max: 80,
				step: 2,
				suffix: "px"
			},
			{
				id: "tabsOverlap",
				varName: "--dspl-tabs-overlap",
				labelKey: "tuneTabsOverlap",
				group: "tabs",
				def: 16,
				min: 0,
				max: 40,
				step: 1,
				suffix: "px"
			},
			{
				id: "tabsGap",
				varName: "--dspl-tabs-gap",
				labelKey: "tuneTabsGap",
				group: "tabs",
				def: 8,
				min: 0,
				max: 24,
				step: 1,
				suffix: "px"
			},
			{
				id: "headRadius",
				varName: "--dspl-head-radius",
				labelKey: "tuneHeadRadius",
				group: "band",
				def: 12,
				min: 0,
				max: 28,
				step: 1,
				suffix: "px"
			},
			{
				id: "headPadBottom",
				varName: "--dspl-head-pad-bottom",
				labelKey: "tuneHeadPadBottom",
				group: "band",
				def: 6,
				min: 0,
				max: 32,
				step: 1,
				suffix: "px"
			},
			{
				id: "headGap",
				varName: "--dspl-head-gap",
				labelKey: "tuneHeadGap",
				group: "band",
				def: 24,
				min: 0,
				max: 64,
				step: 1,
				suffix: "px"
			},
			{
				id: "searchHeight",
				varName: "--dspl-search-height",
				labelKey: "tuneSearchHeight",
				group: "search",
				def: 36,
				min: 26,
				max: 52,
				step: 1,
				suffix: "px"
			},
			{
				id: "searchPadX",
				varName: "--dspl-search-pad-x",
				labelKey: "tuneSearchPadX",
				group: "search",
				def: 12,
				min: 0,
				max: 24,
				step: 1,
				suffix: "px"
			},
			{
				id: "searchRadius",
				varName: "--dspl-search-radius",
				labelKey: "tuneSearchRadius",
				group: "search",
				def: 6,
				min: 0,
				max: 24,
				step: 1,
				suffix: "px"
			},
			{
				id: "searchRowBottom",
				varName: "--dspl-search-row-bottom",
				labelKey: "tuneSearchRowBottom",
				group: "search",
				def: 16,
				min: 0,
				max: 40,
				step: 1,
				suffix: "px"
			},
			{
				id: "chipsGap",
				varName: "--dspl-chips-gap",
				labelKey: "tuneChipsGap",
				group: "chips",
				def: 8,
				min: 0,
				max: 24,
				step: 1,
				suffix: "px"
			},
			{
				id: "chipsPadTop",
				varName: "--dspl-chips-pad-top",
				labelKey: "tuneChipsPadTop",
				group: "chips",
				def: 8,
				min: 0,
				max: 24,
				step: 1,
				suffix: "px"
			},
			{
				id: "chipPadX",
				varName: "--dspl-chip-pad-x",
				labelKey: "tuneChipPadX",
				group: "chips",
				def: 10,
				min: 2,
				max: 24,
				step: 1,
				suffix: "px"
			},
			{
				id: "chipHeight",
				varName: "--dspl-chip-height",
				labelKey: "tuneChipHeight",
				group: "chips",
				def: 24,
				min: 16,
				max: 40,
				step: 1,
				suffix: "px"
			},
			{
				id: "chipFont",
				varName: "--dspl-chip-font",
				labelKey: "tuneChipFont",
				group: "chips",
				def: 12,
				min: 10,
				max: 16,
				step: 0.5,
				suffix: "px"
			},
			{
				id: "noteGap",
				varName: "--dspl-note-gap",
				labelKey: "tuneNoteGap",
				group: "note",
				def: 10,
				min: 0,
				max: 28,
				step: 1,
				suffix: "px"
			},
			{
				id: "noteSize",
				varName: "--dspl-note-size",
				labelKey: "tuneNoteSize",
				group: "note",
				def: 12,
				min: 10,
				max: 16,
				step: 0.5,
				suffix: "px"
			},
			{
				id: "resultsPadTop",
				varName: "--dspl-results-pad-top",
				labelKey: "tuneResultsPadTop",
				group: "results",
				def: 12,
				min: 0,
				max: 40,
				step: 1,
				suffix: "px"
			},
			{
				id: "resultsGap",
				varName: "--dspl-results-gap",
				labelKey: "tuneResultsGap",
				group: "results",
				def: 10,
				min: 0,
				max: 32,
				step: 1,
				suffix: "px"
			},
			{
				id: "cardRadius",
				varName: "--dspl-card-radius",
				labelKey: "tuneCardRadius",
				group: "card",
				def: 12,
				min: 0,
				max: 28,
				step: 1,
				suffix: "px"
			},
			{
				id: "cardPadY",
				varName: "--dspl-card-pad-y",
				labelKey: "tuneCardPadY",
				group: "card",
				def: 12,
				min: 0,
				max: 28,
				step: 1,
				suffix: "px"
			},
			{
				id: "cardPadX",
				varName: "--dspl-card-pad-x",
				labelKey: "tuneCardPadX",
				group: "card",
				def: 14,
				min: 0,
				max: 32,
				step: 1,
				suffix: "px"
			},
			{
				id: "cardGap",
				varName: "--dspl-card-gap",
				labelKey: "tuneCardGap",
				group: "card",
				def: 12,
				min: 0,
				max: 28,
				step: 1,
				suffix: "px"
			},
			{
				id: "groupGap",
				varName: "--dspl-group-gap",
				labelKey: "tuneGroupGap",
				group: "list",
				def: 8,
				min: 0,
				max: 24,
				step: 1,
				suffix: "px"
			},
			{
				id: "listGap",
				varName: "--dspl-list-gap",
				labelKey: "tuneListGap",
				group: "list",
				def: 2,
				min: 0,
				max: 16,
				step: 1,
				suffix: "px"
			},
			{
				id: "groupTitleSize",
				varName: "--dspl-group-title-size",
				labelKey: "tuneGroupTitleSize",
				group: "list",
				def: 14,
				min: 11,
				max: 20,
				step: 0.5,
				suffix: "px"
			},
			{
				id: "pageTitleSize",
				varName: "--dspl-page-title-size",
				labelKey: "tunePageTitleSize",
				group: "list",
				def: 20,
				min: 14,
				max: 30,
				step: 0.5,
				suffix: "px"
			},
			{
				id: "dockWidth",
				varName: "--dspl-dock-width",
				labelKey: "tuneDockWidth",
				group: "dock",
				def: 320,
				min: 240,
				max: 460,
				step: 10,
				suffix: "px"
			},
			{
				id: "dockPad",
				varName: "--dspl-dock-pad",
				labelKey: "tuneDockPad",
				group: "dock",
				def: 16,
				min: 8,
				max: 32,
				step: 1,
				suffix: "px"
			}
		];
		const TUNE_GROUPS = [{ id: "page", labelKey: "tuneGroupPage" }, { id: "tabs", labelKey: "tuneGroupTabs" }, { id: "band", labelKey: "tuneGroupBand" }, { id: "search", labelKey: "tuneGroupSearch" }, { id: "chips", labelKey: "tuneGroupChips" }, { id: "note", labelKey: "tuneGroupNote" }, { id: "results", labelKey: "tuneGroupResults" }, { id: "card", labelKey: "tuneGroupCard" }, { id: "list", labelKey: "tuneGroupList" }, { id: "dock", labelKey: "tuneGroupDock" }];
		/** The defaults the stylesheet already carries. */
		function tuneDefaults() {
			const defaults = {};
			for (const token of TUNE_TOKENS) defaults[token.id] = token.def;
			return defaults;
		}
		/** Defaults merged with whatever this browser kept, clamped to each slider's range. */
		function readTuneValues() {
			const values = tuneDefaults();
			if (typeof window === "undefined" || window.localStorage === void 0) return values;
			try {
				const raw = window.localStorage.getItem(TUNE_STORAGE_KEY);
				if (raw === null) return values;
				const stored = JSON.parse(raw);
				for (const token of TUNE_TOKENS) {
					const value = stored?.[token.id];
					if (typeof value === "number" && Number.isFinite(value)) values[token.id] = Math.min(token.max, Math.max(token.min, value));
				}
			} catch (error) {
				console.warn("[plugin-library] stored tuning values were ignored", error);
			}
			return values;
		}
		/** Write the values onto the document: a default value removes the property so the stylesheet keeps it. */
		function applyTuneValues(values) {
			if (typeof document === "undefined" || document.documentElement === void 0) return;
			const root = document.documentElement.style;
			for (const token of TUNE_TOKENS) {
				const value = values[token.id];
				if (value === void 0 || value === token.def) root.removeProperty(token.varName);
				else root.setProperty(token.varName, value + token.suffix);
			}
		}
		let tuneValues = readTuneValues();
		const tuneListeners = /* @__PURE__ */ new Set();
		function publishTuneValues(next) {
			tuneValues = next;
			applyTuneValues(next);
			if (typeof window !== "undefined" && window.localStorage !== void 0) try {
				window.localStorage.setItem(TUNE_STORAGE_KEY, JSON.stringify(next));
			} catch (error) {
				console.warn("[plugin-library] tuning values were not stored", error);
			}
			for (const listener of [...tuneListeners]) try {
				listener();
			} catch (error) {
				console.error("[plugin-library] tuning listener failed", error);
			}
		}
		function setTuneValue(id, value) {
			publishTuneValues({
				...tuneValues,
				[id]: value
			});
		}
		function resetTuneValues() {
			publishTuneValues(tuneDefaults());
		}
		function useTuneValues() {
			return (0, react.useSyncExternalStore)((listener) => {
				tuneListeners.add(listener);
				return () => {
					tuneListeners.delete(listener);
				};
			}, () => tuneValues, () => tuneValues);
		}
		/** One slider row: what it moves, the slider, and the value it holds. */
		function TuneRow({ token, value, t: translate, onChange }) {
			return (0, react_jsx_runtime.jsxs)("label", {
				className: "dspl_tuneRow",
				children: [(0, react_jsx_runtime.jsx)("span", {
					className: "dspl_tuneLabel",
					children: translate(token.labelKey)
				}), (0, react_jsx_runtime.jsx)("input", {
					className: "dspl_tuneRange",
					type: "range",
					min: token.min,
					max: token.max,
					step: token.step,
					value,
					"data-dspl-tune": token.id,
					onChange: (event) => {
						onChange(token.id, Number(event.target.value));
					}
				}), (0, react_jsx_runtime.jsxs)("span", {
					className: "dspl_tuneValue",
					children: [String(value), token.suffix]
				})]
			});
		}
		/** The tuning dock: every number this page hands the market, on a slider. */
		function TuneDock({ onClose, t: translate }) {
			const values = useTuneValues();
			const [status, setStatus] = (0, react.useState)("");
			const [openGroups, setOpenGroups] = (0, react.useState)({});
			const anyOpen = TUNE_GROUPS.some((group) => openGroups[group.id] === true);
			const toggleAll = () => {
				const next = {};
				for (const group of TUNE_GROUPS) next[group.id] = !anyOpen;
				setOpenGroups(next);
			};
			const exportValues = () => {
				const payload = JSON.stringify({
					key: TUNE_STORAGE_KEY,
					values
				}, null, 2);
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(payload).then((ok) => {
					setStatus(ok ? translate("tuneCopied") : translate("tuneCopyFailed"));
				}, () => {
					setStatus(translate("tuneCopyFailed"));
				});
			};
			return (0, react_jsx_runtime.jsxs)("aside", {
				className: "dspl_dock",
				"data-dspl-tune-dock": "1",
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: "dspl_dockHead",
					children: [(0, react_jsx_runtime.jsx)("h2", {
						className: "dspl_dockTitle",
						children: translate("tuneTitle")
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dspl_dockAction",
						"data-dspl-tune-all": "1",
						title: translate(anyOpen ? "tuneCollapseAll" : "tuneExpandAll"),
						"aria-label": translate(anyOpen ? "tuneCollapseAll" : "tuneExpandAll"),
						onClick: toggleAll,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronsUpDownOutlineRegular, { size: 16 })
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dspl_dockAction",
						"data-dspl-tune-close": "1",
						title: translate("close"),
						"aria-label": translate("close"),
						onClick: onClose,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
					})]
				}), (0, react_jsx_runtime.jsx)("p", {
					className: "dspl_dockIntro",
					children: translate("tuneIntro")
				}), TUNE_GROUPS.map((group) => {
					const tokens = TUNE_TOKENS.filter((token) => token.group === group.id);
					if (tokens.length === 0) return null;
					const isOpen = openGroups[group.id] === true;
					return (0, react_jsx_runtime.jsxs)("section", {
						className: "dspl_dockGroup",
						"data-dspl-tune-group": group.id,
						"data-dspl-tune-group-open": isOpen ? "true" : "false",
						children: [(0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dspl_dockGroupHead",
							"data-dspl-tune-group-toggle": group.id,
							"aria-expanded": isOpen ? "true" : "false",
							onClick: () => {
								setOpenGroups((current) => ({
									...current,
									[group.id]: current[group.id] !== true
								}));
							},
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, {
								className: "dspl_dockChevron",
								size: 12
							}), (0, react_jsx_runtime.jsx)("span", {
								className: "dspl_dockGroupTitle",
								children: translate(group.labelKey)
							}), (0, react_jsx_runtime.jsx)("span", {
								className: "dspl_dockGroupCount",
								children: tokens.length
							})]
						}), isOpen ? (0, react_jsx_runtime.jsx)("div", {
							className: "dspl_dockGroupBody",
							children: tokens.map((token) => (0, react_jsx_runtime.jsx)(TuneRow, {
								token,
								value: values[token.id],
								t: translate,
								onChange: setTuneValue
							}, token.id))
						}) : null]
					}, group.id);
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: "dspl_dockFooter",
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: () => {
							resetTuneValues();
						},
						children: translate("tuneReset")
					}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						onClick: exportValues,
						children: translate("tuneExport")
					})]
				}), (0, react_jsx_runtime.jsx)("p", {
					className: "dspl_tuneNote",
					"data-dspl-tune-status": "1",
					children: status === "" ? translate("tuneNote") : status
				})]
			});
		}
		//#endregion
		/** Market class names end with a stable module suffix; the hash in front changes every build. */
		const MARKET_PARTS = {
			stickyHead: "data-dspl-market-head",
			body: "data-dspl-market-body",
			masonry: "data-dspl-market-flow",
			masonryCol: "data-dspl-market-flow",
			recentRow: "data-dspl-market-flow",
			card: "data-dspl-market-card",
			grid: "data-dspl-market-flow",
			/* The redundant page title row (market name + version + export log) is removed by
			the redesign stylesheet, so it needs a marker of its own. */
			title: "data-dspl-market-title",
			titleRow: "data-dspl-market-title",
			head: "data-dspl-market-top",
			tabs: "data-dspl-market-tabs",
			tab: "data-dspl-market-tab",
			cats: "data-dspl-market-cats",
			catsRow: "data-dspl-market-cats-row",
			catsWrap: "data-dspl-market-cats-wrap",
			cardShots: "data-dspl-market-shots",
			cardShot: "data-dspl-market-shot",
			nm: "data-dspl-market-name",
			byline: "data-dspl-market-byline",
			desc: "data-dspl-market-desc",
			foot: "data-dspl-market-foot",
			footTags: "data-dspl-market-foottags",
			cardAction: "data-dspl-market-action",
			meta: "data-dspl-market-meta",
			installBtn: "data-dspl-market-install"
		};
		//#region plugin-library: the market panel, mounted inside this page
		/**
		* The market panel `dshmarket` hands out through `ctx.provide("market")`,
		* published as an observable so this page can mount it inside its own tab.
		* The market is optional: without it the tab explains itself instead.
		*/
		let marketControl;
		const marketListeners = /* @__PURE__ */ new Set();
		function publishMarket(next) {
			if (marketControl === next) return;
			marketControl = next;
			for (const listener of [...marketListeners]) try {
				listener();
			} catch (error) {
				console.error("[plugin-library] market listener failed", error);
			}
		}
		function useMarketControl() {
			return (0, react.useSyncExternalStore)((listener) => {
				marketListeners.add(listener);
				return () => {
					marketListeners.delete(listener);
				};
			}, () => marketControl, () => void 0);
		}
		/** 市场自己的面板；市场没装载时给出一行说明。 */
		function MarketPanel({ t }) {
			const market = useMarketControl();
			if (market === void 0) return (0, react_jsx_runtime.jsx)("p", {
				className: PluginManagerPage_module_css_default.status,
				role: "status",
				children: t("marketUnavailable")
			});
			return market.render();
		}
		//#endregion
		/** Render the plugin manager: the official plugins and installed bundles, their pages, the install dialog, and the confirmation. */
		function PluginManagerPage(props) {
			const { t, ensure, renderSlot, resolveText } = props;
			const configurations = props.useConfigurations((snapshot) => snapshot.view?.namespaces);
			const formFor = (id) => {
				if (!configurations?.some((view) => view.ns === id)) return void 0;
				const form = props.configForm(id);
				return {
					state: form.getSnapshot(),
					mutate: (ops, revision) => form.mutate(ops, revision)
				};
			};
			const state = props.usePluginManager((snapshot) => snapshot);
			const ledger = props.useConfigLedger((snapshot) => snapshot);
			const view = props.useStore((state) => state.view), { setView } = props.actions;
			const [activation, setActivation] = (0, react.useState)(null);
			const [libraryTab, setLibraryTab] = (0, react.useState)("market");
			const [tuneOpen, setTuneOpen] = (0, react.useState)(false);
			const [openGroups, setOpenGroups] = (0, react.useState)(() => ({
				official: false,
				bundles: true
			}));
			const toggleGroup = (id) => {
				setOpenGroups((current) => ({
					...current,
					[id]: !current[id]
				}));
			};
			/**
			* The market's discover tab keeps its search box in a sticky header that
			* wears no radius. The page tags that header (never a class name, which the
			* market's CSS-module build rehashes on every release) so the stylesheet
			* injected above can round it and give the results below some air.
			*/
			const pageRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (libraryTab !== "market") return void 0;
				const page = pageRef.current;
				if (page === null || page === void 0) return void 0;
				const mark = () => {
					for (const node of page.querySelectorAll("[class]")) {
						const names = node.classList;
						for (let index = 0; index < names.length; index += 1) {
							const name = names[index];
							const cut = name.lastIndexOf("_");
							if (cut < 0) continue;
							const attribute = MARKET_PARTS[name.slice(cut + 1)];
							if (attribute !== void 0 && node.getAttribute(attribute) === null) node.setAttribute(attribute, "");
						}
					}
				};
				let frame = 0;
				const schedule = () => {
					if (frame !== 0) return;
					frame = window.requestAnimationFrame(() => {
						frame = 0;
						mark();
					});
				};
				mark();
				const observer = new MutationObserver(schedule);
				observer.observe(page, {
					childList: true,
					subtree: true
				});
				return () => {
					observer.disconnect();
					if (frame !== 0) window.cancelAnimationFrame(frame);
				};
			}, [libraryTab]);
			(0, react.useEffect)(() => {
				ensure();
			}, [ensure]);
			const { highlight, clearHighlight } = {
				highlight: state.highlight,
				clearHighlight: props.clearHighlight
			};
			(0, react.useEffect)(() => {
				if (highlight === null) return;
				const card = document.querySelector(`[data-plugin-package="${highlight}"]`);
				if (card !== null && typeof card.scrollIntoView === "function") card.scrollIntoView({
					block: "center",
					behavior: "smooth"
				});
				const timer = setTimeout(clearHighlight, HIGHLIGHT_MS);
				return () => {
					clearTimeout(timer);
				};
			}, [highlight, clearHighlight]);
			const noticeLine = state.notice === null || state.notice.kind === "refresh-failed" ? null : noticeText(state.notice, t);
			const available = state.packages.filter((pkg) => !BUILTIN_PROFILE_BUNDLES.has(pkg.name) && (pkg.installed || pkg.optional || pkg.error !== void 0));
			const listed = available.filter((pkg) => !ledger.hiddenBundles?.has(pkg.name));
			const mine = listed.filter((pkg) => pkg.installed || !pkg.optional);
			const official = listed.filter((pkg) => pkg.optional && !pkg.installed);
			const loaded = state.status === "ready" || state.status === "error";
			const refreshing = state.refreshStatus === "refreshing";
			const openPkg = view.kind === "package" || view.kind === "row" ? available.find((pkg) => pkg.name === view.name) : void 0;
			const openItem = view.kind === "item" ? ledger.items.find((item) => item.id === view.id) : void 0;
			const openRow = view.kind === "row" && openPkg !== void 0 ? openPkg.rows.find((row) => row.rowId === view.rowId) : void 0;
			const showsCards = openPkg === void 0 && openItem === void 0;
			const activated = listed.find((pkg) => pkg.name === activation && pkg.enabled && !state.busy.includes(pkg.name));
			const setRowEnabled = (row, enabled) => {
				/* v8 ignore next -- a row without a live entry has its switch disabled */
				if (row.entryId !== void 0) props.setRowEnabled(row.entryId, enabled);
			};
			const configure = (pkg) => ({
				has: (row) => ledger.rows.has(rowConfigKey(pkg.name, row.rowId)),
				open: (row) => {
					setView({
						kind: "row",
						name: pkg.name,
						rowId: row.rowId
					});
				}
			});
			// Expose the existing official component list to composite item details.
			// State, diagnostics and writes stay with this page's native controller.
			const renderComponents = (moduleNames) => {
				const selected = new Set(moduleNames), rows = new Map();
				for (const pkg of state.packages) for (const row of pkg.rows) {
					if (selected.has(row.moduleName)) rows.set(row.entryId ?? row.rowId, row);
				}
				return (0, react_jsx_runtime.jsx)(RowsSection, {
					rows: [...rows.values()], t, resolveText,
					toggle: {
						busy: (row) => row.entryId !== void 0 && state.busy.includes(rowKey(row.entryId)),
						onSetEnabled: setRowEnabled
					}
				});
			};
			const packageCard = (pkg) => (0, react_jsx_runtime.jsx)(PackageCard, {
				pkg,
				renderSlot,
				t,
				resolveText,
				busy: state.busy.includes(pkg.name),
				highlighted: state.highlight === pkg.name,
				onOpen: () => {
					setActivation(null);
					setView({
						kind: "package",
						name: pkg.name
					});
				},
				onSetEnabled: (enabled) => {
					setActivation(enabled ? pkg.name : null);
					props.setEnabled(pkg.name, enabled);
				}
			}, pkg.name);
			const officialCards = [...official.map(packageCard), ...ledger.items.filter((item) => !ledger.hiddenItems?.has(item.id)).map((item) => (0, react_jsx_runtime.jsx)(ItemCard, {
				item,
				t,
				renderSlot,
				onOpen: () => {
					setView({
						kind: "item",
						id: item.id
					});
				}
			}, `item:${item.id}`))];
			const renderGroup = (id, heading, cards) => cards.length === 0 ? null : (0, react_jsx_runtime.jsxs)("section", {
				className: PluginManagerPage_module_css_default.group,
				"data-plugin-scope": "global",
				"data-plugin-group": id,
				"data-plugin-group-open": openGroups[id] ? "true" : "false",
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: PluginManagerPage_module_css_default.groupHead,
					"data-plugin-group-toggle": id,
					"aria-expanded": openGroups[id],
					onClick: () => {
						toggleGroup(id);
					},
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, {
						className: PluginManagerPage_module_css_default.groupChevron,
						"aria-hidden": "true",
						size: 12
					}), (0, react_jsx_runtime.jsx)("h3", {
						className: PluginManagerPage_module_css_default.groupTitle,
						children: heading
					}), (0, react_jsx_runtime.jsx)("span", {
						className: PluginManagerPage_module_css_default.count,
						"data-plugin-count": cards.length,
						children: cards.length
					})]
				}), openGroups[id] ? (0, react_jsx_runtime.jsx)("ul", {
					className: PluginManagerPage_module_css_default.cards,
					children: cards
				}) : null]
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "dspl_shell",
				"data-dspl-dock-open": tuneOpen ? "true" : "false",
				children: [(0, react_jsx_runtime.jsxs)("section", {
					ref: pageRef,
					className: PluginManagerPage_module_css_default.page,
					"data-plugin-panel": true,
					"aria-busy": state.status === "loading" || refreshing,
					children: [
					(0, react_jsx_runtime.jsxs)("header", {
						className: "dspl_head",
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: "dspl_titles",
							children: [(0, react_jsx_runtime.jsx)("h1", {
								className: PluginManagerPage_module_css_default.pageTitle,
								children: t("title")
							}), (0, react_jsx_runtime.jsx)("p", {
								className: "dspl_sub",
								children: t("headSubtitle")
							})]
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 13 }),
							"aria-label": t("refresh"),
							title: t("refresh"),
							disabled: !loaded || refreshing,
							onClick: props.refresh,
							children: t("refresh")
						})]
					}),
					(0, react_jsx_runtime.jsx)(PluginSidebarControl, { renderSlot }),
				(0, react_jsx_runtime.jsxs)("div", {
					className: "dspl_tabsRow",
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedTabs, {
						className: "dspl_libraryTabs",
						label: t("libraryTabsLabel"),
						value: libraryTab,
						onChange: (next) => {
							setLibraryTab(next);
						},
						items: [{
							id: "plugin-library.market",
							value: "market",
							label: t("tabMarket")
						}, {
							id: "plugin-library.installed",
							value: "installed",
							label: t("tabInstalled")
						}]
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dspl_tuneButton",
						"data-dspl-tune-open": "1",
						title: t("tuneOpen"),
						"aria-label": t("tuneOpen"),
						onClick: () => {
							setTuneOpen(true);
						},
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSlidersTwoOutlineRegular, { size: 16 })
					})]
				}),
					libraryTab === "market" ? (0, react_jsx_runtime.jsx)(MarketPanel, { t }) : null,
					libraryTab === "installed" && showsCards ? (0, react_jsx_runtime.jsxs)("header", {
						className: PluginManagerPage_module_css_default.pageHead,
						"data-plugin-page-header": "list",
						"data-window-drag": true,
						children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("h1", {
							className: PluginManagerPage_module_css_default.pageTitle,
							children: t("title")
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: PluginManagerPage_module_css_default.pageIntro,
							children: [(0, react_jsx_runtime.jsx)("span", { children: t("intro") }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("infoDescription"),
								side: "bottom",
								delayMs: 300,
								maxWidth: 300,
								portal: true,
								openOnClick: true,
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									className: PluginManagerPage_module_css_default.infoButton,
									"aria-label": t("infoLabel"),
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInfoOutlineRegular, {
										size: 11,
										"aria-hidden": "true"
									})
								})
							})]
						})] }), libraryTab === "installed" ? (0, react_jsx_runtime.jsxs)("div", {
							className: PluginManagerPage_module_css_default.toolbar,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("refresh"),
								delayMs: 500,
								focusDelayMs: 500,
								side: "bottom",
								portal: true,
								disabled: !loaded || refreshing,
								children: (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: PluginManagerPage_module_css_default.iconButton,
									"aria-label": t("refresh"),
									"aria-busy": refreshing,
									disabled: !loaded || refreshing,
									onClick: props.refresh,
									children: (0, react_jsx_runtime.jsx)("span", {
										className: PluginManagerPage_module_css_default.iconWrap,
										"aria-hidden": "true",
										children: refreshing ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
											state: "ongoing",
											size: 18
										}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, {})
									})
								})
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								className: PluginManagerPage_module_css_default.addButton,
								icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }),
								disabled: !loaded,
								onClick: props.openInstall,
								children: t(state.install.requestId === void 0 ? "addPlugin" : "installViewTask")
							})]
						}) : null]
					}) : null,
					libraryTab === "installed" && showsCards && loaded ? renderSlot("plugins.overview", {
						onOpenBundle: (name) => {
							if (!available.some((pkg) => pkg.name === name)) return;
							setActivation(null);
							setView({ kind: "package", name });
						},
						onOpenItem: (id) => {
							if (!ledger.items.some((item) => item.id === id)) return;
							setActivation(null);
							setView({ kind: "item", id });
						}
					}) : null,
					libraryTab === "installed" && showsCards && state.status === "loading" ? (0, react_jsx_runtime.jsx)(ListSkeleton, { label: t("loading") }) : null,
					libraryTab === "installed" && showsCards && state.status === "unavailable" ? (0, react_jsx_runtime.jsxs)("p", {
						className: `${PluginManagerPage_module_css_default.status} ${PluginManagerPage_module_css_default.statusWithDot}`,
						role: "status",
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "idle" }), t("unavailable")]
					}) : null,
					libraryTab !== "installed" || state.notice === null || noticeLine === null ? null : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: noticeLine,
						icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, {}),
						holdMs: toastHoldMs(noticeLine),
						onDone: props.dismissNotice
					}, state.notice.seq),
					libraryTab === "installed" && !showsCards && state.status === "error" && !refreshing ? (0, react_jsx_runtime.jsxs)("div", {
						className: PluginManagerPage_module_css_default.failure,
						children: [(0, react_jsx_runtime.jsxs)("p", {
							className: PluginManagerPage_module_css_default.statusWithDot,
							role: "alert",
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }), t(state.refreshStatus === "failed" ? "refreshError" : "error")]
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							onClick: props.refresh,
							children: t("retry")
						})]
					}) : null,
					libraryTab === "installed" && loaded && openPkg !== void 0 && openRow !== void 0 ? (0, react_jsx_runtime.jsx)(RowDetail, {
						pkg: openPkg,
						row: openRow,
						form: formFor(openRow.rowId),
						t,
						resolveText,
						renderSlot,
						onBack: () => {
							setView({
								kind: "package",
								name: openPkg.name
							});
						}
					}) : null,
					libraryTab === "installed" && loaded && openPkg !== void 0 && openRow === void 0 ? (0, react_jsx_runtime.jsx)(PackageDetail, {
						pkg: openPkg,
						t,
						resolveText,
						busy: state.busy.includes(openPkg.name),
						rowBusy: (row) => row.entryId !== void 0 && state.busy.includes(rowKey(row.entryId)),
						configured: ledger.bundles.has(openPkg.name),
						configure: configure(openPkg),
						renderSlot,
						onBack: () => {
							setView({ kind: "list" });
						},
						onSetEnabled: (enabled) => {
							props.setEnabled(openPkg.name, enabled);
						},
						onUninstall: () => {
							props.uninstall(openPkg.name);
						},
						onSetRowEnabled: setRowEnabled
					}) : null,
					libraryTab === "installed" && loaded && openItem !== void 0 ? (0, react_jsx_runtime.jsx)(ItemDetail, {
						form: formFor(openItem.id),
						renderComponents,
						item: openItem,
						t,
						renderSlot,
						onBack: () => {
							setView({ kind: "list" });
						}
					}) : null,
					libraryTab === "installed" && loaded && showsCards ? officialCards.length === 0 && mine.length === 0 && state.status !== "error" ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginManagerPage_module_css_default.empty,
						children: t("empty")
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						renderGroup("official", t("officialTitle"), officialCards),
						renderGroup("bundles", t("bundlesTitle"), mine.map(packageCard)),
						state.status === "error" && !refreshing ? (0, react_jsx_runtime.jsxs)("div", {
							className: PluginManagerPage_module_css_default.failure,
							children: [(0, react_jsx_runtime.jsxs)("p", {
								className: PluginManagerPage_module_css_default.statusWithDot,
								role: "alert",
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }), t(state.refreshStatus === "failed" ? "refreshError" : "error")]
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: props.refresh,
								children: t("retry")
							})]
						}) : null
					] }) : null,
					libraryTab === "installed" && showsCards && activated !== void 0 && !state.install.open ? renderSlot("plugins.bundle.activation", {
						packageName: activated.name,
						onDismiss: () => {
							setActivation(null);
						},
						onOpenDetails: () => {
							setActivation(null);
							setView({
								kind: "package",
								name: activated.name
							});
						}
					}, { entryKey: activated.name }) : null,
					(0, react_jsx_runtime.jsx)(InstallDialog, {
						install: state.install,
						t,
						onClose: props.closeInstall,
						onEditSpec: props.editInstallSpec,
						onRun: props.runInstall,
						onCancel: props.cancelInstall,
						onReconcile: props.reconcileInstall,
						onToggleDetails: props.toggleInstallDetails,
						onEnableNow: () => {
							setActivation(state.install.installed);
							props.enableInstalled();
						},
						onApproveBuilds: props.approveBuildsAndRetry,
						onToggleRegistry: props.toggleRegistryOptions,
						onChooseRegistry: props.chooseRegistry,
						onChangeRegistry: props.changeRegistry,
						onUseGithubMirror: props.useGithubMirror
					}),
					state.confirm === null ? null : (0, react_jsx_runtime.jsx)(ConfirmDialog, {
						name: packageText(state.packages.find((pkg) => pkg.name === state.confirm?.packageName) ?? { name: state.confirm.packageName }, resolveText).title,
						t,
						onConfirm: props.confirm,
						onCancel: props.cancelConfirm
					})
					]
				}), tuneOpen ? (0, react_jsx_runtime.jsx)(TuneDock, {
					t,
					onClose: () => {
						setTuneOpen(false);
					}
				}) : null]
			});
		}
		//#endregion
		//#region lib/types/client/PluginRefreshToast.js
		/**
		* Display refresh failures even after navigation leaves the Plugins panel.
		* @param props - shared notice hook, dismissal action, and locale seat.
		* @returns the refresh failure toast, or null for other notices.
		*/
		function PluginRefreshToast({ usePluginManager, dismissNotice, t }) {
			const notice = usePluginManager((state) => state.notice);
			if (notice?.kind !== "refresh-failed") return null;
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				text: noticeText(notice, t),
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, {}),
				onDone: dismissNotice
			}, notice.seq);
		}
		//#endregion
		//#region lib/types/client/PluginsPanelIcon.js
		/**
		* Render the plugin glyph at the size the sidebar asks for.
		* @param props - the sidebar's icon share: the requested edge and whether the panel is selected.
		* @returns the icon element.
		*/
		function PluginsPanelIcon({ size }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPluginPinwheelOutlineRegular, { size });
		}
		//#endregion
		//#region lib/types/client/navigation-store.js
		/** Plugin page selection shared by the page and cross-plugin navigation. */
		/**
		* Create plugin page selection before the first page render.
		* @returns the registration-owned navigation store handle.
		*/
		function createNavigationStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({ view: { kind: "list" } }),
				actions: { setView: (draft, view) => {
					draft.view = view;
				} }
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "pluginManager";
		/** The id shared by the sidebar entry and the main panel it opens. */
		const PANEL_ID = "plugins";
		/** Services required by the sidebar registration and the Remote methods; the inventory says whether the Host manages a profile. */
		/**
		 * Market launcher — ported from the retired `dsh-plugin-market-launcher`.
		 * A sidebar entry above Settings that opens the plugin market page the plugin
		 * manager already renders; it registers one slot and one shortcut, so it needs
		 * nothing from the host. Wrapped in its own closure: the original module keeps
		 * its own namespace, dictionaries and `exports`, and cannot shadow this file.
		 */
		var __marketLauncher = (function () {
			var module = { exports: {} };
			var exports = module.exports;
			Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const slotsContract = require("@deepseek-ai/dsh-client-ui-slots");
		const { useCallback, useEffect, useState } = React;
		const h = React.createElement;
		/** Resolve a slot entry's label whether it is a string or a thunk. */
		const labelOf = (label) => slotsContract.resolveSlotLabel(label);
		/** This package's manifest name; the loader id and the panel key agree. */
		const PACKAGE_NAME = "muciya-dsh-plugin-plugin-library";
		/** Dictionary namespace owned by this plugin. */
		const NS = "marketPanel";
		/** The one sidebar row / main panel key this plugin owns. */
		const PANEL_ID = "market";
		/** Inline style tag identity, so a reload replaces this plugin's CSS instead of stacking it. */
		const CSS_TAG_ID = `${PACKAGE_NAME}/MarketPanel.module.css`;
		/** The settings slot every plugin market contributes its tab to. */
		const TAB_SLOT = "settings.plugins.tab";
		/** The desktop section that owns the market choice. */
		const DESKTOP_SECTION_SLOT = "settings.section";
		const DESKTOP_SECTION_ID = "desktop";
		/** The shortcut that opens the settings modal; its effective binding drives the deep link. */
		const SETTINGS_SHORTCUT_ID = "settings.open";
		/** The settings modal's own anchor: the panel the settings shell marks for shortcut routing. */
		const SETTINGS_MODAL_SELECTOR = '[data-shortcut-modal="settings"]';
		/** The settings section that hosts the market tabs. */
		const PLUGINS_SECTION_ID = "plugins";
		/** How long each deep-link step waits for the surface it needs before reporting failure. */
		const OPEN_STEP_TIMEOUT_MS = 1600;
		/**
		* The two plugin markets this profile can run.
		*
		* `id` is the tab id the market registers in Settings → Plugins, which is
		* also how this page detects whether that market is mounted. Both markets
		* register the same slot and the desktop enables one at a time, so in a
		* normal profile exactly one card reads as mounted.
		*/
		const MARKETS = [
			{
				id: "community-market",
				packageName: "dsh-community-market",
				repo: "github.com/anywhere-labs/deepseek-harness-desktop"
			},
			{
				id: "dsh-market",
				packageName: "dshmarket",
				repo: "github.com/dsh-market/dsh-market"
			}
		];
		//#region locales
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			panel: "插件市场",
			"panel.title": "插件市场",
			"panel.subtitle": "一个 Profile 一次只启用一个市场；下面是设置里的实际挂载状态。",
			"panel.count": "{mounted}/{total} 已挂载",
			"market.community-market.title": "内置市场",
			"market.community-market.blurb": "DSH Desktop 内置的开放市场，随桌面端发布，数据源可自定义。",
			"market.dsh-market.title": "社区市场",
			"market.dsh-market.blurb": "第三方社区市场，目录数据取自 awesome-dsh-plugin。",
			"status.mounted": "已挂载",
			"status.unmounted": "未挂载",
			"row.open": "打开方式",
			"row.open.value": "设置 → {section} → 「选择插件市场」，或按下面的快捷键打开设置",
			"row.open.fallback": "桌面端设置",
			"row.tab": "市场界面",
			"row.tab.value": "设置 → 插件 → 「{label}」",
			"row.tab.missing": "未挂载，设置里暂时没有它的标签页",
			"row.package": "插件包",
			"row.source": "来源",
			"notice.enable": "要启用它：在 设置 → {section} → 「选择插件市场」里选 {name}。切换后桌面端可能要求重启。",
			"notice.both": "两个市场可以同时挂载，但桌面端设置一次只选一个；这里显示的是实际挂载状态。",
			"safety": "目录收录或显示为可安装，不代表安全审核、兼容性保证或推荐；插件安装后会以你的用户权限在本机运行。",
			"action.openMarket": "打开市场界面",
			"open.pending": "正在打开设置里的市场界面…",
			"open.opened": "已打开设置里的市场界面（在上层窗口，按 Esc 可关掉回到本页）。",
			"open.settings": "没能自动打开设置。用下面的方式手动打开即可。",
			"open.section": "已打开设置，但没找到「{section}」分区。",
			"open.tab": "已打开设置 → {section}，但这个市场还没挂载，所以没有它的标签页。",
			"open.no-document": "当前环境没有界面，无法自动打开。",
			"action.plugins": "打开插件页",
			"action.recheck": "重新检测",
			"hint.footer": "已安装插件的启停与卸载在「插件」页完成；市场只负责发现与安装。"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			panel: "Plugin market",
			"panel.title": "Plugin market",
			"panel.subtitle": "A profile enables one market at a time; this is what is actually mounted.",
			"panel.count": "{mounted}/{total} mounted",
			"market.community-market.title": "Built-in market",
			"market.community-market.blurb": "The open market DSH Desktop ships with; its data sources are configurable.",
			"market.dsh-market.title": "Community market",
			"market.dsh-market.blurb": "Third-party community market backed by the awesome-dsh-plugin catalog.",
			"status.mounted": "Mounted",
			"status.unmounted": "Not mounted",
			"row.open": "How to open",
			"row.open.value": "Settings → {section} → “Choose a plugin market”, or press the shortcut below",
			"row.open.fallback": "the desktop settings",
			"row.tab": "Market UI",
			"row.tab.value": "Settings → Plugins → “{label}”",
			"row.tab.missing": "Not mounted, so Settings shows no tab for it yet",
			"row.package": "Package",
			"row.source": "Source",
			"notice.enable": "To enable it: pick {name} under Settings → {section} → “Choose a plugin market”. The desktop may ask for a restart afterwards.",
			"notice.both": "Both markets can be mounted at once, but the desktop setting selects one; the cards report what is actually mounted.",
			"safety": "Being listed or shown as installable is not a security review, compatibility guarantee, or recommendation; an installed plugin runs on this machine with your user rights.",
			"action.openMarket": "Open the market UI",
			"open.pending": "Opening the market UI in Settings…",
			"open.opened": "The market UI is open in Settings (in the window above; press Esc to come back here).",
			"open.settings": "Settings could not be opened automatically. Use the path below.",
			"open.section": "Settings opened, but the “{section}” section was not found.",
			"open.tab": "Opened Settings → {section}, but this market is not mounted, so it has no tab yet.",
			"open.no-document": "This environment has no UI, so it cannot be opened automatically.",
			"action.plugins": "Open the Plugins page",
			"action.recheck": "Re-check",
			"hint.footer": "Enabling, disabling and removing installed plugins happens on the Plugins page; a market only discovers and installs them."
		};
		//#endregion
		//#region styles
		/** Panel styles, scoped by the `dsl-market-` prefix. */
		const css = [
			".dsl-market-page{box-sizing:border-box;width:100%;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);display:flex;overflow:hidden}",
			".dsl-market-scroll{scrollbar-gutter:stable;--dsh-scrollbar-width:9px;--dsh-scrollbar-thumb-border:2px;flex:1;min-height:0;overflow:auto}",
			".dsl-market-content{max-width:820px;margin:0 auto;padding:0 clamp(20px,4vw,40px) 40px}",
			".dsl-market-head{justify-content:space-between;align-items:flex-start;gap:16px;padding-top:28px;display:flex}",
			"[data-platform=darwin] .dsl-market-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}",
			".dsl-market-title{margin:0;font-size:20px;font-weight:500;line-height:28px}",
			".dsl-market-subtitle{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:4px 0 0;font-size:13px;line-height:20px}",
			".dsl-market-count{border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;padding:3px 10px;font-size:12px;line-height:18px}",
			".dsl-market-openState{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:14px 0 0;font-size:12.5px;line-height:19px}",
			".dsl-market-openState[data-outcome=opened]{color:var(--dsw-alias-state-success-secondary)}",
			".dsl-market-open{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);align-items:baseline;gap:14px;margin:22px 0 0;padding:14px 18px;display:flex}",
			".dsl-market-openKey{color:var(--dsw-alias-label-tertiary);flex:none;width:72px;font-size:12px;line-height:20px}",
			".dsl-market-openValue{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;flex:1;min-width:0;margin:0;font-size:13px;line-height:20px}",
			".dsl-market-keys{vertical-align:middle;margin-left:4px;display:inline-flex}",
			".dsl-market-cards{flex-direction:column;gap:12px;margin:16px 0 0;display:flex}",
			".dsl-market-card{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);flex-direction:column;gap:12px;padding:16px 18px;display:flex}",
			".dsl-market-card[data-mounted=true]{border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, var(--dsw-alias-border-l3))}",
			".dsl-market-cardHead{justify-content:space-between;align-items:flex-start;gap:12px;display:flex}",
			".dsl-market-cardTitle{margin:0;font-size:14px;font-weight:500;line-height:22px}",
			".dsl-market-cardPkg{color:var(--dsw-alias-label-caption);overflow-wrap:anywhere;margin:2px 0 0;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11.5px;line-height:16px}",
			".dsl-market-badge{border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;align-items:center;gap:6px;padding:2px 9px;font-size:11.5px;line-height:18px;display:inline-flex}",
			".dsl-market-badge[data-mounted=true]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent);color:var(--dsw-alias-label-primary)}",
			".dsl-market-dot{border-radius:50%;width:6px;height:6px;background:var(--dsw-alias-label-caption);flex:none}",
			".dsl-market-badge[data-mounted=true] .dsl-market-dot{background:var(--dsw-alias-state-success-primary)}",
			".dsl-market-blurb{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px}",
			".dsl-market-rows{flex-direction:column;gap:6px;margin:0;display:flex}",
			".dsl-market-row{align-items:baseline;gap:14px;display:flex}",
			".dsl-market-key{color:var(--dsw-alias-label-tertiary);flex:none;width:72px;font-size:12px;line-height:20px}",
			".dsl-market-value{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;flex:1;min-width:0;margin:0;font-size:13px;line-height:20px}",
			".dsl-market-notice{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;padding:9px 12px;font-size:12.5px;line-height:19px}",
			".dsl-market-safety{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:16px 0 0;padding:10px 12px;font-size:12px;line-height:18px}",
			".dsl-market-actions{flex-wrap:wrap;align-items:center;gap:10px;margin:16px 0 0;display:flex}",
			".dsl-market-hint{color:var(--dsw-alias-label-caption);margin:14px 0 0;font-size:12px;line-height:18px}"
		].join("");
		/** Install the panel stylesheet once per page. */
		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css="${CSS_TAG_ID}"]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = PACKAGE_NAME;
			tag.dataset.pluginCss = CSS_TAG_ID;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region market state
		/**
		* Read what Settings → Plugins currently declares for one market.
		*
		* A mounted market contributes its tab entry, so the tab registry is the
		* mount signal — no market-specific private API is involved. Entries are
		* readable by any plugin (`slots.entries` is the inspection surface, not an
		* owner-only render path), and a market that has not loaded reads as absent
		* rather than throwing.
		* @param slots - the client slots service.
		* @param market - one MARKETS row.
		* @returns `{ mounted, tabLabel }`.
		*/
		function readMarketState(slots, market) {
			const entries = (slots?.entries?.(TAB_SLOT) ?? []).filter((entry) => entry?.options?.id === market.id);
			const entry = entries[entries.length - 1];
			if (entry === undefined) return { mounted: false, tabLabel: undefined };
			return { mounted: true, tabLabel: labelOf(entry.options.label) };
		}
		/** Read both markets' live state, in MARKETS order. */
		function readMarkets(slots) {
			return MARKETS.map((market) => ({ market, ...readMarketState(slots, market) }));
		}
		/** Read the settings shortcut's catalog row, if the command is registered. */
		function readSettingsRow(shortcuts) {
			const rows = shortcuts?.catalog?.getSnapshot?.() ?? [];
			return rows.find((candidate) => candidate?.id === SETTINGS_SHORTCUT_ID);
		}
		/** Read the settings shortcut's display keys, if the command is registered. */
		function readSettingsKeys(shortcuts) {
			const row = readSettingsRow(shortcuts);
			return Array.isArray(row?.keys) ? row.keys : [];
		}
		/** Read the settings shortcut's effective binding (`{ code, modifiers }`, already platform-resolved). */
		function readSettingsBinding(shortcuts) {
			const binding = readSettingsRow(shortcuts)?.binding;
			return binding === null || typeof binding !== "object" ? undefined : binding;
		}
		/** Read the localized label of one settings section. */
		function readSectionLabel(slots, id) {
			const entry = (slots?.entries?.(DESKTOP_SECTION_SLOT) ?? []).find((candidate) => candidate?.options?.id === id);
			return entry === undefined ? undefined : labelOf(entry.options.label);
		}
		/** Read the localized label of the desktop settings section that owns the market choice. */
		function readDesktopSection(slots) {
			return readSectionLabel(slots, DESKTOP_SECTION_ID);
		}
		/** The character a binding's code stands for, for the synthetic keydown's `key`. */
		const KEY_CHARACTERS = { Comma: ",", Period: ".", Slash: "/", Backslash: "\\", Semicolon: ";", Quote: "'", Backquote: "`" };
		/** Build the keydown a user's own settings shortcut would produce. */
		function gestureEvent(KeyboardEventCtor, binding) {
			const modifiers = new Set(binding?.modifiers ?? []);
			const code = typeof binding?.code === "string" ? binding.code : "Comma";
			const key = KEY_CHARACTERS[code] ?? (code.startsWith("Key") ? code.slice(3).toLowerCase() : code);
			return new KeyboardEventCtor("keydown", {
				code,
				key,
				metaKey: modifiers.has("meta"),
				ctrlKey: modifiers.has("control"),
				altKey: modifiers.has("alt"),
				shiftKey: modifiers.has("shift"),
				bubbles: true,
				cancelable: true,
				composed: true
			});
		}
		/** Poll a synchronous read until it yields a value or the step's deadline passes. */
		function waitFor(read, timeoutMs) {
			return new Promise((resolve) => {
				const deadline = Date.now() + timeoutMs;
				const poll = () => {
					let value;
					try {
						value = read();
					} catch {
						value = undefined;
					}
					if (value !== undefined && value !== null && value !== false) {
						resolve(value);
						return;
					}
					if (Date.now() >= deadline) {
						resolve(undefined);
						return;
					}
					setTimeout(poll, 40);
				};
				poll();
			});
		}
		/** Find a button by its rendered label — section and tab rows both render theirs as text. */
		function findLabelledButton(root, label) {
			const wanted = String(label ?? "").trim();
			if (wanted === "") return undefined;
			const buttons = [...root.querySelectorAll("button")];
			return buttons.find((button) => (button.textContent ?? "").trim() === wanted) ?? buttons.find((button) => (button.textContent ?? "").includes(wanted));
		}
		/** Find a tab by its rendered label inside the settings modal. */
		function findTab(root, label) {
			const wanted = String(label ?? "").trim();
			if (wanted === "") return undefined;
			const tabs = [...root.querySelectorAll('[role="tab"]')];
			return tabs.find((tab) => (tab.textContent ?? "").trim() === wanted) ?? tabs.find((tab) => (tab.textContent ?? "").includes(wanted));
		}
		/**
		* Show the market's own UI.
		*
		* The framework offers no API for this — the settings shell store is private
		* and the shortcuts service exposes registration only — so this drives the
		* two paths a user drives: the window keydown the shortcut layer listens for
		* (built from the command's own effective binding, so a remap still works),
		* then the section and tab rows the Settings surface renders, matched by the
		* labels the slots registry reports. Every step is verified and every failure
		* is reported to the caller, so a markup change degrades to a message instead
		* of a silent no-op.
		* @param options - `{ binding, sectionLabel, tabLabel, timeoutMs }`.
		* @returns one of `no-document`, `settings`, `section`, `tab` (section reached), `opened`.
		*/
		async function openMarketUi(options) {
			const { binding, sectionLabel, tabLabel, timeoutMs = OPEN_STEP_TIMEOUT_MS } = options;
			if (typeof document === "undefined" || typeof window === "undefined" || typeof KeyboardEvent === "undefined") return "no-document";
			let modal = document.querySelector(SETTINGS_MODAL_SELECTOR);
			if (modal === null) {
				window.dispatchEvent(gestureEvent(KeyboardEvent, binding));
				modal = await waitFor(() => document.querySelector(SETTINGS_MODAL_SELECTOR), timeoutMs);
				if (modal === undefined) return "settings";
			}
			const section = findLabelledButton(modal, sectionLabel) ?? (await waitFor(() => findLabelledButton(modal, sectionLabel), timeoutMs));
			if (section === undefined) return "section";
			if (section.getAttribute("aria-current") !== "true") section.click();
			const tab = await waitFor(() => findTab(modal, tabLabel), timeoutMs);
			if (tab === undefined) return "tab";
			tab.click();
			return "opened";
		}
		/** The sidebar glyph for the market row. */
		function MarketIcon({ size, active }) {
			return h(active === true ? primitives.IconArchiveOutlineMedium : primitives.IconArchiveOutlineRegular, { size });
		}
		//#endregion
		//#region components
		/** One market card: what it is, whether it is mounted, and where its own UI lives. */
		function MarketCard({ entry, sectionLabel, t }) {
			const { market, mounted, tabLabel } = entry;
			const rows = [
				{
					key: "tab",
					label: t("row.tab"),
					value: mounted ? t("row.tab.value", { label: tabLabel ?? market.packageName }) : t("row.tab.missing")
				},
				{ key: "package", label: t("row.package"), value: market.packageName },
				{ key: "source", label: t("row.source"), value: market.repo }
			];
			return h("section", { className: "dsl-market-card", "data-mounted": mounted ? "true" : "false", "aria-label": t(`market.${market.id}.title`) }, [
				h("div", { className: "dsl-market-cardHead", key: "head" }, [
					h("div", { key: "titles" }, [
						h("h2", { className: "dsl-market-cardTitle", key: "title" }, t(`market.${market.id}.title`)),
						h("p", { className: "dsl-market-cardPkg", key: "pkg" }, market.packageName)
					]),
					h(
						"span",
						{ className: "dsl-market-badge", key: "badge", "data-mounted": mounted ? "true" : "false" },
						h("span", { className: "dsl-market-dot", "aria-hidden": "true" }),
						mounted ? t("status.mounted") : t("status.unmounted")
					)
				]),
				h("p", { className: "dsl-market-blurb", key: "blurb" }, t(`market.${market.id}.blurb`)),
				h(
					"div",
					{ className: "dsl-market-rows", key: "rows" },
					rows.map((row) =>
						h("div", { className: "dsl-market-row", key: row.key }, [
							h("span", { className: "dsl-market-key", key: "key" }, row.label),
							h("p", { className: "dsl-market-value", key: "value" }, row.value)
						])
					)
				),
				mounted ? null : h("p", { className: "dsl-market-notice", key: "notice" }, t("notice.enable", { section: sectionLabel, name: market.packageName }))
			]);
		}
		/**
		* The market page: one card per installable market, the shared way to open
		* the market UI, and the way to the Plugins page. This plugin deliberately
		* renders no market UI of its own — a market's tab belongs to that market,
		* and a slot registration authorizes only its owner to render it.
		* @param props - slot props plus this plugin's injected faces.
		* @returns the panel element tree.
		*/
		function MarketPanel(props) {
			const { slots, layout, shortcuts, t, opener = openMarketUi } = props;
			const [entries, setEntries] = useState(() => readMarkets(slots));
			const [keys, setKeys] = useState(() => readSettingsKeys(shortcuts));
			const [section, setSection] = useState(() => readDesktopSection(slots));
			const [outcome, setOutcome] = useState("pending");
			/** Re-read every live source this page reports on. */
			const refresh = useCallback(() => {
				setEntries(readMarkets(slots));
				setKeys(readSettingsKeys(shortcuts));
				setSection(readDesktopSection(slots));
			}, [slots, shortcuts]);
			useEffect(() => slots.subscribe(TAB_SLOT, refresh), [slots, refresh]);
			useEffect(() => shortcuts.catalog.subscribe(refresh), [shortcuts, refresh]);
			useEffect(() => slots.subscribe(DESKTOP_SECTION_SLOT, refresh), [slots, refresh]);
			/** Show the market's own UI: this page is the entry, the market is the destination. */
			const openMarket = useCallback(() => {
				const target = readMarkets(slots).find((entry) => entry.mounted);
				setOutcome("pending");
				return opener({
					binding: readSettingsBinding(shortcuts),
					sectionLabel: readSectionLabel(slots, PLUGINS_SECTION_ID),
					tabLabel: target === undefined ? undefined : target.tabLabel
				}).then((result) => {
					setOutcome(result);
					return result;
				});
			}, [slots, shortcuts, opener]);
			useEffect(() => {
				void openMarket();
			}, [openMarket]);
			const sectionLabel = section === undefined ? t("row.open.fallback") : section;
			const mounted = entries.filter((entry) => entry.mounted).length;
			const openPlugins = useCallback(() => {
				layout.selectPanel("plugins");
			}, [layout]);
			return h("div", { className: "dsl-market-page" }, [
				h("div", { className: "dsl-market-scroll", key: "scroll" }, [
					h("div", { className: "dsl-market-content", key: "content" }, [
						h("header", { className: "dsl-market-head", key: "head" }, [
							h("div", { key: "titles" }, [
								h("h1", { className: "dsl-market-title", key: "title" }, t("panel.title")),
								h("p", { className: "dsl-market-subtitle", key: "sub" }, t("panel.subtitle"))
							]),
							h("span", { className: "dsl-market-count", key: "count" }, t("panel.count", { mounted, total: entries.length }))
						]),
						h(
							"p",
							{ className: "dsl-market-openState", key: "state", "data-outcome": outcome },
							t(`open.${outcome}`, { section: sectionLabel })
						),
						h(
							"div",
							{ className: "dsl-market-open", key: "open" },
							h("span", { className: "dsl-market-openKey", key: "key" }, t("row.open")),
							h(
								"p",
								{ className: "dsl-market-openValue", key: "value" },
								keys.length === 0
									? t("row.open.value", { section: sectionLabel })
									: h(
											React.Fragment,
											null,
											t("row.open.value", { section: sectionLabel }),
											h("span", { className: "dsl-market-keys" }, h(primitives.ShortcutKeys, { keys }))
										)
							)
						),
						h(
							"div",
							{ className: "dsl-market-cards", key: "cards" },
							entries.map((entry) => h(MarketCard, { key: entry.market.id, entry, sectionLabel, t }))
						),
						h("p", { className: "dsl-market-safety", key: "safety" }, t("safety")),
						h(
							"div",
							{ className: "dsl-market-actions", key: "actions" },
							h(
								primitives.Button,
								{
									variant: "primary",
									size: "sm",
									icon: h(primitives.IconSkillOutlineRegular, { size: 13 }),
									onClick: openMarket
								},
								t("action.openMarket")
							),
							h(
								primitives.Button,
								{
									variant: "outline",
									size: "sm",
									icon: h(primitives.IconPluginPinwheelOutlineRegular, { size: 13 }),
									onClick: openPlugins
								},
								t("action.plugins")
							),
							h(primitives.Button, { variant: "outline", size: "sm", icon: h(primitives.IconRefreshOutlineRegular, { size: 13 }), onClick: refresh }, t("action.recheck"))
						),
						h("p", { className: "dsl-market-hint", key: "hint" }, t("hint.footer")),
						h("p", { className: "dsl-market-hint", key: "both" }, t("notice.both"))
					])
				])
			]);
		}
		//#endregion
		//#region plugin
		/** Services required by this browser plugin. */
		const inject = ["slots", "layout", "locale", "shortcuts"];
		/**
		* Register the single 插件市场 sidebar row and the page it opens.
		* @param ctx - browser plugin context.
		*/
		function apply(ctx) {
			ensureStyles();
			ctx.effect(
				() =>
					ctx.locale.register(NS, {
						zh,
						en
					}),
				"market-entry: dictionaries"
			);
			const t = ctx.locale.bind(NS);
			/**
			 * The market already has a home: the plugin library's own `插件市场` tab. This
			 * port therefore owns no sidebar row — it keeps the one thing the tab cannot
			 * do, a shortcut that lands directly on the market view inside Settings.
			 *
			 * `openMarketUi` drives that the only way the framework allows: the keydown the
			 * shortcut layer listens for (built from the command's own effective binding,
			 * so a remap still works), then the section and tab rows the Settings surface
			 * renders. Registration is wrapped: a reserved binding or a shape the running
			 * Host rejects must cost the shortcut, never the plugin library itself.
			 */
			const openMarket = () => {
				void openMarketUi({
					binding: readSettingsBinding(ctx.shortcuts),
					sectionLabel: readSectionLabel(ctx.slots, PLUGINS_SECTION_ID),
					tabLabel: t("panel")
				}).then((outcome) => {
					if (outcome !== "opened") console.warn(`[market-entry] the market could not be opened (${outcome})`);
				});
			};
			try {
				const off = ctx.shortcuts.register({
					id: "muciya-plugin-library.market.open",
					label: () => t("panel"),
					aliases: ["插件市场", "market"],
					defaults: {
						"web:macos": { code: "KeyM", modifiers: ["Meta", "Shift"] },
						"web:windows": { code: "KeyM", modifiers: ["Control", "Shift"] },
						"web:linux": { code: "KeyM", modifiers: ["Control", "Shift"] }
					},
					run: openMarket
				});
				ctx.effect(() => off, "market-entry: shortcut");
			} catch (error) {
				console.warn(`[market-entry] the market shortcut could not be registered: ${String(error)}`);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		/** Exposed for the package's own offline tests; the Loader ignores unknown exports. */
		exports.__internals = {
			PACKAGE_NAME,
			NS,
			PANEL_ID,
			MARKETS,
			TAB_SLOT,
			SETTINGS_SHORTCUT_ID,
			readMarketState,
			readMarkets,
			readSettingsKeys,
			readSettingsBinding,
			readSectionLabel,
			readDesktopSection,
			gestureEvent,
			openMarketUi,
			findLabelledButton,
			findTab,
			OPEN_STEP_TIMEOUT_MS,
			MarketPanel,
			MarketCard,
			MarketIcon,
			css,
			zh,
			en
		};
			return module.exports;
		})();
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.pluginManager",
			"remote.pluginInventory",
			"remote.pluginRegistryProbe",
			"configForms",
			"layout",
			"shortcuts"
		];
		/**
		* Contribute the Plugins entry to the sidebar with the management page it
		* opens, and keep it current on the Host's change events.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			__marketLauncher.apply(ctx);   // ported market entry (one slot + one shortcut)
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-plugin-manager: dictionaries");
			applyTuneValues(tuneValues);
			const t = ctx.locale.bind(NS);
			const controller = new PluginManagerController(ctx);
			ctx.effect(() => () => {
				controller.dispose();
			}, "ui-plugin-manager: controller");
			ctx.effect(() => {
				const refresh = () => {
					if (controller.getSnapshot().status !== "idle") controller.load();
				};
				const disposers = [
					ctx.remote.$on("plugin-manager/changed", refresh),
					ctx.remote.$on("plugin-manager/install-log", (chunk) => {
						controller.appendLog(chunk);
					}),
					ctx.remote.$on("plugin-manager/install-state", (progress) => {
						controller.installProgress(progress);
					}),
					ctx.on("connection/reset", refresh)
				];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "ui-plugin-manager: host invalidations");
		ctx.effect(() => installFilterRelocation(), "plugin-library: filter relocation");
		ctx.inject(["market"], (marketCtx) => {
				publishMarket(marketCtx.market);
				marketCtx.effect(() => () => {
					publishMarket(void 0);
				}, "ui-plugin-manager: market panel");
			});
			const configLedger = configLedgerSource(ctx);
			const face = controller.inject(configLedger, (text) => ctx.locale.resolveText(text));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "plugin-manager.refresh-toast",
				locale: NS,
				inject: () => ({
					hooks: { pluginManager: face.hooks.pluginManager },
					dismissNotice: face.dismissNotice
				})
			}, PluginRefreshToast));
			ctx.slots.inject("main", function* () {
				const handle = createNavigationStore(), instance = handle.create();
				const store = {
					...handle,
					create: () => instance
				};
				yield ctx.slots.register({
					name: "main",
					key: PANEL_ID,
					locale: NS,
					store,
					inject: () => face,
					children: {
						"plugins.header.leading": { kind: "single", scope: "root" },
						"plugins.overview": { kind: "list", scope: "root" },
						"plugins.bundle.hidden": { kind: "keyed", scope: "root" },
						"plugins.item.hidden": { kind: "keyed", scope: "root" },
						"plugins.bundle.actions": { kind: "keyed", scope: "root" },
						"plugins.item": {
							kind: "list",
							scope: "root"
						},
						"plugins.bundle.activation": {
							kind: "keyed",
							scope: "root"
						},
						"plugins.bundle.config": {
							kind: "keyed",
							scope: "root"
						},
						"plugins.row.config": {
							kind: "keyed",
							scope: "root"
						},
						"plugins.detail.actions": {
							kind: "list",
							scope: "root"
						},
						"plugins.detail.badge": {
							kind: "list",
							scope: "root"
						},
						"plugins.detail.section": {
							kind: "list",
							scope: "root"
						}
					}
				}, PluginManagerPage);
				yield ctx.layout.panelInfo.subscribe(() => {
					if (ctx.layout.panelInfo.getSnapshot().activePanelId !== "plugins") instance.actions.setView({ kind: "list" });
				});
				const disposeNavigation = ctx.reflect.provide("pluginNavigation", { openBundle: (packageName) => {
					ctx.layout.selectPanel(PANEL_ID);
					instance.actions.setView({
						kind: "package",
						name: packageName
					});
				} });
				yield () => {
					disposeNavigation();
				};
			});
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 0,
				label: () => t("panel"),
				locale: NS
			}, PluginsPanelIcon));
			}
		//#endregion
		exports.NS = NS;
		exports.PANEL_ID = PANEL_ID;
		














/** 「筛选」在 dshmarket 里嵌在胶囊行内部，纯 CSS 跨不了层级，这里把它搬到搜索行右端。 */
function installFilterRelocation() {
	if (typeof window === "undefined" || typeof MutationObserver === "undefined") return;
	const MARK = "data-dspl-filter-moved";
	const sweep = () => {
		for (const head of document.querySelectorAll("[data-dspl-market-head]")) {
			const row = head.querySelector("[class*='tabSearchRow']");
			const catsRow = head.querySelector("[class*='catsRow']");
			if (!row || !catsRow) continue;
			if (row.querySelector("[" + MARK + "]")) continue;
			// 只认 FilterMenu 那个锚点：要么它自己就是 button，要么是个只包着一个 button 的薄包装。
			// 不能退化成 el.querySelector("button")——.catsWrap 里全是 chip button，会被整块搬走。
			const anchor = [...catsRow.children].find((el) => {
				if (el.matches("button")) return true;
				const kids = el.children;
				return kids.length === 1 && kids[0].matches && kids[0].matches("button");
			});
			if (!anchor) continue;
			anchor.setAttribute(MARK, "1");
			anchor.style.setProperty("margin", "0 0 0 8px", "important");
			anchor.style.setProperty("flex", "0 0 auto", "important");
			row.appendChild(anchor);
		}
	};
	sweep();
	let timer = 0;
	const observer = new MutationObserver(() => {
		if (timer) return;
		timer = window.setTimeout(() => {
			timer = 0;
			sweep();
		}, 120);
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return () => {
		observer.disconnect();
		if (timer) window.clearTimeout(timer);
	};
}



exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
