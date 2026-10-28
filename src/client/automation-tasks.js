var module = { exports: {} };
var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const React = require("react");
const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const h = React.createElement;
/** This package's manifest name; the sidebar entry id, the panel key and the loader id all agree. */
const PACKAGE_NAME = "dsh-plugin-automation-tasks";
/** Dictionary namespace owned by this plugin. */
const NS = "automationTasks";
/** The id shared by the sidebar row and the main panel it opens. */
const PANEL_ID = "automation";
/** The host half's API prefix. */
const API_BASE = "/api/automation-tasks/v1";
/** Shared token layer tag: the package name, lower-cased, never the per-panel constant. */
const TOKENS_TAG_ID = "muciya-dsh-plugin-macos-suite/tokens.css";
/** Closing marker of the token block inside `css`; the layer below slices up to it. */
const TOKENS_END = "/* mds-tokens end */";
/** Inline style tag identity, so a reload replaces this plugin's CSS instead of stacking it. */
const CSS_TAG_ID = PACKAGE_NAME + "/AutomationTasks.module.css";
/** How often the list re-scans while the page is visible. */
const REFRESH_INTERVAL_MS = 30_000;
/** How long an action result stays on screen. */
const FLASH_MS = 4_000;
//#region locales
/** Simplified Chinese dictionary (the key-set source of truth). */
const zh = {
	panel: "自动化任务",
	title: "自动化任务",
	subtitle: "本机 launchd、crontab 与 DSH 内部定时的当前状态",
	refresh: "刷新",
	"refresh.label": "重新扫描本机自动化任务",
	"stats.total": "共 {n} 项",
	"stats.running": "运行中 {n}",
	"stats.loaded": "已加载 {n}",
	"stats.scannedAt": "扫描于 {time}",
	"filter.apple": "显示 Apple 系统项",
	"filter.apple.label": "在系统级分组里显示 com.apple.* 任务",
	"state.running": "运行中",
	"state.loaded": "已加载",
	"state.idle": "未加载",
	"state.shared": "系统域",
	readonly: "只读",
	"next.at": "下次 {time}",
	"next.relative": "{relative}",
	"meta.exit": "上次退出码 {code}",
	"meta.pid": "pid {pid}",
	"meta.program": "程序 {name}",
	"meta.script": "脚本 {name}",
	"meta.path": "plist",
	enable: "启用",
	"enable.label": "启用 {label}",
	disable: "停用",
	"disable.label": "停用 {label}",
	run: "立即运行",
	"run.label": "立即运行 {label}",
	log: "日志",
	"log.label": "查看 {label} 的日志",
	"log.hide": "收起",
	"log.title": "日志尾部",
	"log.reload": "重新读取",
	"log.empty": "日志文件为空",
	"log.missing": "还没有日志文件",
	"log.truncated": "只显示最后 {n} 行",
	"log.path": "路径",
	"log.stdout": "StandardOut",
	"log.stderr": "StandardError",
	"log.none": "该任务没有配置日志文件",
	"log.loading": "读取中…",
	"log.failed": "读取日志失败：{reason}",
	"row.expand": "展开 {label} 的详情",
	"row.collapse": "收起 {label} 的详情",
	"group.empty": "该分组暂无任务",
	"group.count": "{n} 项",
	loading: "正在扫描本机自动化任务…",
	"empty.title": "没有发现自动化任务",
	"empty.body": "launchd、crontab 与 DSH 内部都没有可列出的定时任务。",
	"empty.filtered.title": "当前筛选没有匹配项",
	"empty.filtered.body": "任务本身是有的，只是被「显示 Apple 自带任务」这个开关过滤掉了；打开它或刷新后再看。",
	"failed.title": "读取失败",
	retry: "重试",
	"action.failed": "{reason}",
	"result.enabled": "已启用",
	"result.disabled": "已停用",
	"result.already-enabled": "任务本来就已加载",
	"result.already-disabled": "任务本来就未加载",
	"result.kicked": "已请求立即运行",
	"result.unchanged": "状态未变化",
	"time.soon": "即将",
	"time.justNow": "刚刚",
	"time.inMinutes": "{n} 分钟后",
	"time.minutesAgo": "{n} 分钟前",
	"time.inHours": "{n} 小时后",
	"time.hoursAgo": "{n} 小时前",
	"time.inDays": "{n} 天后",
	"time.daysAgo": "{n} 天前",
	"error.http": "请求失败（HTTP {status}）。",
	"error.body-too-large": "请求体过大，面板没有发出去。",
	"error.bad-json": "面板发出的请求本机读不懂。",
	"error.readonly-scope": "只有你自己的 launchd 任务能在这里改动，系统作用域是只读的。",
	"error.not-found": "这个任务已经不在这台 Mac 上了。",
	"error.not-loaded": "这个任务没有被加载，没有可运行的内容。",
	"error.no-log-path": "这个任务没有声明日志文件。",
	"error.log-missing": "这个任务的日志文件还不存在。",
};
/** English dictionary. */
const en = {
	panel: "Automations",
	title: "Automations",
	subtitle: "What this Mac runs on a schedule: launchd, crontab and DSH's own clocks",
	refresh: "Refresh",
	"refresh.label": "Rescan this Mac's automations",
	"stats.total": "{n} total",
	"stats.running": "{n} running",
	"stats.loaded": "{n} loaded",
	"stats.scannedAt": "scanned {time}",
	"filter.apple": "Show Apple system jobs",
	"filter.apple.label": "Show com.apple.* jobs in the system groups",
	"state.running": "Running",
	"state.loaded": "Loaded",
	"state.idle": "Not loaded",
	"state.shared": "System domain",
	readonly: "Read-only",
	"next.at": "next {time}",
	"next.relative": "{relative}",
	"meta.exit": "last exit {code}",
	"meta.pid": "pid {pid}",
	"meta.program": "program {name}",
	"meta.script": "script {name}",
	"meta.path": "plist",
	enable: "Enable",
	"enable.label": "Enable {label}",
	disable: "Disable",
	"disable.label": "Disable {label}",
	run: "Run now",
	"run.label": "Run {label} now",
	log: "Log",
	"log.label": "Show the log of {label}",
	"log.hide": "Hide",
	"log.title": "Log tail",
	"log.reload": "Reload",
	"log.empty": "The log file is empty",
	"log.missing": "No log file yet",
	"log.truncated": "last {n} lines only",
	"log.path": "Path",
	"log.stdout": "StandardOut",
	"log.stderr": "StandardError",
	"log.none": "This job declares no log file",
	"log.loading": "Reading…",
	"log.failed": "Could not read the log: {reason}",
	"row.expand": "Show the details of {label}",
	"row.collapse": "Hide the details of {label}",
	"group.empty": "Nothing in this group",
	"group.count": "{n}",
	loading: "Scanning this Mac's automations…",
	"empty.title": "No automations found",
	"empty.body": "launchd, crontab and DSH all report nothing scheduled.",
	"empty.filtered.title": "Nothing matches this filter",
	"empty.filtered.body": "Tasks exist but the \"Show Apple tasks\" switch hides all of them; turn it on or refresh to look again.",
	"failed.title": "Scan failed",
	retry: "Retry",
	"action.failed": "{reason}",
	"result.enabled": "Enabled",
	"result.disabled": "Disabled",
	"result.already-enabled": "It was already loaded",
	"result.already-disabled": "It was already unloaded",
	"result.kicked": "Run requested",
	"result.unchanged": "Nothing changed",
	"time.soon": "any moment",
	"time.justNow": "just now",
	"time.inMinutes": "in {n} min",
	"time.minutesAgo": "{n} min ago",
	"time.inHours": "in {n} h",
	"time.hoursAgo": "{n} h ago",
	"time.inDays": "in {n} d",
	"time.daysAgo": "{n} d ago",
	"error.http": "The Host answered with HTTP {status}.",
	"error.body-too-large": "That request was too large for this panel to send.",
	"error.bad-json": "The panel sent a request this machine could not read.",
	"error.readonly-scope": "Only your own launchd tasks can be changed here; system scopes stay read-only.",
	"error.not-found": "That task is no longer on this Mac.",
	"error.not-loaded": "That task is not loaded, so there is nothing to run.",
	"error.no-log-path": "That task declares no log file.",
	"error.log-missing": "That task's log file does not exist yet.",
};
//#endregion
//#region styles
const css = [
	"/* mds-tokens v1 — 三份样式表逐字共用；选择器必须是 body，不是 :root（见 §3.2） */\n",
	"body{\n",
	"  --mds-text-2xs:0.6875rem;--mds-text-xs:0.75rem;--mds-text-sm:0.8125rem;--mds-text-md:0.875rem;--mds-text-lg:1rem;--mds-text-xl:1.25rem;\n",
	"  --mds-leading-2xs:1rem;--mds-leading-xs:1.0625rem;--mds-leading-sm:1.1875rem;--mds-leading-md:1.25rem;--mds-leading-lg:1.375rem;--mds-leading-xl:1.75rem;\n",
	"  --mds-weight-regular:400;--mds-weight-medium:500;--mds-weight-semibold:600;\n",
	"  --mds-tracking-tight:-0.01em;--mds-tracking-normal:0;--mds-tracking-wide:0.01em;\n",
	"  --mds-space-1:0.125rem;--mds-space-2:0.25rem;--mds-space-3:0.5rem;--mds-space-4:0.75rem;--mds-space-5:1rem;--mds-space-6:1.375rem;--mds-space-7:1.75rem;--mds-space-8:2.5rem;\n",
	"  --mds-radius-chip:6px;--mds-radius-row:10px;--mds-radius-card:14px;--mds-radius-modal:16px;--mds-radius-pill:999px;\n",
	"  --mds-control-xs:20px;--mds-control-sm:24px;--mds-control-md:28px;--mds-control-lg:36px;\n",
	"  --mds-surface-panel:var(--dsw-alias-bg-base);\n",
	"  --mds-surface-tint:var(--dsw-alias-interactive-bg-hover);\n",
	"  --mds-surface-solid:var(--dsw-alias-bg-module-platform);\n",
	"  --mds-surface-hover:var(--dsw-alias-interactive-bg-hover);\n",
	"  --mds-surface-pressed:var(--dsw-alias-interactive-bg-active);\n",
	"  --mds-text-primary:var(--dsw-alias-label-primary);\n",
	"  --mds-text-secondary:var(--dsw-alias-label-secondary);\n",
	"  --mds-text-tertiary:var(--dsw-alias-label-tertiary);\n",
	"  --mds-text-disabled:var(--dsw-alias-label-caption);\n",
	"  --mds-line-hairline:var(--dsw-alias-border-l1);\n",
	"  --mds-line-default:var(--dsw-alias-border-l2);\n",
	"  --mds-line-strong:var(--dsw-alias-border-l3);\n",
	"  --mds-accent:var(--dsw-alias-state-business-primary);\n",
	"  --mds-danger:var(--dsw-alias-state-error-primary);\n",
	"  --mds-danger-surface:var(--dsw-alias-interactive-bg-hover-danger);\n",
	"  --mds-toast-surface:var(--dsw-alias-toast-bg);\n",
	"  --mds-toast-text:var(--dsw-alias-toast-label);\n",
	"  --mds-toast-danger-text:#ffb4b4;\n",
	"  --mds-brand-ink:var(--dsw-alias-brand-primary);\n",
	"  --mds-switch-thumb:var(--dsw-alias-switch-thumb);\n",
	"  --mds-photo-scrim:linear-gradient(180deg,transparent 46%,rgba(8,10,14,.70) 100%);\n",
	"  --mds-photo-text-shadow:0 1px 2px rgba(0,0,0,.7),0 1px 10px rgba(0,0,0,.5);\n",
	"  --mds-dur-press:90ms;--mds-dur-hover:120ms;--mds-dur-base:200ms;--mds-dur-slow:340ms;\n",
	"  --mds-ease-standard:cubic-bezier(.32,.72,0,1);\n",
	"  --mds-ease-exit:cubic-bezier(.4,0,1,1);\n",
	"  --mds-ease-spring:cubic-bezier(.34,1.56,.64,1);\n",
	"  --mds-focus-width:var(--dsw-focus-ring-width,2px);\n",
	"  --mds-focus-color:var(--dsw-alias-state-business-primary);\n",
	"  --mds-blur-sm:4px;\n",
	"  --mds-blur-md:14px;\n",
	"  --mds-blur-lg:20px;--mds-edge-fade-opacity:0;\n",
	"}\n",
	"@media (prefers-reduced-motion:reduce){ body{--mds-dur-press:1ms;--mds-dur-hover:1ms;--mds-dur-base:120ms;--mds-dur-slow:1ms} }\n",
	"@media (prefers-reduced-transparency:reduce){ body{--mds-surface-tint:var(--mds-surface-solid)} }\n",
	"@media (prefers-contrast:more){ body{--mds-line-hairline:var(--mds-line-default);--mds-surface-tint:var(--mds-surface-solid)} }\n",
	"/* mds-tokens end */\n",
	".dsl-automation-page{box-sizing:border-box;width:100%;min-width:0;height:100%;min-height:0;color:var(--mds-text-primary);background:var(--mds-surface-panel);display:flex;overflow:hidden}",
	".dsl-automation-scroll{scrollbar-gutter:stable;--dsh-scrollbar-width:9px;--dsh-scrollbar-thumb-border:2px;flex:1;min-height:0;overflow:auto}",
	".dsl-automation-content{max-width:920px;margin:0 auto;padding:0 clamp(20px,4vw,40px) 40px}",
	".dsl-automation-head{justify-content:space-between;align-items:flex-start;gap:var(--mds-space-5);padding-top:var(--mds-space-7);display:flex;flex-wrap:wrap}",
	"[data-platform=darwin] .dsl-automation-head{padding-top:calc(var(--mds-space-7) + var(--dsh-frame-top-clearance,0px))}",
	".dsl-automation-title{margin:0;font-size:var(--mds-text-xl);font-weight:var(--mds-weight-medium);line-height:var(--mds-leading-xl)}",
	".dsl-automation-subtitle{color:var(--mds-text-secondary);overflow-wrap:anywhere;margin:var(--mds-space-2) 0 0;font-size:var(--mds-text-sm);line-height:var(--mds-leading-md)}",
	".dsl-automation-headActions{flex:none;align-items:center;gap:var(--mds-space-3);display:flex}",
	".dsl-automation-stats{color:var(--mds-text-tertiary);align-items:center;flex-wrap:wrap;gap:6px 14px;margin:18px 0 4px;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md);display:flex}",
	".dsl-automation-statNum{color:var(--mds-text-secondary);font-variant-numeric:tabular-nums}",
	".dsl-automation-statRunning .dsl-automation-statNum{color:var(--mds-accent)}",
	".dsl-automation-scanAt{color:var(--mds-text-disabled);margin-left:auto}",
	".dsl-automation-flash{border-radius:var(--mds-radius-row);background:var(--mds-surface-tint);color:var(--mds-text-secondary);margin:10px 0 0;padding:7px 11px;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md)}",
	".dsl-automation-flashError{color:var(--mds-danger)}",
	".dsl-automation-filter{align-items:center;gap:6px;color:var(--mds-text-tertiary);cursor:pointer;margin:14px 0 0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md);display:inline-flex}",
	".dsl-automation-filter input{margin:0}",
	".dsl-automation-group{margin:var(--mds-space-6) 0 0;border-radius:var(--mds-radius-card);border:.5px solid var(--mds-line-strong);overflow:hidden}",
	".dsl-automation-groupHead{background:var(--mds-surface-tint);align-items:center;gap:10px;padding:9px 12px;display:flex}",
	".dsl-automation-caret{border:0;background:0 0;width:20px;height:var(--mds-control-xs);color:var(--mds-text-tertiary);cursor:pointer;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}",
	".dsl-automation-caret:hover{color:var(--mds-text-primary)}",
	".dsl-automation-caret:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--mds-focus-color);outline-offset:1px}",
	".dsl-automation-rowToggle{border:0;background:0 0;width:18px;height:var(--mds-control-xs);color:var(--mds-text-disabled);cursor:pointer;border-radius:50%;flex:none;justify-content:center;align-items:center;margin:1px 0 0;padding:0;display:inline-flex}",
	".dsl-automation-rowToggle:hover{color:var(--mds-text-primary)}",
	".dsl-automation-rowToggle:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--mds-focus-color);outline-offset:1px}",
	".dsl-automation-groupTitle{margin:0;font-size:var(--mds-text-sm);font-weight:var(--mds-weight-medium);line-height:var(--mds-leading-md)}",
	".dsl-automation-groupHint{color:var(--mds-text-disabled);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md)}",
	".dsl-automation-groupCount{color:var(--mds-text-disabled);font-variant-numeric:tabular-nums;flex:none;margin-left:auto;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md)}",
	".dsl-automation-groupEmpty{color:var(--mds-text-disabled);margin:0;padding:var(--mds-space-4);font-size:var(--mds-text-xs);line-height:var(--mds-leading-md)}",
	".dsl-automation-rows{flex-direction:column;margin:0;padding:0;list-style:none;display:flex}",
	".dsl-automation-row{border-top:.5px solid var(--mds-line-strong);align-items:flex-start;gap:10px;padding:10px 12px;display:flex}",
	".dsl-automation-row:active,.dsl-automation-rowToggle:active,.dsl-automation-logTab:active,.dsl-automation-stateAction:active{transform:scale(.984);transition:transform var(--mds-dur-press) ease}\n",
	"@media (prefers-reduced-motion:reduce){.dsl-automation-row:active,.dsl-automation-rowToggle:active,.dsl-automation-logTab:active,.dsl-automation-stateAction:active{transform:none}}\n",
	".dsl-automation-row:first-child{border-top:0}",
	".dsl-automation-row:hover{background:var(--mds-surface-hover)}",
	".dsl-automation-dot{border-radius:50%;background:var(--mds-text-disabled);flex:none;width:8px;height:8px;margin-top:6px}",
	".dsl-automation-dotRunning{background:var(--mds-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--mds-accent) 18%,transparent)}",
	".dsl-automation-dotLoaded{background:var(--mds-text-tertiary)}",
	".dsl-automation-dotIdle{background:0 0;box-shadow:inset 0 0 0 1.5px var(--mds-line-default)}",
	".dsl-automation-rowMain{flex-direction:column;flex:1;gap:var(--mds-space-1);min-width:0;display:flex}",
	".dsl-automation-rowHead{flex-wrap:wrap;align-items:center;gap:var(--mds-space-3);min-width:0;display:flex}",
	".dsl-automation-label{color:var(--mds-text-primary);overflow-wrap:anywhere;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:var(--mds-text-sm);font-weight:var(--mds-weight-semibold);line-height:var(--mds-leading-md)}",
	".dsl-automation-tag{border-radius:var(--mds-radius-chip);background:var(--mds-surface-tint);color:var(--mds-text-secondary);flex:none;padding:0 6px;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-md);letter-spacing:var(--mds-tracking-wide)}",
	".dsl-automation-timing{color:var(--mds-text-secondary);overflow-wrap:anywhere;margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md)}",
	".dsl-automation-about{color:var(--mds-text-secondary);overflow-wrap:anywhere;margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md)}",
	".dsl-automation-meta{color:var(--mds-text-disabled);flex-wrap:wrap;gap:var(--mds-space-2) 12px;margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md);display:flex}",
	".dsl-automation-metaWarn{color:var(--mds-danger)}",
	".dsl-automation-path{color:var(--mds-text-disabled);overflow-wrap:anywhere;margin:0;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:var(--mds-text-2xs);line-height:var(--mds-leading-xs);letter-spacing:var(--mds-tracking-wide)}",
	".dsl-automation-rowError{color:var(--mds-danger);overflow-wrap:anywhere;margin:var(--mds-space-1) 0 0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md)}",
	".dsl-automation-rowDetail{flex-direction:column;gap:var(--mds-space-1);margin-top:2px;display:flex}",
	".dsl-automation-rowEnd{flex:none;align-items:center;gap:var(--mds-space-3);padding-top:2px;display:flex}",
	".dsl-automation-badge{border-radius:var(--mds-radius-chip);background:var(--mds-surface-tint);color:var(--mds-text-secondary);white-space:nowrap;flex:none;padding:0 6px;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-md);letter-spacing:var(--mds-tracking-wide)}",
	".dsl-automation-badgeRunning{background:color-mix(in srgb,var(--mds-accent) 16%,transparent);color:var(--mds-accent)}",
	".dsl-automation-log{border-radius:var(--mds-radius-row);background:var(--mds-surface-tint);flex-direction:column;gap:6px;margin:var(--mds-space-3) 0 2px;padding:9px 11px;display:flex}",
	".dsl-automation-logHead{align-items:center;flex-wrap:wrap;gap:var(--mds-space-3);display:flex}",
	".dsl-automation-logTab{border:.5px solid transparent;background:0 0;border-radius:var(--mds-radius-chip);color:var(--mds-text-tertiary);cursor:pointer;padding:1px 8px;font:inherit;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-md);letter-spacing:var(--mds-tracking-wide)}",
	".dsl-automation-logTab:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}",
	".dsl-automation-logTab:hover{color:var(--mds-text-primary)}",
	".dsl-automation-logTabActive{border-color:var(--mds-line-default);background:var(--dsw-alias-bg-base);color:var(--mds-text-primary)}",
	".dsl-automation-logTab:disabled{cursor:default;opacity:.45}",
	".dsl-automation-logPath{color:var(--mds-text-disabled);overflow-wrap:anywhere;flex:1;min-width:0;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:var(--mds-text-2xs);line-height:var(--mds-leading-xs);letter-spacing:var(--mds-tracking-wide)}",
	".dsl-automation-logBody{color:var(--mds-text-secondary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;margin:0;overflow:auto;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:var(--mds-text-2xs);line-height:var(--mds-leading-xs);letter-spacing:var(--mds-tracking-wide)}",
	".dsl-automation-logNote{color:var(--mds-text-disabled);margin:0;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-xs);letter-spacing:var(--mds-tracking-wide)}",
	".dsl-automation-state{text-align:center;color:var(--mds-text-tertiary);flex-direction:column;align-items:center;gap:var(--mds-space-2);padding:44px 16px;font-size:var(--mds-text-sm);line-height:var(--mds-leading-md);display:flex}",
	".dsl-automation-stateGlyph{color:var(--mds-text-disabled);margin-bottom:6px}",
	".dsl-automation-stateTitle{color:var(--mds-text-secondary);margin:0;font-size:var(--mds-text-md);font-weight:var(--mds-weight-medium);line-height:var(--mds-leading-md)}",
	".dsl-automation-stateBody{margin:0;max-width:420px}",
	".dsl-automation-stateError{color:var(--mds-danger)}",
	".dsl-automation-stateAction{margin-top:10px}",
].join("");

