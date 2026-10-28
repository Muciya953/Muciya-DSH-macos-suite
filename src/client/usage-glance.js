var module = { exports: {} };
var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

/**
 * Usage glance: the sidebar "today's spend" card.
 *
 * The numbers are NOT computed here. `@linxin666/dsh-usage` folds
 * `session/event` into a day/provider/model ledger and probes provider
 * balances; this card reads one aggregated overview from its own Host half
 * (`GET /api/macos-suite/usage/v1/overview`) and paints it into the sidebar
 * footer. Two consequences worth keeping in mind while editing:
 *
 *   - no arithmetic on money or tokens happens on this side, so a pricing
 *     change upstream never needs a change here;
 *   - a profile without the ledger plugin still renders the card, with the
 *     "no ledger yet" line instead of a zero that looks like real usage.
 *
 * It registers no slot: the sidebar footer has no slot of its own, so the card
 * owns a plain div inside the footer container and re-creates it when React
 * rebuilds the sidebar. Nothing here touches React's tree.
 */

/** This panel's upstream name; build.mjs rewrites it to the suite's package name. */
const PACKAGE_NAME = "dsh-plugin-usage-glance";
/** Dictionary namespace owned by this panel. */
const NS = "usageGlance";
/** Where the Host half serves the overview. Namespaced to the suite, see its API_PREFIX note. */
const API_BASE = "/api/macos-suite/usage/v1";
/** The card is permanently seated: a relaxed cadence, and never while hidden. */
const POLL_MS = 30000;
/** Footer container candidates, most specific first. */
const HOST_SELECTORS = ['[data-slot="sidebar.footer"]', '[class*="sidebarFooter"]'];
/** Ours, so a re-paint never confuses the card with shell furniture. */
const CARD_SELECTOR = '[data-dsh-part="usage-glance-card"]';
/** Collapsed state survives a reload, like the rest of the sidebar. */
const COLLAPSED_KEY = "mds-usage.collapsed";
/** Invalidation coalescing: one re-check per this many ms at most. */
const REHOOK_MS = 400;

/** The card's own stylesheet id, derived so no literal old package name survives. */
const STYLE_TAG_ID = PACKAGE_NAME + "/usage-glance.css";

/* ── formatting (pure, also exercised by the offline harness) ───────────── */

/**
 * Compact token count: `1.2M`, `934k`, `812`.
 * @param value - billed tokens.
 * @returns the label shown in the card's meta line.
 */
function formatTokens(value) {
	const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
	if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1) + "M";
	if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
	return String(Math.round(n));
}

/**
 * Money label. The ledger stores CNY, so the card does not take a currency.
 * @param value - cost in CNY.
 * @returns `¥1.23`, or `¥0.00` for an unpriced route.
 */
function formatCost(value) {
	const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
	return "¥" + n.toFixed(2);
}

/**
 * `HH:MM` of one instant; an unparsable instant renders as an empty string so
 * the card can drop the clause instead of printing `Invalid Date`.
 * @param ms - epoch milliseconds.
 * @returns the clock label.
 */
function formatClock(ms) {
	const n = typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? ms : 0;
	if (n === 0) return "";
	try {
		return new Date(n).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	} catch {
		return "";
	}
}

/**
 * Turn the served overview into everything the card paints.
 *
 * Kept pure so the "no ledger", "empty day" and "unpriced route" branches can
 * be asserted without a document.
 * @param overview - the `/overview` payload, or null when the read failed.
 * @param error - a transport error string, when there is one.
 * @returns { state, cost, tokens, calls, meta, trend, balances, hint }
 */
