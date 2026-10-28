window.__ModuleLoader__.load({
	id: "muciya-dsh-plugin-appearance-library",
	factory: (require) => {
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
		/** Where the host half serves the exported library. */
		const API_BASE = "/api/muciya-appearance/v1";
		/**
		 * Hover tokens — ported from the retired `dsh-plugin-hover-tokens` package.
		 * A pure stylesheet layer: one <style> that re-points the theme hover design
		 * tokens (plus the few places that never went through a token), so it needs no
		 * slot and no host route. Kept as a self-contained closure so the original
		 * module keeps its own `exports`, and the appearance library stays the single
		 * package that owns visual styling.
		 */
		var __hoverTokens = (function () {
			var module = { exports: {} };
			var exports = module.exports;
			Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		/** This package's manifest name; the loader id and the style tag agree. */
		const PACKAGE_NAME = "muciya-dsh-plugin-appearance-library";
		/** Inline style tag identity, so a reload replaces this stylesheet instead of stacking it. */
		const CSS_TAG_ID = `${PACKAGE_NAME}/HoverTokens.css`;

		//#region palette
		/** The three layers, in light theme. */
		const LIGHT = { neutral: "#2631480f", accent: "#f1f3f5", danger: "#ec13130d" };
		/** The same three layers in dark theme. */
		const DARK = { neutral: "#ffffff14", accent: "#353638", danger: "#f25a5a26" };
		//#endregion

		//#region stylesheet
		/**
		* The whole palette.
		*
		* Kept as an array of lines rather than a template literal so the comment
		* banner can hold the layer legend without fighting `${}` interpolation.
		*/
		const css = [
			"/* ==========================================================================",
			"   DSH Hover Tokens — 全 UI 的悬停底色收敛到三层",
			"",
			"   ① 中性  --dsh-hover-neutral   普通按钮 / 列表行 / 图标按钮 / 菜单项 / 标签页",
			"   ② 强调  --dsh-hover-accent    实心按钮 / 浮层按钮 / 工具条 / 卡片 / 层级切换",
			"   ③ 危险  --dsh-hover-danger    删除 / 停止 / 破坏性确认",
			"",
			"   锚点分三档，靠特异性而不是 !important 取胜（理由见 lib/client.js 文件注释）：",
			"     html body                          (0,0,2)  app 主题表的 body (0,0,1)",
			"     html[data-dsh-skin]×3 body         (0,3,2)  皮肤 skin.css 抢同一批令牌，它用的是",
			"                                                 html[data-dsh-skin=…] body (0,1,2)",
			"     html[data-dsh-custom-theme]×3 body (0,3,2)  自定义主题用的是",
			"                                                 html[data-dsh-custom-theme]:not(…) body (0,2,2)",
			"   重复的属性选择器只为提权，不改变匹配范围；深色档再加 body[data-ds-dark-theme] 到 (0,4,2)。",
			"   ========================================================================== */",
			"",
			"/* ---------- 三层取值 + 悬停令牌重定向 ---------- */",
			"html[data-dsh-skin][data-dsh-skin][data-dsh-skin] body,",
			"html[data-dsh-custom-theme][data-dsh-custom-theme][data-dsh-custom-theme] body,",
			"html body{",
			"  --dsh-hover-neutral:#2631480f;",
			"  --dsh-hover-accent:#f1f3f5;",
			"  --dsh-hover-danger:#ec13130d;",
			"",
			"  /* 面板底色：比中性悬停重一档，只给各「库」页面的容器用（见文件末尾）。",
			"     面板是常在的衬底、悬停是一闪的反馈，两者同档会分不开；又因为侧栏那层",
			"     深色背景会把半透明底色吃掉一截，这里按 12% / 16% 取值。 */",
			"  --dsh-panel-fill:#2631482b;",
			"",
			"  /* ① 中性层：interactive-bg-hover 本身就是全 UI 的基准（111 处消费），钉住它的取值；",
			"     另外三个原本各自偏离的悬停令牌一并归位。 */",
			"  --dsw-alias-interactive-bg-hover:var(--dsh-hover-neutral);",
			"  --dsw-alias-button-tool-bar-hover:var(--dsh-hover-neutral);",
			"  --dsw-specific-sidebar-nav-item-hover:var(--dsh-hover-neutral);",
			"  --dsw-alias-turn-trigger-bg-hover:var(--dsh-hover-neutral);",
			"",
			"  /* ② 强调层：hover-solid 与 button-floating-hover 本来就是 bluish-75 / bluish-800，",
			"     取值与强调层相同；ghost-active-hover 本体没有消费点，补上定义供 profile 插件使用。 */",
			"  --dsw-alias-interactive-bg-hover-solid:var(--dsh-hover-accent);",
			"  --dsw-alias-button-floating-hover:var(--dsh-hover-accent);",
			"  --dsw-alias-button-ghost-active-hover:var(--dsh-hover-accent);",
			"",
			"  /* ③ 危险层 */",
			"  --dsw-alias-interactive-bg-hover-danger:var(--dsh-hover-danger);",
			"",
			"  /* 滚动条滑块 hover：l1 与 l2 在深色主题下原本是两个灰（neutral-600 / neutral-550），",
			"     收敛为一个。滑块是指示器而不是按钮，所以它用自己的灰阶，不占用上面三层。 */",
			"  --dsw-alias-scrollbar-hover-l2:var(--dsw-alias-scrollbar-hover-l1);",
			"}",
			"",
			"html[data-dsh-skin][data-dsh-skin][data-dsh-skin] body[data-ds-dark-theme],",
			"html[data-dsh-custom-theme][data-dsh-custom-theme][data-dsh-custom-theme] body[data-ds-dark-theme],",
			"html body[data-ds-dark-theme]{",
			"  --dsh-hover-neutral:#ffffff14;",
			"  --dsh-hover-accent:#353638;",
			"  --dsh-hover-danger:#f25a5a26;",
			"  --dsh-panel-fill:#ffffff38;",
			"}",
			"",
			"/* ---------- 没走令牌的悬停底色：逐点重新指向三层 ---------- */",
			"",
			"/* 侧栏「新会话」。darwin 下它是毛玻璃 elevated 按钮，常态 #ffffff8c / #ffffff26，悬停原本",
			"   在浅色主题里变淡（#ffffff4d）、在深色主题里变浓（#fff3）——同一次交互在两个主题里走相反",
			"   方向。收编到强调层：材质在悬停时由玻璃转为实体，而不是单纯改透明度，这也更接近 macOS 的",
			"   反馈方式（hover 时材质实化，而不是褪色）。 */",
			"/* 常态不要那圈容器外观（毛玻璃底 + .5px 描边）——与旁边一排无底色的导航行并排时，它读起来",
			"   像输入框而不是按钮；但保留中性层做底，让主操作仍有块面感（浅色 #2631480f、深色 #ffffff14，",
			"   跟随主题切换）。",
			"   三重属性选择器只为压过 [data-platform=darwin] [data-ds-dark-theme] .l4U6KG_newSession 的",
			"   (0,3,0)——同属常态规则，两重写法会低它一级而压不住。",
			"   后面三个 :not 是必需的：按钮内部还有 newSessionContent / newSessionLabelMask /",
			"   newSessionShortcut 三个容器同样含 newSession 子串，只写一个属性匹配会把它们一起刷上底色，",
			"   叠出两层（LabelMask 含 newSessionLabel，被第一个 :not 吸收）。 */",
			"html body [class*='_newSession']:not([class*='_newSessionLabel']):not([class*='_newSessionContent']):not([class*='_newSessionShortcut']){",
			"  background:var(--dsh-hover-neutral);",
			"  border-color:transparent;",
			"}",
			"html body [class*='_newSession']:not([class*='_newSessionLabel']):not([class*='_newSessionContent']):not([class*='_newSessionShortcut']):hover{",
			"  background:var(--dsh-hover-accent);",
			"}",
			"/* 输入框左下角的「+」：常态底来自 --dsw-specific-selector，是那一行里唯一的实心圆，",
			"   与右侧常态无底的「完全权限」下拉不对称。归零；悬停仍走 solid 变体（＝强调层）。 */",
			"html body .VERcba_add{",
			"  background:transparent;",
			"}",
			"/* 侧栏折叠后它退化成 36×36 图标按钮（透明底），回到中性层。 */",
			"html body [class*='_collapsed'] [class*='_newSession']:not([class*='_newSessionLabel']):not([class*='_newSessionContent']):not([class*='_newSessionShortcut']):hover{",
			"  background:var(--dsh-hover-neutral);",
			"}",
			"",
			"/* 任务面板：行与区块开关原本用 --dsw-alias-fill-l1 —— 那是通用填充色，不是悬停语义，",
			"   顺带也让这里的悬停重量和别处对不上；就地指向中性层。 */",
			"html body .gQzDxW_row:hover,",
			"html body .gQzDxW_rowLineLive:hover,",
			"html body .gQzDxW_sectionToggle:hover,",
			"html body .gQzDxW_sectionClear:hover{",
			"  background:var(--dsh-hover-neutral);",
			"}",
			"/* 红色「停止」按钮指向危险层（原本是 error 色 12% 的 color-mix）。 */",
			"html body .gQzDxW_stopArmed:hover{",
			"  background:var(--dsh-hover-danger);",
			"}",
			"",
			"/* 计划卡片的 chip：原本是 business 蓝的 color-mix，收敛为中性。 */",
			"html body ._26Rndq_chip:hover:not(:disabled){",
			"  background:var(--dsh-hover-neutral);",
			"}",
			"",
			"/* 组件局部定义的悬停变量，原本一律取 neutral-100 / neutral-800 —— 与强调层的 bluish 灰",
			"   相差 2~4/255，肉眼看不出，但确实是三份独立的取值。 */",
			"html body ._2ktL-W_card{--changes-hover:var(--dsh-hover-accent)}",
			"html body .md6BpW_root{--deliverable-hover:var(--dsh-hover-accent)}",
			"html body .L2WvEa_card{--plan-card-hover:var(--dsh-hover-accent)}",
			"html body .kqO1Qa_card{--card-hover:var(--dsh-hover-accent)}",
			"",
			"/* 跨插件对齐：外观库面板（dsh-plugin-appearance-library）里两个深浅不一的红 —— 图标删除键",
			"   rgba(196,54,54,.88) 与确认键 #d13f3f —— 统一到危险色；另两个原本硬编码的白色半透明",
			"   (rgba(255,255,255,.22)) 在浅色主题的浮层上等于没有反馈，换成强调层。更彻底的做法是把",
			"   同样的取值写回该插件的源码（Muciya-DSH-plugin-macOS-suite/src/client/appearance-library.js）。 */",
			"html body .dsl-appear-iconBtn:hover,",
			"html body .dsl-appear-askYes:hover{",
			"  background:var(--dsh-hover-danger);",
			"}",
			"html body .dsl-appear-askNo:hover,",
			"html body .dsl-appear-toastAction:hover{",
			"  background:var(--dsh-hover-accent);",
			"}",
			"",
			"/* ---------- 把「表面层色」直接当悬停底色的第三方规则 ---------- */",
			"/* 市场插件（dshmarket/Market.module.css）与本体几处图标按钮，把 --dsw-alias-bg-layer-1/2 的",
			"   深色解写成了字面量当悬停底：浅色主题下会压出一块深色，皮肤激活时又跟着皮肤变色而失去",
			"   悬停语义。统一回到中性层。类名是 CSS Module 的哈希名，升级后由 test/harness.mjs 报警。 */",
			"html body .nUhMVa_searchClear:hover,",
			"html body .nUhMVa_groupCollapse:hover,",
			"html body .nUhMVa_lightboxClose:hover,",
			"html body ._yHyNG_arrow:hover:not(:disabled),",
			"html body .jPot-W_iconButton:hover,",
			"html body .u9Hv6q_wizardClose:hover,",
			"html body .MQ2ckW_action:hover,",
			"html body ._helpButton_bjqpo_41:hover,",
			"html body .WYT-ka_updateRetry:hover{",
			"  background:var(--dsh-hover-neutral);",
			"}",
			"",
			"/* ---------- 第二轮：把其余「表面层色」当悬停底色的普通按钮与行收编 ---------- */",
			"/* 名单来自页面上「级联后真正生效」的清点（探针，见 README）。只收普通表面元素；",
			"   实心主按钮/危险按钮、:disabled 态、警告状态、选中态 chip 各自的加深色，以及滚动条",
			"   滑块，都按语义保留，不并入三层。 */",
			"html body ._7D6uKa_formSectionHeader:hover,",
			"html body .cvtkAW_refreshBtn:hover:not(:disabled),",
			"html body .cvtkAW_footToggle:hover,",
			"html body .yoSR5W_rowSelected:hover,",
			"html body .RyVjlW_chipActive:hover:not(:disabled),",
			"html body ._7D6uKa_ghostButton[data-active='true']:hover:not(:disabled),",
			"html body .nUhMVa_lightboxNav:hover,",
			"html body .nUhMVa_confirmCopy:hover,",
			"html body .nUhMVa_groupAddPick:hover,",
			"html body .nUhMVa_commentsGithubAction:hover,",
			"html body .dsl-appear-search:hover,",
			"html body ._0BdbEW_reference:hover,",
			"html body .dspl_tuneButton:hover,",
			"html body .PKpMdG_model:hover,",
			"html body .MQ2ckW_more:hover:not(:disabled),",
			"html body .QsOBKa_rowOverdue:hover,",
			"html body .fxNqkW_ruleIntervalArrow:hover:not(:disabled),",
			"html body .dshDesktopSettingsUrlCopy:hover,",
			"html body[data-dsh-skin-center] .TJMolG_ratingFilterActive:hover,",
			"html body[data-dsh-skin-center] .TJMolG_dirBrowserCrumbButton:hover,",
			"html body[data-dsh-skin-center] .TJMolG_dirBrowserEntry:hover,",
			"html body [data-platform='darwin'] [data-ds-dark-theme] .l4U6KG_newSession:hover{",
			"  background:var(--dsh-hover-neutral);",
			"}",
			"",
			"/* 危险语义：链接式危险操作、市场危险按钮、皮肤中心危险按钮 */",
			"html body .yoSR5W_linkDanger:hover:not(:disabled),",
			"html body .nUhMVa_dangerBtn.nUhMVa_dangerBtn:hover:not(:disabled),",
			"html body[data-dsh-skin-center] .TJMolG_buttonDanger:hover:not(:disabled){",
			"  background:var(--dsh-hover-danger);",
			"}",
			"",
			"/* ---------- 各「库」页面的面板底色统一 ----------",
			"   侧边栏那五个库的面板容器各自引用 --dsw-alias-bg-layer-1|2|3，而这三层",
			"   正是皮肤按壁纸逐层改写的对象，于是同一排面板在不同库里的色调各不相同。",
			"   在容器上就地重定义这几层：子树里 color-mix(... bg-layer-N ...) 会跟着",
			"   一起收敛，不必逐个元素改 background。骨架占位写成",
			"   var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-3))，前者有值就走",
			"   前者，所以缩略图与加载占位不受影响。",
			"   settings-card-fill 要一起改：.dsl-appear-skin / .dsl-appear-note 用的是",
			"   var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2))，只改",
			"   bg-layer 会被前者短路掉。 */",
			"html body .dsl-appear-search,",
			"html body .dsl-appear-skin,",
			"html body .dsl-appear-clear,",
			"html body .dsl-appear-searchKey,",
			"html body .dsl-appear-segment,",
			"html body .dsl-appear-drawerFoot,",
			"html body .dsl-appear-stateCmd,",
			"html body .dsl-appear-note,",
			"html body .dsl-appear-toast,",
			"html body .dsl-skilllib-tag,",
			"html body .dsl-skilllib-badge,",
			"html body .dsl-skilllib-code,",
			"html body .u9Hv6q_guide,",
			"html body .u9Hv6q_registryToggle,",
			"html body .u9Hv6q_registryCustomField,",
			"html body .u9Hv6q_attemptBadge,",
			"html body .u9Hv6q_installField,",
			"html body .nUhMVa_top,",
			"html body .nUhMVa_stickyHead,",
			"html body .nUhMVa_banner,",
			"html body .nUhMVa_card,",
			"html body .nUhMVa_themeCard,",
			"html body .nUhMVa_backupCard,",
			"html body .nUhMVa_opPanel,",
			"html body .nUhMVa_setCard,",
			"html body .nUhMVa_setCardOpen{",
			"  --dsw-alias-bg-layer-1:var(--dsh-panel-fill);",
			"  --dsw-alias-bg-layer-2:var(--dsh-panel-fill);",
			"  --dsw-alias-bg-layer-3:var(--dsh-panel-fill);",
			"  --dsw-alias-settings-card-fill:var(--dsh-panel-fill);",
			"}",
			"",
			"/* ---------- 页面底色统一 ---------- */",
			"   皮肤的 skin.css 把 --dsw-alias-bg-base 从实色（静态 neutral-bluish-00/950）改成了",
			"   半透明（rgba(…, scrim×0.5)），于是「谁画了这一层、画了几层」开始决定亮度。",
			"   现状是对话区只有 layout 的 centerCol 那一层，而各 panel 内部又自己画一层，",
			"   两边差一档，看上去就像「对话区没有底色」。这里统一成：centerCol 补到同样的",
			"   浓度，panel 内部那层停掉，全应用共用同一个页面底。 */",
			"html body [class*='_centerCol']{",
			"  /* 叠一层同色渐变，等效于把 bg-base 再压一次，与 panel 内部两层的浓度对齐 */",
			"  background-image:linear-gradient(var(--dsw-alias-bg-base),var(--dsw-alias-bg-base));",
			"}",
			"html body [class*='_page']:not([class*='_pageHead']),",
			"html body .dsl-skilllib-page{",
			"  background:transparent;",
			"}",
		].join("\n");

		/** Install the stylesheet once per page. */
		function ensureStyles() {
			if (typeof document === "undefined") return;
			const existing = document.querySelector(`style[data-plugin-css="${CSS_TAG_ID}"]`);
			if (existing !== null) {
				// 热重载时 style 标签还在，只换内容，否则改完 CSS 要等整页刷新才生效
				existing.textContent = css;
				return;
			}
			const tag = document.createElement("style");
			tag.dataset.plugin = PACKAGE_NAME;
			tag.dataset.pluginCss = CSS_TAG_ID;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		/** Take the stylesheet back out — hover colours return to the built-in palette. */
		function removeStyles() {
			if (typeof document === "undefined") return;
			const tag = document.querySelector(`style[data-plugin-css="${CSS_TAG_ID}"]`);
			if (tag !== null) tag.remove();
		}
		//#endregion

		/**
		* Contribute the stylesheet; a pure-CSS plugin needs no other primitive.
		* @param ctx - Browser plugin context.
		*/

		function apply(ctx) {
			ensureStyles();
			ctx.effect(() => () => removeStyles(), "hover-tokens: stylesheet");
		}

		exports.apply = apply;
		/** Exposed for the package's own offline tests; the Loader ignores unknown exports. */
		exports.__internals = { PACKAGE_NAME, CSS_TAG_ID, LIGHT, DARK, css };
			return module.exports;
		})();

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
		/** Inline style tag identity, so a reload replaces this plugin's CSS instead of stacking it. */
		const CSS_TAG_ID = `${PACKAGE_NAME}/AppearanceLibrary.module.css`;
		/** How far a press pushes a tile in, in scale units. */
		const PRESS_SCALE = 0.985;
		/** The skin center's background namespace: one section, two faces. */
		const SKIN_BACKGROUND_NS = "skin-background";
		/** Profile entries whose schema nests that section; the first served one wins. */
		const SKIN_ENTRY_IDS = ["web-ui-skin-center", "ui-skin-center", SKIN_BACKGROUND_NS];
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
			"filter.label": "按分类筛选",
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
			"compress.label": "压缩",
			"compress.hint": "把原片重新编码为 1080p H.264：体积降到四分之一左右，任何显卡都能轻松播放，代价是分辨率与细节。需要几分钟。",
			"compress.action": "把《{name}》压缩到 1080p",
			"compress.busy": "压缩中…",
			"compress.done": "《{name}》已压缩为 1080p。",
			"compress.failed": "压缩失败：{reason}",
			"film.title": "画质与循环",
			"film.hint": "四个组合对应一份影片文件：原画是下载时的 4K 源，1080p 是重新编码后的版本；无缝循环会把首尾做交叉溶解。每次切换都会重写这份文件。",
			"film.native": "原画",
			"film.compressed": "1080p",
			"film.plain": "普通循环",
			"film.seam": "无缝循环",
			"film.corner": "原画 + 无缝需要整片重编码 4K，通常数十分钟，文件也接近翻倍。再点一次确认开始。",
			"film.confirm": "确认 4K 重编码",
			"film.noSource": "本机已无源片，无法回到原画",
			"film.busy": "正在重写影片…",
			"film.done": "《{name}》已切换。",
			"film.failed": "切换失败：{reason}",
			"chip.native": "原画",
			"chip.compressed": "1080p",
			"chip.seam": "无缝",
			"chip.plain": "普通",
			"chip.open": "打开《{name}》的画质与循环设置",
			"chip.qualityOpen": "《{name}》画质：{value}，点击打开设置",
			"chip.loopOpen": "《{name}》循环：{value}，点击打开设置",
			"hud.film": "调整《{name}》的画质与循环",
			"hud.preparing": "准备中",
			"hud.working": "编码中",
			"hud.done": "已完成",
			"hud.failed": "失败",
			"hud.compress": "压缩《{name}》",
			"hud.seam": "无缝循环《{name}》",
			"hud.seamOff": "取消无缝循环《{name}》",
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
			"state.none.cmd": "node ~/.dsh-beta/profiles/desktop/plugins/muciya-appearance-library/scripts/export-wallpapers.mjs",
			"state.match.title": "没有匹配的壁纸",
			"state.match.body": "换个关键词试试。",
			"state.match.action": "清除筛选",
			"state.error.title": "读取壁纸库失败",
			"state.retry": "重试",
			"hint.exclusive": "一次只有一张壁纸生效：外观库写的就是当前皮肤选择，应用壁纸等于切换皮肤。",
			"skin.title": "皮肤设置",
			"skin.subtitle": "外观库内的皮肤开关与背景控件。",
			"skin.enabled": "启用皮肤",
			"skin.enabled.hint": "关闭后移除当前皮肤并停用背景控件，重新打开即恢复。",
			"skin.loading": "正在读取皮肤配置…",
			"skin.readonly": "当前配置为只读，改动不会保存。",
			"skin.unavailable.body": "没有连上皮肤配置，本页仍可正常应用壁纸。",
			"skin.backgroundOpacity": "背景遮挡",
			"skin.backgroundOpacity.hint": "即时为面板背后的背景加遮罩——数值越高越能弱化插画，帮你集中注意力。",
			"skin.backgroundBlurEmpty": "空对话背景模糊",
			"skin.backgroundBlurEmpty.hint": "对话为空时的背景高斯模糊强度，0 为关闭。",
			"skin.backgroundBlurContent": "有对话背景模糊",
			"skin.backgroundBlurContent.hint": "对话有内容时的背景高斯模糊强度，0 为关闭。",
			"skin.inputCardBlur": "输入卡模糊",
			"skin.inputCardBlur.hint": "仅模糊输入卡背后的区域，不会让整张壁纸变糊。",
			"aerials.title": "系统航拍",
			"aerials.blurb": "共 {total} 张，{downloaded} 张已下载，还有 {pending} 张没下载。",
			"aerials.open": "打开墙纸设置",
			"aerials.opening": "正在打开…",
			"aerials.opened": "已在系统设置里打开墙纸。",
			"aerials.failed": "打开系统设置失败：{reason}",
			"aerials.badge": "未下载",
			"aerials.done": "已下载",
			"aerials.hint": "橙点是还没下载的，点一下先下载再生成；其余的直接生成皮肤并应用，系统壁纸不受影响。",
			"aerials.count": "{n} 张",
			"aerials.expand": "展开「{name}」",
			"aerials.collapse": "收起「{name}」",
			"aerials.empty": "没有匹配的航拍。",
			"aerials.allDone": "系统航拍都已加入外观库，没有待下载的了。",
			"aerials.tileLabel": "用 {name} 生成 DSH 皮肤",
			"aerials.downloading": "下载中 {percent}%",
			"aerials.downloadingUnknown": "下载中…",
			"aerials.exporting": "正在生成壁纸…",
			"aerials.applying": "正在应用…",
			"aerials.applied": "已加入外观库并应用：{name}",
			"aerials.downloadFailed": "没能加入外观库：{reason}",
			"dynamics.title": "动态壁纸",
			"dynamics.blurb": "系统自带的 {total} 张动态壁纸，与 设置 → 墙纸 → 动态壁纸 一致。",
			"dynamics.hint": "视频与图片可以生成 DSH 皮肤；红杉、Macintosh 是系统实时渲染的 3D 场景，没有静态画面可导出。",
			"dynamics.count": "{n} 张",
			"dynamics.kind.video": "视频",
			"dynamics.kind.image": "图片",
			"dynamics.kind.scene": "3D",
			"dynamics.exportable": "可生成皮肤",
			"dynamics.scene": "系统实时渲染",
			"startup.title": "启动动画",
			"startup.on": "已开启",
			"startup.off": "已关闭",
			"startup.unavailable": "未连接",
			"startup.loading": "正在读取启动动画设置…",
			"startup.subtitle": "开机时鲸鱼跃出水面，再裂开露出界面。",
			"startup.retry": "重试",
			"startup.errorBody": "没有读到启动动画配置，请重试。",
			"startup.enabled": "开机播放动画",
			"startup.enabled.hint": "新开窗口时先放影片、再裂开露出界面；已开窗口重新载入不重播。",
			"startup.clip": "播放的影片",
			"startup.clip.builtin": "内置影片",
			"startup.clip.imported": "导入的影片",
			"startup.video": "启动视频",
			"startup.audio": "启动音频",
			"startup.audio.source": "播放的音频",
			"startup.audio.film": "影片原声",
			"startup.audio.import": "导入音频…",
			"startup.audio.importing": "正在导入…",
			"startup.audio.restore": "恢复影片原声",
			"startup.audio.preview": "试听 3 秒",
			"startup.audio.previewing": "试听中…",
			"startup.audio.imported": "已换成《{name}》，下次开机生效。",
			"startup.audio.importFailed": "音频导入失败：{reason}",
			"startup.audio.restored": "已恢复影片原声。",
			"startup.audio.restoreFailed": "恢复失败：{reason}",
			"startup.audio.hint": "选了独立音频后影片自带的声音会自动静音；音频默认随裂开淡出，也可以设成开始时间或让它播完。",
			"startup.duration": "启动动画时长",
			"startup.duration.hint": "从影片开始到裂开结束的整段长度；倍速自动设为约 {rate}×。",
			"startup.keepFilmAudio": "保留原视频音频",
			"startup.keepFilmAudio.hint": "选了独立音频时，影片自带的声音也一起播（两路会叠在一起）。",
			"startup.audio.start": "音频开始时间",
			"startup.audio.overrun": "载入界面后继续播放",
			"startup.audio.overrun.hint": "不随裂开淡出，让音频自然播完。",
			"startup.import": "导入影片…",
			"startup.importing": "正在导入…",
			"startup.restore": "恢复内置",
			"startup.reveal": "打开文件位置",
			"startup.muted": "静音",
			"startup.volume": "音量",
			"startup.volume.muted": "静音时音量不生效。",
			"startup.advanced": "高级",
			"startup.advanced.hint": "改动下一次新建窗口生效；数值越界会回落到默认值。",
			"startup.newWindowOnly": "只在新建窗口播放",
			"startup.acPowerOnly": "电池供电时不播放",
			"startup.veilAlpha": "纱幕不透明度",
			"startup.waterline": "水线位置",
			"startup.revealMs": "裂开时长",
			"startup.holdMs": "片尾停顿",
			"startup.forceExitMs": "兜底撤离上限",
			"startup.debug": "写诊断日志",
			"startup.imported": "已换成《{name}》，新建窗口生效。",
			"startup.importFailed": "导入失败：{reason}",
			"startup.restored": "已恢复内置影片。",
			"startup.restoreFailed": "恢复失败：{reason}",
			"startup.revealed": "已在 Finder 打开片源目录。",
			"startup.revealFailed": "打开目录失败：{reason}",
			"startup.saveFailed": "保存设置失败：{reason}",
			"startup.loadFailed": "读取启动动画设置失败：{reason}",
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
			"about.close": "关闭说明",
			"usage.title": "今日消费",
			"usage.loading": "读取用量…",
			"usage.error": "用量读取失败",
			"usage.noData": "今天还没有调用",
			"usage.updated": "更新于 {time}",
			"usage.calls": "{n} 次调用",
			"usage.balance": "余额",
			"usage.trend": "近 7 天",
			"usage.collapse": "收起用量卡片",
			"usage.expand": "展开用量卡片",
			"usage.open": "查看今日用量明细"
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
			"filter.label": "Filter by category",
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
			"compress.label": "Compress",
			"compress.hint": "Re-encode the source film as 1080p H.264: roughly a quarter of the bytes and playable on any GPU, at the cost of resolution and detail. Takes a few minutes.",
			"compress.action": "Compress {name} to 1080p",
			"compress.busy": "Compressing…",
			"compress.done": "{name} compressed to 1080p.",
			"compress.failed": "Compression failed: {reason}",
			"film.title": "Quality & loop",
			"film.hint": "Four corners, one file: native is the 4K source that was downloaded, 1080p is the re-encoded cut, and a seam dissolves the two ends together. Changing either rewrites that file.",
			"film.native": "Native",
			"film.compressed": "1080p",
			"film.plain": "Plain loop",
			"film.seam": "Seamless",
			"film.corner": "A native seamless cut re-encodes the whole 4K film — usually tens of minutes, and nearly double the file. Press again to confirm.",
			"film.confirm": "Confirm 4K re-encode",
			"film.noSource": "No source film on this Mac, so native is out of reach",
			"film.busy": "Rewriting the film…",
			"film.done": "{name} switched.",
			"film.failed": "Could not switch: {reason}",
			"chip.native": "Native",
			"chip.compressed": "1080p",
			"chip.seam": "Seamless",
			"chip.plain": "Loop",
			"chip.open": "Open quality and loop settings for {name}",
			"chip.qualityOpen": "Quality of {name}: {value}. Open settings.",
			"chip.loopOpen": "Loop of {name}: {value}. Open settings.",
			"hud.film": "Reshape {name}",
			"hud.preparing": "Preparing",
			"hud.working": "Encoding",
			"hud.done": "Done",
			"hud.failed": "Failed",
			"hud.compress": "Compress {name}",
			"hud.seam": "Seamless loop {name}",
			"hud.seamOff": "Remove seamless loop {name}",
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
			"state.none.cmd": "node ~/.dsh-beta/profiles/desktop/plugins/muciya-appearance-library/scripts/export-wallpapers.mjs",
			"state.match.title": "No matching wallpaper",
			"state.match.body": "Try another term.",
			"state.match.action": "Clear the filters",
			"state.error.title": "Could not read the wallpaper library",
			"state.retry": "Retry",
			"hint.exclusive": "One wallpaper at a time: the appearance library holds the current skin selection, so applying a wallpaper is switching a skin.",
			"skin.title": "Skin settings",
			"skin.subtitle": "Skin switch and background controls inside the appearance library.",
			"skin.enabled": "Enable Skin",
			"skin.enabled.hint": "Turning it off removes the current skin and suspends the background controls; turning it back on restores them.",
			"skin.loading": "Reading the skin configuration…",
			"skin.readonly": "This configuration is read-only, so changes are not saved.",
			"skin.unavailable.body": "No skin configuration is connected; wallpapers still apply normally.",
			"skin.backgroundOpacity": "Background scrim",
			"skin.backgroundOpacity.hint": "Dims the wallpaper behind the panels: the higher the value, the quieter the art.",
			"skin.backgroundBlurEmpty": "Empty chat blur",
			"skin.backgroundBlurEmpty.hint": "Gaussian blur of the background while the conversation is empty; 0 turns it off.",
			"skin.backgroundBlurContent": "Active chat blur",
			"skin.backgroundBlurContent.hint": "Gaussian blur of the background once the conversation has content; 0 turns it off.",
			"skin.inputCardBlur": "Composer blur",
			"skin.inputCardBlur.hint": "Blurs only the area behind the composer, never the whole wallpaper.",
			"aerials.title": "System aerials",
			"aerials.blurb": "{total} films — {downloaded} downloaded, {pending} still missing.",
			"aerials.open": "Open Wallpaper settings",
			"aerials.opening": "Opening…",
			"aerials.opened": "Wallpaper settings is open.",
			"aerials.failed": "Could not open System Settings: {reason}",
			"aerials.badge": "Not downloaded",
			"aerials.done": "Downloaded",
			"aerials.hint": "An orange dot marks a film this Mac has not downloaded yet; it downloads first. Either way the panel builds and applies a DSH wallpaper and leaves the system wallpaper alone.",
			"aerials.count": "{n}",
			"aerials.expand": "Show {name}",
			"aerials.collapse": "Hide {name}",
			"aerials.empty": "No aerials match.",
			"aerials.allDone": "Every system aerial is already in the library.",
			"aerials.tileLabel": "Build a DSH wallpaper from {name}",
			"aerials.downloading": "Downloading {percent}%",
			"aerials.downloadingUnknown": "Downloading…",
			"aerials.exporting": "Building the wallpaper…",
			"aerials.applying": "Applying…",
			"aerials.applied": "Added to the library and applied: {name}",
			"aerials.downloadFailed": "Could not add it to the library: {reason}",
			"dynamics.title": "Dynamic Wallpapers",
			"dynamics.blurb": "The {total} dynamic wallpapers macOS ships with — the same set Settings → Wallpaper → Dynamic shows.",
			"dynamics.hint": "Video and image entries can become a DSH skin; Sequoia and Macintosh are 3-D scenes the system renders live, so they have no still frame to export.",
			"dynamics.count": "{n} items",
			"dynamics.kind.video": "Video",
			"dynamics.kind.image": "Image",
			"dynamics.kind.scene": "3D",
			"dynamics.exportable": "can become a skin",
			"dynamics.scene": "rendered live by the system",
			"startup.title": "Launch animation",
			"startup.on": "On",
			"startup.off": "Off",
			"startup.unavailable": "Not connected",
			"startup.loading": "Reading the launch animation settings…",
			"startup.subtitle": "The whale breaches at launch, then the surface splits open to reveal the app.",
			"startup.retry": "Retry",
			"startup.errorBody": "Could not read the startup animation configuration.",
			"startup.enabled": "Play the animation on launch",
			"startup.enabled.hint": "A fresh window plays the film and splits the veil open; reloading an open window stays put.",
			"startup.clip": "Film",
			"startup.clip.builtin": "Built-in film",
			"startup.clip.imported": "Imported film",
			"startup.video": "Launch film",
			"startup.audio": "Launch sound",
			"startup.audio.source": "Soundtrack",
			"startup.audio.film": "The film's own track",
			"startup.audio.import": "Import sound…",
			"startup.audio.importing": "Importing…",
			"startup.audio.restore": "Use film's track",
			"startup.audio.preview": "Preview 3s",
			"startup.audio.previewing": "Playing…",
			"startup.audio.imported": "Now using {name}; takes effect on the next launch.",
			"startup.audio.importFailed": "Sound import failed: {reason}",
			"startup.audio.restored": "Back to the film's own track.",
			"startup.audio.restoreFailed": "Restore failed: {reason}",
			"startup.audio.hint": "An imported soundtrack mutes the film's own audio by default; it can start late or play on past the reveal.",
			"startup.duration": "Launch length",
			"startup.duration.hint": "Film, hold and split together; the playback speed is set to about {rate}× to fit.",
			"startup.keepFilmAudio": "Keep the film's own audio",
			"startup.keepFilmAudio.hint": "Play the film's track as well when a soundtrack of its own is selected.",
			"startup.audio.start": "Soundtrack starts after",
			"startup.audio.overrun": "Keep playing after the reveal",
			"startup.audio.overrun.hint": "Do not fade with the split; let the soundtrack finish.",
			"startup.import": "Import a film…",
			"startup.importing": "Importing…",
			"startup.restore": "Restore built-in",
			"startup.reveal": "Show in Finder",
			"startup.muted": "Mute",
			"startup.volume": "Volume",
			"startup.volume.muted": "Volume has no effect while muted.",
			"startup.advanced": "Advanced",
			"startup.advanced.hint": "Changes apply the next time a window opens; out-of-range values fall back to the defaults.",
			"startup.newWindowOnly": "Only in a newly created window",
			"startup.acPowerOnly": "Skip on battery power",
			"startup.veilAlpha": "Veil opacity",
			"startup.waterline": "Waterline position",
			"startup.revealMs": "Split duration",
			"startup.holdMs": "Hold after the film",
			"startup.forceExitMs": "Hard exit limit",
			"startup.debug": "Write diagnostics",
			"startup.imported": "Now playing {name}; open a new window to see it.",
			"startup.importFailed": "Could not import the film: {reason}",
			"startup.restored": "Back to the built-in film.",
			"startup.restoreFailed": "Could not restore the built-in film: {reason}",
			"startup.revealed": "Opened the clip folder in Finder.",
			"startup.revealFailed": "Could not open the folder: {reason}",
			"startup.saveFailed": "Could not save the settings: {reason}",
			"startup.loadFailed": "Could not read the launch animation settings: {reason}",
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
			"about.close": "Close the note",
			"usage.title": "Today's spend",
			"usage.loading": "Reading usage…",
			"usage.error": "Usage is unavailable",
			"usage.noData": "No calls today",
			"usage.updated": "Updated {time}",
			"usage.calls": "{n} calls",
			"usage.balance": "Balance",
			"usage.trend": "Last 7 days",
			"usage.collapse": "Collapse the usage card",
			"usage.expand": "Expand the usage card",
			"usage.open": "Open today's usage detail"
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
/* ---------- shell ---------- */
.dsl-appear-page{display:flex;flex-direction:column;height:100%;min-height:0;position:relative;font-family:var(--dsw-font-family,system-ui,-apple-system,"SF Pro Text","PingFang SC",sans-serif);color:var(--dsw-alias-label-primary)}
.dsl-appear-pageScroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;scroll-behavior:smooth;scrollbar-gutter:stable}
.dsl-appear-pageContent{max-width:960px;margin:0 auto;padding:0 clamp(20px,4vw,40px) 56px;position:relative}
@media (max-width:640px){.dsl-appear-pageContent{padding:0 14px 44px}}
/* ---------- head ---------- */
.dsl-appear-head{box-sizing:border-box;width:100%;max-width:960px;margin:0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:28px clamp(20px,4vw,40px) 24px}
[data-platform=darwin] .dsl-appear-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
@media (max-width:640px){.dsl-appear-head{padding-left:14px;padding-right:14px}}
.dsl-appear-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.dsl-appear-titles{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsl-appear-subtitle{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:4px 0 0;font-size:13px;line-height:20px}
.dsl-appear-headActions{display:flex;align-items:center;gap:8px}
/* ---------- sticky toolbar ---------- */
.dsl-appear-toolbar{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 calc(-1 * clamp(20px,4vw,40px)) 16px;padding:12px clamp(20px,4vw,40px) 11px;background:transparent;box-shadow:0 0 0 0 transparent;transition:box-shadow 220ms cubic-bezier(0.32,0.72,0,1),background-color 220ms ease}
.dsl-appear-toolbar[data-stuck="1"]{box-shadow:0 14px 28px -24px rgba(0,0,0,.6)}
@media (max-width:640px){.dsl-appear-toolbar{margin:0 -14px 14px;padding:10px 14px 9px}}
.dsl-appear-search{position:relative;display:flex;align-items:center;gap:7px;flex:1 1 190px;min-width:150px;height:32px;padding:0 9px;border-radius:10px;border:0;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 52%,transparent);backdrop-filter:blur(16px) saturate(170%);-webkit-backdrop-filter:blur(16px) saturate(170%);color:var(--dsw-alias-label-tertiary);transition:background-color 160ms ease,box-shadow 160ms ease}
.dsl-appear-search:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 76%,transparent)}
.dsl-appear-search[data-filled="1"]{color:var(--dsw-alias-label-secondary)}
.dsl-appear-search:focus-within{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 88%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 72%,transparent),0 0 0 4px color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}
.dsl-appear-searchInput{flex:1 1 auto;min-width:0;height:100%;border:0;background:transparent;outline:none;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;letter-spacing:.005em}
.dsl-appear-searchInput::-webkit-search-cancel-button{display:none}
.dsl-appear-searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsl-appear-searchKey{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 4px;border-radius:5px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);font-size:10.5px;font-weight:500;letter-spacing:.02em}
.dsl-appear-search[data-filled="1"] .dsl-appear-searchKey{display:none}
.dsl-appear-clear{flex:none;display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;padding:0;border:0;border-radius:50%;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color 140ms ease,color 140ms ease}
.dsl-appear-clear:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-border-l3));color:var(--dsw-alias-label-primary)}
.dsl-appear-clear:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
.dsl-appear-segments{display:flex;align-items:center;gap:3px;flex-wrap:wrap;min-width:0}
.dsl-appear-segment{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 11px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;font-weight:500;letter-spacing:.005em;cursor:pointer;transition:background-color 150ms ease,color 150ms ease,border-color 150ms ease,transform 150ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-segment:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsl-appear-segment[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-3) 62%,transparent);-webkit-backdrop-filter:blur(16px) saturate(170%);backdrop-filter:blur(16px) saturate(170%);color:var(--dsw-alias-label-primary);font-weight:560}
.dsl-appear-segment:active{transform:scale(.97)}
.dsl-appear-segment:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
.dsl-appear-segmentCount{font-size:10.5px;font-weight:500;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
/* ---------- groups ---------- */
.dsl-appear-group{margin-top:22px;scroll-margin-top:64px}
.dsl-appear-group:first-child{margin-top:4px}
.dsl-appear-groupHead{display:flex;align-items:baseline;gap:8px;margin:0 2px 10px}
.dsl-appear-groupTitle{margin:0;font-size:14px;line-height:20px;font-weight:600;letter-spacing:-.005em}
.dsl-appear-groupBlurb{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-groupCount{margin-left:auto;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dsl-appear-groups{display:flex;flex-direction:column}
.dsl-appear-groupToggle{position:relative;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;align-self:center;transition:color 140ms ease,transform 150ms cubic-bezier(0.32,0.72,0,1)}.dsl-appear-groupToggle::after{content:'';position:absolute;inset:-6px;border-radius:14px}
.dsl-appear-groupToggle:hover{color:var(--dsw-alias-label-primary)}
.dsl-appear-groupToggle:active{transform:scale(.9);transition-duration:90ms}
.dsl-appear-groupToggle:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:3px}
.dsl-appear-groupToggleChevron{display:block;width:8px;height:8px;border-right:1.4px solid currentColor;border-bottom:1.4px solid currentColor;transform:rotate(45deg);transition:transform 220ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-groupToggle[aria-expanded="true"] .dsl-appear-groupToggleChevron{transform:rotate(-135deg)}
.dsl-appear-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:12px;margin:0;padding:0;list-style:none}
/* Folded: the first row keeps its height and every row after it collapses to
   nothing, so a folded shelf costs one row and still shows pictures. */
.dsl-appear-grid[data-folded="1"]{grid-template-rows:auto;grid-auto-rows:0;row-gap:0;overflow:hidden}
.dsl-appear-grid[data-folded="1"]>li{overflow:hidden}
@media (max-width:640px){.dsl-appear-grid{grid-template-columns:repeat(auto-fill,minmax(142px,1fr));gap:9px}}
.dsl-appear-item{min-width:0}
/* ---------- tile (media card) ---------- */
.dsl-appear-tile{position:relative;display:block;width:100%;padding:0;border:1px solid transparent;border-radius:14px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);background-clip:padding-box;color:inherit;font:inherit;text-align:left;cursor:pointer;contain:content;content-visibility:auto;contain-intrinsic-size:auto 150px;box-shadow:none;transition:transform 200ms cubic-bezier(0.32,0.72,0,1),box-shadow 220ms cubic-bezier(0.32,0.72,0,1)}
@media (hover:hover){.dsl-appear-tile:hover{transform:translateY(-3px)}}
.dsl-appear-tile[data-press="1"]{transform:translateY(-1px) scale(.984);transition:transform 110ms cubic-bezier(0.2,0,0,1)}
.dsl-appear-tile:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
.dsl-appear-tileMedia{position:relative;aspect-ratio:16/10;background:var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3));overflow:hidden;isolation:isolate}
.dsl-appear-tilePortrait .dsl-appear-tileMedia{aspect-ratio:10/16}
.dsl-appear-tileImg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transform:scale(1.015);transition:opacity 320ms ease,transform 520ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileImg{opacity:1;transform:scale(1)}
@media (hover:hover){.dsl-appear-tile:hover .dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileImg{transform:scale(1.035)}}
.dsl-appear-tileShim{position:absolute;inset:0;background:linear-gradient(100deg,var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3)) 30%,color-mix(in srgb,var(--dsw-alias-label-tertiary) 12%,var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3))) 50%,var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3)) 70%);background-size:220% 100%;animation:dsl-appear-shim 1.5s ease-in-out infinite}
@keyframes dsl-appear-shim{from{background-position:140% 0}to{background-position:-40% 0}}
.dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileShim{opacity:0;transition:opacity 260ms ease 60ms}
.dsl-appear-tileCaption{position:absolute;left:11px;right:11px;bottom:9px;z-index:2;display:flex;align-items:center;gap:6px;min-width:0;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7),0 1px 10px rgba(0,0,0,.5)}
.dsl-appear-tileCapIcon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:5px;background:rgba(255,255,255,.2);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.dsl-appear-tileMeta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px 9px}
.dsl-appear-tileName{flex:1 1 auto;min-width:0;margin:0;font-size:12.5px;line-height:17px;font-weight:560;letter-spacing:.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-tileActions{position:absolute;top:8px;right:8px;z-index:3;display:flex;align-items:center;gap:6px}
.dsl-appear-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:50%;background:rgba(16,18,24,.42);backdrop-filter:blur(14px) saturate(160%);-webkit-backdrop-filter:blur(14px) saturate(160%);color:rgba(255,255,255,.92);cursor:pointer;opacity:0;transform:scale(.9);transition:opacity 170ms ease,transform 190ms cubic-bezier(0.32,0.72,0,1),background-color 160ms ease,color 160ms ease}
@media (hover:none){.dsl-appear-iconBtn{opacity:1;transform:none}}
@media (hover:hover){.dsl-appear-tile:hover .dsl-appear-iconBtn{opacity:1;transform:none}}
.dsl-appear-tile:focus-within .dsl-appear-iconBtn{opacity:1;transform:none}
.dsl-appear-tile[data-press="1"] .dsl-appear-iconBtn{opacity:1;transform:none}
.dsl-appear-iconBtn:hover{background:rgba(196,54,54,.88)}
.dsl-appear-iconBtn:focus-visible{opacity:1;transform:none;outline:2px solid #fff;outline-offset:1px}
.dsl-appear-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:4px;height:21px;padding:0 8px;border-radius:999px;background:rgba(16,18,24,.44);backdrop-filter:blur(14px) saturate(160%);-webkit-backdrop-filter:blur(14px) saturate(160%);color:#fff;font-size:10.5px;font-weight:590;letter-spacing:.015em}
.dsl-appear-progress{position:absolute;left:0;right:0;bottom:0;z-index:4;height:2.5px;overflow:hidden;background:rgba(255,255,255,.24)}
.dsl-appear-progress::after{content:"";position:absolute;top:0;bottom:0;width:38%;border-radius:999px;background:var(--dsw-alias-brand-primary);animation:dsl-appear-slide 1.15s cubic-bezier(0.4,0,0.2,1) infinite}
@keyframes dsl-appear-slide{from{left:-38%}to{left:100%}}
.dsl-appear-tileBusy{position:absolute;inset:0;z-index:3;background:rgba(10,12,16,.34);display:flex;align-items:center;justify-content:center}
.dsl-appear-tileBusyText{padding:4px 10px;border-radius:999px;background:rgba(16,18,24,.5);color:#fff;font-size:11px;font-weight:520}
.dsl-appear-tileAsk{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:12px;background:rgba(10,12,16,.58);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff}
.dsl-appear-askYes,.dsl-appear-askNo{height:27px;padding:0 12px;border-radius:8px;border:1px solid transparent;font:inherit;font-size:12px;font-weight:540;cursor:pointer;transition:background-color 150ms ease,transform 150ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-askYes{background:#c43636;color:#fff}
.dsl-appear-askYes:hover{background:#d13f3f}
.dsl-appear-askNo{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.24);color:#fff}
.dsl-appear-askNo:hover{background:rgba(255,255,255,.24)}
.dsl-appear-askYes:active,.dsl-appear-askNo:active{transform:scale(.96)}
.dsl-appear-askYes:focus-visible,.dsl-appear-askNo:focus-visible{outline:2px solid #fff;outline-offset:1px}
/* ---------- list view ---------- */
.dsl-appear-rows{margin:0;padding:0;list-style:none;display:flex;flex-direction:column}
.dsl-appear-rows[data-folded="1"]>li:nth-child(n+2){display:none}
.dsl-appear-row{display:flex;align-items:center;gap:11px;width:100%;padding:7px 9px;border:0;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color 140ms ease}
@media (hover:hover){.dsl-appear-row:hover{background:var(--dsw-alias-interactive-bg-hover)}}
.dsl-appear-row[data-press="1"]{background:var(--dsw-alias-interactive-bg-active)}
.dsl-appear-row:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-1px}
.dsl-appear-row[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-hover-accent)}
.dsl-appear-rowThumb{position:relative;flex:none;width:52px;height:34px;border-radius:7px;overflow:hidden;background:var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3))}
.dsl-appear-rowThumb img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity 280ms ease}
.dsl-appear-rowThumb[data-ready="1"] img{opacity:1}
.dsl-appear-rowText{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}
.dsl-appear-rowName{margin:0;font-size:12.5px;line-height:17px;font-weight:540;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-rowSub{margin:0;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-rowMeta{flex:none;display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}
.dsl-appear-rowGo{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;transition:opacity 150ms ease,background-color 150ms ease,color 150ms ease}
@media (hover:none){.dsl-appear-rowGo{opacity:1}}
@media (hover:hover){.dsl-appear-row:hover .dsl-appear-rowGo{opacity:1}}
.dsl-appear-row:focus-within .dsl-appear-rowGo{opacity:1}
.dsl-appear-rowGo:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-border-l3));color:var(--dsw-alias-label-primary)}
.dsl-appear-rowGo:focus-visible{opacity:1;outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
/* ---------- detail drawer ---------- */
.dsl-appear-scrim{position:absolute;inset:0;z-index:20;background:var(--dsw-alias-bg-mask-2,rgba(0,0,0,.32));opacity:0;pointer-events:none;transition:opacity 240ms ease}
.dsl-appear-scrim[data-open="1"]{opacity:1;pointer-events:auto}
.dsl-appear-drawer{position:absolute;top:0;right:0;bottom:0;z-index:21;display:flex;flex-direction:column;width:min(400px,100%);background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-elevation-prominent);transform:translateX(100%);visibility:hidden;pointer-events:none;transition:transform 340ms cubic-bezier(0.32,0.72,0,1),visibility 0s linear 340ms}
.dsl-appear-drawer[data-open="1"]{transform:translateX(0);visibility:visible;pointer-events:auto;transition-delay:0s}
.dsl-appear-drawerHead{flex:none;display:flex;align-items:flex-start;gap:10px;padding:16px 16px 13px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsl-appear-drawerTitleWrap{flex:1 1 auto;min-width:0}
.dsl-appear-drawerTitle{margin:0;font-size:15px;line-height:21px;font-weight:600;letter-spacing:-.005em}
.dsl-appear-drawerSub{margin:3px 0 0;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-drawerBody{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 16px 20px}
.dsl-appear-drawerPreview{position:relative;border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3))}
.dsl-appear-drawerPreview[data-portrait="1"]{aspect-ratio:10/16;max-height:46vh;margin:0 auto}
.dsl-appear-drawerPreview:not([data-portrait="1"]){aspect-ratio:16/10}
.dsl-appear-drawerPreview img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;opacity:0;transition:opacity 320ms ease}
.dsl-appear-drawerPreview[data-ready="1"] img{opacity:1}
.dsl-appear-drawerActions{display:flex;align-items:center;gap:8px;margin-top:13px}
.dsl-appear-drawerFacts{display:flex;flex-direction:column;gap:0;margin:15px 0 0;padding:0;border-top:1px solid var(--dsw-alias-border-l1)}
.dsl-appear-fact{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsl-appear-factKey{flex:none;width:76px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-factVal{flex:1 1 auto;min-width:0;font-size:12px;line-height:17px;font-weight:520;word-break:break-word}
.dsl-appear-factVal[data-mono="1"]{font-family:var(--dsw-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11px;font-weight:450;color:var(--dsw-alias-label-secondary)}
.dsl-appear-drawerFoot{flex:none;display:flex;align-items:center;gap:8px;padding:11px 16px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
.dsl-appear-drawerHint{margin:0;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary)}
@media (max-width:520px){.dsl-appear-drawer{width:100%;border-left:0}}
/* ---------- seam switch ---------- */
.dsl-appear-chip{flex:none;display:inline-flex;align-items:center;height:21px;padding:0 9px;border:0;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;font-weight:520;letter-spacing:.005em;cursor:pointer;transition:background-color 150ms cubic-bezier(0.32,0.72,0,1),color 150ms cubic-bezier(0.32,0.72,0,1),transform 150ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-chip[data-on="1"]{background:var(--dsw-alias-interactive-bg-hover-accent,rgba(120,160,255,.16));color:var(--dsw-alias-brand-primary)}
.dsl-appear-chip:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-border-l3));color:var(--dsw-alias-label-primary)}
.dsl-appear-chip:active{transform:scale(.96)}
.dsl-appear-chip:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
/* ---------- film quality & loop ---------- */
.dsl-appear-film{position:relative;display:flex;flex-direction:column;gap:10px;padding:0;border:0;background:transparent;animation:dsl-appear-filmIn 320ms cubic-bezier(0.22,1,0.36,1) both}
.dsl-appear-filmHead{position:relative;z-index:1;display:flex;align-items:baseline;gap:8px}
.dsl-appear-filmTitle{font-size:12.5px;line-height:17px;font-weight:600;letter-spacing:-.005em;color:var(--dsw-alias-label-primary)}
.dsl-appear-filmBusy{margin-left:auto;font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-filmGrid{position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr 1fr;gap:7px}
.dsl-appear-filmGlide{position:absolute;top:0;left:0;z-index:0;border-radius:10px;border:1px solid var(--dsw-alias-label-primary);background-image:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.05));box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 1px rgba(255,255,255,.06),0 12px 26px -18px var(--dsw-alias-brand-primary);opacity:0;transition:opacity 220ms ease;will-change:transform,width,height;pointer-events:none}
.dsl-appear-filmGlide[data-ready="1"]{opacity:1}
.dsl-appear-filmAxis{display:flex;align-items:center;justify-content:center;padding:0 2px;font-size:10.5px;line-height:14px;letter-spacing:.01em;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dsl-appear-filmCell{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:46px;padding:6px 4px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;transition:border-color 220ms cubic-bezier(0.22,1,0.36,1),background-color 220ms cubic-bezier(0.22,1,0.36,1),color 220ms cubic-bezier(0.22,1,0.36,1),transform 140ms cubic-bezier(0.22,1,0.36,1)}
.dsl-appear-filmCell:not([data-current="1"]):hover{border-color:rgba(255,255,255,.2);background-color:rgba(255,255,255,.05);color:var(--dsw-alias-label-primary)}
.dsl-appear-filmCell:active{transform:scale(.962)}
.dsl-appear-filmCell[data-current="1"]{border-color:transparent;color:var(--dsw-alias-label-primary)}
.dsl-appear-filmCell[data-armed="1"]{border-color:var(--dsw-alias-state-warning-primary,#e0a23c);background-color:rgba(224,162,60,.14);color:var(--dsw-alias-state-warning-primary,#e0a23c)}
.dsl-appear-filmCell:disabled{cursor:default;opacity:.4}
.dsl-appear-filmCell:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
.dsl-appear-filmCellTitle{font-size:11.5px;line-height:15px;font-weight:560;letter-spacing:-.002em}
.dsl-appear-filmCellDetail{font-size:10px;line-height:13px;color:inherit;opacity:.72}
.dsl-appear-filmCell[data-current="1"] .dsl-appear-filmCellDetail{opacity:.86}
.dsl-appear-filmHint{position:relative;z-index:1;margin:0;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary);text-wrap:pretty}
@media (prefers-reduced-transparency: reduce){.dsl-appear-film{background:transparent}}
@media (prefers-contrast: more){.dsl-appear-film{border:1px solid var(--dsw-alias-label-primary);padding:12px;background:transparent}}
@keyframes dsl-appear-filmIn{from{opacity:0;transform:scale(.972) translateY(3px)}to{opacity:1;transform:none}}
/* ---------- drawer ghost button ---------- */
.dsl-appear-removedRestore{height:21px;padding:0 9px;border:0;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;font-weight:520;cursor:pointer;transition:background-color 150ms ease,transform 150ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-removedRestore:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-border-l3))}
.dsl-appear-removedRestore:active{transform:scale(.96)}
.dsl-appear-removedRestore:disabled{opacity:.5;cursor:default;transform:none}
.dsl-appear-removedRestore:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
/* ---------- note / hint ---------- */
.dsl-appear-note{position:relative;margin:0 0 18px;padding:13px 40px 13px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2));font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.dsl-appear-noteTitle{margin:0 0 5px;font-size:12.5px;line-height:18px;font-weight:580;color:var(--dsw-alias-label-primary)}
.dsl-appear-noteList{margin:0;padding-left:17px;display:flex;flex-direction:column;gap:3px}
.dsl-appear-noteClose{position:absolute;top:9px;right:9px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color 140ms ease,color 140ms ease}
.dsl-appear-noteClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsl-appear-noteClose:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
.dsl-appear-hint{margin:26px 2px 0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
/* ---------- toast + undo ---------- */
.dsl-appear-toastWrap{position:sticky;bottom:14px;z-index:12;display:flex;justify-content:center;pointer-events:none;margin-top:18px}
.dsl-appear-toast{display:inline-flex;align-items:center;gap:10px;max-width:min(560px,100%);padding:9px 10px 9px 15px;border-radius:999px;background:var(--dsw-alias-toast-bg,rgba(24,26,32,.94));color:var(--dsw-alias-toast-label,#fff);box-shadow:var(--dsw-elevation-prominent);font-size:12.5px;line-height:18px;pointer-events:auto;animation:dsl-appear-toastIn 260ms cubic-bezier(0.32,0.72,0,1)}
@keyframes dsl-appear-toastIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
.dsl-appear-toastError{color:#ffb4b4}
.dsl-appear-toastAction{flex:none;height:24px;padding:0 11px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:11.5px;font-weight:540;cursor:pointer;transition:background-color 150ms ease,transform 150ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-toastAction:hover{background:rgba(255,255,255,.22)}
.dsl-appear-toastAction:active{transform:scale(.96)}
.dsl-appear-toastAction:focus-visible{outline:2px solid #fff;outline-offset:1px}
/* ---------- task hud (top-right progress) ---------- */
/* The card is a light-transmitting surface over wallpaper, so it carries its
   own contrast instead of borrowing the page: a blurred, slightly darkened
   panel keeps white text legible on a bright beach or a black cityscape. */
.dsl-appear-hud{position:fixed;top:14px;right:18px;z-index:22;display:flex;flex-direction:column;align-items:flex-end;gap:7px;pointer-events:auto;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.dsl-appear-hud[data-dragging="1"]{cursor:grabbing}
.dsl-appear-hud[data-dragging="1"] .dsl-appear-hudCard{transition:none}
.dsl-appear-hudCard{position:relative;display:flex;align-items:center;gap:9px;width:min(264px,100%);padding:9px 11px;border-radius:13px;background:rgba(28,30,38,.72);backdrop-filter:blur(22px) saturate(170%);-webkit-backdrop-filter:blur(22px) saturate(170%);box-shadow:0 8px 24px -10px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.08);color:#fff;pointer-events:auto;overflow:hidden;animation:dsl-appear-hudIn 320ms cubic-bezier(0.32,0.72,0,1) both;transition:background-color 260ms ease,box-shadow 260ms ease,opacity 240ms ease,transform 240ms cubic-bezier(0.32,0.72,0,1)}
@keyframes dsl-appear-hudIn{from{opacity:0;transform:translateY(-10px) scale(.96)}to{opacity:1;transform:none}}
.dsl-appear-hudCard[data-phase="done"]{background:rgba(22,40,30,.78);box-shadow:0 8px 24px -10px rgba(0,0,0,.55),inset 0 0 0 1px rgba(88,214,141,.34)}
.dsl-appear-hudCard[data-phase="failed"]{background:rgba(44,24,26,.78);box-shadow:0 8px 24px -10px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,120,120,.34)}
.dsl-appear-hudCard[data-leaving="1"]{opacity:0;transform:translateY(-6px) scale(.98)}
.dsl-appear-hudGlyph{position:relative;flex:none;display:grid;place-items:center;width:18px;height:18px}
.dsl-appear-hudRing{width:14px;height:14px;border-radius:50%;border:1.8px solid rgba(255,255,255,.26);border-top-color:#fff;animation:dsl-appear-hudSpin 720ms linear infinite}
@keyframes dsl-appear-hudSpin{to{transform:rotate(360deg)}}
.dsl-appear-hudCheck{width:16px;height:16px;animation:dsl-appear-hudPop 420ms cubic-bezier(0.34,1.56,0.64,1) both}
@keyframes dsl-appear-hudPop{from{transform:scale(.4);opacity:0}55%{opacity:1}to{transform:scale(1);opacity:1}}
.dsl-appear-hudAlert{width:16px;height:16px;font-size:13px;line-height:16px;font-weight:700;text-align:center;color:#ffb4b4;animation:dsl-appear-hudPop 300ms cubic-bezier(0.34,1.56,0.64,1) both}
.dsl-appear-hudText{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.dsl-appear-hudLabel{font-size:12px;line-height:16px;font-weight:560;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-hudMeta{font-size:10.5px;line-height:14px;font-weight:480;letter-spacing:.01em;color:rgba(255,255,255,.66);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-hudTrack{position:absolute;left:0;right:0;bottom:0;height:2px;overflow:hidden;background:rgba(255,255,255,.14)}
.dsl-appear-hudSweep{display:block;width:34%;height:100%;border-radius:999px;background:linear-gradient(90deg,rgba(255,255,255,0),#fff,rgba(255,255,255,0));animation:dsl-appear-hudSweep 1.5s cubic-bezier(0.45,0,0.55,1) infinite}
@keyframes dsl-appear-hudSweep{from{transform:translateX(-110%)}to{transform:translateX(320%)}}
@media (prefers-reduced-motion:reduce){.dsl-appear-hudCard{animation:dsl-appear-hudIn 160ms linear both}.dsl-appear-hudRing{animation-duration:2s}.dsl-appear-hudCheck,.dsl-appear-hudAlert{animation:none}.dsl-appear-hudSweep{animation:none;width:100%;opacity:.4;background:#fff}}
/* ---------- state block ---------- */
.dsl-appear-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:52px 20px;text-align:center}
.dsl-appear-stateTitle{margin:0;font-size:13.5px;line-height:19px;font-weight:560}
.dsl-appear-stateBody{margin:0;max-width:420px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-stateCmd{margin:5px 0 0;padding:5px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11px;line-height:15px}
.dsl-appear-skeleton{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:12px}
.dsl-appear-skelCard{aspect-ratio:16/10;border-radius:14px;background:var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-3));animation:dsl-appear-pulse 1.5s ease-in-out infinite}
@keyframes dsl-appear-pulse{0%,100%{opacity:1}50%{opacity:.55}}
/* ---------- skin settings ---------- */
.dsl-appear-skin{margin:18px 0 0;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:color-mix(in srgb,var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2)) 58%,transparent);backdrop-filter:blur(20px) saturate(170%);-webkit-backdrop-filter:blur(20px) saturate(170%);overflow:hidden;transition:border-color 200ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-skin[data-open="1"]{border-color:var(--dsw-alias-border-l2)}
.dsl-appear-skinHead{display:flex;align-items:center;gap:9px;width:100%;padding:11px 14px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color 150ms ease}
.dsl-appear-skinHead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsl-appear-skinHead:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-2px}
.dsl-appear-skinChevron{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);transition:transform 240ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-skin[data-open="1"] .dsl-appear-skinChevron{transform:rotate(90deg)}
.dsl-appear-skinTitles{display:flex;flex-direction:column;gap:1px;min-width:0}
.dsl-appear-skinTitle{font-size:13px;line-height:18px;font-weight:560}
.dsl-appear-skinSubtitle{font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsl-appear-skinSummary{margin-left:auto;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dsl-appear-skinBody{padding:12px 14px 14px;display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsl-appear-skinToggle{display:flex;align-items:center;gap:12px}
.dsl-appear-skinToggleText{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.dsl-appear-skinToggle>.dsl-appear-skinSwitch{margin-left:auto}
.dsl-appear-skinLabel{display:block;font-size:12px;line-height:17px;color:var(--dsw-alias-label-primary)}
.dsl-appear-skinFieldHead{display:flex;align-items:baseline;gap:8px}
.dsl-appear-skinLabelText{font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.dsl-appear-skinValue{margin-left:auto;max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dsl-appear-skinField{width:100%;display:flex;flex-direction:column;gap:7px}
.dsl-appear-skinHint{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-skinSubhead{margin:0;padding-top:1px;font-size:11.5px;line-height:16px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-skinRange{width:100%;accent-color:var(--dsw-alias-brand-primary)}
.dsl-appear-skinGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px 18px}
.dsl-appear-skinGroup{display:flex;flex-direction:column;gap:11px;padding-top:11px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsl-appear-skinDivider{height:1px;background:var(--dsw-alias-border-l1)}
.dsl-appear-skinError{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-3) 45%,transparent)}
.dsl-appear-skinError .dsl-appear-skinHint{flex:1}
.dsl-appear-skinTools{display:flex;flex-wrap:wrap;gap:7px}
.dsl-appear-skinTool{height:26px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;font-weight:500;cursor:pointer;transition:background-color 150ms ease,color 150ms ease,transform 150ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-skinTool:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsl-appear-skinTool:active{transform:scale(.97)}
.dsl-appear-skinTool:disabled{opacity:.5;cursor:default;transform:none}
.dsl-appear-skinTool:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
.dsl-appear-skinDisclosure{display:inline-flex;align-items:center;gap:5px}
.dsl-appear-skinDisclosureChevron{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);transition:transform 240ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-skinDisclosure[aria-expanded="true"] .dsl-appear-skinDisclosureChevron{transform:rotate(90deg)}
.dsl-appear-skinDisclosure[aria-expanded="true"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsl-appear-skinSwitch{position:relative;flex:none;width:38px;height:22px;padding:0;border:0;border-radius:999px;background:var(--dsw-alias-border-l3);cursor:pointer;transition:background-color 200ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-skinSwitch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}
.dsl-appear-skinSwitch:disabled{opacity:.5;cursor:default}
.dsl-appear-skinSwitchKnob{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-switch-thumb,#fff);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform 200ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-skinSwitch[aria-checked="true"] .dsl-appear-skinSwitchKnob{transform:translateX(16px)}
.dsl-appear-skinSwitch:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
/* ---------- aerials ---------- */
.dsl-appear-aerials{margin-top:30px;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsl-appear-aerialsHead{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:11px}
.dsl-appear-aerialsTitles{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsl-appear-aerialsTitle{margin:0;font-size:13px;line-height:18px;font-weight:560}
.dsl-appear-aerialsBlurb{margin:0;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-aerialsOpen{margin-left:auto;height:27px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;font-weight:500;cursor:pointer;transition:background-color 150ms ease,color 150ms ease,transform 150ms cubic-bezier(0.32,0.72,0,1)}
.dsl-appear-aerialsOpen:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsl-appear-aerialsOpen:active{transform:scale(.97)}
.dsl-appear-aerialsOpen:disabled{opacity:.5;cursor:default;transform:none}
.dsl-appear-aerialsOpen:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
.dsl-appear-aerialsGrid{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.dsl-appear-aerialsGrid[data-folded="1"]{flex-wrap:nowrap;overflow:hidden}
.dsl-appear-aerial{position:relative;display:block;width:148px;padding:0;border:1px solid transparent;border-radius:11px;background:var(--dsw-alias-bg-layer-2);background-clip:padding-box;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;overflow:hidden;transition:background-color 150ms ease,border-color 150ms ease,transform 160ms cubic-bezier(0.32,0.72,0,1),box-shadow 160ms ease}
.dsl-appear-aerial:hover{background:var(--dsw-alias-interactive-bg-hover);transform:translateY(-1px)}
.dsl-appear-aerial:active{transform:scale(.98)}
.dsl-appear-aerial:disabled{opacity:.55;cursor:default;transform:none}
.dsl-appear-aerial:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
.dsl-appear-aerialDot{position:absolute;top:7px;left:7px;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);box-shadow:0 0 0 2px rgba(0,0,0,.32)}
.dsl-appear-aerialBusy{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 10px;background:rgba(0,0,0,.46);color:#fff;font-size:11.5px;line-height:15px;font-weight:560;letter-spacing:.01em;text-align:center;pointer-events:none}
.dsl-appear-aerial[data-busy="1"]{cursor:progress}
.dsl-appear-aerialStatic{cursor:default}
.dsl-appear-aerialStatic:hover{background:var(--dsw-alias-bg-layer-2);transform:none}
.dsl-appear-dynBadge{position:absolute;top:7px;right:7px;padding:0 6px;border-radius:6px;font-size:10px;line-height:16px;font-weight:560;color:#fff;background:rgba(0,0,0,.46);pointer-events:none}
.dsl-appear-aerialMedia{position:relative;display:block;width:100%;aspect-ratio:214/130;background:var(--dsw-alias-bg-layer-3)}
.dsl-appear-aerialImg{display:block;width:100%;height:100%;object-fit:cover}
.dsl-appear-aerialText{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:1px;padding:0 11px 9px;pointer-events:none}
.dsl-appear-aerialName{font-size:12.5px;line-height:17px;font-weight:560;letter-spacing:.005em;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7),0 1px 10px rgba(0,0,0,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* the shelf control lines up with the button beside it, not with the title block */
.dsl-appear-aerialsHead .dsl-appear-groupToggle{align-self:flex-end}
.dsl-appear-aerialsHint{margin:9px 0 0;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-aerialsEmpty{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
/* ---------- the crop panel: framing a picture before it becomes a skin ---------- */
.dsl-appear-cropScrim{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--dsw-alias-bg-mask-2,rgba(0,0,0,.32));backdrop-filter:blur(4px) saturate(120%);animation:dsl-appear-fadeIn 160ms ease}
@keyframes dsl-appear-fadeIn{from{opacity:0}to{opacity:1}}
.dsl-appear-crop{display:flex;flex-direction:column;gap:14px;width:min(524px,100%);max-height:100%;overflow:auto;padding:18px 20px 16px;border-radius:16px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 90%,transparent);-webkit-backdrop-filter:blur(20px) saturate(170%);backdrop-filter:blur(20px) saturate(170%);box-shadow:var(--dsw-elevation-panel,0 18px 48px rgba(0,0,0,.36))}
.dsl-appear-cropHead{display:flex;align-items:baseline;gap:10px;min-width:0}
.dsl-appear-cropTitle{margin:0;font-size:14px;line-height:20px;font-weight:600}
.dsl-appear-cropStep{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dsl-appear-cropName{margin-left:auto;max-width:190px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsl-appear-cropStage{position:relative;border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-layer-3)}
.dsl-appear-cropFrame{position:relative;width:100%;overflow:hidden;cursor:grab;touch-action:none;box-shadow:0 0 0 9999px rgba(0,0,0,.44)}
.dsl-appear-cropFrame:active{cursor:grabbing}
.dsl-appear-cropImg{position:absolute;display:block;max-width:none;user-select:none;-webkit-user-drag:none}
.dsl-appear-cropNote{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 18px;text-align:center;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-cropNote[data-tone="error"]{color:var(--dsw-alias-state-error-primary,#ff5d5d)}
.dsl-appear-cropRow{display:flex;align-items:center;gap:10px;min-width:0}
.dsl-appear-cropLabel{flex:none;min-width:52px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsl-appear-cropRatios{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.dsl-appear-cropRatio{flex:none;height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;line-height:16px;cursor:pointer}
.dsl-appear-cropRatio:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}
.dsl-appear-cropRatio[aria-pressed="true"]{border-color:transparent;background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary)}
.dsl-appear-cropSlider{flex:1;min-width:0;accent-color:var(--dsw-alias-brand-primary,#4d6bfe)}
.dsl-appear-cropHint{margin:0;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsl-appear-cropFoot{display:flex;align-items:center;gap:8px}
/* the three buttons are shell Buttons: these classes only place them */
.dsl-appear-cropFoot .dsl-appear-cropGhost{flex:none}
.dsl-appear-cropRow .dsl-appear-cropGhost{flex:none}
.dsl-appear-cropFoot .dsl-appear-cropPrimary{margin-left:auto;flex:none}
/* ---------- reduced motion / transparency ---------- */
@media (prefers-reduced-motion:reduce){
  .dsl-appear-pageScroll{scroll-behavior:auto}
  .dsl-appear-tile,.dsl-appear-tile:hover,.dsl-appear-tile[data-press="1"]{transform:none;transition:opacity 200ms ease}
.dsl-appear-aerial,.dsl-appear-aerial:hover{transform:none;box-shadow:none}
  .dsl-appear-groupToggle,.dsl-appear-groupToggle:active{transform:none}
  .dsl-appear-groupToggleChevron{transition:none}
  .dsl-appear-tileImg{transform:none;transition:opacity 200ms ease}
  .dsl-appear-tileMedia[data-ready="1"] .dsl-appear-tileImg{transform:none}
  .dsl-appear-tileShim{animation:none}
  .dsl-appear-skelCard{animation:none}
  .dsl-appear-toast{animation:none}
  .dsl-appear-drawer{transition:opacity 200ms ease;transform:none;opacity:0;visibility:hidden;pointer-events:none}
  .dsl-appear-drawer[data-open="1"]{opacity:1;visibility:visible;pointer-events:auto}
  .dsl-appear-progress::after{animation:none;left:0;width:100%}
  .dsl-appear-film{animation:none}
  .dsl-appear-filmGlide{transition:none}
  .dsl-appear-filmCell,.dsl-appear-chip{transition:background-color 200ms ease,color 200ms ease;transform:none}
  .dsl-appear-skinSwitch,.dsl-appear-skinSwitchKnob,.dsl-appear-skinChevron,.dsl-appear-skinDisclosureChevron{transition:none}
}
@media (prefers-reduced-transparency:reduce){
  .dsl-appear-toolbar{background:var(--dsw-alias-bg-base);backdrop-filter:none;-webkit-backdrop-filter:none}
  .dsl-appear-badge,.dsl-appear-iconBtn,.dsl-appear-tileCapIcon,.dsl-appear-tileAsk{background:rgb(16,18,24);backdrop-filter:none;-webkit-backdrop-filter:none}
  .dsl-appear-search,.dsl-appear-skin{background:var(--dsw-alias-bg-layer-2);backdrop-filter:none;-webkit-backdrop-filter:none}
  .dsl-appear-segment[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-3);backdrop-filter:none;-webkit-backdrop-filter:none}
  .dsl-appear-toast{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
}
@media (prefers-contrast:more){
  .dsl-appear-tile{border-color:var(--dsw-alias-border-l3)}
}
`;
		//#endregion

		/** Inject the stylesheet once per document, replacing any previous copy. */
		function ensureStyles(doc) {
			const target = doc ?? (typeof document === "undefined" ? undefined : document);
			if (target === undefined) return;
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
	/**
		* The image sizes the export writes: `thumb` is the grid tile, `preview` the
		* 1080 catalogue still, `full` the exported wallpaper itself. The drawer
		* asks for `full` because a 1080 still looks soft at 2× once it fills a card.
		*/
		const PREVIEW_SIZES = Object.freeze({ thumb: "thumb", preview: "preview", full: "full" });
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
		/**
		 * How long the task hud claims to be preparing before it says encoding.
		 *
		 * The host does real work first — banking the current film, reading the
		 * catalogue, spawning node — but it reports nothing until the encode
		 * ends, so the hand-off is timed. A fast path (both seam cuts already
		 * on disk) finishes inside this window and never shows the second phase.
		 */
		const TASK_PREPARE_MS = 900;
		/** A finished task holds long enough for the tick and the time to be read. */
		const TASK_DONE_HOLD_MS = 1600;
		/** A failure has words to read, so it stays longer. */
		const TASK_FAILED_HOLD_MS = 4200;
		/** The exit fade, matched to the card's own transition. */
		const TASK_EXIT_MS = 240;
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
		const DOCK_EASE = "220ms cubic-bezier(0.32,0.72,0,1)";
		/** The panel's own transitions, plus the two properties this adds. */
		const DOCK_TILE_EASE =
			"transform 110ms cubic-bezier(0.2,0,0,1),box-shadow 220ms cubic-bezier(0.32,0.72,0,1),scale " + DOCK_EASE + ",translate " + DOCK_EASE;
		const DOCK_AERIAL_EASE =
			"background-color 150ms ease,border-color 150ms ease,transform 160ms cubic-bezier(0.32,0.72,0,1),box-shadow 160ms ease,scale " + DOCK_EASE + ",translate " + DOCK_EASE;
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
				/* A row is as wide as the panel, and the card is wider than the slot it grows
				   out of, so at either end it would be clipped by the shelf. Holding it a
				   little inside the shelf keeps the whole card on screen. */
				const width = tile.offsetWidth > 0 ? tile.offsetWidth : item.box.w;
				const half = (width * item.scale) / 2;
				const centre = item.box.x + item.box.w / 2;
				const lo = half + 4;
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

		/** The one image a tile or the drawer asks for, at the size it needs. */
		function previewUrl(id, size) {
			const wanted = size === "preview" || size === "full" ? size : "thumb";
			return `${API_BASE}/preview?wallpaper=${encodeURIComponent(id)}&size=${wanted}`;
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

		//#endregion

		//#region components
		/** The sidebar glyph: a real wallpaper picker reads as a picture, with a safe fallback. */
		function AppearanceIcon({ size, active }) {
			const Icon = (active === true ? primitives.IconImageOutlineMedium : primitives.IconImageOutlineRegular) ?? primitives.IconFlatListOutlineRegular;
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
		* The two facts a film's tile states, as plain chips.
		*
		* A tile is 196px wide and already carries a picture, a name and a delete
		* button; a switch and a button that each started minutes of ffmpeg were
		* two hit targets too many, and neither could be undone by the same
		* gesture. Both now say what they are — "Native", "Seamless" — and both
		* open the drawer, where the four combinations sit side by side and the
		* cost of each is visible before it is paid.
		*/
		function FilmChips({ entry, onOpen, t }) {
			const native = typeof entry.filmHeight === "number" && entry.filmHeight >= 2000;
			const seam = entry.seamLoop === true;
			const open = (event) => {
				event.stopPropagation();
				onOpen(entry);
			};
			// Two chips, one per axis. They read as state, so their accessible
			// names have to say which axis they report; "open settings" twice in
			// a row would leave a screen reader with two identical buttons.
			const chip = (key, axis, on, label) => {
				const value = t(label);
				const aria = t(axis === "quality" ? "chip.qualityOpen" : "chip.loopOpen", { name: entry.nameZh, value });
				return h(
					"button",
					{
						type: "button",
						key,
						className: "dsl-appear-chip",
						title: aria,
						"aria-label": aria,
						"data-on": on ? "1" : "0",
						onClick: open,
						onPointerDown: (event) => event.stopPropagation()
					},
					value
				);
			};
			return [
				chip("quality", "quality", native, native ? "chip.native" : "chip.compressed"),
				chip("loop", "loop", seam, seam ? "chip.seam" : "chip.plain")
			];
		}

		/* Apple ships springs as a damping ratio and a response in seconds, not
		   as mass and stiffness; those two numbers convert straight into the
		   classic pair (k = ω², c = 2ζω) and the rest is a ten-line integrator.
		   A spring rather than a transition because the marker has to be
		   redirectable: press another corner while it is still travelling and it
		   leaves from where it is, carrying its current velocity, instead of
		   restarting from the old cell and showing the seam. */
		const SPRING_RESPONSE = 0.34;
		const SPRING_DAMPING = 0.88;

		function useSpringMarker(target) {
			const marker = useRef(null);
			const state = useRef({ x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0, raf: 0, last: 0, primed: false });
			useEffect(() => {
				const s = state.current;
				const paint = () => {
					const node = marker.current;
					if (!node) return;
					node.style.width = `${s.w}px`;
					node.style.height = `${s.h}px`;
					node.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
				};
				// The first real measurement should land, not travel in from the
				// corner: the pane belongs to the cell the drawer opened on.
				if (!s.primed) {
					s.primed = true;
					s.x = target.x;
					s.y = target.y;
					s.w = target.w;
					s.h = target.h;
					s.vx = 0;
					s.vy = 0;
					s.vw = 0;
					s.vh = 0;
					paint();
					return undefined;
				}
				const settled =
					Math.abs(s.x - target.x) < 0.3 &&
					Math.abs(s.y - target.y) < 0.3 &&
					Math.abs(s.w - target.w) < 0.3 &&
					Math.abs(s.h - target.h) < 0.3 &&
					Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vw) + Math.abs(s.vh) < 0.3;
				if (settled) {
					s.x = target.x;
					s.y = target.y;
					s.w = target.w;
					s.h = target.h;
					s.vx = 0;
					s.vy = 0;
					s.vw = 0;
					s.vh = 0;
					paint();
					return undefined;
				}
				const omega = (Math.PI * 2) / SPRING_RESPONSE;
				const stiffness = omega * omega;
				const friction = 2 * SPRING_DAMPING * omega;
				const step = (now) => {
					const dt = Math.min(0.032, Math.max(0.001, (now - s.last) / 1000 || 0.016));
					s.last = now;
					let moving = false;
					const axes = [["x", "vx", target.x], ["y", "vy", target.y], ["w", "vw", target.w], ["h", "vh", target.h]];
					for (let index = 0; index < axes.length; index += 1) {
						const axis = axes[index];
						const offset = s[axis[0]] - axis[2];
						s[axis[1]] += (-stiffness * offset - friction * s[axis[1]]) * dt;
						s[axis[0]] += s[axis[1]] * dt;
						if (Math.abs(offset) > 0.25 || Math.abs(s[axis[1]]) > 0.25) moving = true;
						else {
							s[axis[0]] = axis[2];
							s[axis[1]] = 0;
						}
					}
					paint();
					if (!moving) {
						s.raf = 0;
						return;
					}
					s.raf = requestAnimationFrame(step);
				};
				paint();
				s.last = performance.now();
				s.raf = requestAnimationFrame(step);
				return () => {
					if (s.raf !== 0) {
						cancelAnimationFrame(s.raf);
						s.raf = 0;
					}
				};
			}, [target.x, target.y, target.w, target.h]);
			return marker;
		}

		/**
		* The film's four states, laid out as the square they form.
		*
		* Row is resolution, column is the loop cut. The current corner is marked
		* and every other corner is one press away — except "native + seamless",
		* which re-encodes the whole 4K film, so it arms a confirmation instead of
		* starting the work on the first touch. The corner that cannot be reached
		* without a source film is disabled and says why.
		*
		* The mark is a single pane of light that glides between corners rather
		* than four cells each redrawing their own border: the eye follows one
		* object changing place, which is what makes the grid read as one control
		* instead of four buttons. It is measured from the live cell rects, so it
		* survives a font zoom or a panel resize without a second layout rule.
		*/
		function FilmOptions({ entry, busy, onChoose, t }) {
			const [armed, setArmed] = useState(null);
			const nativeNow = typeof entry.filmHeight === "number" && entry.filmHeight >= 2000;
			const seamNow = entry.seamLoop === true;
			const noSource = entry.sourceExists === false;
			const activeKey = `${nativeNow ? "native" : "compressed"}-${seamNow ? "seam" : "plain"}`;
			const gridRef = useRef(null);
			const [target, setTarget] = useState({ x: 0, y: 0, w: 0, h: 0 });
			const measure = () => {
				const grid = gridRef.current;
				if (!grid) return;
				const node = grid.querySelector(`[data-cell="${activeKey}"]`);
				if (!node) return;
				const outer = grid.getBoundingClientRect();
				const inner = node.getBoundingClientRect();
				const next = { x: inner.left - outer.left, y: inner.top - outer.top, w: inner.width, h: inner.height };
				setTarget((prev) =>
					Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 && Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5
						? prev
						: next
				);
			};
			React.useLayoutEffect(measure, [activeKey]);
			useEffect(() => {
				const grid = gridRef.current;
				if (!grid || typeof ResizeObserver === "undefined") return undefined;
				const observer = new ResizeObserver(() => measure());
				observer.observe(grid);
				return () => observer.disconnect();
			}, [activeKey]);
			const marker = useSpringMarker(target);
			const cell = (quality, seam) => {
				const current = nativeNow === (quality === "native") && seamNow === seam;
				const key = `${quality}-${seam ? "seam" : "plain"}`;
				const disabled = busy || (quality === "native" && noSource);
				const slow = quality === "native" && seam && !current;
				const pending = armed === key;
				return h(
					"button",
					{
						type: "button",
						key,
						className: "dsl-appear-filmCell",
						"data-cell": key,
						"data-current": current ? "1" : "0",
						"data-armed": pending ? "1" : "0",
						disabled,
						title: quality === "native" && noSource ? t("film.noSource") : slow ? t("film.corner") : t("film.hint"),
						"aria-pressed": current ? "true" : "false",
						onClick: () => {
							if (current) return;
							if (slow && pending === false) {
								setArmed(key);
								return;
							}
							setArmed(null);
							onChoose(entry, { quality, seam });
						}
					},
					[
						h("span", { className: "dsl-appear-filmCellTitle", key: "t" }, quality === "native" ? t("film.native") : t("film.compressed")),
						h("span", { className: "dsl-appear-filmCellDetail", key: "d" }, pending ? t("film.confirm") : seam ? t("film.seam") : t("film.plain"))
					]
				);
			};
			const axis = (key, label) => h("span", { className: "dsl-appear-filmAxis", key }, label);
			return h("div", { className: "dsl-appear-film" }, [
				h("div", { className: "dsl-appear-filmHead", key: "head" }, [
					h("span", { className: "dsl-appear-filmTitle", key: "title" }, t("film.title")),
					busy ? h("span", { className: "dsl-appear-filmBusy", key: "busy" }, t("film.busy")) : null
				]),
				h("div", { className: "dsl-appear-filmGrid", key: "grid", ref: gridRef }, [
					h("span", {
						className: "dsl-appear-filmGlide",
						key: "glide",
						ref: marker,
						"aria-hidden": "true",
						"data-ready": target.w > 0 ? "1" : "0"
					}),
					axis("c0", ""),
					axis("c1", t("film.plain")),
					axis("c2", t("film.seam")),
					axis("r1", t("film.native")),
					cell("native", false),
					cell("native", true),
					axis("r2", t("film.compressed")),
					cell("compressed", false),
					cell("compressed", true)
				]),
				h("p", { className: "dsl-appear-filmHint", key: "hint" }, t("film.hint"))
			]);
		}

		/** A duration the card can show without the width jumping. */
		function formatElapsed(ms) {
			const seconds = Math.max(0, Math.round(ms / 1000));
			if (seconds < 60) return `${seconds}s`;
			return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`;
		}

		/** The one line under a task's name. */
		function hudMeta(task, elapsed, t) {
			if (task.phase === "done") return `${t("hud.done")} · ${elapsed}`;
			if (task.phase === "failed") {
				const detail = typeof task.detail === "string" ? task.detail.trim() : "";
				return detail === "" ? t("hud.failed") : `${t("hud.failed")} · ${detail}`;
			}
			return `${t(task.phase === "preparing" ? "hud.preparing" : "hud.working")} · ${elapsed}`;
		}

		/* Where the hud sits, in viewport coordinates. Stored as a plain pair so
		   a stale entry can never resurrect a rectangle from an old layout. */
		const HUD_POS_KEY = "dsh-appearance-hud:pos";
		const HUD_MARGIN = 8;

		function clampHudPos(left, top, width, height) {
			const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
			const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
			if (viewportWidth === 0 || viewportHeight === 0) return { left, top };
			const maxLeft = Math.max(HUD_MARGIN, viewportWidth - width - HUD_MARGIN);
			const maxTop = Math.max(HUD_MARGIN, viewportHeight - height - HUD_MARGIN);
			return {
				left: Math.min(Math.max(left, HUD_MARGIN), maxLeft),
				top: Math.min(Math.max(top, HUD_MARGIN), maxTop)
			};
		}

		function readHudPos() {
			try {
				const raw = window.localStorage.getItem(HUD_POS_KEY);
				if (typeof raw !== "string" || raw === "") return null;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return null;
				const { left, top } = parsed;
				if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
				return { left, top };
			} catch {
				return null;
			}
		}

		function writeHudPos(pos) {
			try {
				window.localStorage.setItem(HUD_POS_KEY, JSON.stringify(pos));
			} catch {
				/* private mode or a full quota: dragging still works this session */
			}
		}

		/**
		 * A small stack of tasks in the top-right corner.
		 *
		 * The panel has two operations that take minutes — compression and the
		 * loop seam — and both used to be silent until they finished. The
		 * phases are coarse on purpose: the host shells out to ffmpeg and has
		 * no frame count to report, so the card says which stage the work is in
		 * and how long it has been running instead of inventing a percentage.
		 *
		 * A finished card holds for a beat so the tick can be read, then fades.
		 */
		function TaskHud({ tasks, t }) {
			const [pos, setPos] = useState(readHudPos);
			const [dragging, setDragging] = useState(false);
			const rootRef = useRef(null);
			const dragRef = useRef(null);

			// A window that got narrower must not leave the card off-screen.
			useEffect(() => {
				if (pos === null || typeof window === "undefined") return undefined;
				const onResize = () => {
					const root = rootRef.current;
					if (root === null) return;
					const next = clampHudPos(pos.left, pos.top, root.offsetWidth, root.offsetHeight);
					if (next.left === pos.left && next.top === pos.top) return;
					setPos(next);
					writeHudPos(next);
				};
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
			}, [pos]);

			if (tasks.length === 0) return null;

			// Drag the whole stack, not one card: the cards are a unit and the
			// pointer would otherwise have to chase each one individually.
			const onPointerDown = (event) => {
				if (event.button !== 0) return;
				const root = rootRef.current;
				if (root === null) return;
				const rect = root.getBoundingClientRect();
				dragRef.current = {
					pointerId: event.pointerId,
					offsetX: event.clientX - rect.left,
					offsetY: event.clientY - rect.top,
					width: rect.width,
					height: rect.height,
					moved: false,
					latest: null
				};
				if (typeof root.setPointerCapture === "function") {
					try {
						root.setPointerCapture(event.pointerId);
					} catch {
						/* capture is a nicety; the handlers below still work */
					}
				}
				setDragging(true);
				event.preventDefault();
			};

			const onPointerMove = (event) => {
				const drag = dragRef.current;
				if (drag === null || event.pointerId !== drag.pointerId) return;
				const next = clampHudPos(
					event.clientX - drag.offsetX,
					event.clientY - drag.offsetY,
					drag.width,
					drag.height
				);
				drag.moved = true;
				drag.latest = next;
				setPos(next);
			};

			const endDrag = (event) => {
				const drag = dragRef.current;
				if (drag === null || event.pointerId !== drag.pointerId) return;
				dragRef.current = null;
				setDragging(false);
				const root = rootRef.current;
				if (root !== null && typeof root.releasePointerCapture === "function") {
					try {
						root.releasePointerCapture(drag.pointerId);
					} catch {
						/* already released */
					}
				}
				if (drag.moved && drag.latest !== null) writeHudPos(drag.latest);
			};

			return h(
				"div",
				{
					className: "dsl-appear-hud",
					role: "status",
					"aria-live": "polite",
					"data-dragging": dragging ? "1" : "0",
					ref: rootRef,
					// Only a dragged hud switches to left/top; the default keeps
					// the CSS right-anchor so it still hugs the corner on resize.
					style: pos === null ? undefined : { left: `${pos.left}px`, top: `${pos.top}px`, right: "auto" },
					onPointerDown,
					onPointerMove,
					onPointerUp: endDrag,
					onPointerCancel: endDrag
				},
				tasks.map((task) => {
					const running = task.phase === "preparing" || task.phase === "working";
					const elapsed = formatElapsed(task.elapsedMs ?? 0);
					return h(
						"div",
						{
							className: "dsl-appear-hudCard",
							"data-phase": task.phase,
							"data-leaving": task.leaving === true ? "1" : "0",
							key: task.key
						},
						[
							h(
								"span",
								{ className: "dsl-appear-hudGlyph", key: "glyph" },
								task.phase === "done"
									? h(
											"svg",
											{
												className: "dsl-appear-hudCheck",
												viewBox: "0 0 16 16",
												fill: "none",
												"aria-hidden": "true",
												key: "check"
											},
											h("path", {
												d: "M3.2 8.7 6.4 11.9 12.8 4.7",
												stroke: "#5ee08d",
												strokeWidth: "2",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												key: "path"
											})
										)
									: task.phase === "failed"
										? h("span", { className: "dsl-appear-hudAlert", key: "alert" }, "!")
										: h("span", { className: "dsl-appear-hudRing", key: "ring" })
							),
							h("span", { className: "dsl-appear-hudText", key: "text" }, [
								h("span", { className: "dsl-appear-hudLabel", key: "label" }, task.label),
								h("span", { className: "dsl-appear-hudMeta", key: "meta" }, hudMeta(task, elapsed, t))
							]),
							running
								? h(
										"span",
										{ className: "dsl-appear-hudTrack", key: "track" },
										h("span", { className: "dsl-appear-hudSweep" })
									)
								: null
						]
					);
				})
			);
		}

		/**
		 * Task bookkeeping for the hud, living outside the panel.
		 *
		 * The hud has to stay on screen when the reader leaves the library, so
		 * the tasks cannot live in that page's own state: switching panels
		 * unmounts it, and a compression that ends 30 seconds later would have
		 * nowhere to report. This store is module-level; the panel only calls
		 * `begin`/`settle`, and `apply()` mounts the hud once on the body.
		 *
		 * `preparing` is not a guess: the host banks the current film, reads the
		 * catalogue and shells out before the encoder starts, and that first
		 * second is honest work. The hand-off to `working` is timed because the
		 * host offers no mid-encode signal — a fast path finishes before the
		 * timer and never shows the second phase at all.
		 *
		 * The clock is a tick, not a timestamp: the bundle is rendered in a
		 * sandbox that has no usable `Date`, and a task only needs elapsed time.
		 */
		const taskHud = (() => {
			const listeners = new Set();
			const timers = new Map();
			let tasks = [];

			const publish = (next) => {
				tasks = next;
				for (const listener of listeners) listener();
			};
			const stop = (key) => {
				for (const name of ["phase", "tick", "leave", "drop"]) {
					const slot = `${name}:${key}`;
					const id = timers.get(slot);
					if (id === undefined) continue;
					if (name === "tick") globalThis.clearInterval(id);
					else globalThis.clearTimeout(id);
					timers.delete(slot);
				}
			};

			return {
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				getSnapshot() {
					return tasks;
				},
				begin(kind, id, label) {
					const key = `${kind}:${id}`;
					stop(key);
					publish([
						...tasks.filter((task) => task.key !== key),
						{ key, kind, label, phase: "preparing", elapsedMs: 0, detail: null, leaving: false }
					]);
					timers.set(
						`phase:${key}`,
						globalThis.setTimeout(() => {
							publish(
								tasks.map((task) =>
									task.key === key && task.phase === "preparing" ? { ...task, phase: "working" } : task
								)
							);
						}, TASK_PREPARE_MS)
					);
					let elapsed = 0;
					timers.set(
						`tick:${key}`,
						globalThis.setInterval(() => {
							elapsed += 500;
							publish(
								tasks.map((task) =>
									task.key === key && (task.phase === "preparing" || task.phase === "working")
										? { ...task, elapsedMs: elapsed }
										: task
								)
							);
						}, 500)
					);
					return key;
				},
				settle(key, phase, detail = null) {
					stop(key);
					publish(tasks.map((task) => (task.key === key ? { ...task, phase, detail } : task)));
					const hold = phase === "failed" ? TASK_FAILED_HOLD_MS : TASK_DONE_HOLD_MS;
					timers.set(
						`leave:${key}`,
						globalThis.setTimeout(() => {
							publish(tasks.map((task) => (task.key === key ? { ...task, leaving: true } : task)));
						}, hold)
					);
					timers.set(
						`drop:${key}`,
						globalThis.setTimeout(() => {
							publish(tasks.filter((task) => task.key !== key));
							timers.delete(`leave:${key}`);
							timers.delete(`drop:${key}`);
						}, hold + TASK_EXIT_MS)
					);
				}
			};
		})();

		/** The hud as mounted outside the panel: a store subscription and nothing else. */
		function TaskHudHost({ t }) {
			const tasks = React.useSyncExternalStore(taskHud.subscribe, taskHud.getSnapshot, taskHud.getSnapshot);
			return h(TaskHud, { tasks, t });
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
		function WallpaperTile({ entry, active, applying, failed, busy, onOpen, onQuick, onRemove, t }) {
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
							? h("div", { className: "dsl-appear-tileMeta", key: "meta" }, h(FilmChips, { entry, onOpen, t }))
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
		function DetailDrawer({ entry, open, active, pending, failed, filmBusy, onClose, onApply, onRemove, onFilm, t }) {
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
			// The film on disk wins over the numbers recorded at export time: a
			// native re-cut is 4K even though its manifest still says 1080p.
			const quality =
				formatResolution(entry.filmWidth, entry.filmHeight) ??
				formatResolution(entry.sourceWidth, entry.sourceHeight) ??
				formatResolution(size?.width, size?.height) ??
				t("detail.unknown");
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
							style: { opacity: 1, transform: "none", background: "transparent", color: "var(--dsw-alias-label-tertiary)" },
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
						? h(FilmOptions, { entry, busy: filmBusy, onChoose: onFilm, t, key: "film" })
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
			return h(
				"div",
				{ className: "dsl-appear-cropScrim" },
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
						h(primitives.Button, { className: "dsl-appear-cropGhost", variant: "outline", size: "sm", onClick: onCancel }, t("crop.cancel")),
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
		* These are the wallpapers Apple ships but this Mac has never fetched. The
		* card is painted from Apple’s own offline thumbnail — a 214×130 PNG
		* cached beside the manifest, downloaded or not — so it shows the film
		* instead of only naming it, and clicking it asks the host to fetch the
		* film, turn it into a skin of this panel and switch to it. The system
		* wallpaper is never touched: a film downloaded here is a DSH wallpaper.
		*/
		function AerialTile({ item, t, state, percent, onApply }) {
			const done = item.downloaded === true;
			const label = done ? t("aerials.done") : t("aerials.badge");
			const full = `${typeof item.original === "string" && item.original !== "" ? `${item.name} · ${item.original}` : item.name} · ${label}`;
			const thumb = item.thumb === true;
			const busy = state === "downloading" || state === "exporting" || state === "applying";
			const status =
				state === "downloading"
					? percent > 0
						? t("aerials.downloading", { percent })
						: t("aerials.downloadingUnknown")
					: state === "exporting"
						? t("aerials.exporting")
						: state === "applying"
							? t("aerials.applying")
							: null;
			return h(
				"li",
				{ className: "dsl-appear-item" },
				h(
					"button",
					{
						type: "button",
						className: "dsl-appear-aerial",
						disabled: busy === true,
						"data-busy": busy === true ? "1" : "0",
						title: full,
						"aria-label": t("aerials.tileLabel", { name: item.name }),
						onClick: () => onApply(item)
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
						status === null
							? h("span", { className: "dsl-appear-aerialDot", key: "dot", "aria-hidden": "true" })
							: h("span", { className: "dsl-appear-aerialBusy", key: "busy", role: "status" }, status)
					]
				)
			);
		}

		/**
		* Every aerial Settings lists, under the categories Settings itself uses.
		*
		* Downloaded films stay on the shelf: the pane's own grouping is the map
		* this section mirrors, and hiding a category's films as they arrive would
		* make the counts disagree with Settings on every download. The orange dot
		* marks the ones still missing; the rest are already on disk.
		*
		* A click closes the gap from here: the host fetches the film Apple
		* publishes when it is absent, stores it where the system keeps its own,
		* and points the wallpaper record at it. Settings owns the films; it does
		* not own the only way to get them.
		*/
		function AerialPendingSection({ aerials, query, t, opening, onOpen, job, onApply, openChoice, onToggle, sectionOpen, onToggleSection }) {
			const needle = query.trim().toLowerCase();
			const searching = needle !== "";
			const groups = useMemo(() => {
				const source = Array.isArray(aerials?.groups) ? aerials.groups : [];
				return source
					.map((group) => ({
						...group,
						items: (Array.isArray(group.items) ? group.items : []).filter((item) => {
							/* This shelf lists what is still missing. A film already on
							   disk is a wallpaper in the library above, so its pending
							   tile leaves here the moment the download settles. */
							if (item.downloaded === true) return false;
							if (needle === "") return true;
							const haystack = `${item.name} ${item.original} ${item.scene}`.toLowerCase();
							return haystack.includes(needle);
						})
					}))
					.filter((group) => group.items.length > 0);
			}, [aerials, needle]);

			if (aerials === null || typeof aerials !== "object") return null;
			if (aerials.available !== true || aerials.total === 0) return null;
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
						? h("p", { className: "dsl-appear-aerialsEmpty", key: "empty" }, t(searching ? "aerials.empty" : "aerials.allDone"))
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
									shown.map((item) =>
										h(AerialTile, {
											key: item.id,
											item,
											t,
											state: job !== null && job !== undefined && job.id === item.id ? job.state : "idle",
											percent:
												job !== null && job !== undefined && job.id === item.id && job.total > 0
													? Math.min(99, Math.round((job.received / job.total) * 100))
													: 0,
											onApply
										})
									)
								)
							]);
					})
			]);
		}

		/**
		* The dynamic wallpapers macOS ships with.
		*
		* This is the set Settings calls "动态壁纸": 30 `.madesktop` bundles whose
		* light/dark (and, for the solar ones, time-of-day) variants the system
		* blends by itself, plus five newer wallpapers an ExtensionKit appex draws
		* live. The panel mirrors the same 35 items, in the same order, so the two
		* surfaces can be checked against each other.
		*
		* The tile stays a plain container for now: reading the inventory is this
		* step's whole job, and turning a bundle into a skin needs the asset
		* download behind it (the HEIC lives in Apple's mobile-asset store, not on
		* disk). `exportable` already carries the answer for each item, so the
		* action can be attached without touching the data.
		*/
		function DynamicWallpapersSection({ dynamics, t, sectionOpen, onToggleSection }) {
			if (dynamics === null || typeof dynamics !== "object") return null;
			if (dynamics.available !== true) return null;
			const groups = Array.isArray(dynamics.groups) ? dynamics.groups : [];
			if (groups.length === 0) return null;
			const showBody = sectionOpen !== false;
			const sectionToggle = t(showBody ? "aerials.collapse" : "aerials.expand", { name: t("dynamics.title") });
			return h("section", { className: "dsl-appear-aerials dsl-appear-dynamics", "aria-label": t("dynamics.title") }, [
				h("div", { className: "dsl-appear-aerialsHead", key: "head" }, [
					h("div", { className: "dsl-appear-aerialsTitles", key: "titles" }, [
						h("h2", { className: "dsl-appear-aerialsTitle", key: "title" }, t("dynamics.title")),
						h("p", { className: "dsl-appear-aerialsBlurb", key: "blurb" }, t("dynamics.blurb", { total: dynamics.total }))
					]),
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
					)
				]),
				showBody ? h("p", { className: "dsl-appear-aerialsHint", key: "hint" }, t("dynamics.hint")) : null,
				!showBody
					? null
					: groups.map((group) =>
							h("section", { className: "dsl-appear-group", key: group.id }, [
								h("div", { className: "dsl-appear-groupHead", key: "head" }, [
									h("h3", { className: "dsl-appear-groupTitle", key: "title" }, group.name),
									h("span", { className: "dsl-appear-groupCount", key: "count" }, t("dynamics.count", { n: group.items.length }))
								]),
								h(
									"ul",
									{ className: "dsl-appear-aerialsGrid", key: "grid", "aria-label": `${t("dynamics.title")} · ${group.name}` },
									group.items.map((item) =>
										h(
											"li",
											{ className: "dsl-appear-item", key: item.id },
											h(
												"div",
												{
													className: "dsl-appear-aerial dsl-appear-aerialStatic",
													"data-kind": item.kind,
													title: `${item.name} · ${t(item.exportable === true ? "dynamics.exportable" : "dynamics.scene")}`
												},
												[
													h(
														"span",
														{ className: "dsl-appear-aerialMedia", key: "media" },
														item.thumb === null || item.thumb === undefined
															? null
															: h("img", {
																	className: "dsl-appear-aerialImg",
																	key: "img",
																	src: item.thumb,
																	alt: "",
																	loading: "lazy",
																	decoding: "async",
																	draggable: false
																})
													),
													h("span", { className: "dsl-appear-aerialText", key: "text" }, h("span", { className: "dsl-appear-aerialName", key: "name" }, item.name)),
													h("span", { className: "dsl-appear-dynBadge", key: "badge" }, t(`dynamics.kind.${item.kind}`))
												]
											)
										)
									)
								)
							])
						)
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
			const [opening, setOpening] = useState(false);
			/** The aerial download in flight, as the host reports it; null when idle. */
			const [aerialJob, setAerialJob] = useState(null);
			const [importing, setImporting] = useState(null);
			/** The pictures still waiting for a frame; null when the panel is closed. */
			const [cropQueue, setCropQueue] = useState(null);
			const [noteOpen, setNoteOpen] = useState(false);
			/** Whether the dynamic-wallpaper shelf is unfolded; open on arrival. */
			const [dynamicSectionOpen, setDynamicSectionOpen] = useState(true);
			/** The wallpaper whose drawer is open; its last value outlives the close. */
			const [detailId, setDetailId] = useState(null);
			const [removing, setRemoving] = useState(null);
			/**
			* Re-cutting a film is a minutes-long encode on the host, so the four
			* corners of the drawer stay disabled for the one id in flight — and
			* the panel keeps showing which film that is while it runs.
			*/
			const [filmPending, setFilmPending] = useState(null);
			/* The queue lives in the module, not in this page: the hud stays up
			   after the reader switches away, and a task that settles later still
			   lands where they can see it. */
			const beginTask = taskHud.begin;
			const settleTask = taskHud.settle;
			/* Coming back while something is still encoding: the store knows, so
			   the tile can keep showing the busy state it had when we left. */
			useEffect(() => {
				const running = taskHud.getSnapshot();
				const cutting = running.find((task) => (task.kind === "film" || task.kind === "compress" || task.kind === "seam") && task.leaving !== true);
				if (cutting !== undefined) setFilmPending(cutting.key.slice(cutting.key.indexOf(":") + 1));
			}, []);
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

			const load = useCallback(async (quiet = false) => {
				abortRef.current?.abort();
				const controller = typeof AbortController === "function" ? new AbortController() : null;
				abortRef.current = controller;
				const fetchImpl = transport();
				if (fetchImpl === null) {
					setState({ status: "error", reason: "fetch unavailable" });
					return null;
				}
				if (quiet !== true) setState({ status: "loading" });
				try {
					const catalog = await loadCatalog(fetchImpl, controller?.signal, siteLanguage());
					setState({ status: "ready", catalog });
					if (chosenRef.current === false) setActiveSkin(catalog.activeSkin);
					setNoteOpen(catalog.built === false);
					// Returned so a caller that needs the fresh catalogue right away
					// — the aerial job switching to the skin it just created — does
					// not have to wait for the next render to read it back.
					return catalog;
				} catch (error) {
					if (controller?.signal?.aborted === true) return null;
					setState({ status: "error", reason: String(error?.message ?? error) });
					return null;
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
			* Open Settings → Wallpaper, which still owns the shuffle and the
			* screen-saver side of aerials.
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

			/**
			* Download one film and turn it into a wallpaper of this panel.
			*
			* The host walks the whole distance — fetch the film Apple publishes,
			* run the export over it, apply the skin the export named — and reports
			* the trip on a job this panel polls. Progress therefore lands on the
			* tile that started it, and the poll stops the moment the job settles
			* either way.
			*/
			const onApplyAerial = useCallback(
				async (item) => {
					const fetchImpl = transport();
					if (fetchImpl === null || item === null || item === undefined) return;
					setAerialJob({ id: item.id, name: item.name, state: "downloading", received: 0, total: 0, skin: null });
					try {
						const response = await fetchImpl(`${API_BASE}/aerial-download`, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ id: item.id, name: item.name })
						});
						const payload = await response.json();
						if (payload?.ok !== true) throw new Error(payload?.error ?? "download rejected");
						if (payload?.job !== undefined && payload?.job !== null) setAerialJob(payload.job);
					} catch (error) {
						setAerialJob(null);
						setToast({ tone: "error", text: t("aerials.downloadFailed", { reason: String(error?.message ?? error) }) });
					}
				},
				[transport, t]
			);

			/**
			* One poller per job, not one per render: the interval is keyed to the
			* job id and its state, so a settled job tears the timer down instead of
			* asking about a finished download forever.
			*/
			useEffect(() => {
				if (aerialJob === null || aerialJob === undefined) return undefined;
				if (aerialJob.state !== "downloading" && aerialJob.state !== "exporting" && aerialJob.state !== "applying") return undefined;
				const id = aerialJob.id;
				const name = aerialJob.name;
				let live = true;
				const timer = setInterval(async () => {
					const fetchImpl = transport();
					if (fetchImpl === null) return;
					try {
						const response = await fetchImpl(`${API_BASE}/aerial-download?id=${encodeURIComponent(id)}`);
						const payload = await response.json();
						if (live === false || payload?.ok !== true) return;
						if (payload?.job === undefined || payload?.job === null) return;
						setAerialJob(payload.job);
						if (payload.job.state === "done") {
							setToast({ tone: "ok", text: t("aerials.applied", { name }) });
							/* The host has already written the persisted selection, so the
							   next paint is the new wallpaper either way. The live leg runs
							   here, on the panel's own runtime, because a booted document
							   is never re-read from disk: without it the page keeps the
							   old background until the user reloads. */
							const catalog = await load(true);
							const skin = typeof payload.job.skin === "string" ? payload.job.skin : "";
							const entry = catalog === null || skin === "" ? null : catalog.wallpapers.find((wallpaper) => wallpaper.skin === skin) ?? null;
							if (entry !== null) {
								try {
									const result = await applyWallpaper({ fetchImpl, doc: globalThis.window?.document }, entry);
									chosenRef.current = true;
									setActiveSkin(result.activeSkin);
								} catch {
									/* The wallpaper is in the library and selected; only the
									   no-reload switch did not happen. The toast already says
									   it was added, so this needs no second message. */
								}
							}
						} else if (payload.job.state === "failed") {
							setToast({ tone: "error", text: t("aerials.downloadFailed", { reason: payload.job.error }) });
						}
					} catch {
						/* A dropped poll is not a dropped job; the next tick asks again. */
					}
				}, 900);
				return () => {
					live = false;
					clearInterval(timer);
				};
			}, [aerialJob?.id, aerialJob?.state, transport, t, load]);

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
			/**
			* Put one film into one of its four states.
			*
			* Resolution and loop cut are one decision because they are one file:
			* the drawer asks both at once, and the host rewrites the film once.
			* The cut that was playing is replaced in place, so an active skin is
			* re-staged afterwards exactly like the old seam switch and compress
			* button did.
			*/
			const onFilm = useCallback(
				async (entry, choice) => {
					const fetchImpl = transport();
					if (fetchImpl === null) return;
					setFilmPending(entry.id);
					const task = beginTask("film", entry.id, t("hud.film", { name: entry.nameZh }));
					try {
						await postWallpaperAction(fetchImpl, "film", entry.id, undefined, {
							quality: choice?.quality === "native" ? "native" : "compressed",
							seam: choice?.seam === true
						});
						await load();
						if (entry.skin === activeSkin) await restageActiveSkin(entry.skin);
						settleTask(task, "done");
					} catch (error) {
						await load();
						settleTask(task, "failed", String(error?.code ?? error?.message ?? ""));
					} finally {
						setFilmPending(null);
					}
				},
				[transport, t, load, activeSkin, restageActiveSkin, beginTask, settleTask]
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
				const timer = globalThis.setTimeout(() => setToast(null), life);
				return () => globalThis.clearTimeout(timer);
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
												onOpen: openDetail,
												onQuick: onApply,
												onRemove,
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
				head,
				h(
					"div",
					{ className: "dsl-appear-pageScroll", key: "scroll", ref: scrollRef, onScroll },
					h("div", { className: "dsl-appear-pageContent", key: "content" }, [
						props.skin
							? h(SkinSettingsSection, {
									key: "skin",
									t,
									skin: props.skin
								})
							: null,
						h(StartupSplashSection, {
							key: "startup",
							t,
							onToast: (message, tone) => setToast({ tone, text: message })
						}),
						controls,
						noteOpen && catalog !== null
							? h(LibraryNote, { key: "note", entry: catalog.entry, onClose: () => setNoteOpen(false), t })
							: null,
						body,
						catalog === null
							? null
							: h(AerialPendingSection, { key: "aerials", aerials: catalog.aerials, query, t, opening, onOpen: onOpenSettings, job: aerialJob, onApply: onApplyAerial, openChoice: aerialOpen, onToggle: onToggleAerial, sectionOpen: aerialSectionOpen, onToggleSection: onToggleAerialSection }),
						catalog === null
							? null
							: h(DynamicWallpapersSection, { key: "dynamics", dynamics: catalog.dynamics, t, sectionOpen: dynamicSectionOpen, onToggleSection: setDynamicSectionOpen }),
						toast === null
							? null
							: h(
									"div",
									{ className: "dsl-appear-toastWrap", key: "toast" },
									h(
										"div",
										{
											className: `dsl-appear-toast${toast.tone === "error" ? " dsl-appear-toastError" : ""}`,
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
					filmBusy: detailEntry !== null && filmPending === detailEntry.id,
					onClose: closeDetail,
					onApply,
					onRemove,
					onFilm,
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
			const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
			let queue = [];
			let timer = null;
			let disposed = false;
			/**
			* A live writer installed by the skin runtime, when one is mounted.
			*
			* The profile config form is only one of the places a skin background can
			* be owned, and with the skin center unmounted it is no longer the
			* authority a reload reads: the v2 document is. When the runtime attaches,
			* a write goes straight to it — one call repaints the document and
			* persists it — instead of racing a form whose mutate may be refused.
			*/
			let sink = null;
			const write = (field, value) => {
				if (disposed) return Promise.resolve(false);
				if (sink !== null) {
					try {
						sink(field, value);
						return Promise.resolve(true);
					} catch (error) {
						// Fall through to the shared section: a broken runtime must not
						// take the controls down with it.
					}
				}
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
			return {
				available: true,
				dictionary: null,
				/**
				* Install the live writer, or clear it with `null`.
				* @param next - the field writer, or null to hand writes back to the form.
				*/
				attach: (next) => {
					sink = typeof next === "function" ? next : null;
				},
				detach: () => {
					sink = null;
				},
				/** True while the live runtime writer is installed, so the section can stay interactive. */
				hasSink: () => sink !== null,
				subscribe: (listener) => bound.subscribe(listener),
				getSnapshot: () => skinSection(bound.getSnapshot()),
				/** Debounced, so dragging a slider is one write instead of forty. */
				set: (field, value) => {
					queue = queue.filter((entry) => entry.field !== field);
					queue.push({ field, value });
					if (timer !== null) clearTimeout(timer);
					timer = setTimeout(flush, SKIN_WRITE_DEBOUNCE);
				},
				flush,
				setEnabled: (enabled) => write("enabled", enabled === true),
				/**
				* The live background document, or null when it cannot be read. This is a
				* read-only view: writes go through the attached runtime writer, which is
				* what makes them take effect without a reload.
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
		 * The skin settings block: the enable switch and the four background
		 * sliders, reading the same section the settings page reads.
		 * @param props - { t, skin }.
		 */
		function SkinSettingsSection(props) {
			const { t, skin } = props;
			const translate = typeof skin.dictionary === "function" ? skin.dictionary : t;
			const [open, setOpen] = useState(() => readSkinOpen() !== false);
			const [snapshot, setSnapshot] = useState(() => skin.getSnapshot());
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
			const loading = snapshot.status === "loading";
			const liveSink = typeof skin.hasSink === "function" && skin.hasSink() === true;
			const readonly = snapshot.writable !== true && liveSink !== true;
			const slider = (spec) => {
				const value = draft[spec.key];
				return h("div", { className: "dsl-appear-skinField", key: spec.key }, [
					h("div", { className: "dsl-appear-skinFieldHead", key: "head" }, [
						h("label", { className: "dsl-appear-skinLabelText", key: "label", htmlFor: "dsl-appear-skin-" + spec.key }, translate(spec.labelKey)),
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
				h("div", { className: "dsl-appear-skinDivider", key: "divider" }),
				h("div", { className: "dsl-appear-skinGrid", key: "grid" }, SKIN_SLIDERS.map(slider)),
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
						h("div", { className: "dsl-appear-skinTitles", key: "titles" }, [
							h("span", { className: "dsl-appear-skinTitle", key: "title" }, translate("skin.title")),
							h("span", { className: "dsl-appear-skinSubtitle", key: "subtitle" }, translate("skin.subtitle"))
						])
					]
				),
				open === false ? null : h("div", { className: "dsl-appear-skinBody", key: "body" }, body)
			]);
		}
		//#endregion
		/* ---------- launch animation ---------- */
		/** 启动动画插件自己的接口；面板只是它的一个前端。 */
		const STARTUP_API = "/api/muciya-appearance/v1/startup";
		/** 展开状态是面板偏好：默认折叠，折叠时一个请求都不发。 */
		const STARTUP_OPEN_KEY = "dsh.appearance-library.startupOpen";
		const STARTUP_ACCEPT = "video/mp4,video/x-m4v,video/webm,.mp4,.m4v,.webm";
		const STARTUP_AUDIO_ACCEPT = "audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac";
		
		function readStartupOpen() {
			try {
				return globalThis.localStorage?.getItem(STARTUP_OPEN_KEY) === "1";
			} catch (error) {
				return false;
			}
		}
		
		function writeStartupOpen(open) {
			try {
				globalThis.localStorage?.setItem(STARTUP_OPEN_KEY, open ? "1" : "0");
			} catch (error) {
				// 没有 storage 时保持折叠。
			}
		}
		
		/**
		* `x-filename` 只能放 ASCII：先把中文名折成宿主半能接受的名字。
		* 宿主半的 `storedClipName` 还会再兜一层，这里只是让头部本身合法。
		*/
		function asciiClipName(name) {
			const raw = String(name === undefined || name === null ? "" : name).trim();
			const dot = raw.lastIndexOf(".");
			const ext = dot > 0 ? raw.slice(dot).toLowerCase() : ".mp4";
			const stem = (dot > 0 ? raw.slice(0, dot) : raw)
				.normalize("NFKD")
				.replace(/[^A-Za-z0-9._-]+/g, "-")
				.replace(/^[-._]+/, "")
				.replace(/[-._]+$/, "")
				.slice(0, 50);
			return (stem === "" ? "clip" : stem) + ext;
		}
		
		/** 导入片的第 0 帧；插件自己没有解码器，海报得由面板截好回传。 */
		function captureFirstFrame(file) {
			const create = globalThis.document?.createElement;
			if (typeof create !== "function") return Promise.resolve(null);
			return new Promise((settle) => {
				const url = URL.createObjectURL(file);
				const video = create("video");
				const done = (value) => {
					URL.revokeObjectURL(url);
					settle(value);
				};
				video.muted = true;
				video.preload = "auto";
				video.onerror = () => done(null);
				video.onloadeddata = () => {
					const width = Math.min(video.videoWidth || 0, 1600);
					const height = width === 0 ? 0 : Math.round((video.videoHeight / video.videoWidth) * width);
					if (width === 0 || height === 0) {
						done(null);
						return;
					}
					const canvas = create("canvas");
					canvas.width = width;
					canvas.height = height;
					const context = canvas.getContext("2d");
					if (context === null || typeof canvas.toBlob !== "function") {
						done(null);
						return;
					}
					context.drawImage(video, 0, 0, width, height);
					canvas.toBlob((blob) => done(blob), "image/jpeg", 0.86);
				};
				video.src = url;
			});
		}
		
		/**
		* The launch-animation block, right after the skin settings.
		*
		* A thin front end over the launch-animation host half, which lives in
		* `lib/startup/boot.js` of this same plugin: the film, the sound and the knobs
		* all live in `$DSH_HOME/startup-splash.json`, and this panel writes that same
		* file through this plugin's own `/v1/startup/*` routes, so the app package is
		* never touched. Collapsed by default and only reads the config once it opens —
		* the offline harness asserts that filtering never hits the network.
		*/
		function StartupSplashSection(props) {
			const { t, onToast } = props;
			const latest = useRef({ t, onToast });
			latest.current = { t, onToast };
			const [open, setOpen] = useState(readStartupOpen);
			const [data, setData] = useState(null);
			const [status, setStatus] = useState("idle");
			const [busy, setBusy] = useState(null);
			const [advanced, setAdvanced] = useState(false);
			const [previewing, setPreviewing] = useState(false);
			const fileRef = useRef(null);
			const audioRef = useRef(null);
			const soundRef = useRef(null);
			const queued = useRef({});
			const timer = useRef(null);
			const alive = useRef(true);
			useEffect(
				() => () => {
					alive.current = false;
					if (timer.current !== null) clearTimeout(timer.current);
					if (soundRef.current !== null) {
						soundRef.current.pause();
						soundRef.current = null;
					}
				},
				[]
			);
			const load = useCallback(async () => {
				const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
				if (fetchImpl === null) {
					setStatus("error");
					return null;
				}
				setStatus("loading");
				try {
					const response = await fetchImpl(STARTUP_API + "/config");
					const payload = await response.json();
					if (payload?.ok !== true) throw new Error(payload?.error ?? "config");
					if (alive.current === false) return null;
					setData(payload);
					setStatus("ready");
					return payload;
				} catch (error) {
					if (alive.current === false) return null;
					setStatus("error");
					latest.current.onToast(latest.current.t("startup.loadFailed", { reason: String(error?.message ?? error) }), "error");
					return null;
				}
			}, []);
			useEffect(() => {
				if (open === false || status !== "idle") return;
				load();
			}, [open, status, load]);
			/** 合并同一批改动再写一次，滑杆拖动不会打出一串请求。 */
			const flush = () => {
				timer.current = null;
				const patch = queued.current;
				queued.current = {};
				if (Object.keys(patch).length === 0) return;
				const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
				if (fetchImpl === null) return;
				Promise.resolve()
					.then(() => fetchImpl(STARTUP_API + "/config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }))
					.then((response) => response.json())
					.then((payload) => {
						if (payload?.ok !== true) throw new Error(payload?.error ?? "write");
						if (alive.current === false) return;
						setData(payload);
						setStatus("ready");
					})
					.then(undefined, (error) => {
						if (alive.current) latest.current.onToast(latest.current.t("startup.saveFailed", { reason: String(error?.message ?? error) }), "error");
					});
			};
			const change = (key, value) => {
				setData((current) => (current === null ? current : Object.assign({}, current, { config: Object.assign({}, current.config, { [key]: value }) })));
				queued.current[key] = value;
				if (timer.current !== null) clearTimeout(timer.current);
				timer.current = setTimeout(flush, 260);
			};
			const importFilm = async (file) => {
				if (file === undefined || file === null) return;
				const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
				if (fetchImpl === null) return;
				setBusy("import");
				try {
					const body = await file.arrayBuffer();
					const response = await fetchImpl(STARTUP_API + "/clip", {
						method: "POST",
						headers: { "content-type": file.type === "" ? "video/mp4" : file.type, "x-filename": asciiClipName(file.name) },
						body
					});
					const payload = await response.json();
					if (payload?.ok !== true) throw new Error(payload?.error ?? "import");
					try {
						const still = await captureFirstFrame(file);
						if (still !== null) {
							await fetchImpl(STARTUP_API + "/poster", { method: "POST", headers: { "content-type": "image/jpeg" }, body: still });
						}
					} catch (error) {
						// 海报只是首帧占位，失败不影响换片。
					}
					await load();
					latest.current.onToast(latest.current.t("startup.imported", { name: file.name }), "ok");
				} catch (error) {
					latest.current.onToast(latest.current.t("startup.importFailed", { reason: String(error?.message ?? error) }), "error");
				} finally {
					if (alive.current) setBusy(null);
				}
			};
			const restoreFilm = async () => {
				const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
				if (fetchImpl === null) return;
				setBusy("restore");
				try {
					const response = await fetchImpl(STARTUP_API + "/clip", { method: "DELETE" });
					const payload = await response.json();
					if (payload?.ok !== true) throw new Error(payload?.error ?? "delete");
					setData(payload);
					setStatus("ready");
					latest.current.onToast(latest.current.t("startup.restored"), "ok");
				} catch (error) {
					latest.current.onToast(latest.current.t("startup.restoreFailed", { reason: String(error?.message ?? error) }), "error");
				} finally {
					if (alive.current) setBusy(null);
				}
			};
			const reveal = async () => {
				const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
				if (fetchImpl === null) return;
				try {
					const response = await fetchImpl(STARTUP_API + "/reveal", { method: "POST" });
					const payload = await response.json();
					if (payload?.ok !== true) throw new Error(payload?.error ?? "reveal");
					latest.current.onToast(latest.current.t("startup.revealed"), "ok");
				} catch (error) {
					latest.current.onToast(latest.current.t("startup.revealFailed", { reason: String(error?.message ?? error) }), "error");
				}
			};
			const importAudio = async (file) => {
				if (file === undefined || file === null) return;
				const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
				if (fetchImpl === null) return;
				setBusy("audio-import");
				try {
					const body = await file.arrayBuffer();
					const response = await fetchImpl(STARTUP_API + "/audio", {
						method: "POST",
						headers: { "content-type": file.type === "" ? "audio/mpeg" : file.type, "x-filename": asciiClipName(file.name) },
						body
					});
					const payload = await response.json();
					if (payload?.ok !== true) throw new Error(payload?.error ?? "import");
					await load();
					latest.current.onToast(latest.current.t("startup.audio.imported", { name: file.name }), "ok");
				} catch (error) {
					latest.current.onToast(latest.current.t("startup.audio.importFailed", { reason: String(error?.message ?? error) }), "error");
				} finally {
					if (alive.current) setBusy(null);
				}
			};
			const restoreAudio = async () => {
				const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
				if (fetchImpl === null) return;
				setBusy("audio-restore");
				try {
					const response = await fetchImpl(STARTUP_API + "/audio", { method: "DELETE" });
					const payload = await response.json();
					if (payload?.ok !== true) throw new Error(payload?.error ?? "delete");
					setData(payload);
					setStatus("ready");
					latest.current.onToast(latest.current.t("startup.audio.restored"), "ok");
				} catch (error) {
					latest.current.onToast(latest.current.t("startup.audio.restoreFailed", { reason: String(error?.message ?? error) }), "error");
				} finally {
					if (alive.current) setBusy(null);
				}
			};
			const stopPreview = () => {
				if (soundRef.current !== null) {
					soundRef.current.pause();
					soundRef.current = null;
				}
				if (alive.current) setPreviewing(false);
			};
			const previewAudio = () => {
				if (previewing) {
					stopPreview();
					return;
				}
				if (audio === null || audio === undefined || typeof audio.url !== "string") return;
				const level = config === null ? 0.6 : Number(config.volume);
				try {
					const node = new Audio(audio.url + "&t=" + String(Date.now()));
					node.volume = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0.6;
					soundRef.current = node;
					const started = node.play();
					setPreviewing(true);
					if (started !== undefined && typeof started.catch === "function") {
						started.catch(() => stopPreview());
					}
					setTimeout(() => {
						if (soundRef.current === node) stopPreview();
					}, 3000);
				} catch (error) {
					stopPreview();
				}
			};
			const config = data === null ? null : data.config;
			const clip = data === null ? null : data.clip;
			const audio = data === null ? null : data.audio;
			const badge =
				status === "error" ? t("startup.unavailable") : config === null ? "" : config.enabled === false ? t("startup.off") : t("startup.on");
			const toggle = (key, labelKey, hintKey) =>
				h("div", { className: "dsl-appear-skinToggle", key: key }, [
					h("div", { className: "dsl-appear-skinToggleText", key: "text" }, [
						h("span", { className: "dsl-appear-skinLabel", key: "label" }, t(labelKey)),
						hintKey === undefined ? null : h("p", { className: "dsl-appear-skinHint", key: "hint" }, t(hintKey))
					]),
					h(
						"button",
						{
							key: "switch",
							type: "button",
							className: "dsl-appear-skinSwitch",
							role: "switch",
							"aria-checked": config !== null && config[key] === true ? "true" : "false",
							disabled: config === null,
							onClick: () => change(key, !(config !== null && config[key] === true))
						},
						h("span", { className: "dsl-appear-skinSwitchKnob", key: "knob" })
					)
				]);
			const slider = (key, labelKey, min, max, step, unit, scale, disabled, hint) => {
				const stored = config === null ? min : config[key];
				const shown = scale === undefined ? stored : Math.round(stored * scale);
				return h("div", { className: "dsl-appear-skinField", key }, [
					h("div", { className: "dsl-appear-skinFieldHead", key: "head" }, [
						h("label", { className: "dsl-appear-skinLabelText", key: "label", htmlFor: "dsl-appear-startup-" + key }, t(labelKey)),
						h("span", { className: "dsl-appear-skinValue", key: "value" }, String(shown) + unit)
					]),
					h("input", {
						key: "range",
						id: "dsl-appear-startup-" + key,
						className: "dsl-appear-skinRange",
						type: "range",
						min,
						max,
						step,
						value: shown,
						disabled: config === null || disabled === true,
						"aria-label": t(labelKey),
						onChange: (event) => change(key, scale === undefined ? Number(event.target.value) : Number(event.target.value) / scale)
					}),
					hint === undefined ? null : hint
				]);
			};
			const clipRow = h("div", { className: "dsl-appear-skinField", key: "clip" }, [
				h("div", { className: "dsl-appear-skinFieldHead", key: "head" }, [
					h("span", { className: "dsl-appear-skinLabelText", key: "label" }, t("startup.clip")),
					h("span", { className: "dsl-appear-skinValue", key: "value", title: clip === null ? undefined : clip.name }, clip === null ? "—" : clip.name)
				]),
				h("div", { className: "dsl-appear-skinTools", key: "tools" }, [
					h(
						"button",
						{ key: "import", type: "button", className: "dsl-appear-skinTool", disabled: busy !== null, onClick: () => (fileRef.current === null ? undefined : fileRef.current.click()) },
						busy === "import" ? t("startup.importing") : t("startup.import")
					),
					clip !== null && clip.builtin === false
						? h("button", { key: "restore", type: "button", className: "dsl-appear-skinTool", disabled: busy !== null, onClick: restoreFilm }, t("startup.restore"))
						: null,
					h("button", { key: "reveal", type: "button", className: "dsl-appear-skinTool", disabled: busy !== null, onClick: reveal }, t("startup.reveal"))
				]),
				h("input", {
					key: "file",
					ref: fileRef,
					type: "file",
					accept: STARTUP_ACCEPT,
					style: { display: "none" },
					onChange: (event) => {
						const file = event.target.files?.[0] ?? null;
						event.target.value = "";
						importFilm(file);
					}
				})
			]);
			/* The panel talks in seconds, not in a speed multiplier: "3 秒" is the
			   length the user actually sees, and the host derives the rate so the
			   two can never disagree. */
			const rateShown = data !== null && typeof data.rate === "number" ? data.rate : config === null ? 1 : config.rate;
			const durationField = slider(
				"duration",
				"startup.duration",
				2,
				10,
				0.5,
				" s",
				undefined,
				false,
				h("p", { className: "dsl-appear-skinHint", key: "hint" }, t("startup.duration.hint", { rate: (Math.round(rateShown * 100) / 100).toFixed(2) }))
			);
			const muted = config !== null && config.muted === true;
			const soundFields = [
				toggle("muted", "startup.muted"),
				slider(
					"volume",
					"startup.volume",
					0,
					100,
					1,
					"%",
					100,
					muted,
					muted ? h("p", { className: "dsl-appear-skinHint", key: "hint" }, t("startup.volume.muted")) : undefined
				),
				audio === null || audio === undefined ? null : toggle("keepFilmAudio", "startup.keepFilmAudio", "startup.keepFilmAudio.hint"),
				audio === null || audio === undefined ? null : slider("audioStart", "startup.audio.start", 0, 10, 0.1, " s"),
				audio === null || audio === undefined ? null : toggle("audioOverrun", "startup.audio.overrun", "startup.audio.overrun.hint")
			].filter(Boolean);
			const audioRow = h("div", { className: "dsl-appear-skinField", key: "audio" }, [
				h("div", { className: "dsl-appear-skinFieldHead", key: "head" }, [
					h("span", { className: "dsl-appear-skinLabelText", key: "label" }, t("startup.audio.source")),
					h("span", { className: "dsl-appear-skinValue", key: "value", title: audio === null || audio === undefined ? undefined : audio.name }, audio === null || audio === undefined ? t("startup.audio.film") : audio.name)
				]),
				h("div", { className: "dsl-appear-skinTools", key: "tools" }, [
					h(
						"button",
						{ key: "import", type: "button", className: "dsl-appear-skinTool", disabled: busy !== null, onClick: () => (audioRef.current === null ? undefined : audioRef.current.click()) },
						busy === "audio-import" ? t("startup.audio.importing") : t("startup.audio.import")
					),
					audio === null || audio === undefined
						? null
						: h(
							"button",
							{ key: "preview", type: "button", className: "dsl-appear-skinTool", onClick: previewAudio },
							previewing ? t("startup.audio.previewing") : t("startup.audio.preview")
						),
					audio === null || audio === undefined
						? null
						: h("button", { key: "restore", type: "button", className: "dsl-appear-skinTool", disabled: busy !== null, onClick: restoreAudio }, t("startup.audio.restore"))
				]),
				h("p", { className: "dsl-appear-skinHint", key: "hint" }, t("startup.audio.hint")),
				h("input", {
					key: "file",
					ref: audioRef,
					type: "file",
					accept: STARTUP_AUDIO_ACCEPT,
					style: { display: "none" },
					onChange: (event) => {
						const file = event.target.files?.[0] ?? null;
						event.target.value = "";
						importAudio(file);
					}
				})
			]);
			const group = (key, titleKey, children) =>
				h("div", { className: "dsl-appear-skinGroup", key }, [
					h("p", { className: "dsl-appear-skinSubhead", key: "head" }, t(titleKey)),
					...children
				]);
			const videoGroup = group("video", "startup.video", [clipRow, durationField]);
			const audioGroup = group("audio", "startup.audio", [audioRow, ...soundFields]);
			const advancedRow = config === null ? null : h("div", { className: "dsl-appear-skinTools", key: "advanced" }, [
				h(
					"button",
					{ type: "button", className: "dsl-appear-skinTool dsl-appear-skinDisclosure", "aria-expanded": advanced ? "true" : "false", onClick: () => setAdvanced(advanced === false) },
					[
						h(primitives.IconChevronRightOutlineRegular, { key: "chevron", size: 12, className: "dsl-appear-skinDisclosureChevron" }),
						h("span", { key: "label" }, t("startup.advanced"))
					]
				)
			]);
			const advancedGroup =
				advanced && config !== null
					? h("div", { className: "dsl-appear-skinGroup", key: "advancedFields" }, [
						h("div", { className: "dsl-appear-skinGrid", key: "grid" }, [
							toggle("newWindowOnly", "startup.newWindowOnly"),
							toggle("acPowerOnly", "startup.acPowerOnly"),
							toggle("debug", "startup.debug"),
							slider("veilAlpha", "startup.veilAlpha", 0, 100, 1, "%", 100),
							slider("waterline", "startup.waterline", 5, 95, 1, "%", 100),
							slider("revealMs", "startup.revealMs", 0, 4000, 50, "ms"),
							slider("holdMs", "startup.holdMs", 0, 4000, 50, "ms"),
							slider("forceExitMs", "startup.forceExitMs", 500, 60000, 250, "ms")
						]),
						h("p", { className: "dsl-appear-skinHint", key: "advancedHint" }, t("startup.advanced.hint"))
					])
					: null;
			const errorRow =
				status === "error"
					? h("div", { className: "dsl-appear-skinError", key: "error" }, [
						h("p", { className: "dsl-appear-skinHint", key: "text" }, t("startup.errorBody")),
						h("button", { key: "retry", type: "button", className: "dsl-appear-skinTool", onClick: () => load() }, t("startup.retry"))
					])
					: null;
			const body = [
				status === "loading" && data === null ? h("p", { className: "dsl-appear-skinHint", key: "loading" }, t("startup.loading")) : null,
				errorRow,
				config === null ? null : toggle("enabled", "startup.enabled", "startup.enabled.hint"),
				config === null ? null : videoGroup,
				config === null ? null : audioGroup,
				advancedRow,
				advancedGroup
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
							writeStartupOpen(next);
							if (next && status === "error") setStatus("idle");
						}
					},
					[
						h(primitives.IconChevronRightOutlineRegular, { key: "chevron", size: 14, className: "dsl-appear-skinChevron" }),
						h("div", { className: "dsl-appear-skinTitles", key: "titles" }, [
							h("span", { className: "dsl-appear-skinTitle", key: "title" }, t("startup.title")),
							h("span", { className: "dsl-appear-skinSubtitle", key: "subtitle" }, t("startup.subtitle"))
						]),
						h("span", { className: "dsl-appear-skinSummary", key: "badge" }, badge)
					]
				),
				open === false ? null : h("div", { className: "dsl-appear-skinBody", key: "body" }, body)
			]);
		}

		//#region skin runtime (extracted from @linxin666/dsh-client-ui-skin-center v0.4.5)
		/**
		* The skin runtime: background strength, the scoped stylesheet controller, the
		* semantic/shell adapters and the catalog-backed boot store. Kept verbatim from
		* the skin center's browser bundle so a skin looks exactly as it did there;
		* the settings panel, custom themes, market trust, the external wallpaper
		* engine interop, the heartbeat and the settings-page card are gone.
		*
		* Wrapped in its own closure so nothing here can collide with this bundle's
		* own identifiers.
		*/
		const SKIN_RUNTIME = (() => {
		//#region src/core/background.ts
		/** Effective value of every field when the state carries none. */
		const SKIN_BACKGROUND_DEFAULTS = {
			enabled: true,
			backgroundOpacity: 0,
			backgroundBlurEmpty: 0,
			backgroundBlurContent: 0,
			inputCardBlur: 10,
			bubbleOpacity: 50,
			bubbleBlur: 10
		};
		/** The fields normalize/sanitize know about; unknown keys are dropped. */
		const SKIN_BACKGROUND_FIELDS = Object.keys(SKIN_BACKGROUND_DEFAULTS);
		function clampInt(value, min, max) {
			return Math.max(min, Math.min(max, Math.round(value)));
		}
		const RANGES = {
			backgroundOpacity: [0, 100],
			backgroundBlurEmpty: [0, 20],
			backgroundBlurContent: [0, 20],
			inputCardBlur: [0, 20],
			bubbleOpacity: [0, 100],
			bubbleBlur: [0, 20]
		};
		function isRecord$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/**
		* Lenient normalization for stored/legacy data: unknown keys and wrongly
		* typed fields are dropped, numeric fields are clamped into range. Never
		* fails; a non-object input yields an empty config.
		*/
		function normalizeSkinBackground(value) {
			if (!isRecord$1(value)) return {};
			const out = {};
			if (typeof value.enabled === "boolean") out.enabled = value.enabled;
			for (const field of Object.keys(RANGES)) {
				const raw = value[field];
				if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
				const [min, max] = RANGES[field];
				out[field] = clampInt(raw, min, max);
			}
			return out;
		}
		/** Fill every absent field from {@link SKIN_BACKGROUND_DEFAULTS}. */
		function resolveSkinBackground(value) {
			return {
				...SKIN_BACKGROUND_DEFAULTS,
				...value ?? {}
			};
		}
		//#endregion
		//#region src/client/background.ts
		/**
		* Background-scrim handle for the skin center: applies the chosen occlusion
		* to the page's backdrop, plus an optional per-state Gaussian blur of that
		* backdrop.
		*
		* Occlusion is a CSS variable on `document.body` (--dsw-skin-scrim), which
		* backdrop-painting skins (blue-fantasy / whale-song) read inside their
		* setBackdrop() so the veil stays in sync across theme flips and try-on
		* restores. The official stock look paints no backdrop, so the variable is
		* inert there — the value still persists so it is ready for the next backdrop
		* skin.
		*
		* The Gaussian blur targets the same painted backdrop through a fixed child
		* of `document.body` using backdrop-filter: it samples the body's own
		* background painted behind it. Separate strengths apply to the empty
		* conversation and the conversation-with-content states, detected from the
		* shell's stable message-row class suffixes (hash prefix varies, suffix is
		* stable). When the active blur is 0 no element exists, so there is no GPU
		* cost. Blur never changes the occlusion behavior above.
		*
		* Occlusion values are 0-100 (0 = no extra veil, 100 = fully obscured); they
		* are written through as a 0..1 alpha for the CSS variable. Blur values are
		* 0-20 px. Dragging the controls applies instantly (live).
		*
		* Persistence (issue #996): the controller owns no settings scope — the
		* remote pairing channel fences settings.* as loopback-only, which is what
		* stranded remote clients on defaults. The caller hands in the initial
		* values and a `persist` callback (the v2 /active channel); later external
		* edits (the official settings page locally, the refetched state remotely)
		* arrive through `init()`.
		*/
		/** The namespace string the Host registers (mirrors src/index.ts). */
		const SKIN_BACKGROUND_NS = "skin-background";
		/** CSS custom property written to document.body and read by backdrop skins. */
		const SCRIM_VAR = "--dsw-skin-scrim";
		/** CSS custom property consumed by skins that expose translucent bubbles. */
		const BUBBLE_ALPHA_VAR = "--dsh-skin-bubble-alpha";
		/** CSS custom property consumed by skins that expose a bubble backdrop blur. */
		const BUBBLE_BLUR_VAR = "--dsh-skin-bubble-blur";
		/** CSS custom property consumed by the shared composer neutralizer. */
		const INPUT_CARD_BLUR_VAR = "--dsh-input-card-blur";
		SKIN_BACKGROUND_DEFAULTS.backgroundOpacity;
		SKIN_BACKGROUND_DEFAULTS.bubbleOpacity;
		SKIN_BACKGROUND_DEFAULTS.bubbleBlur;
		SKIN_BACKGROUND_DEFAULTS.backgroundBlurEmpty;
		/**
		* Selector for a conversation message row inside the shell's center column.
		* Official shell message rows carry `data-chat-anchor-key`; the
		* `data-pane="conversation"` attribute is stamped by the dsh-web-all compat
		* shim on the center column, where the _userRow / _compactionRow /
		* _contextRow / _turnErrorRow suffixes are CSS-module message-row classes
		* (hash prefix varies, suffix is stable).
		*/
		const CONVERSATION_CONTENT_SELECTOR = [
			"[data-chat-anchor-key]",
			"[data-pane=\"conversation\"] [class*=\"_userRow\"]",
			"[data-pane=\"conversation\"] [class*=\"_compactionRow\"]",
			"[data-pane=\"conversation\"] [class*=\"_contextRow\"]",
			"[data-pane=\"conversation\"] [class*=\"_turnErrorRow\"]"
		].join(", ");
		/**
		* Own the background preference set: apply the values to the body instantly
		* and persist user edits through the caller-provided channel.
		*/
		var BackgroundController = class {
			enabledValue = SKIN_BACKGROUND_DEFAULTS.enabled;
			opacityValue = SKIN_BACKGROUND_DEFAULTS.backgroundOpacity;
			blurEmptyValue = SKIN_BACKGROUND_DEFAULTS.backgroundBlurEmpty;
			blurContentValue = SKIN_BACKGROUND_DEFAULTS.backgroundBlurContent;
			inputCardBlurValue = SKIN_BACKGROUND_DEFAULTS.inputCardBlur;
			bubbleOpacityValue = SKIN_BACKGROUND_DEFAULTS.bubbleOpacity;
			bubbleBlurValue = SKIN_BACKGROUND_DEFAULTS.bubbleBlur;
			listeners = /* @__PURE__ */ new Set();
			persist;
			/** The fixed backdrop-filter element, present only while active blur > 0. */
			blurElement = null;
			/** Currently applied backdrop-filter blur px (cached to avoid redundant style writes during streaming). */
			appliedBlur = null;
			/** The body MutationObserver, installed lazily once a blur is active. */
			observer = null;
			/** Pending requestAnimationFrame id for a coalesced recheck. */
			rafId = null;
			/** Guard: after dispose no scheduled work may reinstall anything. */
			disposed = false;
			/**
			* @param initial - values known at construction (the local settings scope
			*   snapshot on loopback); null starts from defaults until init() arrives.
			* @param persist - persistence channel for user edits (v2 /active POST).
			*/
			constructor(initial, persist) {
				this.persist = persist;
				if (initial !== null) this.assign(initial);
				this.applyOcclusion();
				this.applyInputCardBlur();
				this.applyBubbleOpacity();
				this.applyBubbleBlur();
				this.syncBlur();
			}
			/**
			* Replace the current values with externally sourced ones (the refetched
			* v2 state, or a live settings-scope publish). Never persists — the source
			* already owns the stored copy; the caller decides whether to forward the
			* change into the v2 store.
			*/
			init(next) {
				if (this.disposed) return;
				this.assign(next ?? {});
				this.applyOcclusion();
				this.applyInputCardBlur();
				this.applyBubbleOpacity();
				this.applyBubbleBlur();
				this.syncBlur();
				this.publish();
			}
			/** The current values as a persistable config (every field concrete). */
			snapshot() {
				return {
					enabled: this.enabledValue,
					backgroundOpacity: this.opacityValue,
					backgroundBlurEmpty: this.blurEmptyValue,
					backgroundBlurContent: this.blurContentValue,
					inputCardBlur: this.inputCardBlurValue,
					bubbleOpacity: this.bubbleOpacityValue,
					bubbleBlur: this.bubbleBlurValue
				};
			}
			enabled = () => this.enabledValue;
			setEnabled(value) {
				this.enabledValue = value;
				this.applyOcclusion();
				this.applyInputCardBlur();
				this.applyBubbleOpacity();
				this.applyBubbleBlur();
				this.syncBlur();
				this.publish();
				this.persist(this.snapshot());
			}
			opacity = () => this.opacityValue;
			blurEmpty = () => this.blurEmptyValue;
			blurContent = () => this.blurContentValue;
			inputCardBlur = () => this.inputCardBlurValue;
			bubbleOpacity = () => this.bubbleOpacityValue;
			bubbleBlur = () => this.bubbleBlurValue;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			set(opacity) {
				this.opacityValue = this.clampPercent(opacity);
				this.applyOcclusion();
				this.publish();
				this.persist(this.snapshot());
			}
			setBlurEmpty(value) {
				this.blurEmptyValue = this.clampBlur(value);
				this.ensureObserver();
				this.syncBlur();
				this.publish();
				this.persist(this.snapshot());
			}
			setBlurContent(value) {
				this.blurContentValue = this.clampBlur(value);
				this.ensureObserver();
				this.syncBlur();
				this.publish();
				this.persist(this.snapshot());
			}
			setInputCardBlur(value) {
				this.inputCardBlurValue = this.clampBlur(value);
				this.applyInputCardBlur();
				this.publish();
				this.persist(this.snapshot());
			}
			setBubbleOpacity(value) {
				this.bubbleOpacityValue = this.clampPercent(value);
				this.applyBubbleOpacity();
				this.publish();
				this.persist(this.snapshot());
			}
			setBubbleBlur(value) {
				this.bubbleBlurValue = this.clampBlur(value);
				this.applyBubbleBlur();
				this.publish();
				this.persist(this.snapshot());
			}
			dispose() {
				this.disposed = true;
				if (this.rafId !== null) {
					cancelAnimationFrame(this.rafId);
					this.rafId = null;
				}
				this.removeBlurElement();
				document.body.style.removeProperty(INPUT_CARD_BLUR_VAR);
				document.body.style.removeProperty(BUBBLE_ALPHA_VAR);
				document.body.style.removeProperty(BUBBLE_BLUR_VAR);
				if (this.observer !== null) {
					this.observer.disconnect();
					this.observer = null;
				}
			}
			/** Copy one config into the live fields, defaults filling the gaps. */
			assign(config) {
				const resolved = resolveSkinBackground(config);
				this.enabledValue = resolved.enabled;
				this.opacityValue = resolved.backgroundOpacity;
				this.blurEmptyValue = resolved.backgroundBlurEmpty;
				this.blurContentValue = resolved.backgroundBlurContent;
				this.inputCardBlurValue = resolved.inputCardBlur;
				this.bubbleOpacityValue = resolved.bubbleOpacity;
				this.bubbleBlurValue = resolved.bubbleBlur;
			}
			clampBlur(value) {
				return Math.max(0, Math.min(20, Math.round(value)));
			}
			clampPercent(value) {
				return Math.max(0, Math.min(100, Math.round(value)));
			}
			applyInputCardBlur() {
				if (!this.enabledValue) {
					document.body.style.removeProperty(INPUT_CARD_BLUR_VAR);
					return;
				}
				document.body.style.setProperty(INPUT_CARD_BLUR_VAR, this.inputCardBlurValue + "px");
			}
			applyBubbleOpacity() {
				if (!this.enabledValue) {
					document.body.style.removeProperty(BUBBLE_ALPHA_VAR);
					return;
				}
				document.body.style.setProperty(BUBBLE_ALPHA_VAR, String(this.bubbleOpacityValue / 100));
			}
			applyBubbleBlur() {
				if (!this.enabledValue) {
					document.body.style.removeProperty(BUBBLE_BLUR_VAR);
					return;
				}
				document.body.style.setProperty(BUBBLE_BLUR_VAR, this.bubbleBlurValue + "px");
			}
			/** Write the current occlusion onto the body CSS variable (0..1 alpha). */
			applyOcclusion() {
				if (!this.enabledValue) {
					document.body.style.removeProperty(SCRIM_VAR);
					return;
				}
				document.body.style.setProperty(SCRIM_VAR, String(this.opacityValue / 100));
			}
			/**
			* Apply the active blur: empty or with-content strength depending on the
			* conversation state. A value > 0 ensures the fixed blur element exists
			* with the matching backdrop-filter; 0 removes it.
			*/
			syncBlur() {
				if (this.disposed) return;
				if (!this.enabledValue) {
					this.removeBlurElement();
					return;
				}
				this.ensureObserver();
				const active = this.hasConversationContent() ? this.blurContentValue : this.blurEmptyValue;
				if (active > 0) this.ensureBlurElement(active);
				else this.removeBlurElement();
			}
			/** True when the conversation pane hosts at least one message row. */
			hasConversationContent() {
				return document.querySelector(CONVERSATION_CONTENT_SELECTOR) !== null;
			}
			/** Create (if needed) and size the fixed backdrop-filter element. */
			ensureBlurElement(active) {
				if (this.blurElement === null) {
					const element = document.createElement("div");
					element.style.position = "fixed";
					element.style.inset = "0";
					element.style.zIndex = "-1";
					element.style.pointerEvents = "none";
					element.setAttribute("aria-hidden", "true");
					this.blurElement = element;
					document.body.appendChild(element);
					this.appliedBlur = null;
				}
				if (this.appliedBlur === active) return;
				this.appliedBlur = active;
				const blur = "blur(" + active + "px)";
				this.blurElement.style.backdropFilter = blur;
				this.blurElement.style.setProperty("-webkit-backdrop-filter", blur);
			}
			/** Remove the fixed blur element, if present. */
			removeBlurElement() {
				if (this.blurElement === null) return;
				this.blurElement.remove();
				this.blurElement = null;
				this.appliedBlur = null;
			}
			/**
			* Install the MutationObserver on document.body only when either blur
			* field is active, so a fully-disabled blur never pays the observation
			* cost. Runs lazily on the first non-zero set.
			*/
			ensureObserver() {
				if (this.disposed || this.observer !== null) return;
				if (this.blurEmptyValue <= 0 && this.blurContentValue <= 0) return;
				this.observer = new MutationObserver(() => this.scheduleRecheck());
				this.observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["class"]
				});
			}
			/** Coalesce burst mutations into one rAF-delayed recheck. */
			scheduleRecheck() {
				if (this.disposed || this.rafId !== null) return;
				this.rafId = requestAnimationFrame(() => {
					this.rafId = null;
					if (this.disposed) return;
					this.syncBlur();
				});
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region src/client/runtime/backdrop-scene.ts
		/**
		* Unified "backdrop visible" scene marker (issue #777).
		*
		* A skin with painted background media or a mounted Wallpaper Engine
		* wallpaper both put real backdrop art behind the app. The two runtime
		* controllers (skin-controller and wallpaper) report their mount state
		* through setSceneBackdropActive(); this module folds them into ONE body /
		* html marker `data-dsh-backdrop-active` and installs the shared composer
		* seat neutralizer that keys on it.
		*
		* The shell's active composer seat paints a bottom occlusion gradient under
		* the sticky input card (rc.8: a linear gradient to --dsw-alias-bg-base,
		* z-index 7). Backdrop scenes intentionally remove that seat-wide gradient in
		* both active and hero phases so wallpaper art remains unobstructed down to the
		* viewport edge. Skin-provided seat-wide ::before masks are neutralized too.
		* Composer task/statistics surfaces are styled by the shared shell adapter
		* from skin theme tokens, not by this scene layer.
		*
		* The input card itself ([data-composer-card], the official shell's stable card
		* anchor) keeps its translucent tint and gains the configurable backdrop blur
		* (default INPUT_FROST_BLUR_PX).
		*
		* The card rule is enabled only while the conversation actually has message
		* content (data-dsh-conversation-content): an empty conversation has no正文 to
		* occlude, so the input keeps its normal hero appearance without a frost flash.
		* The strength is provided by --dsh-input-card-blur and falls back to the
		* compatibility default when the setting has not loaded yet.
		*
		* The marker is body/html level (managed outside the surface/part/plugin
		* enum, see contracts/semantic-attrs-v1.md) and survives a neutralizer
		* teardown; the style is inert whenever the marker is absent.
		* @module @linxin666/dsh-client-ui-skin-center/runtime/backdrop-scene
		*/
		/** Shared marker: set on html + body while a source reports backdrop art. */
		const BACKDROP_ACTIVE_ATTR = "data-dsh-backdrop-active";
		/** The shared composer-seat neutralizer style's own attribute. */
		const SCENE_NEUTRALIZER_ATTR = "data-dsh-scene-neutralizer";
		/**
		* Attribute of the composer frost follower: a body-level, fixed, empty element
		* sized to the input card's border box while a scene is active.
		*
		* It exists because the frost must NOT be painted on the card. A non-none
		* backdrop-filter (like transform, filter, contain or perspective) makes an
		* element the CONTAINING BLOCK for its fixed-position descendants, and the
		* official shell renders its tooltips inside the composer card: the composer
		* send arrow's bubble is position: fixed, so with the frost on the card it
		* resolved its viewport coordinates against the card, landed far outside it
		* but still inside the conversation scrollport, added its own height to
		* scrollHeight, and every hover clamped the scroll to the new bottom — the
		* whole conversation jumped by hundreds of pixels and snapped back on the
		* next frame (issue #1724). Documented throughout the catalog skins as the
		* reason a card ancestor never carries a filter.
		*
		* A body-level sibling is not an ancestor of the card, so it may carry the
		* blur; because nested backdrop-filters do not compose, the card itself must
		* stay filter-free for the follower's blur to read through its translucent
		* fill. The element is empty and pointer-events:none, and it is a sibling of
		* the app root, never inside the scrollport.
		*/
		const COMPOSER_FROST_ATTR = "data-dsh-composer-frost";
		/** Stacking rung of the follower: above the skin art layers, below the shell. */
		const COMPOSER_FROST_Z_INDEX = "-1";
		/** Conversation-content marker: set while the active conversation has rows. */
		const CONVERSATION_CONTENT_ATTR = "data-dsh-conversation-content";
		/**
		* Stable shell scrollport scoped row selectors. Official builds emit the chat
		* anchor; the CSS-module suffix fallbacks retain compatibility with older
		* shells without returning to a body-wide topic/session query.
		*/
		const ACTIVE_CONVERSATION_CONTENT_SELECTOR = [
			"[data-conversation-scroll] [data-chat-anchor-key]",
			"[data-conversation-scroll] [class*=\"_userRow\"]",
			"[data-conversation-scroll] [class*=\"_compactionRow\"]",
			"[data-conversation-scroll] [class*=\"_contextRow\"]",
			"[data-conversation-scroll] [class*=\"_turnErrorRow\"]"
		].join(", ");
		/**
		* Documents whose composer frost is suppressed by an external owner.
		*
		* The delegated wallpaper plugin paints a fixed frosted composer of its own,
		* and two fixed `backdrop-filter` stacks sample a shell the other one relaid,
		* so the skin center must not add a second one. A plain flag (rather than the
		* backdrop marker) keeps the two concerns apart: suppressing the frost must
		* not retract the skin's own backdrop marker or the seat neutralizer, which
		* the skin still needs.
		*/
		const frostSuppressed = /* @__PURE__ */ new WeakSet();
		/**
		* Suppress (or restore) the composer frost follower for one document.
		*
		* Called by the external-plugin interop watcher while
		* `body[data-we-wallpaper]` is present. Idempotent, and it re-evaluates the
		* follower immediately, so the suppression applies even when the backdrop and
		* conversation markers are unchanged.
		* @param doc - the document whose frost is gated.
		* @param suppressed - true while an external owner paints the composer glass.
		*/
		function setComposerFrostSuppressed(doc, suppressed) {
			if (suppressed) frostSuppressed.add(doc);
			else frostSuppressed.delete(doc);
			syncComposerFrost(doc);
		}
		const sourceSets = /* @__PURE__ */ new WeakMap();
		const contentObservers = /* @__PURE__ */ new WeakMap();
		const contentFrames = /* @__PURE__ */ new WeakMap();
		/** Write a marker attribute only when the desired state is not applied yet. */
		function applyMarker(el, attr, active) {
			if (el === null) return;
			if (active) {
				if (el.getAttribute(attr) !== "true") el.setAttribute(attr, "true");
				return;
			}
			if (el.hasAttribute(attr)) el.removeAttribute(attr);
		}
		/**
		* Report one source's backdrop-art presence. The marker stays on while any
		* source is active, so the skin and wallpaper controllers never clobber each
		* other across their mount/unmount cycles.
		*/
		function setSceneBackdropActive(doc, source, active) {
			let sources = sourceSets.get(doc);
			if (sources === void 0) {
				sources = /* @__PURE__ */ new Set();
				sourceSets.set(doc, sources);
			}
			if (active) sources.add(source);
			else sources.delete(source);
			syncMarker(doc, sources);
		}
		/** Reflect the source set onto html/body and ensure the neutralizer on use. */
		function syncMarker(doc, sources) {
			const active = sources.size > 0;
			applyMarker(doc.body, BACKDROP_ACTIVE_ATTR, active);
			applyMarker(doc.documentElement, BACKDROP_ACTIVE_ATTR, active);
			if (active) {
				ensureSceneNeutralizer(doc);
				startContentObserver(doc);
			} else stopContentObserver(doc);
			syncComposerFrost(doc);
		}
		/**
		* Track whether the active conversation scrollport has message rows for the
		* frost gate. Topic pickers and outgoing session trees can retain their own
		* data-chat-anchor-key nodes during a switch; a body-wide query would count
		* those stale rows and flash the composer frost over the new empty topic.
		*/
		function updateConversationContent(doc) {
			const has = doc.body !== null && doc.body.querySelector(ACTIVE_CONVERSATION_CONTENT_SELECTOR) !== null;
			applyMarker(doc.body, CONVERSATION_CONTENT_ATTR, has);
			applyMarker(doc.documentElement, CONVERSATION_CONTENT_ATTR, has);
			syncComposerFrost(doc);
		}
		/**
		* Coalesce the mutation bursts of a streaming conversation into one content
		* check per frame; a check scheduled for a document that stopped observing is
		* dropped so a late frame can never re-add the marker after teardown.
		*/
		function scheduleConversationContent(doc) {
			if (contentFrames.has(doc)) return;
			const win = doc.defaultView;
			if (win === null || typeof win.requestAnimationFrame !== "function") {
				updateConversationContent(doc);
				return;
			}
			contentFrames.set(doc, win.requestAnimationFrame(() => {
				contentFrames.delete(doc);
				if (!contentObservers.has(doc)) return;
				updateConversationContent(doc);
			}));
		}
		/** Observe the conversation tree while a backdrop is visible. */
		function startContentObserver(doc) {
			if (contentObservers.has(doc)) return;
			updateConversationContent(doc);
			const win = doc.defaultView;
			if (win === null || typeof win.MutationObserver !== "function") return;
			const observer = new win.MutationObserver(() => scheduleConversationContent(doc));
			observer.observe(doc.body ?? doc.documentElement, {
				childList: true,
				subtree: true
			});
			contentObservers.set(doc, observer);
		}
		/** Stop the content observer, cancel pending work and drop the marker. */
		function stopContentObserver(doc) {
			const frame = contentFrames.get(doc);
			if (frame !== void 0) {
				const win = doc.defaultView;
				if (win !== null && typeof win.cancelAnimationFrame === "function") win.cancelAnimationFrame(frame);
				contentFrames.delete(doc);
			}
			const observer = contentObservers.get(doc);
			if (observer !== void 0) {
				observer.disconnect();
				contentObservers.delete(doc);
			}
			applyMarker(doc.body, CONVERSATION_CONTENT_ATTR, false);
			applyMarker(doc.documentElement, CONVERSATION_CONTENT_ATTR, false);
			syncComposerFrost(doc);
		}
		/**
		* Install the shared composer-seat neutralizer, keyed by head presence so a
		* cleared head (tests) or a re-mount re-creates it. Without the marker the
		* rules are inert, so the style can outlive a single mount without changing
		* any other look.
		*
		* The composer card is deliberately absent from this sheet: its frost rides
		* {@link COMPOSER_FROST_ATTR} instead, because no rule here may put a
		* containing-block property back on the card (issue #1724).
		*/
		function ensureSceneNeutralizer(doc) {
			if (doc.head === null) return;
			if (doc.head.querySelector(`style[data-dsh-scene-neutralizer]`) !== null) return;
			const style = doc.createElement("style");
			style.setAttribute(SCENE_NEUTRALIZER_ATTR, "");
			style.textContent = `
    html[data-dsh-backdrop-active] [data-composer-seat],
    html[data-dsh-backdrop-active] [data-composer-seat]::before {
      background: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    html[data-dsh-backdrop-active][data-dsh-conversation-content] [${COMPOSER_FROST_ATTR}] {
      backdrop-filter: blur(var(--dsh-input-card-blur, 10px)) !important;
      -webkit-backdrop-filter: blur(var(--dsh-input-card-blur, 10px)) !important;
    }
  `;
			doc.head.appendChild(style);
		}
		const frostFollowers = /* @__PURE__ */ new WeakMap();
		/** The composer card the frost tracks, or null while none is mounted. */
		function composerCardOf(doc) {
			return doc.body === null ? null : doc.body.querySelector("[data-composer-card]");
		}
		/**
		* Create the follower on first use and keep it sized to the composer card.
		*
		* The element is empty, fixed and inert: it paints nothing of its own, and it
		* receives no pointer events, so it can never take a tap from the composer or
		* the sidebar. Sizing uses one measure per animation frame (the shape
		* shell-rendering.ts uses for the composer height) rather than a per-mutation
		* read, and writes only when the box actually changed.
		*/
		function syncFrostFollower(doc) {
			const follower = frostFollowers.get(doc);
			if (follower === void 0) return;
			const card = composerCardOf(doc);
			if (card === null) return;
			if (follower.observed !== card) {
				if (follower.observed !== null) follower.resizeObserver?.unobserve(follower.observed);
				follower.observed = card;
				follower.resizeObserver?.observe(card);
				follower.applied = "";
			}
			const rect = card.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;
			const radius = doc.defaultView?.getComputedStyle(card).borderRadius ?? "";
			const box = [
				rect.top,
				rect.left,
				rect.width,
				rect.height,
				radius
			].map((value) => typeof value === "number" ? Math.round(value) : value).join("|");
			if (box === follower.applied) return;
			follower.applied = box;
			const style = follower.el.style;
			style.top = `${Math.round(rect.top)}px`;
			style.left = `${Math.round(rect.left)}px`;
			style.width = `${Math.round(rect.width)}px`;
			style.height = `${Math.round(rect.height)}px`;
			style.borderRadius = radius;
		}
		/** Coalesce a burst of geometry changes into one measurement per frame. */
		function scheduleFrostSync(doc) {
			const follower = frostFollowers.get(doc);
			if (follower === void 0 || follower.frame !== null) return;
			const win = doc.defaultView;
			if (win === null || typeof win.requestAnimationFrame !== "function") {
				syncFrostFollower(doc);
				return;
			}
			follower.frame = win.requestAnimationFrame(() => {
				follower.frame = null;
				if (!frostFollowers.has(doc)) return;
				syncFrostFollower(doc);
			});
		}
		/** Mount the follower while a scene is visible and start tracking the card. */
		function startFrostFollower(doc) {
			if (frostFollowers.has(doc) || doc.body === null) return;
			const el = doc.createElement("div");
			el.setAttribute(COMPOSER_FROST_ATTR, "");
			el.setAttribute("aria-hidden", "true");
			const style = el.style;
			style.position = "fixed";
			style.pointerEvents = "none";
			style.zIndex = COMPOSER_FROST_Z_INDEX;
			style.borderRadius = "inherit";
			const follower = {
				el,
				resizeObserver: null,
				observed: null,
				onResize: null,
				frame: null,
				applied: ""
			};
			doc.body.appendChild(el);
			frostFollowers.set(doc, follower);
			const win = doc.defaultView;
			if (win !== null && typeof win.ResizeObserver === "function") follower.resizeObserver = new win.ResizeObserver(() => scheduleFrostSync(doc));
			if (win !== null && typeof win.addEventListener === "function") {
				follower.onResize = () => scheduleFrostSync(doc);
				win.addEventListener("resize", follower.onResize);
			}
			syncFrostFollower(doc);
		}
		/** Remove the follower and stop every loop that fed it. */
		function stopFrostFollower(doc) {
			const follower = frostFollowers.get(doc);
			if (follower === void 0) return;
			frostFollowers.delete(doc);
			const win = doc.defaultView;
			if (follower.frame !== null && win !== null && typeof win.cancelAnimationFrame === "function") {
				win.cancelAnimationFrame(follower.frame);
				follower.frame = null;
			}
			follower.resizeObserver?.disconnect();
			follower.resizeObserver = null;
			if (follower.onResize !== null) {
				win?.removeEventListener("resize", follower.onResize);
				follower.onResize = null;
			}
			follower.el.remove();
		}
		/**
		* Attach the composer frost to the current scene state. Called from the shared
		* marker sync so the follower exists exactly while a backdrop is visible and
		* the conversation has content — the same gate the card's old frost rule used.
		*
		* The follower tracks the card through a ResizeObserver on the card itself and
		* one interval-free re-schedule on every re-mount, so a conversation switch
		* that replaces the composer keeps the frost aligned without a polling loop.
		*/
		function syncComposerFrost(doc) {
			if (!(doc.body !== null && doc.body.hasAttribute("data-dsh-backdrop-active") && doc.body.hasAttribute("data-dsh-conversation-content")) || frostSuppressed.has(doc)) {
				stopFrostFollower(doc);
				return;
			}
			startFrostFollower(doc);
		}
		//#endregion
		//#region src/client/runtime/effect-ledger.ts
		function createEffectLedger(now = () => Date.now()) {
			let seq = 0;
			let nextActivation = 1;
			const log = [];
			const live = /* @__PURE__ */ new Map();
			const disposed = /* @__PURE__ */ new Set();
			function push(activationId, kind, label, replacesSeq) {
				seq += 1;
				log.push({
					seq,
					activationId,
					kind,
					label,
					replacesSeq,
					at: now()
				});
				return seq;
			}
			function release(effect, activationId) {
				if (effect.released) return;
				effect.released = true;
				push(activationId, "release", effect.label);
				try {
					effect.teardown();
				} catch {
					push(activationId, "cleanup-failed", effect.label);
				}
			}
			return {
				beginActivation() {
					const id = nextActivation++;
					live.set(id, []);
					push(id, "create", "activation");
					return id;
				},
				record(activationId, label, teardown) {
					const bucket = live.get(activationId);
					if (!bucket || disposed.has(activationId)) throw new Error(`effect "${label}" recorded on disposed/unknown activation ${activationId}`);
					const entrySeq = push(activationId, "create", label);
					bucket.push({
						seq: entrySeq,
						label,
						teardown,
						released: false
					});
					return entrySeq;
				},
				replace(activationId, label, previousSeq, teardown) {
					const bucket = live.get(activationId);
					if (!bucket || disposed.has(activationId)) throw new Error(`effect "${label}" replaced on disposed/unknown activation ${activationId}`);
					if (previousSeq !== void 0) {
						const previous = bucket.find((e) => e.seq === previousSeq);
						if (previous) release(previous, activationId);
					}
					const entrySeq = push(activationId, "replace", label, previousSeq);
					bucket.push({
						seq: entrySeq,
						label,
						teardown,
						released: false
					});
					return entrySeq;
				},
				disposeActivation(activationId) {
					if (disposed.has(activationId)) return;
					disposed.add(activationId);
					const bucket = live.get(activationId) ?? [];
					for (const effect of [...bucket].reverse()) release(effect, activationId);
				},
				isDisposed(activationId) {
					return disposed.has(activationId);
				},
				entries() {
					return log;
				}
			};
		}
		//#endregion
		//#region src/client/runtime/semantic-adapter.ts
		/**
		* The v1 rule table. Single ownership: only the skin-center edits this.
		* Anchors verified against @deepseek-ai rc.7 (see docs/archive survey).
		*/
		const SEMANTIC_RULES_V1 = [
			{
				selector: "[data-slot=\"root\"]",
				attrs: [["data-dsh-surface", "root"]],
				note: "ui-renderer root outlet"
			},
			{
				selector: "[data-slot=\"sidebar\"]",
				attrs: [["data-dsh-surface", "sidebar"]],
				note: "layout sidebar outlet"
			},
			{
				selector: "[data-slot=\"conversation\"], [class*=\"centerCol\"]",
				attrs: [["data-dsh-surface", "conversation"]],
				note: "conversation column: legacy conversation outlet; since dsh 0.1.7 the column carries no data hook, so the css-module suffix (hash prefix varies, suffix stable) is the anchor"
			},
			{
				selector: "[data-slot=\"conversation.session.header\"]",
				attrs: [["data-dsh-surface", "session-header"]],
				note: "conversation header outlet"
			},
			{
				selector: "[data-slot=\"conversation.composer\"]",
				attrs: [["data-dsh-surface", "composer"]],
				note: "composer chain outlet"
			},
			{
				selector: "[data-slot=\"details\"], [data-rightbar-col]",
				attrs: [["data-dsh-surface", "details"]],
				note: "details column: legacy details outlet; since dsh 0.1.7 the right sidebar column carries the official data-rightbar-col hook (0-width while collapsed, so stamping it paints nothing when closed)"
			},
			{
				selector: "[data-shell-overlay]",
				attrs: [["data-dsh-surface", "overlay"]],
				note: "frame overlay attribute"
			},
			{
				selector: "[data-slot=\"shell.overlay\"]",
				attrs: [["data-dsh-surface", "overlay"]],
				note: "shell overlay outlet"
			},
			{
				selector: "[role=\"dialog\"]:has([data-slot=\"settings.section\"])",
				attrs: [["data-dsh-surface", "settings"]],
				note: "settings dialog (composite: dialog containing the section outlet)"
			},
			{
				selector: "[data-chat-flow-kind]",
				attrs: [["data-dsh-part", "message-row"]],
				note: "chat flow item"
			},
			{
				selector: "[data-streaming]",
				attrs: [["data-dsh-part", "message-body"]],
				note: "assistant markdown root"
			},
			{
				selector: "[data-conversation-scroll]",
				attrs: [["data-dsh-part", "scrollport"]],
				note: "conversation scrollport"
			},
			{
				selector: "textarea[data-phase], [data-composer-input]",
				attrs: [["data-dsh-part", "composer-input"]],
				note: "composer input: legacy textarea; current shells render a Lexical contenteditable carrying data-composer-input"
			},
			{
				selector: "[data-decoration=\"chip\"]",
				attrs: [["data-dsh-part", "composer-chip"]],
				note: "composer reference chip"
			},
			{
				selector: "[data-queue-dock]",
				attrs: [["data-dsh-part", "queue-dock"]],
				note: "queued turns dock"
			},
			{
				selector: "[data-turn-tail]",
				attrs: [["data-dsh-part", "turn-tail"]],
				note: "turn tail row"
			},
			{
				selector: "[data-side]",
				attrs: [["data-dsh-part", "resize-handle"]],
				note: "column resize handle"
			},
			{
				selector: "button[class*=\"newSession\"]",
				attrs: [["data-dsh-part", "new-session"]],
				note: "sidebar new-session action (compat seam shields skins from localized labels)"
			},
			{
				selector: "[data-dsh-taskboard-view], [data-dsh-taskboard-board]",
				attrs: [["data-dsh-plugin", "task-board"]],
				note: "task-board panel/board (the sidebar row is shell-owned: its glyph carries data-dsh-panel-entry and the family rule below stamps the row)"
			},
			{
				selector: "[data-dsh-ssh-view]",
				attrs: [["data-dsh-plugin", "ssh"]],
				note: "ssh panel (the sidebar row is shell-owned: its glyph carries data-dsh-panel-entry and the family rule below stamps the row)"
			},
			{
				selector: "[data-gitgraph-chip-anchor], [data-gitgraph-dialog]",
				attrs: [["data-dsh-plugin", "git-graph"]],
				note: "git-graph chip/dialog"
			},
			{
				selector: "[data-dsh-pet-root]",
				attrs: [["data-dsh-plugin", "pet"]],
				note: "pet global root"
			},
			{
				selector: "[class*=\"panelRow\"]:has([data-dsh-panel-entry])",
				attrs: [["data-dsh-part", "sidebar-entry"]],
				note: "a plugin-registered sidebar row (sidebar.panellist): the shell owns the row box and stamps no hook of its own, so the row is recognised by its css-module class plus the glyph identity the registering plugin outputs — same compat technique as newSession"
			}
		];
		/**
		* The anchors the rule table keys on, as one attribute filter for the
		* observer: a glyph or row anchor that is SET on an element already in the
		* tree must re-anchor its ancestors exactly like a newly inserted one.
		*/
		const ANCHOR_ATTRIBUTES = [
			"data-dsh-panel-entry",
			"data-dsh-surface",
			"data-dsh-part",
			"data-dsh-plugin",
			"data-slot",
			"data-chat-flow-kind",
			"data-conversation-scroll",
			"data-turn-tail",
			"data-composer-input",
			"data-queue-dock",
			"data-rightbar-col",
			"data-shell-overlay",
			"data-dsh-taskboard-view",
			"data-dsh-taskboard-board",
			"data-dsh-ssh-view",
			"data-dsh-pet-root",
			"data-gitgraph-chip-anchor",
			"data-gitgraph-dialog",
			"data-decoration",
			"data-streaming",
			"data-side",
			"data-phase"
		];
		/**
		* Safety bound of the ancestor walk, NOT a depth ceiling.
		*
		* The walk's normal terminator is the observed root: every node the observer
		* can report is inside document.body, so the walk returns there (measured —
		* with this bound removed the walk still stops at body on every delivery).
		* This constant only fires for a change inside a subtree that is not connected
		* to the observed root at all, where there is no ancestor to anchor yet and
		* the node's own childList delivery stamps it once it IS attached.
		*
		* It is deliberately far above any real markup depth (the shell's own sidebar
		* row is three hops deep) instead of a small number that would silently leave
		* a deeper row unanchored — which is the very defect this walk exists to fix
		* (issue #1732). A measured sweep anchors through 23 wrapper levels and misses
		* from 24, i.e. only past the point where the tree is pathological.
		*/
		const ANCESTOR_HOPS = 24;
		function createSemanticAdapter(doc) {
			const rules = SEMANTIC_RULES_V1.map((rule) => ({
				rule,
				usable: true,
				matchedInPass: 0
			}));
			let observer = null;
			let stamped = 0;
			let running = false;
			const applyRule = (live, el) => {
				if (!live.usable) return;
				let hit = false;
				try {
					hit = el.matches(live.rule.selector);
				} catch {
					live.usable = false;
					return;
				}
				if (!hit) return;
				live.matchedInPass += 1;
				for (const [name, value] of live.rule.attrs) if (el.getAttribute(name) !== value) {
					el.setAttribute(name, value);
					stamped += 1;
				}
			};
			const applyToTree = (rootEl) => {
				for (const live of rules) {
					if (!live.usable) continue;
					applyRule(live, rootEl);
					let matches = [];
					try {
						matches = Array.from(rootEl.querySelectorAll(live.rule.selector));
					} catch {
						live.usable = false;
						continue;
					}
					for (const el of matches) applyRule(live, el);
				}
			};
			const fullPass = () => {
				for (const live of rules) live.matchedInPass = 0;
				if (doc.documentElement) applyToTree(doc.documentElement);
			};
			/**
			* Re-anchor one changed node and its ancestor chain.
			*
			* applyToTree only walks DOWNWARD: a rule whose selector matches an ancestor
			* of the changed node (the panel-list row is recognised by the glyph INSIDE
			* it) is never re-evaluated when that descendant arrives. React mounts the
			* row first and the registering plugin's glyph a tick later, so without this
			* the row keeps no anchor at all until something forces a full pass
			* (issue #1732). The walk is bounded and stops at the document root.
			*/
			const reanchorAround = (node) => {
				const root = doc.body ?? doc.documentElement;
				let current = node;
				for (let hop = 0; current !== null && hop <= ANCESTOR_HOPS; hop += 1) {
					for (const live of rules) if (live.usable) applyRule(live, current);
					if (current === root || current === doc.documentElement) return;
					current = current.parentElement;
				}
			};
			return {
				get running() {
					return running;
				},
				start() {
					if (running) return;
					running = true;
					fullPass();
					observer = new doc.defaultView.MutationObserver((records) => {
						try {
							for (const record of records) {
								for (const node of Array.from(record.addedNodes)) {
									if (node.nodeType !== 1) continue;
									const el = node;
									applyToTree(el);
									reanchorAround(el.parentElement ?? el);
								}
								const target = record.target.nodeType === 1 ? record.target : null;
								if (target !== null && record.type === "attributes") reanchorAround(target);
							}
						} catch {}
					});
					observer.observe(doc.body ?? doc.documentElement, {
						childList: true,
						subtree: true,
						attributes: true,
						attributeFilter: [...ANCHOR_ATTRIBUTES]
					});
				},
				stop() {
					running = false;
					observer?.disconnect();
					observer = null;
				},
				diagnostics() {
					return {
						invalidRules: rules.filter((r) => !r.usable).map((r) => r.rule.selector),
						unmatchedRules: rules.filter((r) => r.usable && r.matchedInPass === 0).map((r) => r.rule.selector),
						stamped
					};
				}
			};
		}
		//#endregion
		//#region src/client/runtime/shell-rendering.ts
		/**
		* Shared shell rendering corrections for every visual mode owned by the skin
		* center (issue #954). The official shell exposes stable slot / composer
		* anchors, while the workspace-list fade itself is still a CSS-module class.
		* Keep that fallback scoped below sidebar.workspaces so an unrelated animation
		* or overlay whose class contains "fade" is never affected.
		*
		* The stylesheet is inert for the stock look: a catalog skin or a custom theme
		* must be active. The wallpaper mode left this adapter with the built-in
		* Wallpaper Engine bridge (issue #39): the delegated plugin owns the shell
		* corrections for its own backdrop, and this plugin's visual work stands down
		* entirely while that plugin renders. The sheet is installed once per runtime
		* and removed with that runtime, so disabling the plugin restores the shell
		* unchanged.
		* @module @linxin666/dsh-client-ui-skin-center/runtime/shell-rendering
		*/
		/** Marker owned by the shared shell-rendering stylesheet. */
		const SHELL_RENDERING_STYLE_ATTR = "data-dsh-shell-rendering";
		const ACTIVE_VISUAL_SELECTOR = ["html[data-dsh-skin]", "html[data-dsh-custom-theme]:not([data-dsh-skin])"].join(", ");
		const COMPOSER_SEAT_SELECTORS = [
			"[data-slot=\"conversation.composer\"]",
			"[data-composer-seat]",
			"[data-dsh-surface=\"composer\"]"
		];
		/** Build the inert-by-default public rendering corrections. */
		function shellRenderingCss() {
			const scopes = ACTIVE_VISUAL_SELECTOR.split(", ");
			const scoped = (selector) => scopes.map((scope) => `${scope} ${selector}`).join(",\n");
			/* Same, but for a condition that lands on the ROOT element itself.
			   Chaining two root scopes ("html[a] html[b] ...") asks for an <html>
			   inside an <html> and can never match, so the extra attribute has to be
			   folded into the SAME compound selector -- appended after the tagname,
			   which keeps a trailing :not(...) valid. Both attributes really do live
			   on <html>: the skin stamp is set by switchInternal() and the composer
			   stamp by the shell rendering adapter. */
			const scopedOnRoot = (rootAttribute, selector) => scopes
				.map((scope) => `${scope.replace(/^([a-z]+)/i, `$1${rootAttribute}`)} ${selector}`)
				.join(",\n");
			return `
    /* Viewport lock: prevent outer page scrollbar and viewport
       displacement during element focus/scrollIntoView. */
    ${ACTIVE_VISUAL_SELECTOR},
    ${scoped("body")} {
      height: 100% !important;
      width: 100% !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    ${scoped("[data-slot=\"sidebar.workspaces\"] [class*=\"_fade\"]")} {
      background: none !important;
      background-image: none !important;
    }
    ${scoped("[data-composer-card] textarea[data-phase]::placeholder")},
    ${scoped("textarea[data-dsh-part=\"composer-input\"]::placeholder")} {
      color: var(--dsw-alias-label-secondary, var(--dsw-alias-label-caption)) !important;
      -webkit-text-fill-color: var(--dsw-alias-label-secondary, var(--dsw-alias-label-caption)) !important;
      opacity: 1 !important;
    }
    ${scoped("[data-phase=\"active\"] [data-slot=\"conversation.input.dock\"] > *")},
    ${scoped("[data-phase=\"active\"] [data-slot=\"conversation.composer.dock\"] > *")},
    ${scoped("[data-phase=\"active\"] [data-slot=\"conversation.composer.dock\"] + *")} {
      /* One skin-driven accessory surface for task and statistics docks. Skins
         automatically follow their existing semantic theme tokens and may
         override the --dsh-composer-accessory-* variables for a stronger
         signature without coupling this adapter to a specific catalog skin.

         The third head covers an accessory that is a SIBLING of the dock slot
         host rather than a child of it. The slot host is display: contents, so
         the shell lays its children out as items of the surrounding dock row
         and the child heads reach them; 0.1.7's context meter was placed beside
         that host instead of inside it, so it shared the row with the
         statistics pill but stayed bare (issue #1715) -- one line, two looks.
         The adjacent-sibling head keeps the row uniform without naming any
         hashed class or localized label, and covers whatever future accessory
         the shell seats next to the dock. The plate lands on the accessory's
         own seat, never on a trigger inside it, so a component's own hover
         feedback keeps painting on top. */
      background: var(--dsh-composer-accessory-bg, var(--dsw-specific-tip, var(--dsw-alias-bg-layer-1))) !important;
      color: var(--dsh-composer-accessory-color, var(--dsw-alias-label-tertiary)) !important;
      border: var(--dsh-composer-accessory-border, none) !important;
      border-radius: var(--dsh-composer-accessory-radius, 12px) !important;
      box-shadow: var(--dsh-composer-accessory-shadow, var(--dsw-shadow-lv1, 0 2px 10px rgba(7, 20, 38, 0.18)));
      backdrop-filter: blur(var(--dsh-composer-accessory-blur, var(--dsh-input-card-blur, 10px))) !important;
      -webkit-backdrop-filter: blur(var(--dsh-composer-accessory-blur, var(--dsh-input-card-blur, 10px))) !important;
    }
    ${scoped("[data-phase=\"active\"] [data-slot=\"conversation.composer.dock\"] > *")},
    ${scoped("[data-phase=\"active\"] [data-slot=\"conversation.composer.dock\"] + *")} {
      /* Same metrics for a dock child and for the sibling seat beside the dock
         slot host, so the two accessories of one row end up the same height:
         the plate must not make one of them look like a different control. */
      margin-top: var(--dsh-composer-accessory-gap, 4px);
      margin-bottom: var(--dsh-composer-accessory-gap, 4px);
      padding-top: 2px;
      padding-bottom: 2px;
    }
    ${scoped("[data-slot=\"conversation.input.dock\"] > [data-goal-bar=\"true\"][data-goal-bar=\"true\"][data-goal-bar=\"true\"]")} {
      /* The host goal dock spans the full composer seat and contains its own
         centered compact bar. Do not paint the outer dock as an accessory: that
         creates a viewport-wide veil behind the active-goal chip. The repeated
         stable marker deliberately raises specificity above catalog-skin dock
         selectors that load after this shared adapter. */
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    ${scoped("[data-phase=\"active\"] [data-slot=\"conversation.input.dock\"] > [data-queue-dock]")} {
      /* The native queue dock stacks two boxes inside the input dock: a root
         wrapper that only supplies the shared dock inset, and the panel inside
         it that paints its own --dsw-specific-tip fill. Painting the wrapper as
         an accessory adds a second opaque plate one dock inset (8px) wider than
         the panel on each side, which reads as an extra sheet of paper under
         the queue (issue #1572). Reset the accessory surface so the panel stays
         the single layer; the wrapper keeps its inset, so the panel remains
         aligned with the composer card. */
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    ${scoped("[data-phase=\"active\"] [data-slot=\"conversation.composer.dock\"] + *")} {
      /* Dropping blur on the sibling seat only (issue #1757 / dsh-skins#21). The
         adjacent sibling head added for #1715 lands on ContextMeter's seat
         (span.JObwrW_root). A non-none backdrop-filter makes that seat the
         containing block for its position:fixed descendants, causing its hover
         tooltip and click-open panel to resolve against the seat instead of the
         viewport and push 740px+ horizontal scrollable overflow into the
         conversation scrollport (causing scrollbar flicker on mouse enter/leave).
         The seat's background (--dsh-composer-accessory-bg, default --dsw-specific-tip)
         is fully opaque, so the blur on that element is invisible anyway and
         dropping it restores viewport positioning with zero visual change. */
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    /* Composer clearance contract: the transcript must come to rest ABOVE the
       composer, never under it, and the composer itself must not move.
       The composer is either the scrollport's final IN-FLOW child (the default
       chat shell, position:sticky) or taken OUT of flow by the trajectory shell
       (position:absolute;bottom:0). The two need opposite treatment, and only the
       out-of-flow one can actually overlap:
         - in flow: the seat already reserves its own height, so content rests
           above it and no physical padding is needed. Adding any here would be
           inserted BELOW the seat and lift the dock by that amount -- the dock
           must not move.
         - out of flow: nothing reserves the band, so un-padded content comes to
           rest 75px under the input box. Padding equal to one composer height
           makes the content terminate exactly at the composer's top edge, and an
           out-of-flow box ignores its parent's padding, so the composer stays put.
       The in-flow test cannot be written in CSS: :has() looks at structure and
       attributes, never at a computed position. So the shell rendering adapter
       below -- which already re-runs on every body mutation and on every seat
       resize -- reads the computed position off the live seat and stamps
       data-dsh-composer-overlay on <html> while the seat is out of flow. That
       attribute is the whole switch, so the clearance appears the moment the shell
       takes the seat out of flow and disappears the moment it puts it back, and
       this comment no longer has to guess which shell is running.
       --dsh-composer-height is written by that same adapter whenever the seat
       resizes, so the clearance follows a multi-line input and the accessory
       docks. */
    ${scoped("[data-conversation-scroll]")},
    ${scoped("[data-dsh-part=\"scrollport\"]")} {
      padding-bottom: 0 !important;
    }
    ${scopedOnRoot("[data-dsh-composer-overlay=\"true\"]", "[data-conversation-scroll]")},
    ${scopedOnRoot("[data-dsh-composer-overlay=\"true\"]", "[data-dsh-part=\"scrollport\"]")} {
      padding-bottom: var(--dsh-composer-height, 100px) !important;
    }
    /* #978 / #1133: Line-level scroll-margin retains scrollIntoView() clearance
       above the sticky composer without placing a scrollport-level scroll-padding
       that breaks browser caret-reveal geometry (which caused micro-scrolling on
       every keystroke while reading history). */
    ${scoped("[data-conversation-scroll] [data-chat-anchor-key]")},
    ${scoped("[data-conversation-scroll] [data-chat-flow-kind]")},
    ${scoped("[data-conversation-scroll] [data-dsh-part=\"message-row\"]")},
    ${scoped("[data-conversation-scroll] [data-turn-tail]")},
    ${scoped("[data-conversation-scroll] [class*=\"_userRow\"]")},
    ${scoped("[data-conversation-scroll] [class*=\"_compactionRow\"]")},
    ${scoped("[data-conversation-scroll] [class*=\"_contextRow\"]")},
    ${scoped("[data-conversation-scroll] [class*=\"_turnErrorRow\"]")} {
      scroll-margin-bottom: var(--dsh-composer-height, 100px) !important;
    }
    /* dsh 0.1.7 turned the right sidebar panel shell into an always-mounted,
       always-visible positioning box (only its inner dockkit surfaces hide
       while the panel is closed). Skin rules written for the older shell plate
       that shell element and, with the panel closed, cover the conversation
       area with a phantom column. Strip paint from the closed shell whatever
       the active skin; an open panel ([data-sidebar-right-open]) keeps every
       skin paint. The attribute predates the layout change, so the rule is a
       no-op on older shells. */
    ${scoped("[data-slot=\"rightbar.session\"] > [data-sidebar-right-panel]:not([data-sidebar-right-open])")} {
      background: none !important;
      background-color: transparent !important;
      background-image: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }
    /* #1117: The upstream recommended badge pairs two background-fill tokens
       as bg + text — in dark mode, skins like Blue Fantasy collapse them to
       near-identical dark navy values (contrast ~1:1). Override the text
       color to a readable foreground and tweak the background for contrast.
       The dark-theme attribute lives on <body>, so it belongs inside the
       scoped selector: prefixing the already-scoped list produced
       "body ... html ...", a descendant chain that can never match (#1490). */
    ${scoped("body[data-ds-dark-theme] [data-question-key] [class*=\"_badge\"]")},
    ${scoped("body[data-ds-dark-theme] [data-question-scroll] [class*=\"_badge\"]")} {
      color: var(--dsw-alias-label-primary, #ffffff) !important;
      background: var(--dsw-alias-interactive-bg-active, color-mix(in srgb, var(--dsw-alias-button-info-fill, #4a5fa8) 50%, transparent)) !important;
    }
  `;
		}
		/** Install the shared corrections and return their idempotent teardown. */
		function installShellRenderingAdapter(doc) {
			if (doc.head === null) return () => {};
			if (doc.head.querySelector(`style[data-dsh-shell-rendering]`) !== null) return () => {};
			const style = doc.createElement("style");
			style.setAttribute(SHELL_RENDERING_STYLE_ATTR, "");
			style.textContent = shellRenderingCss();
			doc.head.appendChild(style);
			const win = doc.defaultView;
			try {
				win?.scrollTo?.(0, 0);
			} catch {}
			const composerSelector = COMPOSER_SEAT_SELECTORS.join(", ");
			let resizeObserver = null;
			let mutationObserver = null;
			let observedComposer = null;
			let appliedHeight = "";
			let appliedOverlay = "";
			let scheduledFrame = null;
			let disposed = false;
			const resolveComposer = () => {
				if (observedComposer !== null && observedComposer.isConnected) return observedComposer;
				return doc.body === null ? null : doc.body.querySelector(composerSelector);
			};
			const syncHeight = () => {
				if (doc.body === null) return;
				const composer = resolveComposer();
				if (composer === null) return;
				if (observedComposer !== composer) {
					if (observedComposer !== null && resizeObserver !== null) resizeObserver.unobserve(observedComposer);
					observedComposer = composer;
					if (resizeObserver !== null) resizeObserver.observe(composer);
				}
				const rect = composer.getBoundingClientRect();
				if (rect.height <= 0) return;
				const root = doc.documentElement;
				if (root === null) return;
				const next = `${Math.ceil(rect.height)}px`;
				if (next !== appliedHeight) {
					appliedHeight = next;
					root.style.setProperty("--dsh-composer-height", next);
				}
				/* The composer-clearance switch. A seat in normal flow already
				   reserves its own height, so the transcript comes to rest above it
				   and physical padding would only lift the dock; a seat the shell
				   took OUT of flow (position:absolute/fixed, bottom:0) reserves
				   nothing, so the last line comes to rest underneath the input box.
				   Padding on the scrollport fixes exactly that case and leaves an
				   out-of-flow box where it was, because such a box ignores its
				   parent's padding. Measured on the live seat here, because no
				   selector can match a computed position. */
				const position = win?.getComputedStyle?.(composer)?.position ?? "static";
				const overlay = position === "absolute" || position === "fixed" ? "true" : "false";
				if (overlay !== appliedOverlay) {
					appliedOverlay = overlay;
					root.setAttribute("data-dsh-composer-overlay", overlay);
				}
			};
			const scheduleSync = () => {
				if (scheduledFrame !== null || disposed) return;
				if (win === null || typeof win.requestAnimationFrame !== "function") {
					syncHeight();
					return;
				}
				scheduledFrame = win.requestAnimationFrame(() => {
					scheduledFrame = null;
					if (disposed) return;
					syncHeight();
				});
			};
			if (win !== null && typeof win.ResizeObserver === "function") resizeObserver = new win.ResizeObserver(() => syncHeight());
			if (win !== null && typeof win.MutationObserver === "function" && doc.body !== null) {
				mutationObserver = new win.MutationObserver(() => scheduleSync());
				mutationObserver.observe(doc.body, {
					childList: true,
					subtree: true
				});
			}
			syncHeight();
			return () => {
				if (disposed) return;
				disposed = true;
				if (scheduledFrame !== null) {
					if (win !== null && typeof win.cancelAnimationFrame === "function") win.cancelAnimationFrame(scheduledFrame);
					scheduledFrame = null;
				}
				if (resizeObserver !== null) {
					resizeObserver.disconnect();
					resizeObserver = null;
				}
				if (mutationObserver !== null) {
					mutationObserver.disconnect();
					mutationObserver = null;
				}
				observedComposer = null;
				appliedHeight = "";
				appliedOverlay = "";
				doc.documentElement?.style.removeProperty("--dsh-composer-height");
				doc.documentElement?.removeAttribute("data-dsh-composer-overlay");
				style.remove();
			};
		}
		//#endregion
		//#region src/client/runtime/decoration-layers.ts
		const LAYER_ATTR = "data-dsh-skin-layer";
		/**
		* Per-layer paint order. The background sits at -2: negative z-index
		* elements paint ABOVE the html/body backgrounds (so a skin's own opaque
		* root background-color renders BEHIND its art — the v1 layering) yet below
		* every panel surface. It shares -2 with the WE scrim, which never paints
		* at the same time (an active WE wallpaper suppresses skin media, enforced
		* by the controller). The skin-background blur veil (-1) still samples the
		* art above it. Ambient effects paint above the veils; the strip/foreground
		* layers stay below the official overlay band (>=1000).
		*/
		const LAYER_STYLE = {
			background: "position:fixed;top:0;right:0;bottom:0;left:0;z-index:-2;pointer-events:none;will-change:transform;",
			ambient: "position:fixed;top:0;right:0;bottom:0;left:0;z-index:30;pointer-events:none;",
			top: "position:fixed;top:0;left:0;right:0;z-index:40;pointer-events:none;",
			bottom: "position:fixed;bottom:0;left:0;right:0;z-index:40;pointer-events:none;",
			sidebar: "position:fixed;top:0;bottom:0;left:0;z-index:40;pointer-events:none;",
			foreground: "position:fixed;top:0;right:0;bottom:0;left:0;z-index:41;pointer-events:none;"
		};
		function ensureOne(doc, name) {
			const existing = doc.querySelector(`[${LAYER_ATTR}="${name}"]`);
			if (existing) {
				existing.style.cssText = LAYER_STYLE[name];
				return existing;
			}
			const el = doc.createElement("div");
			el.setAttribute(LAYER_ATTR, name);
			el.setAttribute("aria-hidden", "true");
			el.style.cssText = LAYER_STYLE[name];
			doc.body.appendChild(el);
			return el;
		}
		/**
		* Ensure all six layers exist and return their handles. Idempotent; safe to
		* call on every activation.
		*/
		function ensureDecorationLayers(doc) {
			return {
				background: ensureOne(doc, "background"),
				ambient: ensureOne(doc, "ambient"),
				top: ensureOne(doc, "top"),
				bottom: ensureOne(doc, "bottom"),
				sidebar: ensureOne(doc, "sidebar"),
				foreground: ensureOne(doc, "foreground")
			};
		}
		/** Remove every node an activation left in a layer (used on dispose). */
		function clearLayer(layer) {
			while (layer.firstChild) layer.removeChild(layer.firstChild);
		}
		/**
		* Build the background media element for a manifest backgroundMedia layer.
		* Returns null when the theme variant has no media. The element fills the
		* background layer; the scrim (when declared) is a sibling overlay.
		*/
		function buildBackgroundMedia(doc, layer, assetBase) {
			const nodes = [];
			const fullBleed = "position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;object-fit:cover;";
			if (layer.type === "image") {
				const img = doc.createElement("img");
				img.src = `${assetBase}/${layer.src}`;
				img.alt = "";
				img.setAttribute("aria-hidden", "true");
				img.style.cssText = fullBleed;
				nodes.push(img);
			} else {
				const video = doc.createElement("video");
				video.src = `${assetBase}/${layer.src}`;
				video.muted = true;
				video.loop = true;
				video.autoplay = true;
				video.playsInline = true;
				video.setAttribute("aria-hidden", "true");
				video.style.cssText = fullBleed;
				nodes.push(video);
			}
			if (layer.scrim) {
				const scrim = doc.createElement("div");
				scrim.setAttribute("aria-hidden", "true");
				scrim.style.cssText = `position:absolute;inset:0;background:${layer.scrim};`;
				nodes.push(scrim);
			}
			return nodes;
		}
		//#endregion
		//#region src/client/runtime/skin-controller.ts
		/**
		* How long a user-initiated activation may hold the stage while another
		* plugin still owns the visual (issue #49).
		*
		* The claim exists to make the request VISIBLE on the public
		* `html[data-dsh-skin]` stamp, not to compete for the backdrop. The hand-back
		* itself is DOM-level (the other plugin observes that stamp and clears its
		* own), so this window only has to cover that round trip; when it expires
		* without a hand-back the activation withdraws and the remembered selection
		* repaints the moment that owner stops.
		*/
		const USER_INITIATED_YIELD_GRACE_MS = 1500;
		function createSkinController(deps) {
			const doc = deps.doc;
			const ledger = deps.ledger;
			const apiBase = deps.apiBase ?? "/api/skin-center/v2";
			const fetchImpl = deps.fetchImpl ?? fetch.bind(doc.defaultView);
			const layers = ensureDecorationLayers(doc);
			const onError = deps.onError ?? (() => {});
			const themeGet = deps.themeGet ?? (() => doc.body?.hasAttribute("data-ds-dark-theme") ? "dark" : "light");
			const themeSubscribe = deps.themeSubscribe ?? ((listener) => {
				let last = themeGet();
				const observer = new doc.defaultView.MutationObserver(() => {
					const next = themeGet();
					if (next !== last) {
						last = next;
						listener(next);
					}
				});
				if (doc.body) observer.observe(doc.body, {
					attributes: true,
					attributeFilter: ["data-ds-dark-theme"]
				});
				return () => observer.disconnect();
			});
			/**
			* Re-paint the current activation's background media for the live
			* light/dark theme (the controller owns the layer, so a theme flip must
			* swap the variant the same way an activation does). No-op when there is
			* nothing painted or the manifest carries no backgroundMedia.
			*/
			function repaintBackgroundForTheme() {
				if (active === null || currentActivation === null || lastEntry === null) return;
				if (stoodDown) return;
				const media = lastEntry.manifest.contributes.backgroundMedia;
				if (!media) return;
				const variant = themeGet() === "dark" ? media.dark ?? media.light : media.light ?? media.dark;
				if (!variant) return;
				const assetBase = `${apiBase}/skins/${lastEntry.manifest.id}`;
				setBackgroundLayer(currentActivation, buildBackgroundMedia(doc, variant, assetBase));
			}
			const unsubscribeTheme = themeSubscribe(() => repaintBackgroundForTheme());
			const loadStylesheet = deps.loadStylesheet ?? ((href) => new Promise((resolveLink, rejectLink) => {
				const link = doc.createElement("link");
				link.rel = "stylesheet";
				link.href = href;
				const timer = setTimeout(() => rejectLink(/* @__PURE__ */ new Error(`stylesheet load timeout: ${href}`)), 15e3);
				link.onload = () => {
					clearTimeout(timer);
					resolveLink();
				};
				link.onerror = () => {
					clearTimeout(timer);
					rejectLink(/* @__PURE__ */ new Error(`stylesheet load failed: ${href}`));
				};
				doc.head.appendChild(link);
			}));
			let latestRequest = 0;
			/**
			* True from the moment a switch begins until the newest switch settles. A
			* page that recovers its selection asynchronously (the desktop client boots
			* without the tapIndex stamp) has an activation in flight while other
			* subsystems start publishing, and an external verdict flip read during that
			* window is replayed after it settles instead of racing it (issue #1805).
			*/
			let switching = false;
			/** An external verdict flip observed while a switch was in flight. */
			let refreshQueued = false;
			let currentActivation = null;
			const initialSkinId = doc.documentElement?.getAttribute("data-dsh-skin") || null;
			let active = initialSkinId;
			/** The committed selection try-on restores (component scope). */
			let committed = {
				id: initialSkinId,
				entry: null
			};
			/** Last non-null applied entry, so refresh() can re-activate it. */
			let lastEntry = null;
			/** Last evaluated stand-down verdict (refresh() skips no-ops). */
			let lastSuppressed = deps.suppressSkin?.() === true;
			let trying = null;
			let previewing = false;
			const listeners = /* @__PURE__ */ new Set();
			let stoodDown = lastSuppressed === true;
			let stateSnapshot = {
				active: initialSkinId,
				stoodDown,
				trying: null,
				previewing: false
			};
			const emit = () => {
				stateSnapshot = {
					active,
					stoodDown,
					trying,
					previewing
				};
				for (const listener of listeners) listener();
			};
			/**
			* Install one stylesheet as a tracked <link> (the load itself happened in
			* loadStylesheet; here we only register the teardown). Links keep relative
			* url() resolution intact — a <style> tag would resolve them against the
			* document and 404 every skin asset.
			*/
			function trackStylesheet(activation, label, href) {
				const link = doc.head.querySelector(`link[href="${href}"]`);
				ledger.record(activation, `style:${label}`, () => link?.remove());
			}
			/**
			* Paint the skin background art into the `background` decoration layer
			* (z-index:-2) with a snapshot for the activation ledger. Only the CURRENT
			* activation may restore: when an older activation is disposed after a
			* newer one already re-painted the layer, restoring its snapshot would
			* clobber the newer paint.
			*
			* Two reasons the art lives in the layer, not on `document.body`:
			*  - Chromium's backdrop-filter does not sample the canvas/body background,
			*    so the skin-center blur layer (z-index:-1) could never blur body-painted
			*    art (issue #732 defect A). A real fixed element IS sampled, so after
			*    this change the same blur + scrim controls work on the skin backdrop
			*    just like they already do on the Wallpaper Engine layers (issue #777).
			*  - dragon-heir hooks expect the art in ctx.layers.background (they swap
			*    the painted img and apply the v1 filter lift); the layer is the v2
			*    contract and body painting was a leftover half-migration.
			* The body's own opaque background is forced transparent while art is
			* mounted, or the shell's static panels would cover the negative-z layer.
			*/
			function setBackgroundLayer(activation, nodes) {
				const style = doc.body.style;
				const previousBackgroundColor = style.getPropertyValue("background-color");
				const previousBackgroundImage = style.getPropertyValue("background-image");
				const restore = () => {
					if (currentActivation !== activation) return;
					clearLayer(layers.background);
					setSceneBackdropActive(doc, "skin", false);
					if (previousBackgroundColor === "") style.removeProperty("background-color");
					else style.setProperty("background-color", previousBackgroundColor);
					if (previousBackgroundImage === "") style.removeProperty("background-image");
					else style.setProperty("background-image", previousBackgroundImage);
				};
				clearLayer(layers.background);
				if (nodes.length > 0) {
					for (const node of nodes) layers.background.appendChild(node);
					style.setProperty("background-color", "transparent");
					style.setProperty("background-image", "none");
					setSceneBackdropActive(doc, "skin", true);
				} else {
					setSceneBackdropActive(doc, "skin", false);
					if (previousBackgroundColor === "") style.removeProperty("background-color");
					else style.setProperty("background-color", previousBackgroundColor);
					if (previousBackgroundImage === "") style.removeProperty("background-image");
					else style.setProperty("background-image", previousBackgroundImage);
				}
				ledger.record(activation, "background:layer", restore);
			}
			function installBackground(activation, entry) {
				const media = entry.manifest.contributes.backgroundMedia;
				if (!media) {
					setBackgroundLayer(activation, []);
					return;
				}
				const variant = themeGet() === "dark" ? media.dark ?? media.light : media.light ?? media.dark;
				if (!variant) {
					setBackgroundLayer(activation, []);
					return;
				}
				const assetBase = `${apiBase}/skins/${entry.manifest.id}`;
				setBackgroundLayer(activation, buildBackgroundMedia(doc, variant, assetBase));
			}
			async function installHooks(activation, entry) {
				if (!entry.manifest.facets?.client) return;
				const importHooks = deps.importHooks ?? ((url) => import(
					/* @vite-ignore */
					url
));
				try {
					const factory = (await importHooks(`${apiBase}/skins/${entry.manifest.id}/hooks.mjs`))?.default;
					if (typeof factory !== "function") throw new Error("hooks.mjs must default-export defineSkinHooks()");
					const hooks = factory();
					if (typeof hooks?.apply !== "function") throw new Error("defineSkinHooks() must return { apply }");
					const cleanups = [];
					const ctx = {
						skinId: entry.manifest.id,
						scopeAttr: entry.manifest.id,
						assetBase: `${apiBase}/skins/${entry.manifest.id}`,
						layers,
						theme: {
							get: themeGet,
							subscribe: themeSubscribe
						},
						onCleanup: (fn) => {
							cleanups.push(fn);
						}
					};
					hooks.apply(ctx);
					ledger.record(activation, "hooks", () => {
						try {
							hooks.dispose?.();
						} catch (error) {
							onError(`hooks dispose failed for ${entry.manifest.id}`, error);
						}
						for (const cleanup of cleanups.reverse()) try {
							cleanup();
						} catch (error) {
							onError(`hooks cleanup failed for ${entry.manifest.id}`, error);
						}
					});
				} catch (error) {
					onError(`hooks failed for ${entry.manifest.id}; static skin stays active`, error);
				}
			}
			async function persist(id) {
				if (deps.persist) {
					await deps.persist(id);
					return;
				}
				await fetchImpl(`${apiBase}/active`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ active: id })
				});
			}
			async function switchInternal(id, entry, shouldPersist, options) {
				const seq = ++latestRequest;
				switching = true;
				const activation = ledger.beginActivation();
				const suppressed = deps.suppressSkin?.() === true;
				const claimsStage = options?.userInitiated === true && id !== null && entry !== null;
				const withheld = suppressed && !claimsStage;
				try {
					if (!withheld && id !== null && entry !== null) {
						const stylesheetHref = `${apiBase}/skins/${id}/stylesheet`;
						const patchesHref = entry.manifest.contributes.patches !== void 0 ? `${apiBase}/skins/${id}/patches` : null;
						await loadStylesheet(stylesheetHref);
						trackStylesheet(activation, "stylesheet", stylesheetHref);
						if (patchesHref !== null) {
							await loadStylesheet(patchesHref).catch(() => {});
							trackStylesheet(activation, "patches", patchesHref);
						}
						if (seq !== latestRequest) throw new StaleSwitch();
						installBackground(activation, entry);
						await installHooks(activation, entry);
					} else setBackgroundLayer(activation, []);
					if (seq !== latestRequest) throw new StaleSwitch();
					if (id === null || withheld) doc.documentElement.removeAttribute("data-dsh-skin");
					else doc.documentElement.setAttribute("data-dsh-skin", id);
					const previous = currentActivation;
					currentActivation = activation;
					active = id;
					stoodDown = withheld;
					lastSuppressed = withheld;
					if (entry !== null) lastEntry = entry;
					if (shouldPersist) {
						committed = {
							id,
							entry
						};
						trying = null;
						previewing = false;
					} else {
						previewing = id !== committed.id;
						trying = previewing ? id : null;
					}
					emit();
					if (previous !== null) ledger.disposeActivation(previous);
					if (claimsStage && suppressed) scheduleYieldCheck(activation);
					settleSwitch(seq);
					if (shouldPersist) await persist(id).catch((error) => onError("failed to persist the skin selection", error));
					return active;
				} catch (error) {
					ledger.disposeActivation(activation);
					if (error instanceof StaleSwitch) return active;
					if (currentActivation === null) {
						active = null;
						stoodDown = false;
						committed = {
							id: null,
							entry: null
						};
						doc.documentElement.removeAttribute("data-dsh-skin");
						emit();
					}
					onError(`switch to ${id ?? "stock"} failed; previous skin intact`, error);
					return active;
				} finally {
					settleSwitch(seq);
				}
			}
			/**
			* The visual half of a switch is done: release the in-flight flag and replay
			* a verdict flip that arrived while it was loading.
			*
			* Called at the atomic cut, NOT after the persist round-trip. POST /active
			* has no timeout and can hang on a paired desktop, and a page that has
			* already painted must still yield to an external owner the moment that
			* owner's verdict flips - waiting for the write would leave the skin painted
			* over the wallpaper (issue #1805). Idempotent, so the failure paths can
			* call it again from the switch's `finally`.
			*/
			function settleSwitch(seq) {
				if (seq !== latestRequest) return;
				if (!switching && !refreshQueued) return;
				switching = false;
				if (refreshQueued) {
					refreshQueued = false;
					refresh();
				}
			}
			/**
			* Re-check a stage claim once the hand-back window is over (issue #49).
			*
			* The claim is a request, not permission: if the external owner still
			* reports itself active at the end of the window, this activation withdraws
			* through the ordinary withheld path, so a peer that never answers the
			* `html[data-dsh-skin]` stamp cannot leave the skin painted over its visual.
			*
			* Three ways the check stands down without acting, each correct:
			*  - a newer activation replaced this one (it applies its own verdict, and
			*    a newer claim brings its own window);
			*  - another switch is in flight (that switch sampled the verdict itself);
			*  - the owner handed the page back (the paint is what the user asked for,
			*    and `refresh()` already sees a matching verdict, so it is left alone).
			*
			* The timer is ledger-recorded, so superseding this activation or shutting
			* the runtime down cancels it.
			* @param activation - the claiming activation this window belongs to.
			*/
			function scheduleYieldCheck(activation) {
				const timer = setTimeout(() => {
					if (activation !== currentActivation) return;
					if (switching) return;
					if (deps.suppressSkin?.() !== true) return;
					switchInternal(active, active === null ? null : lastEntry, false);
				}, USER_INITIATED_YIELD_GRACE_MS);
				ledger.record(activation, "yield:claim-window", () => clearTimeout(timer));
			}
			/**
			* Re-apply the current selection under the current external verdict.
			*
			* A switch already in flight sampled the verdict before this call, so this
			* defers the flip instead of opening a second activation: the second one
			* would bump the request sequence and cancel the first, which is how the
			* desktop boot lost its persisted selection (issue #1805).
			*/
			async function refresh() {
				const suppressed = deps.suppressSkin?.() === true;
				if (suppressed === lastSuppressed) return active;
				if (switching) {
					refreshQueued = true;
					return active;
				}
				lastSuppressed = suppressed;
				if (active !== null && lastEntry === null) return active;
				return await switchInternal(active, active === null ? null : lastEntry, false);
			}
			return {
				get active() {
					return active;
				},
				get layers() {
					return layers;
				},
				async switchTo(id, entry, options) {
					return await switchInternal(id, entry, true, options);
				},
				async tryOn(id, entry, options) {
					return await switchInternal(id, entry, false, options);
				},
				async exitTryOn() {
					return await switchInternal(committed.id, committed.entry, false);
				},
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				getState() {
					return stateSnapshot;
				},
				isSwitching() {
					return switching;
				},
				refresh,
				shutdown() {
					latestRequest += 1;
					unsubscribeTheme();
					if (currentActivation !== null) {
						ledger.disposeActivation(currentActivation);
						currentActivation = null;
					}
					active = null;
					stoodDown = false;
					trying = null;
					previewing = false;
					committed = {
						id: null,
						entry: null
					};
					emit();
					doc.documentElement.removeAttribute("data-dsh-skin");
				}
			};
		}
		var StaleSwitch = class extends Error {
			constructor() {
				super("superseded by a newer switch");
			}
		};
		//#endregion
		//#region src/client/runtime/boot.ts
		/**
		* Browser boot wiring for the v2 skin runtime (issue #506): one store per
		* document that owns the effect ledger, the skin controller, the semantic
		* adapter and the catalog snapshot. The settings card consumes the store;
		* the store outlives the card (settings panels unmount on close), so a
		* try-on preview survives closing and reopening the panel.
		*
		* Boot sequence: fetch the catalog snapshot once, read the persisted active
		* selection, and activate it (the tapIndex adapter already stamped the
		* attribute and preloaded the stylesheet for first paint; the controller
		* re-installs under ledger ownership so later switches stay atomic).
		* @module @linxin666/dsh-client-ui-skin-center/runtime/boot
		*/
		function bootSkinRuntime(options = {}) {
			const doc = options.doc ?? document;
			const apiBase = options.apiBase ?? "/api/skin-center/v2";
			const fetchImpl = options.fetchImpl ?? fetch.bind(doc.defaultView);
			const controller = createSkinController({
				doc,
				ledger: createEffectLedger(),
				apiBase,
				fetchImpl,
				suppressSkin: options.suppressSkin,
				onError: (message, error) => {
					console.error(`[appearance-library:skin] ${message}`, error);
				}
			});
			const adapter = createSemanticAdapter(doc);
			adapter.start();
			const disposeShellRendering = installShellRenderingAdapter(doc);
			setComposerFrostSuppressed(doc, options.suppressComposerFrost?.() === true);
			let catalog = null;
			let diagnostics = [];
			const listeners = /* @__PURE__ */ new Set();
			const teardowns = /* @__PURE__ */ new Set();
			const emit = () => {
				for (const listener of listeners) listener();
			};
			async function refreshCatalog() {
				const res = await fetchImpl(`${apiBase}/catalog`);
				if (!res.ok) throw new Error(`catalog fetch -> ${res.status}`);
				const payload = await res.json();
				catalog = payload.skins ?? [];
				diagnostics = payload.diagnostics ?? [];
				emit();
			}
			const store = {
				controller,
				adapter,
				doc,
				window: doc.defaultView ?? window,
				apiBase,
				fetchImpl,
				catalog: () => catalog,
				diagnostics: () => diagnostics,
				refreshCatalog,
				find(id) {
					return catalog?.find((s) => s.manifest.id === id) ?? null;
				},
				subscribe(listener) {
					const off = controller.subscribe(listener);
					listeners.add(listener);
					return () => {
						off();
						listeners.delete(listener);
					};
				},
				shutdown() {
					adapter.stop();
					disposeShellRendering();
					controller.shutdown();
					for (const teardown of [...teardowns]) teardown();
					teardowns.clear();
					listeners.clear();
				}
			};
			{
				const root = doc.defaultView;
				root.__skinRuntime = store;
			}
			(async () => {
				try {
					await refreshCatalog();
					let active = doc.documentElement?.getAttribute("data-dsh-skin") || null;
					if (!active) {
						const payload = await (await fetchImpl(`${apiBase}/active`)).json();
						active = payload.ok && typeof payload.active === "string" ? payload.active : null;
					}
					if (active === null) return;
					const entry = store.find(active);
					if (entry === null) {
						/* No built-in fallback skin: an id the catalog no longer carries
						   (a deleted export) simply puts the shell back on stock. */
						await controller.switchTo(null, null);
						return;
					}
					await controller.switchTo(active, entry);
				} catch {
					await controller.switchTo(null, null).catch(() => {});
				}
			})();
			teardowns.add(trackSkinAppliedEvents(store));
			return store;
		}
		/**
		* Install the skin-applied contract: a window event carrying the applied skin
		* id makes this page converge on that skin immediately.
		*
		* The v1 runtime booted through a full document reload, so any page that
		* switched the skin could assume the next load picked the new selection up -
		* the workshop card simply reloaded. The v2 runtime applies in place, so the
		* page that is already open has to converge on the write, and the workshop
		* installs the skin files itself. Legacy-bridge pages announce through that
		* reload event; wiring it here keeps one converge path instead of two.
		* @param store - the runtime store the event converges.
		* @param win - the window whose document the runtime owns.
		* @returns the idempotent listener teardown.
		*/
		function trackSkinAppliedEvents(store) {
			const win = store.window;
			const onApplied = (event) => {
				const detail = event.detail;
				if (detail === null || typeof detail !== "object") return;
				const id = detail.id;
				if (typeof id !== "string" || id === "") return;
				convergeOnSkin(store, id);
			};
			win.addEventListener("dsh-skin-applied", onApplied);
			return () => {
				win.removeEventListener("dsh-skin-applied", onApplied);
			};
		}
		/** Polling cadence for a selection changed outside this page. */
		const SELECTION_POLL_MS = 2e3;
		/** Read the persisted selection; undefined when the endpoint cannot answer. */
		async function fetchPersistedSelection(store) {
			let res;
			try {
				res = await store.fetchImpl(`${store.apiBase}/active`);
			} catch {
				return;
			}
			if (!res.ok) return void 0;
			let payload;
			try {
				payload = await res.json();
			} catch {
				return;
			}
			if (payload.ok !== true) return void 0;
			return typeof payload.active === "string" && payload.active !== "" ? payload.active : null;
		}
		/**
		* Read the persisted selection for a follower that may converge on it:
		* undefined while a switch is in flight, before AND after the read.
		*
		* A switch in flight owns the page's activation, and converging on a selection
		* read during that window supersedes it (that follower switch opens a newer
		* request). The desktop client boots exactly that way - no tapIndex stamp, so
		* its selection arrives from GET /active while the wallpaper watcher is
		* already publishing - and the follower would strand the page on the boot
		* activation's stale paint (issue #1805).
		*
		* The check brackets the request on both sides because a switch can start while
		* the GET is in flight: the value this read returns is then already older than
		* the page's activation, and converging on it would supersede that switch. The
		* read is not lost either way - the next poll sees the same value once the
		* switch has settled.
		*/
		async function readPersistedSelection(store) {
			if (store.controller.isSwitching()) return void 0;
			const selection = await fetchPersistedSelection(store);
			if (store.controller.isSwitching()) return void 0;
			return selection;
		}
		/**
		* Converge on the skin the persisted selection names, re-reading the catalog
		* first when the id is not in the current snapshot (a workshop install lands
		* after the page read the catalog).
		*/
		async function convergeOnSelection(store, id) {
			if (id !== null && store.find(id) === null) try {
				await store.refreshCatalog();
			} catch {}
			if (id === null) {
				await store.controller.switchTo(null, null);
				return;
			}
			const entry = store.find(id);
			if (entry === null) return;
			await store.controller.switchTo(id, entry);
		}
		/** Converge on an announced skin id, re-reading the catalog when it is new. */
		async function convergeOnSkin(store, id) {
			await convergeOnSelection(store, id);
		}
		/**
		* Follow the persisted selection while this page is open.
		*
		* Applying a skin and saving that choice are one action in the GUI, but the
		* choice is persisted for the NEXT page load. The conventional route is the
		* official settings form: it writes the settings row this plugin owns, the
		* Host applies it, and nothing inside this page is told. That row is seeded
		* from the skin center's own configuration, so the two are the same choice
		* written twice, and this page reads it back rather than assuming it owns
		* every write (issue #1740).
		*
		* The poll only reads: it never writes the selection back, it skips a value
		* already applied, and it stops while the page is hidden.
		* @param store - the booted runtime store.
		* @param intervalMs - polling cadence in milliseconds.
		* @returns the idempotent teardown of the poll.
		*/
		function watchPersistedSelection(store, intervalMs = SELECTION_POLL_MS) {
			let applied;
			let timer = null;
			let stopped = false;
			const tick = async () => {
				if (stopped) return;
				const next = await readPersistedSelection(store);
				if (stopped || next === void 0 || next === applied) return;
				applied = next;
				await convergeOnSelection(store, next);
			};
			const stopTimer = () => {
				if (timer !== null) store.window.clearInterval(timer);
				timer = null;
			};
			const startTimer = () => {
				if (stopped || timer !== null) return;
				timer = store.window.setInterval(() => {
					tick();
				}, intervalMs);
			};
			(async () => {
				applied = await fetchPersistedSelection(store);
				if (!stopped) startTimer();
			})();
			const onVisibility = () => {
				if (store.doc.visibilityState === "visible") {
					startTimer();
					tick();
				} else stopTimer();
			};
			store.doc.addEventListener("visibilitychange", onVisibility);
			return () => {
				stopped = true;
				stopTimer();
				store.doc.removeEventListener("visibilitychange", onVisibility);
			};
		}
		//#endregion
		return {
			BackgroundController,
			SKIN_BACKGROUND_DEFAULTS,
			SKIN_BACKGROUND_FIELDS,
			bootSkinRuntime,
			installShellRenderingAdapter,
			normalizeSkinBackground,
			shellRenderingCss,
			watchPersistedSelection
		};
		})();
		//#endregion

		/** The window event the runtime listens on to converge on an announced skin. */
		const SKIN_ENABLED_KEY = "dsh-skin-center:enabled-skin";
		/** Cadence of the background write behind a slider drag. */
		const SKIN_BACKGROUND_WRITE_MS = 250;

		/**
		* Mount the live skin environment this document runs.
		*
		* Four things hold a skin on screen, and all four used to live in the skin
		* center's own client half:
		*
		*  1. the background controller — scrim alpha, the blur veil, the input-card
		*     and bubble variables, driven by the `skin-background` settings section;
		*  2. the boot store (`window.__skinRuntime`) — catalog, controller, semantic
		*     and shell-rendering adapters; the panel's "apply as skin" calls through
		*     it, and so does the runtime itself;
		*  3. the follower that picks up a selection changed elsewhere;
		*  4. the master switch — off puts the shell back on stock, on restores the
		*     skin that was on screen.
		*
		* @param ctx - browser plugin context.
		* @param bridge - the settings bridge, or null when no form is served.
		* @returns the mounted pieces, or null when the runtime cannot boot.
		*/
		function mountSkinEnvironment(ctx, bridge) {
			const fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null;
			const sectionValues = () => {
				if (bridge === null) return null;
				let snapshot = null;
				try {
					snapshot = bridge.getSnapshot();
				} catch (error) {
					return null;
				}
				const value = snapshot === null || snapshot === undefined ? null : snapshot.value;
				return value !== null && value !== undefined && typeof value === "object" ? SKIN_RUNTIME.normalizeSkinBackground(value) : null;
			};
			let disposeTimer = null;
			let disposed = false;
			const postBackground = (next, keepalive = false) => {
				if (fetchImpl === null) return;
				fetchImpl(SKIN_V2_ACTIVE_URL, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ background: next }),
					keepalive
				}).catch(() => {});
			};
			const persistBackground = (next) => {
				if (disposed) return;
				if (disposeTimer !== null) clearTimeout(disposeTimer);
				disposeTimer = setTimeout(() => {
					disposeTimer = null;
					postBackground(next);
				}, SKIN_BACKGROUND_WRITE_MS);
			};
			const flushBackground = () => {
				if (disposeTimer === null) return;
				clearTimeout(disposeTimer);
				disposeTimer = null;
				postBackground(background.snapshot(), true);
			};
			const background = new SKIN_RUNTIME.BackgroundController(sectionValues(), persistBackground);
			let applied = background.snapshot();
			/**
			* Whether the shared section still seeds the live values.
			*
			* It does until the document serves a stored background or the runtime
			* installs its writer. Afterwards the v2 document is the authority: letting
			* a stale section publish again would resurrect the value the user just
			* turned off on every reload.
			*/
			let seedsFromSection = true;
			/**
			* Fold one settings-section publication into the live values.
			*
			* Only fields that actually differ are handed to `init`, so a publication
			* that carries schema defaults cannot clobber a value the v2 document owns
			* (a stored 0% scrim stays 0% until the user moves the slider).
			*/
			const syncFromSection = () => {
				if (!seedsFromSection) return;
				const values = sectionValues();
				if (values === null) return;
				const patch = {};
				for (const field of SKIN_RUNTIME.SKIN_BACKGROUND_FIELDS) {
					const value = values[field];
					if (value === undefined || value === applied[field]) continue;
					patch[field] = value;
				}
				if (Object.keys(patch).length === 0) return;
				applied = { ...applied, ...patch };
				background.init({ ...background.snapshot(), ...patch });
				persistBackground(background.snapshot());
			};
			/**
			* The writer the settings bridge calls once the runtime is mounted.
			*
			* Each branch is the controller owned setter for that field, which repaints
			* the document and schedules the v2 persist — the same path the runtime
			* takes on boot, so the panel and the reload agree on one document.
			* @param field - a background field name.
			* @param value - the new value.
			* @returns true when the field was applied.
			*/
			const writeBackgroundField = (field, value) => {
				switch (field) {
					case "enabled": background.setEnabled(value === true); break;
					case "backgroundOpacity": background.set(value); break;
					case "backgroundBlurEmpty": background.setBlurEmpty(value); break;
					case "backgroundBlurContent": background.setBlurContent(value); break;
					case "inputCardBlur": background.setInputCardBlur(value); break;
					case "bubbleOpacity": background.setBubbleOpacity(value); break;
					case "bubbleBlur": background.setBubbleBlur(value); break;
					default: return false;
				}
				seedsFromSection = false;
				applied = background.snapshot();
				return true;
			};
			if (bridge !== null && typeof bridge.attach === "function") bridge.attach(writeBackgroundField);
			if (fetchImpl !== null) {
				fetchImpl(SKIN_V2_ACTIVE_URL).then((response) => (response.ok ? response.json() : null)).then((body) => {
					const stored = body !== null && typeof body === "object" && body.background !== null && typeof body.background === "object" ? SKIN_RUNTIME.normalizeSkinBackground(body.background) : null;
					if (stored !== null && Object.keys(stored).length > 0) {
						seedsFromSection = false;
						applied = { ...applied, ...stored };
						background.init({ ...background.snapshot(), ...stored });
					}
					syncFromSection();
				}).catch(() => syncFromSection());
			}
			if (bridge !== null) ctx.effect(() => bridge.subscribe(syncFromSection), "appearance-library: background section sync");
			const runtime = SKIN_RUNTIME.bootSkinRuntime({});
			ctx.effect(() => () => runtime.shutdown(), "appearance-library: skin runtime shutdown");
			ctx.effect(() => SKIN_RUNTIME.watchPersistedSelection(runtime), "appearance-library: follow the persisted selection");
			const readEnabledSkin = () => {
				try {
					const id = globalThis.localStorage?.getItem(SKIN_ENABLED_KEY);
					return typeof id === "string" && id !== "" ? id : null;
				} catch (error) {
					return null;
				}
			};
			const writeEnabledSkin = (id) => {
				try {
					if (id === null) globalThis.localStorage?.removeItem(SKIN_ENABLED_KEY);
					else globalThis.localStorage?.setItem(SKIN_ENABLED_KEY, id);
				} catch (error) {
					// Without storage the switch still works; it just forgets.
				}
			};
			const applyEnabledLook = async (enabled) => {
				try {
					const state = runtime.controller.getState();
					if (!enabled) {
						if (state.active === null) return;
						writeEnabledSkin(state.active);
						await runtime.controller.switchTo(null, null);
						return;
					}
					const id = readEnabledSkin();
					if (id === null) return;
					const entry = runtime.find(id);
					if (entry === null) {
						writeEnabledSkin(null);
						return;
					}
					await runtime.controller.switchTo(id, entry);
				} catch (error) {
					ctx.logger?.warn?.("appearance-library: the master switch could not move the look", error);
				}
			};
			ctx.effect(() => {
				let seen = background.enabled();
				const off = background.subscribe(() => {
					const enabled = background.enabled();
					if (enabled === seen) return;
					seen = enabled;
					void applyEnabledLook(enabled);
				});
				/* Reconcile once per load: a profile saved while the switch is off must
				   boot straight into the stock look even though a skin is still the
				   persisted selection. */
				const bootTimer = seen ? null : setTimeout(() => void applyEnabledLook(false), 1500);
				return () => {
					off();
					if (bootTimer !== null) clearTimeout(bootTimer);
				};
			}, "appearance-library: master switch");
			ctx.effect(() => () => {
				disposed = true;
				if (bridge !== null && typeof bridge.detach === "function") bridge.detach();
				flushBackground();
				background.dispose();
			}, "appearance-library: background runtime");
			return { background, runtime };
		}

		//#region usage card
		/**
		 * Sidebar "today's spend" card.
		 *
		 * The shell gives the sidebar foot one action slot, which cannot host a
		 * block, so the card is injected as a plain DOM node right above the
		 * Settings row — the same seat `@linxin666/dsh-usage` used before this
		 * plugin took the feature over. It polls the host's read-only overview
		 * route and never writes usage state.
		 *
		 * Copy is localized through the panel's own dictionary; the collapse
		 * flag reuses the usage plugin's localStorage key so an existing
		 * preference survives the move.
		 */
		const USAGE_CARD_SELECTOR = "[data-dsh-appear-usage-card]";
		const USAGE_CARD_POLL_MS = 30_000;
		const USAGE_CARD_COLLAPSED_KEY = "dsh-usage.foot-card.collapsed";
		const USAGE_CARD_CSS = [
			".dsh-usage-card{position:relative;box-sizing:border-box;width:100%;margin:2px 0 4px;border-radius:12px;background:color-mix(in srgb,currentColor 4%,transparent);color:inherit;transition:background-color 120ms ease;font:inherit}",
			".dsh-usage-card:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,currentColor 7%,transparent))}",
			".dsh-usage-card[data-collapsed]{background:transparent}",
			".dsh-usage-main{appearance:none;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;width:100%;padding:8px;border:none;border-radius:12px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-usage-main:focus-visible{outline:none;box-shadow:0 0 0 2px color-mix(in srgb,currentColor 45%,transparent)}",
			".dsh-usage-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}",
			".dsh-usage-title{display:inline-flex;align-items:center;gap:6px;min-width:0;font-size:12px;opacity:.65;white-space:nowrap}",
			".dsh-usage-title svg{display:block;flex:none}",
			".dsh-usage-value{margin-right:18px;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}",
			".dsh-usage-line{font-size:11px;opacity:.7;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-usage-meta{font-size:10px;opacity:.5;font-variant-numeric:tabular-nums}",
			".dsh-usage-toggle{appearance:none;position:absolute;top:6px;right:6px;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:none;border-radius:6px;background:transparent;color:inherit;cursor:pointer;opacity:.55;transition:opacity 120ms ease,background-color 120ms ease}",
			".dsh-usage-card:hover .dsh-usage-toggle{opacity:.8}",
			".dsh-usage-toggle:hover{opacity:1;background:color-mix(in srgb,currentColor 10%,transparent)}",
			".dsh-usage-toggle:focus-visible{outline:none;box-shadow:0 0 0 2px color-mix(in srgb,currentColor 45%,transparent)}",
			".dsh-usage-toggle svg{display:block}",
			".dsh-usage-card[data-collapsed] .dsh-usage-main{min-height:36px;padding:7px 8px}",
			".dsh-usage-strip{display:flex;align-items:center;gap:6px;padding-right:20px;font-size:12px;white-space:nowrap;overflow:hidden}",
			".dsh-usage-strip svg{display:block;flex:none;opacity:.65}",
			".dsh-usage-strip-provider{flex:none;max-width:38%;overflow:hidden;text-overflow:ellipsis;font-weight:500}",
			".dsh-usage-strip-label{opacity:.65;overflow:hidden;text-overflow:ellipsis}",
			".dsh-usage-strip-value{margin-left:auto;font-weight:600;font-variant-numeric:tabular-nums}",
			".dsh-usage-detail{display:flex;flex-direction:column;gap:6px;padding:0 8px 8px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);margin:0 8px 6px;padding-top:8px}",
			".dsh-usage-detail[hidden]{display:none}",
			".dsh-usage-detail-head{display:flex;align-items:baseline;justify-content:space-between;font-size:10px;opacity:.55}",
			".dsh-usage-trend{display:flex;align-items:flex-end;gap:3px;height:34px}",
			".dsh-usage-bar{flex:1;min-height:2px;border-radius:3px 3px 1px 1px;background:color-mix(in srgb,currentColor 26%,transparent)}",
			".dsh-usage-bar[data-today]{background:color-mix(in srgb,currentColor 55%,transparent)}",
			".dsh-usage-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:11px}",
			".dsh-usage-row-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.8}",
			".dsh-usage-row-value{flex:none;font-variant-numeric:tabular-nums;opacity:.75}",
			".dsh-usage-row-model{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:10px;opacity:.5}",
			".dsh-usage-detail-foot{border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);padding-top:6px;font-size:10px;opacity:.55;display:flex;flex-direction:column;gap:2px}",
			"[data-sidebar-collapsed] .dsh-usage-card,[data-dsh-frame][data-sidebar-collapsed] .dsh-usage-card{display:none}",
		].join("\n");

		/** Inject the card stylesheet once per document. */
		function ensureUsageCardStyles(doc) {
			if (doc.querySelector("style[data-dsh-appear-usage-style]") !== null) return;
			const style = doc.createElement("style");
			style.setAttribute("data-dsh-appear-usage-style", "");
			style.textContent = USAGE_CARD_CSS;
			(doc.head ?? doc.documentElement).appendChild(style);
		}

		/** Billed tokens in a compact unit (reasoning is inside output). */
		function formatUsageTokens(value) {
			if (!Number.isFinite(value) || value <= 0) return "0";
			if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
			if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
			if (value >= 1e3) return (value / 1e3).toFixed(1) + "K";
			return String(Math.round(value));
		}

		/** `HH:MM` in the reader's own timezone. */
		function formatUsageClock(ms) {
			const date = new Date(ms);
			const pad = (n) => String(n).padStart(2, "0");
			return pad(date.getHours()) + ":" + pad(date.getMinutes());
		}

		/** `¥12.34` for the priced headline. */
		function formatUsageMoney(value) {
			const amount = Number.isFinite(value) ? value : 0;
			return "¥" + amount.toFixed(2);
		}

		/** `DeepSeek ¥95.24 · 月末 ¥0.00` style balance line. */
		function formatUsageBalances(balances) {
			if (!Array.isArray(balances) || balances.length === 0) return "";
			const shown = balances.slice(0, 2).map((row) => {
				const currency = String(row.currency ?? "").toUpperCase();
				const prefix = currency === "CNY" ? "¥" : currency === "USD" ? "$" : currency === "" ? "" : currency + " ";
				return row.displayName + " " + prefix + row.totalBalance;
			});
			return shown.join(" · ") + (balances.length > 2 ? " +" + String(balances.length - 2) : "");
		}

		/**
		 * The sidebar's foot area, when the shell has rendered it. The seat is
		 * found by its stable class suffix: the shell's hashed prefix changes per
		 * build, and recent shells dropped the `data-pane="sidebar"` wrapper this
		 * used to scope through — the foot itself is the durable anchor.
		 */
		function usageFootArea(doc) {
			return doc.querySelector('[class*="footArea"]') ?? doc.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
		}

		/** Small inline gauge glyph; the card's only icon. */
		function usageGaugeSvg(doc) {
			const ns = "http://www.w3.org/2000/svg";
			const svg = doc.createElementNS(ns, "svg");
			for (const [key, value] of Object.entries({ viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", "stroke-width": "1.3", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) {
				svg.setAttribute(key, value);
			}
			const arc = doc.createElementNS(ns, "path");
			arc.setAttribute("d", "M2.5 12.5a7 7 0 0 1 11 -4.3");
			const hand = doc.createElementNS(ns, "path");
			hand.setAttribute("d", "M8 12.5V8.2l2.9-2.1");
			const dot = doc.createElementNS(ns, "circle");
			for (const [key, value] of Object.entries({ cx: "8", cy: "12.5", r: "1" })) dot.setAttribute(key, value);
			svg.append(arc, hand, dot);
			return svg;
		}

		/** Disclosure chevron; points down while expanded, up while collapsed. */
		function usageChevronSvg(doc, collapsed) {
			const ns = "http://www.w3.org/2000/svg";
			const svg = doc.createElementNS(ns, "svg");
			for (const [key, value] of Object.entries({ viewBox: "0 0 16 16", width: "12", height: "12", fill: "none", stroke: "currentColor", "stroke-width": "1.4", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) {
				svg.setAttribute(key, value);
			}
			const path = doc.createElementNS(ns, "path");
			path.setAttribute("d", collapsed ? "m4 10 4-4 4 4" : "m4 6 4 4 4-4");
			svg.append(path);
			return svg;
		}

		/** Read the persisted collapse flag; storage failures stay expanded. */
		function readUsageCollapsed(win) {
			try {
				return win.localStorage.getItem(USAGE_CARD_COLLAPSED_KEY) === "1";
			} catch {
				return false;
			}
		}

		/** Persist the collapse flag; storage failures keep the session state. */
		function writeUsageCollapsed(win, collapsed) {
			try {
				win.localStorage.setItem(USAGE_CARD_COLLAPSED_KEY, collapsed ? "1" : "0");
			} catch {
				/* storage unavailable: the card still flips for this session */
			}
		}

		/**
		 * Report the card's own mount state to the plugin's host half.
		 *
		 * There is no shell view into this page (the desktop fences every
		 * request that is not the renderer's own), so a card that fails to
		 * seat leaves no trace anywhere. One line per state change lands in
		 * `diag/usage-card.jsonl`; failures stay silent on purpose.
		 */
		function reportUsageCard(win, event, data) {
			try {
				const payload = encodeURIComponent(JSON.stringify(data ?? {}));
				void win.fetch(API_BASE + "/usage/probe?event=" + encodeURIComponent(event) + "&data=" + payload, {
					keepalive: true,
					credentials: "same-origin",
				});
			} catch (error) {
				void error;
			}
		}

		/**
		 * Mount the sidebar usage card and keep it seated above the Settings row.
		 * @param ctx - the plugin context (for the document, locale and disposal).
		 * @param t - the panel's translate function (usage.* keys).
		 * @returns a disposer removing the card, its poll and its observers.
		 */
		function mountUsageCard(ctx, t) {
			const doc = ctx?.document ?? (typeof document !== "undefined" ? document : null);
			if (doc === null) return () => {};
			if (doc.querySelector(USAGE_CARD_SELECTOR) !== null) return () => {};
			const win = doc.defaultView;
			if (win === null || win === undefined) return () => {};
			ensureUsageCardStyles(doc);
			reportUsageCard(win, "mount", { body: doc.body !== null });

			const container = doc.createElement("div");
			container.setAttribute("data-dsh-appear-usage-card", "");
			container.className = "dsh-usage-card";
			container.setAttribute("data-dsh-plugin", "appearance-library");
			container.setAttribute("data-dsh-part", "usage-card");
			if (readUsageCollapsed(win)) container.setAttribute("data-collapsed", "");

			const main = doc.createElement("button");
			main.type = "button";
			main.className = "dsh-usage-main";
			main.setAttribute("data-dsh-part", "usage-card-main");
			main.title = t("usage.open");

			const head = doc.createElement("span");
			head.className = "dsh-usage-head";
			const title = doc.createElement("span");
			title.className = "dsh-usage-title";
			title.append(usageGaugeSvg(doc), doc.createTextNode(t("usage.title")));
			const value = doc.createElement("span");
			value.className = "dsh-usage-value";
			value.textContent = "—";
			head.append(title, value);

			const usageLine = doc.createElement("span");
			usageLine.className = "dsh-usage-line";
			usageLine.setAttribute("data-dsh-part", "usage-card-line");
			usageLine.textContent = t("usage.loading");
			const balanceLine = doc.createElement("span");
			balanceLine.className = "dsh-usage-line";
			balanceLine.setAttribute("data-dsh-part", "usage-card-balances");
			const meta = doc.createElement("span");
			meta.className = "dsh-usage-meta";
			meta.setAttribute("data-dsh-part", "usage-card-meta");

			const strip = doc.createElement("span");
			strip.className = "dsh-usage-strip";
			const stripProvider = doc.createElement("span");
			stripProvider.className = "dsh-usage-strip-provider";
			const stripLabel = doc.createElement("span");
			stripLabel.className = "dsh-usage-strip-label";
			stripLabel.textContent = t("usage.title");
			const stripValue = doc.createElement("span");
			stripValue.className = "dsh-usage-strip-value";
			stripValue.textContent = "—";
			strip.append(usageGaugeSvg(doc), stripProvider, stripLabel, stripValue);

			const detail = doc.createElement("div");
			detail.className = "dsh-usage-detail";
			detail.setAttribute("data-dsh-part", "usage-card-detail");
			detail.hidden = true;

			const toggle = doc.createElement("button");
			toggle.type = "button";
			toggle.className = "dsh-usage-toggle";
			toggle.setAttribute("data-dsh-part", "usage-card-toggle");
			const syncToggleCopy = () => {
				const collapsed = container.hasAttribute("data-collapsed");
				toggle.setAttribute("aria-label", t(collapsed ? "usage.expand" : "usage.collapse"));
				toggle.title = t(collapsed ? "usage.expand" : "usage.collapse");
				toggle.replaceChildren(usageChevronSvg(doc, collapsed));
			};
			syncToggleCopy();

			main.append(head, usageLine, balanceLine, meta, strip);
			container.append(main, toggle, detail);

			/** Re-seat the card above the shell's Settings row. */
			let reported = "";
			const place = () => {
				const foot = usageFootArea(doc);
				const state = foot === null ? "no-foot" : foot.contains(container) ? "seated" : "detached";
				if (state !== reported) {
					reported = state;
					reportUsageCard(win, "place", {
						state,
						footClass: foot === null ? null : String(foot.className ?? "").slice(0, 120),
						settings: foot === null ? false : foot.querySelector('[class*="settingsArea"]') !== null,
					});
				}
				if (foot === null) return;
				const settings = foot.querySelector('[class*="settingsArea"]');
				if (settings !== null) {
					if (container.nextElementSibling !== settings) foot.insertBefore(container, settings);
					return;
				}
				if (foot.lastElementChild !== container) foot.append(container);
			};
			place();

			/** One poll of the host overview; failures keep the last values. */
			let disposed = false;
			let snapshot = null;
			const render = () => {
				if (disposed) return;
				if (snapshot === null) {
					value.textContent = "—";
					stripValue.textContent = "—";
					return;
				}
				const today = snapshot.today ?? {};
				const balances = Array.isArray(snapshot.balances) ? snapshot.balances : [];
				const spent = Number.isFinite(today.cost) ? today.cost : 0;
				const priced = spent > 0;
				const headline = priced ? formatUsageMoney(spent) : today.calls > 0 ? formatUsageTokens(today.tokens) + " tokens" : "¥0.00";
				value.textContent = headline;
				stripValue.textContent = headline;
				stripProvider.textContent = priced ? (today.providers?.[0]?.provider ?? "") : "";
				usageLine.textContent = today.calls > 0
					? formatUsageTokens(today.tokens) + " tokens · " + t("usage.calls", { n: today.calls })
					: t("usage.noData");
				const balanceText = formatUsageBalances(balances);
				balanceLine.textContent = balanceText;
				balanceLine.hidden = balanceText === "";
				meta.textContent = t("usage.updated", { time: formatUsageClock(snapshot.updatedAt ?? Date.now()) });

				// Detail: the 7-day strip plus one row per provider that spent today.
				const trend = doc.createElement("div");
				trend.className = "dsh-usage-trend";
				const history = Array.isArray(snapshot.history) ? snapshot.history : [];
				const peak = Math.max(1, ...history.map((day) => Number(day.cost) || 0));
				for (const day of history) {
					const bar = doc.createElement("div");
					bar.className = "dsh-usage-bar";
					const share = (Number(day.cost) || 0) / peak;
					bar.style.height = String(Math.max(3, Math.round(share * 30))) + "px";
					bar.title = day.date + " · " + formatUsageMoney(Number(day.cost) || 0);
					if (day.date === today.date) bar.setAttribute("data-today", "");
					trend.append(bar);
				}
				const headRow = doc.createElement("div");
				headRow.className = "dsh-usage-detail-head";
				const headDate = doc.createElement("span");
				headDate.textContent = today.date ?? "";
				const headTrend = doc.createElement("span");
				headTrend.textContent = t("usage.trend");
				headRow.append(headDate, headTrend);

				const rows = doc.createElement("div");
				rows.className = "dsh-usage-detail-body";
				const providers = Array.isArray(today.providers) ? today.providers : [];
				for (const provider of providers) {
					const row = doc.createElement("div");
					row.className = "dsh-usage-row";
					const name = doc.createElement("span");
					name.className = "dsh-usage-row-name";
					name.textContent = provider.provider;
					const amount = doc.createElement("span");
					amount.className = "dsh-usage-row-value";
					amount.textContent = (Number(provider.cost) > 0 ? formatUsageMoney(provider.cost) : formatUsageTokens(provider.tokens) + " tokens") + " · " + t("usage.calls", { n: provider.calls });
					row.append(name, amount);
					rows.append(row);
					for (const model of Array.isArray(provider.models) ? provider.models : []) {
						const modelRow = doc.createElement("div");
						modelRow.className = "dsh-usage-row-model";
						const modelName = doc.createElement("span");
						modelName.textContent = model.model;
						const modelAmount = doc.createElement("span");
						modelAmount.textContent = formatUsageTokens(model.tokens) + " tokens";
						modelRow.append(modelName, modelAmount);
						rows.append(modelRow);
					}
				}
				if (providers.length === 0) {
					const quiet = doc.createElement("div");
					quiet.className = "dsh-usage-row";
					quiet.textContent = t("usage.noData");
					rows.append(quiet);
				}

				const foot = doc.createElement("div");
				foot.className = "dsh-usage-detail-foot";
				for (const balance of balances) {
					const line = doc.createElement("span");
					line.textContent = t("usage.balance") + " · " + balance.displayName + " " + formatUsageBalances([balance]);
					foot.append(line);
				}
				detail.replaceChildren(headRow, trend, rows, foot);
			};

			const poll = async () => {
				if (disposed) return;
				try {
					const response = await win.fetch(API_BASE + "/usage", { credentials: "same-origin", headers: { accept: "application/json" } });
					if (!response.ok) reportUsageCard(win, "poll-status", { status: response.status });
					if (!response.ok) throw new Error("failed: " + String(response.status));
					const body = await response.json();
					if (disposed) return;
					snapshot = body;
					usageLine.hidden = false;
					render();
				} catch (error) {
					if (disposed) return;
					if (snapshot === null) usageLine.textContent = t("usage.error");
				}
			};

			// Collapsed flag flips only on the chevron; the body toggles the detail.
			const onToggle = (event) => {
				event.stopPropagation();
				const collapsed = container.toggleAttribute("data-collapsed");
				writeUsageCollapsed(win, collapsed);
				syncToggleCopy();
				if (collapsed) detail.hidden = true;
			};
			const onMain = () => {
				if (container.hasAttribute("data-collapsed")) return;
				detail.hidden = !detail.hidden;
			};
			toggle.addEventListener("click", onToggle);
			main.addEventListener("click", onMain);

			// One body watcher, coalesced to a frame: a React re-render that
			// displaces the container re-seats it on the next frame.
			let frame = 0;
			const recheck = () => {
				if (disposed || frame !== 0) return;
				const schedule = typeof win.requestAnimationFrame === "function" ? win.requestAnimationFrame.bind(win) : (fn) => win.setTimeout(fn, 16);
				frame = schedule(() => {
					frame = 0;
					if (!disposed) place();
				});
			};
			const observer = typeof win.MutationObserver === "function" ? new win.MutationObserver(recheck) : null;
			observer?.observe(doc.body ?? doc.documentElement, { childList: true, subtree: true });

			// 30 s cadence while the tab is visible; a hidden tab pauses.
			let timer = 0;
			const start = () => {
				if (timer !== 0 || doc.visibilityState !== "visible") return;
				timer = win.setInterval(poll, USAGE_CARD_POLL_MS);
			};
			const onVisibility = () => {
				if (doc.visibilityState === "visible") {
					void poll();
					start();
					return;
				}
				if (timer !== 0) {
					win.clearInterval(timer);
					timer = 0;
				}
			};
			doc.addEventListener("visibilitychange", onVisibility);
			start();
			void poll();

			return () => {
				disposed = true;
				if (timer !== 0) win.clearInterval(timer);
				doc.removeEventListener("visibilitychange", onVisibility);
				toggle.removeEventListener("click", onToggle);
				main.removeEventListener("click", onMain);
				observer?.disconnect();
				container.remove();
			};
		}
		//#endregion usage card

		//#region plugin
		/** Services required by this browser plugin. */
		const inject = ["slots", "locale"];
		/**
		* Register the Appearance Library sidebar row and the main panel it opens.
		* @param ctx - browser plugin context.
		*/
		/**
		 * Mount the task hud on the document body, outside every panel.
		 *
		 * A compression runs for minutes. A hud owned by the library panel would
		 * disappear the moment the reader switched to a session, which is exactly
		 * when they look for it — so the root goes on the body and subscribes to
		 * the module-level store instead.
		 *
		 * Returns a disposer, or null when there is nothing to mount (the offline
		 * harness renders the bundle in a sandbox with no document, and a client
		 * half without `react-dom/client` must not take the panel down with it).
		 */
		function mountTaskHud(t) {
			if (typeof document === "undefined" || document.body == null) return null;
			if (typeof require !== "function") return null;
			let client = null;
			try {
				client = require("react-dom/client");
			} catch (error) {
				return null;
			}
			if (client == null || typeof client.createRoot !== "function") return null;
			/* A reload re-runs apply; drop the container the previous mount left. */
			for (const stale of Array.from(document.querySelectorAll("div[data-dsh-appearance-hud]"))) stale.remove();
			const container = document.createElement("div");
			container.dataset.dshAppearanceHud = "";
			document.body.appendChild(container);
			const root = client.createRoot(container);
			root.render(h(TaskHudHost, { t }));
			return () => {
				root.unmount();
				container.remove();
			};
		}

		function apply(ctx) {
			__hoverTokens.apply(ctx);   // ported hover tokens (pure CSS)
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
			/* The live skin environment is this plugin's now: the background
			   controller, the `__skinRuntime` store the panel switches through, the
			   persisted-selection follower and the master switch. It runs even when
			   no settings form is served — the store is what "apply as skin" needs. */
			try {
				mountSkinEnvironment(ctx, skin);
			} catch (error) {
				ctx.logger?.warn?.("appearance-library: skin runtime unavailable", error);
			}
			/* The sidebar's "today's spend" card. It used to ship as its own
			   `@linxin666/dsh-usage` row; the card lives here now, reading this
			   plugin's own /usage route and never writing usage state. */
			try {
				const unmountUsage = mountUsageCard(ctx, t);
				ctx.effect(() => () => unmountUsage(), "appearance-library: sidebar usage card");
			} catch (error) {
				ctx.logger?.warn?.("appearance-library: sidebar usage card unavailable", error);
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
			/* The hud outlives the panel: mounted on the body, so a task started
			   here keeps reporting after the reader switches to a session. */
			const unmountHud = mountTaskHud(t);
			if (unmountHud !== null) ctx.effect(() => () => unmountHud(), "appearance-library: task hud");
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		/** Exposed for the package's own offline tests; the Loader ignores unknown exports. */
		exports.__internals = {
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
			mountUsageCard,
			skinValues,
			skinLiveValues,
			createSkinSettingsBridge,
			SkinSettingsSection,
			StartupSplashSection,
			installShellRenderingAdapter: SKIN_RUNTIME.installShellRenderingAdapter,
			shellRenderingCss: SKIN_RUNTIME.shellRenderingCss
		};
		return module.exports;
	}
});