/** The one token block, cut out of `css` so the two copies can never drift apart. */
const TOKENS_CSS = css.slice(0, css.indexOf(TOKENS_END) + TOKENS_END.length);
/** Install the shared token layer once per document, before the panel sheet. */
function installTokens(doc) {
	if (doc.querySelector('style[data-plugin-css="' + TOKENS_TAG_ID + '"]') !== null) return;
	const tag = doc.createElement("style");
	tag.dataset.pluginCss = TOKENS_TAG_ID;
	tag.textContent = TOKENS_CSS;
	doc.head.appendChild(tag);
}
/** Install the panel stylesheet once per page. */
function ensureStyles() {
	if (typeof document === "undefined") return;
	installTokens(document);
	if (document.querySelector('style[data-plugin-css="' + CSS_TAG_ID + '"]') !== null) return;
	const tag = document.createElement("style");
	tag.dataset.plugin = PACKAGE_NAME;
	tag.dataset.pluginCss = CSS_TAG_ID;
	tag.textContent = css;
	document.head.appendChild(tag);
}
//#endregion
//#region helpers
/** Two-digit padding for the absolute clock text. */
function pad(value) {
	return String(value).padStart(2, "0");
}
/** A timestamp as local wall-clock text: 2026-10-12 08:00. */
function absoluteTime(at) {
	if (typeof at !== "number" || !Number.isFinite(at)) return "";
	const date = new Date(at);
	return (
		date.getFullYear() +
		"-" +
		pad(date.getMonth() + 1) +
		"-" +
		pad(date.getDate()) +
		" " +
		pad(date.getHours()) +
		":" +
		pad(date.getMinutes())
	);
}
/** A timestamp as Chinese/English relative text ("3 小时后"). */
function relativeTime(at, now, t) {
	if (typeof at !== "number" || !Number.isFinite(at)) return "";
	const delta = at - now;
	const size = Math.abs(delta);
	if (size < 60_000) return delta >= 0 ? t("time.soon") : t("time.justNow");
	const minutes = Math.round(size / 60_000);
	if (minutes < 60) return delta >= 0 ? t("time.inMinutes", { n: minutes }) : t("time.minutesAgo", { n: minutes });
	const hours = Math.round(size / 3_600_000);
	if (hours < 48) return delta >= 0 ? t("time.inHours", { n: hours }) : t("time.hoursAgo", { n: hours });
	const days = Math.round(size / 86_400_000);
	return delta >= 0 ? t("time.inDays", { n: days }) : t("time.daysAgo", { n: days });
}
/** The badge one row wears: running beats loaded beats idle. */
function stateOf(row) {
	if (row.pid !== null && row.pid !== undefined) return "running";
	if (row.loaded === true) return "loaded";
	return "idle";
}
/** POST one write action and normalize its answer. */
/**
 * The only thing the Host promises about a failure is a stable `error` code:
 * the readable sentence lives in this panel's dictionary, and a code with no
 * entry is shown as-is so a new code is visible instead of turning into
 * "something went wrong". `detail` stays in the Host log and never reaches UI.
 */