function buildCardModel(overview, error) {
	if (typeof error === "string" && error.length > 0) {
		return { state: "error", cost: "", tokens: "", calls: 0, meta: "", trend: [], balances: [], hint: error };
	}
	if (overview === null || typeof overview !== "object") {
		return { state: "error", cost: "", tokens: "", calls: 0, meta: "", trend: [], balances: [], hint: "" };
	}
	const today = overview.today ?? {};
	const cost = typeof today.cost === "number" ? today.cost : 0;
	const tokens = typeof today.tokens === "number" ? today.tokens : 0;
	const calls = typeof today.calls === "number" ? today.calls : 0;
	const history = Array.isArray(overview.history) ? overview.history : [];
	const peak = history.reduce((max, row) => Math.max(max, typeof row?.tokens === "number" ? row.tokens : 0), 0);
	const trend = history.map((row) => {
		const value = typeof row?.tokens === "number" ? row.tokens : 0;
		return {
			date: typeof row?.date === "string" ? row.date : "",
			tokens: value,
			cost: typeof row?.cost === "number" ? row.cost : 0,
			/* A zero day still gets a hairline: an empty bar reads as a missing day. */
			ratio: peak > 0 ? Math.max(0.06, value / peak) : 0.06,
			today: typeof row?.date === "string" && row.date === today.date,
		};
	});
	const balances = (Array.isArray(overview.balances) ? overview.balances : []).slice(0, 3).map((row) => ({
		provider: typeof row?.provider === "string" ? row.provider : "",
		displayName: typeof row?.displayName === "string" && row.displayName.length > 0 ? row.displayName : String(row?.provider ?? ""),
		currency: typeof row?.currency === "string" ? row.currency : "",
		total: typeof row?.totalBalance === "string" ? row.totalBalance : String(row?.totalBalance ?? ""),
	}));
	const clock = formatClock(overview.updatedAt);
	const parts = [];
	if (calls > 0) parts.push(calls + " 次调用");
	if (tokens > 0) parts.push(formatTokens(tokens) + " tokens");
	if (clock !== "") parts.push("更新于 " + clock);
	const meta = parts.join(" · ");
	/* Three distinct messages: nothing priced today, nothing at all today, no
	   ledger plugin. The card must not print a zero that means "unknown". */
	let hint = "";
	if (overview.hasLedger !== true) hint = "未检测到用量台账，需安装 dsh-usage";
	else if (calls === 0) hint = "今天还没有调用";
	else if (cost === 0) hint = "该路由不提供计价，仅统计 tokens";
	return { state: calls > 0 ? "ok" : "empty", cost: formatCost(cost), tokens: formatTokens(tokens), calls, meta, trend, balances, hint };
}

/* ── stylesheet ─────────────────────────────────────────────────────────── */

/**
 * Install the card's stylesheet once per document.
 *
 * Colours ride on the shell's own tokens where they exist, with literal
 * fallbacks so the card still reads on a profile with no skin: a card that
 * only works inside one theme is worse than a plain one.
 * @param doc - the document to paint into.
 */
function ensureStyle(doc) {
	if (doc === null || typeof doc.getElementById !== "function") return;
	if (doc.getElementById(STYLE_TAG_ID) !== null) return;
	const tag = doc.createElement("style");
	tag.id = STYLE_TAG_ID;
	tag.setAttribute("data-plugin-css", STYLE_TAG_ID);
	tag.textContent = [
		".mds-usage{display:flex;flex-direction:column;gap:2px;margin:0;padding:10px 10px 8px;border-radius:12px;font-size:12px;line-height:1.45;color:inherit;text-align:left;width:100%;box-sizing:border-box}",
		".mds-usage-head{display:flex;align-items:baseline;gap:6px;width:100%;padding:0;margin:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;text-align:left}",
		".mds-usage-title{font-size:11px;letter-spacing:.02em;opacity:.62}",
		".mds-usage-cost{margin-left:auto;font-weight:var(--mds-weight-semibold,600);font-variant-numeric:tabular-nums}",
		".mds-usage-caret{font-size:9px;opacity:.45;transform:rotate(180deg);transition:transform .18s ease}",
		'.mds-usage[data-collapsed="1"] .mds-usage-caret{transform:rotate(0deg)}',
		'.mds-usage[data-collapsed="1"] .mds-usage-body{display:none}',
		".mds-usage-body{display:flex;flex-direction:column;gap:6px;margin-top:6px}",
		".mds-usage-meta{font-size:11px;opacity:.55;font-variant-numeric:tabular-nums}",
		".mds-usage-trend{display:flex;align-items:flex-end;gap:3px;height:22px}",
		".mds-usage-bar{flex:1;min-width:3px;border-radius:2px;background:currentColor;opacity:.22}",
		'.mds-usage-bar[data-today="1"]{opacity:.55}',
		".mds-usage-bal{display:flex;align-items:baseline;gap:6px;font-size:11px}",
		".mds-usage-bal-name{opacity:.55}",
		".mds-usage-bal-value{margin-left:auto;font-variant-numeric:tabular-nums}",
		".mds-usage-hint{font-size:11px;opacity:.45}",
		'.mds-usage[data-state="error"] .mds-usage-hint{color:var(--mds-danger,#c0392b);opacity:.8}',
		"@media (prefers-reduced-motion: reduce){.mds-usage-caret{transition:none}}",
	].join("");
	(doc.head ?? doc.documentElement)?.appendChild(tag);
}

