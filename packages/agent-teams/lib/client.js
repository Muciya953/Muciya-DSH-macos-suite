/**
 * Agent Team Panel — browser half.
 *
 * The official Agent Teams bundle publishes one `agentTeam` Session projection
 * (members + shared tasks) and renders it as a hover popover on the
 * Conversation header. That popover is deliberately small: it answers "who is
 * on my team right now" for one Session, and closes as soon as the pointer
 * leaves. This plugin turns the same projection into a first-class sidebar
 * panel — a dedicated `main` surface reached from the sidebar rail — where the
 * roster, the topology and the shared task board are all visible at once and
 * stay open while the user reads them.
 *
 * Everything here is read-only with respect to the team: the projection is
 * owned by the Host plugin (`@deepseek-ai/dsh-experimental-agent-team`) and
 * mutated only through the Team tools. The panel can (a) refresh the
 * projection, (b) open the team's own Session or any member Session, and
 * (c) filter the task board by member. It never invents team state.
 *
 * Data path: `useSessions` gives the Session catalog snapshot, whose
 * `projectionsBySession[sessionId].values.agentTeam` is the wire view produced
 * by `teamProjectionDefinition` (`members[]`, `tasks[]`, `failure?`). Rows may
 * also carry the same view under `projectionValues`, so discovery reads both.
 *
 * @module muciya-dsh-plugin-agent-teams/client
 */