function reasonText(t, code) {
	const value = typeof code === "string" ? code : "";
	const status = value.startsWith("http-") ? value.slice(5) : "";
	if (status !== "") return t("error.http", { status });
	if (value !== "") {
		const key = "error." + value;
		const text = t(key, {});
		if (typeof text === "string" && text !== "" && text !== key) return text;
	}
	return value;
}

/** The code a failed response carries, with the HTTP status as the last resort. */
function errorCodeOf(payload, status) {
	const code = payload !== null && typeof payload === "object" && typeof payload.error === "string" ? payload.error : "";
	return code !== "" ? code : "http-" + status;
}

async function postAction(path, body) {
	const response = await fetch(API_BASE + path, {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json" },
		body: JSON.stringify(body),
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok || payload?.ok !== true) {
		throw new Error(errorCodeOf(payload, response.status));
	}
	return payload;
}
/** The result text for one finished action. */
function resultText(payload, t) {
	const state = String(payload?.state ?? "");
	if (state === "kicked") return t("result.kicked");
	if (state === "enabled") return t("result.enabled");
	if (state === "disabled") return t("result.disabled");
	if (state === "already-enabled") return t("result.already-enabled");
	if (state === "already-disabled") return t("result.already-disabled");
	return t("result.unchanged");
}
//#endregion
//#region state contract
/**
 * The list a panel is currently showing, whatever its own state calls it.
 * Every panel keeps the previous rows under a different key, and the failure
 * transition has to answer "did we have anything to fall back to?" the same
 * way in all three of them.
 */
function listOf(state) {
	if (state === null || typeof state !== "object") return [];
	if (Array.isArray(state.rows)) return state.rows;
	if (Array.isArray(state.catalog)) return state.catalog;
	if (state.snapshot !== null && state.snapshot !== undefined) return [state.snapshot];
	return [];
}
/**
 * True when a task snapshot has nothing to list. Reads `summary.total` because
 * that is what the Host counted over the unfiltered scan; the group walk is
 * only a fallback for snapshots that predate that field.
 */
function isEmptySnapshot(value) {
	const snapshot = value !== null && typeof value === "object" && value.snapshot !== undefined ? value.snapshot : value;
	if (snapshot === null || typeof snapshot !== "object") return false;
	const total = snapshot.summary !== null && typeof snapshot.summary === "object" ? snapshot.summary.total : null;
	if (typeof total === "number") return total === 0;
	const groups = Array.isArray(snapshot.groups) ? snapshot.groups : [];
	return groups.every((group) => (Array.isArray(group?.rows) ? group.rows.length : 0) === 0);
}
/**
 * The one contract all three panels share for choosing what the body shows.
 * `stale` is checked before `empty` and `list`: a refresh failure that still
 * has rows must keep them on screen instead of replacing them with an error.
 */
function bodyKind(state) {
	const status = state !== null && typeof state === "object" ? state.status : null;
	if (status === "loading") return "loading";
	if (status === "error" || status === "failed") return "failed";
	if (state?.stale === true) return "stale";
	if (status === "ready") return isEmptySnapshot(state) ? "empty" : "list";
	return "loading";
}
/**
 * The next state after a refresh fails. With rows already on screen we keep
 * them and mark the view stale; with nothing to show, the failure owns the page.
 */
function failureTransition(previous, error) {
	const previousState = previous !== null && typeof previous === "object" ? previous : {};
	const kept = listOf(previousState);
	const message = String(error?.message ?? error ?? "unknown");
	if (kept.length === 0) {
		return { status: "error", rows: [], error: message, stale: false, lastGoodAt: null };
	}
	const lastGoodAt = typeof previousState.lastGoodAt === "number" ? previousState.lastGoodAt : typeof previousState.fetchedAt === "number" ? previousState.fetchedAt : null;
	const next = { status: "ready", rows: kept, error: message, stale: true, lastGoodAt };
	if (Object.hasOwn(previousState, "snapshot")) next.snapshot = previousState.snapshot;
	if (Object.hasOwn(previousState, "catalog")) next.catalog = previousState.catalog;
	return next;
}
/**
 * Why the body has nothing to list, or null when it has something. A filtered
 * view is not the same as an empty machine: the first deserves "no match for
 * this filter", the second "nothing is scheduled at all".
 */
function emptyReason(state, groups) {
	if (state === null || typeof state !== "object") return null;
	if (isEmptySnapshot(state)) return "total";
	const visible = (Array.isArray(groups) ? groups : []).reduce((count, group) => count + (Array.isArray(group?.rows) ? group.rows.length : 0), 0);
	return visible === 0 ? "filtered" : null;
}
//#endregion
//#region components
/** Sidebar row glyph: the alarm clock, brighter while the panel is selected. */
function AutomationIcon({ size, active }) {
	const Icon = active === true ? primitives.IconAlarmClockOutlineMedium : primitives.IconAlarmClockOutlineRegular;
	return h(Icon, { size });
}
/** Inline state block for the loading, empty and failure faces. */
function StateBlock({ glyph, title, body, error, action }) {
	return h("div", { className: "dsl-automation-state", role: "status" }, [
		glyph === undefined ? null : h("span", { className: "dsl-automation-stateGlyph", key: "glyph" }, glyph),
		h("p", { className: "dsl-automation-stateTitle", key: "title" }, title),
		body === undefined ? null : h("p", { className: "dsl-automation-stateBody" + (error === true ? " dsl-automation-stateError" : ""), key: "body" }, body),
		action === undefined ? null : h("div", { className: "dsl-automation-stateAction", key: "action" }, action),
	]);
}
/** One tab of the log panel, disabled when that stream has no file. */
function LogTab({ id, label, available, active, onPick }) {
	return h(
		"button",
		{
			type: "button",
			className: "dsl-automation-logTab" + (active === true ? " dsl-automation-logTabActive" : ""),
			disabled: available !== true,
			onClick: () => onPick(id),
		},
		label,
	);
}
/** The expanded log tail of one task. */
function LogPanel({ row, state, t, onPick, onReload, onClose }) {
	const hasStdout = typeof row.stdoutPath === "string" && row.stdoutPath !== "";
	const hasStderr = typeof row.stderrPath === "string" && row.stderrPath !== "";
	const body =
		state.status === "loading"
			? t("log.loading")
			: state.status === "failed"
				? t("log.failed", { reason: reasonText(t, state.error) })
				: state.lines.join("\n").trim() === ""
					? t("log.empty")
					: state.lines.join("\n");
	return h("div", { className: "dsl-automation-log" }, [
		h("div", { className: "dsl-automation-logHead", key: "head" }, [
			h(LogTab, { key: "out", id: "stdout", label: t("log.stdout"), available: hasStdout, active: state.stream === "stdout", onPick }),
			h(LogTab, { key: "err", id: "stderr", label: t("log.stderr"), available: hasStderr, active: state.stream === "stderr", onPick }),
			h("span", { className: "dsl-automation-logPath", key: "path", title: state.path ?? undefined }, state.path ?? ""),
			h(
				primitives.Button,
				{ key: "reload", variant: "outline", size: "sm", icon: h(primitives.IconRefreshOutlineRegular, { size: 13 }), onClick: onReload },
				t("log.reload"),
			),
			h(primitives.Button, { key: "close", variant: "outline", size: "sm", onClick: onClose }, t("log.hide")),
		]),
		h("pre", { className: "dsl-automation-logBody", key: "body" }, body),
		state.truncated === true ? h("p", { className: "dsl-automation-logNote", key: "note" }, t("log.truncated", { n: state.lines.length })) : null,
	]);
}
/** One automation row: state, identity, schedule, and the actions it allows. */
function TaskRow({ row, now, t, busy, log, open, onToggleRow, onToggle, onRun, onOpenLog, onPickStream, onReloadLog, onCloseLog }) {
	const state = stateOf(row);
	const dotClass = "dsl-automation-dot " + (state === "running" ? "dsl-automation-dotRunning" : state === "loaded" ? "dsl-automation-dotLoaded" : "dsl-automation-dotIdle");
	const badgeText = state === "running" ? t("state.running") : state === "loaded" ? t("state.loaded") : t("state.idle");
	const meta = [];
	if (row.program !== null && row.program !== undefined) {
		meta.push(h("span", { key: "program" }, t("meta.program", { name: row.program.name })));
		if (typeof row.program.script === "string" && row.program.script !== "") {
			meta.push(h("span", { key: "script" }, t("meta.script", { name: row.program.script.split("/").pop() })));
		}
	}
	if (typeof row.nextFireAt === "number") {
		meta.push(h("span", { key: "next", title: absoluteTime(row.nextFireAt) }, t("next.at", { time: relativeTime(row.nextFireAt, now, t) })));
	}
	if (typeof row.lastFiredAt === "number") {
		meta.push(h("span", { key: "last", title: absoluteTime(row.lastFiredAt) }, relativeTime(row.lastFiredAt, now, t)));
	}
	if (typeof row.lastExitStatus === "number" && row.lastExitStatus !== 0) {
		meta.push(h("span", { className: "dsl-automation-metaWarn", key: "exit" }, t("meta.exit", { code: row.lastExitStatus })));
	} else if (typeof row.lastExitStatus === "number") {
		meta.push(h("span", { key: "exit" }, t("meta.exit", { code: row.lastExitStatus })));
	}
	if (typeof row.pid === "number") meta.push(h("span", { key: "pid" }, t("meta.pid", { pid: row.pid })));
	const logOpen = log !== null && log !== undefined;
	const actions = [];
	if (row.kind === "launchd" && row.writable === true) {
		actions.push(
			h(
				primitives.Button,
				{
					key: "toggle",
					variant: "outline",
					size: "sm",
					icon: h(row.loaded === true ? primitives.IconPauseOutlineRegular : primitives.IconPlayOutlineRegular, { size: 13 }),
					"aria-label": row.loaded === true ? t("disable.label", { label: row.label }) : t("enable.label", { label: row.label }),
					disabled: busy === true,
					onClick: () => onToggle(row, row.loaded === true ? "disable" : "enable"),
				},
				row.loaded === true ? t("disable") : t("enable"),
			),
		);
		actions.push(
			h(
				primitives.Button,
				{
					key: "run",
					variant: "outline",
					size: "sm",
					icon: h(primitives.IconRefreshOutlineRegular, { size: 13 }),
					"aria-label": t("run.label", { label: row.label }),
					disabled: busy === true || row.loaded !== true,
					onClick: () => onRun(row),
				},
				t("run"),
			),
		);
	}
	if (row.stdoutPath !== null || row.stderrPath !== null) {
		actions.push(
			h(
				primitives.Button,
				{
					key: "log",
					variant: "outline",
					size: "sm",
					icon: h(primitives.IconWrapLinesOutlineRegular, { size: 13 }),
					"aria-label": t("log.label", { label: row.label }),
					onClick: () => (logOpen ? onCloseLog(row) : onOpenLog(row)),
				},
				logOpen ? t("log.hide") : t("log"),
			),
		);
	}
	return h("li", { className: "dsl-automation-row" }, [
		h("span", { className: dotClass, key: "dot", "aria-hidden": "true" }),
		h("div", { className: "dsl-automation-rowMain", key: "main" }, [
			h("div", { className: "dsl-automation-rowHead", key: "head" }, [
				h(
					"button",
					{ key: "toggle", type: "button", className: "dsl-automation-rowToggle", "aria-expanded": open === true ? "true" : "false",
					"aria-label": open === true ? t("row.collapse", { label: row.label }) : t("row.expand", { label: row.label }), onClick: () => onToggleRow(row.id) },
					h(open === true ? primitives.IconChevronDownOutlineRegular : primitives.IconChevronRightOutlineRegular, { size: 13 }),
			),
				h("code", { className: "dsl-automation-label", key: "label" }, row.label),
				row.detail === undefined ? null : h("span", { className: "dsl-automation-tag", key: "detail" }, row.detail),
				row.apple === true ? h("span", { className: "dsl-automation-tag", key: "apple" }, "Apple") : null,
				row.writable === true ? null : row.kind === "launchd" ? h("span", { className: "dsl-automation-tag", key: "ro" }, t("readonly")) : null,
		]),
			typeof row.about === "string" && row.about !== "" ? h("p", { className: "dsl-automation-about", key: "about" }, row.about) : null,
			h("p", { className: "dsl-automation-timing", key: "timing" }, row.timing),
			open === true
				? h("div", { className: "dsl-automation-rowDetail", key: "detail" }, [
				meta.length === 0 ? null : h("p", { className: "dsl-automation-meta", key: "meta" }, meta),
				h("p", { className: "dsl-automation-path", key: "path", title: row.plistPath ?? row.command ?? undefined }, row.plistPath ?? row.command ?? ""),
				row.error === null || row.error === undefined ? null : h("p", { className: "dsl-automation-rowError", key: "error" }, row.error),
				logOpen
						? h(LogPanel, {
									key: "log",
									row,
									state: log,
									t,
									onPick: (stream) => onPickStream(row, stream),
									onReload: () => onReloadLog(row),
									onClose: () => onCloseLog(row),
							})
						: null,
			])
			: null,
		]),
		h("div", { className: "dsl-automation-rowEnd", key: "end" }, [
			h("span", { className: "dsl-automation-badge" + (state === "running" ? " dsl-automation-badgeRunning" : ""), key: "badge" }, badgeText),
			...actions,
		]),
	]);
}
/** One collapsible group of rows. */
function GroupSection({ group, open, now, t, rows, onToggleOpen, logs, busyId, openedRows, onToggleRow, ...rest }) {
	return h("section", { className: "dsl-automation-group" }, [
		h("div", { className: "dsl-automation-groupHead", key: "head" }, [
			h(
				"button",
				{
					key: "caret",
					type: "button",
					className: "dsl-automation-caret",
					"aria-expanded": open === true ? "true" : "false",
					"aria-label": group.title,
					onClick: () => onToggleOpen(group.id),
				},
				h(open === true ? primitives.IconChevronDownOutlineRegular : primitives.IconChevronRightOutlineRegular, { size: 14 }),
			),
			h("p", { className: "dsl-automation-groupTitle", key: "title" }, group.title),
			h("span", { className: "dsl-automation-groupHint", key: "hint" }, group.hint),
			h("span", { className: "dsl-automation-groupCount", key: "count" }, t("group.count", { n: rows.length })),
		]),
		open === true
			? rows.length === 0
				? h("p", { className: "dsl-automation-groupEmpty", key: "empty" }, t("group.empty"))
				: h(
						"ul",
						{ className: "dsl-automation-rows", key: "rows" },
						rows.map((row) =>
							h(TaskRow, {
								key: row.id,
								row,
								now,
								t,
								busy: busyId === row.id,
								log: logs[row.id] ?? null,
								open: openedRows.includes(row.id),
								onToggleRow,
								...rest,
							}),
						),
					)
			: null,
	]);
}
/**
 * The Automation Tasks page: everything this Mac runs on a schedule.
 * @param props - slot props: this plugin's injected faces.
 * @returns the panel element tree.
 */
function AutomationTasksPage(props) {
	const { t } = props;
	const [state, setState] = useState({ status: "loading", snapshot: null, error: null });
	const [flash, setFlash] = useState(null);
	const [busyId, setBusyId] = useState(null);
	const [showApple, setShowApple] = useState(false);
	const [opened, setOpened] = useState([]);
	const [openedRows, setOpenedRows] = useState([]);
	const [logs, setLogs] = useState({});
	const [now, setNow] = useState(() => Date.now());
	const requestRef = useRef(0);
	/** Re-read the host snapshot; the newest request wins. */
	const load = useCallback(async () => {
		const ticket = requestRef.current + 1;
		requestRef.current = ticket;
		try {
			const response = await fetch(API_BASE + "/list", { headers: { accept: "application/json" } });
			const payload = await response.json().catch(() => null);
			if (!response.ok || payload?.ok !== true) {
				throw new Error(errorCodeOf(payload, response.status));
			}
			if (requestRef.current !== ticket) return;
			setState({ status: "ready", snapshot: payload, error: null });
			setNow(Date.now());
		} catch (error) {
			if (requestRef.current !== ticket) return;
			setState((prev) => failureTransition(prev, error));
		}
	}, []);
	useEffect(() => {
		void load();
	}, [load]);
	useEffect(() => {
		const timer = setInterval(() => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
			void load();
		}, REFRESH_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [load]);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(timer);
	}, []);
	useEffect(() => {
		if (flash === null) return undefined;
		const timer = setTimeout(() => setFlash(null), FLASH_MS);
		return () => clearTimeout(timer);
	}, [flash]);
	/** Run one write action, then re-read the snapshot. */
	const act = useCallback(
		async (row, kind) => {
			setBusyId(row.id);
			try {
				const payload =
					kind === "run"
						? await postAction("/run", { label: row.label, scope: row.scope })
						: await postAction("/toggle", { label: row.label, scope: row.scope, action: kind });
				setFlash({ kind: "ok", text: row.label + " · " + resultText(payload, t) });
				await load();
			} catch (error) {
				setFlash({ kind: "error", text: row.label + " · " + t("action.failed", { reason: reasonText(t, String(error?.message ?? error)) }) });
			} finally {
				setBusyId(null);
			}
		},
		[load, t],
	);
	/** Fetch one stream of one task's log into the expanded row. */
	const fetchLog = useCallback(async (row, stream) => {
		setLogs((prev) => ({ ...prev, [row.id]: { status: "loading", stream, lines: [], path: null, error: null, truncated: false } }));
		try {
			const query = "?label=" + encodeURIComponent(row.label) + "&scope=" + encodeURIComponent(row.scope) + "&stream=" + stream + "&lines=200";
			const response = await fetch(API_BASE + "/log" + query, { headers: { accept: "application/json" } });
			const payload = await response.json().catch(() => null);
			if (!response.ok || payload?.ok !== true) {
				throw new Error(errorCodeOf(payload, response.status));
			}
			setLogs((prev) => ({
				...prev,
				[row.id]: { status: "ready", stream, lines: payload.lines ?? [], path: payload.path ?? null, error: null, truncated: payload.truncated === true },
			}));
		} catch (error) {
			setLogs((prev) => ({
				...prev,
				[row.id]: { status: "failed", stream, lines: [], path: null, error: String(error?.message ?? error), truncated: false },
			}));
		}
	}, []);
	/** Open the first stream that actually has a file, and make sure the row shows it. */
	const openLog = useCallback(
		(row) => {
			setOpenedRows((prev) => (prev.includes(row.id) ? prev : prev.concat([row.id])));
			const stream = row.stdoutPath !== null && row.stdoutPath !== undefined ? "stdout" : "stderr";
			void fetchLog(row, stream);
		},
		[fetchLog],
	);
	const closeLog = useCallback((row) => {
		setLogs((prev) => {
			const next = { ...prev };
			delete next[row.id];
			return next;
		});
	}, []);
	const toggleGroup = useCallback((id) => {
		setOpened((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : prev.concat([id])));
	}, []);
	/** Expand or collapse one task row. */
	const toggleRow = useCallback((id) => {
		setOpenedRows((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : prev.concat([id])));
	}, []);
	const snapshot = state.snapshot;
	const groups = useMemo(() => {
		const list = snapshot?.groups ?? [];
		return list.map((group) => {
			const rows = showApple === true ? group.rows : group.rows.filter((row) => row.apple !== true);
			return { ...group, rows };
		});
	}, [snapshot, showApple]);
	const summary = snapshot?.summary ?? null;
	const kind = bodyKind(state);
	const reason = emptyReason(state, groups);
	const body =
		kind === "loading" && snapshot === null
			? h(StateBlock, { glyph: h(primitives.IconLoadingOutlineRegular, { size: 22 }), title: t("loading") })
			: kind === "failed" && snapshot === null
				? h(StateBlock, {
						glyph: h(primitives.IconWarningTriangleOutlineRegular, { size: 22 }),
						title: t("failed.title"),
						body: reasonText(t, state.error),
						error: true,
						action: h(primitives.Button, { variant: "outline", size: "sm", onClick: () => void load() }, t("retry")),
					})
				: reason === "total"
					? h(StateBlock, { glyph: h(primitives.IconAlarmClockOutlineRegular, { size: 22 }), title: t("empty.title"), body: t("empty.body") })
					: reason === "filtered"
						? h(StateBlock, { glyph: h(primitives.IconSearchOutlineRegular, { size: 22 }), title: t("empty.filtered.title"), body: t("empty.filtered.body") })
						: groups.map((group) =>
							h(GroupSection, {
								key: group.id,
								group,
								rows: group.rows,
								open: opened.includes(group.id),
								now,
								t,
								onToggleOpen: toggleGroup,
								openedRows,
								onToggleRow: toggleRow,
								logs,
								busyId,
								onToggle: (row, kind) => void act(row, kind),
								onRun: (row) => void act(row, "run"),
								onOpenLog: openLog,
								onPickStream: (row, stream) => void fetchLog(row, stream),
								onReloadLog: (row) => void fetchLog(row, logs[row.id]?.stream ?? "stdout"),
								onCloseLog: closeLog,
							}),
						);
	return h("div", { className: "dsl-automation-page" }, [
		h("div", { className: "dsl-automation-scroll", key: "scroll" }, [
			h("div", { className: "dsl-automation-content", key: "content" }, [
				h("header", { className: "dsl-automation-head", key: "head" }, [
					h("div", { key: "titles" }, [
						h("h1", { className: "dsl-automation-title", key: "title" }, t("title")),
						h("p", { className: "dsl-automation-subtitle", key: "subtitle" }, t("subtitle")),
					]),
					h(
						"div",
						{ className: "dsl-automation-headActions", key: "actions" },
						h(
							primitives.Button,
							{
								variant: "outline",
								size: "sm",
								icon: h(primitives.IconRefreshOutlineRegular, { size: 13 }),
								"aria-label": t("refresh.label"),
								onClick: () => void load(),
							},
							t("refresh"),
						),
					),
				]),
				summary === null
					? null
					: h("div", { className: "dsl-automation-stats", key: "stats" }, [
							h("span", { key: "total" }, t("stats.total", { n: summary.total })),
							h("span", { className: "dsl-automation-statRunning", key: "running" }, t("stats.running", { n: summary.running })),
							h("span", { key: "loaded" }, t("stats.loaded", { n: summary.loaded })),
							h("span", { className: "dsl-automation-scanAt", key: "at" }, t("stats.scannedAt", { time: absoluteTime(snapshot.generatedAt) })),
						]),
				flash === null
					? null
					: h("p", { className: "dsl-automation-flash" + (flash.kind === "error" ? " dsl-automation-flashError" : ""), key: "flash" }, flash.text),
				h(
					"label",
					{ className: "dsl-automation-filter", key: "filter", title: t("filter.apple.label") },
					[
						h("input", { key: "box", type: "checkbox", checked: showApple === true, onChange: (event) => setShowApple(event.target.checked === true) }),
						h("span", { key: "text" }, t("filter.apple")),
					],
				),
				h("div", { key: "groups" }, body),
			]),
		]),
	]);
}
//#endregion
//#region panel
const inject = ["slots", "locale"];
/**
 * Register the dictionary, the sidebar row and the page it opens.
 * @param ctx - browser plugin context.
 */