/* ── mounting ───────────────────────────────────────────────────────────── */

/**
 * Find the footer container the card should live in.
 * @param doc - the document to search.
 * @returns the container element, or null while the sidebar is not there yet.
 */
function findHost(doc) {
	if (doc === null || typeof doc.querySelector !== "function") return null;
	for (const selector of HOST_SELECTORS) {
		const found = doc.querySelector(selector);
		if (found !== null && found !== undefined) return found;
	}
	return null;
}

/**
 * Paint one model into one element.
 *
 * Every child is rebuilt from scratch: the card is small, and diffing a card
 * that changes at most once per poll is more code than it saves.
 * @param doc - the document that owns the element.
 * @param card - the card root.
 * @param model - the output of {@link buildCardModel}.
 * @param collapsed - whether the body is folded away.
 */
function renderCard(doc, card, model, collapsed) {
	card.setAttribute("data-state", model.state);
	card.setAttribute("data-collapsed", collapsed ? "1" : "0");
	while (card.firstChild !== null && card.firstChild !== undefined) card.removeChild(card.firstChild);

	const head = doc.createElement("button");
	head.className = "mds-usage-head";
	head.setAttribute("type", "button");
	head.setAttribute("aria-expanded", collapsed ? "false" : "true");
	const title = doc.createElement("span");
	title.className = "mds-usage-title";
	title.textContent = "今日消费";
	const cost = doc.createElement("span");
	cost.className = "mds-usage-cost";
	cost.textContent = model.cost;
	const caret = doc.createElement("span");
	caret.className = "mds-usage-caret";
	caret.textContent = "▾";
	caret.setAttribute("aria-hidden", "true");
	head.appendChild(title);
	head.appendChild(cost);
	head.appendChild(caret);
	card.appendChild(head);

	const body = doc.createElement("div");
	body.className = "mds-usage-body";
	if (model.meta !== "") {
		const meta = doc.createElement("div");
		meta.className = "mds-usage-meta";
		meta.textContent = model.meta;
		body.appendChild(meta);
	}
	if (model.trend.length > 0) {
		const trend = doc.createElement("div");
		trend.className = "mds-usage-trend";
		trend.setAttribute("title", "近 " + model.trend.length + " 天 tokens");
		for (const row of model.trend) {
			const bar = doc.createElement("i");
			bar.className = "mds-usage-bar";
			if (row.today) bar.setAttribute("data-today", "1");
			bar.style.height = Math.round(row.ratio * 100) + "%";
			if (row.date !== "") bar.setAttribute("title", row.date + " · " + formatTokens(row.tokens));
			trend.appendChild(bar);
		}
		body.appendChild(trend);
	}
	for (const row of model.balances) {
		const line = doc.createElement("div");
		line.className = "mds-usage-bal";
		const name = doc.createElement("span");
		name.className = "mds-usage-bal-name";
		name.textContent = "余额 " + row.displayName;
		const value = doc.createElement("span");
		value.className = "mds-usage-bal-value";
		value.textContent = (row.total === "" ? "—" : row.total) + (row.currency === "" ? "" : " " + row.currency);
		line.appendChild(name);
		line.appendChild(value);
		body.appendChild(line);
	}
	if (model.hint !== "") {
		const hint = doc.createElement("div");
		hint.className = "mds-usage-hint";
		hint.textContent = model.hint;
		body.appendChild(hint);
	}
	card.appendChild(body);
}