window.__ModuleLoader__.load({
	id: "muciya-dsh-plugin-agent-teams",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const { useCallback, useEffect, useMemo, useRef, useState } = React;
		const h = React.createElement;

		//#region constants
		/** This package's manifest name — also the browser module identity. */
		const PACKAGE_NAME = "muciya-dsh-plugin-agent-teams";
		/** Locale namespace owned by this plugin. */
		const NS = "agentTeamPanel";
		/** The `main` slot key and the `sidebar.panellist` id this plugin owns. */
		const PANEL_ID = "agent-team";
		/** Sidebar order: after 技能库 (5) and 外观库 (6), before 计划 (10). */
		const PANEL_ORDER = 7;
		/** Stylesheet identity, so a reloaded page installs exactly one copy. */
		const CSS_TAG_ID = `${PACKAGE_NAME}/AgentTeam.module.css`;
		/** Board columns, in reading order. */
		const STATUS_ORDER = ["in_progress", "pending", "completed"];
		/** Projection view of one member phase, as the Host writes it. */
		const MEMBER_PHASES = ["active", "provisioning", "failed"];
		//#endregion

		//#region dictionaries
		const zh = {
			panel: "智能体团队",
			title: "智能体团队",
			subtitle: "团队拓扑 · 成员状态 · 共享任务",
			"subtitle.team": "{name} · {members} 名成员 · {tasks} 个任务",
			"subtitle.leadOnly": "{name} · 仅 Lead 在队",
			"action.refresh": "刷新团队数据",
			"action.openTeam": "打开团队会话",
			"action.scan": "扫描其他会话",
			"scan.running": "正在扫描…",
			"scan.done": "扫描了 {n} 个最近会话",
			"scan.none": "没有发现其他团队",
			"scan.failed": "扫描失败：{message}",
			"action.openMember": "打开成员会话",
			"action.expand": "展开",
			"action.collapse": "收起",
			"action.all": "全部",
			"action.retry": "重试",
			"section.topology": "团队拓扑",
			"section.members": "成员",
			"section.tasks": "共享任务",
			"legend.running": "运行中",
			"legend.idle": "空闲",
			"legend.failed": "失败",
			"role.lead": "Lead",
			"role.teammate": "成员",
			"state.running": "运行中",
			"state.inactive": "空闲",
			"state.provisioning": "创建中",
			"state.failed": "失败",
			"task.pending": "待办",
			"task.in_progress": "进行中",
			"task.completed": "已完成",
			"task.empty": "暂无任务",
			"task.unowned": "未分配",
			"task.blockedBy": "依赖 {ids}",
			"task.ready": "可开始",
			"task.notReady": "被依赖阻塞",
			"task.warningTask": "与进行中任务 {id} 的写入范围重叠",
			"member.model": "模型 {model}",
			"member.modelUnknown": "模型未知",
			"member.tasks": "{n} 个任务",
			"member.current": "当前会话",
			"filter.byMember": "只看 {name}",
			"count.members": "{n} 人",
			"count.tasks": "{n} 个",
			"empty.noSession.title": "没有可用的会话",
			"empty.noSession.body": "打开一个会话之后，这里会显示它正在使用的智能体团队。",
			"empty.team.title": "还没有团队",
			"empty.team.body": "在对话里让 agent 用 Team 工具创建成员或共享任务，成员拓扑和任务板会自动出现在这里。",
			"empty.team.hint": "智能体团队是 App 的实验能力，团队数据来自会话的 agentTeam 投影。",
			"error.load": "读取团队投影失败：{message}",
			"error.open": "打开会话失败：{message}",
			"hint": "数据来自会话的 agentTeam 投影，由 Team 工具维护；点刷新可重新拉取。",
			"hint.refreshed": "最近刷新 {time}",
			"team.picker": "团队",
			"lead.waiting": "等待成员加入",
		};
		const en = {
			panel: "Agent Team",
			title: "Agent Team",
			subtitle: "Topology · member states · shared tasks",
			"subtitle.team": "{name} · {members} members · {tasks} tasks",
			"subtitle.leadOnly": "{name} · lead only",
			"action.refresh": "Refresh team data",
			"action.openTeam": "Open team session",
			"action.scan": "Scan sessions",
			"scan.running": "Scanning…",
			"scan.done": "Scanned {n} recent sessions",
			"scan.none": "No other team found",
			"scan.failed": "Scan failed: {message}",
			"action.openMember": "Open member session",
			"action.expand": "Expand",
			"action.collapse": "Collapse",
			"action.all": "All",
			"action.retry": "Retry",
			"section.topology": "Topology",
			"section.members": "Members",
			"section.tasks": "Shared tasks",
			"legend.running": "Running",
			"legend.idle": "Idle",
			"legend.failed": "Failed",
			"role.lead": "Lead",
			"role.teammate": "Member",
			"state.running": "Running",
			"state.inactive": "Idle",
			"state.provisioning": "Provisioning",
			"state.failed": "Failed",
			"task.pending": "Pending",
			"task.in_progress": "In progress",
			"task.completed": "Completed",
			"task.empty": "No tasks",
			"task.unowned": "Unowned",
			"task.blockedBy": "Depends on {ids}",
			"task.ready": "Ready",
			"task.notReady": "Blocked",
			"task.warningTask": "write scopes overlap with {id}",
			"member.model": "Model {model}",
			"member.modelUnknown": "Model unknown",
			"member.tasks": "{n} tasks",
			"member.current": "Current session",
			"filter.byMember": "Only {name}",
			"count.members": "{n} members",
			"count.tasks": "{n}",
			"empty.noSession.title": "No session available",
			"empty.noSession.body": "Open a session and this panel will show the agent team it is running.",
			"empty.team.title": "No team yet",
			"empty.team.body": "Ask the agent to create members or shared tasks with the Team tools; the topology and the task board appear here on their own.",
			"empty.team.hint": "Agent Teams is an experimental App capability; the panel reads the session's agentTeam projection.",
			"error.load": "Could not read the team projection: {message}",
			"error.open": "Could not open the session: {message}",
			"hint": "Reads the session's agentTeam projection, maintained by the Team tools; refresh pulls it again.",
			"hint.refreshed": "Refreshed {time}",
			"team.picker": "Team",
			"lead.waiting": "Waiting for members",
		};
		//#endregion

		//#region styles
		/**
		 * Panel stylesheet. Every colour, radius and border comes from a theme
		 * token so the panel follows the App's light/dark themes and every skin;
		 * nothing here is a literal palette value.
		 */
		const css = [
			".dsl-atp-page{box-sizing:border-box;width:100%;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);display:flex;flex-direction:column;overflow:hidden}",
			".dsl-atp-head{box-sizing:border-box;width:100%;max-width:960px;margin:0 auto;padding:28px clamp(20px,4vw,40px) 0;justify-content:space-between;align-items:flex-start;gap:16px;display:flex}",
			"[data-platform=darwin] .dsl-atp-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}",
			".dsl-atp-headMain{flex-direction:column;gap:2px;min-width:0;display:flex}",
			".dsl-atp-title{margin:0;font-size:20px;font-weight:500;line-height:28px}",
			".dsl-atp-subtitle{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:4px 0 0;font-size:13px;line-height:20px}",
			".dsl-atp-headActions{flex:none;align-items:center;gap:6px;display:flex}",
			".dsl-atp-pageScroll{scrollbar-gutter:stable;--dsh-scrollbar-width:9px;--dsh-scrollbar-thumb-border:2px;margin:20px 0 0;flex:1;min-height:0;overflow:auto}",
			".dsl-atp-pageContent{max-width:960px;margin:0 auto;padding:0 clamp(20px,4vw,40px) 40px}",
			".dsl-atp-iconButton{border:.5px solid var(--dsw-alias-border-l2);background:0 0;width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;transition:background-color .15s,color .15s,border-color .15s}",
			".dsl-atp-iconButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}",
			".dsl-atp-iconButton:disabled{opacity:.5;cursor:default}",
			".dsl-atp-iconButton:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dsl-atp-button{border:.5px solid var(--dsw-alias-border-l2);background:0 0;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;align-items:center;gap:5px;padding:0 9px;font:inherit;font-size:12px;line-height:18px;display:inline-flex;flex:none;transition:background-color .15s,color .15s,border-color .15s}",
			".dsl-atp-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}",
			".dsl-atp-button:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dsl-atp-button[data-tone=accent]{color:var(--dsw-alias-state-business-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,transparent)}",
			".dsl-atp-chips{flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 4px;display:flex}",
			".dsl-atp-chipsLabel{color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px;margin:0 2px 0 0}",
			".dsl-atp-chip{border:.5px solid var(--dsw-alias-border-l2);background:0 0;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;align-items:center;gap:6px;padding:0 10px;font:inherit;font-size:12px;line-height:18px;display:inline-flex;max-width:100%;transition:background-color .15s,color .15s,border-color .15s}",
			".dsl-atp-chip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsl-atp-chip[data-active=true]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l4,var(--dsw-alias-border-l3))}",
			".dsl-atp-chip:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dsl-atp-chipText{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;min-width:0}",
			".dsl-atp-chipCount{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;flex:none}",
			".dsl-atp-section{margin-top:24px}",
			".dsl-atp-sectionHead{justify-content:space-between;align-items:baseline;gap:10px;margin:0 0 10px;display:flex}",
			".dsl-atp-sectionTitle{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;font-weight:500;line-height:20px;display:flex;align-items:center;gap:6px}",
			".dsl-atp-sectionNote{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;margin:0;font-size:12px;line-height:18px}",
			".dsl-atp-graph{border:.5px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:6px 10px 4px;overflow:hidden}",
			".dsl-atp-graphSvg{display:block;width:100%;max-width:720px;height:auto;margin:0 auto;overflow:visible}",
			".dsl-atp-node{cursor:pointer}",
			".dsl-atp-node:focus{outline:none}",
			".dsl-atp-nodeBox{fill:var(--dsw-alias-bg-layer-2);stroke:var(--dsw-alias-border-l2);stroke-width:1;transition:fill .15s}",
			".dsl-atp-node:hover .dsl-atp-nodeBox{fill:var(--dsw-alias-bg-layer-3)}",
			".dsl-atp-node[data-selected=true] .dsl-atp-nodeBox{stroke:var(--dsw-alias-state-business-primary);stroke-width:1.5}",
			".dsl-atp-node:focus-visible .dsl-atp-nodeBox{stroke:var(--dsw-alias-state-business-primary);stroke-width:1.5;stroke-dasharray:3 3}",
			".dsl-atp-nodeName{fill:var(--dsw-alias-label-primary);font-size:12.5px;font-weight:500}",
			".dsl-atp-nodeMeta{fill:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dsl-atp-nodeCount{fill:var(--dsw-alias-label-caption);font-size:11px;font-variant-numeric:tabular-nums;text-anchor:end}",
			".dsl-atp-leadTag{fill:var(--dsw-alias-state-business-primary);font-size:10.5px;font-weight:500;letter-spacing:.02em}",
			".dsl-atp-link{fill:none;stroke:var(--dsw-alias-border-l2);stroke-width:1.2}",
			".dsl-atp-link[data-state=running]{stroke:var(--dsw-alias-state-business-primary);opacity:.55;stroke-dasharray:4 6;animation:dsl-atp-flow 1.4s linear infinite}",
			".dsl-atp-link[data-state=failed]{stroke:var(--dsw-alias-state-error-primary);opacity:.5}",
			".dsl-atp-link[data-state=provisioning]{stroke:var(--dsw-alias-state-warn-primary);opacity:.5;stroke-dasharray:2 4}",
			"@keyframes dsl-atp-flow{to{stroke-dashoffset:-20}}",
			".dsl-atp-legend{color:var(--dsw-alias-label-caption);flex-wrap:wrap;align-items:center;gap:12px;margin:8px 2px 2px;font-size:11px;line-height:16px;display:flex}",
			".dsl-atp-legendItem{align-items:center;gap:5px;display:inline-flex}",
			".dsl-atp-legendDot{width:6px;height:6px;border-radius:50%;flex:none;display:inline-block}",
			".dsl-atp-grid{grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:8px;display:grid}",
			".dsl-atp-member{border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;align-items:flex-start;gap:10px;padding:10px 12px;display:flex;transition:background-color .15s,border-color .15s}",
			".dsl-atp-member:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsl-atp-member[data-selected=true]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-2)}",
			".dsl-atp-member:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dsl-atp-avatar{border:.5px solid var(--dsw-alias-border-l2);border-radius:50%;background:var(--dsw-alias-bg-layer-3);width:28px;height:28px;color:var(--dsw-alias-label-secondary);flex:none;place-items:center;font-size:12px;font-weight:500;text-transform:uppercase;display:grid}",
			".dsl-atp-memberMain{flex-direction:column;gap:2px;flex:1;min-width:0;display:flex}",
			".dsl-atp-memberHead{align-items:center;gap:6px;min-width:0;display:flex}",
			".dsl-atp-memberName{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;font-weight:500;line-height:19px;min-width:0}",
			".dsl-atp-memberMeta{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden;min-width:0;font-size:11.5px;line-height:17px}",
			".dsl-atp-memberState{color:var(--dsw-alias-label-tertiary);align-items:center;gap:5px;min-width:0;font-size:11.5px;line-height:17px;display:flex}",
			".dsl-atp-sep{color:var(--dsw-alias-label-caption);flex:none}",
			".dsl-atp-memberFoot{color:var(--dsw-alias-label-caption);align-items:center;gap:8px;font-size:11.5px;line-height:17px;display:flex}",
			".dsl-atp-memberActions{flex:none;align-self:center;align-items:center;gap:4px;display:flex}",
			".dsl-atp-role{color:var(--dsw-alias-label-secondary);border-radius:6px;background:var(--dsw-alias-bg-layer-3);white-space:nowrap;flex:none;padding:0 6px;font-size:10.5px;line-height:17px}",
			".dsl-atp-role[data-role=lead]{color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent)}",
			".dsl-atp-stateLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-size:11.5px;line-height:17px}",
			".dsl-atp-board{grid-template-columns:repeat(auto-fit,minmax(216px,1fr));gap:10px;display:grid;align-items:start}",
			".dsl-atp-column{flex-direction:column;gap:8px;min-width:0;display:flex}",
			".dsl-atp-columnHead{color:var(--dsw-alias-label-tertiary);align-items:center;gap:6px;font-size:12px;line-height:18px;display:flex}",
			".dsl-atp-columnTitle{color:var(--dsw-alias-label-secondary);font-weight:500}",
			".dsl-atp-columnCount{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums}",
			".dsl-atp-task{border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);flex-direction:column;gap:6px;padding:10px;display:flex;transition:border-color .15s,background-color .15s}",
			".dsl-atp-task:hover{border-color:var(--dsw-alias-border-l3)}",
			".dsl-atp-task[data-selected=true]{border-color:var(--dsw-alias-state-business-primary)}",
			".dsl-atp-taskSubject{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0;font-size:13px;font-weight:500;line-height:19px}",
			".dsl-atp-taskMeta{color:var(--dsw-alias-label-caption);flex-wrap:wrap;align-items:center;gap:4px;font-size:11px;line-height:16px;display:flex}",
			".dsl-atp-pill{border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;align-items:center;gap:3px;max-width:100%;padding:0 5px;font-size:10.5px;line-height:16px;display:inline-flex}",
			".dsl-atp-pillText{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;min-width:0}",
			".dsl-atp-pill[data-tone=ready]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}",
			".dsl-atp-pill[data-tone=blocked]{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 40%,transparent)}",
			".dsl-atp-pill[data-tone=owner]{color:var(--dsw-alias-label-secondary)}",
			".dsl-atp-warn{color:var(--dsw-alias-state-warn-primary);overflow-wrap:anywhere;margin:0;font-size:11.5px;line-height:17px}",
			".dsl-atp-desc{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;white-space:pre-wrap;margin:0;font-size:12px;line-height:18px}",
			".dsl-atp-desc[data-clamped=true]{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden}",
			".dsl-atp-descToggle{border:0;background:0 0;color:var(--dsw-alias-label-caption);cursor:pointer;align-self:flex-start;border-radius:6px;padding:0;font:inherit;font-size:11px;line-height:16px}",
			".dsl-atp-descToggle:hover{color:var(--dsw-alias-label-secondary)}",
			".dsl-atp-columnEmpty{color:var(--dsw-alias-label-caption);border:.5px dashed var(--dsw-alias-border-l2);border-radius:12px;text-align:center;padding:14px 10px;font-size:12px;line-height:18px}",
			".dsl-atp-state{box-sizing:border-box;width:100%;max-width:560px;margin:clamp(20px,9vh,88px) auto 0;border:.5px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);text-align:center;color:var(--dsw-alias-label-tertiary);flex-direction:column;align-items:center;gap:8px;padding:28px 24px;font-size:13px;line-height:20px;display:flex}",
			".dsl-atp-stateGlyph{border:.5px solid var(--dsw-alias-border-l2);border-radius:50%;background:var(--dsw-alias-bg-layer-2);width:44px;height:44px;color:var(--dsw-alias-label-tertiary);place-items:center;margin-bottom:2px;display:grid}",
			".dsl-atp-stateTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:15px;font-weight:500;line-height:23px}",
			".dsl-atp-stateBody{margin:0;max-width:420px;overflow-wrap:anywhere}",
			".dsl-atp-stateHint{color:var(--dsw-alias-label-caption);margin:2px 0 0;max-width:420px;font-size:12px;line-height:18px}",
			".dsl-atp-stateError{color:var(--dsw-alias-state-error-primary)}",
			".dsl-atp-stateAction{margin-top:10px;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;display:flex}",
			".dsl-atp-hint{color:var(--dsw-alias-label-caption);margin:22px 0 0;font-size:12px;line-height:18px}",
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

		//#region pure helpers
		/**
		 * Fill one translated template's `{name}` slots.
		 * @param template - localized string, possibly containing placeholders.
		 * @param vars - placeholder values.
		 * @returns the filled string.
		 */
		function fill(template, vars) {
			if (typeof template !== "string" || vars === undefined) return template;
			return template.replace(/\{(\w+)\}/gu, (whole, key) => (vars[key] === undefined ? whole : String(vars[key])));
		}
		/**
		 * Read one message off an unknown failure.
		 * @param error - thrown value or RemoteFailure.
		 * @returns a printable message.
		 */
		function messageOf(error) {
			if (error === undefined || error === null) return "unknown error";
			if (typeof error === "string") return error;
			if (typeof error.message === "string" && error.message !== "") return error.message;
			try {
				return JSON.stringify(error);
			} catch {
				return String(error);
			}
		}
		/**
		 * Choose the Session a global panel speaks for.
		 *
		 * `retainedBy.mainView` is the sidebar workspace browser's selection, and
		 * it is exactly 0 while a global panel is on screen — the Conversation
		 * unmounts and releases its retention. So the panel prefers the last
		 * Session that *did* hold main-view retention (tracked from `apply()`),
		 * then falls back to the same rules the other profile panels use.
		 * @param snapshot - the Session catalog snapshot.
		 * @param lastMainSessionId - the last Session seen with main-view retention.
		 * @returns the chosen Session id, or undefined for an empty catalog.
		 */
		function resolvePanelSessionId(snapshot, lastMainSessionId) {
			const byId = snapshot?.byId ?? {};
			if (lastMainSessionId !== undefined && byId[lastMainSessionId] !== undefined) return lastMainSessionId;
			const rows = Object.values(byId).filter((row) => row !== null && row !== undefined);
			const main = rows.find((row) => (row.retainedBy?.mainView ?? 0) > 0);
			if (main !== undefined) return main.id;
			const durable = rows.filter((row) => row.origin !== "subagent");
			const pool = durable.length > 0 ? durable : rows;
			const recent = pool.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
			return recent?.id;
		}
		/**
		 * Resolve the Session that owns the team a Session belongs to.
		 *
		 * A teammate Session is a subagent of the lead, and the projection that
		 * describes the whole team lives on the lead, so any member's own id has to
		 * be walked up to the root before its team can be read.
		 * @param snapshot - the Session catalog snapshot.
		 * @param sessionId - any Session id.
		 * @returns the root Session id (the team owner).
		 */
		function leadSessionIdOf(snapshot, sessionId) {
			const byId = snapshot?.byId ?? {};
			let current = sessionId;
			const seen = new Set();
			while (current !== undefined && !seen.has(current)) {
				seen.add(current);
				const row = byId[current];
				if (row === undefined || row === null) break;
				const parentId = typeof row.parentId === "string" ? row.parentId : undefined;
				if (row.origin !== "subagent" || parentId === undefined) break;
				current = parentId;
			}
			return current;
		}
		/**
		 * Collect every team the catalog currently exposes.
		 *
		 * A team is real when the projection has more than the synthetic lead, at
		 * least one task, or a failure to report — a Session that never touched the
		 * Team tools publishes `{ members: [lead], tasks: [] }` and is skipped, so
		 * the panel does not offer empty teams in its picker.
		 * @param snapshot - the Session catalog snapshot.
		 * @param lastMainSessionId - the last Session seen with main-view retention.
		 * @returns teams, the panel's current Session first, then most recently active.
		 */
		function collectTeams(snapshot, lastMainSessionId) {
			const teams = [];
			const seen = new Set();
			const add = (sessionId, view, row) => {
				if (view === undefined || view === null || seen.has(sessionId)) return;
				const members = Array.isArray(view.members) ? view.members.filter((member) => member !== null && member !== undefined) : [];
				const tasks = Array.isArray(view.tasks) ? view.tasks.filter((task) => task !== null && task !== undefined) : [];
				const failure = typeof view.failure === "string" && view.failure !== "" ? view.failure : undefined;
				if (members.length <= 1 && tasks.length === 0 && failure === undefined) return;
				seen.add(sessionId);
				teams.push({ sessionId, row, members, tasks, failure, state: view.state });
			};
			const byId = snapshot?.byId ?? {};
			const projections = snapshot?.projectionsBySession ?? {};
			for (const [sessionId, projection] of Object.entries(projections)) {
				add(sessionId, projection?.values?.agentTeam, byId[sessionId]);
			}
			for (const row of Object.values(byId)) {
				if (row === null || row === undefined) continue;
				add(row.id, row.projectionValues?.agentTeam, row);
			}
			const currentId = resolvePanelSessionId(snapshot, lastMainSessionId);
			const rootId = currentId === undefined ? undefined : leadSessionIdOf(snapshot, currentId);
			teams.sort((left, right) => {
				const leftRank = left.sessionId === rootId ? 0 : 1;
				const rightRank = right.sessionId === rootId ? 0 : 1;
				if (leftRank !== rightRank) return leftRank - rightRank;
				const leftSize = left.members.length + left.tasks.length;
				const rightSize = right.members.length + right.tasks.length;
				if ((left.row?.running ?? false) !== (right.row?.running ?? false)) return (right.row?.running ?? false) ? 1 : -1;
				return (right.row?.updatedAt ?? 0) - (left.row?.updatedAt ?? 0) || rightSize - leftSize;
			});
			return teams;
		}
		/**
		 * Fold one member's projection phase and its Session's live run flag into
		 * the state the panel paints.
		 * @param member - projection member.
		 * @param running - the member Session's `running` flag, if the catalog has it.
		 * @returns `running`, `inactive`, `provisioning`, or `failed`.
		 */
		function memberState(member, running) {
			const phase = MEMBER_PHASES.includes(member?.phase) ? member.phase : "active";
			if (phase === "active") return running === true ? "running" : "inactive";
			return phase;
		}
		/** The theme token a member state paints with. */
		const STATE_TOKEN = {
			running: "var(--dsw-alias-state-business-primary)",
			inactive: "var(--dsw-alias-state-idle-primary,var(--dsw-alias-label-caption))",
			provisioning: "var(--dsw-alias-state-warn-primary)",
			failed: "var(--dsw-alias-state-error-primary)",
		};
		/** The `StateDot` appearance for a member state. */
		const STATE_DOT = { running: "ongoing", inactive: "idle", provisioning: "ongoing", failed: "error" };
		/** One task's owner name, or undefined when unowned. */
		function ownerOf(task) {
			return typeof task?.ownerName === "string" && task.ownerName !== "" ? task.ownerName : undefined;
		}
		/**
		 * Re-derive a task's readiness from the visible tasks.
		 *
		 * The projection already publishes `ready`, but recomputing it keeps the
		 * board honest when the cached view is older than the task list it ships
		 * with; the Host's rule is "every blocker completed".
		 * @param tasks - every task in the team.
		 * @param task - the task to test.
		 * @returns whether every blocker is completed.
		 */
		function taskReady(tasks, task) {
			const blockers = Array.isArray(task?.blockedBy) ? task.blockedBy : [];
			if (blockers.length === 0) return true;
			return blockers.every((id) => tasks.some((candidate) => candidate.id === id && candidate.status === "completed"));
		}
		/**
		 * Group tasks into the board's three columns, preserving host order.
		 * @param tasks - every task in the team.
		 * @param filterName - owner name to keep, or undefined for all tasks.
		 * @returns `{ [status]: tasks[] }` for the three statuses, deleted ones dropped.
		 */
		function groupTasks(tasks, filterName) {
			const grouped = { in_progress: [], pending: [], completed: [] };
			for (const task of tasks) {
				if (task === null || task === undefined) continue;
				if (!Object.hasOwn(grouped, task.status)) continue;
				if (filterName !== undefined && ownerOf(task) !== filterName) continue;
				grouped[task.status].push(task);
			}
			return grouped;
		}
		/**
		 * Count the tasks each member owns, so the roster and the graph can show it.
		 * @param tasks - every task in the team.
		 * @returns owner name to task count.
		 */
		function countByOwner(tasks) {
			const counts = new Map();
			for (const task of tasks) {
				const owner = ownerOf(task);
				if (owner === undefined) continue;
				counts.set(owner, (counts.get(owner) ?? 0) + 1);
			}
			return counts;
		}
		/**
		 * Format a wall-clock time for the refresh stamp.
		 * @param at - epoch milliseconds.
		 * @returns `HH:MM:SS`.
		 */
		function clockOf(at) {
			if (typeof at !== "number" || !Number.isFinite(at)) return "";
			const date = new Date(at);
			const pad = (value) => String(value).padStart(2, "0");
			return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
		}
		/** A task id shortened for a dependency chip. */
		function shortId(id) {
			const text = typeof id === "string" ? id : String(id);
			return text.length <= 12 ? text : `${text.slice(0, 10)}…`;
		}
		/**
		 * Localize one Host write-scope warning.
		 *
		 * The Host publishes the warning as `write scopes overlap with <taskId>`,
		 * which names the other task; translating the sentence keeps the id while
		 * the rest of the panel stays in the active locale.
		 * @param warning - one `writeScopeWarnings` entry.
		 * @param t - translator.
		 * @returns the warning to show.
		 */
		function warningText(warning, t) {
			const text = typeof warning === "string" ? warning : String(warning);
			const match = /overlap with\s+(\S+)/iu.exec(text);
			return match === null ? text : t("task.warningTask", { id: match[1] });
		}

		/** The display name of the Session that owns a team. */
		function teamNameOf(team) {
			const row = team?.row;
			const title = typeof row?.displayTitle === "string" && row.displayTitle !== "" ? row.displayTitle : undefined;
			if (title !== undefined) return title;
			const fallback = typeof row?.title === "string" && row.title !== "" ? row.title : undefined;
			return fallback ?? team?.sessionId ?? "";
		}
		/**
		 * The model a member Session last used, when the catalog publishes it.
		 * @param snapshot - the Session catalog snapshot.
		 * @param memberId - member Session id.
		 * @param cached - the member's own projection values, if the row carries them.
		 * @returns a model id, or undefined.
		 */
		function modelOf(snapshot, memberId, cached) {
			const fromProjection = snapshot?.projectionsBySession?.[memberId]?.values?.modelSelection?.next?.model;
			if (typeof fromProjection === "string" && fromProjection !== "") return fromProjection;
			const fromRow = cached?.modelSelection?.next?.model;
			if (typeof fromRow === "string" && fromRow !== "") return fromRow;
			return undefined;
		}
		//#endregion

		//#region main-session tracking
		/**
		 * The last Session seen holding main-view retention.
		 *
		 * A global panel replaces the Conversation, so `retainedBy.mainView` reads
		 * 0 for every Session while the panel is open. Tracking the last non-zero
		 * value across the page's lifetime keeps "the Session I was reading" stable
		 * instead of degrading to "whatever updated most recently".
		 */
		let lastMainSessionId;
		/**
		 * Subscribe to the Session catalog and remember the main-view Session.
		 * @param sessions - the `sessions` service.
		 * @returns a disposer.
		 */
		function trackMainSession(sessions) {
			const list = sessions?.list;
			if (list === undefined || list === null) return () => {};
			if (typeof list.getSnapshot !== "function" || typeof list.subscribe !== "function") return () => {};
			const remember = () => {
				let snapshot;
				try {
					snapshot = list.getSnapshot();
				} catch {
					return;
				}
				const byId = snapshot?.byId ?? {};
				for (const row of Object.values(byId)) {
					if (row !== null && row !== undefined && (row.retainedBy?.mainView ?? 0) > 0) lastMainSessionId = row.id;
				}
			};
			remember();
			return list.subscribe(remember);
		}
		//#endregion

		//#region components
		/**
		 * The sidebar rail glyph: two silhouettes, filled while the panel is open.
		 * @param props.size - glyph edge in px, supplied by the sidebar.
		 * @param props.active - whether this panel is the selected one.
		 */
		function AgentTeamIcon({ size, active }) {
			const Glyph = active === true ? primitives.IconUsersOutlineMedium : primitives.IconUsersOutlineRegular;
			return h(Glyph, { size });
		}

		/**
		 * A state dot plus its label, shared by the roster and the legend.
		 * @param props.state - one of the four member states.
		 * @param props.t - translator.
		 */
		function StateMarker({ state, t }) {
			return h(
				"span",
				{ className: "dsl-atp-legendItem" },
				h("span", { className: "dsl-atp-legendDot", style: { background: STATE_TOKEN[state] } }),
				h("span", { className: "dsl-atp-stateLabel" }, t(`state.${state}`))
			);
		}

		/**
		 * The team topology: the lead on the left, every member fanned out to the
		 * right, one link per member coloured by that member's live state.
		 *
		 * Drawn as SVG with a computed viewBox so the graph scales with the panel
		 * width instead of clipping a fixed canvas. Members are focusable buttons:
		 * selecting one filters the task board, which is the whole point of having
		 * a topology rather than a list.
		 * @param props.members - projection members, lead first.
		 * @param props.runningById - member Session id to live `running` flag.
		 * @param props.taskCount - owner name to task count.
		 * @param props.selectedName - the member whose tasks the board filters to.
		 * @param props.onSelect - select/toggle a member by name.
		 * @param props.onOpen - open a member's Session.
		 * @param props.t - translator.
		 */
		function TeamGraph({ members, runningById, taskCount, selectedName, onSelect, onOpen, t }) {
			const lead = members.find((member) => member.role === "lead") ?? members[0];
			const others = members.filter((member) => member !== lead);
			const rowHeight = 56;
			const rowGap = 10;
			const bodyHeight = others.length === 0 ? rowHeight : others.length * rowHeight + (others.length - 1) * rowGap;
			const height = Math.max(bodyHeight + 24, 96);
			const leadHeight = 58;
			const width = 720;
			const leadX = 14;
			const leadWidth = 224;
			const nodeX = width - 300;
			const nodeWidth = 300;
			const leadCenter = height / 2;
			const leadState = memberState(lead, runningById[lead?.id]);
			const leadName = lead?.name ?? "lead";
			const leadCount = taskCount.get(leadName) ?? 0;
			const children = [];
			children.push(
				h("rect", {
					key: "lead-box",
					className: "dsl-atp-nodeBox",
					x: leadX,
					y: leadCenter - leadHeight / 2,
					width: leadWidth,
					height: leadHeight,
					rx: 14,
					style:
						selectedName === leadName
							? { stroke: "var(--dsw-alias-state-business-primary)", strokeWidth: 1.5 }
							: { stroke: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 42%, transparent)", strokeWidth: 1 },
				}),
				h("circle", { key: "lead-dot", cx: leadX + 18, cy: leadCenter - 8, r: 4, style: { fill: STATE_TOKEN[leadState] } }),
				h("text", { key: "lead-name", className: "dsl-atp-nodeName", x: leadX + 30, y: leadCenter - 2 }, leadName),
				h(
					"text",
					{ key: "lead-meta", className: "dsl-atp-nodeMeta", x: leadX + 30, y: leadCenter + 15 },
					`${t("role.lead")} · ${t(`state.${leadState}`)}`
				),
				h(
					"text",
					{ key: "lead-count", className: "dsl-atp-nodeCount", x: leadX + leadWidth - 14, y: leadCenter + 4 },
					t("member.tasks", { n: leadCount })
				)
			);
			others.forEach((member, index) => {
				const state = memberState(member, runningById[member.id]);
				const y = 14 + index * (rowHeight + rowGap);
				const center = y + rowHeight / 2;
				const count = taskCount.get(member.name) ?? 0;
				const selected = selectedName === member.name;
				children.push(
					h("path", {
						key: `link-${member.id}`,
						className: "dsl-atp-link",
						"data-state": state,
						d: `M${leadX + leadWidth},${leadCenter} C${leadX + leadWidth + 90},${leadCenter} ${nodeX - 70},${center} ${nodeX},${center}`,
					})
				);
				children.push(
					h(
						"g",
						{
							key: `node-${member.id}`,
							className: "dsl-atp-node",
							"data-selected": selected ? "true" : "false",
							role: "button",
							tabIndex: 0,
							"aria-pressed": selected,
							"aria-label": `${member.name} ${t(`state.${state}`)}`,
							onClick: () => onSelect(member),
							onKeyDown: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onSelect(member);
								}
							},
							onDoubleClick: () => onOpen(member),
						},
						h("rect", { className: "dsl-atp-nodeBox", x: nodeX, y, width: nodeWidth, height: rowHeight - 2, rx: 12 }),
						h("title", undefined, `${member.name} · ${t(`state.${state}`)}`),
						h("circle", { cx: nodeX + 16, cy: center - 6, r: 3.5, style: { fill: STATE_TOKEN[state] } }),
						h("text", { className: "dsl-atp-nodeName", x: nodeX + 28, y: center - 3 }, member.name),
						h("text", { className: "dsl-atp-nodeMeta", x: nodeX + 28, y: center + 13 }, t(`state.${state}`)),
						h("text", { className: "dsl-atp-nodeCount", x: nodeX + nodeWidth - 12, y: center + 4 }, t("member.tasks", { n: count }))
					)
				);
			});
			if (others.length === 0) {
				children.push(
					h("text", { key: "waiting", className: "dsl-atp-nodeMeta", x: nodeX, y: height / 2 + 4, style: { fontStyle: "italic" } }, t("lead.waiting"))
				);
			}
			return h(
				"div",
				{ className: "dsl-atp-graph" },
				h(
					"svg",
					{
						className: "dsl-atp-graphSvg",
						viewBox: `0 0 ${width} ${height}`,
						preserveAspectRatio: "xMidYMid meet",
						role: "img",
						"aria-label": t("section.topology"),
					},
					children
				),
				h(
					"div",
					{ className: "dsl-atp-legend" },
					h(StateMarker, { state: "running", t }),
					h(StateMarker, { state: "inactive", t }),
					h(StateMarker, { state: "provisioning", t }),
					h(StateMarker, { state: "failed", t })
				)
			);
		}

		/**
		 * One roster row: identity, live state, model, owned-task count and the
		 * action that opens the member's own Session.
		 * @param props.member - projection member.
		 * @param props.state - derived member state.
		 * @param props.model - model id, or undefined.
		 * @param props.tasks - how many tasks this member owns.
		 * @param props.selected - whether the board filters to this member.
		 * @param props.onSelect - toggle the board filter.
		 * @param props.onOpen - open the member Session.
		 * @param props.t - translator.
		 */
		function MemberCard({ member, state, model, tasks, selected, onSelect, onOpen, t }) {
			const initial = (member.name ?? "?").slice(0, 1);
			return h(
				"div",
				{
					className: "dsl-atp-member",
					"data-selected": selected ? "true" : "false",
					role: "button",
					tabIndex: 0,
					"aria-pressed": selected,
					onClick: () => onSelect(member),
					onKeyDown: (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							onSelect(member);
						}
					},
				},
				h("span", { className: "dsl-atp-avatar", "aria-hidden": "true" }, initial),
				h(
					"div",
					{ className: "dsl-atp-memberMain" },
					h(
						"div",
						{ className: "dsl-atp-memberHead" },
						h("span", { className: "dsl-atp-memberName", title: member.name }, member.name),
						h("span", { className: "dsl-atp-role", "data-role": member.role }, t(`role.${member.role === "lead" ? "lead" : "teammate"}`))
					),
					h(
						"div",
						{ className: "dsl-atp-memberState" },
						h(primitives.StateDot, { state: STATE_DOT[state], size: state === "running" ? 12 : 8 }),
						h("span", { className: "dsl-atp-stateLabel" }, t(`state.${state}`)),
						h("span", { className: "dsl-atp-sep", "aria-hidden": "true" }, "·"),
						h(
							"span",
							{ className: "dsl-atp-memberMeta", title: model === undefined ? undefined : model },
							model === undefined ? t("member.modelUnknown") : t("member.model", { model })
						)
					),
					h("div", { className: "dsl-atp-memberFoot" }, h("span", undefined, t("member.tasks", { n: tasks })))
				),
				h(
					"div",
					{ className: "dsl-atp-memberActions" },
					h(
						"button",
						{
							type: "button",
							className: "dsl-atp-button",
							title: t("action.openMember"),
							onClick: (event) => {
								event.stopPropagation();
								onOpen(member);
							},
						},
						t("action.openMember")
					)
				)
			);
		}

		/**
		 * One shared task: subject, owner, dependencies, write scopes, the Host's
		 * overlap warning, and the description behind an expand toggle.
		 * @param props.task - projection task.
		 * @param props.ready - whether every blocker completed.
		 * @param props.t - translator.
		 */
		function TaskCard({ task, ready, t }) {
			const [open, setOpen] = useState(false);
			const owner = ownerOf(task);
			const blockers = Array.isArray(task.blockedBy) ? task.blockedBy : [];
			const scopes = Array.isArray(task.writeScopes) ? task.writeScopes : [];
			const warnings = Array.isArray(task.writeScopeWarnings) ? task.writeScopeWarnings : [];
			const description = typeof task.description === "string" ? task.description.trim() : "";
			const longDescription = description.length > 220;
			return h(
				"div",
				{ className: "dsl-atp-task" },
				h("p", { className: "dsl-atp-taskSubject" }, task.subject ?? task.id),
				h(
					"div",
					{ className: "dsl-atp-taskMeta" },
					h(
						"span",
						{ className: "dsl-atp-pill", "data-tone": "owner", title: owner ?? t("task.unowned") },
						h("span", { className: "dsl-atp-pillText" }, owner ?? t("task.unowned"))
					),
					task.status === "completed"
						? null
						: h(
								"span",
								{ className: "dsl-atp-pill", "data-tone": ready ? "ready" : "blocked" },
								h("span", { className: "dsl-atp-pillText" }, ready ? t("task.ready") : t("task.notReady"))
							),
					blockers.map((id) =>
						h(
							"span",
							{ key: `blocker-${id}`, className: "dsl-atp-pill", title: id },
							h("span", { className: "dsl-atp-pillText" }, t("task.blockedBy", { ids: shortId(id) }))
						)
					),
					scopes.map((scope) =>
						h(
							"span",
							{ key: `scope-${scope}`, className: "dsl-atp-pill", title: scope },
							h("span", { className: "dsl-atp-pillText" }, scope)
						)
					)
				),
				warnings.length === 0
					? null
					: h(
							React.Fragment,
							undefined,
							warnings.map((warning) =>
								h("p", { key: `warning-${warning}`, className: "dsl-atp-warn" }, warningText(warning, t))
							)
						),
				description === ""
					? null
					: h(
							"p",
							{ className: "dsl-atp-desc", "data-clamped": longDescription && !open ? "true" : "false" },
							description
						),
				longDescription
					? h(
							"button",
							{ type: "button", className: "dsl-atp-descToggle", onClick: () => setOpen((value) => !value) },
							t(open ? "action.collapse" : "action.expand")
						)
					: null
			);
		}

		/**
		 * The board: one column per task status, with the member filter applied.
		 * @param props.tasks - every task in the team.
		 * @param props.filterName - owner name to keep, or undefined for all tasks.
		 * @param props.t - translator.
		 */
		function TaskBoard({ tasks, filterName, t }) {
			const grouped = useMemo(() => groupTasks(tasks, filterName), [tasks, filterName]);
			const readiness = useMemo(() => {
				const map = new Map();
				for (const task of tasks) map.set(task.id, taskReady(tasks, task));
				return map;
			}, [tasks]);
			return h(
				"div",
				{ className: "dsl-atp-board" },
				STATUS_ORDER.map((status) =>
					h(
						"div",
						{ key: status, className: "dsl-atp-column" },
						h(
							"div",
							{ className: "dsl-atp-columnHead" },
							h("span", { className: "dsl-atp-legendDot", style: { background: STATE_TOKEN[status === "in_progress" ? "running" : status === "completed" ? "inactive" : "provisioning"] } }),
							h("span", { className: "dsl-atp-columnTitle" }, t(`task.${status}`)),
							h("span", { className: "dsl-atp-columnCount" }, String(grouped[status].length))
						),
						grouped[status].length === 0
							? h("div", { className: "dsl-atp-columnEmpty" }, t("task.empty"))
							: grouped[status].map((task) => h(TaskCard, { key: task.id, task, ready: readiness.get(task.id) === true, t }))
					)
				)
			);
		}

		/**
		 * The panel itself: team picker, topology, roster and task board for the
		 * team the current Session belongs to.
		 * @param props.useSessions - catalog hook supplied by the `main` slot.
		 * @param props.sessions - the `sessions` service (for refresh + retain info).
		 * @param props.uiWorkspace - the workspace navigation service.
		 * @param props.layout - the layout service (returns to the Conversation).
		 * @param props.t - translator bound to this plugin's namespace.
		 */
		function AgentTeamPage(props) {
			const { useSessions, sessions, uiWorkspace, layout, t } = props;
			const snapshot = useSessions((state) => state);
			const teams = useMemo(() => collectTeams(snapshot, lastMainSessionId), [snapshot]);
			const panelSessionId = useMemo(() => resolvePanelSessionId(snapshot, lastMainSessionId), [snapshot]);
			const [pickedId, setPickedId] = useState(undefined);
			const [focusName, setFocusName] = useState(undefined);
			const [refresh, setRefresh] = useState({ status: "idle", at: undefined, error: undefined });
			const [scan, setScan] = useState({ status: "idle", count: 0, error: undefined });
			const [openError, setOpenError] = useState(undefined);
			const activeTeam = useMemo(() => {
				if (pickedId !== undefined) {
					const picked = teams.find((team) => team.sessionId === pickedId);
					if (picked !== undefined) return picked;
				}
				return teams[0];
			}, [teams, pickedId]);
			const activeId = activeTeam?.sessionId;
			const runningById = useMemo(() => {
				const map = {};
				const byId = snapshot?.byId ?? {};
				for (const [id, row] of Object.entries(byId)) {
					if (row !== null && row !== undefined && row.running === true) map[id] = true;
				}
				return map;
			}, [snapshot]);
			const taskCount = useMemo(() => countByOwner(activeTeam?.tasks ?? []), [activeTeam]);
			const activeMembers = activeTeam?.members ?? [];
			const activeTasks = activeTeam?.tasks ?? [];
			const focusMember = activeMembers.find((member) => member.name === focusName);
			const requestId = useRef(0);
			const autoScanned = useRef(false);
			const refreshTeam = useCallback(
				(sessionId) => {
					if (sessionId === undefined) return;
					const ticket = requestId.current + 1;
					requestId.current = ticket;
					setRefresh((previous) => ({ status: "loading", at: previous.at, error: undefined }));
					let pending;
					try {
						pending = sessions.refreshProjections(sessionId);
					} catch (error) {
						setRefresh({ status: "error", at: Date.now(), error: messageOf(error) });
						return;
					}
					if (pending === undefined || typeof pending.then !== "function") {
						setRefresh({ status: "ready", at: Date.now(), error: undefined });
						return;
					}
					pending.then(
						() => {
							if (requestId.current !== ticket) return;
							setRefresh({ status: "ready", at: Date.now(), error: undefined });
						},
						(error) => {
							if (requestId.current !== ticket) return;
							setRefresh({ status: "error", at: Date.now(), error: messageOf(error) });
						}
					);
				},
				[sessions]
			);
			/**
			 * Pull projections for recent conversation sessions so a team started
			 * before this panel was opened shows up without leaving it.
			 */
			const scanSessions = useCallback(() => {
				const rows = Object.values(snapshot?.byId ?? {}).filter((row) => row !== null && row !== undefined);
				const candidates = rows
					.filter((row) => row.origin !== "subagent" && typeof row.id === "string")
					.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
					.slice(0, 20)
					.map((row) => row.id);
				setScan({ status: "loading", count: candidates.length, error: undefined });
				Promise.allSettled(candidates.map((id) => sessions.refreshProjections(id))).then(
					(results) => {
						const failure = results.find((result) => result.status === "rejected");
						setScan({
							status: failure === undefined ? "done" : "error",
							count: candidates.length,
							error: failure === undefined ? undefined : messageOf(failure.reason),
						});
					},
					(error) => setScan({ status: "error", count: candidates.length, error: messageOf(error) })
				);
			}, [snapshot, sessions]);
			useEffect(() => {
				setFocusName(undefined);
				refreshTeam(activeId);
			}, [activeId, refreshTeam]);
			// A team started in another conversation only shows up once that
			// session's projection is loaded, so the empty state probes the
			// recent conversations exactly once per mount.
			useEffect(() => {
				if (autoScanned.current || panelSessionId === undefined || activeTeam !== undefined) return;
				autoScanned.current = true;
				scanSessions();
			}, [panelSessionId, activeTeam, scanSessions]);
			const openSession = useCallback(
				(target) => {
					try {
						layout.selectPanel(null);
						uiWorkspace.openSession(target);
						setOpenError(undefined);
					} catch (error) {
						setOpenError(messageOf(error));
					}
				},
				[layout, uiWorkspace]
			);
			const openTeam = useCallback(() => {
				if (activeId !== undefined) openSession(activeId);
			}, [activeId, openSession]);
			const openMember = useCallback(
				(member) => {
					if (activeId === undefined) return;
					if (member.id === activeId) {
						openSession(activeId);
						return;
					}
					openSession({ parentSessionId: activeId, childSessionId: member.id, mode: "continuable" });
				},
				[activeId, openSession]
			);
			const selectMember = useCallback((member) => {
				setFocusName((current) => (current === member.name ? undefined : member.name));
			}, []);
			const subtitle =
				activeTeam === undefined
					? t("subtitle")
					: activeMembers.length <= 1
						? fill(t("subtitle.leadOnly"), { name: teamNameOf(activeTeam) })
						: fill(t("subtitle.team"), {
								name: teamNameOf(activeTeam),
								members: activeMembers.length,
								tasks: activeTasks.length,
							});
			const scanLine =
				scan.status === "error"
					? fill(t("scan.failed"), { message: scan.error })
					: scan.status === "done"
						? teams.length > 1
							? fill(t("scan.done"), { n: scan.count })
							: fill(t("scan.none"), {})
						: undefined;
			const body = () => {
				if (panelSessionId === undefined) {
					return h(
						"div",
						{ className: "dsl-atp-state" },
						h("div", { className: "dsl-atp-stateGlyph" }, h(primitives.IconUsersOutlineRegular, { size: 22 })),
						h("p", { className: "dsl-atp-stateTitle" }, t("empty.noSession.title")),
						h("p", { className: "dsl-atp-stateBody" }, t("empty.noSession.body"))
					);
				}
				if (activeTeam === undefined) {
					return h(
						"div",
						{ className: "dsl-atp-state" },
						h("div", { className: "dsl-atp-stateGlyph" }, h(primitives.IconUsersOutlineRegular, { size: 22 })),
						h("p", { className: "dsl-atp-stateTitle" }, t("empty.team.title")),
						h("p", { className: "dsl-atp-stateBody" }, t("empty.team.body")),
						h("p", { className: "dsl-atp-stateHint" }, t("empty.team.hint")),
						h(
							"div",
							{ className: "dsl-atp-stateAction" },
							h(
								"button",
								{ type: "button", className: "dsl-atp-button", onClick: () => openSession(panelSessionId) },
								t("action.openTeam")
							),
							h(
								"button",
								{ type: "button", className: "dsl-atp-button", onClick: () => refreshTeam(panelSessionId) },
								t("action.refresh")
							),
							h(
								"button",
								{
									type: "button",
									className: "dsl-atp-button",
									disabled: scan.status === "loading",
									onClick: scanSessions,
								},
								scan.status === "loading" ? t("scan.running") : t("action.scan")
							)
						),
						scanLine === undefined ? null : h("p", { className: "dsl-atp-stateHint" }, scanLine)
					);
				}
				return h(
					React.Fragment,
					undefined,
					teams.length > 1
						? h(
								"div",
								{ className: "dsl-atp-chips", style: { marginTop: 18 } },
								h("span", { className: "dsl-atp-chipsLabel" }, t("team.picker")),
								teams.map((team) =>
									h(
										"button",
										{
											key: team.sessionId,
											type: "button",
											className: "dsl-atp-chip",
											"data-active": team.sessionId === activeId ? "true" : "false",
											onClick: () => setPickedId(team.sessionId),
										},
										h("span", { className: "dsl-atp-chipText" }, teamNameOf(team)),
										h("span", { className: "dsl-atp-chipCount" }, t("count.members", { n: team.members.length }))
									)
								)
							)
						: null,
					activeTeam.failure === undefined
						? null
						: h(
								"p",
								{ className: "dsl-atp-warn", style: { marginTop: 14 } },
								fill(t("error.load"), { message: activeTeam.failure })
							),
					h(
						"section",
						{ className: "dsl-atp-section" },
						h(
							"div",
							{ className: "dsl-atp-sectionHead" },
							h("h2", { className: "dsl-atp-sectionTitle" }, t("section.topology")),
							h(
								"div",
								{ className: "dsl-atp-headActions" },
								activeId === panelSessionId
									? null
									: h(
											"button",
											{ type: "button", className: "dsl-atp-button", onClick: () => setPickedId(panelSessionId) },
											t("member.current")
										)
							)
						),
						h(TeamGraph, {
							members: activeMembers,
							runningById,
							taskCount,
							selectedName: focusName,
							onSelect: selectMember,
							onOpen: openMember,
							t,
						})
					),
					h(
						"section",
						{ className: "dsl-atp-section" },
						h(
							"div",
							{ className: "dsl-atp-sectionHead" },
							h("h2", { className: "dsl-atp-sectionTitle" }, t("section.members")),
							h("p", { className: "dsl-atp-sectionNote" }, t("count.members", { n: activeMembers.length }))
						),
						h(
							"div",
							{ className: "dsl-atp-grid" },
							activeMembers.map((member) =>
								h(MemberCard, {
									key: member.id,
									member,
									state: memberState(member, runningById[member.id]),
									model: modelOf(snapshot, member.id, snapshot?.byId?.[member.id]?.projectionValues),
									tasks: taskCount.get(member.name) ?? 0,
									selected: focusName === member.name,
									onSelect: selectMember,
									onOpen: openMember,
									t,
								})
							)
						)
					),
					h(
						"section",
						{ className: "dsl-atp-section" },
						h(
							"div",
							{ className: "dsl-atp-sectionHead" },
							h("h2", { className: "dsl-atp-sectionTitle" }, t("section.tasks")),
							h("p", { className: "dsl-atp-sectionNote" }, t("count.tasks", { n: activeTasks.length }))
						),
						h(
							"div",
							{ className: "dsl-atp-chips" },
							h(
								"button",
								{
									type: "button",
									className: "dsl-atp-chip",
									"data-active": focusMember === undefined ? "true" : "false",
									onClick: () => setFocusName(undefined),
								},
								h("span", { className: "dsl-atp-chipText" }, t("action.all"))
							),
							activeMembers
								.filter((member) => (taskCount.get(member.name) ?? 0) > 0)
								.map((member) =>
									h(
										"button",
										{
											key: member.id,
											type: "button",
											className: "dsl-atp-chip",
											"data-active": focusName === member.name ? "true" : "false",
											onClick: () => selectMember(member),
										},
										h("span", { className: "dsl-atp-chipText" }, fill(t("filter.byMember"), { name: member.name })),
										h("span", { className: "dsl-atp-chipCount" }, String(taskCount.get(member.name) ?? 0))
									)
								)
						),
						h(TaskBoard, { tasks: activeTasks, filterName: focusName, t })
					),
					h(
						"p",
						{ className: "dsl-atp-hint" },
						refresh.error === undefined ? t("hint") : fill(t("error.load"), { message: refresh.error }),
						refresh.at === undefined ? null : ` ${fill(t("hint.refreshed"), { time: clockOf(refresh.at) })}`
					),
					openError === undefined ? null : h("p", { className: "dsl-atp-warn" }, fill(t("error.open"), { message: openError }))
				);
			};
			return h(
				"div",
				{ className: "dsl-atp-page" },
				h(
					"header",
					{ className: "dsl-atp-head" },
					h(
						"div",
						{ className: "dsl-atp-headMain" },
						h("h1", { className: "dsl-atp-title" }, t("title")),
						h("p", { className: "dsl-atp-subtitle" }, subtitle)
					),
					h(
						"div",
						{ className: "dsl-atp-headActions" },
						activeTeam === undefined
							? null
							: h(
									"button",
									{ type: "button", className: "dsl-atp-button", onClick: openTeam, title: t("action.openTeam") },
									t("action.openTeam")
								),
						h(
							"button",
							{
								type: "button",
								className: "dsl-atp-iconButton",
								title: t("action.refresh"),
								"aria-label": t("action.refresh"),
								disabled: refresh.status === "loading" || (activeId ?? panelSessionId) === undefined,
								onClick: () => refreshTeam(activeId ?? panelSessionId),
							},
							refresh.status === "loading"
								? h(primitives.StateDot, { state: "ongoing", size: 12 })
								: h(primitives.IconRefreshOutlineRegular, { size: 14 })
						)
					)
				),
				h("div", { className: "dsl-atp-pageScroll" }, h("div", { className: "dsl-atp-pageContent" }, body()))
			);
		}
		//#endregion

		//#region plugin
		/**
		 * Automation console — ported from the retired `dsh-plugin-schedule-console`.
		 * One sidebar row whose page lists every scheduled job this Mac runs (launchd
		 * agents, the loaded system jobs, the crontab and DSH's own clocks) and posts
		 * the three actions a user agent accepts; the host half owns the list. Wrapped
		 * in its own closure so the original module keeps its own `exports`.
		 */
		var __automationPanel = (function () {
			var module = { exports: {} };
			var exports = module.exports;
			Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const { useCallback, useEffect, useMemo, useRef, useState } = React;
		const h = React.createElement;
		/** This package's manifest name; the sidebar entry id, the panel key and the loader id all agree. */
		const PACKAGE_NAME = "muciya-dsh-plugin-agent-teams";
		/** Dictionary namespace owned by this plugin. */
		const NS = "scheduleConsole";
		/** The id shared by the sidebar row and the main panel it opens. */
		const PANEL_ID = "schedules";
		/** The host half's API prefix. */
		const API_BASE = "/api/muciya-agent-teams/automation/v1";
		/** Inline style tag identity, so a reload replaces this plugin's CSS instead of stacking it. */
		const CSS_TAG_ID = PACKAGE_NAME + "/AutomationTasks.module.css";
		/** How often the list re-scans while the page is visible. */
		const REFRESH_INTERVAL_MS = 30_000;
		/** How long an action result stays on screen. */
		const FLASH_MS = 4_000;
		//#region locales
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			panel: "定时任务",
			title: "定时任务",
			subtitle: "DSH 定时任务、launchd 与 crontab 的统一视图",
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
			"dsh.title": "DSH 定时任务",
			"dsh.hint": "由 DSH 自己维护 · 到点在新会话里执行",
			"dsh.empty": "还没有 DSH 定时任务",
			"dsh.empty.body": "在任意会话里说「每天 9 点做某事」，Agent 会把它登记到这里。",
			"dsh.new": "新建任务",
			"dsh.new.label": "开始一个新会话来登记定时任务",
			"dsh.open": "打开会话",
			"dsh.open.label": "打开 {title} 所属的会话",
			"dsh.delete": "删除",
			"dsh.delete.label": "删除定时任务 {title}",
			"dsh.deleted": "已删除",
			"dsh.delete.failed": "删除失败：{reason}",
			"dsh.loading": "正在读取 DSH 定时任务…",
			"dsh.failed": "读取 DSH 定时任务失败",
			"dsh.status.active": "进行中",
			"dsh.status.inactive": "已停用",
			"dsh.next": "下次 {time}",
			"dsh.overdue": "已到期",
			"dsh.kind.every": "每 {n}",
			"dsh.kind.daily": "每天 {time}",
			"dsh.kind.cron": "cron {expression}",
			"dsh.kind.at": "一次性 · {time}",
			"dsh.kind.after": "{n} 后",
			"dsh.kind.weekly": "每周 {time}",
			"dsh.unit.seconds": "{n} 秒",
			"dsh.unit.minutes": "{n} 分钟",
			"dsh.unit.hours": "{n} 小时",
			"dsh.count": "{n} 项任务",
		};
		/** English dictionary. */
		const en = {
			panel: "Scheduled tasks",
			title: "Scheduled tasks",
			subtitle: "DSH tasks, launchd and crontab in one view",
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
			"dsh.title": "DSH tasks",
			"dsh.hint": "Owned by DSH · runs in a fresh Session when due",
			"dsh.empty": "No DSH tasks yet",
			"dsh.empty.body": "Ask an Agent in any Session to do something every day and it lands here.",
			"dsh.new": "New task",
			"dsh.new.label": "Start a new Session to register a task",
			"dsh.open": "Open Session",
			"dsh.open.label": "Open the Session that owns {title}",
			"dsh.delete": "Delete",
			"dsh.delete.label": "Delete the task {title}",
			"dsh.deleted": "Deleted",
			"dsh.delete.failed": "Delete failed: {reason}",
			"dsh.loading": "Reading DSH tasks…",
			"dsh.failed": "Could not read DSH tasks",
			"dsh.status.active": "Active",
			"dsh.status.inactive": "Inactive",
			"dsh.next": "next {time}",
			"dsh.overdue": "overdue",
			"dsh.kind.every": "every {n}",
			"dsh.kind.daily": "daily {time}",
			"dsh.kind.cron": "cron {expression}",
			"dsh.kind.at": "one-shot · {time}",
			"dsh.kind.after": "in {n}",
			"dsh.kind.weekly": "weekly {time}",
			"dsh.unit.seconds": "{n} s",
			"dsh.unit.minutes": "{n} min",
			"dsh.unit.hours": "{n} h",
			"dsh.count": "{n} tasks",
		};
		//#endregion
		//#region styles
		const css = [
			".dsl-automation-page{box-sizing:border-box;width:100%;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);display:flex;flex-direction:column;overflow:hidden}",
			".dsl-automation-scroll{scrollbar-gutter:stable;--dsh-scrollbar-width:9px;--dsh-scrollbar-thumb-border:2px;margin:24px 0 0;flex:1;min-height:0;overflow:auto}",
			".dsl-automation-content{max-width:920px;margin:0 auto;padding:0 clamp(20px,4vw,40px) 40px}",
			".dsl-automation-head{box-sizing:border-box;width:100%;max-width:920px;margin:0 auto;padding:28px clamp(20px,4vw,40px) 0;justify-content:space-between;align-items:flex-start;gap:16px;display:flex}",
			"[data-platform=darwin] .dsl-automation-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}",
			".dsl-automation-title{margin:0;font-size:20px;font-weight:500;line-height:28px}",
			".dsl-automation-subtitle{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:4px 0 0;font-size:13px;line-height:20px}",
			".dsl-automation-headActions{flex:none;align-items:center;gap:8px;display:flex}",
			".dsl-automation-stats{color:var(--dsw-alias-label-tertiary);align-items:center;flex-wrap:wrap;gap:6px 14px;margin:0 0 4px;font-size:12px;line-height:18px;display:flex}",
			".dsl-automation-statNum{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
			".dsl-automation-statRunning .dsl-automation-statNum{color:var(--dsw-alias-state-business-primary)}",
			".dsl-automation-scanAt{color:var(--dsw-alias-label-caption);margin-left:auto}",
			".dsl-automation-flash{border-radius:10px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);margin:10px 0 0;padding:7px 11px;font-size:12px;line-height:18px}",
			".dsl-automation-flashError{color:var(--dsw-alias-state-error-primary)}",
			".dsl-automation-filter{align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);cursor:pointer;margin:14px 0 0;font-size:12px;line-height:18px;display:inline-flex}",
			".dsl-automation-filter input{margin:0}",
			".dsl-automation-group{margin:22px 0 0;border-radius:14px;border:.5px solid var(--dsw-alias-border-l3);overflow:hidden}",
			".dsl-automation-groupHead{background:var(--dsw-alias-bg-layer-3);align-items:center;gap:10px;padding:9px 12px;display:flex}",
			".dsl-automation-caret{border:0;background:0 0;width:20px;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}",
			".dsl-automation-caret:hover{color:var(--dsw-alias-label-primary)}",
			".dsl-automation-caret:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dsl-automation-rowToggle{border:0;background:0 0;width:18px;height:18px;color:var(--dsw-alias-label-caption);cursor:pointer;border-radius:50%;flex:none;justify-content:center;align-items:center;margin:1px 0 0;padding:0;display:inline-flex}",
			".dsl-automation-rowToggle:hover{color:var(--dsw-alias-label-primary)}",
			".dsl-automation-rowToggle:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dsl-automation-groupTitle{margin:0;font-size:13px;font-weight:500;line-height:20px}",
			".dsl-automation-groupHint{color:var(--dsw-alias-label-caption);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px}",
			".dsl-automation-groupCount{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;flex:none;margin-left:auto;font-size:12px;line-height:18px}",
			".dsl-automation-groupEmpty{color:var(--dsw-alias-label-caption);margin:0;padding:12px;font-size:12px;line-height:18px}",
			".dsl-automation-rows{flex-direction:column;margin:0;padding:0;list-style:none;display:flex}",
			".dsl-automation-row{border-top:.5px solid var(--dsw-alias-border-l3);align-items:flex-start;gap:10px;padding:10px 12px;display:flex}",
			".dsl-automation-row:first-child{border-top:0}",
			".dsl-automation-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsl-automation-dot{border-radius:50%;background:var(--dsw-alias-label-caption);flex:none;width:8px;height:8px;margin-top:6px}",
			".dsl-automation-dotRunning{background:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent)}",
			".dsl-automation-dotLoaded{background:var(--dsw-alias-label-tertiary)}",
			".dsl-automation-dotIdle{background:0 0;box-shadow:inset 0 0 0 1.5px var(--dsw-alias-border-l2)}",
			".dsl-automation-rowMain{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}",
			".dsl-automation-rowHead{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;display:flex}",
			".dsl-automation-label{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;font-weight:500;line-height:20px}",
			".dsl-automation-tag{border-radius:6px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);flex:none;padding:0 6px;font-size:11px;line-height:18px}",
			".dsl-automation-timing{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}",
			".dsl-automation-about{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}",
			".dsl-automation-meta{color:var(--dsw-alias-label-caption);flex-wrap:wrap;gap:4px 12px;margin:0;font-size:12px;line-height:18px;display:flex}",
			".dsl-automation-metaWarn{color:var(--dsw-alias-state-error-primary)}",
			".dsl-automation-path{color:var(--dsw-alias-label-caption);overflow-wrap:anywhere;margin:0;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11px;line-height:17px}",
			".dsl-automation-rowError{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:2px 0 0;font-size:12px;line-height:18px}",
			".dsl-automation-rowDetail{flex-direction:column;gap:2px;margin-top:2px;display:flex}",
			".dsl-automation-rowEnd{flex:none;align-items:center;gap:8px;padding-top:2px;display:flex}",
			".dsl-automation-badge{border-radius:6px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;padding:0 6px;font-size:11px;line-height:18px}",
			".dsl-automation-badgeRunning{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 16%,transparent);color:var(--dsw-alias-state-business-primary)}",
			".dsl-automation-log{border-radius:10px;background:var(--dsw-alias-bg-layer-3);flex-direction:column;gap:6px;margin:8px 0 2px;padding:9px 11px;display:flex}",
			".dsl-automation-logHead{align-items:center;flex-wrap:wrap;gap:8px;display:flex}",
			".dsl-automation-logTab{border:.5px solid transparent;background:0 0;border-radius:8px;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:1px 8px;font:inherit;font-size:11px;line-height:18px}",
			".dsl-automation-logTab:hover{color:var(--dsw-alias-label-primary)}",
			".dsl-automation-logTabActive{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}",
			".dsl-automation-logTab:disabled{cursor:default;opacity:.45}",
			".dsl-automation-logPath{color:var(--dsw-alias-label-caption);overflow-wrap:anywhere;flex:1;min-width:0;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11px;line-height:17px}",
			".dsl-automation-logBody{color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;margin:0;overflow:auto;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11px;line-height:17px}",
			".dsl-automation-logNote{color:var(--dsw-alias-label-caption);margin:0;font-size:11px;line-height:17px}",
			".dsl-automation-state{text-align:center;color:var(--dsw-alias-label-tertiary);flex-direction:column;align-items:center;gap:4px;padding:44px 16px;font-size:13px;line-height:20px;display:flex}",
			".dsl-automation-stateGlyph{color:var(--dsw-alias-label-caption);margin-bottom:6px}",
			".dsl-automation-stateTitle{color:var(--dsw-alias-label-secondary);margin:0;font-size:14px;font-weight:500;line-height:22px}",
			".dsl-automation-stateBody{margin:0;max-width:420px}",
			".dsl-automation-stateError{color:var(--dsw-alias-state-error-primary)}",
			".dsl-automation-stateAction{margin-top:10px}",
			".dsl-schedule-section{border-top:.5px solid var(--dsw-alias-border-l3);flex-direction:column;gap:10px;margin:20px 0 4px;padding-top:18px;display:flex}",
			".dsl-schedule-head{align-items:flex-start;gap:12px;display:flex}",
			".dsl-schedule-titles{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}",
			".dsl-schedule-titleRow{align-items:center;gap:8px;display:flex}",
			".dsl-schedule-title{color:var(--dsw-alias-label-primary);margin:0;font-size:15px;font-weight:600;line-height:22px}",
			".dsl-schedule-count{border-radius:6px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);padding:0 6px;font-size:11px;line-height:18px}",
			".dsl-schedule-hint{color:var(--dsw-alias-label-caption);margin:0;font-size:12px;line-height:18px}",
			".dsl-schedule-rows{border:.5px solid var(--dsw-alias-border-l3);border-radius:12px;margin:0;padding:0;list-style:none;overflow:hidden}",
			".dsl-schedule-row{border-top:.5px solid var(--dsw-alias-border-l3);align-items:flex-start;gap:10px;padding:10px 12px;display:flex}",
			".dsl-schedule-row:first-child{border-top:0}",
			".dsl-schedule-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsl-schedule-rowMain{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}",
			".dsl-schedule-rowHead{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;display:flex}",
			".dsl-schedule-label{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-size:13px;font-weight:500;line-height:20px}",
			".dsl-schedule-badge{border-radius:6px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;padding:0 6px;font-size:11px;line-height:18px}",
			".dsl-schedule-badgeActive{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary)}",
			".dsl-schedule-meta{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:18px}",
			".dsl-schedule-rowEnd{flex:none;align-items:center;gap:4px;padding-top:1px;display:flex}",
			".dsl-schedule-cancel{border:0;background:0 0;border-radius:6px;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:2px 6px;font:inherit;font-size:14px;line-height:18px}",
			".dsl-schedule-cancel:hover{color:var(--dsw-alias-label-primary)}",
			".dsl-schedule-note{color:var(--dsw-alias-label-caption);margin:0;font-size:12px;line-height:18px}",
			".dsl-schedule-noteError{color:var(--dsw-alias-state-error-primary)}",
			".dsl-schedule-empty{border:.5px dashed var(--dsw-alias-border-l3);border-radius:12px;flex-direction:column;gap:2px;padding:14px 16px;display:flex}",
			".dsl-schedule-emptyTitle{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px}",
		].join("");
		/** Install the panel stylesheet once per page. */
		function ensureStyles() {
			if (typeof document === "undefined") return;
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
		async function postAction(path, body) {
			const response = await fetch(API_BASE + path, {
				method: "POST",
				headers: { "content-type": "application/json", accept: "application/json" },
				body: JSON.stringify(body),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok || payload?.ok !== true) {
				throw new Error(String(payload?.detail ?? payload?.error ?? "HTTP " + response.status));
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
		//#region components
		/** Sidebar row glyph: the alarm clock, brighter while the panel is selected. */
		function AutomationIcon({ size, active }) {
			const Icon = active === true ? primitives.IconAlarmClockOutlineMedium : primitives.IconAlarmClockOutlineRegular;
			return h(Icon, { size });
		}
		/** Inline state block for the loading, empty and failure faces. */
		function StateBlock({ glyph, title, body, error, action }) {
			return h("div", { className: "dsl-automation-state" }, [
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
						? t("log.failed", { reason: state.error })
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
		/** A span of seconds as "5 分钟" / "2 小时" text. */
		function spanText(seconds, t) {
			if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return "";
			if (seconds % 3600 === 0) return t("dsh.unit.hours", { n: seconds / 3600 });
			if (seconds % 60 === 0) return t("dsh.unit.minutes", { n: seconds / 60 });
			return t("dsh.unit.seconds", { n: seconds });
		}
		/** One DSH schedule record as a short rule line. */
		function ruleText(record, t) {
			if (record === null || record === undefined) return "";
			if (record.kind === "every") return t("dsh.kind.every", { n: spanText(record.everySeconds, t) });
			if (record.kind === "daily") return t("dsh.kind.daily", { time: String(record.time ?? "") });
			if (record.kind === "weekly") return t("dsh.kind.weekly", { time: String(record.time ?? "") });
			if (record.kind === "cron") return t("dsh.kind.cron", { expression: String(record.expression ?? "") });
			if (record.kind === "at") return t("dsh.kind.at", { time: absoluteTime(Date.parse(String(record.scheduledAt ?? ""))) });
			if (record.kind === "after") return t("dsh.kind.after", { n: spanText(record.afterSeconds, t) });
			return String(record.kind ?? "");
		}
		/** When one DSH schedule record fires next, as wall-clock text. */
		function nextRunText(record, now, t) {
			const at = Date.parse(String(record.scheduledAt ?? ""));
			if (!Number.isFinite(at)) return "";
			if (at < now) return t("dsh.overdue");
			return t("dsh.next", { time: absoluteTime(at) + " · " + relativeTime(at, now, t) });
		}
		/** The DSH-owned tasks: everything Agents registered in this profile. */
		function DshScheduleSection({ state, now, t, busyId, confirmId, onNew, onOpen, onConfirm, onCancel, onDelete }) {
			const records = Array.isArray(state.records) ? state.records : [];
			const rows = records.map((record) => {
				const title = String(record.title ?? "");
				return h("li", { className: "dsl-schedule-row", key: record.id }, [
					h("div", { className: "dsl-schedule-rowMain", key: "main" }, [
						h("div", { className: "dsl-schedule-rowHead", key: "head" }, [
							h("span", { className: "dsl-schedule-label", key: "title" }, title),
							h(
								"span",
								{
									className: "dsl-schedule-badge" + (record.status === "active" ? " dsl-schedule-badgeActive" : ""),
									key: "status",
								},
								t(record.status === "active" ? "dsh.status.active" : "dsh.status.inactive"),
							),
						]),
						h(
							"p",
							{ className: "dsl-schedule-meta", key: "meta" },
							[ruleText(record, t), nextRunText(record, now, t)].filter((text) => text !== "").join(" · "),
						),
					]),
					h("div", { className: "dsl-schedule-rowEnd", key: "actions" }, [
						typeof record.sessionId === "string" && record.sessionId !== ""
							? h(
									primitives.Button,
									{
										key: "open",
										variant: "ghost",
										size: "sm",
										title: t("dsh.open.label", { title }),
										onClick: () => onOpen(record),
									},
									t("dsh.open"),
								)
							: null,
						confirmId === record.id
							? h(
									primitives.Button,
									{ key: "confirm", variant: "outline", size: "sm", disabled: busyId === record.id, onClick: () => onDelete(record) },
									t("dsh.delete"),
								)
							: h(
									primitives.Button,
									{
										key: "delete",
										variant: "ghost",
										size: "sm",
										disabled: busyId === record.id,
										title: t("dsh.delete.label", { title }),
										onClick: () => onConfirm(record.id),
									},
									t("dsh.delete"),
								),
						confirmId === record.id ? h("button", { key: "cancel", type: "button", className: "dsl-schedule-cancel", onClick: onCancel }, "×") : null,
					]),
				]);
			});
			const body =
				state.status === "loading" && records.length === 0
					? h("p", { className: "dsl-schedule-note", key: "loading" }, t("dsh.loading"))
					: state.status === "failed"
						? h("p", { className: "dsl-schedule-note dsl-schedule-noteError", key: "failed" }, t("dsh.failed") + "：" + String(state.error ?? ""))
						: records.length === 0
							? h("div", { className: "dsl-schedule-empty", key: "empty" }, [
									h("p", { className: "dsl-schedule-emptyTitle", key: "title" }, t("dsh.empty")),
									h("p", { className: "dsl-schedule-note", key: "body" }, t("dsh.empty.body")),
								])
							: h("ul", { className: "dsl-schedule-rows", key: "rows" }, rows);
			return h("section", { className: "dsl-schedule-section" }, [
				h("div", { className: "dsl-schedule-head", key: "head" }, [
					h("div", { className: "dsl-schedule-titles", key: "titles" }, [
						h("div", { className: "dsl-schedule-titleRow", key: "titleRow" }, [
							h("h2", { className: "dsl-schedule-title", key: "title" }, t("dsh.title")),
							h("span", { className: "dsl-schedule-count", key: "count" }, t("dsh.count", { n: records.length })),
						]),
						h("p", { className: "dsl-schedule-hint", key: "hint" }, t("dsh.hint")),
					]),
					h(primitives.Button, { key: "new", variant: "outline", size: "sm", title: t("dsh.new.label"), onClick: onNew }, t("dsh.new")),
				]),
				body,
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
			const schedule = props.schedule ?? null;
			const uiWorkspace = props.uiWorkspace ?? null;
			const [state, setState] = useState({ status: "loading", snapshot: null, error: null });
			const [flash, setFlash] = useState(null);
			const [busyId, setBusyId] = useState(null);
			const [showApple, setShowApple] = useState(false);
			const [opened, setOpened] = useState([]);
			const [openedRows, setOpenedRows] = useState([]);
			const [logs, setLogs] = useState({});
			const [now, setNow] = useState(() => Date.now());
			const requestRef = useRef(0);
			const [dsh, setDsh] = useState({ status: "loading", records: [], error: null });
			const [dshBusy, setDshBusy] = useState(null);
			const [dshConfirm, setDshConfirm] = useState(null);
			const dshRequestRef = useRef(0);
			/** Re-read the DSH-owned task catalog; the newest request wins. */
			const loadDsh = useCallback(async () => {
				if (schedule === null) {
					setDsh({ status: "failed", records: [], error: "schedule service unavailable" });
					return;
				}
				const ticket = dshRequestRef.current + 1;
				dshRequestRef.current = ticket;
				try {
					const answer = await schedule.catalog();
					if (dshRequestRef.current !== ticket) return;
					if (answer === null || answer === undefined || answer.ok !== true) {
						throw new Error(String(answer?.error ?? "catalog failed"));
					}
					const records = Array.isArray(answer.value) ? answer.value : [];
					setDsh({ status: "ready", records, error: null });
				} catch (error) {
					if (dshRequestRef.current !== ticket) return;
					setDsh((prev) => ({ status: prev.records.length > 0 ? "ready" : "failed", records: prev.records, error: String(error?.message ?? error) }));
				}
			}, [schedule]);
			/** Delete one DSH task after the inline confirmation. */
			const removeDsh = useCallback(
				async (record) => {
					if (schedule === null) return;
					setDshBusy(record.id);
					try {
						const answer = await schedule.delete({ sessionId: record.sessionId, id: record.id });
						if (answer === null || answer === undefined || answer.ok !== true) {
							throw new Error(String(answer?.error ?? answer?.value?.code ?? "delete failed"));
						}
						setDshConfirm(null);
						setFlash({ kind: "ok", text: String(record.title ?? "") + " · " + t("dsh.deleted") });
						await loadDsh();
					} catch (error) {
						setFlash({ kind: "error", text: t("dsh.delete.failed", { reason: String(error?.message ?? error) }) });
					} finally {
						setDshBusy(null);
					}
				},
				[loadDsh, schedule, t],
			);
			/** Jump to the Session that owns one DSH task. */
			const openDshSession = useCallback(
				(record) => {
					if (uiWorkspace === null || typeof uiWorkspace.openSession !== "function") return;
					try {
						uiWorkspace.openSession(record.sessionId);
					} catch (error) {
						setFlash({ kind: "error", text: String(error?.message ?? error) });
					}
				},
				[uiWorkspace],
			);
			/** A new DSH task is registered from a fresh Session. */
			const startDshTask = useCallback(() => {
				if (uiWorkspace === null || typeof uiWorkspace.startSession !== "function") return;
				try {
					uiWorkspace.startSession();
				} catch (error) {
					setFlash({ kind: "error", text: String(error?.message ?? error) });
				}
			}, [uiWorkspace]);
			/** Re-read the host snapshot; the newest request wins. */
			const load = useCallback(async () => {
				const ticket = requestRef.current + 1;
				requestRef.current = ticket;
				try {
					const response = await fetch(API_BASE + "/list", { headers: { accept: "application/json" } });
					const payload = await response.json().catch(() => null);
					if (!response.ok || payload?.ok !== true) {
						throw new Error(String(payload?.detail ?? payload?.error ?? "HTTP " + response.status));
					}
					if (requestRef.current !== ticket) return;
					setState({ status: "ready", snapshot: payload, error: null });
					setNow(Date.now());
				} catch (error) {
					if (requestRef.current !== ticket) return;
					setState((prev) => ({ status: prev.snapshot === null ? "failed" : "ready", snapshot: prev.snapshot, error: String(error?.message ?? error) }));
				}
			}, []);
			useEffect(() => {
				void load();
			}, [load]);
			useEffect(() => {
				void loadDsh();
			}, [loadDsh]);
			useEffect(() => {
				const timer = setInterval(() => {
					if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
					void load();
					void loadDsh();
				}, REFRESH_INTERVAL_MS);
				return () => clearInterval(timer);
			}, [load, loadDsh]);
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
						setFlash({ kind: "error", text: row.label + " · " + t("action.failed", { reason: String(error?.message ?? error) }) });
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
						throw new Error(String(payload?.detail ?? payload?.error ?? "HTTP " + response.status));
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
			const body =
				state.status === "loading" && snapshot === null
					? h(StateBlock, { glyph: h(primitives.IconLoadingOutlineRegular, { size: 22 }), title: t("loading") })
					: state.status === "failed" && snapshot === null
						? h(StateBlock, {
								glyph: h(primitives.IconWarningTriangleOutlineRegular, { size: 22 }),
								title: t("failed.title"),
								body: state.error,
								error: true,
								action: h(primitives.Button, { variant: "outline", size: "sm", onClick: () => void load() }, t("retry")),
							})
						: groups.length === 0
							? h(StateBlock, { glyph: h(primitives.IconAlarmClockOutlineRegular, { size: 22 }), title: t("empty.title"), body: t("empty.body") })
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
				h("div", { className: "dsl-automation-scroll", key: "scroll" }, [
					h("div", { className: "dsl-automation-content", key: "content" }, [
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
						h(DshScheduleSection, {
							key: "dsh",
							state: dsh,
							now,
							t,
							busyId: dshBusy,
							confirmId: dshConfirm,
							onNew: startDshTask,
							onOpen: openDshSession,
							onConfirm: (id) => setDshConfirm(id),
							onCancel: () => setDshConfirm(null),
							onDelete: (record) => void removeDsh(record),
						}),
						h("div", { key: "groups" }, state.status === "ready" && snapshot === null ? h(StateBlock, { title: t("empty.title"), body: t("empty.body") }) : body),
					]),
				]),
			]);
		}
		//#endregion
		//#region panel
		const inject = ["slots", "locale", "remote", "remote.schedule", "uiWorkspace"];
		/**
		 * Shadow the built-in schedules page so the one sidebar row shows DSH
		 * tasks, launchd and crontab together.
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
				"schedule-console: dictionaries",
			);
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("main", () =>
				ctx.slots.register(
					{
						name: "main",
						key: PANEL_ID,
						priority: -10,
						locale: NS,
						inject: () => ({ t, schedule: ctx.remote.schedule, uiWorkspace: ctx.uiWorkspace }),
					},
					AutomationTasksPage,
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
		})();
		/** Services this browser plugin needs before it can register. */
		const inject = [
			"slots",
			"layout",
			"locale",
			"sessions",
			"uiWorkspace",
			"remote",
			"remote.schedule"
		];

		/**
		 * Register the Agent Team sidebar row and the panel it opens.
		 * @param ctx - browser plugin context.
		 */
		function apply(ctx) {
			__automationPanel.apply(ctx);   // ported automation console (launchd + crontab + clocks)
			ensureStyles();
			ctx.effect(
				() =>
					ctx.locale.register(NS, {
						zh,
						en,
					}),
				"agent-team-panel: dictionaries"
			);
			ctx.effect(() => trackMainSession(ctx.sessions), "agent-team-panel: main session tracking");
			const t = ctx.locale.bind(NS);
			const dependencies = {
				sessions: ctx.sessions,
				uiWorkspace: ctx.uiWorkspace,
				layout: ctx.layout,
			};
			ctx.slots.inject("main", () =>
				ctx.slots.register(
					{
						name: "main",
						key: PANEL_ID,
						locale: NS,
						inject: () => ({
							sessions: dependencies.sessions,
							uiWorkspace: dependencies.uiWorkspace,
							layout: dependencies.layout,
							t,
						}),
					},
					AgentTeamPage
				)
			);
			ctx.slots.inject("sidebar.panellist", () =>
				ctx.slots.register(
					{
						name: "sidebar.panellist",
						id: PANEL_ID,
						order: PANEL_ORDER,
						locale: NS,
						label: () => t("panel"),
					},
					AgentTeamIcon
				)
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
			PANEL_ORDER,
			STATUS_ORDER,
			css,
			zh,
			en,
			fill,
			messageOf,
			resolvePanelSessionId,
			leadSessionIdOf,
			collectTeams,
			memberState,
			taskReady,
			groupTasks,
			countByOwner,
			shortId,
			clockOf,
			teamNameOf,
			modelOf,
			trackMainSession,
			AgentTeamPage,
			AgentTeamIcon,
			TeamGraph,
		};
		return module.exports;
	},
});