function apply(ctx) {
	ensureStyles();
	ctx.effect(
		() =>
			ctx.locale.register(NS, {
				zh,
				en,
			}),
		"automation-tasks: dictionaries",
	);
	const t = ctx.locale.bind(NS);
	ctx.slots.inject("main", () =>
		ctx.slots.register(
			{
				name: "main",
				key: PANEL_ID,
				locale: NS,
				inject: () => ({ t }),
			},
			AutomationTasksPage,
		),
	);
	ctx.slots.inject("sidebar.panellist", () =>
		ctx.slots.register(
			{
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 7,
				locale: NS,
				label: () => t("panel"),
			},
			AutomationIcon,
		),
	);
}
//#endregion
exports.apply = apply;
exports.inject = inject;
/** Exposed for the package's own offline tests; the Loader ignores unknown exports. */
exports.__internals = {
	PACKAGE_NAME,
	NS,
	PANEL_ID,
	API_BASE,
	REFRESH_INTERVAL_MS,
	absoluteTime,
	relativeTime,
	stateOf,
	resultText,
	reasonText,
	errorCodeOf,
	listOf,
	isEmptySnapshot,
	bodyKind,
	failureTransition,
	emptyReason,
	ensureStyles,
	StateBlock,
	LogTab,
	LogPanel,
	TaskRow,
	GroupSection,
	AutomationTasksPage,
	AutomationIcon,
	css,
	zh,
	en,
};
return module.exports;