/**
 * Read the persisted fold state; an unreadable store means "expanded".
 * @param win - the window holding localStorage.
 * @returns true when the card was collapsed.
 */
function readCollapsed(win) {
	try {
		return win?.localStorage?.getItem(COLLAPSED_KEY) === "1";
	} catch {
		/* Private mode, a partitioned origin, or a fake window: expand. */
		return false;
	}
}

/**
 * Persist the fold state; a refused write is not worth a broken card.
 * @param win - the window holding localStorage.
 * @param collapsed - the new state.
 */
function writeCollapsed(win, collapsed) {
	try {
		win?.localStorage?.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
	} catch {
		void collapsed;
	}
}

/**
 * Mount the card into the sidebar footer.
 *
 * The whole body runs inside one `ctx.effect`, so a plugin reload tears down the
 * timer, the observer and the element together. Every failure path returns a
 * usable disposer: a card that cannot mount must not take the sidebar with it.
 * @param ctx - browser plugin context.
 */
function apply(ctx) {
	const win = typeof window === "undefined" ? null : window;
	const doc = win?.document ?? (typeof document === "undefined" ? null : document);
	if (doc === null || typeof doc.createElement !== "function" || typeof doc.querySelector !== "function") return;

	ctx.effect(() => {
		ensureStyle(doc);
		const state = {
			card: null,
			overview: null,
			error: "",
			collapsed: readCollapsed(win),
			timer: null,
			observer: null,
			lastHook: 0,
			disposed: false,
		};

		/** Post one self-report; the desktop fence means a shell cannot see this card otherwise. */
		const probe = (event, data) => {
			const send = typeof win?.fetch === "function" ? win.fetch.bind(win) : null;
			if (send === null) return;
			const url = API_BASE + "/probe?event=" + encodeURIComponent(event) + "&data=" + encodeURIComponent(JSON.stringify(data));
			try {
				void Promise.resolve(send(url, { method: "GET" })).catch(() => {});
			} catch {
				/* a probe must never surface as an error */
			}
		};

		/** Create the card element inside the footer container, or report that the sidebar is absent. */
		const ensureCard = () => {
			const host = findHost(doc);
			if (host === null) return null;
			if (state.card !== null && state.card.parentNode === host) return state.card;
			const card = doc.createElement("div");
			card.className = "mds-usage";
			card.setAttribute("data-dsh-part", "usage-glance-card");
			card.setAttribute("role", "group");
			card.setAttribute("aria-label", "今日消费");
			card.addEventListener("click", (event) => {
				const target = event?.target;
				if (target === null || target === undefined) return;
				/* Only the header folds: a click on a balance row should stay inert. */
				if (typeof target.closest === "function" && target.closest(".mds-usage-head") === null) return;
				state.collapsed = !state.collapsed;
				writeCollapsed(win, state.collapsed);
				if (state.card !== null) renderCard(doc, state.card, buildCardModel(state.overview, state.error), state.collapsed);
			});
			/* Insert before the first child so the card sits above the settings row. */
			if (typeof host.insertBefore === "function") host.insertBefore(card, host.firstChild ?? null);
			else host.appendChild(card);
			state.card = card;
			return card;
		};

		/** Paint whatever the last fetch produced; never throws. */
		const paint = () => {
			const card = ensureCard();
			if (card === null) return;
			try {
				renderCard(doc, card, buildCardModel(state.overview, state.error), state.collapsed);
			} catch (error) {
				state.error = String(error).slice(0, 200);
			}
		};

		/** One poll: read the overview, then paint. */
		const refresh = () => {
			const send = typeof win?.fetch === "function" ? win.fetch.bind(win) : null;
			if (send === null || state.disposed) return;
			let answer;
			try {
				answer = send(API_BASE + "/overview", { method: "GET", headers: { accept: "application/json" } });
			} catch (error) {
				state.error = String(error).slice(0, 200);
				paint();
				return;
			}
			Promise.resolve(answer).then(
				(response) => {
					if (state.disposed) return;
					if (response === null || response === undefined || typeof response.json !== "function") {
						state.error = "overview: empty response";
						paint();
						return;
					}
					return Promise.resolve(response.json()).then(
						(body) => {
							if (state.disposed) return;
							state.overview = body !== null && typeof body === "object" ? body : null;
							state.error = "";
							paint();
						},
						(error) => {
							if (state.disposed) return;
							state.error = "overview: " + String(error).slice(0, 160);
							paint();
						},
					);
				},
				(error) => {
					if (state.disposed) return;
					state.error = "overview: " + String(error).slice(0, 160);
					paint();
				},
			);
		};

		/* A document without timers (an offline harness, a stripped test double)
		   keeps the first paint and simply never polls; a TypeError here would
		   take the whole suite down with it. */
		const canTimer = typeof win?.setInterval === "function" && typeof win?.clearInterval === "function";

		/** Start the timer only while the page is visible: a background tab polls nothing. */
		const startTimer = () => {
			if (!canTimer || state.timer !== null || state.disposed) return;
			state.timer = win.setInterval(refresh, POLL_MS);
		};
		const stopTimer = () => {
			if (!canTimer || state.timer === null) return;
			win.clearInterval(state.timer);
			state.timer = null;
		};
		const onVisibility = () => {
			if (doc.visibilityState === "hidden") {
				stopTimer();
				return;
			}
			refresh();
			startTimer();
		};

		/* The sidebar is React-owned: a re-render drops our div. One observer on
		   body, coalesced, re-creates it from the numbers already in hand, so the
		   card never disappears between polls. */
		const Observer = win.MutationObserver;
		if (typeof Observer === "function") {
			state.observer = new Observer(() => {
				const now = Date.now();
				if (now - state.lastHook < REHOOK_MS) return;
				state.lastHook = now;
				if (state.disposed) return;
				const alive = state.card !== null && state.card.parentNode !== null && state.card.parentNode !== undefined;
				const present = typeof doc.querySelector === "function" ? doc.querySelector(CARD_SELECTOR) : null;
				if (alive && present === state.card) return;
				paint();
				probe("rehook", { hadOverview: state.overview !== null });
			});
			try {
				state.observer.observe(doc.body ?? doc.documentElement, { childList: true, subtree: true });
			} catch {
				state.observer = null;
			}
		}

		doc.addEventListener("visibilitychange", onVisibility);
		paint();
		refresh();
		if (doc.visibilityState !== "hidden") startTimer();
		probe("mount", { collapsed: state.collapsed, pollMs: POLL_MS });

		return () => {
			state.disposed = true;
			stopTimer();
			doc.removeEventListener("visibilitychange", onVisibility);
			try {
				state.observer?.disconnect();
			} catch {
				void state.observer;
			}
			state.observer = null;
			const card = state.card;
			state.card = null;
			if (card !== null) {
				try {
					card.remove();
				} catch {
					void card;
				}
			}
		};
	}, "usage-glance: sidebar card");
}

/* ── exports ────────────────────────────────────────────────────────────── */

exports.apply = apply;
/** No service gate: the card needs no slots, no locale registry and no renderer. */
exports.inject = [];
/** Exposed for the package's own offline tests; the Loader ignores unknown exports. */
exports.__internals = {
	NS,
	PACKAGE_NAME,
	API_BASE,
	POLL_MS,
	COLLAPSED_KEY,
	CARD_SELECTOR,
	STYLE_TAG_ID,
	formatTokens,
	formatCost,
	formatClock,
	buildCardModel,
	ensureStyle,
	findHost,
	renderCard,
};

return module.exports;
