window.__ModuleLoader__.load({
	id: "muciya-dsh-plugin-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom_client = require("react-dom/client");
		//#region src/client/usage-store.ts
		/**
		* Browser-side usage store: the overview snapshot polled from the host plus
		* the fetch lifecycle. Section-local: the store lives while the settings
		* section is mounted, so polling only runs while the page is open.
		* @module @linxin666/dsh-usage/client/usage-store
		*/
		/** Create the usage store handle (apply world only; never module-level). */
		function createUsageStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					snapshot: null,
					status: "loading",
					error: null
				}),
				actions: {
					setSnapshot: (draft, snapshot) => {
						draft.snapshot = snapshot;
						draft.status = "ready";
						draft.error = null;
					},
					setState: (draft, status, error) => {
						draft.status = status;
						draft.error = error;
					}
				}
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* dsh-usage locale dictionaries (zh/en). The zh dictionary is the key source;
		* `en` mirrors its full key set (packages/AGENTS.md bilingual discipline).
		* @module @linxin666/dsh-usage/client/locales
		*/
		/** Dictionary namespace this package registers. */
		const NS = "dsh-web-ui-usage";
		/** Chinese copy. */
		const zh = {
			"usage.title": "使用统计",
			"usage.tab.usage": "用量",
			"usage.tab.plans": "个人套餐",
			"usage.refresh": "刷新",
			"usage.refreshing": "刷新中…",
			"usage.updated": "更新于 {time}",
			"usage.loading": "正在加载用量数据…",
			"usage.error": "加载失败：{error}",
			"usage.disabled": "插件已停用：勾选下方「启用插件」即可恢复统计。",
			"usage.current": "当前",
			"usage.today": "今日用量",
			"usage.today.cost": "今日消费（估算）",
			"usage.day.label": "查看日期",
			"usage.day.today": "今日",
			"usage.day.title": "{date} 用量",
			"usage.day.cost": "当日消费（估算）",
			"usage.day.empty": "该日没有用量记录",
			"usage.day.loading": "正在加载该日用量…",
			"usage.day.error": "该日用量加载失败：{error}",
			"usage.peak.on": "DeepSeek 高峰时段：计价 ×2，{time} 结束",
			"usage.peak.off": "DeepSeek 空闲时段：计价为高峰一半，{time} 进入高峰",
			"usage.peak.tag.on": "高峰",
			"usage.peak.tag.off": "空闲",
			"usage.peak.ends": "{time} 结束",
			"usage.peak.starts": "{time} 进入高峰",
			"usage.calls": "{n} 次调用",
			"usage.tokens.total": "总 tokens",
			"usage.tokens.input": "输入",
			"usage.tokens.output": "输出",
			"usage.tokens.cacheRead": "缓存读",
			"usage.tokens.cacheWrite": "缓存写",
			"usage.trend": "近 30 天",
			"usage.noData": "暂无用量数据（统计自插件启用起）",
			"usage.balance": "余额",
			"usage.balance.unsupported": "暂不支持余额查询",
			"usage.balance.noCredential": "未配置凭据",
			"usage.balance.noneConfigured": "没有已配置的提供方",
			"usage.oauth": "OAuth 凭据，不做余额查询",
			"usage.plan.reset": "{date} 重置",
			"usage.plan.noPlan": "未检测到套餐数据",
			"usage.plan.noneConfigured": "没有已配置的套餐类 provider（如 Kimi、GLM、OpenCode Go、MiniMax、Codex 订阅）",
			"usage.plan.windows.5h": "5 小时",
			"usage.plan.windows.week": "每周",
			"usage.plan.windows.month": "每月",
			"usage.provider.error": "查询失败：{error}",
			"usage.errorListSeparator": "；",
			"usage.config.title": "设置",
			"usage.config.enabled": "启用插件",
			"usage.config.pollIntervalSec": "轮询间隔（秒）",
			"usage.config.saveFailed": "保存失败：设置未被接受。",
			"usage.foot.cost": "今日消费",
			"usage.foot.noData": "今日暂无用量",
			"usage.foot.open": "打开使用统计设置",
			"usage.foot.collapse": "收起用量卡片",
			"usage.foot.expand": "展开用量卡片"
		};
		/** English mirror; every zh key present. */
		const en = {
			"usage.title": "Usage Statistics",
			"usage.tab.usage": "Usage",
			"usage.tab.plans": "Plans",
			"usage.refresh": "Refresh",
			"usage.refreshing": "Refreshing…",
			"usage.updated": "Updated {time}",
			"usage.loading": "Loading usage data…",
			"usage.error": "Failed to load: {error}",
			"usage.disabled": "Plugin disabled. Tick \"Enable plugin\" below to resume statistics.",
			"usage.current": "Current",
			"usage.today": "Today",
			"usage.today.cost": "Today spend (estimated)",
			"usage.day.label": "Day",
			"usage.day.today": "Today",
			"usage.day.title": "Usage · {date}",
			"usage.day.cost": "Day spend (estimated)",
			"usage.day.empty": "No usage recorded on this day",
			"usage.day.loading": "Loading that day…",
			"usage.day.error": "Failed to load that day: {error}",
			"usage.peak.on": "DeepSeek peak hours: 2x pricing, ends {time}",
			"usage.peak.off": "DeepSeek off-peak: half of peak pricing, peak returns {time}",
			"usage.peak.tag.on": "Peak",
			"usage.peak.tag.off": "Off-peak",
			"usage.peak.ends": "ends {time}",
			"usage.peak.starts": "peak at {time}",
			"usage.calls": "{n} calls",
			"usage.tokens.total": "Total tokens",
			"usage.tokens.input": "Input",
			"usage.tokens.output": "Output",
			"usage.tokens.cacheRead": "Cache read",
			"usage.tokens.cacheWrite": "Cache write",
			"usage.trend": "Last 30 days",
			"usage.noData": "No usage data yet (counting starts when the plugin is enabled)",
			"usage.balance": "Balance",
			"usage.balance.unsupported": "Balance query not supported",
			"usage.balance.noCredential": "No credential configured",
			"usage.balance.noneConfigured": "No providers configured",
			"usage.oauth": "OAuth credential, no balance query",
			"usage.plan.reset": "resets {date}",
			"usage.plan.noPlan": "No plan data detected",
			"usage.plan.noneConfigured": "No plan-capable provider configured (such as Kimi, GLM, OpenCode Go, MiniMax, Codex subscription)",
			"usage.plan.windows.5h": "5 hours",
			"usage.plan.windows.week": "Weekly",
			"usage.plan.windows.month": "Monthly",
			"usage.provider.error": "Query failed: {error}",
			"usage.errorListSeparator": "; ",
			"usage.config.title": "Settings",
			"usage.config.enabled": "Enable plugin",
			"usage.config.pollIntervalSec": "Poll interval (seconds)",
			"usage.config.saveFailed": "Save failed: the deployment did not accept the setting.",
			"usage.foot.cost": "Today spend",
			"usage.foot.noData": "No usage yet today",
			"usage.foot.open": "Open usage statistics settings",
			"usage.foot.collapse": "Collapse the usage card",
			"usage.foot.expand": "Expand the usage card"
		};
		/**
		* Active dictionary, picked by the document language at call time. The
		* section resolves its copy the same tiny way the pet's DOM-injected surface
		* does (the settings section has no framework locale seat of its own).
		*/
		function dictionary() {
			return (typeof document !== "undefined" ? document.documentElement.lang : "zh").toLowerCase().startsWith("en") ? en : zh;
		}
		/** Translate a key with optional `{name}` template params; missing keys degrade to the key. */
		function t(key, params) {
			let text = dictionary()[key] ?? key;
			if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-usage/src/client/usage.module.css.mjs
		const css = ".cvtkAW_section{color:inherit;flex-direction:column;gap:16px;display:flex}.cvtkAW_header{justify-content:space-between;align-items:center;gap:12px;display:flex}.cvtkAW_currentProvider{opacity:.75;font-size:13px}.cvtkAW_refreshBtn{appearance:none;color:inherit;font:inherit;cursor:pointer;opacity:.85;background:0 0;border:1px solid;border-radius:8px;padding:4px 12px;font-size:12px;transition:opacity .12s,background-color .12s}.cvtkAW_refreshBtn:hover:not(:disabled){opacity:1;background:color-mix(in srgb, currentColor 8%, transparent)}.cvtkAW_refreshBtn:disabled{cursor:default;opacity:.5}.cvtkAW_refreshBtn:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, currentColor 45%, transparent);outline:none}.cvtkAW_tabs{border-bottom:1px solid color-mix(in srgb, currentColor 14%, transparent);gap:4px;display:flex}.cvtkAW_tab{appearance:none;color:inherit;font:inherit;cursor:pointer;opacity:.65;background:0 0;border:none;border-bottom:2px solid #0000;margin-bottom:-1px;padding:6px 14px;font-size:13px}.cvtkAW_tab:hover{opacity:.9}.cvtkAW_tab:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, currentColor 45%, transparent);outline:none}.cvtkAW_tabActive{opacity:1;border-bottom-color:currentColor;font-weight:600}.cvtkAW_card{border:1px solid color-mix(in srgb, currentColor 14%, transparent);border-radius:12px;flex-direction:column;gap:10px;padding:14px 16px;display:flex}.cvtkAW_cardTitle{letter-spacing:.04em;text-transform:uppercase;opacity:.6;font-size:12px;font-weight:600}.cvtkAW_dayPicker{align-items:center;gap:8px;display:flex}.cvtkAW_dayPickerLabel{opacity:.6;font-size:11px}.cvtkAW_daySelect{border:1px solid color-mix(in srgb, currentColor 25%, transparent);color:inherit;font:inherit;font-variant-numeric:tabular-nums;background:0 0;border-radius:6px;padding:3px 8px;font-size:12px}.cvtkAW_daySelect:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, currentColor 45%, transparent);outline:none}.cvtkAW_daySelect option,.cvtkAW_settingItem select option{background-color:var(--dsw-alias-bg-multi-select,Canvas);color:var(--dsw-alias-label-primary,CanvasText)}.cvtkAW_statRow{flex-wrap:wrap;gap:18px;display:flex}.cvtkAW_stat{flex-direction:column;gap:2px;display:flex}.cvtkAW_statValue{font-variant-numeric:tabular-nums;font-size:18px;font-weight:600}.cvtkAW_statLabel{opacity:.6;font-size:11px}.cvtkAW_providerRow{border-top:1px solid color-mix(in srgb, currentColor 8%, transparent);flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;font-size:13px;display:flex}.cvtkAW_providerRow:first-of-type{border-top:none}.cvtkAW_providerName{align-items:center;gap:8px;min-width:0;display:flex}.cvtkAW_providerTokens{font-variant-numeric:tabular-nums;opacity:.75;white-space:nowrap}.cvtkAW_providerBalance{font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600}.cvtkAW_currentBadge{border:1px solid color-mix(in srgb, currentColor 35%, transparent);opacity:.8;border-radius:999px;flex:none;padding:1px 7px;font-size:10px;font-weight:600}.cvtkAW_chart{flex-direction:column;gap:12px;display:flex}.cvtkAW_chartProvider{flex-direction:column;gap:4px;display:flex}.cvtkAW_chartHead{justify-content:space-between;align-items:baseline;gap:10px;font-size:13px;display:flex}.cvtkAW_chartTokens{font-variant-numeric:tabular-nums;opacity:.65;white-space:nowrap;font-size:11px}.cvtkAW_chartBar{background:color-mix(in srgb, currentColor 8%, transparent);border-radius:999px;height:8px;display:block;overflow:hidden}.cvtkAW_chartFill{background:color-mix(in srgb, currentColor 55%, transparent);border-radius:999px;height:100%;transition:width .3s;display:block}.cvtkAW_chartModel{opacity:.8;grid-template-columns:minmax(80px,180px) 1fr auto;align-items:center;gap:8px;padding-left:14px;font-size:11px;display:grid}.cvtkAW_chartModelName{text-overflow:ellipsis;white-space:nowrap;opacity:.8;overflow:hidden}.cvtkAW_chartModelBar{background:color-mix(in srgb, currentColor 6%, transparent);border-radius:999px;height:4px;display:block;overflow:hidden}.cvtkAW_chartModelFill{background:color-mix(in srgb, currentColor 35%, transparent);border-radius:999px;height:100%;transition:width .3s;display:block}.cvtkAW_trendAxis{opacity:.5;font-variant-numeric:tabular-nums;justify-content:space-between;font-size:10px;display:flex}.cvtkAW_muted{opacity:.6;font-size:12px}.cvtkAW_buttonRow{gap:8px;display:flex}.cvtkAW_errorLine{opacity:.75;font-size:12px}.cvtkAW_planCard{flex-direction:column;gap:8px;display:flex}.cvtkAW_planHead{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.cvtkAW_planName{font-size:14px;font-weight:600}.cvtkAW_windowRow{flex-direction:column;gap:4px;display:flex}.cvtkAW_windowLabel{opacity:.8;font-variant-numeric:tabular-nums;justify-content:space-between;font-size:12px;display:flex}.cvtkAW_bar{background:color-mix(in srgb, currentColor 10%, transparent);border-radius:999px;height:6px;overflow:hidden}.cvtkAW_barFill{background:color-mix(in srgb, currentColor 55%, transparent);border-radius:999px;height:100%;transition:width .3s}.cvtkAW_barWarn{background:#d97706}.cvtkAW_barLow{background:#dc2626}.cvtkAW_resetLine{opacity:.55;font-variant-numeric:tabular-nums;font-size:11px}.cvtkAW_settingsGrid{flex-wrap:wrap;align-items:center;gap:16px;display:flex}.cvtkAW_settingItem{align-items:center;gap:8px;font-size:13px;display:flex}.cvtkAW_settingItem input[type=checkbox]{accent-color:currentColor}.cvtkAW_settingItem input[type=number]{border:1px solid color-mix(in srgb, currentColor 25%, transparent);width:90px;color:inherit;font:inherit;background:0 0;border-radius:6px;padding:3px 8px;font-size:13px}.cvtkAW_settingItem select{border:1px solid color-mix(in srgb, currentColor 25%, transparent);color:inherit;font:inherit;background:0 0;border-radius:6px;padding:3px 8px;font-size:13px}.cvtkAW_settingItem input:focus-visible,.cvtkAW_settingItem select:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, currentColor 45%, transparent);outline:none}.cvtkAW_footCard{box-sizing:border-box;background:color-mix(in srgb, currentColor 4%, transparent);width:100%;color:inherit;border:none;border-radius:12px;margin:2px 0 4px;transition:background-color .12s;position:relative}.cvtkAW_footCard:hover{background:var(--dsw-alias-interactive-bg-hover)}.cvtkAW_footCardCollapsed{background:0 0}.cvtkAW_footMain{appearance:none;box-sizing:border-box;width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:12px;flex-direction:column;gap:4px;padding:8px;display:flex}.cvtkAW_footMain:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, currentColor 45%, transparent);outline:none}.cvtkAW_footToggle{appearance:none;width:20px;height:20px;color:inherit;cursor:pointer;opacity:.55;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;padding:0;transition:opacity .12s,background-color .12s;display:inline-flex;position:absolute;top:6px;right:6px}.cvtkAW_footCard:hover .cvtkAW_footToggle{opacity:.8}.cvtkAW_footToggle:hover{opacity:1;background:color-mix(in srgb, currentColor 10%, transparent)}.cvtkAW_footToggle:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, currentColor 45%, transparent);outline:none}.cvtkAW_footToggle svg{display:block}.cvtkAW_footHead{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.cvtkAW_footTitle{opacity:.65;white-space:nowrap;align-items:center;gap:6px;min-width:0;font-size:12px;display:inline-flex}.cvtkAW_footTitle svg{flex:none;display:block}.cvtkAW_footValue{font-variant-numeric:tabular-nums;white-space:nowrap;margin-right:18px;font-size:15px;font-weight:600}.cvtkAW_footLine{opacity:.7;font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap;font-size:11px;overflow:hidden}.cvtkAW_footMeta{opacity:.5;font-variant-numeric:tabular-nums;font-size:10px}.cvtkAW_footCardCollapsed .cvtkAW_footMain{min-height:36px;padding:7px 8px}.cvtkAW_footStrip{white-space:nowrap;align-items:center;gap:6px;padding-right:20px;font-size:12px;display:flex;overflow:hidden}.cvtkAW_footStrip svg{opacity:.65;flex:none;display:block}.cvtkAW_footStripProvider{text-overflow:ellipsis;flex:none;max-width:38%;font-weight:500;overflow:hidden}.cvtkAW_footStripLabel{opacity:.65;text-overflow:ellipsis;overflow:hidden}.cvtkAW_footStripValue{font-variant-numeric:tabular-nums;margin-left:auto;font-weight:600}[data-dsh-frame][data-sidebar-collapsed] .cvtkAW_footCard,[data-sidebar-collapsed] .cvtkAW_footCard{display:none}.cvtkAW_peakBadge,.cvtkAW_peakLine{font-variant-numeric:tabular-nums;white-space:nowrap;align-items:center;gap:4px;font-size:11px;display:inline-flex}.cvtkAW_peakBadge{flex:none}.cvtkAW_peakLine{gap:6px}.cvtkAW_peakBadge[data-peak=on],.cvtkAW_peakLine[data-peak=on]{color:var(--dsw-alias-state-error-primary,#b42318)}.cvtkAW_peakBadge[data-peak=off],.cvtkAW_peakLine[data-peak=off]{color:var(--dsw-alias-state-success-primary,#067647)}.cvtkAW_peakDot{background:currentColor;border-radius:50%;flex:none;width:6px;height:6px}.cvtkAW_footPeak{white-space:nowrap;align-items:center;gap:5px;font-size:10px;display:flex;overflow:hidden}.cvtkAW_footPeakClock{opacity:.7;font-variant-numeric:tabular-nums}";
		const tagId = "muciya-dsh-plugin-usage/packages/dsh-usage/src/client/usage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "muciya-dsh-plugin-usage";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var usage_module_css_default = {
			"bar": "cvtkAW_bar",
			"barFill": "cvtkAW_barFill",
			"barLow": "cvtkAW_barLow",
			"barWarn": "cvtkAW_barWarn",
			"buttonRow": "cvtkAW_buttonRow",
			"card": "cvtkAW_card",
			"cardTitle": "cvtkAW_cardTitle",
			"chart": "cvtkAW_chart",
			"chartBar": "cvtkAW_chartBar",
			"chartFill": "cvtkAW_chartFill",
			"chartHead": "cvtkAW_chartHead",
			"chartModel": "cvtkAW_chartModel",
			"chartModelBar": "cvtkAW_chartModelBar",
			"chartModelFill": "cvtkAW_chartModelFill",
			"chartModelName": "cvtkAW_chartModelName",
			"chartProvider": "cvtkAW_chartProvider",
			"chartTokens": "cvtkAW_chartTokens",
			"currentBadge": "cvtkAW_currentBadge",
			"currentProvider": "cvtkAW_currentProvider",
			"dayPicker": "cvtkAW_dayPicker",
			"dayPickerLabel": "cvtkAW_dayPickerLabel",
			"daySelect": "cvtkAW_daySelect",
			"errorLine": "cvtkAW_errorLine",
			"footCard": "cvtkAW_footCard",
			"footCardCollapsed": "cvtkAW_footCardCollapsed",
			"footHead": "cvtkAW_footHead",
			"footLine": "cvtkAW_footLine",
			"footMain": "cvtkAW_footMain",
			"footMeta": "cvtkAW_footMeta",
			"footPeak": "cvtkAW_footPeak",
			"footPeakClock": "cvtkAW_footPeakClock",
			"footStrip": "cvtkAW_footStrip",
			"footStripLabel": "cvtkAW_footStripLabel",
			"footStripProvider": "cvtkAW_footStripProvider",
			"footStripValue": "cvtkAW_footStripValue",
			"footTitle": "cvtkAW_footTitle",
			"footToggle": "cvtkAW_footToggle",
			"footValue": "cvtkAW_footValue",
			"header": "cvtkAW_header",
			"muted": "cvtkAW_muted",
			"peakBadge": "cvtkAW_peakBadge",
			"peakDot": "cvtkAW_peakDot",
			"peakLine": "cvtkAW_peakLine",
			"planCard": "cvtkAW_planCard",
			"planHead": "cvtkAW_planHead",
			"planName": "cvtkAW_planName",
			"providerBalance": "cvtkAW_providerBalance",
			"providerName": "cvtkAW_providerName",
			"providerRow": "cvtkAW_providerRow",
			"providerTokens": "cvtkAW_providerTokens",
			"refreshBtn": "cvtkAW_refreshBtn",
			"resetLine": "cvtkAW_resetLine",
			"section": "cvtkAW_section",
			"settingItem": "cvtkAW_settingItem",
			"settingsGrid": "cvtkAW_settingsGrid",
			"stat": "cvtkAW_stat",
			"statLabel": "cvtkAW_statLabel",
			"statRow": "cvtkAW_statRow",
			"statValue": "cvtkAW_statValue",
			"tab": "cvtkAW_tab",
			"tabActive": "cvtkAW_tabActive",
			"tabs": "cvtkAW_tabs",
			"trendAxis": "cvtkAW_trendAxis",
			"windowLabel": "cvtkAW_windowLabel",
			"windowRow": "cvtkAW_windowRow"
		};
		//#endregion
		//#region src/client/PeakBadge.tsx
		/** HH:MM of one instant; an unparsable instant drops the time. */
		function formatClock(ms) {
			try {
				return new Date(ms).toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit"
				});
			} catch {
				return "";
			}
		}
		/** The peak/off-peak marker itself; nothing renders outside the DeepSeek family. */
		function PeakBadge(props) {
			const { peak, boundaryMs, variant } = props;
			const sentence = t(peak ? "usage.peak.on" : "usage.peak.off", { time: formatClock(boundaryMs) });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: variant === "full" ? usage_module_css_default.peakLine : usage_module_css_default.peakBadge,
				"data-peak": peak ? "on" : "off",
				"data-dsh-part": "peak-status",
				title: sentence,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: usage_module_css_default.peakDot,
					"aria-hidden": "true"
				}), variant === "full" ? sentence : t(peak ? "usage.peak.tag.on" : "usage.peak.tag.off")]
			});
		}
		//#endregion
		//#region src/core/adapters.ts
		/** Parse a string/number into a finite number, else undefined. */
		function toNum(value) {
			if (typeof value === "number") return Number.isFinite(value) ? value : void 0;
			if (typeof value === "string" && value.trim() !== "") {
				const parsed = Number(value);
				return Number.isFinite(parsed) ? parsed : void 0;
			}
		}
		/** Read a string field that must be a non-empty string. */
		function str(value) {
			return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
		}
		/** Clamp a provider percentage into the renderable 0-100 band. */
		function clampPercent(value) {
			return Math.max(0, Math.min(100, value));
		}
		/** Format a number to a fixed 2-decimal display string. */
		function money(value) {
			return value.toFixed(2);
		}
		/** Millisecond epoch or ISO string → normalized ISO 8601, else undefined. */
		function toIso(value) {
			if (typeof value === "number" && Number.isFinite(value) && value > 0) {
				const ms = value < 0xe8d4a51000 ? value * 1e3 : value;
				const date = new Date(ms);
				return Number.isNaN(date.getTime()) ? void 0 : date.toISOString();
			}
			const text = str(value);
			if (text === void 0) return void 0;
			if (/^\d+$/.test(text)) return toIso(Number(text));
			const date = new Date(text);
			return Number.isNaN(date.getTime()) ? void 0 : date.toISOString();
		}
		/** Used-percent helper guarding zero/absent limits. */
		function usedPercent(used, limit) {
			const usedNum = toNum(used);
			const limitNum = toNum(limit);
			if (usedNum === void 0 || limitNum === void 0 || limitNum <= 0) return void 0;
			return Math.max(0, Math.min(100, usedNum / limitNum * 100));
		}
		function bearer(apiKey) {
			return { authorization: `Bearer ${apiKey}` };
		}
		const DEEPSEEK = {
			ids: ["deepseek", "deepseek-official"],
			familyOnlyIds: ["deepseek-account"],
			displayName: "DeepSeek",
			balance: {
				origin: "https://api.deepseek.com",
				build: ({ apiKey }) => ({
					url: "https://api.deepseek.com/user/balance",
					headers: bearer(apiKey)
				}),
				parse: (status, body) => {
					if (status !== 200 || typeof body !== "object" || body === null) return void 0;
					const infos = body.balance_infos;
					if (!Array.isArray(infos) || infos.length === 0) return void 0;
					const first = infos[0];
					if (typeof first !== "object" || first === null) return void 0;
					const currency = str(first.currency);
					const total = str(first.total_balance);
					if (currency === void 0 || total === void 0) return void 0;
					return {
						currency,
						totalBalance: total
					};
				}
			}
		};
		/** Moonshot pay-as-you-go balance; CN bills in CNY, international in USD. */
		function moonshotBalance(host, currency, ids) {
			return {
				ids,
				displayName: "Moonshot AI",
				balance: {
					build: ({ apiKey }) => ({
						url: `https://${host}/v1/users/me/balance`,
						headers: bearer(apiKey)
					}),
					parse: (status, body) => {
						if (status !== 200 || typeof body !== "object" || body === null) return void 0;
						const data = body.data;
						if (typeof data !== "object" || data === null) return void 0;
						const available = toNum(data.available_balance);
						if (available === void 0) return void 0;
						return {
							currency,
							totalBalance: money(available)
						};
					}
				}
			};
		}
		/** Kimi For Coding quota: top-level `usage` is the weekly summary, `limits[]` the per-window rows. */
		const KIMI_CODING = {
			ids: ["kimi-coding"],
			displayName: "Kimi For Coding",
			plan: {
				build: ({ apiKey }) => ({
					url: "https://api.kimi.com/coding/v1/usages",
					headers: bearer(apiKey)
				}),
				parse: (status, body) => {
					if (status !== 200 || typeof body !== "object" || body === null) return void 0;
					const root = body;
					const windows = [];
					const limits = root.limits;
					if (Array.isArray(limits)) for (const entry of limits) {
						if (typeof entry !== "object" || entry === null) continue;
						const detail = entry.detail;
						const window = entry.window;
						if (typeof detail !== "object" || detail === null) continue;
						const row = detail;
						const duration = typeof window === "object" && window !== null ? toNum(window.duration) : void 0;
						const unit = typeof window === "object" && window !== null ? str(window.timeUnit) : void 0;
						const key = duration === 300 && unit === "TIME_UNIT_MINUTE" ? "5h" : duration !== void 0 ? `w-${duration}` : "window";
						const percent = usedPercent(row.used, row.limit);
						windows.push({
							key,
							name: str(row.name),
							percent,
							resetsAt: toIso(row.resetTime)
						});
					}
					const usage = root.usage;
					if (typeof usage === "object" && usage !== null) {
						const weekly = usage;
						windows.push({
							key: "week",
							name: "Weekly",
							percent: usedPercent(weekly.used, weekly.limit),
							resetsAt: toIso(weekly.resetTime)
						});
					}
					if (windows.length === 0) return void 0;
					const user = root.user;
					const membership = typeof user === "object" && user !== null ? user.membership : void 0;
					return {
						planName: typeof membership === "object" && membership !== null ? str(membership.level) : void 0,
						windows
					};
				}
			}
		};
		/**
		* GLM Coding Plan quota windows, keyed by the provider's own `unit` code
		* rather than by row position so an added or reordered limit cannot shift a
		* window's meaning: 3 = the rolling 5-hour window, 6 = the weekly window,
		* 5 = the monthly one. Two row kinds carry quota — `TOKENS_LIMIT` (token
		* plans) and `CREDIT_LIMIT` (credit plans, whose exact ratio is
		* `currentValue` / `usage`) — while `TIME_LIMIT` is the MCP request cap and
		* is not a plan window at all. Auth is the RAW key without a Bearer prefix.
		*/
		const GLM_UNIT_KEYS = {
			3: "5h",
			5: "month",
			6: "week"
		};
		/** Percent from a credit row's exact ratio, else the provider's own percentage. */
		function glmCreditPercent(row) {
			const used = toNum(row.currentValue);
			const limit = toNum(row.usage);
			if (used !== void 0 && limit !== void 0 && limit > 0) return clampPercent(used / limit * 100);
			const percentage = toNum(row.percentage);
			return percentage === void 0 ? void 0 : clampPercent(percentage);
		}
		function glmPlan(host, ids) {
			return {
				ids,
				displayName: "GLM Coding Plan",
				plan: {
					build: ({ apiKey }) => ({
						url: `https://${host}/api/monitor/usage/quota/limit`,
						headers: {
							authorization: apiKey,
							"accept-language": "en-US,en"
						}
					}),
					parse: (status, body) => {
						if (status !== 200 || typeof body !== "object" || body === null) return void 0;
						const root = body;
						if (root.success !== true) return void 0;
						const data = root.data;
						if (typeof data !== "object" || data === null) return void 0;
						const limits = data.limits;
						if (!Array.isArray(limits)) return void 0;
						const windows = [];
						for (const entry of limits) {
							if (typeof entry !== "object" || entry === null) continue;
							const row = entry;
							const kind = str(row.type);
							if (kind === "TIME_LIMIT") continue;
							const key = GLM_UNIT_KEYS[toNum(row.unit) ?? NaN];
							if (key === void 0) continue;
							if (kind !== "TOKENS_LIMIT" && kind !== "CREDIT_LIMIT") continue;
							windows.push({
								key,
								percent: kind === "CREDIT_LIMIT" ? glmCreditPercent(row) : (() => {
									const percentage = toNum(row.percentage);
									return percentage === void 0 ? void 0 : clampPercent(percentage);
								})(),
								resetsAt: toIso(row.nextResetTime)
							});
						}
						if (windows.length === 0) return void 0;
						return {
							planName: str(data.level),
							windows
						};
					}
				}
			};
		}
		/** OpenCode Go quota: percent-only rolling/weekly/monthly windows. */
		const OPENCODE_GO = {
			ids: ["opencode-go"],
			displayName: "OpenCode Go",
			plan: {
				build: ({ apiKey }) => ({
					url: "https://opencode.ai/zen/go/v1/usage",
					headers: bearer(apiKey)
				}),
				parse: (status, body) => {
					if (status !== 200 || typeof body !== "object" || body === null) return void 0;
					const usage = body.usage;
					if (typeof usage !== "object" || usage === null) return void 0;
					const windows = [];
					for (const [field, key] of [
						["rolling", "5h"],
						["weekly", "week"],
						["monthly", "month"]
					]) {
						const entry = usage[field];
						if (typeof entry !== "object" || entry === null) continue;
						const row = entry;
						const percent = toNum(row.percent);
						windows.push({
							key,
							percent: percent === void 0 ? void 0 : Math.max(0, Math.min(100, percent)),
							resetsAt: percent === 0 ? void 0 : toIso(row.resetsAt)
						});
					}
					if (windows.length === 0) return void 0;
					return { windows };
				}
			}
		};
		/** MiniMax coding-plan remains: remaining-percent semantics, `general` model entry. */
		function minimaxPlan(host, ids) {
			return {
				ids,
				displayName: "MiniMax Coding Plan",
				plan: {
					build: ({ apiKey }) => ({
						url: `https://${host}/v1/api/openplatform/coding_plan/remains`,
						headers: bearer(apiKey)
					}),
					parse: (status, body) => {
						if (status !== 200 || typeof body !== "object" || body === null) return void 0;
						const remains = body.model_remains;
						if (!Array.isArray(remains)) return void 0;
						const general = remains.find((entry) => typeof entry === "object" && entry !== null && entry.model_name === "general");
						if (typeof general !== "object" || general === null) return void 0;
						const row = general;
						const windows = [];
						const intervalRemaining = toNum(row.current_interval_remaining_percent);
						if (intervalRemaining !== void 0) windows.push({
							key: "5h",
							percent: Math.max(0, Math.min(100, 100 - intervalRemaining)),
							resetsAt: toIso(row.end_time)
						});
						if (row.current_weekly_status === 1) {
							const weeklyRemaining = toNum(row.current_weekly_remaining_percent);
							if (weeklyRemaining !== void 0) windows.push({
								key: "week",
								percent: Math.max(0, Math.min(100, 100 - weeklyRemaining)),
								resetsAt: toIso(row.weekly_end_time)
							});
						}
						if (windows.length === 0) return void 0;
						return { windows };
					}
				}
			};
		}
		const OPENROUTER = {
			ids: ["openrouter"],
			displayName: "OpenRouter",
			balance: {
				build: ({ apiKey }) => ({
					url: "https://openrouter.ai/api/v1/credits",
					headers: bearer(apiKey)
				}),
				parse: (status, body) => {
					if (status !== 200 || typeof body !== "object" || body === null) return void 0;
					const data = body.data;
					if (typeof data !== "object" || data === null) return void 0;
					const credits = toNum(data.total_credits);
					const used = toNum(data.total_usage) ?? 0;
					if (credits === void 0) return void 0;
					return {
						currency: "USD",
						totalBalance: money(credits - used)
					};
				}
			}
		};
		function siliconFlow(host, ids, currency) {
			return {
				ids,
				displayName: "SiliconFlow",
				balance: {
					build: ({ apiKey }) => ({
						url: `https://${host}/v1/user/info`,
						headers: bearer(apiKey)
					}),
					parse: (status, body) => {
						if (status !== 200 || typeof body !== "object" || body === null) return void 0;
						const data = body.data;
						if (typeof data !== "object" || data === null) return void 0;
						const total = str(data.totalBalance);
						if (total === void 0) return void 0;
						return {
							currency,
							totalBalance: total
						};
					}
				}
			};
		}
		const ZENMUX = {
			ids: ["zenmux"],
			displayName: "ZenMux",
			balance: {
				build: ({ apiKey }) => ({
					url: "https://zenmux.ai/api/v1/management/payg/balance",
					headers: bearer(apiKey)
				}),
				parse: (status, body) => {
					if (status !== 200 || typeof body !== "object" || body === null) return void 0;
					const data = body.data;
					if (typeof data !== "object" || data === null) return void 0;
					const credits = toNum(data.total_credits);
					if (credits === void 0) return void 0;
					return {
						currency: "USD",
						totalBalance: money(credits)
					};
				}
			}
		};
		/**
		* OpenAI Codex (ChatGPT subscription) quota over the OAuth access token the
		* pi-ai grant stores — the one plan adapter whose credential is an OAuth
		* token rather than an API key. A 401 here means the stored access token has
		* expired; it refreshes when the harness next runs a Codex request, so the
		* error line tells the user to use Codex once and refresh.
		*/
		const OPENAI_CODEX = {
			ids: ["openai-codex"],
			displayName: "Codex (ChatGPT 订阅)",
			plan: {
				build: ({ apiKey, accountId }) => ({
					url: "https://chatgpt.com/backend-api/wham/usage",
					headers: {
						authorization: `Bearer ${apiKey}`,
						"user-agent": "codex-cli",
						accept: "application/json",
						...accountId !== void 0 ? { "chatgpt-account-id": accountId } : {}
					}
				}),
				parse: (status, body) => {
					if (status !== 200 || typeof body !== "object" || body === null) return void 0;
					const rateLimit = body.rate_limit;
					if (typeof rateLimit !== "object" || rateLimit === null) return void 0;
					const windows = [];
					const rows = rateLimit.primary_window !== void 0 || rateLimit.secondary_window !== void 0 ? [rateLimit.primary_window, rateLimit.secondary_window] : [];
					for (const entry of rows) {
						if (typeof entry !== "object" || entry === null) continue;
						const row = entry;
						const percent = toNum(row.used_percent);
						if (percent === void 0) continue;
						const seconds = toNum(row.limit_window_seconds);
						windows.push({
							key: codexWindowKey(seconds),
							percent: Math.max(0, Math.min(100, percent)),
							resetsAt: toIso(row.reset_at)
						});
					}
					if (windows.length === 0) return void 0;
					return { windows };
				}
			}
		};
		/** Map a Codex window length in seconds onto the shared window key vocabulary. */
		function codexWindowKey(seconds) {
			if (seconds === void 0) return "window";
			if (seconds === 18e3) return "5h";
			if (seconds === 604800) return "week";
			if (seconds === 2592e3) return "month";
			const hours = seconds / 3600;
			return hours >= 24 ? `${Math.round(hours / 24)}_day` : `${Math.round(hours)}_hour`;
		}
		/**
		* The adapter registry, in no particular order. Route keys come from the
		* pi-ai provider catalog plus the routes this deployment observed in user
		* configuration (`zenmux`).
		*/
		const PROVIDER_ADAPTERS = [
			DEEPSEEK,
			moonshotBalance("api.moonshot.cn", "CNY", ["moonshotai-cn"]),
			moonshotBalance("api.moonshot.ai", "USD", ["moonshotai"]),
			KIMI_CODING,
			glmPlan("open.bigmodel.cn", ["zai-coding-cn"]),
			glmPlan("api.z.ai", ["zai", "zai-coding"]),
			OPENCODE_GO,
			minimaxPlan("api.minimaxi.com", ["minimax-cn"]),
			minimaxPlan("api.minimax.io", ["minimax"]),
			OPENAI_CODEX,
			OPENROUTER,
			siliconFlow("api.siliconflow.cn", ["siliconflow", "siliconflow-cn"], "CNY"),
			siliconFlow("api.siliconflow.com", ["siliconflow-intl"], "USD"),
			ZENMUX
		];
		/** Find the adapter serving a provider route key, if any. */
		function adapterFor(provider) {
			return PROVIDER_ADAPTERS.find((adapter) => adapter.ids.includes(provider));
		}
		/**
		* Whether a provider route belongs to the official DeepSeek family: the only
		* family with a spend price book and a settings-section-owned env credential
		* (llm-deepseek) rather than a pi-ai profile. Drives the fold-time cost
		* stamping, the client fold-time spend estimate, and the whale-yuan bank.
		*
		* Family membership is wider than the probe directory. The account route
		* (deepseek-account) bills the same account but authenticates with the account
		* token, so it prices and mints while `adapterFor()` still returns undefined
		* for it and no probe or env-credential fallback can reach it. Every caller of
		* this predicate is an accounting decision; the credential and probing
		* decisions read `adapterFor()` instead, so the two never widen together
		* (issue #1772).
		*/
		function isDeepSeekProviderRoute(provider) {
			if (adapterFor(provider) === DEEPSEEK) return true;
			return DEEPSEEK.familyOnlyIds?.includes(provider) === true;
		}
		//#endregion
		//#region src/core/holidays.ts
		/**
		* Chinese public-holiday dates, Beijing calendar days, as `YYYY-MM-DD`.
		*
		* The DeepSeek peak rule bills a public holiday off-peak in full, and the
		* State Council publishes these dates per year, so they cannot be derived
		* from a rule. This module is that data; `pricing.ts` keeps the arithmetic.
		*
		* Adjusted workdays are deliberately absent: the provider counts the
		* calendar day, so an adjusted Saturday or Sunday is off-peak exactly like
		* any other weekend and listing it would price it as peak.
		*
		* Source: the yearly schedules in bastengao/chinese-holidays-node
		* (`data/<year>.json`, MIT). Only the `holiday` entries are taken; that
		* package's runtime code (which fetches over the network) and its
		* dependencies are not vendored.
		*
		* Coverage ends at the newest year below. A year with no entry is priced as
		* if it had no holidays, which is the documented default of
		* {@link PublicHolidayCalendar} in `pricing.ts`.
		* @module @linxin666/dsh-usage/core/holidays
		*/
		/** Public-holiday dates keyed by Beijing calendar year. */
		const CHINESE_PUBLIC_HOLIDAYS = {
			"2020": [
				"2020-01-24",
				"2020-01-25",
				"2020-01-26",
				"2020-01-27",
				"2020-01-28",
				"2020-01-29",
				"2020-01-30",
				"2020-04-04",
				"2020-04-05",
				"2020-04-06",
				"2020-05-01",
				"2020-05-02",
				"2020-05-03",
				"2020-05-04",
				"2020-05-05",
				"2020-06-25",
				"2020-06-26",
				"2020-06-27",
				"2020-10-01",
				"2020-10-02",
				"2020-10-03",
				"2020-10-04",
				"2020-10-05",
				"2020-10-06",
				"2020-10-07",
				"2020-10-08"
			],
			"2021": [
				"2021-01-01",
				"2021-01-02",
				"2021-01-03",
				"2021-02-11",
				"2021-02-12",
				"2021-02-13",
				"2021-02-14",
				"2021-02-15",
				"2021-02-16",
				"2021-02-17",
				"2021-04-03",
				"2021-04-04",
				"2021-04-05",
				"2021-05-01",
				"2021-05-02",
				"2021-05-03",
				"2021-05-04",
				"2021-05-05",
				"2021-06-12",
				"2021-06-13",
				"2021-06-14",
				"2021-09-19",
				"2021-09-20",
				"2021-09-21",
				"2021-10-01",
				"2021-10-02",
				"2021-10-03",
				"2021-10-04",
				"2021-10-05",
				"2021-10-06",
				"2021-10-07"
			],
			"2022": [
				"2022-01-01",
				"2022-01-02",
				"2022-01-03",
				"2022-01-31",
				"2022-02-01",
				"2022-02-02",
				"2022-02-03",
				"2022-02-04",
				"2022-02-05",
				"2022-02-06",
				"2022-04-03",
				"2022-04-04",
				"2022-04-05",
				"2022-04-30",
				"2022-05-01",
				"2022-05-02",
				"2022-05-03",
				"2022-05-04",
				"2022-06-03",
				"2022-06-04",
				"2022-06-05",
				"2022-09-10",
				"2022-09-11",
				"2022-09-12",
				"2022-10-01",
				"2022-10-02",
				"2022-10-03",
				"2022-10-04",
				"2022-10-05",
				"2022-10-06",
				"2022-10-07"
			],
			"2023": [
				"2022-12-31",
				"2023-01-01",
				"2023-01-02",
				"2023-01-21",
				"2023-01-22",
				"2023-01-23",
				"2023-01-24",
				"2023-01-25",
				"2023-01-26",
				"2023-01-27",
				"2023-04-29",
				"2023-04-30",
				"2023-05-01",
				"2023-05-02",
				"2023-05-03",
				"2023-06-22",
				"2023-06-23",
				"2023-06-24",
				"2023-09-29",
				"2023-09-30",
				"2023-10-01",
				"2023-10-02",
				"2023-10-03",
				"2023-10-04",
				"2023-10-05",
				"2023-10-06"
			],
			"2024": [
				"2023-12-30",
				"2023-12-31",
				"2024-01-01",
				"2024-02-10",
				"2024-02-11",
				"2024-02-12",
				"2024-02-13",
				"2024-02-14",
				"2024-02-15",
				"2024-02-16",
				"2024-02-17",
				"2024-04-04",
				"2024-04-05",
				"2024-04-06",
				"2024-05-01",
				"2024-05-02",
				"2024-05-03",
				"2024-05-04",
				"2024-05-05",
				"2024-06-08",
				"2024-06-09",
				"2024-06-10",
				"2024-09-15",
				"2024-09-16",
				"2024-09-17",
				"2024-10-01",
				"2024-10-02",
				"2024-10-03",
				"2024-10-04",
				"2024-10-05",
				"2024-10-06",
				"2024-10-07"
			],
			"2025": [
				"2025-01-28",
				"2025-01-29",
				"2025-01-30",
				"2025-01-31",
				"2025-02-01",
				"2025-02-02",
				"2025-02-03",
				"2025-02-04",
				"2025-04-04",
				"2025-04-05",
				"2025-04-06",
				"2025-05-01",
				"2025-05-02",
				"2025-05-03",
				"2025-05-04",
				"2025-05-05",
				"2025-05-31",
				"2025-06-01",
				"2025-06-02",
				"2025-10-01",
				"2025-10-02",
				"2025-10-03",
				"2025-10-04",
				"2025-10-05",
				"2025-10-06",
				"2025-10-07",
				"2025-10-08"
			],
			"2026": [
				"2026-01-01",
				"2026-01-02",
				"2026-01-03",
				"2026-02-15",
				"2026-02-16",
				"2026-02-17",
				"2026-02-18",
				"2026-02-19",
				"2026-02-20",
				"2026-02-21",
				"2026-02-22",
				"2026-02-23",
				"2026-04-04",
				"2026-04-05",
				"2026-04-06",
				"2026-05-01",
				"2026-05-02",
				"2026-05-03",
				"2026-05-04",
				"2026-05-05",
				"2026-06-19",
				"2026-06-20",
				"2026-06-21",
				"2026-09-25",
				"2026-09-26",
				"2026-09-27",
				"2026-10-01",
				"2026-10-02",
				"2026-10-03",
				"2026-10-04",
				"2026-10-05",
				"2026-10-06",
				"2026-10-07"
			]
		};
		//#endregion
		//#region src/core/pricing.ts
		/** The published peak windows: weekday 09:00-12:00 and 14:00-18:00. */
		const PEAK_WINDOWS = [{
			from: 540,
			to: 720
		}, {
			from: 840,
			to: 1080
		}];
		/** Beijing is UTC+8 year-round (no DST), so a fixed shift is exact. */
		const BEIJING_UTC_OFFSET_MS = 8 * 36e5;
		function withinWindow(minuteOfDay) {
			return PEAK_WINDOWS.find((window) => minuteOfDay >= window.from && minuteOfDay < window.to);
		}
		/**
		* The default calendar: the published Chinese public-holiday table, so a holiday
		* weekday prices off-peak instead of over-reporting at the peak rate. A year the
		* table does not cover holds no dates and falls back to peak on weekdays, which
		* is the safe direction to be wrong in: the estimate reads high rather than low.
		*/
		const CN_PUBLIC_HOLIDAYS = { isPublicHoliday: (date) => {
			const year = date.slice(0, 4);
			if (Number(year) > 2026) return false;
			return CHINESE_PUBLIC_HOLIDAYS[year]?.includes(date) ?? false;
		} };
		/** The Beijing-time `YYYY-MM-DD` calendar day of `ms` (UTC+8 has no DST, so the shift is exact). */
		function beijingDate(ms) {
			const shifted = new Date(ms + BEIJING_UTC_OFFSET_MS);
			const month = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
			const day = `${shifted.getUTCDate()}`.padStart(2, "0");
			return `${shifted.getUTCFullYear()}-${month}-${day}`;
		}
		/**
		* Whether `ms` falls on a peak-eligible Beijing day: Monday-Friday that is
		* not a public holiday. A Saturday or Sunday is never eligible, including on
		* an adjusted workday — the provider counts the calendar day, not the
		* working schedule.
		*/
		function isPeakDay(ms, calendar) {
			const weekday = new Date(ms + BEIJING_UTC_OFFSET_MS).getUTCDay();
			if (weekday < 1 || weekday > 5) return false;
			return !calendar.isPublicHoliday(beijingDate(ms));
		}
		/**
		* The DeepSeek billing period at `ms`, plus when it next flips. The clock is
		* Beijing time regardless of the host timezone (UTC+8 has no DST, so a fixed
		* shift is exact). `boundaryMs` is the instant the current period ends — the
		* window's close while peaking, the next window's open otherwise.
		*/
		function deepseekPeriodAt(ms, calendar = CN_PUBLIC_HOLIDAYS) {
			const shifted = new Date(ms + BEIJING_UTC_OFFSET_MS);
			const minuteOfDay = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
			const current = isPeakDay(ms, calendar) ? withinWindow(minuteOfDay) : void 0;
			if (current !== void 0) return {
				peak: true,
				boundaryMs: ms + (current.to - minuteOfDay) * 6e4 - shifted.getUTCSeconds() * 1e3 - shifted.getUTCMilliseconds()
			};
			for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
				const dayStartMs = ms + dayOffset * 864e5;
				if (!isPeakDay(dayStartMs, calendar)) continue;
				const day = new Date(dayStartMs + BEIJING_UTC_OFFSET_MS);
				const realDayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) - BEIJING_UTC_OFFSET_MS;
				for (const window of PEAK_WINDOWS) {
					if (dayOffset === 0 && window.from <= minuteOfDay) continue;
					return {
						peak: false,
						boundaryMs: realDayStart + window.from * 6e4
					};
				}
			}
			return {
				peak: false,
				boundaryMs: ms + 864e5
			};
		}
		//#endregion
		//#region src/core/ledger.ts
		/** Total tokens of a bucket (billed input + output; reasoning is inside output). */
		function totalTokens(totals) {
			return totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens + totals.outputTokens;
		}
		//#endregion
		//#region src/client/UsageSectionCard.tsx
		/**
		* The usage statistics settings section: two tabs (用量: today's usage,
		* balances, trend; 个人套餐: per-provider plan quota windows) plus a compact
		* settings row. Data comes from the host's loopback-fenced
		* /api/dsh-usage/overview document; polling runs only while the section is
		* mounted and the tab is visible.
		* @module @linxin666/dsh-usage/client/UsageSectionCard
		*/
		/** Poll cadence while the section is open. */
		const SECTION_POLL_MS = 1e4;
		/** Compact token count: 12345 -> 12.3k, 1234567 -> 1.23M. */
		function formatTokens(value) {
			if (!Number.isFinite(value) || value <= 0) return "0";
			if (value < 1e3) return String(value);
			if (value < 1e6) return trim(value / 1e3) + "k";
			if (value < 1e9) return trim(value / 1e6) + "M";
			return trim(value / 1e9) + "B";
		}
		function trim(value) {
			return value >= 100 ? String(Math.round(value)) : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
		}
		function formatTime(ms) {
			try {
				return new Date(ms).toLocaleTimeString();
			} catch {
				return "";
			}
		}
		/** Formatted CNY spend estimate (the only priced currency today). */
		function formatCost(cost) {
			return "¥" + cost.toFixed(2);
		}
		function toneClass(percent) {
			if (percent >= 90) return usage_module_css_default.barLow;
			if (percent >= 70) return usage_module_css_default.barWarn;
			return usage_module_css_default.barFill;
		}
		/** A provider row backed by a configured credential (api key, env key, or OAuth grant). */
		function isConfigured(provider) {
			return provider.credential !== "none";
		}
		function TotalsRow(props) {
			const { totals } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.statRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.stat,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statValue,
							children: formatTokens(totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens + totals.outputTokens)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statLabel,
							children: t("usage.tokens.total")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.stat,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statValue,
							children: formatTokens(totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statLabel,
							children: t("usage.tokens.input")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.stat,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statValue,
							children: formatTokens(totals.outputTokens)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statLabel,
							children: t("usage.tokens.output")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.stat,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statValue,
							children: formatTokens(totals.cacheReadTokens)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statLabel,
							children: t("usage.tokens.cacheRead")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.stat,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statValue,
							children: formatTokens(totals.cacheWriteTokens)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statLabel,
							children: t("usage.tokens.cacheWrite")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.stat,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statValue,
							children: formatTokens(totals.calls)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.statLabel,
							children: t("usage.calls", { n: totals.calls })
						})]
					})
				]
			});
		}
		function balanceLine$1(provider) {
			if (provider.balance !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: usage_module_css_default.providerBalance,
				children: [
					provider.balance.currency.toUpperCase() === "CNY" ? "¥" : provider.balance.currency.toUpperCase() === "USD" ? "$" : "",
					provider.balance.totalBalance,
					provider.balance.currency.toUpperCase() !== "CNY" && provider.balance.currency.toUpperCase() !== "USD" ? " " + provider.balance.currency.toUpperCase() : ""
				]
			});
			if (provider.credential === "oauth") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: usage_module_css_default.muted,
				children: t("usage.oauth")
			});
			if (provider.credential === "none") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: usage_module_css_default.muted,
				children: t("usage.balance.noCredential")
			});
			if (provider.balanceSupported === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: usage_module_css_default.muted,
				children: t("usage.balance.unsupported")
			});
			if (!provider.supported) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: usage_module_css_default.muted,
				children: t("usage.balance.unsupported")
			});
			return null;
		}
		function ProviderRow(props) {
			const { provider, current } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.providerRow,
				"data-dsh-part": "provider-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: usage_module_css_default.providerName,
					children: [provider.displayName, current === provider.provider && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: usage_module_css_default.currentBadge,
						children: t("usage.current")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: usage_module_css_default.providerTokens,
					children: balanceLine$1(provider)
				})]
			});
		}
		/**
		* Fetch the day a picker selected, or stay idle for the default window. Today
		* never fetches: the overview already carries it live, so switching back to
		* today is instant and keeps counting with the poll. A superseded selection
		* never lands (the effect cancels), and a failed load reports its own message
		* instead of leaving the card on a stale day.
		*/
		function useDayView(loadDay, date, today) {
			const [load, setLoad] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				if (date === void 0 || date === today) {
					setLoad((previous) => previous === void 0 ? previous : void 0);
					return;
				}
				let cancelled = false;
				setLoad({ status: "loading" });
				loadDay(date).then((view) => {
					if (!cancelled) setLoad({
						status: "ready",
						view
					});
				}, (error) => {
					if (!cancelled) setLoad({
						status: "error",
						error: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					cancelled = true;
				};
			}, [
				date,
				today,
				loadDay
			]);
			return load;
		}
		/**
		* The day picker: today plus every retained day that recorded usage, newest
		* first (the host serves the list ascending). Without that list (an older host
		* document) no picker renders and the card stays on its default window.
		*/
		function DayPicker(props) {
			const { value, options, today, leading, onSelect, part } = props;
			if (options.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.dayPicker,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					className: usage_module_css_default.dayPickerLabel,
					htmlFor: "muciya-usage-day-" + part,
					children: t("usage.day.label")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					id: "muciya-usage-day-" + part,
					className: usage_module_css_default.daySelect,
					value,
					onChange: (event) => {
						onSelect(event.target.value);
					},
					children: [leading !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: leading.value,
						children: leading.label
					}), options.map((date) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: date,
						children: date === today ? t("usage.day.today") : date
					}, date))]
				})]
			});
		}
		/** The section component; the slot merges the face into these props. */
		function UsageSectionCard(props) {
			const { store, poll, refresh, loadDay, settings } = props;
			const ui = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
			const settingsSnapshot = settings.getSnapshot();
			const settingsValue = settingsSnapshot.value ?? {};
			const [tab, setTab] = (0, react.useState)("usage");
			const [usageDay, setUsageDay] = (0, react.useState)(void 0);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [, bumpSettings] = (0, react.useState)(0);
			(0, react.useEffect)(() => settings.subscribe(() => bumpSettings((count) => count + 1)), [settings]);
			const enabled = settingsValue.enabled ?? true;
			(0, react.useEffect)(() => {
				if (!enabled) return void 0;
				poll();
				let timer;
				const start = () => {
					if (timer === void 0 && document.visibilityState === "visible") timer = window.setInterval(poll, SECTION_POLL_MS);
				};
				const onVisibility = () => {
					if (document.visibilityState === "visible") {
						poll();
						start();
					} else if (timer !== void 0) {
						window.clearInterval(timer);
						timer = void 0;
					}
				};
				start();
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					if (timer !== void 0) window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, [poll, enabled]);
			const snapshot = ui.snapshot;
			const todayDate = snapshot?.usage.today.date;
			const dayOptions = snapshot === null ? [] : [...new Set([todayDate, ...snapshot.usage.availableDays ?? []].filter((date) => date !== void 0))].sort().reverse();
			const usageSelection = usageDay !== void 0 && dayOptions.includes(usageDay) ? usageDay : void 0;
			const selectedDay = usageSelection ?? todayDate;
			const isToday = selectedDay === todayDate;
			const usageDayLoad = useDayView(loadDay, usageSelection, todayDate);
			const day = isToday ? snapshot?.usage.today : usageDayLoad?.view;
			const onRefresh = () => {
				setRefreshing(true);
				try {
					refresh();
				} finally {
					window.setTimeout(() => setRefreshing(false), 3e3);
				}
			};
			if (!enabled || ui.status === "error" || snapshot === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.section,
				"data-dsh-plugin": "usage",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: usage_module_css_default.muted,
					"data-dsh-part": "status-line",
					children: !enabled ? t("usage.disabled") : ui.status === "error" ? t("usage.error", { error: ui.error ?? "" }) : t("usage.loading")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsRow, {
					settings,
					snapshot: settingsSnapshot.status === "ready" ? settingsSnapshot : void 0,
					value: settingsValue
				})]
			});
			const current = snapshot.current;
			const currentProvider = snapshot.providers.find((provider) => provider.provider === current.provider);
			const deepseekPeriod = deepseekPeriodAt(Date.now());
			const deepseekVisible = isToday && (current.provider !== void 0 && isDeepSeekProviderRoute(current.provider) || snapshot.usage.today.providers.some((row) => isDeepSeekProviderRoute(row.provider)));
			const planProviders = snapshot.providers.filter((provider) => isConfigured(provider) && (provider.planSupported === true || provider.planSupported === void 0 && provider.plan !== void 0));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.section,
				"data-dsh-plugin": "usage",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.header,
						"data-dsh-part": "header",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.currentProvider,
							children: currentProvider !== void 0 ? `${currentProvider.displayName}${current.model !== void 0 && current.model !== "" ? " · " + current.model : ""}` : t("usage.noData")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.muted,
								children: t("usage.updated", { time: formatTime(snapshot.updatedAt) })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: usage_module_css_default.refreshBtn,
								onClick: onRefresh,
								disabled: refreshing,
								children: refreshing ? t("usage.refreshing") : t("usage.refresh")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.tabs,
						role: "tablist",
						"data-dsh-part": "tabs",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === "usage",
								className: tab === "usage" ? `${usage_module_css_default.tab} ${usage_module_css_default.tabActive}` : usage_module_css_default.tab,
								onClick: () => setTab("usage"),
								children: t("usage.tab.usage")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === "plans",
								className: tab === "plans" ? `${usage_module_css_default.tab} ${usage_module_css_default.tabActive}` : usage_module_css_default.tab,
								onClick: () => setTab("plans"),
								children: t("usage.tab.plans")
							}),
						]
					}),
					tab === "usage" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: usage_module_css_default.card,
							"data-dsh-part": "today-card",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.cardTitle,
									children: isToday ? t("usage.today") : t("usage.day.title", { date: selectedDay ?? "" })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DayPicker, {
									part: "usage",
									value: selectedDay ?? "",
									options: dayOptions,
									today: todayDate ?? "",
									onSelect: (date) => {
										setUsageDay(date === todayDate ? void 0 : date);
									}
								}),
								deepseekVisible && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PeakBadge, {
									peak: deepseekPeriod.peak,
									boundaryMs: deepseekPeriod.boundaryMs,
									variant: "full"
								}),
								usageDayLoad?.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.errorLine,
									children: t("usage.day.error", { error: usageDayLoad.error ?? "" })
								}) : day === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.muted,
									children: t("usage.day.loading")
								}) : day.totals.calls === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.muted,
									children: isToday ? t("usage.noData") : t("usage.day.empty")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TotalsRow, { totals: day.totals }),
								(day?.totals.cost ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: usage_module_css_default.providerRow,
									"data-dsh-part": "today-cost",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: usage_module_css_default.providerName,
										children: isToday ? t("usage.today.cost") : t("usage.day.cost")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: usage_module_css_default.providerTokens,
										children: formatCost(day?.totals.cost ?? 0)
									})]
								}),
								(day?.providers.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									"data-dsh-part": "provider-list",
									children: (day?.providers ?? []).map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: usage_module_css_default.providerRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: usage_module_css_default.providerName,
											children: [snapshot.providers.find((provider) => provider.provider === row.provider)?.displayName ?? row.provider, current.provider === row.provider && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: usage_module_css_default.currentBadge,
												children: t("usage.current")
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: usage_module_css_default.providerTokens,
											children: [
												formatTokens(row.totals.inputTokens + row.totals.cacheReadTokens + row.totals.cacheWriteTokens + row.totals.outputTokens),
												" · ",
												t("usage.calls", { n: row.totals.calls }),
												row.totals.cost > 0 ? ` · ${formatCost(row.totals.cost)}` : ""
											]
										})]
									}, row.provider))
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: usage_module_css_default.card,
							"data-dsh-part": "balance-card",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.cardTitle,
									children: t("usage.balance")
								}),
								(() => {
									const configured = snapshot.providers.filter(isConfigured);
									const rows = configured.filter((provider) => provider.balanceSupported === true || provider.balanceSupported === false || provider.balanceSupported === void 0 && provider.supported);
									if (rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: usage_module_css_default.muted,
										children: configured.length === 0 ? t("usage.balance.noneConfigured") : t("usage.balance.unsupported")
									});
									return rows.map((provider) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderRow, {
										provider,
										current: current.provider
									}, provider.provider));
								})(),
								snapshot.providers.some((provider) => isConfigured(provider) && provider.error !== void 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.errorLine,
									children: snapshot.providers.filter((provider) => isConfigured(provider) && provider.error !== void 0).map((provider) => `${provider.displayName}: ${t("usage.provider.error", { error: provider.error ?? "" })}`).join(t("usage.errorListSeparator"))
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeCard, {
							range: snapshot.usage.range,
							providers: snapshot.providers,
							currentProvider: current.provider
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsRow, {
							settings,
							snapshot: settingsSnapshot.status === "ready" ? settingsSnapshot : void 0,
							value: settingsValue
						})
					] }),
					tab === "plans" && (planProviders.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: usage_module_css_default.card,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.muted,
							children: t("usage.plan.noneConfigured")
						})
					}) : planProviders.map((provider) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlanCard, {
						provider,
						current: current.provider
					}, provider.provider))),
				]
			});
		}
		/** How many model sub-bars render under one provider bar. */
		const CHART_MODEL_CAP = 3;
		/**
		* The 近 30 天 card: horizontal bars per provider over the trend window,
		* each with its heaviest models as nested sub-bars. Window totals come from
		* the host's aggregated `usage.range` (an older host without it renders no
		* card instead of a wrong one).
		*/
		function RangeCard(props) {
			const { range, providers, currentProvider } = props;
			if (range === void 0) return null;
			const grandTotal = range.totals.inputTokens + range.totals.outputTokens + range.totals.cacheReadTokens + range.totals.cacheWriteTokens;
			const maxProvider = Math.max(1, ...range.providers.map((row) => totalOf(row.totals)));
			const nameOf = (id) => providers.find((provider) => provider.provider === id)?.displayName ?? id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.card,
				"data-dsh-part": "trend-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: usage_module_css_default.cardTitle,
					children: t("usage.trend")
				}), range.providers.length === 0 || grandTotal === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: usage_module_css_default.muted,
					children: t("usage.noData")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: usage_module_css_default.chart,
					"data-dsh-part": "usage-chart",
					children: [range.providers.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartProviderRow, {
						row,
						name: nameOf(row.provider),
						max: maxProvider,
						current: currentProvider === row.provider
					}, row.provider)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: usage_module_css_default.trendAxis,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: range.from.slice(5) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: range.to.slice(5) })]
					})]
				})]
			});
		}
		function ChartProviderRow(props) {
			const { row, name, max, current } = props;
			const total = totalOf(row.totals);
			const maxModel = Math.max(1, ...row.models.slice(0, CHART_MODEL_CAP).map((model) => totalOf(model.totals)));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.chartProvider,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: usage_module_css_default.chartHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: usage_module_css_default.providerName,
							children: [name, current && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.currentBadge,
								children: t("usage.current")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: usage_module_css_default.chartTokens,
							children: [
								formatTokens(total),
								" · ",
								t("usage.calls", { n: row.totals.calls })
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: usage_module_css_default.chartBar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.chartFill,
							style: { width: `${Math.max(2, Math.round(total / max * 100))}%` }
						})
					}),
					row.models.slice(0, CHART_MODEL_CAP).map((model) => {
						const modelTotal = totalOf(model.totals);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: usage_module_css_default.chartModel,
							title: `${row.provider} · ${model.model}: ${formatTokens(modelTotal)}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.chartModelName,
									children: model.model
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.chartModelBar,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: usage_module_css_default.chartModelFill,
										style: { width: `${Math.max(3, Math.round(modelTotal / maxModel * 100))}%` }
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.chartTokens,
									children: formatTokens(modelTotal)
								})
							]
						}, model.model);
					})
				]
			});
		}
		function totalOf(totals) {
			return totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens + totals.outputTokens;
		}
		function PlanCard(props) {
			const { provider, current } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${usage_module_css_default.card} ${usage_module_css_default.planCard}`,
				"data-dsh-part": "plan-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: usage_module_css_default.planHead,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: usage_module_css_default.planName,
							children: [
								provider.displayName,
								current === provider.provider && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: usage_module_css_default.currentBadge,
									children: t("usage.current")
								}),
								provider.plan?.planName !== void 0 ? ` · ${provider.plan.planName}` : ""
							]
						})
					}),
					provider.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: usage_module_css_default.errorLine,
						children: t("usage.provider.error", { error: provider.error })
					}),
					provider.credential === "none" && provider.plan === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: usage_module_css_default.muted,
						children: t("usage.balance.noCredential")
					}) : provider.plan === void 0 || provider.plan.windows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: usage_module_css_default.muted,
						children: t("usage.plan.noPlan")
					}) : provider.plan.windows.map((window) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.windowRow,
						"data-dsh-part": "plan-window",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: usage_module_css_default.windowLabel,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: window.name ?? t(`usage.plan.windows.${window.key}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: window.percent !== void 0 ? `${window.percent >= 10 ? Math.round(window.percent) : window.percent.toFixed(1)}%` : "" })]
							}),
							window.percent !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.bar,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: toneClass(window.percent),
									style: {
										width: `${Math.min(100, Math.max(0, window.percent))}%`,
										display: "block"
									}
								})
							}),
							window.resetsAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.resetLine,
								children: t("usage.plan.reset", { date: new Date(window.resetsAt).toLocaleString() })
							})
						]
					}, window.key))
				]
			});
		}
		/**
		* The compact settings row. Both controls write through the shared form the
		* moment the user changes them, and the Host answers each write with a
		* boolean: a refused (or transport-failed) write is surfaced as a failed save,
		* because a value that did not land must never read as applied.
		*/
		function SettingsRow(props) {
			const { settings, snapshot, value } = props;
			const disabled = snapshot === void 0 || !snapshot.writable;
			const [failure, setFailure] = (0, react.useState)(void 0);
			const write = (field, next) => {
				setFailure(void 0);
				let answer;
				try {
					answer = settings.set(field, next);
				} catch (error) {
					setFailure(error instanceof Error ? error.message : String(error));
					return;
				}
				Promise.resolve(answer).then((accepted) => {
					if (!accepted) setFailure("");
				}, (error) => {
					setFailure(error instanceof Error ? error.message : String(error));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: usage_module_css_default.card,
				"data-dsh-part": "settings-row",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: usage_module_css_default.cardTitle,
						children: t("usage.config.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: usage_module_css_default.settingsGrid,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: usage_module_css_default.settingItem,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: value.enabled ?? true,
								disabled,
								onChange: (event) => {
									write("enabled", event.target.checked);
								}
							}), t("usage.config.enabled")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: usage_module_css_default.settingItem,
							children: [t("usage.config.pollIntervalSec"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								min: 30,
								max: 3600,
								value: typeof value.pollIntervalSec === "number" ? value.pollIntervalSec : 60,
								disabled,
								onChange: (event) => {
									const parsed = Number(event.target.value);
									if (Number.isFinite(parsed) && parsed >= 30 && parsed <= 3600) write("pollIntervalSec", Math.round(parsed));
								}
							})]
						})]
					}),
					failure !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: usage_module_css_default.errorLine,
						role: "status",
						children: [t("usage.config.saveFailed"), failure === "" ? "" : " - " + failure]
					})
				]
			});
		}
		//#endregion
		//#region src/client/body-mutations.ts
		/** Cross-bundle registry key; `Symbol.for` so every module copy agrees. */
		const HUB_KEY = Symbol.for("dsh-web.body-mutation-hub");
		const INVALIDATION_ONLY = Symbol.for("dsh-web.body-mutation-invalidation");
		function needsRecords(subscribers) {
			for (const listener of subscribers) if (!listener[INVALIDATION_ONLY]) return true;
			return false;
		}
		/**
		* Subscribe to a coalesced DOM re-check without retaining mutation records.
		* The marked wrapper also works with an older hub, which delivers records
		* that it simply ignores until a page reload picks up the updated hub.
		*/
		function subscribeBodyInvalidations(subscriber) {
			const listener = () => {
				subscriber();
			};
			listener[INVALIDATION_ONLY] = true;
			return subscribeBodyMutations(listener);
		}
		/**
		* Subscribe to body-level childList mutations.
		* @param subscriber - called at most once per animation frame with the records
		*   collected since the previous flush; must be safe to run repeatedly.
		* @returns the disposer removing this subscriber (and the observer when it was
		*   the last one).
		*/
		function subscribeBodyMutations(subscriber) {
			if (typeof globalThis === "undefined" || typeof document === "undefined") return () => {};
			if (typeof MutationObserver !== "function") return () => {};
			const registry = globalThis;
			let hub = registry[HUB_KEY];
			if (hub === void 0) {
				const subscribers = /* @__PURE__ */ new Set();
				const created = {
					observer: void 0,
					subscribers,
					pending: [],
					scheduled: false
				};
				const flush = () => {
					created.frame = void 0;
					created.scheduled = false;
					const batch = created.pending;
					created.pending = [];
					for (const listener of [...subscribers]) {
						if (!subscribers.has(listener)) continue;
						try {
							listener(batch);
						} catch {}
					}
				};
				const schedule = () => {
					if (created.scheduled) return;
					created.scheduled = true;
					if (typeof requestAnimationFrame === "function") created.frame = requestAnimationFrame(flush);
					else flush();
				};
				created.observer = new MutationObserver((records) => {
					if (needsRecords(subscribers)) for (const record of records) created.pending.push(record);
					schedule();
				});
				created.observer.observe(document.body ?? document.documentElement, {
					childList: true,
					subtree: true
				});
				registry[HUB_KEY] = created;
				hub = created;
			}
			const active = hub;
			active.subscribers.add(subscriber);
			let subscribed = true;
			return () => {
				if (!subscribed) return;
				subscribed = false;
				active.subscribers.delete(subscriber);
				if (!needsRecords(active.subscribers)) active.pending = [];
				if (active.subscribers.size === 0 && registry[HUB_KEY] === active) {
					active.observer.disconnect();
					if (active.frame !== void 0 && typeof cancelAnimationFrame === "function") cancelAnimationFrame(active.frame);
					active.frame = void 0;
					active.pending = [];
					active.scheduled = false;
					delete registry[HUB_KEY];
				}
			};
		}
		//#endregion
		//#region src/client/UsageFootCard.tsx
		/**
		* Sidebar foot card: the compact usage glance seated below the shell sidebar's
		* Settings row. It is deliberately a GLANCE, not the panel the 2026-09-18
		* removal took out. Two states, persisted across reloads:
		*
		* - expanded (default): a price-first headline (today's estimated spend,
		*   falling back to today's tokens when nothing priced was recorded), a
		*   tokens/calls line, up to two configured-provider balances, and an
		*   updated-at footer;
		* - collapsed: a one-line strip with the gauge glyph, the spending
		*   provider's name, the label and the headline value.
		*
		* The card body is one button that opens the settings panel on the usage
		* section, so detail lives in exactly one place; the corner chevron toggles
		* the collapse state (sibling buttons — buttons inside a button are invalid
		* HTML).
		*
		* Data comes from the same shared store the settings section reads; the card
		* runs its own relaxed poll loop (30 s, visible-tab only) because the sidebar
		* foot is permanently mounted. The card disappears while the plugin is
		* disabled (settings flag) or while the host serves no usage routes (a 404
		* means the host half is off), matching the section's own gating.
		* @module @linxin666/dsh-usage/client/UsageFootCard
		*/
		/** Poll cadence of the permanently seated card; the section's 10 s loop stays its own. */
		const FOOT_CARD_POLL_MS = 3e4;
		/** localStorage key holding the collapsed flag ('1' = collapsed strip). */
		const FOOT_CARD_COLLAPSED_KEY = "muciya-usage.foot-card.collapsed";
		/** At most this many provider balances render before a +N overflow marker. */
		const BALANCE_CAP = 2;
		/** Read the persisted collapsed flag (absent = expanded). */
		function readFootCardCollapsed() {
			try {
				return window.localStorage.getItem(FOOT_CARD_COLLAPSED_KEY) === "1";
			} catch {
				return false;
			}
		}
		/** Persist the collapsed flag; storage failures keep the session state. */
		function writeFootCardCollapsed(collapsed) {
			try {
				window.localStorage.setItem(FOOT_CARD_COLLAPSED_KEY, collapsed ? "1" : "0");
			} catch {}
		}
		/** Inline gauge glyph, 14px beside the card title. */
		function GaugeIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 16 16",
				width: "14",
				height: "14",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 12.5a7 7 0 0 1 11 -4.3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 12.5V8.2l2.9-2.1" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "8",
						cy: "12.5",
						r: "1"
					})
				]
			});
		}
		/** Disclosure chevrons: down collapses the expanded card, up expands the strip. */
		function ChevronIcon(props) {
			return props.collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 16 16",
				width: "12",
				height: "12",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m4 10 4-4 4 4" })
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 16 16",
				width: "12",
				height: "12",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m4 6 4 4 4-4" })
			});
		}
		/** A provider row worth showing a balance for: configured, with a probed balance. */
		function balanceRow(provider) {
			const supported = provider.balanceSupported === true || provider.balanceSupported === void 0 && provider.supported;
			return provider.credential !== "none" && supported && provider.balance !== void 0;
		}
		/** Currency-symbol prefix for the priced balances (CNY/USD), else the ISO code. */
		function formatBalance(balance) {
			const currency = balance.currency.toUpperCase();
			if (currency === "CNY") return "¥" + balance.totalBalance;
			if (currency === "USD") return "$" + balance.totalBalance;
			return currency + " " + balance.totalBalance;
		}
		/**
		* Route key owning today's priced spend: the day's highest cost row, else the
		* current session route (an older host without the day rows falls back to the
		* current route). Undefined when neither names one.
		*/
		function spendRoute(snapshot) {
			let top;
			for (const row of snapshot.usage.today.providers) {
				if (row.totals.cost <= 0) continue;
				if (top === void 0 || row.totals.cost > top.totals.cost) top = row;
			}
			return top?.provider ?? snapshot.current.provider;
		}
		/** Display name of the route spendRoute() names, resolved through the snapshot. */
		function spendProvider(snapshot) {
			const route = spendRoute(snapshot);
			if (route === void 0) return void 0;
			return snapshot.providers.find((entry) => entry.provider === route)?.displayName ?? (route === snapshot.current.provider ? snapshot.current.displayName : void 0) ?? route;
		}
		/**
		* The headline triple: today's priced spend, else today's tokens, else zero.
		* tokenFallback tells the sub-line to keep only the call count instead of
		* repeating the total the headline already shows; provider names the spender
		* beside the collapsed cost headline.
		*/
		function headline(snapshot) {
			const totals = snapshot.usage.today.totals;
			if (totals.cost > 0) return {
				label: t("usage.foot.cost"),
				value: "¥" + totals.cost.toFixed(2),
				tokenFallback: false,
				provider: spendProvider(snapshot)
			};
			if (totals.calls > 0) return {
				label: t("usage.today"),
				value: formatTokens(totalTokens(totals)) + " tokens",
				tokenFallback: true
			};
			return {
				label: t("usage.foot.cost"),
				value: "¥0.00",
				tokenFallback: false
			};
		}
		/** The tokens/calls sub-line under the headline; a quiet no-data line on an empty day. */
		function usageLine(snapshot, tokenFallback) {
			const totals = snapshot.usage.today.totals;
			if (totals.calls === 0) return t("usage.foot.noData");
			const calls = t("usage.calls", { n: totals.calls });
			return tokenFallback ? calls : formatTokens(totalTokens(totals)) + " tokens · " + calls;
		}
		/** The balance line: up to BALANCE_CAP providers plus a +N overflow marker. */
		function balanceLine(snapshot) {
			const rows = snapshot.providers.filter(balanceRow);
			if (rows.length === 0) return void 0;
			return rows.slice(0, BALANCE_CAP).map((provider) => provider.displayName + " " + formatBalance(provider.balance)).join(" · ") + (rows.length > BALANCE_CAP ? " +" + String(rows.length - BALANCE_CAP) : "");
		}
		/** Card chrome classes for the current collapse state. */
		function cardClass(collapsed) {
			return collapsed ? usage_module_css_default.footCard + " " + usage_module_css_default.footCardCollapsed : usage_module_css_default.footCard;
		}
		/**
		* Render the foot card content for the current store snapshot.
		* @param props - store, poller, settings form and open callback from the mount.
		* @returns the card, or null while disabled / host-off.
		*/
		function UsageFootCard(props) {
			const { store, poll, onOpen, settings, locale } = props;
			const ui = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
			const [, bump] = (0, react.useState)(0);
			(0, react.useEffect)(() => settings.subscribe(() => bump((count) => count + 1)), [settings]);
			(0, react.useEffect)(() => locale?.subscribe(() => bump((count) => count + 1)), [locale]);
			const enabled = settings.getSnapshot().value?.enabled ?? true;
			const [collapsed, setCollapsed] = (0, react.useState)(readFootCardCollapsed);
			const toggleCollapsed = () => {
				setCollapsed((current) => {
					writeFootCardCollapsed(!current);
					return !current;
				});
			};
			(0, react.useEffect)(() => {
				if (!enabled) return void 0;
				poll();
				let timer;
				const start = () => {
					if (timer === void 0 && document.visibilityState === "visible") timer = window.setInterval(poll, FOOT_CARD_POLL_MS);
				};
				const onVisibility = () => {
					if (document.visibilityState === "visible") {
						poll();
						start();
					} else if (timer !== void 0) {
						window.clearInterval(timer);
						timer = void 0;
					}
				};
				start();
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					if (timer !== void 0) window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, [poll, enabled]);
			if (!enabled) return null;
			const snapshot = ui.snapshot;
			if (snapshot === null && ui.status === "error" && /failed: 404/.test(ui.error ?? "")) return null;
			const toggle = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: usage_module_css_default.footToggle,
				"data-dsh-part": "foot-card-toggle",
				"aria-label": t(collapsed ? "usage.foot.expand" : "usage.foot.collapse"),
				title: t(collapsed ? "usage.foot.expand" : "usage.foot.collapse"),
				onClick: toggleCollapsed,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronIcon, { collapsed })
			});
			if (snapshot === null) {
				const quiet = ui.status === "error" ? t("usage.error", { error: ui.error ?? "" }) : t("usage.loading");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: cardClass(collapsed),
					"data-dsh-plugin": "usage",
					"data-dsh-part": "foot-card",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: usage_module_css_default.footMain,
						"data-dsh-part": "foot-card-main",
						"aria-label": t("usage.foot.open"),
						title: t("usage.foot.open"),
						onClick: onOpen,
						children: collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: usage_module_css_default.footStrip,
							"data-dsh-part": "foot-card-strip",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GaugeIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.footStripValue,
								children: "—"
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.footHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: usage_module_css_default.footTitle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GaugeIcon, {}), t("usage.title")]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.footLine,
							children: quiet
						})] })
					}), toggle]
				});
			}
			const head = headline(snapshot);
			const balances = balanceLine(snapshot);
			const route = spendRoute(snapshot);
			const period = route !== void 0 && isDeepSeekProviderRoute(route) ? deepseekPeriodAt(Date.now()) : void 0;
			if (collapsed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cardClass(true),
				"data-dsh-plugin": "usage",
				"data-dsh-part": "foot-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: usage_module_css_default.footMain,
					"data-dsh-part": "foot-card-main",
					"aria-label": t("usage.foot.open"),
					title: t("usage.foot.open"),
					onClick: onOpen,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: usage_module_css_default.footStrip,
						"data-dsh-part": "foot-card-strip",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GaugeIcon, {}),
							head.provider !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.footStripProvider,
								children: head.provider
							}),
							period !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PeakBadge, {
								peak: period.peak,
								boundaryMs: period.boundaryMs,
								variant: "compact"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.footStripLabel,
								children: head.label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.footStripValue,
								children: head.value
							})
						]
					})
				}), toggle]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cardClass(false),
				"data-dsh-plugin": "usage",
				"data-dsh-part": "foot-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: usage_module_css_default.footMain,
					"data-dsh-part": "foot-card-main",
					"aria-label": t("usage.foot.open"),
					title: t("usage.foot.open"),
					onClick: onOpen,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: usage_module_css_default.footHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: usage_module_css_default.footTitle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GaugeIcon, {}), head.label]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.footValue,
								children: head.value
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.footLine,
							"data-dsh-part": "foot-card-usage",
							children: usageLine(snapshot, head.tokenFallback)
						}),
						balances !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.footLine,
							"data-dsh-part": "foot-card-balances",
							children: balances
						}),
						period !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: usage_module_css_default.footPeak,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PeakBadge, {
								peak: period.peak,
								boundaryMs: period.boundaryMs,
								variant: "compact"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: usage_module_css_default.footPeakClock,
								children: t(period.peak ? "usage.peak.ends" : "usage.peak.starts", { time: formatClock(period.boundaryMs) })
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: usage_module_css_default.footMeta,
							children: t("usage.updated", { time: formatClock(snapshot.updatedAt) })
						})
					]
				}), toggle]
			});
		}
		/** The shell sidebar's foot area (footer actions + the Settings row), when mounted. */
		function footArea() {
			return document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]")?.querySelector("[class*=\"footArea\"]") ?? void 0;
		}
		/**
		* Open the settings panel on the usage section. The shell owns the panel's
		* open state and exposes no service for it, so the card replays the user's
		* own path: activate the sidebar Settings trigger, then pick the nav row
		* carrying the section's (localized) label. Every step degrades silently —
		* with the panel already open only the nav pick runs, and a missing row
		* leaves the panel on its default section.
		* @param label - the usage section's nav label in the active locale.
		*/
		function openUsageSettings(label) {
			/** Click the nav row carrying the usage label inside the open panel. */
			const pick = (panel) => {
				const wanted = label();
				for (const row of panel.querySelectorAll("nav button")) if (row.textContent !== null && row.textContent.includes(wanted)) {
					row.click();
					return;
				}
			};
			const open = document.querySelector("[role=\"dialog\"]");
			if (open !== null) {
				pick(open);
				return;
			}
			(document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]")?.querySelector("[class*=\"settingsArea\"] button"))?.click();
			let tries = 0;
			const attempt = () => {
				const panel = document.querySelector("[role=\"dialog\"]");
				if (panel !== null) {
					pick(panel);
					return;
				}
				tries += 1;
				if (tries <= 20) window.setTimeout(attempt, 50);
			};
			window.setTimeout(attempt, 0);
		}
		/**
		* Mount the sidebar foot card directly above the Settings row.
		* @param props - the store/poll/settings/open inputs of the apply body.
		* @returns disposer removing the container and its observers.
		*/
		function mountUsageFootCard(props) {
			if (typeof document !== "undefined" && document.querySelector("[data-muciya-usage-foot-card]") !== null) return () => {};
			const container = document.createElement("div");
			container.setAttribute("data-muciya-usage-foot-card", "");
			const root = (0, react_dom_client.createRoot)(container);
			root.render((0, react.createElement)(UsageFootCard, props));
			/** Keep the container directly above the Settings seat inside the foot area. */
			const place = () => {
				const foot = footArea();
				if (foot === void 0) return;
				const settings = foot.querySelector("[class*=\"settingsArea\"]");
				if (settings !== null) {
					if (container.nextElementSibling !== settings) foot.insertBefore(container, settings);
					return;
				}
				if (foot.lastElementChild !== container) foot.append(container);
			};
			place();
			const unsubscribeBody = subscribeBodyInvalidations(place);
			return () => {
				unsubscribeBody();
				root.unmount();
				container.remove();
			};
		}
		//#endregion
		//#region src/client/settings-entry-form.ts
		/** The snapshot a form reports before the Host has answered with this entry. */
		function pendingSnapshot() {
			return {
				status: "loading",
				value: void 0,
				base: void 0,
				user: void 0,
				revision: void 0,
				writable: false
			};
		}
		/**
		* Create a settings form bound to the profile entry id this Host serves, and
		* rebound whenever the shared describe mirror names a different one of this
		* package's rows.
		* @param options - the shared forms service and this package's candidate row ids.
		* @returns a form delegating to the currently resolved entry's own form.
		*/
		function createServedEntryForm(options) {
			const { forms, entryIds } = options;
			const fallbackId = entryIds[0];
			const namespaceId = entryIds[entryIds.length - 1];
			const listeners = /* @__PURE__ */ new Set();
			let boundId;
			let bound;
			let offBound;
			let snapshot = pendingSnapshot();
			/** Republish: the delegated snapshot when one is bound, the pending one otherwise. */
			const publish = () => {
				if (bound !== void 0) snapshot = bound.getSnapshot();
				for (const listener of [...listeners]) listener();
			};
			/**
			* The entry id the mirror currently justifies. An unanswered or empty mirror
			* is not evidence of absence, so it keeps the first candidate; a mirror that
			* answers without any of this package's rows leaves the namespace itself.
			* @returns the entry id to bind.
			*/
			const resolve = () => {
				let served;
				try {
					served = forms.describe().getSnapshot().view?.namespaces.map((row) => row.ns);
				} catch {
					served = void 0;
				}
				if (served === void 0 || served.length === 0) return fallbackId;
				return entryIds.find((id) => served.includes(id)) ?? namespaceId;
			};
			/** Bind (or rebind) the resolved entry's form; a no-op while it is unchanged. */
			const bind = () => {
				const target = resolve();
				if (target === boundId) return;
				offBound?.();
				offBound = void 0;
				let form;
				try {
					form = forms.get(target);
				} catch {
					boundId = void 0;
					return;
				}
				boundId = target;
				bound = form;
				offBound = form.subscribe(() => {
					publish();
				});
				publish();
			};
			try {
				forms.describe().subscribe(() => {
					bind();
				});
			} catch {}
			bind();
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				set: (field, value) => bound?.set(field, value) ?? Promise.resolve(false),
				unset: (field) => bound?.unset(field) ?? Promise.resolve(false),
				mutate: (ops, expectedRevision) => bound?.mutate(ops, expectedRevision) ?? Promise.resolve(false)
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** Hard ceiling for one usage API call; a stalled host must not pile up requests. */
		const USAGE_FETCH_TIMEOUT_MS = 2e4;
		async function usageFetch(path, method) {
			const response = await fetch(path, {
				...method === "POST" ? { method: "POST" } : {},
				signal: AbortSignal.timeout(USAGE_FETCH_TIMEOUT_MS)
			});
			if (!response.ok) throw new Error("usage " + path + " failed: " + response.status);
			return await response.json();
		}
		const usageApi = {
			overview: () => usageFetch("api/muciya-usage/overview", "GET"),
			day: async (date) => (await usageFetch("api/muciya-usage/day?date=" + encodeURIComponent(date), "GET")).day,
			refresh: () => usageFetch("api/muciya-usage/refresh", "POST")
		};
		/**
		* Settings namespace the section edits: the family identity of this plugin's
		* own settings form, and the row id a standalone bundle install carries.
		*/
		const USAGE_SETTINGS_NS = "muciya-usage";
		/** Profile entry ids this package's patch rows carry, most likely first. */
		const USAGE_ENTRY_IDS = [
			"web-ui-usage",
			"usage",
			USAGE_SETTINGS_NS
		];
		/** First-level nav position: directly below the Workshop section (order 150). */
		const SECTION_ORDER = 151;
		/** Required services. */
		const inject = [
			"slots",
			"locale",
			"connection",
			"configForms",
			"remote"
		];
		/**
		* Client plugin body: register dictionaries and seat the settings section.
		* The overview poll loop and the store live with the section component's
		* mount cycle, so no background traffic exists while the page is closed.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => {
				try {
					return ctx.locale.register(NS, {
						zh,
						en
					});
				} catch {
					return () => {};
				}
			}, "dsh-usage: dictionaries");
			const binder = ctx.get("webUiSettings");
			const settingsForm = binder !== void 0 ? binder.bind({ namespace: USAGE_SETTINGS_NS }) : createServedEntryForm({
				forms: ctx.configForms,
				entryIds: USAGE_ENTRY_IDS
			});
			const store = createUsageStore().create();
			let pollSeq = 0;
			const poll = () => {
				const seq = pollSeq + 1;
				pollSeq = seq;
				usageApi.overview().then((snapshot) => {
					if (seq !== pollSeq) return;
					store.actions.setSnapshot(snapshot);
				}, (error) => {
					if (seq !== pollSeq) return;
					store.actions.setState("error", error instanceof Error ? error.message : String(error));
				});
			};
			const refresh = () => {
				const seq = pollSeq + 1;
				pollSeq = seq;
				usageApi.refresh().then((snapshot) => {
					pollSeq = seq;
					store.actions.setSnapshot(snapshot);
				}, (error) => {
					if (seq !== pollSeq) return;
					store.actions.setState("error", error instanceof Error ? error.message : String(error));
				});
			};
			const loadDay = (date) => usageApi.day(date);
			const face = () => ({
				store,
				poll,
				refresh,
				loadDay,
				settings: settingsForm
			});
			const disposeFootCard = mountUsageFootCard({
				store,
				poll,
				settings: settingsForm,
				onOpen: () => {
					openUsageSettings(() => t("usage.title"));
				},
				locale: ctx.locale
			});
			ctx.effect(() => () => {
				try {
					disposeFootCard();
				} catch {}
			}, "dsh-usage: sidebar foot card");
			ctx.slots.inject("settings.section", () => {
				try {
					const unregister = ctx.slots.register({
						name: "settings.section",
						id: "muciya-usage",
						order: SECTION_ORDER,
						label: () => ctx.locale.bind(NS)("usage.title"),
						locale: NS,
						inject: face
					}, UsageSectionCard);
					return () => {
						unregister();
					};
				} catch {
					return () => {};
				}
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map