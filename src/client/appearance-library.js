		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const { useCallback, useEffect, useMemo, useRef, useState } = React;
		const h = React.createElement;

		/** This package's manifest name; the sidebar entry id, the main panel key and the loader id all agree. */
		const PACKAGE_NAME = "dsh-plugin-appearance-library";
		/** Dictionary namespace owned by this plugin. */
		const NS = "appearanceLibrary";
		/** The id shared by the sidebar row and the main panel it opens. */
		const PANEL_ID = "appearance";
		/** Where the host half serves the exported library. Namespaced to the suite; see the Host half's API_PREFIX note. */
		const API_BASE = "/api/macos-suite/appearance/v1";

		/**
		* Read the live composer geometry off the real document and post it back.
		*
		* This exists because the transcript/composer clearance depends on facts no
		* selector and no build-time test can see: whether the shell took the
		* composer seat out of flow, how much room the scrollport actually reserves
		* for it, and where the last transcript row comes to rest once the scroller
		* is pinned to its end. The panel posts this to the host, which writes it
		* beside the skin library, so a real run can be inspected without asking
		* anyone to open devtools. Everything it touches is injectable, which is what
		* lets the offline harness drive it against a fake document.
		*
		* @param options - { transport, win, doc } seams; all default to globals.
		* @returns the payload that was posted (also useful in tests).
		*/
		async function takeProbe(options = {}) {
			const win = options.win ?? (typeof window === "undefined" ? null : window);
			const doc = options.doc ?? win?.document ?? null;
			const transport = options.transport ?? (typeof fetch === "function" ? fetch.bind(globalThis) : null);
			/* The panel can mount into documents that carry none of the shell
			   furniture (the offline harness, a host page without a conversation).
			   A missing measurement is fine; a throw here would take the panel
			   down with it. */
			if (doc === null || typeof doc.querySelector !== "function" || typeof win.getComputedStyle !== "function") return null;
			const getStyle = (el) => win.getComputedStyle(el);
			const rectOf = (el) => {
				const r = el.getBoundingClientRect();
				return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
			};
			const scroller = doc.querySelector('[data-conversation-scroll], [data-dsh-part="scrollport"]');
			/* Pin the scroller to its end first: the clearance in question is the one
			   that exists when the newest output is on screen, and a scroller parked
			   mid-history would report a meaningless gap. The reader's own position is
			   put back before this returns — a measurement must not double as a jump to
			   the newest message. */
			let restoreTop = null;
			if (scroller !== null) {
				restoreTop = scroller.scrollTop;
				scroller.scrollTop = scroller.scrollHeight;
			}
			await new Promise((resolve) => {
				if (typeof win.requestAnimationFrame === "function") win.requestAnimationFrame(() => resolve());
				else setTimeout(resolve, 32);
			});
			const root = doc.documentElement;
			const describe = (el) => (el === null ? null : {
				position: getStyle(el).position,
				paddingBottom: getStyle(el).paddingBottom,
				overflowY: getStyle(el).overflowY,
			});
			const rows = scroller === null
				? []
				: Array.from(scroller.querySelectorAll('[data-dsh-part="message-row"], [data-chat-anchor-key], [class*="_assistantRow"], [class*="_userRow"]'));
			let lastBottom = null;
			let lastClass = null;
			for (const row of rows) {
				const bottom = row.getBoundingClientRect().bottom;
				if (lastBottom === null || bottom > lastBottom) {
					lastBottom = Math.round(bottom);
					lastClass = String(row.className).slice(0, 80);
				}
			}
			const seat = doc.querySelector('[data-composer-seat], [data-slot="conversation.composer"], [data-dsh-surface="composer"]');
			const seatRect = seat === null ? null : rectOf(seat);
			const payload = {
				skin: root.getAttribute("data-dsh-skin"),
				dark: doc.body?.hasAttribute("data-ds-dark-theme") ?? null,
				composerOverlay: root.getAttribute("data-dsh-composer-overlay"),
				composerHeightVar: getStyle(root).getPropertyValue("--dsh-composer-height").trim(),
				seat: seat === null ? null : { rect: seatRect, ...describe(seat) },
				scrollport: scroller === null ? null : {
					rect: rectOf(scroller),
					...describe(scroller),
					scrollTop: Math.round(scroller.scrollTop),
					scrollHeight: scroller.scrollHeight,
					clientHeight: scroller.clientHeight,
				},
				lastRowBottom: lastBottom,
				lastRowClass: lastClass,
				rowCount: rows.length,
				gapToComposer: seatRect === null || lastBottom === null ? null : seatRect.top - lastBottom,
				overlap: seatRect === null || lastBottom === null ? null : lastBottom > seatRect.top,
			};
			if (scroller !== null && restoreTop !== null && scroller.scrollTop !== restoreTop) scroller.scrollTop = restoreTop;
			try {
				if (transport !== null) {
					await transport(`${API_BASE}/probe`, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(payload),
					});
				}
			} catch {
				/* A diagnostic must never break the panel it rides in. */
			}
			return payload;
		}
		/**
		* The skin center's runtime, published on `window` by that plugin for
		* exactly this kind of cooperation. Reading the persisted selection is
		* enough for a reload, but a live apply has to go through the skin
		* controller the page is already running — a file on disk cannot repaint a
		* document that has already booted.
		*/
		const RUNTIME_KEY = "__skinRuntime";
		/** Shared token layer tag: the package name, lower-cased, never the per-panel constant. */
		const TOKENS_TAG_ID = "muciya-dsh-plugin-macos-suite/tokens.css";
		/** Closing marker of the token block inside `css`; the layer below slices up to it. */
		const TOKENS_END = "/* mds-tokens end */";
		/** Inline style tag identity, so a reload replaces this plugin's CSS instead of stacking it. */
		const CSS_TAG_ID = `${PACKAGE_NAME}/AppearanceLibrary.module.css`;
		/** How far a press pushes a tile in, in scale units. */
		const PRESS_SCALE = 0.985;
		/** The skin center's background namespace: one section, two faces. */
		const SKIN_BACKGROUND_NS = "skin-background";
		/** Profile entries whose schema nests that section; the first served one wins. */
		const SKIN_ENTRY_IDS = ["web-ui-skin-center", "ui-skin-center", SKIN_BACKGROUND_NS];
		/** The skin center host half's integrity check. */
		const SKIN_VERIFY_URL = "/api/skin-center/v2/verify";
		/** The live background document: the settings page and the skin center both write it. */
		const SKIN_V2_ACTIVE_URL = "/api/skin-center/v2/active";
		/** Field defaults, mirroring the skin center's own SKIN_BACKGROUND_DEFAULTS. */
		const SKIN_DEFAULTS = {
			enabled: true,
			backgroundOpacity: 0,
			backgroundBlurEmpty: 0,
			backgroundBlurContent: 0,
			inputCardBlur: 10
		};
		/** Every field of the section, in the order its own settings page shows them. */
		const SKIN_FIELD_KEYS = ["enabled", "backgroundOpacity", "backgroundBlurEmpty", "backgroundBlurContent", "inputCardBlur"];
		/** The four sliders, with the bounds and steps the skin center's schema enforces. */
		const SKIN_SLIDERS = [
			{ key: "backgroundOpacity", unit: "%", min: 0, max: 100, step: 5, labelKey: "skin.backgroundOpacity", hintKey: "skin.backgroundOpacity.hint" },
			{ key: "backgroundBlurEmpty", unit: "px", min: 0, max: 20, step: 1, labelKey: "skin.backgroundBlurEmpty", hintKey: "skin.backgroundBlurEmpty.hint" },
			{ key: "backgroundBlurContent", unit: "px", min: 0, max: 20, step: 1, labelKey: "skin.backgroundBlurContent", hintKey: "skin.backgroundBlurContent.hint" },
			{ key: "inputCardBlur", unit: "px", min: 0, max: 20, step: 1, labelKey: "skin.inputCardBlur", hintKey: "skin.inputCardBlur.hint" }
		];
		/** How long a slider rests before its value is written to the shared section. */
		const SKIN_WRITE_DEBOUNCE = 220;
		/** How long the panel's own value outranks the live document after a write. */
		const SKIN_OWN_MS = 2500;
		/** How often the block re-reads the live document while it is open. */
		const SKIN_READ_INTERVAL = 2000;
		/** Where the block remembers whether it is open; a panel preference, not a setting. */
		const SKIN_OPEN_KEY = "dsh.appearance-library.skinOpen";

		//#region locales
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			panel: "外观库",
			title: "外观库",
			subtitle: "把本机 macOS 壁纸接成 DSH 皮肤",
			"subtitle.count": "{total} 张壁纸 · {still} 张静态 · {motion} 张动态",
			"subtitle.generated": "导出时间 {time}",
			"refresh.label": "重新读取壁纸库",
			refresh: "刷新",
			"search.placeholder": "搜索壁纸名称",
			"search.label": "搜索壁纸",
			"search.clear": "清除搜索",
			"search.hint": "按 ⌘K 聚焦搜索，Esc 清空",
			"filter.label": "按来源筛选",
			"filter.all": "全部",
			"list.label": "壁纸列表",
			"grid.label": "壁纸网格",
			"count": "{n} 张",
			"group.count": "{n} 张",
			"group.jump": "跳到「{name}」",
			"group.expand": "展开「{name}」",
			"group.collapse": "收起「{name}」",
			"kind.still": "静态",
			"kind.motion": "动态",
			"kind.doc": "说明",
			"view.label": "切换视图",
			"view.grid": "网格视图",
			"view.list": "列表视图",
			"tile.open": "查看《{name}》的详情",
			"tile.quick": "直接把《{name}》应用为外观",
			"seam.label": "无缝循环",
			"seam.hint": "把影片首尾各 2 秒做交叉溶解，循环回跳时不再有硬切；首次处理需要几分钟，之后来回切换都是即时的。",
			"seam.switch": "为 {name} 切换无缝循环",
			"seam.busy": "重新编码中…",
			"seam.on": "《{name}》已开启无缝循环。",
			"seam.off": "《{name}》已恢复普通循环。",
			"seam.failed": "处理失败：{reason}",
			apply: "应用",
			"apply.label": "把 {name} 应用为外观",
			applying: "应用中…",
			applied: "使用中",
			"apply.failed": "应用失败：{reason}",
			"apply.pending": "正在切换外观…",
			"apply.done": "已切换到 {name}",
			"apply.localOnly": "已保存为当前外观，刷新页面后生效",
			"detail.title": "壁纸详情",
			"detail.close": "关闭详情",
			"detail.apply": "应用为外观",
			"detail.applied": "当前使用中",
			"detail.remove": "从外观库删除",
			"detail.facts": "信息",
			"detail.resolution": "分辨率",
			"detail.size": "预览图",
			"detail.master": "原图",
			"detail.source": "来源",
			"detail.kind": "类型",
			"detail.orientation": "方向",
			"detail.landscape": "横向",
			"detail.portrait": "纵向",
			"detail.unknown": "未知",
			"detail.previewAlt": "《{name}》的预览图",
			"state.loading": "正在读取壁纸库…",
			"state.none.title": "外观库还没有内容",
			"state.none.body": "运行导出脚本把本机壁纸写入皮肤目录：",
			"state.none.cmd": "node ~/.dsh-beta/profiles/desktop/plugins/dsh-plugin-appearance-library/scripts/export-wallpapers.mjs",
			"state.match.title": "没有匹配的壁纸",
			"state.match.body": "换个关键词试试。",
			"state.match.action": "清除筛选",
			"state.error.title": "读取壁纸库失败",
			"state.retry": "重试",
			"hint.exclusive": "一次只有一张壁纸生效：外观库与设置 → 皮肤中心写的是同一份选择，应用壁纸等于切换皮肤。",
			"skin.title": "皮肤设置",
			"skin.subtitle": "与「设置 → 皮肤」共用同一份配置，两边改动实时同步。",
			"skin.enabled": "启用皮肤中心",
			"skin.enabled.hint": "关闭后停用试穿、应用与背景控件，重新打开即恢复。",
			"skin.theme": "主题预览",
			"skin.theme.light": "亮色",
			"skin.theme.dark": "暗色",
			"skin.verify": "验证完整性",
			"skin.verifying": "正在验证…",
			"skin.verify.ok": "所有 {count} 款已安装皮肤完整性正常",
			"skin.verify.issues": "发现 {count} 款皮肤存在完整性异常",
			"skin.verify.failed": "验证失败：{reason}",
			"skin.loading": "正在读取皮肤配置…",
			"skin.readonly": "当前配置为只读，改动不会保存。",
			"skin.unavailable.body": "没有连上皮肤中心的配置服务，本页仍可正常应用壁纸。",
			"skin.backgroundOpacity": "背景遮挡",
			"skin.backgroundOpacity.hint": "即时为面板背后的背景加遮罩——数值越高越能弱化插画，帮你集中注意力。",
			"skin.backgroundBlurEmpty": "空对话背景模糊",
			"skin.backgroundBlurEmpty.hint": "对话为空时的背景高斯模糊强度，0 为关闭。",
			"skin.backgroundBlurContent": "有对话背景模糊",
			"skin.backgroundBlurContent.hint": "对话有内容时的背景高斯模糊强度，0 为关闭。",
			"skin.inputCardBlur": "输入卡模糊",
			"skin.inputCardBlur.hint": "仅模糊输入卡背后的区域，不会让整张壁纸变糊。",
			"aerials.title": "系统航拍 · 未下载",
			"aerials.blurb": "macOS 还有 {pending} 张航拍影片没下载（已下载 {downloaded} / 共 {total} 张）。",
			"aerials.open": "打开墙纸设置",
			"aerials.opening": "正在打开…",
			"aerials.opened": "已在系统设置里打开墙纸：在那边点一下要下载的那张，下完回来刷新即可。",
			"aerials.failed": "打开系统设置失败：{reason}",
			"aerials.badge": "未下载",
			"aerials.hint": "下载由 macOS 负责，本页只做跳转：点任意一项都会打开系统设置。",
			"aerials.count": "{n} 张",
			"aerials.expand": "展开「{name}」",
			"aerials.collapse": "收起「{name}」",
			"aerials.empty": "没有匹配的未下载航拍。",
			"aerials.tileLabel": "打开墙纸设置以下载 {name}",
			"import.action": "导入图片",
			"import.label": "选择本机图片做壁纸",
			"import.hint": "支持 JPEG / PNG / HEIC / TIFF / GIF，单张不超过 48 MB；原图会复制进 DSH 皮肤目录，之后删掉源文件也不影响。",
			"crop.title": "裁切与适配",
			"crop.step": "第 {n} 张 · 共 {total} 张",
			"crop.ratio": "取景比例",
			"crop.ratioScreen": "跟屏幕",
			"crop.auto": "自动适配",
			"crop.zoom": "缩放",
			"crop.hint": "在框里拖动图片调整位置，滚轮或滑杆缩放。取景比例越接近屏幕，铺满时被裁掉的越少；框里看到的就是最终壁纸。",
			"crop.apply": "导入这张",
			"crop.skip": "跳过这张",
			"crop.cancel": "取消",
			"crop.loading": "正在读取图片…",
			"crop.unreadable": "读不出这张图片的尺寸，无法裁切。",
			"import.busy": "正在导入 {name}…",
			"import.progress": "正在导入 {done}/{total}：{name}",
			"import.done": "已导入《{name}》，原图已另存进 DSH 外观库。",
			"import.many": "已导入 {n} 张图片。",
			"import.partial": "{done} 张已导入，其余失败。",
			"import.failed": "导入失败：{reason}",
			"import.unsupported": "这不是能识别的图片格式，支持 JPEG / PNG / HEIC / TIFF / GIF。",
			"import.tooLarge": "这张图超过 48 MB，先压一下再导入。",
			"import.none": "没有选中图片。",
			"remove.action": "删除",
			"remove.label": "删除《{name}》",
			"remove.hint": "只删 DSH 外观库里导出的这一款，macOS 的原件不动，随时可以恢复。",
			"remove.busy": "正在删除…",
			"remove.done": "已删除《{name}》。",
			"remove.failed": "删除失败：{reason}",
			"remove.inUse": "这款正在使用中，先切到别的壁纸再删。",
			"remove.cancel": "取消",
			"remove.removed": "已删除",
			"remove.strip": "已删除 {n} 款",
			"remove.stripHint": "这些壁纸已从外观库移除；macOS 原件仍在，点「恢复」即可重新导出。",
			"remove.stripEmpty": "删除过的壁纸会列在这里，随时可以恢复。",
			"remove.restore": "恢复",
			"remove.restoring": "正在恢复…",
			"remove.restored": "已恢复《{name}》。",
			"remove.restoreFailed": "恢复失败：{reason}",
			"remove.sourceGone": "原图已不在 DSH 收件箱里，无法重新导出。",
			"undo.remove": "撤销",
			"undo.restoring": "正在撤销…",
			"about.title": "关于本图库",
			"about.counts": "{wallpapers} 张壁纸 · {clusters} 个系列 · {mediaMB} MB 原图",
			"about.close": "关闭说明"
		};

		/** English dictionary, checked complete against the zh key set. */
		const en = {
			panel: "Appearance Library",
			title: "Appearance Library",
			subtitle: "This Mac's wallpapers, wired in as DSH skins",
			"subtitle.count": "{total} wallpapers · {still} still · {motion} motion",
			"subtitle.generated": "Exported {time}",
			"refresh.label": "Reload the wallpaper library",
			refresh: "Refresh",
			"search.placeholder": "Search wallpapers",
			"search.label": "Search wallpapers",
			"search.clear": "Clear search",
			"search.hint": "Press ⌘K to search, Esc to clear",
			"filter.label": "Filter by source",
			"filter.all": "All",
			"list.label": "Wallpaper list",
			"grid.label": "Wallpaper grid",
			"count": "{n}",
			"group.count": "{n}",
			"group.jump": "Jump to {name}",
			"group.expand": "Show {name}",
			"group.collapse": "Hide {name}",
			"kind.still": "Still",
			"kind.motion": "Motion",
			"kind.doc": "About",
			"view.label": "Switch view",
			"view.grid": "Grid view",
			"view.list": "List view",
			"tile.open": "Open the details of {name}",
			"tile.quick": "Apply {name} straight away",
			"seam.label": "Seamless loop",
			"seam.hint": "Cross-dissolve the film's first and last two seconds so the loop no longer cuts. The first cut takes a few minutes; after that the switch is instant either way.",
			"seam.switch": "Toggle the seamless loop for {name}",
			"seam.busy": "Re-encoding…",
			"seam.on": "Seamless loop on for {name}.",
			"seam.off": "Seamless loop off for {name}.",
			"seam.failed": "Failed: {reason}",
			apply: "Apply",
			"apply.label": "Apply {name} as the appearance",
			applying: "Applying…",
			applied: "In use",
			"apply.failed": "Apply failed: {reason}",
			"apply.pending": "Switching the appearance…",
			"apply.done": "Switched to {name}",
			"apply.localOnly": "Saved as the current appearance; refresh to see it",
			"detail.title": "Wallpaper details",
			"detail.close": "Close the details",
			"detail.apply": "Apply as appearance",
			"detail.applied": "Currently in use",
			"detail.remove": "Remove from the library",
			"detail.facts": "Facts",
			"detail.resolution": "Resolution",
			"detail.size": "Preview",
			"detail.master": "Master",
			"detail.source": "Source",
			"detail.kind": "Kind",
			"detail.orientation": "Orientation",
			"detail.landscape": "Landscape",
			"detail.portrait": "Portrait",
			"detail.unknown": "Unknown",
			"detail.previewAlt": "Preview of {name}",
			"state.loading": "Reading the wallpaper library…",
			"state.none.title": "The library is empty",
			"state.none.body": "Run the export script to write this Mac's wallpapers into the skin directory:",
			"state.none.cmd": "node ~/.dsh-beta/profiles/desktop/plugins/dsh-plugin-appearance-library/scripts/export-wallpapers.mjs",
			"state.match.title": "No matching wallpaper",
			"state.match.body": "Try another term.",
			"state.match.action": "Clear the filters",
			"state.error.title": "Could not read the wallpaper library",
			"state.retry": "Retry",
			"hint.exclusive": "One wallpaper at a time: this panel and Settings → Skin Center write the same selection, so applying a wallpaper is switching a skin.",
			"skin.title": "Skin settings",
			"skin.subtitle": "The same configuration Settings → Skin writes; both sides stay in sync.",
			"skin.enabled": "Enable Skin Center",
			"skin.enabled.hint": "Turning it off suspends try-on, apply and the background controls; turning it back on restores them.",
			"skin.theme": "Theme preview",
			"skin.theme.light": "Light",
			"skin.theme.dark": "Dark",
			"skin.verify": "Verify integrity",
			"skin.verifying": "Verifying…",
			"skin.verify.ok": "All {count} installed skins are intact",
			"skin.verify.issues": "{count} skins have integrity problems",
			"skin.verify.failed": "Verification failed: {reason}",
			"skin.loading": "Reading the skin configuration…",
			"skin.readonly": "This configuration is read-only, so changes are not saved.",
			"skin.unavailable.body": "No skin center configuration service is connected; wallpapers still apply normally.",
			"skin.backgroundOpacity": "Background scrim",
			"skin.backgroundOpacity.hint": "Dims the wallpaper behind the panels: the higher the value, the quieter the art.",
			"skin.backgroundBlurEmpty": "Empty chat blur",
			"skin.backgroundBlurEmpty.hint": "Gaussian blur of the background while the conversation is empty; 0 turns it off.",
			"skin.backgroundBlurContent": "Active chat blur",
			"skin.backgroundBlurContent.hint": "Gaussian blur of the background once the conversation has content; 0 turns it off.",
			"skin.inputCardBlur": "Composer blur",
			"skin.inputCardBlur.hint": "Blurs only the area behind the composer, never the whole wallpaper.",
			"aerials.title": "System aerials · not downloaded",
			"aerials.blurb": "macOS still has {pending} aerial films to download ({downloaded} of {total} are here).",
			"aerials.open": "Open Wallpaper settings",
			"aerials.opening": "Opening…",
			"aerials.opened": "Wallpaper settings is open: pick the one to download there, then refresh this page.",
			"aerials.failed": "Could not open System Settings: {reason}",
			"aerials.badge": "Not downloaded",
			"aerials.hint": "macOS owns the download; this page only hands you over — any entry opens System Settings.",
			"aerials.count": "{n}",
			"aerials.expand": "Show {name}",
			"aerials.collapse": "Hide {name}",
			"aerials.empty": "No pending aerials match.",
			"aerials.tileLabel": "Open Wallpaper settings to download {name}",
			"import.action": "Import picture",
			"import.label": "Choose a picture on this Mac as a wallpaper",
			"import.hint": "JPEG / PNG / HEIC / TIFF / GIF, up to 48 MB each; the original is copied into the DSH skin directory, so deleting the source changes nothing here.",
			"crop.title": "Crop and fit",
			"crop.step": "{n} of {total}",
			"crop.ratio": "Frame ratio",
			"crop.ratioScreen": "Screen",
			"crop.auto": "Fit automatically",
			"crop.zoom": "Zoom",
			"crop.hint": "Drag the picture inside the frame, scroll or use the slider to zoom. The closer the ratio is to your screen, the less a cover crop cuts away — what you see in the frame is the wallpaper.",
			"crop.apply": "Import this one",
			"crop.skip": "Skip",
			"crop.cancel": "Cancel",
			"crop.loading": "Reading the picture…",
			"crop.unreadable": "This pictureâs size could not be read, so it cannot be framed.",
			"import.busy": "Importing {name}…",
			"import.progress": "Importing {done}/{total}: {name}",
			"import.done": "Imported “{name}”; the original is now stored in the DSH library.",
			"import.many": "Imported {n} pictures.",
			"import.partial": "{done} imported, the rest failed.",
			"import.failed": "Import failed: {reason}",
			"import.unsupported": "That is not a picture format this takes: JPEG / PNG / HEIC / TIFF / GIF.",
			"import.tooLarge": "That picture is over 48 MB; shrink it first.",
			"import.none": "No picture was chosen.",
			"remove.action": "Remove",
			"remove.label": "Remove “{name}”",
			"remove.hint": "Deletes only this exported DSH skin; the macOS original stays put, and this can be undone.",
			"remove.busy": "Removing…",
			"remove.done": "Removed “{name}”.",
			"remove.failed": "Could not remove it: {reason}",
			"remove.inUse": "That wallpaper is in use — switch to another one first.",
			"remove.cancel": "Cancel",
			"remove.removed": "Removed",
			"remove.strip": "{n} removed",
			"remove.stripHint": "These were taken out of the library; the macOS original is still there, so Restore re-exports it.",
			"remove.stripEmpty": "Wallpapers you remove will be listed here, ready to restore.",
			"remove.restore": "Restore",
			"remove.restoring": "Restoring…",
			"remove.restored": "Restored “{name}”.",
			"remove.restoreFailed": "Could not restore it: {reason}",
			"remove.sourceGone": "Its source picture is no longer in the DSH inbox, so it cannot be re-exported.",
			"undo.remove": "Undo",
			"undo.restoring": "Undoing…",
			"about.title": "About this library",
			"about.counts": "{wallpapers} wallpapers · {clusters} families · {mediaMB} MB of masters",
			"about.close": "Close the note"
		};

		/**
		* Panel styles.
		*
		* Follows the shell's own tokens rather than restating colours, so this
		* panel inherits whatever skin is on stage — including, usefully, the
		* wallpaper skins it applies. Motion is transform/opacity only; every
		* transition that could be gestured is a spring approximation, and the
		* reduced-motion block at the end collapses all of it to cross-fades.
		*/
		const css = `
/* mds-tokens v1 — 三份样式表逐字共用；选择器必须是 body，不是 :root（见 §3.2） */
body{
  --mds-text-2xs:0.6875rem;--mds-text-xs:0.75rem;--mds-text-sm:0.8125rem;--mds-text-md:0.875rem;--mds-text-lg:1rem;--mds-text-xl:1.25rem;
  --mds-leading-2xs:1rem;--mds-leading-xs:1.0625rem;--mds-leading-sm:1.1875rem;--mds-leading-md:1.25rem;--mds-leading-lg:1.375rem;--mds-leading-xl:1.75rem;
  --mds-weight-regular:400;--mds-weight-medium:500;--mds-weight-semibold:600;
  --mds-tracking-tight:-0.01em;--mds-tracking-normal:0;--mds-tracking-wide:0.01em;
  --mds-space-1:0.125rem;--mds-space-2:0.25rem;--mds-space-3:0.5rem;--mds-space-4:0.75rem;--mds-space-5:1rem;--mds-space-6:1.375rem;--mds-space-7:1.75rem;--mds-space-8:2.5rem;
  --mds-radius-chip:6px;--mds-radius-row:10px;--mds-radius-card:14px;--mds-radius-modal:16px;--mds-radius-pill:999px;
  --mds-control-xs:20px;--mds-control-sm:24px;--mds-control-md:28px;--mds-control-lg:36px;
  --mds-surface-panel:var(--dsw-alias-bg-base);
  --mds-surface-tint:var(--dsw-alias-interactive-bg-hover);
  --mds-surface-solid:var(--dsw-alias-bg-module-platform);
  --mds-surface-hover:var(--dsw-alias-interactive-bg-hover);
  --mds-surface-pressed:var(--dsw-alias-interactive-bg-active);
  --mds-text-primary:var(--dsw-alias-label-primary);
  --mds-text-secondary:var(--dsw-alias-label-secondary);
  --mds-text-tertiary:var(--dsw-alias-label-tertiary);
  --mds-text-disabled:var(--dsw-alias-label-caption);
  --mds-line-hairline:var(--dsw-alias-border-l1);
  --mds-line-default:var(--dsw-alias-border-l2);
  --mds-line-strong:var(--dsw-alias-border-l3);
  --mds-accent:var(--dsw-alias-state-business-primary);
  --mds-danger:var(--dsw-alias-state-error-primary);
  --mds-danger-surface:var(--dsw-alias-interactive-bg-hover-danger);
  --mds-toast-surface:var(--dsw-alias-toast-bg);
  --mds-toast-text:var(--dsw-alias-toast-label);
  --mds-toast-danger-text:#ffb4b4;
  --mds-brand-ink:var(--dsw-alias-brand-primary);
  --mds-switch-thumb:var(--dsw-alias-switch-thumb);
  --mds-photo-scrim:linear-gradient(180deg,transparent 46%,rgba(8,10,14,.70) 100%);
  --mds-photo-text-shadow:0 1px 2px rgba(0,0,0,.7),0 1px 10px rgba(0,0,0,.5);
  --mds-dur-press:90ms;--mds-dur-hover:120ms;--mds-dur-base:200ms;--mds-dur-slow:340ms;
  --mds-ease-standard:cubic-bezier(.32,.72,0,1);
  --mds-ease-exit:cubic-bezier(.4,0,1,1);
  --mds-ease-spring:cubic-bezier(.34,1.56,.64,1);
  --mds-focus-width:var(--dsw-focus-ring-width,2px);
  --mds-focus-color:var(--dsw-alias-state-business-primary);
  --mds-blur-sm:4px;
  --mds-blur-md:14px;
  --mds-blur-lg:20px;--mds-edge-fade-opacity:0;
}
@media (prefers-reduced-motion:reduce){ body{--mds-dur-press:1ms;--mds-dur-hover:1ms;--mds-dur-base:120ms;--mds-dur-slow:1ms} }
@media (prefers-reduced-transparency:reduce){ body{--mds-surface-tint:var(--mds-surface-solid)} }
@media (prefers-contrast:more){ body{--mds-line-hairline:var(--mds-line-default);--mds-surface-tint:var(--mds-surface-solid)} }
/* mds-tokens end */

/* ---------- shell ---------- */
.dsl-appear-page{display:flex;flex-direction:column;height:100%;min-height:0;position:relative;font-family:var(--dsw-font-family,system-ui,-apple-system,"SF Pro Text","PingFang SC",sans-serif);color:var(--mds-text-primary);background:var(--mds-surface-panel)}
.dsl-appear-pageScroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;scroll-behavior:smooth;scrollbar-gutter:stable}
.dsl-appear-pageContent{max-width:1080px;margin:0 auto;padding:0 22px 56px;position:relative}
@media (max-width:640px){.dsl-appear-pageContent{padding:0 14px 44px}}
/* ---------- head ---------- */
.dsl-appear-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:26px 0 18px;border-bottom:1px solid var(--mds-line-hairline)}
.dsl-appear-head[data-platform="darwin"]{padding-top:calc(26px + var(--dsh-frame-top-clearance,0px))}
.dsl-appear-title{margin:0;font-size:var(--mds-text-xl);line-height:var(--mds-leading-xl);font-weight:var(--mds-weight-semibold);letter-spacing:var(--mds-tracking-tight)}
.dsl-appear-titles{display:flex;flex-direction:column;gap:var(--mds-space-1);min-width:0}
.dsl-appear-subtitle{margin:5px 0 0;font-size:var(--mds-text-sm);line-height:var(--mds-leading-md);color:var(--mds-text-tertiary)}
.dsl-appear-headActions{display:flex;align-items:center;gap:var(--mds-space-3)}
/* ---------- sticky toolbar ---------- */
.dsl-appear-toolbar{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 -22px 16px;padding:var(--mds-space-4) 22px 11px;background:transparent;box-shadow:0 0 0 0 transparent;transition:box-shadow var(--mds-dur-base) var(--mds-ease-standard),background-color var(--mds-dur-base) ease}
.dsl-appear-toolbar[data-stuck="1"]{border-bottom:1px solid var(--mds-line-hairline)}
.dsl-appear-toolbar[data-stuck="1"]::after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:8px;pointer-events:none;opacity:var(--mds-edge-fade-opacity);background:linear-gradient(to bottom,color-mix(in srgb,var(--mds-surface-panel) 20%,transparent),transparent)}
@media (max-width:640px){.dsl-appear-toolbar{margin:0 -14px 14px;padding:10px 14px 9px}}
.dsl-appear-search{position:relative;display:flex;align-items:center;gap:7px;flex:1 1 190px;min-width:150px;height:var(--mds-control-md);padding:0 9px;border-radius:var(--mds-radius-row);border:0;background:var(--mds-surface-tint);color:var(--mds-text-tertiary);transition:background-color var(--mds-dur-base) ease,box-shadow var(--mds-dur-base) ease}
.dsl-appear-search:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 76%,transparent)}
.dsl-appear-search[data-filled="1"]{color:var(--mds-text-secondary)}
.dsl-appear-search:focus-within{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 88%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 72%,transparent),0 0 0 4px color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}
.dsl-appear-searchInput{flex:1 1 auto;min-width:0;height:100%;border:0;background:transparent;outline:none;color:var(--mds-text-primary);font:inherit;font-size:var(--mds-text-sm);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-searchInput::-webkit-search-cancel-button{display:none}
.dsl-appear-searchInput::placeholder{color:var(--mds-text-tertiary)}
.dsl-appear-searchKey{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 4px;border-radius:var(--mds-radius-chip);background:var(--mds-surface-tint);color:var(--mds-text-tertiary);font-size:var(--mds-text-2xs);font-weight:var(--mds-weight-medium);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-search[data-filled="1"] .dsl-appear-searchKey{display:none}
.dsl-appear-clear{flex:none;display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;padding:0;border:0;border-radius:50%;background:var(--mds-surface-tint);color:var(--mds-text-secondary);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease}
.dsl-appear-clear:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--mds-line-strong));color:var(--mds-text-primary)}
.dsl-appear-clear:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-segments{display:flex;align-items:center;gap:3px;flex-wrap:wrap;min-width:0}
.dsl-appear-segment{display:inline-flex;align-items:center;gap:5px;height:var(--mds-control-md);padding:0 11px;border:1px solid transparent;border-radius:var(--mds-radius-pill);background:transparent;color:var(--mds-text-secondary);font:inherit;font-size:var(--mds-text-xs);font-weight:var(--mds-weight-medium);letter-spacing:var(--mds-tracking-wide);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease,border-color var(--mds-dur-hover) ease,transform var(--mds-dur-hover) var(--mds-ease-standard)}
.dsl-appear-segment:hover{background:var(--mds-surface-hover);color:var(--mds-text-primary)}
.dsl-appear-segment[aria-pressed="true"]{background:color-mix(in srgb,var(--mds-surface-tint) 62%,transparent);color:var(--mds-text-primary);font-weight:var(--mds-weight-semibold)}
.dsl-appear-segment:active{transform:scale(.97)}
.dsl-appear-segment:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-segmentCount{font-size:var(--mds-text-2xs);font-weight:var(--mds-weight-medium);color:var(--mds-text-tertiary);font-variant-numeric:tabular-nums;letter-spacing:var(--mds-tracking-wide)}
/* ---------- groups ---------- */
.dsl-appear-body{display:block}
.dsl-appear-group{margin-top:22px;scroll-margin-top:64px}
.dsl-appear-group:first-child{margin-top:4px}
.dsl-appear-groupHead{display:flex;align-items:baseline;gap:var(--mds-space-3);margin:0 2px 10px}
.dsl-appear-groupTitle{margin:0;font-size:var(--mds-text-md);line-height:var(--mds-leading-md);font-weight:var(--mds-weight-semibold);letter-spacing:var(--mds-tracking-tight)}
.dsl-appear-groupBlurb{margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md);color:var(--mds-text-tertiary)}
.dsl-appear-groupCount{margin-left:auto;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary);font-variant-numeric:tabular-nums}
.dsl-appear-groups{display:flex;flex-direction:column}
.dsl-appear-groupToggle{display:inline-flex;align-items:center;justify-content:center;width:22px;height:var(--mds-control-xs);padding:0;border:1px solid var(--mds-line-default);border-radius:var(--mds-radius-chip);background:transparent;color:var(--mds-text-tertiary);font:inherit;cursor:pointer;align-self:center;transition:background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease,transform var(--mds-dur-hover) var(--mds-ease-standard)}
.dsl-appear-groupToggle:hover{background:var(--mds-surface-hover);color:var(--mds-text-primary)}
.dsl-appear-groupToggle:active{transform:scale(.94)}
.dsl-appear-groupToggle:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-groupToggleChevron{display:block;width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:transform var(--mds-dur-base) var(--mds-ease-standard)}
.dsl-appear-groupToggle[aria-expanded="true"] .dsl-appear-groupToggleChevron{transform:rotate(-135deg)}
.dsl-appear-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:var(--mds-space-4);margin:0;padding:0;list-style:none}
/* Folded: the first row keeps its height and every row after it collapses to
   nothing, so a folded shelf costs one row and still shows pictures. */
.dsl-appear-grid[data-folded="1"]{grid-template-rows:auto;grid-auto-rows:0;row-gap:0;overflow:hidden}
.dsl-appear-grid[data-folded="1"]>li{overflow:hidden}
@media (max-width:640px){.dsl-appear-grid{grid-template-columns:repeat(auto-fill,minmax(142px,1fr));gap:9px}}
.dsl-appear-item{min-width:0}
/* ---------- tile (media card) ---------- */
.dsl-appear-tile{position:relative;display:block;width:100%;padding:0;border:1px solid transparent;border-radius:var(--mds-radius-card);overflow:hidden;background:var(--dsw-alias-bg-layer-2);background-clip:padding-box;color:inherit;font:inherit;text-align:left;cursor:pointer;contain:content;content-visibility:auto;contain-intrinsic-size:auto 150px;box-shadow:none;transition:transform var(--mds-dur-base) var(--mds-ease-standard),box-shadow var(--mds-dur-base) var(--mds-ease-standard)}
@media (hover:hover){.dsl-appear-tile:hover{transform:translateY(-3px)}}
.dsl-appear-tile[data-press="1"]{transform:translateY(-1px) scale(.984);transition:transform var(--mds-dur-hover) cubic-bezier(0.2,0,0,1)}
.dsl-appear-tile:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:2px}
.dsl-appear-tileMedia{position:relative;aspect-ratio:16/10;background:var(--dsw-alias-bg-skeleton,var(--mds-surface-tint));overflow:hidden;isolation:isolate}
.dsl-appear-tileMedia::after{content:"";position:absolute;left:0;right:0;bottom:0;height:58%;z-index:1;pointer-events:none;background:var(--mds-photo-scrim);opacity:0;transition:opacity var(--mds-dur-base) ease}
.dsl-appear-tileMedia[data-ready="1"]::after{opacity:1}
.dsl-appear-tilePortrait .dsl-appear-tileMedia{aspect-ratio:10/16}
.dsl-appear-tileImg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transform:scale(1.015);transition:opacity var(--mds-dur-slow) ease,transform var(--mds-dur-slow) var(--mds-ease-standard)}
.dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileImg{opacity:1;transform:scale(1)}
@media (hover:hover){.dsl-appear-tile:hover .dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileImg{transform:scale(1.035)}}
.dsl-appear-tileShim{position:absolute;inset:0;background:linear-gradient(100deg,var(--dsw-alias-bg-skeleton,var(--mds-surface-tint)) 30%,color-mix(in srgb,var(--mds-text-tertiary) 12%,var(--dsw-alias-bg-skeleton,var(--mds-surface-tint))) 50%,var(--dsw-alias-bg-skeleton,var(--mds-surface-tint)) 70%);background-size:220% 100%;animation:dsl-appear-shim 1.5s ease-in-out infinite}
@keyframes dsl-appear-shim{from{background-position:140% 0}to{background-position:-40% 0}}
.dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileShim{opacity:0;transition:opacity var(--mds-dur-base) ease var(--mds-dur-press)}
.dsl-appear-tileCaption{position:absolute;left:11px;right:11px;bottom:9px;z-index:2;display:flex;align-items:center;gap:6px;min-width:0;color:#fff;text-shadow:var(--mds-photo-text-shadow)}
.dsl-appear-tileCapIcon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:var(--mds-radius-chip);background:rgba(255,255,255,.2);backdrop-filter:var(--mds-blur-md) saturate(160%);-webkit-backdrop-filter:var(--mds-blur-md) saturate(160%)}
.dsl-appear-tileMeta{display:flex;align-items:center;justify-content:space-between;gap:var(--mds-space-3);padding:7px 10px 9px}
.dsl-appear-tileName{flex:1 1 auto;min-width:0;margin:0;font-size:var(--mds-text-sm);line-height:var(--mds-leading-xs);font-weight:var(--mds-weight-semibold);letter-spacing:var(--mds-tracking-wide);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-tileSub{margin:0;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-secondary);font-weight:var(--mds-weight-medium);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-tileActions{position:absolute;top:8px;right:8px;z-index:3;display:flex;align-items:center;gap:6px}
.dsl-appear-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:var(--mds-control-md);padding:0;border:0;border-radius:50%;background:rgba(16,18,24,.42);backdrop-filter:var(--mds-blur-md) saturate(160%);-webkit-backdrop-filter:var(--mds-blur-md) saturate(160%);color:rgba(255,255,255,.92);cursor:pointer;opacity:0;transform:scale(.9);transition:opacity var(--mds-dur-base) ease,transform var(--mds-dur-base) var(--mds-ease-standard),background-color var(--mds-dur-base) ease,color var(--mds-dur-base) ease}
@media (hover:none){.dsl-appear-iconBtn{opacity:1;transform:none}}
@media (hover:hover){.dsl-appear-tile:hover .dsl-appear-iconBtn{opacity:1;transform:none}}
.dsl-appear-tile:focus-within .dsl-appear-iconBtn{opacity:1;transform:none}
.dsl-appear-tile[data-press="1"] .dsl-appear-iconBtn{opacity:1;transform:none}
.dsl-appear-iconBtn:hover{background:rgba(196,54,54,.88)}
.dsl-appear-iconBtn:focus-visible{opacity:1;transform:none;outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:var(--mds-space-2);height:var(--mds-control-xs);padding:0 8px;border-radius:var(--mds-radius-pill);background:rgba(16,18,24,.44);backdrop-filter:var(--mds-blur-md) saturate(160%);-webkit-backdrop-filter:var(--mds-blur-md) saturate(160%);color:#fff;font-size:var(--mds-text-2xs);font-weight:var(--mds-weight-semibold);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-progress{position:absolute;left:0;right:0;bottom:0;z-index:4;height:2.5px;overflow:hidden;background:rgba(255,255,255,.24)}
.dsl-appear-progress::after{content:"";position:absolute;top:0;bottom:0;width:38%;border-radius:var(--mds-radius-pill);background:var(--dsw-alias-brand-primary);animation:dsl-appear-slide 1.15s cubic-bezier(0.4,0,0.2,1) infinite}
@keyframes dsl-appear-slide{from{left:-38%}to{left:100%}}
.dsl-appear-tileBusy{position:absolute;inset:0;z-index:3;background:rgba(10,12,16,.34);display:flex;align-items:center;justify-content:center}
.dsl-appear-tileBusyText{padding:var(--mds-space-2) 10px;border-radius:var(--mds-radius-pill);background:rgba(16,18,24,.5);color:#fff;font-size:var(--mds-text-2xs);font-weight:var(--mds-weight-medium);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-tileAsk{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:var(--mds-space-4);background:rgba(10,12,16,.58);backdrop-filter:var(--mds-blur-md) saturate(160%);-webkit-backdrop-filter:var(--mds-blur-md) saturate(160%);color:#fff}
.dsl-appear-askTitle{margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);font-weight:var(--mds-weight-medium);text-align:center}
.dsl-appear-askRow{display:flex;align-items:center;gap:7px}
.dsl-appear-askYes,.dsl-appear-askNo{height:var(--mds-control-md);padding:0 12px;border-radius:var(--mds-radius-chip);border:1px solid transparent;font:inherit;font-size:var(--mds-text-xs);font-weight:var(--mds-weight-medium);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,transform var(--mds-dur-hover) var(--mds-ease-standard)}
.dsl-appear-askYes{background:#c43636;color:#fff}
.dsl-appear-askYes:hover{background:#d13f3f}
.dsl-appear-askNo{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.24);color:#fff}
.dsl-appear-askNo:hover{background:rgba(255,255,255,.24)}
.dsl-appear-askYes:active,.dsl-appear-askNo:active{transform:scale(.96)}
.dsl-appear-askYes:focus-visible,.dsl-appear-askNo:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
/* ---------- list view ---------- */
.dsl-appear-rows{margin:0;padding:0;list-style:none;display:flex;flex-direction:column}
.dsl-appear-rows[data-folded="1"]>li:nth-child(n+2){display:none}
.dsl-appear-row{display:flex;align-items:center;gap:11px;width:100%;padding:7px 9px;border:0;border-radius:var(--mds-radius-row);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color var(--mds-dur-hover) ease}
@media (hover:hover){.dsl-appear-row:hover{background:var(--mds-surface-hover)}}
.dsl-appear-row[data-press="1"]{background:var(--mds-surface-pressed)}
.dsl-appear-row:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:-1px}
.dsl-appear-row[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-hover-accent)}
.dsl-appear-rowThumb{position:relative;flex:none;width:52px;height:34px;border-radius:var(--mds-radius-chip);overflow:hidden;background:var(--dsw-alias-bg-skeleton,var(--mds-surface-tint))}
.dsl-appear-rowThumb img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity var(--mds-dur-slow) ease}
.dsl-appear-rowThumb[data-ready="1"] img{opacity:1}
.dsl-appear-rowText{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}
.dsl-appear-rowName{margin:0;font-size:var(--mds-text-sm);line-height:var(--mds-leading-xs);font-weight:var(--mds-weight-medium);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-rowSub{margin:0;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-rowMeta{flex:none;display:flex;align-items:center;gap:7px;color:var(--mds-text-tertiary);font-size:var(--mds-text-2xs);font-variant-numeric:tabular-nums;letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-rowGo{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:var(--mds-control-xs);padding:0;border:0;border-radius:50%;background:transparent;color:var(--mds-text-tertiary);cursor:pointer;opacity:0;transition:opacity var(--mds-dur-hover) ease,background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease}
@media (hover:none){.dsl-appear-rowGo{opacity:1}}
@media (hover:hover){.dsl-appear-row:hover .dsl-appear-rowGo{opacity:1}}
.dsl-appear-row:focus-within .dsl-appear-rowGo{opacity:1}
.dsl-appear-rowGo:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--mds-line-strong));color:var(--mds-text-primary)}
.dsl-appear-rowGo:focus-visible{opacity:1;outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
/* ---------- detail drawer ---------- */
.dsl-appear-scrim{position:absolute;inset:0;z-index:20;background:var(--dsw-alias-bg-mask-2,rgba(0,0,0,.32));opacity:0;pointer-events:none;transition:opacity var(--mds-dur-base) ease}
.dsl-appear-scrim[data-open="1"]{opacity:1;pointer-events:auto}
.dsl-appear-drawer{position:absolute;top:0;right:0;bottom:0;z-index:21;display:flex;flex-direction:column;width:min(400px,100%);background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--mds-line-default);box-shadow:var(--dsw-elevation-prominent);transform:translateX(100%);visibility:hidden;pointer-events:none;transition:transform var(--mds-dur-slow) var(--mds-ease-standard),visibility 0s linear var(--mds-dur-slow)}
.dsl-appear-drawer[data-open="1"]{transform:translateX(0);visibility:visible;pointer-events:auto;transition-delay:0s}
.dsl-appear-drawerHead{flex:none;display:flex;align-items:flex-start;gap:10px;padding:var(--mds-space-5) 16px 13px;border-bottom:1px solid var(--mds-line-hairline)}
.dsl-appear-drawerTitleWrap{flex:1 1 auto;min-width:0}
.dsl-appear-drawerTitle{margin:0;font-size:var(--mds-text-lg);line-height:var(--mds-leading-md);font-weight:var(--mds-weight-semibold);letter-spacing:var(--mds-tracking-tight)}
.dsl-appear-drawerSub{margin:3px 0 0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary)}
.dsl-appear-drawerBody{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 16px 20px}
.dsl-appear-drawerPreview{position:relative;border-radius:var(--mds-radius-row);overflow:hidden;background:var(--dsw-alias-bg-skeleton,var(--mds-surface-tint))}
.dsl-appear-drawerPreview[data-portrait="1"]{aspect-ratio:10/16;max-height:46vh;margin:0 auto}
.dsl-appear-drawerPreview:not([data-portrait="1"]){aspect-ratio:16/10}
.dsl-appear-drawerPreview img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity var(--mds-dur-slow) ease}
.dsl-appear-drawerPreview[data-ready="1"] img{opacity:1}
.dsl-appear-drawerActions{display:flex;align-items:center;gap:var(--mds-space-3);margin-top:13px}
.dsl-appear-drawerFacts{display:flex;flex-direction:column;gap:0;margin:15px 0 0;padding:0;border-top:1px solid var(--mds-line-hairline)}
.dsl-appear-fact{display:flex;align-items:center;gap:var(--mds-space-4);padding:9px 0;border-bottom:1px solid var(--mds-line-hairline)}
.dsl-appear-factKey{flex:none;width:76px;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary)}
.dsl-appear-factVal{flex:1 1 auto;min-width:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-xs);font-weight:var(--mds-weight-medium);word-break:break-word}
.dsl-appear-factVal[data-mono="1"]{font-family:var(--dsw-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:var(--mds-text-2xs);font-weight:var(--mds-weight-regular);color:var(--mds-text-secondary);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-drawerFoot{flex:none;display:flex;align-items:center;gap:var(--mds-space-3);padding:11px 16px;border-top:1px solid var(--mds-line-hairline);background:var(--dsw-alias-bg-layer-2)}
.dsl-appear-drawerHint{margin:0;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary);letter-spacing:var(--mds-tracking-wide)}
@media (max-width:520px){.dsl-appear-drawer{width:100%;border-left:0}}
/* ---------- seam switch ---------- */
.dsl-appear-seam{display:inline-flex;align-items:center;gap:var(--mds-space-3);padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
.dsl-appear-seam:disabled{cursor:default;opacity:.6}
.dsl-appear-seamTrack{position:relative;flex:none;width:36px;height:var(--mds-control-xs);border-radius:var(--mds-radius-pill);background:var(--mds-line-strong);transition:background-color var(--mds-dur-base) var(--mds-ease-standard)}
.dsl-appear-seam[aria-checked="true"] .dsl-appear-seamTrack{background:var(--dsw-alias-brand-primary)}
.dsl-appear-seamKnob{position:absolute;top:1px;left:1px;width:17px;height:17px;border-radius:50%;background:var(--mds-switch-thumb,#fff);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform var(--mds-dur-base) var(--mds-ease-standard)}
.dsl-appear-seam[aria-checked="true"] .dsl-appear-seamKnob{transform:translateX(15px)}
.dsl-appear-seam:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:2px;border-radius:var(--mds-radius-pill)}
.dsl-appear-seamText{font-size:var(--mds-text-xs);line-height:var(--mds-leading-xs);color:var(--mds-text-secondary)}
/* ---------- drawer ghost button ---------- */
.dsl-appear-removedRestore{height:var(--mds-control-xs);padding:0 9px;border:0;border-radius:var(--mds-radius-pill);background:var(--mds-surface-hover);color:var(--mds-text-primary);font:inherit;font-size:var(--mds-text-xs);font-weight:var(--mds-weight-medium);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,transform var(--mds-dur-hover) var(--mds-ease-standard)}
.dsl-appear-removedRestore:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--mds-line-strong))}
.dsl-appear-removedRestore:active{transform:scale(.96)}
.dsl-appear-removedRestore:disabled{opacity:.5;cursor:default;transform:none}
.dsl-appear-removedRestore:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
/* ---------- note / hint ---------- */
.dsl-appear-note{position:relative;margin:0 0 18px;padding:13px 40px 13px 14px;border:1px solid var(--mds-line-default);border-radius:var(--mds-radius-row);background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2));font-size:var(--mds-text-sm);line-height:var(--mds-leading-sm);color:var(--mds-text-secondary)}
.dsl-appear-noteTitle{margin:0 0 5px;font-size:var(--mds-text-sm);line-height:var(--mds-leading-md);font-weight:var(--mds-weight-semibold);color:var(--mds-text-primary)}
.dsl-appear-noteList{margin:0;padding-left:17px;display:flex;flex-direction:column;gap:3px}
.dsl-appear-noteClose{position:absolute;top:9px;right:9px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:var(--mds-control-xs);padding:0;border:0;border-radius:50%;background:transparent;color:var(--mds-text-tertiary);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease}
.dsl-appear-noteClose:hover{background:var(--mds-surface-hover);color:var(--mds-text-primary)}
.dsl-appear-noteClose:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-hint{margin:26px 2px 0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-xs);color:var(--mds-text-tertiary)}
/* ---------- toast + undo ---------- */
.dsl-appear-toastWrap{position:sticky;bottom:14px;z-index:12;display:flex;justify-content:center;pointer-events:none;margin-top:18px}
.dsl-appear-toast{display:inline-flex;align-items:center;gap:10px;max-width:min(560px,100%);padding:9px 10px 9px 15px;border-radius:var(--mds-radius-pill);background:var(--mds-toast-surface,rgba(24,26,32,.94));color:var(--mds-toast-text,#fff);box-shadow:var(--dsw-elevation-prominent);font-size:var(--mds-text-sm);line-height:var(--mds-leading-md);pointer-events:auto;animation:dsl-appear-toastIn var(--mds-dur-base) var(--mds-ease-standard)}
@keyframes dsl-appear-toastIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
@keyframes dsl-appear-toastOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(6px)}}
@keyframes dsl-appear-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes dsl-appear-fadeOut{from{opacity:1}to{opacity:0}}
.dsl-appear-toast.is-out{animation:dsl-appear-toastOut var(--mds-dur-base) var(--mds-ease-exit) forwards}
.dsl-appear-cropScrim.is-out,.dsl-appear-cropScrim.is-out .dsl-appear-crop{animation:dsl-appear-fadeOut var(--mds-dur-base) var(--mds-ease-exit) forwards}
.dsl-appear-toastError{color:#ffb4b4}
.dsl-appear-toastAction{flex:none;height:var(--mds-control-sm);padding:0 11px;border:1px solid rgba(255,255,255,.22);border-radius:var(--mds-radius-pill);background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:var(--mds-text-xs);font-weight:var(--mds-weight-medium);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,transform var(--mds-dur-hover) var(--mds-ease-standard)}
.dsl-appear-toastAction:hover{background:rgba(255,255,255,.22)}
.dsl-appear-toastAction:active{transform:scale(.96)}
.dsl-appear-toastAction:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
/* ---------- state block ---------- */
.dsl-appear-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:52px 20px;text-align:center}
.dsl-appear-stateTitle{margin:0;font-size:var(--mds-text-md);line-height:var(--mds-leading-sm);font-weight:var(--mds-weight-semibold)}
.dsl-appear-stateBody{margin:0;max-width:420px;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md);color:var(--mds-text-tertiary)}
.dsl-appear-stateCmd{margin:5px 0 0;padding:5px 9px;border-radius:var(--mds-radius-chip);background:var(--dsw-alias-bg-layer-2);color:var(--mds-text-secondary);font-family:var(--dsw-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:var(--mds-text-2xs);line-height:var(--mds-leading-2xs);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-stateAction{margin-top:9px}
.dsl-appear-skeleton{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:var(--mds-space-4)}
.dsl-appear-skelCard{aspect-ratio:16/10;border-radius:var(--mds-radius-card);background:var(--dsw-alias-bg-skeleton,var(--mds-surface-tint));animation:dsl-appear-pulse 1.5s ease-in-out infinite}
@keyframes dsl-appear-pulse{0%,100%{opacity:1}50%{opacity:.55}}
/* ---------- skin settings ---------- */
.dsl-appear-skin{margin:18px 0 0;border:1px solid var(--mds-line-hairline);border-radius:var(--mds-radius-card);background:var(--mds-surface-tint);overflow:hidden}
.dsl-appear-skinHead{display:flex;align-items:center;gap:9px;width:100%;padding:11px 14px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color var(--mds-dur-hover) ease}
.dsl-appear-skinHead:hover{background:var(--mds-surface-hover)}
.dsl-appear-skinHead:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:-2px}
.dsl-appear-skinChevron{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--mds-text-tertiary);transition:transform var(--mds-dur-base) var(--mds-ease-standard)}
.dsl-appear-skin[data-open="1"] .dsl-appear-skinChevron{transform:rotate(90deg)}
.dsl-appear-skinTitle{font-size:var(--mds-text-sm);line-height:var(--mds-leading-md);font-weight:var(--mds-weight-semibold)}
.dsl-appear-skinSummary{margin-left:auto;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-secondary);font-weight:var(--mds-weight-medium);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-skinBody{padding:var(--mds-space-1) 14px 14px;display:flex;flex-direction:column;gap:11px;border-top:1px solid var(--mds-line-hairline)}
.dsl-appear-skinToggle{display:flex;align-items:center;gap:10px;padding-top:11px}
.dsl-appear-skinTools{display:flex;flex-wrap:wrap;gap:7px}
.dsl-appear-skinTool{height:var(--mds-control-md);padding:0 11px;border:1px solid var(--mds-line-default);border-radius:var(--mds-radius-chip);background:transparent;color:var(--mds-text-secondary);font:inherit;font-size:var(--mds-text-xs);font-weight:var(--mds-weight-medium);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease,transform var(--mds-dur-hover) var(--mds-ease-standard)}
.dsl-appear-skinTool:hover{background:var(--mds-surface-hover);color:var(--mds-text-primary)}
.dsl-appear-skinTool:active{transform:scale(.97)}
.dsl-appear-skinTool:disabled{opacity:.5;cursor:default;transform:none}
.dsl-appear-skinTool:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-skinLabel{display:flex;flex-direction:column;gap:5px}
.dsl-appear-skinFieldHead,.dsl-appear-skinLabelHead{display:flex;align-items:baseline;gap:var(--mds-space-3)}
.dsl-appear-skinLabelText{font-size:var(--mds-text-xs);line-height:var(--mds-leading-xs);color:var(--mds-text-secondary)}
.dsl-appear-skinValue{margin-left:auto;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary);font-variant-numeric:tabular-nums}
.dsl-appear-skinField{width:100%}
.dsl-appear-skinHint{margin:0;font-size:var(--mds-text-2xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-secondary);font-weight:var(--mds-weight-medium);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-skinRange{width:100%;accent-color:var(--dsw-alias-brand-primary)}
.dsl-appear-skinSegments{display:inline-flex;gap:var(--mds-space-1);padding:var(--mds-space-1);border-radius:var(--mds-radius-row);background:color-mix(in srgb,var(--mds-surface-tint) 55%,transparent)}
.dsl-appear-skinSegment{height:var(--mds-control-sm);padding:0 11px;border:0;border-radius:var(--mds-radius-chip);background:transparent;color:var(--mds-text-secondary);font:inherit;font-size:var(--mds-text-xs);font-weight:var(--mds-weight-medium);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease}
.dsl-appear-skinSegment[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 62%,transparent);color:var(--mds-text-primary);font-weight:var(--mds-weight-semibold)}
.dsl-appear-skinSegment:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-skinSwitch{position:relative;flex:none;width:38px;height:var(--mds-control-xs);padding:0;border:0;border-radius:var(--mds-radius-pill);background:var(--mds-line-strong);cursor:pointer;transition:background-color var(--mds-dur-base) var(--mds-ease-standard)}
.dsl-appear-skinSwitch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}
.dsl-appear-skinSwitchKnob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--mds-switch-thumb,#fff);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform var(--mds-dur-base) var(--mds-ease-standard)}
.dsl-appear-skinSwitch[aria-checked="true"] .dsl-appear-skinSwitchKnob{transform:translateX(16px)}
.dsl-appear-skinSwitch:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:2px}
/* ---------- aerials ---------- */
.dsl-appear-aerials{margin-top:30px;padding-top:16px;border-top:1px solid var(--mds-line-hairline)}
.dsl-appear-aerialsHead{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:11px}
.dsl-appear-aerialsTitles{display:flex;flex-direction:column;gap:var(--mds-space-1);min-width:0}
.dsl-appear-aerialsTitle{margin:0;font-size:var(--mds-text-sm);line-height:var(--mds-leading-md);font-weight:var(--mds-weight-semibold)}
.dsl-appear-aerialsBlurb{margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-secondary);font-weight:var(--mds-weight-medium);letter-spacing:var(--mds-tracking-wide)}
.dsl-appear-aerialsOpen{margin-left:auto;height:var(--mds-control-md);padding:0 11px;border:1px solid var(--mds-line-default);border-radius:var(--mds-radius-chip);background:transparent;color:var(--mds-text-secondary);font:inherit;font-size:var(--mds-text-xs);font-weight:var(--mds-weight-medium);cursor:pointer;transition:background-color var(--mds-dur-hover) ease,color var(--mds-dur-hover) ease,transform var(--mds-dur-hover) var(--mds-ease-standard)}
.dsl-appear-aerialsOpen:hover{background:var(--mds-surface-hover);color:var(--mds-text-primary)}
.dsl-appear-aerialsOpen:active{transform:scale(.97)}
.dsl-appear-aerialsOpen:disabled{opacity:.5;cursor:default;transform:none}
.dsl-appear-aerialsOpen:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-aerialsGrid{display:flex;flex-wrap:wrap;gap:var(--mds-space-3);margin:0;padding:0;list-style:none}
.dsl-appear-aerialsGrid[data-folded="1"]{flex-wrap:nowrap;overflow:hidden}
.dsl-appear-aerial{position:relative;display:block;width:148px;padding:0;border:1px solid transparent;border-radius:var(--mds-radius-row);background:var(--dsw-alias-bg-layer-2);background-clip:padding-box;color:var(--mds-text-primary);font:inherit;text-align:left;cursor:pointer;overflow:hidden;transition:background-color var(--mds-dur-hover) ease,border-color var(--mds-dur-hover) ease,transform var(--mds-dur-base) var(--mds-ease-standard),box-shadow var(--mds-dur-base) ease}
.dsl-appear-aerial:hover{background:var(--mds-surface-hover);transform:translateY(-1px)}
.dsl-appear-aerial:active{transform:scale(.98)}
.dsl-appear-aerial:disabled{opacity:.55;cursor:default;transform:none}
.dsl-appear-aerial:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:2px}
.dsl-appear-aerialDot{position:absolute;top:7px;left:7px;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);box-shadow:0 0 0 2px rgba(0,0,0,.32)}
.dsl-appear-aerialMedia{position:relative;display:block;width:100%;aspect-ratio:214/130;background:var(--mds-surface-tint)}
.dsl-appear-aerialImg{display:block;width:100%;height:100%;object-fit:cover}
.dsl-appear-aerialText{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:1px;padding:0 11px 9px;pointer-events:none}
.dsl-appear-aerialName{font-size:var(--mds-text-sm);line-height:var(--mds-leading-xs);font-weight:var(--mds-weight-semibold);letter-spacing:var(--mds-tracking-wide);color:#fff;text-shadow:var(--mds-photo-text-shadow);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* the shelf control lines up with the button beside it, not with the title block */
.dsl-appear-aerialsHead .dsl-appear-groupToggle{align-self:flex-end}
.dsl-appear-aerialsHint{margin:9px 0 0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary)}
.dsl-appear-aerialsEmpty{margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md);color:var(--mds-text-tertiary)}
/* ---------- the crop panel: framing a picture before it becomes a skin ---------- */
.dsl-appear-cropScrim{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--dsw-alias-bg-mask-2,rgba(0,0,0,.32));backdrop-filter:var(--mds-blur-sm) saturate(120%);animation:dsl-appear-fadeIn var(--mds-dur-base) ease}
@keyframes dsl-appear-fadeIn{from{opacity:0}to{opacity:1}}
.dsl-appear-crop{display:flex;flex-direction:column;gap:14px;width:min(524px,100%);max-height:100%;overflow:auto;padding:18px 20px 16px;border-radius:var(--mds-radius-modal);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 90%,transparent);-webkit-backdrop-filter:var(--mds-blur-lg) saturate(170%);backdrop-filter:var(--mds-blur-lg) saturate(170%);box-shadow:var(--dsw-elevation-panel,0 18px 48px rgba(0,0,0,.36))}
.dsl-appear-cropHead{display:flex;align-items:baseline;gap:10px;min-width:0}
.dsl-appear-cropTitle{margin:0;font-size:var(--mds-text-md);line-height:var(--mds-leading-md);font-weight:var(--mds-weight-semibold)}
.dsl-appear-cropStep{font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary);white-space:nowrap}
.dsl-appear-cropName{margin-left:auto;max-width:190px;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-cropStage{position:relative;border-radius:var(--mds-radius-row);overflow:hidden;background:var(--mds-surface-tint)}
.dsl-appear-cropFrame{position:relative;width:100%;overflow:hidden;cursor:grab;touch-action:none;box-shadow:0 0 0 9999px rgba(0,0,0,.44)}
.dsl-appear-cropFrame:active{cursor:grabbing}
.dsl-appear-cropImg{position:absolute;display:block;max-width:none;user-select:none;-webkit-user-drag:none}
.dsl-appear-cropNote{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 18px;text-align:center;font-size:var(--mds-text-xs);line-height:var(--mds-leading-md);color:var(--mds-text-tertiary)}
.dsl-appear-cropNote[data-tone="error"]{color:var(--dsw-alias-state-error-primary,#ff5d5d)}
.dsl-appear-cropRow{display:flex;align-items:center;gap:10px;min-width:0}
.dsl-appear-cropLabel{flex:none;min-width:52px;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-secondary)}
.dsl-appear-cropRatios{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.dsl-appear-cropRatio{flex:none;height:var(--mds-control-sm);padding:0 10px;border-radius:var(--mds-radius-pill);border:1px solid var(--mds-line-default);background:transparent;color:var(--mds-text-secondary);font:inherit;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);cursor:pointer}
.dsl-appear-cropRatio:focus-visible{outline:var(--mds-focus-width) solid var(--mds-focus-color);outline-offset:1px}
.dsl-appear-cropRatio:hover{border-color:var(--mds-line-strong);color:var(--mds-text-primary)}
.dsl-appear-cropRatio[aria-pressed="true"]{border-color:transparent;background:var(--dsw-alias-button-elevated-fill);color:var(--mds-text-primary)}
.dsl-appear-cropSlider{flex:1;min-width:0;accent-color:var(--dsw-alias-brand-primary,#4d6bfe)}
.dsl-appear-cropHint{margin:0;font-size:var(--mds-text-xs);line-height:var(--mds-leading-2xs);color:var(--mds-text-tertiary)}
.dsl-appear-cropFoot{display:flex;align-items:center;gap:var(--mds-space-3)}
/* the three buttons are shell Buttons: these classes only place them */
.dsl-appear-cropFoot .dsl-appear-cropGhost{flex:none}
.dsl-appear-cropRow .dsl-appear-cropGhost{flex:none}
.dsl-appear-cropFoot .dsl-appear-cropPrimary{margin-left:auto;flex:none}
/* ---------- reduced motion / transparency ---------- */
@media (prefers-reduced-motion:reduce){
  .dsl-appear-pageScroll{scroll-behavior:auto}
  .dsl-appear-tile,.dsl-appear-tile:hover,.dsl-appear-tile[data-press="1"]{transform:none;transition:opacity var(--mds-dur-base) ease}
.dsl-appear-aerial,.dsl-appear-aerial:hover{transform:none;box-shadow:none}
  .dsl-appear-groupToggle,.dsl-appear-groupToggle:active{transform:none}
  .dsl-appear-groupToggleChevron{transition:none}
  .dsl-appear-tileImg{transform:none;transition:opacity var(--mds-dur-base) ease}
  .dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileImg{transform:none}
  .dsl-appear-tileShim{animation:none}
  .dsl-appear-skelCard{animation:none}
  .dsl-appear-toast{animation:dsl-appear-fadeIn var(--mds-dur-base) ease}
  .dsl-appear-toast.is-out{animation:dsl-appear-fadeOut var(--mds-dur-base) ease forwards;transform:none}
  .dsl-appear-drawer{transition:opacity var(--mds-dur-base) ease;transform:none;opacity:0;visibility:hidden;pointer-events:none}
  .dsl-appear-drawer[data-open="1"]{opacity:1;visibility:visible;pointer-events:auto}
  .dsl-appear-progress::after{animation:none;left:0;width:100%}
  .dsl-appear-seamTrack,.dsl-appear-seamKnob,.dsl-appear-skinSwitch,.dsl-appear-skinSwitchKnob,.dsl-appear-skinChevron{transition:none}
}
@media (prefers-reduced-transparency:reduce){
  .dsl-appear-toolbar{background:var(--dsw-alias-bg-base);backdrop-filter:none;-webkit-backdrop-filter:none}
  .dsl-appear-badge,.dsl-appear-iconBtn,.dsl-appear-tileCapIcon,.dsl-appear-tileAsk{background:rgb(16,18,24);backdrop-filter:none;-webkit-backdrop-filter:none}
  .dsl-appear-search,.dsl-appear-skin{background:var(--mds-surface-solid)}
  .dsl-appear-segment[aria-pressed="true"],.dsl-appear-skinSegment[aria-pressed="true"]{background:var(--mds-surface-solid)}
  .dsl-appear-cropScrim,.dsl-appear-crop{backdrop-filter:none;-webkit-backdrop-filter:none}
  .dsl-appear-toast{background:var(--mds-surface-tint);color:var(--mds-text-primary)}
}
@media (prefers-contrast:more){
  .dsl-appear-tile{border-color:var(--mds-line-strong)}
}
`;
		//#endregion
		/** The one token block, cut out of `css` so the two copies can never drift apart. */
		const TOKENS_CSS = css.slice(0, css.indexOf(TOKENS_END) + TOKENS_END.length);

		/** Inject the shared token layer once per document, ahead of the panel sheet. */
		function installTokens(doc) {
			if (doc.querySelector(`style[data-plugin-css="${TOKENS_TAG_ID}"]`) !== null) return;
			const tag = doc.createElement("style");
			tag.dataset.pluginCss = TOKENS_TAG_ID;
			tag.textContent = TOKENS_CSS;
			doc.head.appendChild(tag);
		}
		/** Inject the stylesheet once per document, replacing any previous copy. */
		function ensureStyles(doc) {
			const target = doc ?? (typeof document === "undefined" ? undefined : document);
			if (target === undefined) return;
			installTokens(target);
			const existing = target.getElementById(CSS_TAG_ID);
			if (existing !== null && existing !== undefined) existing.remove();
			const style = target.createElement("style");
			style.id = CSS_TAG_ID;
			style.textContent = css;
			target.head.appendChild(style);
		}

		//#region seat cut
		/** Marks a transcript row the seat cut is clipping right now. */
		const SEAT_CUT_ATTR = "data-dsh-seat-cut";
		/** One stylesheet per document carries the cut rule. */
		const SEAT_CUT_STYLE_ID = "dsh-appearance-seat-cut";
		/**
		* Transcript rows as the shell anchors them: every chat flow item plus the
		* turn tail. The skin center stamps data-dsh-part="message-row" on the same
		* elements, so the cut still lands when that plugin is off.
		*/
		const SEAT_CUT_ROW_SELECTOR = '[data-chat-flow-kind], [data-turn-tail], [data-dsh-part="message-row"]';
		/** The scrollport the shell scrolls the transcript in. */
		const SEAT_CUT_SCROLLPORT_SELECTOR = "[data-conversation-scroll]";
		/** The seat the composer sits in; its top edge is the cut line. */
		const SEAT_CUT_SEAT_SELECTOR = "[data-composer-seat]";
		/**
		* The cut itself: inset() clips exactly the pixels of a row that have scrolled
		* past the seat, so the transcript disappears the moment it reaches the
		* composer instead of sliding under it. Layout is untouched, so nothing below
		* a clipped row moves and the scroller never jumps.
		*/
		const SEAT_CUT_CSS = "[" + SEAT_CUT_ATTR + "]{clip-path:inset(0 0 var(--dsh-seat-cut,0px) 0);-webkit-clip-path:inset(0 0 var(--dsh-seat-cut,0px) 0)}";

		/* The seat-geometry beacons, the Element.prototype scroll tracer and the
		   snapshot/paint reporters were removed in the 2026-10-11 fix pass: they ran
		   in production, pinned the reader to the end of the transcript, and the
		   tracer rewrote Element.prototype methods for the life of the window. The
		   on-demand probe (takeProbe + POST /probe) is what remains. */

		/** Inject the cut rule once per document, replacing any previous copy. */
		function ensureSeatCutStyles(doc) {
			const target = doc ?? (typeof document === "undefined" ? undefined : document);
			if (target === undefined) return;
			const existing = target.getElementById(SEAT_CUT_STYLE_ID);
			if (existing !== null && existing !== undefined) existing.remove();
			const style = target.createElement("style");
			style.id = SEAT_CUT_STYLE_ID;
			style.textContent = SEAT_CUT_CSS;
			target.head.appendChild(style);
		}

		/**
		* Clip every transcript row that has scrolled past the composer seat. Rows are
		* measured before anything is written, and the walk stops at the first row
		* below the visible band, so the cost follows the viewport rather than the
		* length of the conversation.
		* @param doc - document to sync.
		* @returns the number of clipped rows and the pixels they lost, for the probe.
		*/
		function syncSeatCut(doc) {
			const target = doc ?? (typeof document === "undefined" ? undefined : document);
			if (target === undefined) return { count: 0, total: 0 };
			const marked = Array.from(target.querySelectorAll("[" + SEAT_CUT_ATTR + "]"));
			const keep = new Set();
			let count = 0;
			let total = 0;
			for (const scrollport of target.querySelectorAll(SEAT_CUT_SCROLLPORT_SELECTOR)) {
				const seat = scrollport.querySelector(SEAT_CUT_SEAT_SELECTOR);
				if (seat === null) continue;
				const seatTop = seat.getBoundingClientRect().top;
				const viewBottom = scrollport.getBoundingClientRect().bottom;
				const pending = [];
				for (const row of scrollport.querySelectorAll(SEAT_CUT_ROW_SELECTOR)) {
					const rect = row.getBoundingClientRect();
					if (rect.height <= 0) continue;
					if (rect.top >= viewBottom) break;
					const over = rect.bottom - seatTop;
					if (over <= 0) continue;
					pending.push([row, Math.round(Math.min(over, rect.height))]);
				}
				for (const [row, cut] of pending) {
					keep.add(row);
					count += 1;
					total += cut;
					const value = cut + "px";
					if (row.style.getPropertyValue("--dsh-seat-cut") !== value) row.style.setProperty("--dsh-seat-cut", value);
					if (!row.hasAttribute(SEAT_CUT_ATTR)) row.setAttribute(SEAT_CUT_ATTR, "");
				}
			}
			for (const row of marked) {
				if (keep.has(row)) continue;
				row.removeAttribute(SEAT_CUT_ATTR);
				row.style.removeProperty("--dsh-seat-cut");
			}
			return { count, total };
		}

		/**
		* Keep the transcript cut in step with the scroller: scrolls, window resizes and
		* DOM mutations (streaming text, new turns) all coalesce into one pass per
		* frame. The observer watches child changes only, so the attributes this pass
		* writes can never feed it back.
		* @param options - optional win / doc seams for tests.
		* @returns a disposer that removes every listener, observer and mark.
		*/
		function startSeatCut(options = {}) {
			const win = options.win ?? (typeof window === "undefined" ? undefined : window);
			const doc = options.doc ?? (win === undefined ? undefined : win.document);
			if (win === undefined || doc === undefined || doc === null) return () => {};
			ensureSeatCutStyles(doc);
			ensureSeatScopeStyles(doc);
			let frame = 0;
			let settleFrames = 0;
			const run = () => {
				frame = 0;
				let scope = null;
				try {
					scope = syncSeatScope(doc, win);
					if (scope.mode === "scope") clearSeatCut(doc);
					else syncSeatCut(doc);
				} catch {
					/* Geometry problems must never break the shell this runs in. */
				}
				/* A corrected position needs a few frames to converge; the bound keeps a
				   geometry that cannot converge from looping forever. */
				if (scope !== null && scope.settle > 0 && settleFrames < 10) {
					settleFrames += 1;
					schedule();
				} else if (scope !== null && scope.settle === 0) {
					settleFrames = 0;
				}
			};
			const schedule = () => {
				if (frame !== 0) return;
				frame = win.requestAnimationFrame(run);
			};
			doc.addEventListener("scroll", schedule, {
				capture: true,
				passive: true
			});
			win.addEventListener("resize", schedule);
			const observer = new win.MutationObserver(schedule);
			observer.observe(doc.documentElement, {
				childList: true,
				subtree: true,
				/* characterData is deliberately absent: a keystroke changes no geometry this
				pass needs, and waking it on every key is what moved the reader. */
			});
			schedule();
			return () => {
				if (frame !== 0) {
					win.cancelAnimationFrame(frame);
					frame = 0;
				}
				doc.removeEventListener("scroll", schedule, {
					capture: true
				});
				win.removeEventListener("resize", schedule);
				observer.disconnect();
				clearSeatCut(doc);
				for (const port of Array.from(doc.querySelectorAll("[" + SEAT_SCOPE_SCROLLPORT_ATTR + "]"))) {
					port.removeAttribute(SEAT_SCOPE_SCROLLPORT_ATTR);
					port.style.removeProperty("--dsh-seat-scope-h");
				}
				for (const seat of Array.from(doc.querySelectorAll("[" + SEAT_SCOPE_SEAT_ATTR + "]"))) {
					seat.removeAttribute(SEAT_SCOPE_SEAT_ATTR);
					seat.style.removeProperty("--dsh-seat-left");
					seat.style.removeProperty("--dsh-seat-width");
					seat.style.removeProperty("--dsh-seat-bottom");
				}
			};
		}
		/* ---- seat scope: end the scroller above the seat ---- */

		/** Marks a scroller whose viewport was shortened to stop at the seat top. */
		const SEAT_SCOPE_SCROLLPORT_ATTR = "data-dsh-seat-scope";

		/** Marks the seat lifted out of that scroller with position: fixed. */
		const SEAT_SCOPE_SEAT_ATTR = "data-dsh-seat-fixed";

		const SEAT_SCOPE_STYLE_ID = "dsh-appearance-seat-scope";

		/** The official shell's stable handle on the input card that lives inside the seat. */
		const SEAT_SCOPE_CARD_SELECTOR = "[data-composer-card]";

		/**
		* How far the input card sits above the bottom of the viewport. Measured while the
		* seat still lies in the scroller and remembered on the seat: lifting it out of the
		* scroller changes the seat box itself, so the number cannot be re-measured later.
		* The measurement subtracts whatever composer-clearance padding the scroller still
		* carries, because a rebuilt scroller is padded until this pass marks it.
		*/
		const SEAT_SCOPE_GAP_ATTR = "data-dsh-seat-gap2";

		/** How far above the input card the transcript must stop; the shell keeps 24px there. */
		const SEAT_SCOPE_CUT = 24;

		const SEAT_SCOPE_CSS = "[" + SEAT_SCOPE_SCROLLPORT_ATTR + "]{flex:0 0 auto!important;box-sizing:border-box!important;overflow-anchor:none!important;height:var(--dsh-seat-scope-h)!important;max-height:var(--dsh-seat-scope-h)!important}" +
			"[" + SEAT_SCOPE_SEAT_ATTR + "]{position:fixed!important;left:var(--dsh-seat-left,0)!important;width:var(--dsh-seat-width,100%)!important;bottom:var(--dsh-seat-bottom,0)!important;top:auto!important;right:auto!important;margin:0!important}" +
			/* The skin center's composer-clearance sheet pads the scrollport by one
			   composer height while the seat is out of flow — which this plugin's own
			   lift makes true — and that padding stacks with the shortened port: the
			   transcript then comes to rest a hundred-plus pixels above the composer
			   instead of at the cut (measured in the 2026-10-11 probe: padding 140px
			   plus the 24px cut). Clearing the composer is the shortened port's job
			   now, so the padding is zeroed. The selector repeats the port attribute
			   and mirrors the skin center's `html[data-dsh-skin]` prefix to outrank
			   its scoped !important rule whatever order the sheets land in. */
			"html[data-dsh-skin] [" + SEAT_SCOPE_SCROLLPORT_ATTR + "][" + SEAT_SCOPE_SCROLLPORT_ATTR + "][" + SEAT_SCOPE_SCROLLPORT_ATTR + "]," +
			"[" + SEAT_SCOPE_SCROLLPORT_ATTR + "]{padding-bottom:0!important}";

		/**
		* Ancestors that would become the containing block of a fixed seat, which would
		* pin it inside the scroller instead of the viewport. An empty list means the
		* fixed seat really does escape.
		*/
		function seatScopeBlockers(seat, win) {
			const found = [];
			let el = seat.parentElement;
			const root = win.document.documentElement;
			while (el !== null && el !== root && el.nodeType === 1) {
				const cs = win.getComputedStyle(el);
				if (cs.transform && cs.transform !== "none") found.push("transform");
				if (cs.filter && cs.filter !== "none") found.push("filter");
				if (cs.backdropFilter && cs.backdropFilter !== "none") found.push("backdrop-filter");
				if (cs.perspective && cs.perspective !== "none") found.push("perspective");
				const contain = String(cs.contain || "none");
				if (contain !== "none" && /paint|strict|content/.test(contain)) found.push("contain");
				const will = String(cs.willChange || "auto");
				if (will !== "auto" && /transform|filter|perspective/.test(will)) found.push("will-change");
				el = el.parentElement;
			}
			return found;
		}

		/** Inject the scope rules once per document, replacing any previous copy. */
		function ensureSeatScopeStyles(doc) {
			const target = doc ?? (typeof document === "undefined" ? undefined : document);
			if (target === undefined) return;
			const existing = target.getElementById(SEAT_SCOPE_STYLE_ID);
			if (existing !== null && existing !== undefined) existing.remove();
			const style = target.createElement("style");
			style.id = SEAT_SCOPE_STYLE_ID;
			style.textContent = SEAT_SCOPE_CSS;
			target.head.appendChild(style);
		}

		/** Drop every cut mark; used once the scroller itself does the clipping. */
		function clearSeatCut(doc) {
			const target = doc ?? (typeof document === "undefined" ? undefined : document);
			if (target === undefined) return 0;
			const marked = Array.from(target.querySelectorAll("[" + SEAT_CUT_ATTR + "]"));
			for (const row of marked) {
				row.removeAttribute(SEAT_CUT_ATTR);
				row.style.removeProperty("--dsh-seat-cut");
			}
			return marked.length;
		}

		/**
		* Shorten each scroller so its viewport ends exactly at the top of its seat, and
		* lift the seat out of the scroller with position: fixed. The transcript then has
		* nowhere to paint below that line, so it can never reach the input card, while
		* the seat and the card themselves never move.
		*/
		/**
		* Write a custom property only when the value actually changes. A no-op write
		* still dirties style, and a fresh layout pass inside the scroller is exactly what
		* lets scroll anchoring shift the transcript while the user types.
		*/
		function setVar(el, name, value) {
			if (el.style.getPropertyValue(name) === value) return false;
			el.style.setProperty(name, value);
			return true;
		}

		/** Set a mark only when it is missing; a repeated write still counts as a mutation. */
		function setMark(el, name) {
			if (el.hasAttribute(name)) return false;
			el.setAttribute(name, "");
			return true;
		}

		/** Remove a mark only when it is there. */
		function dropMark(el, name) {
			if (!el.hasAttribute(name)) return false;
			el.removeAttribute(name);
			return true;
		}

		/** Remove a custom property only when it is set. */
		function dropVar(el, name) {
			if (el.style.getPropertyValue(name) === "") return false;
			el.style.removeProperty(name);
			return true;
		}
		/** Put a seat back into the scroller's flow, undoing the lift. */
		function releaseSeat(seat) {
			dropMark(seat, SEAT_SCOPE_SEAT_ATTR);
			dropVar(seat, "--dsh-seat-left");
			dropVar(seat, "--dsh-seat-width");
			dropVar(seat, "--dsh-seat-bottom");
		}

		/**
		* End each scroller above the input card and lift its seat out of the scroller with
		* position: fixed so the seat keeps its row. Both numbers are steered from the live
		* boxes rather than computed: lifting the seat moves the shell's own clearances (the
		* band that sat above the card ends up below it), so the stock geometry cannot be
		* reused once the seat is out of the flow.
		*/
		function syncSeatScope(doc, win) {
			const target = doc ?? (typeof document === "undefined" ? undefined : document);
			if (target === undefined || win === undefined || win === null) return { mode: "none", ports: 0, blocked: [], reserve: 0, height: 0, settle: 0 };
			const keepPort = new Set();
			const keepSeat = new Set();
			const blocked = [];
			let ports = 0;
			let reserve = 0;
			let height = 0;
			let settle = 0;
			for (const port of target.querySelectorAll(SEAT_CUT_SCROLLPORT_SELECTOR)) {
				const seat = port.querySelector(SEAT_CUT_SEAT_SELECTOR);
				if (seat === null) continue;
				const reasons = seatScopeBlockers(seat, win);
				for (const reason of reasons) if (blocked.indexOf(reason) === -1) blocked.push(reason);
				if (reasons.length > 0) continue;
				const viewH = win.innerHeight || 0;
				if (!(viewH > 0)) continue;
				const card = seat.querySelector(SEAT_SCOPE_CARD_SELECTOR);
				if (card === null) continue;
				const lifted = seat.hasAttribute(SEAT_SCOPE_SEAT_ATTR);
				const cardRect = card.getBoundingClientRect();
				if (!(cardRect.height > 0)) continue;
				let gap = parseFloat(seat.getAttribute(SEAT_SCOPE_GAP_ATTR) || "");
				if (!Number.isFinite(gap) || gap < 0 || gap > 240) {
					/* The card's distance to the viewport bottom is only readable while the seat
					still lies in the scroller. Lift on this frame, steer from the next one. */
					if (lifted) {
						releaseSeat(seat);
						continue;
					}
					/* A scroller only sheds the skin center's composer-clearance padding
					once this pass has marked it, and a session switch rebuilds the
					scroller outright: on the first frame of the new session the port is
					still padded, its seat rests that much higher, and measuring there
					would bake the clearance into the gap — the card then sits a
					hundred-plus pixels too high until the page is reloaded. Read the
					live padding off the port and take it out of the measurement. */
					const clearance = parseFloat(win.getComputedStyle(port).paddingBottom) || 0;
					const measured = Math.round(viewH - cardRect.bottom - clearance);
					if (!Number.isFinite(measured) || measured < 0 || measured > 240) continue;
					gap = measured;
					const portRect = port.getBoundingClientRect();
					if (seat.getAttribute(SEAT_SCOPE_GAP_ATTR) !== String(gap)) seat.setAttribute(SEAT_SCOPE_GAP_ATTR, String(gap));
					setMark(seat, SEAT_SCOPE_SEAT_ATTR);
					setVar(seat, "--dsh-seat-left", Math.round(portRect.left) + "px");
					setVar(seat, "--dsh-seat-width", Math.round(portRect.width) + "px");
					setVar(seat, "--dsh-seat-bottom", String(gap) + "px");
					setMark(port, SEAT_SCOPE_SCROLLPORT_ATTR);
					keepPort.add(port);
					keepSeat.add(seat);
					reserve = gap;
					ports += 1;
					settle += 1;
					continue;
				}
				const portRect = port.getBoundingClientRect();
				const bottom = parseFloat(seat.style.getPropertyValue("--dsh-seat-bottom") || "");
				const err = Math.round(cardRect.bottom - (viewH - gap));
				const current = Number.isFinite(bottom) ? bottom : gap;
				const nextBottom = Math.abs(err) > 1 ? Math.max(-240, Math.min(240, current + err)) : current;
				const nextHeight = Math.round(cardRect.top - SEAT_SCOPE_CUT - portRect.top);
				const cap = port.parentElement === null ? viewH : port.parentElement.getBoundingClientRect().height;
				if (!(nextHeight > 120) || (cap > 0 && nextHeight > cap)) continue;
				/* The shell watches this scroller with a ResizeObserver and re-anchors the
				reader on every change, so a one-pixel wobble in the card box would read as
				the transcript creeping down on each keystroke. Hold the height inside 1px. */
				const kept = Math.round(parseFloat(port.style.getPropertyValue("--dsh-seat-scope-h") || ""));
				const applied = Number.isFinite(kept) && Math.abs(nextHeight - kept) <= 1 ? kept : nextHeight;
				if (Math.abs(err) > 1) settle += 1;
				reserve = gap;
				height = applied;
				ports += 1;
				keepPort.add(port);
				keepSeat.add(seat);
				setMark(port, SEAT_SCOPE_SCROLLPORT_ATTR);
				/* Re-assert the lift on every steering pass, not only on the first
				   one: a seat whose mark was ever dropped (a transient
				   `releaseSeat`) still carries its gap attribute, so the lift
				   branch will not run again — without this the port would stay
				   shortened while the seat sat back in the flow. */
				setMark(seat, SEAT_SCOPE_SEAT_ATTR);
				setVar(port, "--dsh-seat-scope-h", applied + "px");
				setVar(seat, "--dsh-seat-left", Math.round(portRect.left) + "px");
				setVar(seat, "--dsh-seat-width", Math.round(portRect.width) + "px");
				setVar(seat, "--dsh-seat-bottom", Math.round(nextBottom) + "px");
			}
			for (const port of Array.from(target.querySelectorAll("[" + SEAT_SCOPE_SCROLLPORT_ATTR + "]"))) {
				if (keepPort.has(port)) continue;
				dropMark(port, SEAT_SCOPE_SCROLLPORT_ATTR);
				dropVar(port, "--dsh-seat-scope-h");
			}
			for (const seat of Array.from(target.querySelectorAll("[" + SEAT_SCOPE_SEAT_ATTR + "]"))) {
				if (keepSeat.has(seat)) continue;
				releaseSeat(seat);
			}
			return { mode: ports > 0 ? "scope" : "none", ports, blocked: blocked.slice(0, 5), reserve, height, settle };
		}
		//#endregion

		//#region data
		/** Wallpapers per row of the facts grid; `formatBytes` keeps the numbers honest. */
		function formatBytes(bytes) {
			if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return "—";
			if (bytes < 1024) return `${bytes} B`;
			if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
			return `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;
		}

		/**
		* The shell's own language tag, which decides which of Apple's three
		* label tables the host reads for the aerial section.
		*/
		function siteLanguage() {
			try {
				const declared = globalThis.document?.documentElement?.getAttribute("lang") ?? "";
				if (declared !== "") return declared;
				return globalThis.navigator?.language ?? "";
			} catch {
				return "";
			}
		}

		/** Read the exported catalogue; the aerials this Mac still lacks come with it. */
		async function loadCatalog(fetchImpl, signal, lang) {
			const query = typeof lang === "string" && lang !== "" ? `?lang=${encodeURIComponent(lang)}` : "";
			const response = await fetchImpl(`${API_BASE}/catalog${query}`, { signal, headers: { accept: "application/json" } });
			if (!response.ok) throw new Error(`catalog → HTTP ${response.status}`);
			const payload = await response.json();
			if (payload?.ok !== true) throw new Error(payload?.error ?? "catalog rejected");
			const wallpapers = Array.isArray(payload.wallpapers) ? payload.wallpapers : [];
			const groups = Array.isArray(payload.groups) ? payload.groups : [];
			const aerials = payload.aerials !== null && typeof payload.aerials === "object" ? payload.aerials : null;
			return {
				built: payload.built === true,
				generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : null,
				entry: payload.entry ?? null,
				groups: groups.filter((group) => Array.isArray(group.ids) && group.ids.length > 0),
				wallpapers,
				aerials: aerials === null ? null : { ...aerials, groups: Array.isArray(aerials.groups) ? aerials.groups : [] },
				activeSkin: typeof payload.activeSkin === "string" ? payload.activeSkin : null,
				// The removal list rides with the catalogue, so the strip at the
				// foot of the page and the grid always come from one answer.
				removed: Array.isArray(payload.removed)
					? payload.removed.filter((item) => item !== null && typeof item?.id === "string")
					: [],
				byId: new Map(wallpapers.map((wallpaper) => [wallpaper.id, wallpaper])),
			};
		}

		/** The largest picture the host takes; the panel refuses one before uploading it. */
		const IMPORT_MAX_BYTES = 48 * 1024 * 1024;

		/**
		* Send one picture to the host, which stores its own copy of it and then
		* runs the export on that copy.
		*
		* The bytes go up as the whole request body — no base64, no JSON wrapper —
		* so a 20 MB picture costs 20 MB and the host streams it straight to disk.
		* The name rides in the query string: it is the label the skin will carry,
		* not something the host should infer from a content type.
		* @param crop - the framing the panel chose, as `{ x, y, w, h }` fractions
		*   of the source; null imports the picture whole.
		* @returns the imported entry.
		*/
		async function importImage(fetchImpl, file, signal, crop = null) {
			const name = typeof file?.name === "string" && file.name !== "" ? file.name : "imported";
			const framed = formatCrop(crop);
			const url = framed === null
				? `${API_BASE}/import?name=${encodeURIComponent(name)}`
				: `${API_BASE}/import?name=${encodeURIComponent(name)}&crop=${framed}`;
			const response = await fetchImpl(url, {
				method: "POST",
				signal,
				headers: {
					"content-type": typeof file?.type === "string" && file.type !== "" ? file.type : "application/octet-stream"
				},
				body: file
			});
			let payload = null;
			try {
				payload = await response.json();
			} catch {
				payload = null;
			}
			if (payload?.ok !== true) {
				const error = new Error(payload?.error ?? `import → HTTP ${response.status}`);
				error.code = typeof payload?.error === "string" ? payload.error : "unknown";
				throw error;
			}
			return payload.imported ?? null;
		}

		/**
		* Remove one wallpaper from the library.
		*
		* The host deletes the skin directory it exported and records the removal
		* so the next export cannot resurrect it; macOS's own asset is never
		* touched. The answer carries the refreshed catalogue, so the caller can
		* redraw without a second round trip.
		* @returns the catalogue payload.
		*/
		async function removeWallpaper(fetchImpl, id, signal) {
			return postWallpaperAction(fetchImpl, "remove", id, signal);
		}

		/** Bring a removed wallpaper back: the host re-runs the export for it. */
		async function restoreWallpaper(fetchImpl, id, signal) {
			return postWallpaperAction(fetchImpl, "restore", id, signal);
		}

		/**
		* Both mutations are the same POST with a different verb in the path, so
		* the request shape and the error contract live in one place: the caller
		* reads `error.code` — `in-use`, `source-gone` — to say something
		* specific rather than echoing a status number.
		*/
		async function postWallpaperAction(fetchImpl, action, id, signal, extra = null) {
			/* The mutation answers carry the catalogue, and its aerial section is
			   language-specific: pass the page's language so a delete in Chinese
			   does not come back with English groups. */
			const lang = siteLanguage();
			const query = lang === "" ? "" : `?lang=${encodeURIComponent(lang)}`;
			const response = await fetchImpl(`${API_BASE}/${action}${query}`, {
				method: "POST",
				signal,
				headers: { "content-type": "application/json" },
				body: JSON.stringify(extra === null ? { id } : { id, ...extra })
			});
			let payload = null;
			try {
				payload = await response.json();
			} catch {
				payload = null;
			}
			if (payload?.ok !== true) {
				const error = new Error(payload?.error ?? `${action} → HTTP ${response.status}`);
				error.code = typeof payload?.error === "string" ? payload.error : "unknown";
				throw error;
			}
			return payload;
		}

		/** The skin center's live runtime, when that plugin is on this page. */
		function skinRuntime(doc) {
			try {
				return doc?.defaultView?.[RUNTIME_KEY] ?? null;
			} catch {
				return null;
			}
		}

		/**
		* Apply one wallpaper.
		*
		* Two writes, in this order, because they answer different questions:
		*
		*  1. the live switch — `window.__skinRuntime` is the skin controller this
		*     page already runs, so re-reading its catalogue and switching through
		*     it repaints the document with no reload and no flicker. Writing the
		*     file alone would leave the panel and the page disagreeing until a
		*     refresh, since a booted document is not re-read from disk.
		*  2. the persisted selection — the host writes the skin center's own
		*     active-state document, which is what makes the *first paint* after a
		*     reload already be the wallpaper, and what makes the skin center agree
		*     that this skin is the one in use.
		*
		* When the runtime is absent (skin center disabled) step 1 is skipped and
		* the caller is told the change needs a refresh — never silently lost.
		* @returns `{ live, activeSkin }`.
		*/
		async function applyWallpaper(deps, entry, signal) {
			const runtime = skinRuntime(deps.doc);
			let live = false;
			if (runtime !== null && typeof runtime.refreshCatalog === "function" && typeof runtime.controller?.switchTo === "function") {
				/* The live leg is best-effort: a runtime that is missing, unreachable,
				   or that silently refuses the switch must not stop the persisted
				   selection from being written, and must not be reported as a switch
				   that happened. `switchTo` swallows its own failures and returns the
				   id that is really on stage, so it is the return value that decides —
				   the same check the skin center's own card makes. */
				try {
					await runtime.refreshCatalog();
					const found = typeof runtime.find === "function" ? runtime.find(entry.skin) : null;
					if (found !== null) {
						const active = await runtime.controller.switchTo(entry.skin, found);
						live = active === entry.skin;
					}
				} catch {
					live = false;
				}
			}
			const response = await deps.fetchImpl(`${API_BASE}/apply`, {
				method: "POST",
				signal,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id: entry.id }),
			});
			if (!response.ok) throw new Error(`apply → HTTP ${response.status}`);
			const payload = await response.json();
			if (payload?.ok !== true) throw new Error(payload?.error ?? "apply rejected");
			return { live, activeSkin: typeof payload.activeSkin === "string" ? payload.activeSkin : entry.skin };
		}
	/** The image sizes the export writes; the drawer asks for the readable one. */
		const PREVIEW_SIZES = Object.freeze({ thumb: "thumb", preview: "preview" });
		/**
		* State keys that outlive the panel being torn down and rebuilt.
		*
		* The shell unmounts a panel the moment another one is opened, so the search
		* term, the filter and the scroll position are re-derived from here rather
		* than lost — coming back to the library should feel like coming back to a
		* page, not to a page that was reloaded.
		*/
		const UI_STATE_KEYS = Object.freeze({
			view: "dsh.appearance-library.view",
			cluster: "dsh.appearance-library.cluster",
			query: "dsh.appearance-library.query",
			scroll: "dsh.appearance-library.scroll"
		});
		/** The two ways the collection can be laid out. */
		const VIEW_MODES = Object.freeze({ grid: "grid", list: "list" });

		/**
		 * A folded shelf keeps its first row: the header already says how many pictures sit
		 * behind it, and one row of them says what they look like. Only that row's worth of
		 * cards is drawn — a fold that still mounted 153 films would save the height and
		 * pay for it in thumbnails.
		 */
		const FOLDED_ROW = 12;
		/** What the import picker accepts; the host validates magic numbers anyway. */
		const IMPORT_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,image/tiff,image/gif,image/*";
		/** How long a finished apply keeps its inline progress, so feedback is never a flicker. */
		const APPLY_MIN_MS = 320;
		/** How long a toast carrying an undo stays up. */
		const UNDO_MS = 8000;
		/** A toast with nothing to click can leave sooner. */
		const TOAST_MS = 4200;
		/** How long the exit animation runs before the node unmounts (matches --mds-dur-base). */
		const TOAST_EXIT_MS = 200;
		/**
		 * The lens: the card under the pointer stands up, its neighbours step down a fixed
		 * ladder, and the rest of the row gets out of the way.
		 *
		 * A grid of pictures answers "which one is this?" with a thumbnail nobody can read;
		 * a pointer crossing the shelf should answer it instead. The ladder is fixed on
		 * purpose — the pointer only moves between cards, so the shelf is measured once per
		 * card change and every card reads its magnification off a table. A curve recomputed
		 * per frame would buy the same picture and pay a layout per frame for it.
		 *
		 * The magnification rides on scale and translate rather than on transform, which is
		 * what the stylesheet already uses for the hover lift and the press. Independent
		 * transform properties compose with transform instead of replacing it, so a
		 * magnified card still dips when it is pressed.
		 */
		const DOCK_LADDER = [1.2, 1.11, 1.05, 1.02];
		/** The one shelf this runs on: the pending aerials, whose folded row is a stand of
		    narrow strips. The library grid is left alone — its cards are already full size. */
		const DOCK_SHELF_SELECTOR = ".dsl-appear-aerialsGrid";
		/** How much later each further step starts, so a row opens as a ripple. */
		const DOCK_STAGGER = 25;
		/** The layer the card under the pointer takes; every other card stays below it. */
		const DOCK_TOP = 100;
		/** How long a magnified card takes to settle. */
		const DOCK_EASE = "var(--mds-dur-base) var(--mds-ease-standard)";
		/** The panel's own transitions, plus the two properties this adds. */
		const DOCK_TILE_EASE =
			"transform var(--mds-dur-hover) cubic-bezier(0.2,0,0,1),box-shadow var(--mds-dur-base) var(--mds-ease-standard),scale " + DOCK_EASE + ",translate " + DOCK_EASE;
		const DOCK_AERIAL_EASE =
			"background-color var(--mds-dur-hover) ease,border-color var(--mds-dur-hover) ease,transform var(--mds-dur-base) var(--mds-ease-standard),box-shadow var(--mds-dur-base) ease,scale " + DOCK_EASE + ",translate " + DOCK_EASE;
		/** The card under the pointer, per shelf. */
		const DOCK_SHELVES = new WeakMap();
		/** Cached answer to "does this browser have scale and translate?" */
		let dockProps = null;

		/** Whether this browser has the two properties this rides on. Asked once. */
		function dockSupported() {
			if (dockProps === null) {
				const css = globalThis.CSS;
				dockProps = css !== undefined && css !== null && typeof css.supports === "function" && css.supports("scale", "1.5") === true;
			}
			return dockProps === true;
		}

		/**
		 * Whether this document wants the effect at all. Asked per move rather than at module
		 * scope: the setting changes while the panel is open, and a frozen answer would
		 * keep magnifying after the reader asked for less motion.
		 */
		function dockAllowed() {
			if (dockSupported() !== true) return false;
			if (typeof globalThis.matchMedia !== "function") return false;
			if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches === true) return false;
			return globalThis.matchMedia("(hover: hover)").matches === true;
		}

		/** A computed length in px; "normal" and friends answer 0. */
		function dockPx(value) {
			const parsed = typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
			return Number.isFinite(parsed) === true ? parsed : 0;
		}

		/** The cards on a shelf, each with the node that carries the transform. */
		function dockCards(shelf) {
			const cards = [];
			const nodes = shelf.children;
			const total = nodes.length;
			for (let i = 0; i < total; i += 1) {
				const li = nodes[i];
				const tile = li.firstElementChild;
				if (tile === null || tile === undefined) continue;
				/* Cards stack left over right: the strip a reader sees is the left edge of each
				   card, so the card that owns the strip has to be the one on top. */
				cards.push({ li, tile, layer: total - i });
			}
			return cards;
		}

		/**
		 * Whether a card opens its row. The head of a row has no room to be shoved into: the
		 * shelf clips whatever hangs out on the left, and a card that jumps rightwards to stay
		 * whole reads as running away from the pointer.
		 */
		function dockRowHead(boxes, box) {
			for (let i = 0; i < boxes.length; i += 1) {
				const other = boxes[i];
				if (other === box) continue;
				if (Math.abs(other.y - box.y) >= box.h / 2) continue;
				if (other.x < box.x - 0.5) return false;
			}
			return true;
		}

		/** Put one card back on the stylesheet's terms. */
		function dockRest(card, delay) {
			const style = card.tile.style;
			style.removeProperty("scale");
			style.removeProperty("translate");
			style.removeProperty("transform-origin");
			/* Coming home is a change like any other, so it ripples too. */
			if (delay > 0) style.setProperty("transition-delay", delay + "ms");
			else style.removeProperty("transition-delay");
			/* The resting order is left over right, not a leftover from the last hover. */
			style.setProperty("position", "relative");
			style.setProperty("z-index", String(card.layer));
		}

		/** The pointer left: nothing on this shelf is magnified any more. */
		function dockRestShelf(shelf) {
			const home = DOCK_SHELVES.get(shelf);
			DOCK_SHELVES.delete(shelf);
			const cards = dockCards(shelf);
			let from = -1;
			for (let i = 0; i < cards.length; i += 1) {
				if (cards[i].li === home) from = i;
			}
			for (let i = 0; i < cards.length; i += 1) {
				const steps = from < 0 ? 0 : Math.abs(i - from);
				dockRest(cards[i], Math.min(steps, DOCK_LADDER.length - 1) * DOCK_STAGGER);
			}
		}

		/**
		 * The pointer moved onto a card. Painting the same card twice is the common case and
		 * costs one comparison, which is why the event can stay un-throttled.
		 */
		function dockHover(shelf, li) {
			if (DOCK_SHELVES.get(shelf) === li) return;
			DOCK_SHELVES.set(shelf, li);
			dockPaint(shelf, li);
		}

		/**
		 * Measure the shelf once, then hand every card its step and its shove.
		 *
		 * The headroom is what makes this possible under a fold: a magnified card is taller
		 * than the row it sits in and the shelf clips its own overflow. Padding that the
		 * margin takes straight back buys the room without moving anything below it, and the
		 * padding box is inside the clip. The padding would also swallow the category header
		 * it now overlaps, so the shelf stops taking pointer events and the cards take them
		 * back one by one.
		 */
		function dockPaint(shelf, li) {
			const cards = dockCards(shelf);
			if (dockAllowed() !== true || typeof shelf.getBoundingClientRect !== "function") {
				for (let i = 0; i < cards.length; i += 1) dockRest(cards[i]);
				return;
			}
			const frame = shelf.getBoundingClientRect();
			const boxes = [];
			let home = null;
			for (let i = 0; i < cards.length; i += 1) {
				const card = cards[i];
				const rect = card.li.getBoundingClientRect();
				/* A folded grid keeps its spare rows at zero height, and a folded list hides
				   them outright; neither is on the shelf the pointer can see. */
				if (rect.width < 1 || rect.height < 1) continue;
				const box = { card, x: rect.left - frame.left, y: rect.top - frame.top, w: rect.width, h: rect.height };
				if (card.li === li) home = box;
				boxes.push(box);
			}
			for (let i = 0; i < cards.length; i += 1) {
				const cell = cards[i].li;
				cell.style.pointerEvents = "auto";
				/* The fold clips each cell to zero height; a live cell must not clip the card
				   that is growing out of it. */
				if (cell.offsetHeight > 0) cell.style.overflow = "visible";
			}
			if (home === null) {
				for (let i = 0; i < cards.length; i += 1) dockRest(cards[i]);
				return;
			}
			const headroom = Math.ceil(home.h * (DOCK_LADDER[0] - 1)) + 12;
			if (shelf.getAttribute("data-dock-headroom") !== String(headroom)) {
				shelf.setAttribute("data-dock-headroom", String(headroom));
				shelf.style.paddingTop = headroom + "px";
				shelf.style.marginTop = -headroom + "px";
				shelf.style.pointerEvents = "none";
			}
			const computed = typeof globalThis.getComputedStyle === "function" ? globalThis.getComputedStyle(shelf) : null;
			const stepX = home.w + dockPx(computed === null ? null : computed.columnGap);
			const stepY = home.h + dockPx(computed === null ? null : computed.rowGap);
			const midX = home.x + home.w / 2;
			const midY = home.y + home.h / 2;
			const lens = [];
			for (let i = 0; i < boxes.length; i += 1) {
				const box = boxes[i];
				/* Both axes are counted in whole card pitches, so a wide gap and a narrow card
				   still read as one step rather than two. */
				const dx = (box.x + box.w / 2 - midX) / stepX;
				const dy = (box.y + box.h / 2 - midY) / stepY;
				const step = Math.round(Math.sqrt(dx * dx + dy * dy));
				const scale = DOCK_LADDER[step] ?? 1;
				lens.push({ box, dy, scale, step });
			}
			const span = frame.width;
			for (let i = 0; i < lens.length; i += 1) {
				const item = lens[i];
				const tile = item.box.card.tile;
				const style = tile.style;
				const aerial = typeof tile.classList.contains === "function" && tile.classList.contains("dsl-appear-aerial");
				style.setProperty("scale", String(item.scale));
				style.setProperty("position", "relative");
				/* The magnified card has to clear its neighbours, and they only need to clear
				   whatever sits behind the shelf. */
				style.setProperty("z-index", item.box === home ? String(DOCK_TOP) : String(item.box.card.layer));
				style.setProperty("transition", aerial ? DOCK_AERIAL_EASE : DOCK_TILE_EASE);
				/* The further a card sits from the pointer, the later it starts, so the row opens
				   as a ripple instead of every card shoving at the same instant. */
				const wait = Math.min(item.step, DOCK_LADDER.length - 1) * DOCK_STAGGER;
				if (wait > 0) style.setProperty("transition-delay", wait + "ms");
				else style.removeProperty("transition-delay");
				/* A folded slot is narrow while the card inside it is not, so the origin goes on
				   the slot's centre: the card then grows around the very strip the pointer is on
				   instead of around a box that reaches far to the right of it. */
				style.setProperty("transform-origin", (item.box.w / 2).toFixed(1) + "px bottom");
				if (item.box !== home) {
					style.removeProperty("translate");
					continue;
				}
				/* The card is wider than the slot it grows out of, so at the end of a row it would
				   be clipped by the shelf. Holding it inside keeps it whole — except at the head of
				   a row, where that shove reads as the card running away from the pointer: there it
				   keeps the pointer's column and the shelf clips the overhang instead. */
				const width = tile.offsetWidth > 0 ? tile.offsetWidth : item.box.w;
				const half = (width * item.scale) / 2;
				const centre = item.box.x + item.box.w / 2;
				const lo = dockRowHead(boxes, item.box) ? -span : half + 4;
				const hi = span - half - 4;
				const target = lo > hi ? span / 2 : Math.min(Math.max(centre, lo), hi);
				const dx = target - centre;
				if (Math.abs(dx) <= 0.5) style.removeProperty("translate");
				else style.setProperty("translate", dx.toFixed(1) + "px 0px");
			}
		}

		/** The card a pointer event landed on, and the shelf that holds it. */
		function dockHit(event) {
			const node = event.target;
			if (node === null || node === undefined || typeof node.closest !== "function") return null;
			const li = node.closest(".dsl-appear-item");
			if (li === null || li === undefined) return null;
			const shelf = li.parentElement;
			if (shelf === null || shelf === undefined) return null;
			if (typeof shelf.matches !== "function" || shelf.matches(DOCK_SHELF_SELECTOR) !== true) return null;
			return { shelf, li };
		}

		/**
		 * The handler sits on the section rather than on the shelf: the shelf grows a padding
		 * band above itself, so the pointer can leave the cards while staying inside the
		 * shelf's own box, and a pointer-down on a category header has to be able to end the
		 * magnification it interrupted.
		 */
		function onShelfPointerOver(event) {
			const hit = dockHit(event);
			if (hit === null) {
				onShelfPointerLeave(event);
				return;
			}
			dockHover(hit.shelf, hit.li);
		}

		function onShelfPointerLeave(event) {
			const section = event.currentTarget;
			const shelf =
				section !== null && section !== undefined && typeof section.querySelector === "function"
					? section.querySelector(DOCK_SHELF_SELECTOR)
					: null;
			if (shelf !== null && shelf !== undefined) dockRestShelf(shelf);
		}
		/** sessionStorage, when the panel runs somewhere that has one. */
		function uiStore() {
			try {
				return globalThis.window?.sessionStorage ?? null;
			} catch {
				return null;
			}
		}

		/** One persisted UI value, with a fallback for the first run. */
		function readUiValue(key, fallback) {
			try {
				const raw = uiStore()?.getItem(key);
				return raw === null || raw === undefined ? fallback : raw;
			} catch {
				return fallback;
			}
		}

		/** Persist one UI value; storage being unwritable is never worth surfacing. */
		function writeUiValue(key, value) {
			try {
				uiStore()?.setItem(key, String(value));
			} catch {
				/* private mode, quota, a document without a window: all the same here */
			}
		}

		/** The count the export recorded for one size, whatever shape it arrived in. */
		function entryBytes(entry, size) {
			const bytes = entry?.bytes;
			if (typeof bytes === "number") return size === "media" ? bytes : null;
			if (bytes === null || typeof bytes !== "object") return null;
			const value = bytes[size];
			return typeof value === "number" && Number.isFinite(value) ? value : null;
		}

		/** A short "1920 × 1080" when the size is known from either source. */
		function formatResolution(width, height) {
			if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
			return `${Math.round(width)} × ${Math.round(height)}`;
		}

		/**
		* The rectangle a picture is cut to, as fractions of the source.
		*
		* Fractions and never pixels: the panel frames a 6016² HEIC and a 1200×800
		* screenshot with the same arithmetic, and the machine that owns the file
		* turns the fractions back into pixels at export time. `zoom` is how much
		* closer than the widest cover fit the frame sits, so 1 is the whole frame
		* and 4 is a quarter of it per side.
		* @param zoom - 1..4, clamped; anything else reads as 1.
		* @param centerX / centerY - where the frame's centre sits, 0..1.
		* @returns `{ x, y, w, h }` kept inside the picture, or null when the
		*   arguments cannot describe a rectangle at all.
		*/
		function cropRect(width, height, ratio, zoom = 1, centerX = 0.5, centerY = 0.5) {
			if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(ratio)) return null;
			if (width <= 0 || height <= 0 || ratio <= 0) return null;
			const wide = width / height > ratio;
			const baseW = wide ? (height * ratio) / width : 1;
			const baseH = wide ? 1 : width / ratio / height;
			const scale = Math.min(Math.max(Number.isFinite(zoom) ? zoom : 1, 1), 4);
			const w = Math.min(baseW / scale, 1);
			const h = Math.min(baseH / scale, 1);
			const clamp = (value, span) => Math.min(Math.max(value, 0), 1 - span);
			const x = clamp((Number.isFinite(centerX) ? centerX : 0.5) - w / 2, w);
			const y = clamp((Number.isFinite(centerY) ? centerY : 0.5) - h / 2, h);
			return { x, y, w, h };
		}

		/** The rectangle as the query the host reads, or null when there is none. */
		function formatCrop(rect) {
			if (rect === null || typeof rect !== "object") return null;
			const values = [rect.x, rect.y, rect.w, rect.h].map((value) => (Number.isFinite(value) ? value.toFixed(4) : null));
			return values.includes(null) ? null : values.join(",");
		}

		/**
		* The frame's default ratio: the screen the wallpaper will be seen on.
		*
		* A cover fit crops least when the picture already has the screen's shape,
		* so the panel starts there and only offers the other ratios as detours.
		* @returns width / height, or 16:10 when there is no screen to ask.
		*/
		function screenRatio() {
			const view = globalThis.screen;
			const width = view?.width ?? 0;
			const height = view?.height ?? 0;
			return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? width / height : 16 / 10;
		}

		/** The ratios the panel offers; the screen is resolved at render time. */
		const CROP_RATIOS = [
			{ key: "screen", value: null },
			{ key: "16:10", value: 16 / 10 },
			{ key: "16:9", value: 16 / 9 },
			{ key: "3:2", value: 3 / 2 },
			{ key: "1:1", value: 1 }
		];

		/** The thumbnail the drawer and the captions ask for. */
		function previewUrl(id, size) {
			return `${API_BASE}/preview?wallpaper=${encodeURIComponent(id)}&size=${size === "preview" ? "preview" : "thumb"}`;
		}

		/**
		* One film’s cover, straight out of Apple’s own offline cache.
		*
		* macOS keeps a 214×130 PNG for every aerial it knows about beside the
		* manifest — downloaded or not — and the host half already serves that one
		* file per asset id. A film this Mac has never fetched therefore still gets a
		* face, and nothing here touches the network or the download state.
		*/
		function aerialPreviewUrl(id) {
			return `${API_BASE}/aerial-preview?id=${encodeURIComponent(id)}`;
		}

		/** One picture's picked-up-on-load facts: its natural size. */
		function pictureFacts(image, node) {
			const natural = {
				width: image?.naturalWidth ?? 0,
				height: image?.naturalHeight ?? 0
			};
			return {
				width: natural.width,
				height: natural.height,
				portrait: natural.height > natural.width && natural.width > 0,
			};
		}
		//#endregion

		//#region components
		/** The sidebar glyph: a grid of wallpaper cards, brighter while the panel is selected. */
		function AppearanceIcon({ size, active }) {
			const Icon = active === true ? primitives.IconCompactOutlineMedium : primitives.IconCompactOutlineRegular;
			return h(Icon, { size });
		}

		/** Inline state block for the loading, empty and failure faces. */
		function StateBlock({ title, body, command, action }) {
			return h("div", { className: "dsl-appear-state" }, [
				h("p", { className: "dsl-appear-stateTitle", key: "title" }, title),
				body === undefined ? null : h("p", { className: "dsl-appear-stateBody", key: "body" }, body),
				command === undefined ? null : h("code", { className: "dsl-appear-stateCmd", key: "cmd" }, command),
				action === undefined ? null : h("div", { key: "action" }, action)
			]);
		}

		/**
		* The seamless-loop switch on a film's tile.
		*
		* It lives above the tile's own click target, so both the pointer and the
		* keyboard stop propagation: flipping the loop must never also open the
		* wallpaper's details. A 36×21 track is a hair under Apple's 44pt, which is
		* why the whole label row is padded out to a comfortable hit area instead of
		* the track being grown — the tile is 196px wide, not a toolbar.
		*/
		function SeamSwitch({ entry, on, busy, onToggle, t }) {
			const stop = (event) => event.stopPropagation();
			return h(
				"button",
				{
					type: "button",
					className: "dsl-appear-seam",
					role: "switch",
					"aria-checked": on ? "true" : "false",
					"aria-label": t("seam.switch", { name: entry.nameZh }),
					title: t("seam.hint"),
					"data-on": on ? "1" : "0",
					"data-busy": busy ? "1" : "0",
					disabled: busy,
					onClick: (event) => {
						stop(event);
						onToggle(entry, !on);
					},
					onPointerDown: stop,
					onKeyDown: (event) => {
						if (event.key !== "Enter" && event.key !== " ") return;
						stop(event);
					}
				},
				[
					h("span", { className: "dsl-appear-seamTrack", key: "track" }, h("span", { className: "dsl-appear-seamKnob" })),
					h("span", { className: "dsl-appear-seamText", key: "text" }, busy ? t("seam.busy") : t("seam.label"))
				]
			);
		}

		/**
		* The sticky control strip: search, the source segments and the view switch.
		*
		* Everything that narrows the collection lives in one bar that stays pinned
		* while the collection scrolls under it — the filter is always reachable,
		* and always shows what it is filtering. The "all" segment follows the search,
		* so it answers "how many did I find", while each source keeps its own size.
		*/
		function LibraryToolbar({
			t,
			query,
			cluster,
			groups,
			total,
			view,
			stuck,
			searchRef,
			barRef,
			onQuery,
			onCluster,
			onView
		}) {
			const shortcut = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "") ? "⌘K" : "Ctrl K";

			return h("div", { className: "dsl-appear-toolbar", ref: barRef, "data-stuck": stuck ? "1" : "0" }, [
				h("div", { className: "dsl-appear-search", key: "search", "data-filled": query === "" ? "0" : "1" }, [
					h(primitives.IconSearchOutlineRegular, { size: 14, key: "icon" }),
					h("input", {
						key: "input",
						ref: searchRef,
						className: "dsl-appear-searchInput",
						type: "search",
						value: query,
						placeholder: t("search.placeholder"),
						"aria-label": t("search.label"),
						title: t("search.hint"),
						autoComplete: "off",
						spellCheck: false,
						onChange: (event) => onQuery(event.target.value),
						onKeyDown: (event) => {
							if (event.key !== "Escape" || query === "") return;
							event.stopPropagation();
							onQuery("");
						}
					}),
					query === ""
						? h("span", { className: "dsl-appear-searchKey", key: "key" }, shortcut)
						: h(
								"button",
								{
									type: "button",
									className: "dsl-appear-clear",
									key: "clear",
									"aria-label": t("search.clear"),
									onClick: () => onQuery("")
								},
								h(primitives.IconCloseFillRegular, { size: 12 })
							)
				]),
				h(
					"div",
					{ className: "dsl-appear-segments", key: "segments", role: "group", "aria-label": t("filter.label") },
					[
						h(
							"button",
							{
								type: "button",
								key: "all",
								className: "dsl-appear-segment",
								"aria-pressed": cluster === "all" ? "true" : "false",
								onClick: () => onCluster("all")
							},
							[
								h("span", { key: "label" }, t("filter.all")),
								h("span", { className: "dsl-appear-segmentCount", key: "n" }, String(total))
							]
						),
						...groups.map((group) =>
							h(
								"button",
								{
									type: "button",
									key: group.key,
									className: "dsl-appear-segment",
									"aria-pressed": cluster === group.key ? "true" : "false",
									title: t("group.jump", { name: group.nameZh }),
									onClick: () => onCluster(group.key)
								},
								[
									h("span", { key: "label" }, group.nameZh),
									h("span", { className: "dsl-appear-segmentCount", key: "n" }, String(group.ids.length))
								]
							)
						)
					]
				),
				h(
					"div",
					{ className: "dsl-appear-segments", key: "view", role: "group", "aria-label": t("view.label") },
					[
						h(
							"button",
							{
								type: "button",
								key: "grid",
								className: "dsl-appear-segment",
								"aria-pressed": view === "grid" ? "true" : "false",
								"aria-label": t("view.grid"),
								title: t("view.grid"),
								onClick: () => onView("grid")
							},
							h(primitives.IconChecklistOutlineRegular ?? primitives.IconFlatListOutlineRegular, { size: 14 })
						),
						h(
							"button",
							{
								type: "button",
								key: "list",
								className: "dsl-appear-segment",
								"aria-pressed": view === "list" ? "true" : "false",
								"aria-label": t("view.list"),
								title: t("view.list"),
								onClick: () => onView("list")
							},
							h(primitives.IconFlatListOutlineRegular, { size: 14 })
						)
					]
				)
			]);
		}

		/**
		* The loading face: a grid of reserved, shimmering cards.
		*
		* Reading the catalogue is a local round trip and usually lands inside a
		* frame, but when it does not, the space the wallpapers will occupy is
		* already held open — the panel never jumps from a spinner to a full grid
		* (CLS 0), and the shimmer is the same motion the thumbnails use.
		*/
		function GallerySkeleton({ count }) {
			const cards = [];
			for (let index = 0; index < count; index += 1) cards.push(h("div", { className: "dsl-appear-skelCard", key: index }));
			return h("div", { className: "dsl-appear-skeleton", "aria-hidden": "true" }, cards);
		}

		/**
		* One wallpaper as a list row.
		*
		* The list answers the question the grid cannot — "which one is this,
		* exactly?" — by lining the names up in a column. The row is still the same
		* button: click it for the details, and the trailing check applies it
		* without opening anything.
		*/
		function WallpaperRow({ entry, active, pending, failed, onOpen, onQuick, t }) {
			const [ready, setReady] = useState(false);
			const [pressed, setPressed] = useState(false);
			const preview = entryBytes(entry, "preview");
			const meta = [
				entry.kind === "video" ? t("kind.motion") : t("kind.still"),
				preview === null ? null : formatBytes(preview)
			].filter((piece) => piece !== null);

			return h("li", { className: "dsl-appear-item" }, [
				h(
					"button",
					{
						type: "button",
						key: "row",
						className: "dsl-appear-row",
						"aria-pressed": active ? "true" : "false",
						"aria-label": t("apply.label", { name: entry.nameZh }),
						"data-press": pressed ? "1" : "0",
						onPointerDown: () => setPressed(true),
						onPointerUp: () => setPressed(false),
						onPointerLeave: () => setPressed(false),
						onPointerCancel: () => setPressed(false),
						onClick: () => onOpen(entry),
						onKeyDown: (event) => {
							if (event.key !== "Enter" && event.key !== " ") return;
							event.preventDefault();
							onOpen(entry);
						}
					},
					[
						h("span", { className: "dsl-appear-rowThumb", key: "thumb", "data-ready": ready ? "1" : "0" }, [
							h("img", {
								key: "img",
								src: previewUrl(entry.id, PREVIEW_SIZES.thumb),
								alt: "",
								loading: "lazy",
								decoding: "async",
								draggable: false,
								onLoad: () => setReady(true),
								onError: () => setReady(true)
							})
						]),
						h("span", { className: "dsl-appear-rowText", key: "text" }, [
							h("span", { className: "dsl-appear-rowName", key: "name" }, entry.nameZh),
							h("span", { className: "dsl-appear-rowSub", key: "sub" }, entry.name)
						]),
						h("span", { className: "dsl-appear-rowMeta", key: "meta" }, [
							pending
								? h(primitives.IconLoadingOutlineRegular, { size: 13, key: "spin" })
								: failed
									? h(primitives.IconWarningTriangleOutlineRegular, { size: 13, key: "warn" })
									: null,
							active ? h(primitives.IconCheckOutlineRegular, { size: 13, key: "check" }) : null,
							h("span", { key: "kinds" }, meta.join(" · "))
						]),
						h(
							"span",
							{
								className: "dsl-appear-rowGo",
								key: "go",
								// A mouse shortcut rather than a second tab stop: the row button
								// opens the drawer, and the drawer is where a keyboard applies it,
								// so this one stays out of the tab order and off the a11y tree.
								title: t("tile.quick", { name: entry.nameZh }),
								"aria-hidden": "true",
								onClick: (event) => {
									event.stopPropagation();
									onQuick(entry);
								}
							},
							h(primitives.IconCheckCircleFillRegular ?? primitives.IconCheckOutlineRegular, { size: 14 })
						)
					]
				)
			]);
		}

		/**
		* One wallpaper as a card.
		*
		* The picture is the button: the caption is laid over it on a scrim, the
		* whole card is one click target for the details, and the two things a
		* person actually does to a wallpaper — apply it, remove it — sit as glass
		* buttons that surface on hover or keyboard focus. The ink on the caption is
		* decided from the thumbnail's own pixels, so a pale wallpaper gets dark
		* text instead of white-on-white.
		*/
		function WallpaperTile({
			entry,
			active,
			applying,
			failed,
			busy,
			seamBusy,
			onOpen,
			onQuick,
			onRemove,
			onToggleSeam,
			t
		}) {
			const [ready, setReady] = useState(false);
			const [pressed, setPressed] = useState(false);
			const imageRef = useRef(null);
			const pressedRef = useRef(false);
			const [portrait, setPortrait] = useState(false);

			const press = (value) => {
				if (pressedRef.current === value) return;
				pressedRef.current = value;
				setPressed(value);
			};
			const commit = () => {
				if (busy || applying) return;
				onOpen(entry);
			};
			const stop = (event) => {
				event.stopPropagation();
				event.preventDefault();
			};
			const onPicture = () => {
				const image = imageRef.current;
				setReady(true);
				if (image !== null && image !== undefined && image.naturalHeight > image.naturalWidth) setPortrait(true);
			};

			return h("li", { className: "dsl-appear-item" }, [
				h(
					"div",
					{
						key: "tile",
						className: `dsl-appear-tile${portrait ? " dsl-appear-tilePortrait" : ""}`,
						role: "button",
						tabIndex: 0,
						"data-tile": entry.id,
						"aria-pressed": active ? "true" : "false",
						"aria-label": t("apply.label", { name: entry.nameZh }),
						"data-press": pressed ? "1" : "0",
						onPointerDown: () => press(true),
						onPointerUp: () => press(false),
						onPointerLeave: () => press(false),
						onPointerCancel: () => press(false),
						onClick: commit,
						onKeyDown: (event) => {
							if (event.key !== "Enter" && event.key !== " ") return;
							event.preventDefault();
							commit();
						}
					},
					[
						active || applying ? h("div", { className: "dsl-appear-progress", key: "progress" }) : null,
						active
							? h("span", { className: "dsl-appear-badge", key: "badge" }, [
									h(primitives.IconCheckOutlineRegular, { size: 11, key: "icon" }),
									h("span", { key: "text" }, t("applied"))
								])
							: null,
						h("div", { className: "dsl-appear-tileMedia", key: "media", "data-ready": ready ? "1" : "0" }, [
							h("div", { className: "dsl-appear-tileShim", key: "shim", "aria-hidden": "true" }),
							h("img", {
								key: "img",
								ref: imageRef,
								className: "dsl-appear-tileImg",
								src: previewUrl(entry.id, PREVIEW_SIZES.thumb),
								alt: "",
								loading: "lazy",
								decoding: "async",
								draggable: false,
								onLoad: onPicture,
								onError: () => setReady(true)
							}),
							h(
								"div",
								{ className: "dsl-appear-tileActions", key: "actions" },
								[
									applying || busy
										? null
										: h(
												"button",
												{
													type: "button",
													key: "apply",
													className: "dsl-appear-iconBtn",
													"aria-label": t("tile.quick", { name: entry.nameZh }),
													title: t("tile.quick", { name: entry.nameZh }),
													onPointerDown: stop,
													onClick: (event) => {
														stop(event);
														onQuick(entry);
													}
												},
												h(primitives.IconCheckCircleFillRegular ?? primitives.IconCheckOutlineRegular, { size: 13 })
											),
									active
										? null
										: h(
												"button",
												{
													type: "button",
													key: "remove",
													className: "dsl-appear-iconBtn",
													"aria-label": t("remove.label", { name: entry.nameZh }),
													title: t("remove.hint"),
													onPointerDown: stop,
													onClick: (event) => {
														stop(event);
														onRemove(entry);
													}
												},
												h(primitives.IconCloseFillRegular, { size: 11 })
											)
								]
							),
							applying || busy
								? h(
										"div",
										{ className: "dsl-appear-tileBusy", key: "busy", role: "status" },
										h("span", { className: "dsl-appear-tileBusyText" }, applying ? t("applying") : t("remove.busy"))
									)
								: null,
							h(
								"div",
								{
									className: "dsl-appear-tileCaption",
									key: "caption",
								},
								[
									entry.kind === "video"
										? h("span", { className: "dsl-appear-tileCapIcon", key: "play", "aria-hidden": "true" }, h(primitives.IconPlayOutlineRegular, { size: 9 }))
										: null,
									h("p", { className: "dsl-appear-tileName", key: "name", title: `${entry.name} · ${entry.nameZh}` }, entry.nameZh),
									failed ? h(primitives.IconWarningTriangleOutlineRegular, { size: 13, key: "warn" }) : null
								]
							)
						]),
						entry.kind === "video"
							? h("div", { className: "dsl-appear-tileMeta", key: "meta" }, h(SeamSwitch, {
									entry,
									on: entry.seamLoop === true,
									busy: seamBusy,
									onToggle: onToggleSeam,
									t
								}))
							: null
					]
				)
			]);
		}

		/**
		* The detail drawer: one wallpaper, big enough to judge, with its facts.
		*
		* Opening a card used to apply it and nothing else — a single click that
		* repainted the whole app was the only way to find out what a wallpaper
		* looked like. The drawer puts the readable preview and the facts first and
		* the one committing action last, so browsing is free and applying is a
		* decision. It slides in from the edge it lives on, dims what is behind it,
		* and can be dismissed with Escape, the scrim, or its close button.
		*/
		function DetailDrawer({ entry, open, active, pending, failed, seamBusy, onClose, onApply, onRemove, onToggleSeam, t }) {
			const [ready, setReady] = useState(false);
			const [size, setSize] = useState(null);
			const closeRef = useRef(null);

			useEffect(() => {
				if (pending !== true) return undefined;
				globalThis.setTimeout(() => {
					if (closeRef.current !== null) closeRef.current.focus();
				}, 0);
				return undefined;
			}, [entry?.id]);

			// An empty shell keeps the element mounted even before anything is chosen:
			// a drawer that is created already open has nothing to animate from, so it
			// would snap into place instead of sliding in.
			if (entry === null || entry === undefined) {
				return h("aside", {
				className: "dsl-appear-drawer",
				"data-open": "0",
				"aria-hidden": "true",
				role: "dialog",
				"aria-label": t("detail.title")
				});
			}

			const previewBytes = entryBytes(entry, "preview");
			const mediaBytes = entryBytes(entry, "media");
			// The source numbers first: the drawer used to report whatever the
			// preview measured, which is the 1080 tier and never the original.
			const quality = formatResolution(entry.sourceWidth, entry.sourceHeight) ?? formatResolution(size?.width, size?.height) ?? t("detail.unknown");
			const facts = [
				{ key: "detail.resolution", value: quality, mono: false },
				previewBytes === null ? null : { key: "detail.size", value: formatBytes(previewBytes), mono: false },
				mediaBytes === null ? null : { key: "detail.master", value: formatBytes(mediaBytes), mono: false },
				{ key: "detail.source", value: entry.source ?? t("detail.unknown"), mono: true },
				{ key: "detail.kind", value: entry.kind === "video" ? t("kind.motion") : t("kind.still"), mono: false },
				{ key: "detail.orientation", value: size === null ? t("detail.unknown") : size.height > size.width ? t("detail.portrait") : t("detail.landscape"), mono: false },
			].filter((fact) => fact !== null);

			return h("aside", { className: "dsl-appear-drawer", "data-open": open ? "1" : "0", "aria-hidden": open ? undefined : "true", role: "dialog", "aria-label": t("detail.title"), "aria-modal": "true" }, [
				h("div", { className: "dsl-appear-drawerHead", key: "head" }, [
					h("div", { className: "dsl-appear-drawerTitleWrap", key: "titles" }, [
						h("h2", { className: "dsl-appear-drawerTitle", key: "title" }, entry.nameZh),
						h("p", { className: "dsl-appear-drawerSub", key: "sub" }, entry.name)
					]),
					h(
						"button",
						{
							type: "button",
							key: "close",
							ref: closeRef,
							className: "dsl-appear-iconBtn",
							style: { opacity: 1, transform: "none", background: "transparent", color: "var(--mds-text-tertiary)" },
							"aria-label": t("detail.close"),
							title: t("detail.close"),
							onClick: onClose
						},
						h(primitives.IconCloseFillRegular, { size: 12 })
					)
				]),
				h("div", { className: "dsl-appear-drawerBody", key: "body" }, [
					h(
						"div",
						{ className: "dsl-appear-drawerPreview", key: "preview", "data-ready": ready ? "1" : "0", "data-portrait": size !== null && size.height > size.width ? "1" : "0" },
						h("img", {
							key: `${entry.id}-${size?.width ?? 0}x${size?.height ?? 0}`,
							src: previewUrl(entry.id, PREVIEW_SIZES.preview),
							alt: t("detail.previewAlt", { name: entry.nameZh }),
							decoding: "async",
							draggable: false,
							onLoad: (event) => {
								setReady(true);
								const image = event?.currentTarget;
								if (image !== null && image !== undefined && image.naturalWidth > 0) {
									setSize({ width: image.naturalWidth, height: image.naturalHeight });
								}
							},
							onError: () => setReady(true)
						})
					),
					h("div", { className: "dsl-appear-drawerActions", key: "actions" }, [
						active
							? h(
									"span",
									{ className: "dsl-appear-badge", key: "applied", style: { position: "static" } },
									[h(primitives.IconCheckOutlineRegular, { size: 11, key: "i" }), h("span", { key: "t" }, t("detail.applied"))]
								)
							: h(
									primitives.Button,
									{
										key: "apply",
										variant: "primary",
										size: "sm",
										disabled: pending,
										onClick: () => onApply(entry)
									},
									pending ? t("applying") : t("detail.apply")
								),
						h(
							"button",
							{
								type: "button",
								key: "remove",
								className: "dsl-appear-removedRestore",
								disabled: active || pending || failed,
								title: t("remove.hint"),
								onClick: () => onRemove(entry)
							},
							t("detail.remove")
						)
					]),
					h(
						"div",
						{ className: "dsl-appear-drawerFacts", key: "facts" },
						facts.map((fact) =>
							h("div", { className: "dsl-appear-fact", key: fact.key }, [
								h("span", { className: "dsl-appear-factKey", key: "k" }, t(fact.key)),
								h("span", { className: "dsl-appear-factVal", key: "v", "data-mono": fact.mono ? "1" : "0" }, fact.value)
							])
						)
					),
					entry.kind === "video"
						? h("div", { className: "dsl-appear-drawerActions", key: "seam" }, h(SeamSwitch, {
								entry,
								on: entry.seamLoop === true,
								busy: seamBusy,
								onToggle: onToggleSeam,
								t
							}))
						: null
				]),
				h("div", { className: "dsl-appear-drawerFoot", key: "foot" }, h("p", { className: "dsl-appear-drawerHint" }, t("hint.exclusive")))
			]);
		}

		/** The library's own note, folded away by default so the grid stays the first thing seen (§6). */
		function LibraryNote({ entry, onClose, t }) {
			if (entry === null || typeof entry !== "object") return null;
			const counts = entry.counts ?? {};
			return h("section", { className: "dsl-appear-note" }, [
				h("p", { className: "dsl-appear-noteTitle", key: "title" }, t("about.title")),
				h(
					"p",
					{ className: "dsl-appear-groupBlurb", key: "counts" },
					t("about.counts", {
						wallpapers: counts.wallpapers ?? 0,
						clusters: counts.clusters ?? 0,
						mediaMB: counts.mediaMB ?? 0
					})
				),
				h(
					"ul",
					{ className: "dsl-appear-noteList", key: "notes" },
					(Array.isArray(entry.notes) ? entry.notes : []).map((note, index) => h("li", { key: String(index) }, note))
				),
				h("button", { type: "button", className: "dsl-appear-noteClose", key: "close", onClick: onClose }, t("about.close"))
			]);
		}

		/**
		* The frame a picture is cut to before it becomes a skin.
		*
		* The panel owns nothing but fractions: the picture is drawn oversized inside
		* a frame of the chosen ratio, and what the frame shows is what the wallpaper
		* will show. Fractions never become pixels here, so the same framing works
		* for a 6016² HEIC and the Mac that exports it decides where to cut.
		*/
		function CropPanel({ t, file, index, total, busy, onApply, onSkip, onCancel }) {
			/** True while the closing fade-out runs; the queue unmounts one beat later. */
			const [leaving, setLeaving] = useState(false);
			const [stage, setStage] = useState("loading");
			const [size, setSize] = useState(null);
			const [ratioKey, setRatioKey] = useState("screen");
			const [zoom, setZoom] = useState(1);
			const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
			const [src, setSrc] = useState(null);
			const frameRef = useRef(null);
			const dragRef = useRef(null);
			/** The local object URL is the preview: nothing is uploaded to be framed. */
			useEffect(() => {
				const url = globalThis.URL;
				if (typeof url?.createObjectURL !== "function" || file === null || file === undefined) return undefined;
				let made = null;
				try {
					made = url.createObjectURL(file);
				} catch {
					return undefined;
				}
				setSrc(made);
				return () => {
					setSrc(null);
					try {
						url.revokeObjectURL(made);
					} catch {
						/* already gone */
					}
				};
			}, [file]);
			const option = CROP_RATIOS.find((item) => item.key === ratioKey) ?? CROP_RATIOS[0];
			const ratio = option.value === null ? screenRatio() : option.value;
			const name = typeof file?.name === "string" && file.name !== "" ? file.name : t("import.action");
			const rect = size === null ? null : cropRect(size.width, size.height, ratio, zoom, center.x, center.y);
			const onLoaded = (event) => {
				const image = event?.currentTarget;
				const width = image?.naturalWidth ?? 0;
				const height = image?.naturalHeight ?? 0;
				if (width > 0 && height > 0) {
					setSize({ width, height });
					setStage("ready");
				} else {
					setStage("failed");
				}
			};
			const onPointerDown = (event) => {
				if (rect === null) return;
				dragRef.current = { x: event.clientX, y: event.clientY, center, w: rect.w, h: rect.h };
				event.currentTarget.setPointerCapture?.(event.pointerId);
			};
			/**
			* Dragging moves the picture, so the frame travels the other way. The
			* delta is measured in frame widths, which is why cropRect clamps.
			*/
			const onPointerMove = (event) => {
				const drag = dragRef.current;
				const box = frameRef.current;
				if (drag === null || rect === null || box === null) return;
				const boxW = box.clientWidth;
				const boxH = box.clientHeight;
				if (!(boxW > 0) || !(boxH > 0)) return;
				setCenter({
					x: drag.center.x - ((event.clientX - drag.x) / boxW) * drag.w,
					y: drag.center.y - ((event.clientY - drag.y) / boxH) * drag.h
				});
			};
			const endDrag = () => {
				dragRef.current = null;
			};
			const onWheel = (event) => {
				if (rect === null) return;
				event.preventDefault?.();
				setZoom((value) => Math.min(Math.max(value * (event.deltaY < 0 ? 1.08 : 1 / 1.08), 1), 4));
			};
			/** Fill the frame: the widest cover fit, centred — the plain answer. */
			const autoFit = () => {
				setZoom(1);
				setCenter({ x: 0.5, y: 0.5 });
			};
			const picture = rect === null ? null : {
				left: `${(-rect.x / rect.w) * 100}%`,
				top: `${(-rect.y / rect.h) * 100}%`,
				width: `${100 / rect.w}%`,
				height: `${100 / rect.h}%`
			};
			const ready = rect !== null && busy !== true;
			/** Cancel is a closing path: fade the scrim and the card out together, then unmount. */
			const close = () => {
				setLeaving(true);
				globalThis.setTimeout(onCancel, TOAST_EXIT_MS);
			};
			return h(
				"div",
				{ className: `dsl-appear-cropScrim${leaving ? " is-out" : ""}` },
				h(
					"div",
					{ className: "dsl-appear-crop", role: "dialog", "aria-modal": "true", "aria-label": t("crop.title") },
					h(
						"div",
						{ className: "dsl-appear-cropHead" },
						h("h3", { className: "dsl-appear-cropTitle" }, t("crop.title")),
						total > 1 ? h("span", { className: "dsl-appear-cropStep" }, t("crop.step", { n: index, total })) : null,
						h("span", { className: "dsl-appear-cropName", title: name }, name)
					),
					h(
						"div",
						{ className: "dsl-appear-cropStage" },
						h(
							"div",
							{
								className: "dsl-appear-cropFrame",
								ref: frameRef,
								"data-stage": stage,
								style: { aspectRatio: String(ratio) },
								onPointerDown,
								onPointerMove,
								onPointerUp: endDrag,
								onPointerCancel: endDrag,
								onWheel
							},
							src === null ? null : h("img", {
								className: "dsl-appear-cropImg",
								src,
								alt: name,
								style: picture,
								draggable: "false",
								onLoad: onLoaded,
								onError: () => setStage("failed")
							}),
							rect === null
								? h(
										"p",
										{ className: "dsl-appear-cropNote", "data-tone": stage === "failed" ? "error" : "muted" },
										stage === "failed" ? t("crop.unreadable") : t("crop.loading")
									)
								: null
						)
					),
					h(
						"div",
						{ className: "dsl-appear-cropRow" },
						h("span", { className: "dsl-appear-cropLabel" }, t("crop.ratio")),
						h(
							"div",
							{ className: "dsl-appear-cropRatios" },
							CROP_RATIOS.map((item) =>
								h(
									"button",
									{
										type: "button",
										key: item.key,
										className: "dsl-appear-cropRatio",
										"aria-pressed": item.key === ratioKey ? "true" : "false",
										onClick: () => setRatioKey(item.key)
									},
									item.value === null ? t("crop.ratioScreen") : item.key
								)
							)
						)
					),
					h(
						"div",
						{ className: "dsl-appear-cropRow" },
						h("span", { className: "dsl-appear-cropLabel" }, t("crop.zoom")),
						h("input", {
							className: "dsl-appear-cropSlider",
							type: "range",
							min: "1",
							max: "4",
							step: "0.01",
							value: String(zoom),
							"aria-label": t("crop.zoom"),
							onChange: (event) => setZoom(Number(event.target.value) || 1)
						}),
						h(
							primitives.Button,
							{ className: "dsl-appear-cropGhost", variant: "outline", size: "sm", disabled: rect === null, onClick: autoFit },
							t("crop.auto")
						)
					),
					h("p", { className: "dsl-appear-cropHint" }, rect === null ? t("crop.loading") : t("crop.hint")),
					h(
						"div",
						{ className: "dsl-appear-cropFoot" },
						h(primitives.Button, { className: "dsl-appear-cropGhost", variant: "outline", size: "sm", onClick: close }, t("crop.cancel")),
						total > 1
							? h(primitives.Button, { className: "dsl-appear-cropGhost", variant: "outline", size: "sm", onClick: onSkip }, t("crop.skip"))
							: null,
						h(
							primitives.Button,
							{ className: "dsl-appear-cropPrimary", variant: "primary", size: "sm", disabled: ready === false, onClick: () => onApply(rect) },
							busy === true ? t("import.busy", { name }) : t("crop.apply")
						)
					)
				)
			);
		}

		/**
		* One film macOS has not downloaded.
		*
		* These are the wallpapers Apple ships but this Mac has never fetched, so
		* there is nothing local to apply and nothing this panel is allowed to
		* download. What there *is*, is Apple’s own offline thumbnail for it —
		* a 214×130 PNG cached beside the manifest, downloaded or not — so the
		* card shows the film instead of only naming it. The one action stays the
		* same: opening Wallpaper settings, which owns the download.
		*/
		function AerialTile({ item, t, busy, onOpen }) {
			const full = typeof item.original === "string" && item.original !== "" ? `${item.name} · ${item.original}` : item.name;
			const thumb = item.thumb === true;
			return h(
				"li",
				{ className: "dsl-appear-item" },
				h(
					"button",
					{
						type: "button",
						className: "dsl-appear-aerial",
						disabled: busy === true,
						title: full,
						"aria-label": t("aerials.tileLabel", { name: item.name }),
						onClick: () => onOpen()
					},
					[
						h(
							"span",
							{ className: "dsl-appear-aerialMedia", key: "media" },
							thumb
								? h("img", {
										className: "dsl-appear-aerialImg",
										key: "img",
										src: aerialPreviewUrl(item.id),
										alt: "",
										loading: "lazy",
										decoding: "async",
										draggable: false,
										onError: (event) => {
											const node = event?.currentTarget;
											if (node !== null && node !== undefined) node.style.display = "none";
										}
										})
								: null
						),
						h("span", { className: "dsl-appear-aerialText", key: "text" }, h("span", { className: "dsl-appear-aerialName", key: "name" }, item.name)),
						h("span", { className: "dsl-appear-aerialDot", key: "dot", "aria-hidden": "true" })
					]
				)
			);
		}

		/**
		* The aerials macOS has not downloaded yet, under the categories Settings
		* itself uses.
		*
		* Nothing here downloads: the section exists so the gap between "Apple
		* ships 156" and "this Mac has 3" is visible in the panel, and every route
		* to closing it runs through System Settings, which owns the films.
		*/
		function AerialPendingSection({ aerials, query, t, opening, onOpen, openChoice, onToggle, sectionOpen, onToggleSection }) {
			const needle = query.trim().toLowerCase();
			const searching = needle !== "";
			const groups = useMemo(() => {
				const source = Array.isArray(aerials?.groups) ? aerials.groups : [];
				return source
					.map((group) => ({
						...group,
						items: (Array.isArray(group.items) ? group.items : []).filter((item) => {
							if (needle === "") return true;
							const haystack = `${item.name} ${item.original} ${item.scene}`.toLowerCase();
							return haystack.includes(needle);
						})
					}))
					.filter((group) => group.items.length > 0);
			}, [aerials, needle]);

			if (aerials === null || typeof aerials !== "object") return null;
			if (aerials.available !== true || aerials.pending === 0) return null;
			const matched = groups.reduce((sum, group) => sum + group.items.length, 0);
			/**
			* The shelf folds as a whole, and it arrives open: the categories are the
			* wall, this is the lid, and a reader who is done with the missing films
			* can put the whole map away without losing the way to Settings.
			*/
			const showBody = sectionOpen !== false;
			const sectionToggle = t(showBody ? "aerials.collapse" : "aerials.expand", { name: t("aerials.title") });

			return h("section", { className: "dsl-appear-aerials", "aria-label": t("aerials.title") }, [
				h("div", { className: "dsl-appear-aerialsHead", key: "head" }, [
					h("div", { className: "dsl-appear-aerialsTitles", key: "titles" }, [
						h("h2", { className: "dsl-appear-aerialsTitle", key: "title" }, t("aerials.title")),
						h(
							"p",
							{ className: "dsl-appear-aerialsBlurb", key: "blurb" },
							t("aerials.blurb", {
								pending: aerials.pending,
								downloaded: aerials.downloaded,
								total: aerials.total
							})
						)
					]),
					h(
						"button",
						{
							type: "button",
							className: "dsl-appear-aerialsOpen",
							key: "open",
							disabled: opening === true,
							onClick: onOpen
						},
						opening === true ? t("aerials.opening") : t("aerials.open")
					),
					h(
						"button",
						{
							type: "button",
							className: "dsl-appear-groupToggle",
							key: "sectionToggle",
							"aria-expanded": showBody ? "true" : "false",
							"aria-label": sectionToggle,
							title: sectionToggle,
							onClick: () => onToggleSection(showBody === false)
						},
						h("span", { className: "dsl-appear-groupToggleChevron", "aria-hidden": "true" })
					),
				]),
				showBody ? h("p", { className: "dsl-appear-aerialsHint", key: "hint" }, t("aerials.hint")) : null,
				!showBody
					? null
					: matched === 0
						? h("p", { className: "dsl-appear-aerialsEmpty", key: "empty" }, t("aerials.empty"))
						: groups.map((group) => {
							const open = openChoice[group.id] === undefined ? searching === true : openChoice[group.id] === true;
							const toggle = t(open ? "aerials.collapse" : "aerials.expand", { name: group.name });
							const folded = open === false;
							const shown = folded ? group.items.slice(0, FOLDED_ROW) : group.items;
							return h(
								"section",
								{
									className: "dsl-appear-group",
									key: group.id,
									onPointerOver: onShelfPointerOver,
									onPointerLeave: onShelfPointerLeave
								},
								[
								h("div", { className: "dsl-appear-groupHead", key: "head" }, [
									h("h3", { className: "dsl-appear-groupTitle", key: "title" }, group.name),
									h("span", { className: "dsl-appear-groupCount", key: "count" }, t("aerials.count", { n: group.items.length })),
									h(
										"button",
										{
											type: "button",
											className: "dsl-appear-groupToggle",
											key: "toggle",
											"aria-expanded": open ? "true" : "false",
											"aria-label": toggle,
											title: toggle,
											onClick: () => onToggle(group.id, !open)
										},
										h("span", { className: "dsl-appear-groupToggleChevron", "aria-hidden": "true" })
									),
								]),
								h(
									"ul",
									{
										className: "dsl-appear-aerialsGrid",
										key: "grid",
										"data-folded": folded ? "1" : "0",
										"aria-label": `${t("aerials.title")} · ${group.name}`
									},
									shown.map((item) => h(AerialTile, { key: item.id, item, t, busy: opening === true, onOpen }))
								)
							]);
					})
			]);
		}

		/**
		* The Appearance Library page.
		*
		* Reads the exported catalogue once, then filters it locally: 40 tiles is a
		* page, not a search problem, and a local filter has no latency to hide.
		* What is in flight is per wallpaper — an apply, a removal, a seam
		* re-encode — and every one of them is shown on the tile it belongs to.
		*
		* Browsing and committing are separate acts here. A click used to repaint
		* the whole app, which made looking at a wallpaper the same gesture as
		* switching to it; now the card opens the drawer, and only the drawer's own
		* button (or the card's hover check, for people who already know) commits.
		*/
		function AppearanceLibraryPage(props) {
			const { t } = props;
			const [state, setState] = useState({ status: "loading" });
			/**
			* The four things worth surviving a panel switch. The shell unmounts a
			* panel the moment another one opens, so a search term typed and a
			* scroll position earned are kept in session storage and replayed: coming
			* back to the library should feel like coming back to a page, not to a
			* page that reloaded.
			*/
			const [query, setQuery] = useState(() => readUiValue(UI_STATE_KEYS.query, ""));
			const [cluster, setCluster] = useState(() => readUiValue(UI_STATE_KEYS.cluster, "all"));
			const [view, setView] = useState(() =>
				readUiValue(UI_STATE_KEYS.view, VIEW_MODES.grid) === VIEW_MODES.list ? VIEW_MODES.list : VIEW_MODES.grid
			);
			const [applies, setApplies] = useState({});
			const [activeSkin, setActiveSkin] = useState(null);
			const [toast, setToast] = useState(null);
			/** True while the toast plays its exit animation; the node unmounts one beat later. */
			const [toastOut, setToastOut] = useState(false);
			const [opening, setOpening] = useState(false);
			const [importing, setImporting] = useState(null);
			/** The pictures still waiting for a frame; null when the panel is closed. */
			const [cropQueue, setCropQueue] = useState(null);
			const [noteOpen, setNoteOpen] = useState(false);
			/** The wallpaper whose drawer is open; its last value outlives the close. */
			const [detailId, setDetailId] = useState(null);
			const [removing, setRemoving] = useState(null);
			/**
			* Re-cutting a film's loop seam is a minutes-long encode on the host,
			* so the switch stays disabled for the one id in flight — and the
			* panel keeps showing which film that is while it runs.
			*/
			const [seamPending, setSeamPending] = useState(null);
			const [restoring, setRestoring] = useState(null);
			/** Whether the control strip is currently pinned under the top edge. */
			const [stuck, setStuck] = useState(false);
			/**
			* Which aerial categories the reader opened. Everything arrives folded, because
			* 153 cards is a wall; a search opens what it matched, and a header the reader has
			* touched keeps their answer instead. The choice lives on the page rather than in
			* the section so that re-rendering the section cannot lose it.
			*/
			const [aerialOpen, setAerialOpen] = useState(() => ({}));
			const onToggleAerial = (id, next) => setAerialOpen((prev) => ({ ...prev, [id]: next }));
			/**
			* Whether the not-downloaded shelf is on screen at all. It starts open,
			* because its categories are already folded: this is one more lid on the
			* same box, not another wall of cards.
			*/
			const [aerialSectionOpen, setAerialSectionOpen] = useState(true);
			const onToggleAerialSection = (next) => setAerialSectionOpen(next === true);
			/**
			* Which of the library's own groups the reader opened. The choice lives on
			* the page rather than in the group so that a re-render cannot lose it.
			*/
			const [groupOpen, setGroupOpen] = useState(() => ({}));
			const onToggleGroup = (key, next) => setGroupOpen((prev) => ({ ...prev, [key]: next }));
			const abortRef = useRef(null);
			/**
			* Whether an apply in this session already decided the active skin. A
			* later read of the persisted document — a refresh, or the panel being
			* reactivated — must never overwrite a choice the user just made: the
			* persisted selection is the starting point, not the truth.
			*/
			const chosenRef = useRef(false);
			const searchRef = useRef(null);
			const scrollRef = useRef(null);
			const toolbarRef = useRef(null);
			const jumpRef = useRef(null);
			const focusRef = useRef(null);
			const detailScrollRef = useRef(0);
			const lastDetailRef = useRef(null);
			const scrollTimerRef = useRef(null);

			/**
			* The page's own fetch, resolved at call time rather than memoised from
			* render-time globals: binding it during render makes the loader a new
			* value on every commit, which would re-run the load effect and re-fetch
			* the catalogue forever.
			*/
			const transport = useCallback(() => (typeof fetch === "function" ? fetch.bind(globalThis) : null), []);

			const load = useCallback(async () => {
				abortRef.current?.abort();
				const controller = typeof AbortController === "function" ? new AbortController() : null;
				abortRef.current = controller;
				const fetchImpl = transport();
				if (fetchImpl === null) {
					setState({ status: "error", reason: "fetch unavailable" });
					return;
				}
				setState((previous) => ({
					status: "loading",
					stale: previous?.stale === true,
					catalog: previous?.catalog,
					reason: previous?.reason,
					lastGoodAt: previous?.lastGoodAt ?? null,
				}));
				try {
					const catalog = await loadCatalog(fetchImpl, controller?.signal, siteLanguage());
					setState({ status: "ready", stale: false, catalog, reason: void 0, lastGoodAt: Date.now() });
					if (chosenRef.current === false) setActiveSkin(catalog.activeSkin);
					setNoteOpen(catalog.built === false);
				} catch (error) {
					if (controller?.signal?.aborted === true) return;
					setState((previous) => failureTransition(previous, error));
				}
			}, [transport]);

			useEffect(() => {
				load();
				return () => abortRef.current?.abort();
			}, [load]);

			useEffect(() => {
				takeProbe({ transport: transport() });
			}, [transport]);

			/**
			* Open Settings → Wallpaper, the surface that owns aerial downloads.
			*
			* The panel cannot download a 4K film itself — no public API does, and
			* fetching Apple's CDN per tile is not this plugin's business — so the
			* click hands the user over and then says so.
			*/
			const onOpenSettings = useCallback(async () => {
				const fetchImpl = transport();
				if (fetchImpl === null) return;
				setOpening(true);
				try {
					const response = await fetchImpl(`${API_BASE}/open-wallpaper-settings`, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: "{}"
					});
					const payload = await response.json();
					if (payload?.ok !== true) throw new Error(payload?.error ?? "open rejected");
					setToast({ tone: "ok", text: t("aerials.opened") });
				} catch (error) {
					setToast({ tone: "error", text: t("aerials.failed", { reason: String(error?.message ?? error) }) });
				} finally {
					setOpening(false);
				}
			}, [transport, t]);

			/** The two failures the host names by code, and a fallback for the rest. */
			const importFailure = useCallback(
				(error) => {
					const code = typeof error?.code === "string" ? error.code : "";
					if (code === "unsupported-format") return t("import.unsupported");
					if (code === "too-large") return t("import.tooLarge");
					return t("import.failed", { reason: String(error?.message ?? error) });
				},
				[t]
			);

			/**
			* Import one batch of pictures, then re-read the library.
			*
			* One request at a time, in order: every request runs a real export, and
			* parallel ones would rewrite the same skin root at once. The first
			* failure stops the batch — the host's answer says why, and continuing
			* would only repeat it. The count travels in the button, so a batch of
			* ten never looks like a batch that hung.
			*/
			const onImportFiles = useCallback(
				async (files, crop = null) => {
					const fetchImpl = transport();
					const list = Array.from(files ?? []).filter((file) => file !== null && typeof file === "object");
					if (fetchImpl === null || list.length === 0) {
						setToast({ tone: "error", text: t("import.none") });
						return;
					}
					let done = 0;
					let named = null;
					let failure = null;
					for (let index = 0; index < list.length; index += 1) {
						const file = list[index];
						const label = typeof file.name === "string" && file.name !== "" ? file.name : t("import.action");
						setImporting({ name: label, done: index + 1, total: list.length });
						if (typeof file.size === "number" && file.size > IMPORT_MAX_BYTES) {
							failure = Object.assign(new Error("too large"), { code: "too-large" });
							break;
						}
						try {
							const entry = await importImage(fetchImpl, file, undefined, crop);
							named = entry?.name ?? named;
							done += 1;
						} catch (error) {
							failure = error;
							break;
						}
					}
					setImporting(null);
					if (failure !== null) {
						setToast({
							tone: "error",
							text: done === 0 ? importFailure(failure) : t("import.partial", { done, failed: list.length - done })
						});
					} else {
						setToast({
							tone: "ok",
							text: list.length === 1 ? t("import.done", { name: named ?? list[0].name ?? "" }) : t("import.many", { n: done })
						});
					}
					if (done > 0) await load();
				},
				[transport, t, importFailure, load]
			);

			/**
			* Ask the shell for pictures. The picker is the platform's, built on
			* demand and never rendered: one click, one dialog, and a multi-select
			* that hands the whole batch to the same sequential import.
			*/
			const onPickImages = useCallback(() => {
				const doc = globalThis.document;
				if (doc === undefined || typeof doc.createElement !== "function") {
					setToast({ tone: "error", text: t("import.failed", { reason: "no file picker" }) });
					return;
				}
				const input = doc.createElement("input");
				input.type = "file";
				input.accept = IMPORT_ACCEPT;
				input.multiple = true;
				input.addEventListener?.("change", () => {
					const picked = Array.from(input.files ?? []);
					input.value = "";
					if (picked.length > 0) setCropQueue({ files: picked, index: 0 });
				});
				input.click?.();
			}, [t]);

			/**
			* Walk the import queue: the next picture to frame, or nothing left.
			*
			* The panel is the picker's second half: pictures arrive one at a time,
			* each keeps its own framing, and closing the panel drops the rest — a
			* batch is a convenience, never a commitment.
			*/
			const advanceCrop = useCallback(() => {
				setCropQueue((queue) => {
					if (queue === null) return null;
					const next = queue.index + 1;
					return next >= queue.files.length ? null : { ...queue, index: next };
				});
			}, []);

			/** The two failures the host names by code, and a fallback for the rest. */
			const removeFailure = useCallback(
				(error) => {
					const code = typeof error?.code === "string" ? error.code : "";
					if (code === "in-use") return t("remove.inUse");
					if (code === "source-gone") return t("remove.sourceGone");
					return t("remove.failed", { reason: String(error?.message ?? error) });
				},
				[t]
			);

			/**
			* Ask the skin center to re-read the catalogue it read at boot.
			*
			* Its picker is built from that snapshot, so after a removal it would
			* still offer a skin that is gone, and after a restore it would miss
			* the one that came back. Best-effort: that runtime belongs to another
			* plugin, and this panel's own list is already correct either way.
			*/
			const refreshSkinRuntime = useCallback(async () => {
				const runtime = skinRuntime(globalThis.window?.document);
				if (runtime === null || typeof runtime.refreshCatalog !== "function") return;
				try {
					await runtime.refreshCatalog();
				} catch {
					// Courtesy call; nothing to report.
				}
			}, []);

			/**
			* Re-stage the skin that is on stage, so a film swapped on disk is
			* the film that plays.
			*
			* A booted document does not re-read a file it already painted from, so
			* after the host swaps the cut the layer keeps showing the old frames
			* until something rebuilds it. Switching the active skin through the
			* skin center does exactly that, and is a no-op for every other tile.
			*/
			const restageActiveSkin = useCallback(async (skinId) => {
				const runtime = skinRuntime(globalThis.window?.document);
				if (runtime === null || typeof runtime.controller?.switchTo !== "function") return;
				try {
					await runtime.refreshCatalog();
					const found = typeof runtime.find === "function" ? runtime.find(skinId) : null;
					if (found !== null) await runtime.controller.switchTo(skinId, found);
				} catch {
					// Courtesy call; the preference itself is already recorded.
				}
			}, []);

			/** Bring one removed wallpaper back: the host re-runs the export for it. */
			const onRestore = useCallback(
				async (record) => {
					const fetchImpl = transport();
					if (fetchImpl === null) return;
					setRestoring(record.id);
					try {
						await restoreWallpaper(fetchImpl, record.id);
						await load();
						await refreshSkinRuntime();
						setToast({ tone: "ok", text: t("remove.restored", { name: record.nameZh ?? record.id }) });
					} catch (error) {
						setToast({ tone: "error", text: removeFailure(error) });
					} finally {
						setRestoring(null);
					}
				},
				[transport, t, removeFailure, load, refreshSkinRuntime]
			);

			/**
			* Delete one wallpaper.
			*
			* The host does the work — it knows which skins it authored, refuses
			* the one in use, and records the removal so the next export cannot
			* bring it back. Nothing is asked first: the deletion is one copy in
			* DSH's own folder, the strip below keeps the record, and the toast
			* offers the undo for eight seconds, which is a better bargain than a
			* dialog nobody reads.
			*/
			const onRemove = useCallback(
				async (entry) => {
					const fetchImpl = transport();
					if (fetchImpl === null) return;
					setDetailId((current) => (current === entry.id ? null : current));
					setRemoving(entry.id);
					try {
						await removeWallpaper(fetchImpl, entry.id);
						await load();
						await refreshSkinRuntime();
						setToast({
							tone: "ok",
							text: t("remove.done", { name: entry.nameZh }),
							action: {
								label: t("undo.remove"),
								busy: restoring === entry.id,
								onClick: () => {
									void onRestore({ id: entry.id, nameZh: entry.nameZh });
								}
							}
						});
					} catch (error) {
						// A refusal can mean this page's idea of the active skin is
						// stale (the selection changed in another window), so the
						// catalogue is re-read before the message is shown.
						if (error?.code === "in-use") await load();
						setToast({ tone: "error", text: removeFailure(error) });
					} finally {
						setRemoving(null);
					}
				},
				[transport, t, removeFailure, load, refreshSkinRuntime, onRestore, restoring]
			);

			/**
			* Turn one film's seamless loop on or off.
			*
			* The host owns the encode: it records the preference and re-runs the
			* export for this one id, which takes minutes. The catalogue is read
			* again afterwards so the switch shows what actually landed rather
			* than what was asked for — and on failure the host rolls the
			* preference back, so the tile returns to the truth on its own.
			*/
			const onToggleSeam = useCallback(
				async (entry, enabled) => {
					const fetchImpl = transport();
					if (fetchImpl === null) return;
					setSeamPending(entry.id);
					try {
						await postWallpaperAction(fetchImpl, "seam-loop", entry.id, undefined, { enabled });
						await load();
						/* The film on disk just changed under the layer that is painted
						   from it; re-stage that skin so the new cut is what plays. */
						if (entry.skin === activeSkin) await restageActiveSkin(entry.skin);
						setToast({ tone: "ok", text: t(enabled ? "seam.on" : "seam.off", { name: entry.nameZh }) });
					} catch (error) {
						await load();
						setToast({ tone: "error", text: t("seam.failed", { reason: error?.code ?? error?.message ?? "" }) });
					} finally {
						setSeamPending(null);
					}
				},
				[transport, t, load, activeSkin, restageActiveSkin]
			);

			const catalog = state.status === "ready" ? state.catalog : null;
			const activeId = useMemo(() => {
				if (catalog === null) return null;
				return catalog.wallpapers.find((wallpaper) => wallpaper.skin === activeSkin)?.id ?? null;
			}, [catalog, activeSkin]);

			/**
			* Put one wallpaper on stage.
			*
			* The switch itself is instant when the skin center is loaded, so the
			* inline progress is held for a beat rather than flashed: feedback that
			* appears and vanishes inside one frame reads as a glitch, not as work.
			*/
			const onApply = useCallback(
				async (entry) => {
					const fetchImpl = transport();
					if (fetchImpl === null) return;
					setApplies((previous) => ({ ...previous, [entry.id]: { status: "pending", skin: entry.skin } }));
					const floor = new Promise((resolve) => globalThis.setTimeout(resolve, APPLY_MIN_MS));
					try {
						const [result] = await Promise.all([
							applyWallpaper({ fetchImpl, doc: globalThis.window?.document }, entry),
							floor
						]);
						setApplies((previous) => ({ ...previous, [entry.id]: { status: "done", skin: result.activeSkin } }));
						// One wallpaper is on stage at a time: every other tile stops
						// reporting itself as the applied one, live switch or not.
						chosenRef.current = true;
						setActiveSkin(result.activeSkin);
						setToast({ tone: "ok", text: result.live ? t("apply.done", { name: entry.nameZh }) : t("apply.localOnly") });
					} catch (error) {
						await floor;
						setApplies((previous) => ({
							...previous,
							[entry.id]: { status: "failed", skin: entry.skin, reason: String(error?.message ?? error) }
						}));
						setToast({ tone: "error", text: t("apply.failed", { reason: String(error?.message ?? error) }) });
					}
				},
				[transport, t]
			);

			/** A toast that carries an action lives as long as the action is useful. */
			useEffect(() => {
				if (toast === null) return undefined;
				const life = toast.action === undefined ? TOAST_MS : UNDO_MS;
				// Exit is symmetric with the entrance: same axis (translateY) and the same
				// --mds-dur-base clock. A newer toast clears both timers and replaces the node,
				// so two in a row never queue (a toast is a status, not a message stream).
				const leave = globalThis.setTimeout(() => setToastOut(true), life);
				const gone = globalThis.setTimeout(() => {
					setToast(null);
					setToastOut(false);
				}, life + TOAST_EXIT_MS);
				return () => {
					globalThis.clearTimeout(leave);
					globalThis.clearTimeout(gone);
				};
			}, [toast]);

			/** One group's wallpapers, after the search and cluster filters. */
			const visibleGroups = useMemo(() => {
				if (catalog === null) return [];
				const needle = query.trim().toLowerCase();
				const match = (entry) =>
					needle === "" ||
					`${entry.name} ${entry.nameZh} ${entry.skin} ${entry.cluster}`.toLowerCase().includes(needle);
				return catalog.groups
					.filter((group) => cluster === "all" || group.key === cluster)
					.map((group) => ({
						...group,
						wallpapers: group.ids.map((id) => catalog.byId.get(id)).filter((entry) => entry !== undefined && match(entry))
					}))
					.filter((group) => group.wallpapers.length > 0);
			}, [catalog, query, cluster]);

			const visibleCount = visibleGroups.reduce((sum, group) => sum + group.wallpapers.length, 0);

			/** A filter restored from storage can name a group this library no longer has. */
			useEffect(() => {
				if (catalog === null || cluster === "all") return;
				if (catalog.groups.some((group) => group.key === cluster)) return;
				setCluster("all");
				writeUiValue(UI_STATE_KEYS.cluster, "all");
			}, [catalog, cluster]);

			/**
			* Remember where the collection was scrolled to, per source.
			*
			* Scrolling is the one thing this page does constantly, so the write is
			* debounced and the read happens once per source change — and the sticky
			* bar's own shadow is driven from the same handler, without a second
			* listener or an observer.
			*/
			const onScroll = useCallback(() => {
				const node = scrollRef.current;
				if (node === null) return;
				const bar = toolbarRef.current;
				if (bar !== null) setStuck(bar.getBoundingClientRect().top <= node.getBoundingClientRect().top + 1);
				if (scrollTimerRef.current !== null) return;
				scrollTimerRef.current = globalThis.setTimeout(() => {
					scrollTimerRef.current = null;
					let map = {};
					try {
						map = JSON.parse(readUiValue(UI_STATE_KEYS.scroll, "{}")) ?? {};
					} catch {
						map = {};
					}
					map[cluster] = node.scrollTop;
					writeUiValue(UI_STATE_KEYS.scroll, JSON.stringify(map));
				}, 180);
			}, [cluster]);

			useEffect(
				() => () => {
					if (scrollTimerRef.current !== null) globalThis.clearTimeout(scrollTimerRef.current);
				},
				[]
			);

			useEffect(() => {
				if (state.status !== "ready") return undefined;
				const node = scrollRef.current;
				if (node === null) return undefined;
				let map = {};
				try {
					map = JSON.parse(readUiValue(UI_STATE_KEYS.scroll, "{}")) ?? {};
				} catch {
					map = {};
				}
				const saved = map[cluster];
				node.scrollTop = typeof saved === "number" && Number.isFinite(saved) ? saved : 0;
				return undefined;
			}, [state.status, cluster, view]);

			/**
			* Open one wallpaper's drawer.
			*
			* The scroll offset is taken here and given back on close: the drawer
			* lives inside the same scroll container, so a person who browsed to the
			* fourth row comes back to the fourth row.
			*/
			const openDetail = useCallback((entry) => {
				const node = scrollRef.current;
				detailScrollRef.current = node === null ? 0 : node.scrollTop;
				const active = globalThis.document?.activeElement;
				focusRef.current = active !== null && active !== undefined && typeof active.focus === "function" ? active : null;
				setDetailId(entry.id);
			}, []);

			const closeDetail = useCallback(() => {
				setDetailId(null);
				const node = scrollRef.current;
				const target = detailScrollRef.current;
				const raf = globalThis.requestAnimationFrame ?? ((fn) => globalThis.setTimeout(fn, 0));
				raf(() => {
					if (node !== null) node.scrollTop = target;
					const previous = focusRef.current;
					focusRef.current = null;
					previous?.focus?.();
				});
			}, []);

			/**
			* ⌘K focuses the search box, Escape backs out of whatever is open.
			*
			* Both are document-wide because the panel has no single obvious focus
			* owner: the listener is the cheapest way to make the search reachable
			* from wherever the pointer last was, and Escape then has an order —
			* the drawer first, the filter second.
			*/
			useEffect(() => {
				const doc = globalThis.document;
				if (doc === undefined || typeof doc.addEventListener !== "function") return undefined;
				const onKey = (event) => {
					const key = typeof event.key === "string" ? event.key : "";
					if ((event.metaKey === true || event.ctrlKey === true) && key.toLowerCase() === "k") {
						event.preventDefault();
						searchRef.current?.focus?.();
						searchRef.current?.select?.();
						return;
					}
					if (key !== "Escape") return;
					if (detailId !== null) {
						event.preventDefault();
						closeDetail();
						return;
					}
					if (query !== "") setQuery("");
				};
				doc.addEventListener("keydown", onKey);
				return () => doc.removeEventListener("keydown", onKey);
			}, [detailId, query, closeDetail]);


			/**
			* Jump to the top of one source's section.
			*
			* The segments double as a table of contents: pressing the source that is
			* already selected scrolls to it rather than doing nothing, which is what
			* people expect from a filter they can see the results of. The scroll
			* itself is deferred to the effect below so it runs after the section
			* exists in the new layout.
			*/
			const onCluster = useCallback(
				(key) => {
					setCluster(key);
					writeUiValue(UI_STATE_KEYS.cluster, key);
					if (key === "all") {
						const node = scrollRef.current;
						node?.scrollTo?.({ top: 0 });
						return;
					}
					jumpRef.current = key;
				},
				[]
			);

			useEffect(() => {
				const key = jumpRef.current;
				if (key === null) return;
				jumpRef.current = null;
				const node = scrollRef.current;
				if (node === null || typeof node.querySelector !== "function") return;
				const target = node.querySelector(`[data-group="${key}"]`);
				if (target === null || target === undefined) return;
				const top = target.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop - 60;
				node.scrollTo?.({ top: Math.max(0, top) });
			}, [visibleGroups]);

			/**
			* Arrow keys walk the grid the way it looks, not the way it is stored.
			*
			* The column count is measured from the laid-out tiles instead of being
			* computed from the container width, so a wrapped last row and a
			* breakpoint change both stay correct for free.
			*/
			const onGridKeyDown = useCallback((event) => {
				const key = event.key;
				if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "ArrowDown" && key !== "ArrowUp") return;
				const current = event.target;
				if (current === null || current === undefined || typeof current.getAttribute !== "function") return;
				if (current.getAttribute("data-tile") === null) return;
				const tiles = Array.from(event.currentTarget.querySelectorAll("[data-tile]"));
				const index = tiles.indexOf(current);
				if (index < 0 || tiles.length === 0) return;
				const top = tiles[0].offsetTop;
				const columns = Math.max(1, tiles.filter((tile) => tile.offsetTop === top).length);
				const step = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : key === "ArrowDown" ? columns : -columns;
				const next = index + step;
				if (next < 0 || next >= tiles.length || next === index) return;
				event.preventDefault();
				tiles[next].focus();
			}, []);

			const head = h("header", { className: "dsl-appear-head", key: "head" }, [
				h("div", { className: "dsl-appear-titles", key: "titles" }, [
					h("h1", { className: "dsl-appear-title", key: "title" }, t("title")),
					h(
						"p",
						{ className: "dsl-appear-subtitle", key: "sub" },
						catalog === null
							? t("subtitle")
							: `${t("subtitle.count", {
									total: catalog.wallpapers.length,
									still: catalog.wallpapers.filter((wallpaper) => wallpaper.kind === "image").length,
									motion: catalog.wallpapers.filter((wallpaper) => wallpaper.kind === "video").length
								})}${catalog.generatedAt === null ? "" : ` · ${t("subtitle.generated", { time: catalog.generatedAt.slice(0, 16).replace("T", " ") })}`}`
					)
				]),
				h(
					"div",
					{ className: "dsl-appear-headActions", key: "actions" },
					h(
						primitives.Button,
						{
							variant: "outline",
							size: "sm",
							icon: h(primitives.IconPlusOutlineRegular, { size: 13 }),
							"aria-label": t("import.label"),
							title: t("import.hint"),
							disabled: importing !== null,
							onClick: onPickImages
						},
						importing === null
							? t("import.action")
							: t("import.progress", { done: importing.done, total: importing.total, name: importing.name })
					),
					h(
						primitives.Button,
						{
							variant: "outline",
							size: "sm",
							icon: h(primitives.IconRefreshOutlineRegular, { size: 13 }),
							"aria-label": t("refresh.label"),
							disabled: state.status === "loading",
							onClick: load
						},
						t("refresh")
					)
				)
			]);

			let body;
			if (state.status === "loading") {
				body = h("div", { key: "loading" }, [
					h("p", { className: "dsl-appear-stateBody", key: "label", role: "status", style: { margin: "0 auto" } }, t("state.loading")),
					h(GallerySkeleton, { key: "skeleton", count: 8 })
				]);
			} else if (state.status === "error") {
				body = h(StateBlock, {
					key: "error",
					title: t("state.error.title"),
					body: state.reason,
					action: h(primitives.Button, { variant: "outline", size: "sm", onClick: load }, t("state.retry"))
				});
			} else if (catalog.wallpapers.length === 0) {
				body = h(StateBlock, {
					key: "none",
					title: t("state.none.title"),
					body: t("state.none.body"),
					command: t("state.none.cmd")
				});
			} else if (visibleCount === 0) {
				body = h(StateBlock, {
					key: "match",
					title: t("state.match.title"),
					body: t("state.match.body"),
					action: h(
						primitives.Button,
						{
							variant: "outline",
							size: "sm",
							onClick: () => {
								setQuery("");
								writeUiValue(UI_STATE_KEYS.query, "");
								onCluster("all");
							}
						},
						t("state.match.action")
					)
				});
			} else {
				body = h(
					"div",
					{ className: "dsl-appear-groups", key: "groups" },
					visibleGroups.map((group) => {
						/**
						* Folded on arrival for the same reason Apple's categories are: a wall of
						* cards is not an index. A search, or a filter that already narrowed the
						* page to this one shelf, opens it instead; once the reader has touched
						* the header their answer wins.
						*/
						const open =
							groupOpen[group.key] === undefined
								? query.trim() !== "" || cluster !== "all"
								: groupOpen[group.key] === true;
						const toggle = t(open ? "group.collapse" : "group.expand", { name: group.nameZh });
						const folded = open === false;
						const shown = folded ? group.wallpapers.slice(0, FOLDED_ROW) : group.wallpapers;
						return h(
							"section",
							{
								className: "dsl-appear-group",
								key: group.key,
								"data-group": group.key,
								onPointerOver: onShelfPointerOver,
								onPointerLeave: onShelfPointerLeave
							},
							[
							h("div", { className: "dsl-appear-groupHead", key: "head" }, [
								h("h2", { className: "dsl-appear-groupTitle", key: "title" }, group.nameZh),
								h("p", { className: "dsl-appear-groupBlurb", key: "blurb" }, group.blurb ?? ""),
								h("span", { className: "dsl-appear-groupCount", key: "count" }, t("group.count", { n: group.wallpapers.length })),
								h(
									"button",
									{
										type: "button",
										className: "dsl-appear-groupToggle",
										key: "toggle",
										"aria-expanded": open ? "true" : "false",
										"aria-label": toggle,
										title: toggle,
										onClick: () => onToggleGroup(group.key, open === false)
									},
									h("span", { className: "dsl-appear-groupToggleChevron", "aria-hidden": "true" })
								)
							]),
							view === VIEW_MODES.list
								? h(
										"ul",
										{
											className: "dsl-appear-rows",
											key: "rows",
											"data-folded": folded ? "1" : "0",
											"aria-label": `${t("list.label")} · ${group.nameZh}`
										},
										shown.map((entry) =>
											h(WallpaperRow, {
												key: entry.id,
												entry,
												active: activeId === entry.id,
												pending: applies[entry.id]?.status === "pending",
												failed: applies[entry.id]?.status === "failed",
												onOpen: openDetail,
												onQuick: onApply,
												t
											})
										)
									)
								: h(
										"ul",
										{
											className: "dsl-appear-grid",
											"data-folded": folded ? "1" : "0",
											key: "grid",
											"aria-label": `${t("grid.label")} · ${group.nameZh}`,
											onKeyDown: onGridKeyDown
										},
										shown.map((entry) =>
											h(WallpaperTile, {
												key: entry.id,
												entry,
												active: activeId === entry.id,
												applying: applies[entry.id]?.status === "pending",
												failed: applies[entry.id]?.status === "failed",
												busy: removing === entry.id,
												seamBusy: seamPending === entry.id,
												onOpen: openDetail,
												onQuick: onApply,
												onRemove,
												onToggleSeam,
												t
											})
										)
									)
						]);
					})
				);
			}

			/**
			* The drawer keeps the last wallpaper it showed so it can slide back out
			* with something in it; the id alone would blank it mid-animation.
			*/
			const detailEntry = useMemo(() => {
				if (catalog === null) return lastDetailRef.current;
				if (detailId === null) return lastDetailRef.current;
				const found = catalog.byId.get(detailId) ?? null;
				if (found !== null) lastDetailRef.current = found;
				return found;
			}, [catalog, detailId]);

			const controls =
				catalog === null
					? null
					: 							h(LibraryToolbar, {
							key: "toolbar",
							barRef: toolbarRef,
								t,
								query,
								cluster,
								groups: catalog.groups,
								total: visibleCount,
								view,
								stuck,
								searchRef,
								onQuery: (value) => {
									setQuery(value);
									writeUiValue(UI_STATE_KEYS.query, value);
								},
								onCluster,
								onView: (mode) => {
									setView(mode);
									writeUiValue(UI_STATE_KEYS.view, mode);
								}
						});

			return h("div", { className: "dsl-appear-page" }, [
				h(
					"div",
					{ className: "dsl-appear-pageScroll", key: "scroll", ref: scrollRef, onScroll },
					h("div", { className: "dsl-appear-pageContent", key: "content" }, [
						head,
						props.skin
							? h(SkinSettingsSection, {
									key: "skin",
									t,
									skin: props.skin,
									onToast: (message, tone) => setToast({ tone, text: message })
								})
							: null,
						controls,
						noteOpen && catalog !== null
							? h(LibraryNote, { key: "note", entry: catalog.entry, onClose: () => setNoteOpen(false), t })
							: null,
						body,
						catalog === null
							? null
							: h(AerialPendingSection, { key: "aerials", aerials: catalog.aerials, query, t, opening, onOpen: onOpenSettings, openChoice: aerialOpen, onToggle: onToggleAerial, sectionOpen: aerialSectionOpen, onToggleSection: onToggleAerialSection }),
						toast === null
							? null
							: h(
									"div",
									{ className: "dsl-appear-toastWrap", key: "toast" },
									h(
										"div",
										{
											className: `dsl-appear-toast${toast.tone === "error" ? " dsl-appear-toastError" : ""}${toastOut ? " is-out" : ""}`,
											role: "status"
										},
										[
											h("span", { key: "text" }, toast.text),
											toast.action === undefined
												? null
												: h(
														"button",
														{
															type: "button",
															key: "action",
															className: "dsl-appear-toastAction",
															disabled: toast.action.busy === true,
															onClick: toast.action.onClick
														},
														toast.action.busy === true ? t("undo.restoring") : toast.action.label
													)
										]
									)
								),
						h("p", { className: "dsl-appear-hint", key: "hint" }, t("hint.exclusive"))
					])
				),
				h("div", {
					className: "dsl-appear-scrim",
					key: "scrim",
					"data-open": detailId === null ? "0" : "1",
					"aria-hidden": "true",
					onClick: closeDetail
				}),
				h(DetailDrawer, {
					key: "drawer",
					entry: detailEntry,
					open: detailId !== null && detailEntry !== null,
					active: detailEntry !== null && activeId === detailEntry.id,
					pending: detailEntry !== null && applies[detailEntry.id]?.status === "pending",
					failed: detailEntry !== null && applies[detailEntry.id]?.status === "failed",
					seamBusy: detailEntry !== null && seamPending === detailEntry.id,
					onClose: closeDetail,
					onApply,
					onRemove,
					onToggleSeam,
					t
				}),
				cropQueue === null
					? null
					: h(CropPanel, {
							key: "crop",
							t,
							file: cropQueue.files[cropQueue.index] ?? null,
							index: cropQueue.index + 1,
							total: cropQueue.files.length,
							busy: importing !== null,
							onApply: (rect) => {
								const current = cropQueue.files[cropQueue.index] ?? null;
								advanceCrop();
								if (current !== null) void onImportFiles([current], rect);
							},
							onSkip: advanceCrop,
							onCancel: () => setCropQueue(null)
						})
			]);
		}
		//#region skin
		/** True when a value already looks like the flat background section. */
		function isSkinSection(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			return SKIN_FIELD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
		}
		/**
		* The path a write walks before it reaches the background section: empty when the
		* bound scope already is the section, otherwise the namespace. A profile entry
		* owns several namespaces, so its form nests them one level down.
		* @param value - the scope's raw value, or undefined.
		* @returns the keys to prepend to a section field.
		*/
		function skinPathPrefix(value) {
			return isSkinSection(value) ? [] : [SKIN_BACKGROUND_NS];
		}
		/**
		* Project one scope snapshot onto the background section, so the panel sees the
		* same fields no matter which shape the bound scope has.
		* @param snapshot - a settings scope snapshot.
		* @returns the section's status, value, revision and write prefix.
		*/
		function skinSection(snapshot) {
			const source = snapshot === null || snapshot === undefined ? {} : snapshot;
			const value = source.value;
			const scope = source.status === "ready" && value !== null && typeof value === "object" ? value : undefined;
			const prefix = skinPathPrefix(scope);
			return {
				status: source.status === undefined ? "unavailable" : source.status,
				writable: source.writable === true,
				revision: source.revision,
				value: scope === undefined ? undefined : prefix.length === 0 ? scope : scope[SKIN_BACKGROUND_NS],
				prefix
			};
		}
		/** One write operation, prefixed for whichever shape the bound scope has. */
		function skinOps(prefix, field, value) {
			return [{ op: "set", path: (prefix === undefined || prefix === null ? [] : prefix).concat([field]), value }];
		}
		/** The section's fields, filled with defaults, for controls that always have a value. */
		function skinValues(section) {
			const source = section !== undefined && section.value !== null && typeof section.value === "object" ? section.value : {};
			const out = {};
			SKIN_FIELD_KEYS.forEach((key) => {
				out[key] = typeof source[key] === "boolean" || typeof source[key] === "number" ? source[key] : SKIN_DEFAULTS[key];
			});
			return out;
		}
		/**
		* Overlay the live document on the section's values, so a change made on the
		* settings page — which writes that document, not the shared section — shows up
		* here too. A field the user just moved keeps its own value until its write has
		* had time to land, or the control would snap back under the pointer.
		* @param base - the section's values, defaults filled in.
		* @param live - the live background document, or null when it was never read.
		* @param owned - field -> time until which the panel's own value wins.
		* @param now - the current time in milliseconds.
		* @returns a fresh value object.
		*/
		function skinLiveValues(base, live, owned, now) {
			if (live === null || typeof live !== "object") return base;
			const out = Object.assign({}, base);
			SKIN_FIELD_KEYS.forEach((key) => {
				const until = owned === null || owned === undefined ? undefined : owned[key];
				if (typeof until === "number" && until > now) return;
				const value = live[key];
				if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) out[key] = value;
			});
			return out;
		}
		/**
		* Translate through the bridge's own dictionary, falling back to the panel's.
		* @param scope - a locale binding, or null.
		* @param fallback - the panel's translator.
		* @returns a translate function.
		*/
		function skinTranslator(scope, fallback) {
			return (key, params) => {
				const value = scope !== null && scope !== undefined && typeof scope.t === "function" ? (params === undefined ? scope.t(key) : scope.t(key, params)) : key;
				return value === key ? fallback(key, params) : value;
			};
		}
		/** A locale binding for a namespace, or null when the service is missing. */
		function skinLocale(ctx, ns) {
			try {
				return ctx.locale.bind(ns);
			} catch (error) {
				return null;
			}
		}
		/** Whether the block was left open; a panel preference, so it is forgiving. */
		function readSkinOpen() {
			try {
				return globalThis.localStorage?.getItem(SKIN_OPEN_KEY) !== "0";
			} catch (error) {
				return true;
			}
		}
		/** Remembers the block's open state across panels. */
		function writeSkinOpen(open) {
			try {
				globalThis.localStorage?.setItem(SKIN_OPEN_KEY, open ? "1" : "0");
			} catch (error) {
				// A browser without storage keeps the default.
			}
		}
		/**
		* The bridge between this panel and the skin configuration section.
		*
		* Settings are never changed through the skin center's HTTP surface: the panel
		* binds the same shared settings form the settings page binds, writes the
		* section, and lets the skin center's own subscription repaint the background
		* and persist it. A bare HTTP write would only show up after a restart, while a
		* write here is live in both directions.
		* @param ctx - browser plugin context.
		* @returns the bridge, or null when no configuration service is served.
		*/
		function createSkinSettingsBridge(ctx) {
			const lookup = (name) => {
				try {
					return typeof ctx.get === "function" ? ctx.get(name) : undefined;
				} catch (error) {
					return undefined;
				}
			};
			let bound = null;
			let viaBinder = false;
			const binder = lookup("webUiSettings");
			if (binder !== undefined && binder !== null && typeof binder.bind === "function") {
				bound = binder.bind({ namespace: SKIN_BACKGROUND_NS });
				viaBinder = true;
			}
			if (bound === null || bound === undefined) {
				const forms = lookup("configForms");
				if (forms !== undefined && forms !== null && typeof forms.get === "function") {
					for (const entryId of SKIN_ENTRY_IDS) {
						try {
							const candidate = forms.get(entryId);
							if (candidate !== null && candidate !== undefined && typeof candidate.getSnapshot === "function" && typeof candidate.subscribe === "function") {
								bound = candidate;
								break;
							}
						} catch (error) {
							// That entry is not served in this profile; try the next candidate.
						}
					}
				}
			}
			if (bound === null || bound === undefined || typeof bound.getSnapshot !== "function" || typeof bound.subscribe !== "function") return null;
			const theme = lookup("theme");
			const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
			let queue = [];
			let timer = null;
			let disposed = false;
			const write = (field, value) => {
				if (disposed) return Promise.resolve(false);
				const section = skinSection(bound.getSnapshot());
				if (section.writable !== true) return Promise.resolve(false);
				let result;
				try {
					result = bound.mutate(skinOps(section.prefix, field, value), section.revision);
				} catch (error) {
					queue.push({ field, value });
					return Promise.resolve(false);
				}
				return Promise.resolve(result).then(
					(ok) => {
						if (ok === false && disposed === false) queue.push({ field, value });
						return ok !== false;
					},
					() => {
						if (disposed === false) queue.push({ field, value });
						return false;
					}
				);
			};
			const flush = () => {
				if (timer !== null) {
					clearTimeout(timer);
					timer = null;
				}
				const batch = queue;
				queue = [];
				batch.forEach((entry) => write(entry.field, entry.value));
			};
			const themeCall = (method, ...args) => {
				if (theme === undefined || theme === null || typeof theme[method] !== "function") return undefined;
				try {
					return theme[method](...args);
				} catch (error) {
					return undefined;
				}
			};
			return {
				available: true,
				dictionary: null,
				subscribe: (listener) => bound.subscribe(listener),
				getSnapshot: () => skinSection(bound.getSnapshot()),
				getTheme: () => themeCall("getTheme"),
				setTheme: (next) => themeCall("setTheme", next),
				subscribeTheme: (listener) => {
					if (theme === undefined || theme === null || typeof theme.subscribe !== "function") return () => {};
					const off = theme.subscribe(listener);
					return typeof off === "function" ? off : () => {};
				},
				/** Debounced, so dragging a slider is one write instead of forty. */
				set: (field, value) => {
					queue = queue.filter((entry) => entry.field !== field);
					queue.push({ field, value });
					if (timer !== null) clearTimeout(timer);
					timer = setTimeout(flush, SKIN_WRITE_DEBOUNCE);
				},
				flush,
				setEnabled: (enabled) => write("enabled", enabled === true),
				/** The same integrity check the settings page runs; it repairs and changes no skin. */
				verify: async () => {
					if (fetchImpl === null) throw new Error("no transport");
					const response = await fetchImpl(SKIN_VERIFY_URL, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ autoRepair: true })
					});
					const payload = await response.json().catch(() => null);
					if (!response.ok || payload === null || payload.ok !== true) throw new Error("verify failed");
					return payload;
				},
				/**
				* The live background document, or null when it cannot be read. This is a
				* read-only view: writes go through the shared section, which is what makes
				* them take effect without a reload.
				* @returns the background fields, or null.
				*/
				read: async () => {
					if (fetchImpl === null) return null;
					try {
						const response = await fetchImpl(SKIN_V2_ACTIVE_URL, { method: "GET", headers: { accept: "application/json" } });
						if (!response.ok) return null;
						const payload = await response.json();
						const background = payload === null || typeof payload !== "object" ? null : payload.background;
						return background !== null && background !== undefined && typeof background === "object" ? background : null;
					} catch (error) {
						return null;
					}
				},
				dispose: () => {
					disposed = true;
					if (timer !== null) {
						clearTimeout(timer);
						timer = null;
					}
					if (viaBinder && typeof bound.dispose === "function") {
						try {
							bound.dispose();
						} catch (error) {
							// Already gone; nothing left to release.
						}
					}
				}
			};
		}
		/**
		* The skin settings block: the enable switch, the theme choice, the integrity
		* check and the four background sliders, all reading the section the
		* settings page reads.
		* @param props - { t, skin, onToast }.
		*/
		function SkinSettingsSection(props) {
			const { t, skin, onToast } = props;
			const translate = typeof skin.dictionary === "function" ? skin.dictionary : t;
			const [open, setOpen] = useState(() => readSkinOpen() !== false);
			const [snapshot, setSnapshot] = useState(() => skin.getSnapshot());
			const [theme, setTheme] = useState(() => skin.getTheme() ?? null);
			const [integrity, setIntegrity] = useState("idle");
			const [values, setValues] = useState(() => skinValues(snapshot));
			const [draft, setDraft] = useState(() => skinValues(snapshot));
			/** True while the controls mirror the section; false while a drag owns them. */
			const relative = useRef(true);
			const pending = useRef(null);
			const restore = useRef(null);
			/** The last section snapshot, so an out-of-band read can be merged into it. */
			const section = useRef(snapshot);
			/** The live document as last read; null until the first read answers. */
			const liveDoc = useRef(null);
			/** Field -> the time until which the panel's own value outranks the document. */
			const owned = useRef({});
			/** The section's values, with the live document laid over them. */
			const display = (value) => skinLiveValues(skinValues(value), liveDoc.current, owned.current, Date.now());
			useEffect(() => {
				const off = skin.subscribe(() => setSnapshot(skin.getSnapshot()));
				return typeof off === "function" ? off : undefined;
			}, [skin]);
			useEffect(() => {
				const off = skin.subscribeTheme(() => setTheme(skin.getTheme() ?? null));
				return typeof off === "function" ? off : undefined;
			}, [skin]);
			useEffect(() => {
				section.current = snapshot;
				setValues(display(snapshot));
			}, [snapshot]);
			useEffect(() => {
				setDraft((current) => (relative.current ? values : current));
			}, [values]);
			useEffect(() => {
				const commit = () => {
					if (relative.current) return;
					relative.current = true;
					const batch = pending.current === null ? [] : pending.current;
					pending.current = null;
					batch.forEach((entry) => skin.set(entry[0], entry[1]));
				};
				const timer = setTimeout(commit, SKIN_WRITE_DEBOUNCE);
				return () => clearTimeout(timer);
			}, [draft]);
			useEffect(() => () => skin.flush(), [skin]);
			useEffect(() => {
				if (open === false || typeof skin.read !== "function") return undefined;
				let alive = true;
				let timer = null;
				const pull = () => {
					if (timer !== null) {
						clearTimeout(timer);
						timer = null;
					}
					Promise.resolve()
						.then(() => skin.read())
						.then(
							(background) => {
								if (alive === false || background === null) return;
								liveDoc.current = background;
								setValues(display(section.current));
							},
							() => {}
						)
						.then(() => {
							if (alive) timer = setTimeout(pull, SKIN_READ_INTERVAL);
						});
				};
				pull();
				const view = typeof window === "undefined" ? null : window;
				const onFocus = () => pull();
				if (view !== null && typeof view.addEventListener === "function") view.addEventListener("focus", onFocus);
				return () => {
					alive = false;
					if (timer !== null) clearTimeout(timer);
					if (view !== null && typeof view.removeEventListener === "function") view.removeEventListener("focus", onFocus);
				};
			}, [skin, open]);
			const change = (key, value) => {
				relative.current = false;
				owned.current[key] = Date.now() + SKIN_OWN_MS;
				pending.current = (pending.current === null ? [] : pending.current).filter((entry) => entry[0] !== key);
				pending.current.push([key, value]);
				if (restore.current !== null) clearTimeout(restore.current);
				restore.current = setTimeout(() => {
					restore.current = null;
					relative.current = true;
				}, SKIN_WRITE_DEBOUNCE * 4);
				setDraft((current) => Object.assign({}, current, { [key]: value }));
			};
			const toggle = () => {
				const enabled = values.enabled === false;
				owned.current.enabled = Date.now() + SKIN_OWN_MS;
				setDraft((current) => Object.assign({}, current, { enabled }));
				setValues((current) => Object.assign({}, current, { enabled }));
				skin.setEnabled(enabled);
			};
			const chooseTheme = (next) => {
				setTheme(next);
				skin.setTheme(next);
			};
			const verify = () => {
				if (integrity === "running") return;
				setIntegrity("running");
				Promise.resolve()
					.then(() => skin.verify())
					.then(
						(report) => {
							setIntegrity("idle");
							const issues = typeof report.issues === "number" ? report.issues : Array.isArray(report.issues) ? report.issues.length : 0;
							onToast(issues === 0 ? translate("skin.verify.ok", { count: report.total }) : translate("skin.verify.issues", { count: issues }), issues === 0 ? "ok" : "error");
						},
						(error) => {
							setIntegrity("idle");
							onToast(translate("skin.verify.failed", { reason: String(error?.message ?? error) }), "error");
						}
					);
			};
			const loading = snapshot.status === "loading";
			const readonly = snapshot.writable !== true;
			const themeChoice = theme === "light" || theme === "dark" ? theme : null;
			const themeKey = (mode) => (mode === "light" ? "skin.theme.light" : "skin.theme.dark");
			const slider = (spec) => {
				const value = draft[spec.key];
				return h("div", { className: "dsl-appear-skinField", key: spec.key }, [
					h("div", { className: "dsl-appear-skinFieldHead", key: "head" }, [
						h("label", { className: "dsl-appear-skinLabel", key: "label", htmlFor: "dsl-appear-skin-" + spec.key }, translate(spec.labelKey)),
						h("span", { className: "dsl-appear-skinValue", key: "value" }, String(value) + spec.unit)
					]),
					h("input", {
						key: "range",
						id: "dsl-appear-skin-" + spec.key,
						className: "dsl-appear-skinRange",
						type: "range",
						min: spec.min,
						max: spec.max,
						step: spec.step,
						value,
						disabled: readonly,
						"aria-label": translate(spec.labelKey),
						onChange: (event) => change(spec.key, Number(event.target.value))
					}),
					h("p", { className: "dsl-appear-skinHint", key: "hint" }, translate(spec.hintKey))
				]);
			};
			const body = [
				h("div", { className: "dsl-appear-skinToggle", key: "toggle" }, [
					h("div", { className: "dsl-appear-skinToggleText", key: "text" }, [
						h("span", { className: "dsl-appear-skinLabel", key: "label" }, translate("skin.enabled")),
						h("p", { className: "dsl-appear-skinHint", key: "hint" }, translate("skin.enabled.hint"))
					]),
					h(
						"button",
						{
							key: "switch",
							type: "button",
							className: "dsl-appear-skinSwitch",
							role: "switch",
							"aria-checked": values.enabled === false ? "false" : "true",
							disabled: readonly,
							onClick: toggle
						},
						h("span", { className: "dsl-appear-skinSwitchKnob", key: "knob" })
					)
				]),
				h("div", { className: "dsl-appear-skinTools", key: "tools" }, [
					h("div", { className: "dsl-appear-skinTool", key: "theme" }, [
						h("span", { className: "dsl-appear-skinLabel", key: "label" }, translate("skin.theme")),
						h(
							"div",
							{ className: "dsl-appear-skinSegments", key: "segments" },
							["light", "dark"].map((mode) =>
								h(
									"button",
									{
										key: mode,
										type: "button",
										className: "dsl-appear-skinSegment",
										"aria-pressed": themeChoice === mode ? "true" : "false",
										onClick: () => chooseTheme(mode)
									},
									translate(themeKey(mode))
								)
							)
						)
					]),
					h("div", { className: "dsl-appear-skinTool", key: "verify" }, [
						h(
							primitives.Button,
							{ key: "action", variant: "secondary", size: "sm", disabled: integrity === "running", onClick: verify },
							translate(integrity === "running" ? "skin.verifying" : "skin.verify")
						)
					])
				]),
				SKIN_SLIDERS.map(slider),
				loading ? h("p", { className: "dsl-appear-skinHint", key: "loading" }, translate("skin.loading")) : null,
				loading === false && readonly ? h("p", { className: "dsl-appear-skinHint", key: "readonly" }, translate("skin.readonly")) : null
			];
			return h("section", { className: "dsl-appear-skin", "data-open": open ? "1" : "0" }, [
				h(
					"button",
					{
						key: "head",
						type: "button",
						className: "dsl-appear-skinHead",
						"aria-expanded": open ? "true" : "false",
						onClick: () => {
							const next = open === false;
							setOpen(next);
							writeSkinOpen(next);
						}
					},
					[
						h(primitives.IconChevronRightOutlineRegular, { key: "chevron", size: 14, className: "dsl-appear-skinChevron" }),
						h("div", { className: "dsl-appear-skinTitles", key: "titles" }, h("span", { className: "dsl-appear-skinTitle", key: "title" }, translate("skin.title"))),
						h("span", { className: "dsl-appear-skinBadge", key: "badge" }, loading ? translate("skin.loading") : themeChoice === null ? "" : translate(themeKey(themeChoice)))
						]
				),
				open === false ? null : h("div", { className: "dsl-appear-skinBody", key: "body" }, body)
			]);
		}
		//#endregion

		//#region plugin
		/** Services required by this browser plugin. */
		const inject = ["slots", "locale"];
		/**
		* Register the Appearance Library sidebar row and the main panel it opens.
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
				"appearance-library: dictionaries"
			);
			const t = ctx.locale.bind(NS);
			/**
			* Settings → 皮肤 and this panel write the same section, so the block works
			* only when a configuration service is served; without one the panel stays
			* exactly what it was.
			*/
			const skin = (() => {
				try {
					return createSkinSettingsBridge(ctx);
				} catch (error) {
					ctx.logger?.warn?.("appearance-library: skin settings unavailable", error);
					return null;
				}
			})();
			if (skin !== null) {
				skin.dictionary = skinTranslator(skinLocale(ctx, NS), t);
				ctx.effect(() => () => skin.dispose(), "appearance-library: skin settings bridge");
			}
			/* The transcript cut is this panel's own contract with the shell, not
			   part of the settings bridge: it must run even on a profile that
			   serves no configuration service. */
			ctx.effect(() => startSeatCut(), "appearance-library: transcript cut at the composer seat");
			ctx.slots.inject("main", () =>
				ctx.slots.register(
					{
						name: "main",
						key: PANEL_ID,
						locale: NS,
						inject: () => ({ t, skin })
					},
					AppearanceLibraryPage
				)
			);
			ctx.slots.inject("sidebar.panellist", () =>
				ctx.slots.register(
					{
						name: "sidebar.panellist",
						id: PANEL_ID,
						order: 6,
						locale: NS,
						label: () => t("panel")
					},
					AppearanceIcon
				)
			);
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		/** Exposed for the package's own offline tests; the Loader ignores unknown exports. */
		/**
		 * A failed reload must not blank the library: the catalogue already on screen
		 * stays, the failure becomes a `stale` attribute, and `lastGoodAt` remembers
		 * when it was last true. Only a load with nothing to show is the error face —
		 * an empty catalogue counts as nothing, the same rule the other two panels use
		 * (`rows.length === 0` there; a catalogue object only exists when it has tiles).
		 */
		function failureTransition(previous, error) {
			const catalog = previous !== null && typeof previous === "object" ? previous.catalog : void 0;
			const lastGoodAt = typeof previous?.lastGoodAt === "number" ? previous.lastGoodAt : null;
			const reason = typeof error === "string" ? error : String(error?.message ?? error);
			const kept = Array.isArray(catalog?.wallpapers) ? catalog.wallpapers.length : 0;
			if (kept === 0) return { status: "error", stale: false, catalog: void 0, reason, lastGoodAt };
			return { status: "ready", stale: true, catalog, reason, lastGoodAt };
		}
		/** Which face the panel paints: one branch per state, never two at once. */
		function bodyKind(state) {
			const status = typeof state?.status === "string" ? state.status : "loading";
			if (status === "loading") return state?.catalog === void 0 ? "loading" : "list";
			if (status === "error") return "failed";
			if (status === "ready" && state.stale === true) return "stale";
			return "list";
		}
		exports.__internals = {
			failureTransition,
			bodyKind,
			PACKAGE_NAME,
			PREVIEW_SIZES,
			UI_STATE_KEYS,
			VIEW_MODES,
			previewUrl,
			aerialPreviewUrl,
			entryBytes,
			formatResolution,
			cropRect,
			formatCrop,
			CropPanel,
			CROP_RATIOS,
			LibraryToolbar,
			GallerySkeleton,
			WallpaperRow,
			DetailDrawer,
			NS,
			PANEL_ID,
			takeProbe,
			API_BASE,
			css,
			zh,
			en,
			formatBytes,
			loadCatalog,
			importImage,
			applyWallpaper,
			removeWallpaper,
			restoreWallpaper,

			ensureStyles,
			startSeatCut,
			syncSeatCut,
			SEAT_CUT_ATTR,
			AppearanceLibraryPage,
			AppearanceIcon,
			WallpaperTile,
			LibraryNote,
			StateBlock,
			SKIN_BACKGROUND_NS,
			SKIN_DEFAULTS,
			SKIN_SLIDERS,
			isSkinSection,
			skinPathPrefix,
			skinSection,
			skinValues,
			skinLiveValues,
			createSkinSettingsBridge,
			SkinSettingsSection
		};
		return module.exports;
