import z from "@deepseek-ai/schemastery";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { transform } from "lightningcss";

/**
 * Skin runtime — host half.
 *
 * Extracted from @linxin666/dsh-client-ui-skin-center (v0.4.5) and trimmed to
 * the two things the Appearance Library actually needs:
 *
 *  1. the skin catalog + the scoped CSS pipeline that serves a skin's
 *     stylesheet, patches and background assets;
 *  2. the persisted active-selection document
 *     ($DSH_HOME/skin-center-active.json), including the background
 *     preference block the settings section writes.
 *
 * Deliberately absent: the settings panel, custom themes, the marketplace /
 * provenance / hooks trust path, the external wallpaper-engine interop, the
 * install heartbeat, the first-paint index tap and the legacy bridge. Skins
 * are only the ones the Appearance Library exported from this Mac's own
 * wallpaper resources, so there is nothing to seed, install, verify or
 * uninstall here.
 */


//#region src/http.ts
//#region src/http.ts
/** Default body cap for readJsonBody: 64 KiB. */
const DEFAULT_JSON_BODY_MAX_BYTES = 65536;
/** Family-default JSON response headers; callers may append or override. */
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"referrer-policy": "no-referrer"
};
/**
* Lenient bounded body reader: parse a request body as JSON, or null on an
* empty body, invalid JSON, or a body past maxBytes (default 64 KiB).
* Overflow destroys the request instead of draining the remainder (no drain
* call, matching the current repo-wide behavior); callers must not keep
* reading the request afterwards. With objectOnly, non-JSON-object payloads
* also yield null.
*/
async function readJsonBody(req, opts = {}) {
	const maxBytes = opts.maxBytes ?? DEFAULT_JSON_BODY_MAX_BYTES;
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > maxBytes) {
			req.destroy();
			return null;
		}
		chunks.push(buffer);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	if (text === "") return null;
	try {
		const parsed = JSON.parse(text);
		if (opts.objectOnly && !isJsonObject(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}
/** Whether a value is a JSON object: typeof object, not null, not an array. */
function isJsonObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Write one JSON response. Default headers are the family defaults
* (content-type and referrer-policy); caller headers are appended or
* override them.
*/
function writeJson(res, status, body, headers = {}) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		...JSON_HEADERS,
		...headers
	});
	res.end(payload);
}
//#endregion
//#region src/http-utils.ts
//#region src/http-utils.ts
/** True when an `Origin` header names a host other than the request Host.
*  Browsers send Origin on CORS requests and on all POSTs; opaque origins
*  (sandboxed iframes) serialize as the literal string "null". */
function hasForeignOrigin(req) {
	const origin = req.headers.origin;
	if (typeof origin !== "string" || origin === "" || origin === "null") return false;
	const host = req.headers.host;
	if (typeof host !== "string" || host === "") return true;
	try {
		return new URL(origin).host !== host;
	} catch {
		return true;
	}
}
/**
* Same-origin fence. Browsers send Sec-Fetch-Site on every fetch: a
* cross-site fetch is always rejected, and an Origin that does not match the
* request Host is rejected. Requests without either header (curl, node http,
* old browsers) pass — this is a local single-user tool, and the fence only
* targets the cross-site browser vector.
*/
function isSameOriginRequest(req) {
	const site = req.headers["sec-fetch-site"];
	if (typeof site === "string" && site === "cross-site") return false;
	return !hasForeignOrigin(req);
}
/** Reject cross-site requests with 403. */
function requireSameOrigin(req, res) {
	if (isSameOriginRequest(req)) return true;
	writeJson(res, 403, {
		ok: false,
		error: "cross-site-request-rejected"
	});
	return false;
}
//#endregion
//#region src/core/background.ts
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
/**
* Strict validation for the POST /active write surface: a background value
* must be an object whose known fields are correctly typed (numbers are then
* clamped). Returns null for anything else so the route can answer 400.
*/
function sanitizeSkinBackground(value) {
	if (!isRecord$1(value)) return null;
	if (value.enabled !== void 0 && typeof value.enabled !== "boolean") return null;
	for (const field of Object.keys(RANGES)) {
		const raw = value[field];
		if (raw !== void 0 && (typeof raw !== "number" || !Number.isFinite(raw))) return null;
	}
	return normalizeSkinBackground(value);
}
/** True when at least one field departs from its default (customized data). */
function hasCustomSkinBackground(value) {
	return SKIN_BACKGROUND_FIELDS.some((field) => value[field] !== void 0 && value[field] !== SKIN_BACKGROUND_DEFAULTS[field]);
}
//#endregion
//#region src/core/manifest-v2/validate.ts
//#region src/core/manifest-v2/types.ts
/** v1 fields accepted but ignored with a migration warning (never fail-closed). */
const DEPRECATED_V1_FIELDS = [
	"package",
	"wiring",
	"bodyAttr"
];
//#endregion
//#region src/core/manifest-v2/validate.ts
/**
* Fail-closed validator for skin.json manifest v2.
*
* Pure, dependency-free, safe in both the host (node) and the browser
* bundle. Rules (issue #506, section 5):
*  - unknown top-level / nested fields are hard errors (fail-closed);
*  - the v1 fields `package` / `wiring` / `bodyAttr` are an explicit
*    deprecated allowlist: ignored with a migration warning, never an
*    error — otherwise the 11 legacy manifests would be rejected by their
*    own validator;
*  - all file references must be relative paths inside the skin directory
*    (no leading slash, no "..", no protocol URLs);
*  - `skinManifestVersion` declares file structure only; hooks runtime
*    compatibility is carried by `facets.client.apiVersion` and checked
*    by the loader, not here.
*/
const REL_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*:\/\/)[A-Za-z0-9._\-/]+$/;
const SKIN_ID$1 = /^[a-z][a-z0-9-]{0,31}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const API_VERSION = /^x-org\.linxin666\.skin-center\/[a-z0-9]+$/;
const TOP_LEVEL_KEYS = /* @__PURE__ */ new Set([
	"$schema",
	"skinManifestVersion",
	"id",
	"name",
	"nameEn",
	"version",
	"author",
	"tagline",
	"description",
	"tags",
	"accent",
	"order",
	"preview",
	"license",
	"licenseUrl",
	"noticeUrl",
	"sourceUrl",
	"attribution",
	"requires",
	"contributes",
	"facets",
	...DEPRECATED_V1_FIELDS
]);
const DEPRECATED_SET = new Set(DEPRECATED_V1_FIELDS);
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function checkKeys(obj, allowed, path, errors) {
	for (const key of Object.keys(obj)) if (!allowed.has(key)) errors.push(`${path}: unknown field "${key}"`);
}
function checkRelPath(value, path, errors) {
	if (typeof value !== "string" || !REL_PATH.test(value)) errors.push(`${path}: must be a relative path inside the skin directory (got ${JSON.stringify(value)})`);
}
function checkOptionalString(value, path, errors) {
	if (value !== void 0 && typeof value !== "string") errors.push(`${path}: must be a string`);
}
function checkBackgroundLayer(value, path, errors) {
	if (value === void 0) return;
	if (!isRecord(value)) {
		errors.push(`${path}: must be an object`);
		return;
	}
	checkKeys(value, /* @__PURE__ */ new Set([
		"type",
		"src",
		"scrim"
	]), path, errors);
	if (value.type !== "image" && value.type !== "video") errors.push(`${path}.type: must be "image" or "video"`);
	checkRelPath(value.src, `${path}.src`, errors);
	checkOptionalString(value.scrim, `${path}.scrim`, errors);
}
function checkContracts(value, path, errors) {
	if (value === void 0) return;
	if (!Array.isArray(value)) {
		errors.push(`${path}: must be an array`);
		return;
	}
	value.forEach((entry, index) => {
		const p = `${path}[${index}]`;
		if (!isRecord(entry)) {
			errors.push(`${p}: must be an object`);
			return;
		}
		checkKeys(entry, /* @__PURE__ */ new Set([
			"apiVersion",
			"kind",
			"optional"
		]), p, errors);
		if (typeof entry.apiVersion !== "string" || !API_VERSION.test(entry.apiVersion)) errors.push(`${p}.apiVersion: must match x-org.linxin666.skin-center/<tag>`);
		if (entry.kind !== "SkinRuntime" && entry.kind !== "SkinHooks") errors.push(`${p}.kind: must be "SkinRuntime" or "SkinHooks"`);
		if (entry.optional !== void 0 && typeof entry.optional !== "boolean") errors.push(`${p}.optional: must be a boolean`);
	});
}
/**
* Validate a parsed skin.json payload against the v2 contract.
* Never throws; malformed input yields `ok: false` with human-readable errors.
*/
function validateSkinManifestV2(input) {
	const errors = [];
	const warnings = [];
	if (!isRecord(input)) return {
		ok: false,
		errors: ["manifest: must be a JSON object"],
		warnings
	};
	for (const field of Object.keys(input)) if (DEPRECATED_SET.has(field)) warnings.push(`deprecated v1 field "${field}" ignored; run the v1→v2 migration codemod`);
	checkKeys(input, TOP_LEVEL_KEYS, "manifest", errors);
	if (input.skinManifestVersion !== 2) errors.push("manifest.skinManifestVersion: must be 2 (v1 manifests need the migration codemod)");
	if (typeof input.id !== "string" || !SKIN_ID$1.test(input.id)) errors.push(`manifest.id: must match ${SKIN_ID$1} (got ${JSON.stringify(input.id)})`);
	for (const field of [
		"name",
		"nameEn",
		"author"
	]) if (typeof input[field] !== "string" || input[field].length === 0) errors.push(`manifest.${field}: required non-empty string`);
	if (typeof input.version !== "string" || !SEMVER.test(input.version)) errors.push(`manifest.version: required SemVer string (got ${JSON.stringify(input.version)})`);
	checkOptionalString(input.tagline, "manifest.tagline", errors);
	checkOptionalString(input.description, "manifest.description", errors);
	for (const field of [
		"license",
		"licenseUrl",
		"noticeUrl",
		"sourceUrl",
		"attribution"
	]) checkOptionalString(input[field], `manifest.${field}`, errors);
	if (input.tags !== void 0) {
		if (!Array.isArray(input.tags) || input.tags.some((t) => typeof t !== "string")) errors.push("manifest.tags: must be a string array");
	}
	if (input.accent !== void 0 && (typeof input.accent !== "string" || !HEX_COLOR.test(input.accent))) errors.push(`manifest.accent: must be a #rrggbb color (got ${JSON.stringify(input.accent)})`);
	if (input.order !== void 0 && !Number.isInteger(input.order)) errors.push("manifest.order: must be an integer");
	if (input.$schema !== void 0 && typeof input.$schema !== "string") errors.push("manifest.$schema: must be a string");
	if (input.preview !== void 0) {
		if (!isRecord(input.preview)) errors.push("manifest.preview: must be an object");
		else {
			checkKeys(input.preview, /* @__PURE__ */ new Set(["light", "dark"]), "manifest.preview", errors);
			checkRelPath(input.preview.light, "manifest.preview.light", errors);
			checkRelPath(input.preview.dark, "manifest.preview.dark", errors);
		}
	}
	if (input.requires !== void 0) {
		if (!isRecord(input.requires)) errors.push("manifest.requires: must be an object");
		else {
			checkKeys(input.requires, /* @__PURE__ */ new Set(["contracts"]), "manifest.requires", errors);
			checkContracts(input.requires.contracts, "manifest.requires.contracts", errors);
		}
	}
	if (!isRecord(input.contributes)) errors.push("manifest.contributes: required object with at least \"stylesheet\"");
	else {
		const contributes = input.contributes;
		checkKeys(contributes, /* @__PURE__ */ new Set([
			"stylesheet",
			"patches",
			"backgroundMedia"
		]), "manifest.contributes", errors);
		checkRelPath(contributes.stylesheet, "manifest.contributes.stylesheet", errors);
		if (contributes.patches !== void 0) checkRelPath(contributes.patches, "manifest.contributes.patches", errors);
		if (contributes.backgroundMedia !== void 0) {
			if (!isRecord(contributes.backgroundMedia)) errors.push("manifest.contributes.backgroundMedia: must be an object");
			else {
				checkKeys(contributes.backgroundMedia, /* @__PURE__ */ new Set(["light", "dark"]), "manifest.contributes.backgroundMedia", errors);
				checkBackgroundLayer(contributes.backgroundMedia.light, "manifest.contributes.backgroundMedia.light", errors);
				checkBackgroundLayer(contributes.backgroundMedia.dark, "manifest.contributes.backgroundMedia.dark", errors);
			}
		}
	}
	if (input.facets !== void 0) {
		if (!isRecord(input.facets)) errors.push("manifest.facets: must be an object");
		else {
			checkKeys(input.facets, /* @__PURE__ */ new Set(["client"]), "manifest.facets", errors);
			if (input.facets.client !== void 0) {
				const client = input.facets.client;
				if (!isRecord(client)) errors.push("manifest.facets.client: must be an object");
				else {
					checkKeys(client, /* @__PURE__ */ new Set(["entry", "apiVersion"]), "manifest.facets.client", errors);
					checkRelPath(client.entry, "manifest.facets.client.entry", errors);
					if (typeof client.apiVersion !== "string" || !API_VERSION.test(client.apiVersion)) errors.push("manifest.facets.client.apiVersion: must match x-org.linxin666.skin-center/<tag>");
				}
			}
		}
	}
	const manifest = errors.length === 0 ? input : void 0;
	return {
		ok: errors.length === 0,
		errors,
		warnings,
		manifest
	};
}
//#endregion
//#region src/core/css-safety/token-audit.ts
//#region src/core/css-safety/token-audit.ts
const PRIMARY_ACTION_FILL$1 = "--dsw-alias-button-primary-fill";
const PRIMARY_ACTION_HOVER$1 = "--dsw-alias-button-primary-hover";
const PRIMARY_ACTION_DIMMED$1 = "--dsw-alias-button-primary-dimmed";
const PRIMARY_ACTION_FOREGROUND$1 = "--dsw-alias-label-primary-foreground";
const BRAND_PRIMARY = "--dsw-alias-brand-primary";
const BRAND_PRIMARY_INVERT = "--dsw-alias-brand-primary-invert";
/** Shell fill/foreground defaults per theme (both resolve to the official
* theme's own matched CTA: #0f1115 on #ffffff light, #f9fafb on #0f1115 dark). */
const SHELL_CTA = {
	light: {
		fill: "#0f1115",
		foreground: "#ffffff"
	},
	dark: {
		fill: "#f9fafb",
		foreground: "#0f1115"
	}
};
/**
* Official static palette values referenced through var() by skinned tokens
* (the subset the built-in skins actually use; mirrors the official
* dsh-client-ui-theme static table). If a value ever drifts, contrast
* resolution degrades to "skip", never to a wrong verdict.
*/
const STATIC_PALETTE = {
	"--dsw-static-amber-400": "#f7ad31",
	"--dsw-static-amber-500": "#f59e0b",
	"--dsw-static-blue-100": "#dbeafe",
	"--dsw-static-blue-300": "#93c5fd",
	"--dsw-static-blue-400": "#60a5fa",
	"--dsw-static-blue-450": "#4d93f8",
	"--dsw-static-blue-500": "#3b82f6",
	"--dsw-static-blue-600": "#2563eb",
	"--dsw-static-blue-800": "#1e40af",
	"--dsw-static-green-400": "#4ed17e",
	"--dsw-static-green-500": "#22c55e",
	"--dsw-static-neutral-bluish-00": "#fff",
	"--dsw-static-neutral-bluish-1000": "#0f1115",
	"--dsw-static-neutral-bluish-200": "#e1e5ee",
	"--dsw-static-neutral-bluish-300": "#cfd3d6",
	"--dsw-static-neutral-bluish-400": "#adb2b8",
	"--dsw-static-neutral-bluish-500": "#979da6",
	"--dsw-static-neutral-bluish-600": "#81858c",
	"--dsw-static-neutral-bluish-700": "#61666b",
	"--dsw-static-neutral-bluish-750": "#43454a",
	"--dsw-static-neutral-bluish-800": "#353638",
	"--dsw-static-neutral-bluish-950": "#151517"
};
/** Index of the brace that closes the one opened at `open`. */
function matchClose(css, open) {
	let depth = 0;
	for (let i = open; i < css.length; i += 1) {
		const ch = css[i];
		if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) return i;
		}
	}
	return -1;
}
/** Recursive scan: map every custom-property declaration to a theme bucket. */
function parseDefinitions(css) {
	const defined = /* @__PURE__ */ new Set();
	const light = /* @__PURE__ */ new Map();
	const dark = /* @__PURE__ */ new Map();
	const source = withoutComments(css);
	const visit = (start, limit, parentDark) => {
		let i = start;
		for (;;) {
			const open = source.indexOf("{", i);
			if (open === -1 || open >= limit) return;
			const rawClose = matchClose(source, open);
			const close = rawClose === -1 || rawClose >= limit ? -1 : rawClose;
			const head = source.slice(i, open);
			const atRule = head.trimStart().startsWith("@");
			const darkHere = parentDark || /data-ds-dark-theme/.test(head) || /prefers-color-scheme\s*:\s*dark/i.test(head);
			if (atRule) {
				visit(open + 1, close === -1 ? limit : close, darkHere);
				i = close === -1 ? source.length : close + 1;
			} else {
				const end = close === -1 ? source.length : close;
				const body = source.slice(open + 1, end);
				const target = darkHere ? dark : light;
				for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
					const name = match[1];
					const value = match[2];
					if (name === void 0 || value === void 0) continue;
					defined.add(name);
					target.set(name, value.trim());
				}
				i = end + 1;
			}
		}
	};
	visit(0, source.length, false);
	return {
		defined,
		byTheme: {
			light,
			dark
		}
	};
}
function withoutComments(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, "");
}
/** Normalize #rgb / #rrggbb / #rrggbbaa to #rrggbb (alpha ignored). */
function normalizeHex(v) {
	const m = /^#([0-9a-f]{3,8})$/i.exec(v);
	if (m === null) return null;
	const h = m[1] ?? "";
	if (h.length === 3) return "#" + h.split("").map((c) => c + c).join("");
	if (h.length >= 6) return "#" + h.slice(0, 6);
	return null;
}
/** Resolve one declaration value to a #rrggbb color (one theme map). */
function resolveColor(value, theme, parsed, depth = 0) {
	const v = value.trim();
	const hex = normalizeHex(v);
	if (hex !== null) return hex;
	const viaVar = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\s*\)$/.exec(v);
	if (viaVar === null || depth >= 4) return null;
	const name = viaVar[1];
	if (name !== void 0 && STATIC_PALETTE[name] !== void 0) return STATIC_PALETTE[name];
	const own = name !== void 0 ? parsed.byTheme[theme].get(name) ?? parsed.byTheme[theme === "light" ? "dark" : "light"].get(name) : void 0;
	if (own !== void 0) return resolveColor(own, theme, parsed, depth + 1);
	const fallback = viaVar[2];
	return fallback !== void 0 ? resolveColor(fallback, theme, parsed, depth + 1) : null;
}
function rgbOf(hex) {
	const m = /^#([0-9a-f]{6})$/i.exec(hex);
	if (m === null) return null;
	const h = m[1] ?? "";
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16)
	];
}
/** WCAG 2.x relative luminance of a #rrggbb/#rgb color. */
function luminance(hex) {
	const rgb = rgbOf(hex);
	if (rgb === null) return null;
	const [r, g, b] = rgb;
	const linear = (c) => {
		const s = c / 255;
		return s <= .04045 ? s / 12.92 : Math.pow((s + .055) / 1.055, 2.4);
	};
	return .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
}
/** WCAG contrast ratio between two colors (foreground over background). */
function contrastRatio(fg, bg) {
	const l1 = luminance(fg);
	const l2 = luminance(bg);
	if (l1 === null || l2 === null) return null;
	const high = Math.max(l1, l2);
	const low = Math.min(l1, l2);
	return (high + .05) / (low + .05);
}
function anchorDefined(defined) {
	return [...ANCHOR_TOKENS].some((token) => defined.has(token));
}
const ANCHOR_TOKENS = [
	PRIMARY_ACTION_FILL$1,
	PRIMARY_ACTION_HOVER$1,
	PRIMARY_ACTION_DIMMED$1,
	PRIMARY_ACTION_FOREGROUND$1,
	BRAND_PRIMARY,
	BRAND_PRIMARY_INVERT
];
/**
* Audit one skin's stylesheets (in application order) against the
* primary-action token contract. Warning-only: the loader's completion
* rules keep every outcome legible, so this never fails a skin.
*/
function auditTokenContract(stylesheets) {
	const warnings = [];
	if (stylesheets.length === 0) return { warnings };
	const parsed = mergeTokens(stylesheets);
	const { defined, byTheme } = parsed;
	if (!anchorDefined(defined)) return { warnings };
	const fillDefined = defined.has("--dsw-alias-button-primary-fill") || defined.has("--dsw-alias-brand-primary");
	const hoverDefined = defined.has("--dsw-alias-button-primary-hover") || fillDefined;
	const foregroundDefined = defined.has("--dsw-alias-label-primary-foreground") || defined.has("--dsw-alias-brand-primary") && defined.has("--dsw-alias-brand-primary-invert");
	if (!fillDefined) warnings.push("primary action contract: \"button-primary-fill\" is not defined and \"brand-primary\" is not an anchor; buttons render the official shell CTA — define button-primary-fill (with button-primary-hover and label-primary-foreground) to adopt the skin palette");
	if (!hoverDefined) warnings.push("primary action contract: \"button-primary-hover\" is not defined; the loader derives it from the button fill (color-mix toward the surface) — define it explicitly for the exact hover look");
	if (!foregroundDefined) warnings.push("primary action contract: \"label-primary-foreground\" is not defined; the loader keeps the official shell foreground (#fff light / #0f1115 dark) — pair it with the fill, or declare the matched pair brand-primary + brand-primary-invert (legacy convention)");
	for (const theme of ["light", "dark"]) {
		const map = byTheme[theme];
		const fill = map.get("--dsw-alias-button-primary-fill") ?? map.get("--dsw-alias-brand-primary") ?? SHELL_CTA[theme].fill;
		const brandInvert = map.get(BRAND_PRIMARY_INVERT);
		const foreground = map.get("--dsw-alias-label-primary-foreground") ?? (map.get("--dsw-alias-brand-primary") !== void 0 && brandInvert !== void 0 ? brandInvert : SHELL_CTA[theme].foreground);
		const fillResolved = resolveColor(fill, theme, parsed);
		const foregroundResolved = resolveColor(foreground, theme, parsed);
		if (fillResolved === null || foregroundResolved === null) continue;
		const ratio = contrastRatio(foregroundResolved, fillResolved);
		if (ratio !== null && ratio < 3) warnings.push(`primary action contrast: ${foregroundResolved} on ${fillResolved} is ${ratio.toFixed(2)}:1 (${theme} theme) — below the 3:1 UI gate; pick a foreground that pairs with the fill`);
	}
	return { warnings };
}
function mergeTokens(stylesheets) {
	const defined = /* @__PURE__ */ new Set();
	const light = /* @__PURE__ */ new Map();
	const dark = /* @__PURE__ */ new Map();
	for (const sheet of stylesheets) {
		const parsed = parseDefinitions(sheet.css);
		for (const name of parsed.defined) defined.add(name);
		for (const [name, value] of parsed.byTheme.light) light.set(name, value);
		for (const [name, value] of parsed.byTheme.dark) dark.set(name, value);
	}
	return {
		defined,
		byTheme: {
			light,
			dark
		}
	};
}
//#endregion
//#region src/active-state.ts
//#region src/active-state.ts
/**
* Active-skin selection persistence (issue #506): a tiny JSON document under
* $DSH_HOME written by POST /api/skin-center/v2/active and read on every
* index.html response by the tapIndex adapter. Since issue #996 the same
* document also carries the skin-background preference set, so paired remote
* desktops (where the settings scope is loopback-only) read and persist
* background values through the v2 channel. Kept dependency-free and
* synchronous: the tap runs per response and must never await.
* @module @linxin666/dsh-client-ui-skin-center/active-state
*/
/**
* The single skin shipped with the package (the market on-demand plan): the
* default look for a fresh install. Every other skin is a market download
* into the user skins directory; nothing else is bundled.
*/
const DEFAULT_SKIN_ID = "blue-fantasy";
/** Default location: $DSH_HOME/skin-center-active.json. */
function defaultActiveStatePath() {
	return join(userSkinsDir(), "..", "skin-center-active.json");
}
/** Read the whole state document; unreadable data yields all-null fields and initialized=false. */
function readActiveState(path) {
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		const hasInitialized = typeof parsed.initialized === "boolean" ? parsed.initialized : typeof parsed === "object" && parsed !== null && ("active" in parsed || "background" in parsed);
		return {
			active: typeof parsed.active === "string" ? parsed.active : null,
			background: parsed.background === void 0 || parsed.background === null ? null : normalizeSkinBackground(parsed.background),
			initialized: hasInitialized
		};
	} catch {
		return {
			active: null,
			background: null,
			initialized: false
		};
	}
}
/** Read the persisted active skin id (null = stock look / unreadable). */
function readActiveSelection(path) {
	return readActiveState(path).active;
}
/**
* Persist an update with merge semantics: keys absent from `update` keep
* their stored value, so a skin switch never wipes the background section
* and a background write never wipes the selection. The background key is
* omitted from the document while it is null, keeping legacy files clean.
*/
function writeActiveState(path, update) {
	const current = readActiveState(path);
	const active = update.active === void 0 ? current.active : update.active;
	const background = update.background === void 0 ? current.background : update.background;
	const dir = dirname(path);
	mkdirSync(dir, { recursive: true });
	const tmpDir = mkdtempSync(join(dir, `${basename(path)}.tmp-`));
	const tmp = join(tmpDir, basename(path));
	const document = {
		active,
		initialized: true
	};
	if (background !== null) document.background = background;
	try {
		writeFileSync(tmp, JSON.stringify(document, null, 2) + "\n", {
			encoding: "utf8",
			flag: "wx"
		});
		renameSync(tmp, path);
	} finally {
		rmSync(tmpDir, {
			recursive: true,
			force: true
		});
	}
}
/** Persist the active skin id (creates the parent directory). */
function writeActiveSelection(path, id) {
	writeActiveState(path, { active: id });
}
/**
* Seed the active selection on a first boot (no persisted selection): the
* shipped default skin becomes the active look. Never overwrites an existing
* selection — in particular an upgrade keeps (and later resolves) whatever
* the user had picked, and a selection that vanished from the catalog falls
* back to the stock look on the browser side.
* @param path - active-state file path.
* @param find - whether the default id exists in the current catalog.
* @returns whether the seed wrote the selection.
*/
//#region src/core/css-safety/official-tokens.generated.ts
//#region src/core/css-safety/official-tokens.generated.ts
/**
* GENERATED by scripts/official-tokens-snapshot.mjs — do not edit.
* Official shell custom-property surface (--dsw-*, static palette excluded).
*/
const OFFICIAL_TOKENS = [
	"--dsw-alias-bg-base",
	"--dsw-alias-bg-document-preview",
	"--dsw-alias-bg-layer-1",
	"--dsw-alias-bg-layer-2",
	"--dsw-alias-bg-layer-3",
	"--dsw-alias-bg-layer-4",
	"--dsw-alias-bg-mask-1",
	"--dsw-alias-bg-mask-2",
	"--dsw-alias-bg-mask-3",
	"--dsw-alias-bg-mask-drop",
	"--dsw-alias-bg-mask-photo",
	"--dsw-alias-bg-module-platform",
	"--dsw-alias-bg-multi-select",
	"--dsw-alias-bg-overlay",
	"--dsw-alias-bg-skeleton",
	"--dsw-alias-border-inverted",
	"--dsw-alias-border-inverted2",
	"--dsw-alias-border-l1",
	"--dsw-alias-border-l2",
	"--dsw-alias-border-l2-darkmode-thin",
	"--dsw-alias-border-l3",
	"--dsw-alias-border-l4",
	"--dsw-alias-brand-primary",
	"--dsw-alias-brand-primary-invert",
	"--dsw-alias-brand-primary-new-colorprimary-new-color",
	"--dsw-alias-brand-text",
	"--dsw-alias-button-contrast-fill",
	"--dsw-alias-button-elevated-fill",
	"--dsw-alias-button-floating-fill",
	"--dsw-alias-button-floating-hover",
	"--dsw-alias-button-ghost-active-border",
	"--dsw-alias-button-ghost-active-fill",
	"--dsw-alias-button-ghost-active-hover",
	"--dsw-alias-button-info-fill",
	"--dsw-alias-button-info-hover",
	"--dsw-alias-button-primary-dimmed",
	"--dsw-alias-button-primary-fill",
	"--dsw-alias-button-primary-hover",
	"--dsw-alias-button-tool-bar-fill",
	"--dsw-alias-button-tool-bar-fill-invisible",
	"--dsw-alias-button-tool-bar-hover",
	"--dsw-alias-code-diff-added",
	"--dsw-alias-code-diff-deleted",
	"--dsw-alias-file-diff-added-bg",
	"--dsw-alias-file-diff-added-gutter",
	"--dsw-alias-file-diff-added-marker",
	"--dsw-alias-file-diff-deleted-bg",
	"--dsw-alias-file-diff-deleted-gutter",
	"--dsw-alias-file-diff-deleted-marker",
	"--dsw-alias-interactive-bg-active",
	"--dsw-alias-interactive-bg-hover",
	"--dsw-alias-interactive-bg-hover-accent",
	"--dsw-alias-interactive-bg-hover-danger",
	"--dsw-alias-interactive-bg-hover-solid",
	"--dsw-alias-label-caption",
	"--dsw-alias-label-dimmed",
	"--dsw-alias-label-document-preview",
	"--dsw-alias-label-error",
	"--dsw-alias-label-primary",
	"--dsw-alias-label-primary-bluish",
	"--dsw-alias-label-primary-dimmed",
	"--dsw-alias-label-primary-foreground",
	"--dsw-alias-label-primary-inverted",
	"--dsw-alias-label-secondary",
	"--dsw-alias-label-tertiary",
	"--dsw-alias-link",
	"--dsw-alias-markdown-citation",
	"--dsw-alias-markdown-code-block",
	"--dsw-alias-markdown-code-block-banner",
	"--dsw-alias-markdown-code-segment-selected",
	"--dsw-alias-markdown-code-segment-unselected",
	"--dsw-alias-markdown-inline-code",
	"--dsw-alias-markdown-placeholder",
	"--dsw-alias-markdown-tag",
	"--dsw-alias-scrollbar-bg-l1",
	"--dsw-alias-scrollbar-bg-l2",
	"--dsw-alias-scrollbar-hover-l1",
	"--dsw-alias-scrollbar-hover-l2",
	"--dsw-alias-state-business-primary",
	"--dsw-alias-state-business-tertiary",
	"--dsw-alias-state-error-primary",
	"--dsw-alias-state-error-secondary",
	"--dsw-alias-state-idle-primary",
	"--dsw-alias-state-success-primary",
	"--dsw-alias-state-success-secondary",
	"--dsw-alias-state-success-tertiary",
	"--dsw-alias-state-warn-label",
	"--dsw-alias-state-warn-primary",
	"--dsw-alias-state-warn-secondary",
	"--dsw-alias-state-warn-tertiary",
	"--dsw-alias-toast-bg",
	"--dsw-alias-tooltip-bg",
	"--dsw-corner-shape",
	"--dsw-elevation-panel",
	"--dsw-elevation-prominent",
	"--dsw-elevation-soft",
	"--dsw-elevation-stroke",
	"--dsw-elevation-stroke-color",
	"--dsw-font-base-16",
	"--dsw-font-base-16-font-family",
	"--dsw-font-base-16-font-size",
	"--dsw-font-base-16-font-style",
	"--dsw-font-base-16-font-weight",
	"--dsw-font-base-16-line-height",
	"--dsw-font-base-strong-16",
	"--dsw-font-base-strong-16-font-family",
	"--dsw-font-base-strong-16-font-size",
	"--dsw-font-base-strong-16-font-style",
	"--dsw-font-base-strong-16-font-weight",
	"--dsw-font-base-strong-16-line-height",
	"--dsw-font-family",
	"--dsw-font-l-20",
	"--dsw-font-l-20-font-family",
	"--dsw-font-l-20-font-size",
	"--dsw-font-l-20-font-style",
	"--dsw-font-l-20-font-weight",
	"--dsw-font-l-20-line-height",
	"--dsw-font-m-18",
	"--dsw-font-m-18-font-family",
	"--dsw-font-m-18-font-size",
	"--dsw-font-m-18-font-style",
	"--dsw-font-m-18-font-weight",
	"--dsw-font-m-18-line-height",
	"--dsw-font-markdown-base",
	"--dsw-font-markdown-base-font-family",
	"--dsw-font-markdown-base-font-size",
	"--dsw-font-markdown-base-font-style",
	"--dsw-font-markdown-base-font-weight",
	"--dsw-font-markdown-base-italic",
	"--dsw-font-markdown-base-italic-font-family",
	"--dsw-font-markdown-base-italic-font-size",
	"--dsw-font-markdown-base-italic-font-style",
	"--dsw-font-markdown-base-italic-font-weight",
	"--dsw-font-markdown-base-italic-line-height",
	"--dsw-font-markdown-base-line-height",
	"--dsw-font-markdown-base-strong",
	"--dsw-font-markdown-base-strong-font-family",
	"--dsw-font-markdown-base-strong-font-size",
	"--dsw-font-markdown-base-strong-font-style",
	"--dsw-font-markdown-base-strong-font-weight",
	"--dsw-font-markdown-base-strong-italic",
	"--dsw-font-markdown-base-strong-italic-font-family",
	"--dsw-font-markdown-base-strong-italic-font-size",
	"--dsw-font-markdown-base-strong-italic-font-style",
	"--dsw-font-markdown-base-strong-italic-font-weight",
	"--dsw-font-markdown-base-strong-italic-line-height",
	"--dsw-font-markdown-base-strong-line-height",
	"--dsw-font-markdown-code",
	"--dsw-font-markdown-code-block",
	"--dsw-font-markdown-code-block-font-family",
	"--dsw-font-markdown-code-block-font-size",
	"--dsw-font-markdown-code-block-font-style",
	"--dsw-font-markdown-code-block-font-weight",
	"--dsw-font-markdown-code-block-line-height",
	"--dsw-font-markdown-code-block-small",
	"--dsw-font-markdown-code-block-small-font-family",
	"--dsw-font-markdown-code-block-small-font-size",
	"--dsw-font-markdown-code-block-small-font-style",
	"--dsw-font-markdown-code-block-small-font-weight",
	"--dsw-font-markdown-code-block-small-line-height",
	"--dsw-font-markdown-code-font-family",
	"--dsw-font-markdown-code-font-size",
	"--dsw-font-markdown-code-font-style",
	"--dsw-font-markdown-code-font-weight",
	"--dsw-font-markdown-code-line-height",
	"--dsw-font-markdown-h1",
	"--dsw-font-markdown-h1-font-family",
	"--dsw-font-markdown-h1-font-size",
	"--dsw-font-markdown-h1-font-style",
	"--dsw-font-markdown-h1-font-weight",
	"--dsw-font-markdown-h1-line-height",
	"--dsw-font-markdown-h2",
	"--dsw-font-markdown-h2-font-family",
	"--dsw-font-markdown-h2-font-size",
	"--dsw-font-markdown-h2-font-style",
	"--dsw-font-markdown-h2-font-weight",
	"--dsw-font-markdown-h2-line-height",
	"--dsw-font-markdown-h3",
	"--dsw-font-markdown-h3-font-family",
	"--dsw-font-markdown-h3-font-size",
	"--dsw-font-markdown-h3-font-style",
	"--dsw-font-markdown-h3-font-weight",
	"--dsw-font-markdown-h3-line-height",
	"--dsw-font-markdown-h4",
	"--dsw-font-markdown-h4-font-family",
	"--dsw-font-markdown-h4-font-size",
	"--dsw-font-markdown-h4-font-style",
	"--dsw-font-markdown-h4-font-weight",
	"--dsw-font-markdown-h4-line-height",
	"--dsw-font-markdown-small",
	"--dsw-font-markdown-small-font-family",
	"--dsw-font-markdown-small-font-size",
	"--dsw-font-markdown-small-font-style",
	"--dsw-font-markdown-small-font-weight",
	"--dsw-font-markdown-small-italic",
	"--dsw-font-markdown-small-italic-font-family",
	"--dsw-font-markdown-small-italic-font-size",
	"--dsw-font-markdown-small-italic-font-style",
	"--dsw-font-markdown-small-italic-font-weight",
	"--dsw-font-markdown-small-italic-line-height",
	"--dsw-font-markdown-small-line-height",
	"--dsw-font-markdown-small-strong",
	"--dsw-font-markdown-small-strong-font-family",
	"--dsw-font-markdown-small-strong-font-size",
	"--dsw-font-markdown-small-strong-font-style",
	"--dsw-font-markdown-small-strong-font-weight",
	"--dsw-font-markdown-small-strong-italic",
	"--dsw-font-markdown-small-strong-italic-font-family",
	"--dsw-font-markdown-small-strong-italic-font-size",
	"--dsw-font-markdown-small-strong-italic-font-style",
	"--dsw-font-markdown-small-strong-italic-font-weight",
	"--dsw-font-markdown-small-strong-italic-line-height",
	"--dsw-font-markdown-small-strong-line-height",
	"--dsw-font-markdown-table",
	"--dsw-font-markdown-table-font-family",
	"--dsw-font-markdown-table-font-size",
	"--dsw-font-markdown-table-font-style",
	"--dsw-font-markdown-table-font-weight",
	"--dsw-font-markdown-table-head",
	"--dsw-font-markdown-table-head-font-family",
	"--dsw-font-markdown-table-head-font-size",
	"--dsw-font-markdown-table-head-font-style",
	"--dsw-font-markdown-table-head-font-weight",
	"--dsw-font-markdown-table-head-line-height",
	"--dsw-font-markdown-table-line-height",
	"--dsw-font-s-14",
	"--dsw-font-s-14-font-family",
	"--dsw-font-s-14-font-size",
	"--dsw-font-s-14-font-style",
	"--dsw-font-s-14-font-weight",
	"--dsw-font-s-14-line-height",
	"--dsw-font-s-strong-14",
	"--dsw-font-s-strong-14-font-family",
	"--dsw-font-s-strong-14-font-size",
	"--dsw-font-s-strong-14-font-style",
	"--dsw-font-s-strong-14-font-weight",
	"--dsw-font-s-strong-14-line-height",
	"--dsw-font-xl-24",
	"--dsw-font-xl-24-font-family",
	"--dsw-font-xl-24-font-size",
	"--dsw-font-xl-24-font-style",
	"--dsw-font-xl-24-font-weight",
	"--dsw-font-xl-24-line-height",
	"--dsw-font-xs-13",
	"--dsw-font-xs-13-font-family",
	"--dsw-font-xs-13-font-size",
	"--dsw-font-xs-13-font-style",
	"--dsw-font-xs-13-font-weight",
	"--dsw-font-xs-13-line-height",
	"--dsw-font-xs-strong-13",
	"--dsw-font-xs-strong-13-font-family",
	"--dsw-font-xs-strong-13-font-size",
	"--dsw-font-xs-strong-13-font-style",
	"--dsw-font-xs-strong-13-font-weight",
	"--dsw-font-xs-strong-13-line-height",
	"--dsw-font-xxs-12",
	"--dsw-font-xxs-12-font-family",
	"--dsw-font-xxs-12-font-size",
	"--dsw-font-xxs-12-font-style",
	"--dsw-font-xxs-12-font-weight",
	"--dsw-font-xxs-12-line-height",
	"--dsw-font-xxs-strong-12",
	"--dsw-font-xxs-strong-12-font-family",
	"--dsw-font-xxs-strong-12-font-size",
	"--dsw-font-xxs-strong-12-font-style",
	"--dsw-font-xxs-strong-12-font-weight",
	"--dsw-font-xxs-strong-12-line-height",
	"--dsw-font-xxxs-11",
	"--dsw-font-xxxs-11-font-family",
	"--dsw-font-xxxs-11-font-size",
	"--dsw-font-xxxs-11-font-style",
	"--dsw-font-xxxs-11-font-weight",
	"--dsw-font-xxxs-11-line-height",
	"--dsw-font-xxxs-strong-11",
	"--dsw-font-xxxs-strong-11-font-family",
	"--dsw-font-xxxs-strong-11-font-size",
	"--dsw-font-xxxs-strong-11-font-style",
	"--dsw-font-xxxs-strong-11-font-weight",
	"--dsw-font-xxxs-strong-11-line-height",
	"--dsw-hovercard-bg",
	"--dsw-linear-gradient-think",
	"--dsw-linear-think-select",
	"--dsw-mask-blur",
	"--dsw-menu-backdrop-filter",
	"--dsw-shadow-lv1",
	"--dsw-shadow-lv1-blur",
	"--dsw-shadow-lv2",
	"--dsw-shadow-lv3",
	"--dsw-specific-bubble",
	"--dsw-specific-bubble-highlight",
	"--dsw-specific-input-major",
	"--dsw-specific-login-input",
	"--dsw-specific-menu",
	"--dsw-specific-selector",
	"--dsw-specific-sidebar-fill",
	"--dsw-specific-sidebar-nav-item-active",
	"--dsw-specific-sidebar-nav-item-active-accent",
	"--dsw-specific-sidebar-nav-item-hover",
	"--dsw-specific-tip"
];
//#endregion
//#region src/core/css-safety/fallback.ts
//#region src/core/css-safety/fallback.ts
/**
* Automatic token fallbacks (issue #506 follow-up): for every official
* --dsw-* token a skin does NOT remap, derive a translucent tint of the
* skin's own palette — the skin's main color, "blurred" over whatever sits
* behind the surface. The official shell keeps adding surfaces (e.g. the
* composer's --dsw-specific-input-major); without this, an uncovered
* surface snaps back to the official default gray-blue and breaks the
* skin's palette. The fallback keeps skins future-proof across official
* upgrades: any new token simply inherits the skin's tint instead of the
* stock look.
*
* Rules (fail-closed, conservative):
*  - never touch the static palette (not in the registry at all);
*  - never override a token the skin defines;
*  - never derive when the skin defines no anchor for the group;
*  - semantic / structural groups (buttons, state colors, masks, shadows,
*    inverted/foreground labels, fonts, easing) are skipped: a tint there
*    would break contrast or layout instead of filling a gap. State colors
*    are matched by role word, not by prefix, because the official surface
*    names them inconsistently (--dsw-alias-state-error-primary but also
*    --dsw-alias-label-error and --dsw-alias-interactive-bg-hover-danger).
*
* The derivation is textual (color-mix with a var() reference), so it
* resolves against the skin's own remap — including the dark-theme block —
* and stays theme-aware with zero runtime logic.
*/
/**
* Roles that must never be tinted: a translucent skin tint would break
* contrast, layout, or the meaning of a state instead of filling a gap.
* State roles get one word each — the official surface is not uniformly
* prefixed (state-error-primary, label-error, interactive-bg-hover-danger),
* so matching the role word is the only reliable rule.
*/
const EXCLUDED = /(^|-)(mask|shadow|button|state|error|warning|success|danger|info|caution|brand|scrollbar|foreground|inverted|dimmed)(-|$)|-font-|linear-|ease|duration|transition/;
/** Matched in order; the first group whose pattern hits wins. */
const GROUPS = [
	{
		skip: /-bg-/,
		anchors: ["--dsw-alias-bg-layer-1", "--dsw-alias-bg-base"],
		alpha: 65
	},
	{
		skip: /-label-/,
		anchors: ["--dsw-alias-label-primary"],
		alpha: 70
	},
	{
		skip: /-border-/,
		anchors: ["--dsw-alias-border-l2", "--dsw-alias-border-l1"],
		alpha: 55
	},
	{
		skip: /-interactive-/,
		anchors: ["--dsw-alias-bg-layer-1"],
		alpha: 50
	},
	{
		skip: /-specific-/,
		anchors: ["--dsw-alias-bg-layer-1", "--dsw-alias-bg-base"],
		alpha: 60
	}
];
function groupFor(token) {
	if (EXCLUDED.test(token)) return null;
	for (const group of GROUPS) if (group.skip.test(token)) return group;
	return null;
}
/**
* Build fallback declarations for the official tokens the skin does not
* define. Returns declaration strings ("--x: color-mix(...);" per token).
*/
function deriveFallbackTokens(defined) {
	const out = [];
	for (const token of OFFICIAL_TOKENS) {
		if (defined.has(token)) continue;
		const group = groupFor(token);
		if (group === null) continue;
		const anchor = group.anchors.find((candidate) => defined.has(candidate));
		if (anchor === void 0) continue;
		out.push(`${token}: color-mix(in srgb, var(${anchor}) ${group.alpha}%, transparent);`);
	}
	return out;
}
/**
* Primary-action completion (issue #506 follow-up): filled primary buttons
* render from one matched set — button-primary-fill, button-primary-hover,
* label-primary-foreground. The official theme itself wires
* button-primary-fill to brand-primary, so a skin that remaps the brand
* already colors the fill; hover and foreground do NOT follow the brand and
* would snap to the shell's static values. To keep a partially-declared or
* legacy (brand-primary + brand-primary-invert) skin coherent, the loader
* completes the set here:
*
*  - fill: derive from brand-primary when the skin declares its brand but
*    no explicit fill (the shell chain does this anyway; the derivation
*    makes the intent explicit and keeps the textual derivation table
*    self-contained);
*  - hover / dimmed: blend the fill toward the surface (color-mix) — a
*    direction-agnostic press/disabled tint that works in both themes;
*  - foreground: inherit the skin's own brand-primary-invert ONLY when the
*    skin declares both brand tokens (the legacy matched convention); the
*    shell foreground stands in otherwise.
*
* Never overrides a token the skin defines, and never derives without an
* anchor: a skin with no brand and no button tokens keeps the official
* shell's own matched CTA.
*/
/** The primary-action token family (see ./token-audit.ts for the audit). */
const PRIMARY_ACTION_FILL = "--dsw-alias-button-primary-fill";
const PRIMARY_ACTION_HOVER = "--dsw-alias-button-primary-hover";
const PRIMARY_ACTION_DIMMED = "--dsw-alias-button-primary-dimmed";
const PRIMARY_ACTION_FOREGROUND = "--dsw-alias-label-primary-foreground";
const PRIMARY_ACTION_BRAND = "--dsw-alias-brand-primary";
const PRIMARY_ACTION_BRAND_INVERT = "--dsw-alias-brand-primary-invert";
/** Derive the primary-action tokens the skin did not define. */
function derivePrimaryActionFallbacks(defined) {
	const out = [];
	const hasBrand = defined.has(PRIMARY_ACTION_BRAND);
	const branded = hasBrand || defined.has("--dsw-alias-button-primary-fill");
	if (!hasBrand && !defined.has("--dsw-alias-button-primary-fill")) return out;
	if (!defined.has("--dsw-alias-button-primary-fill") && hasBrand) out.push(`${PRIMARY_ACTION_FILL}: var(${PRIMARY_ACTION_BRAND});`);
	if (branded && !defined.has("--dsw-alias-button-primary-hover")) out.push(`${PRIMARY_ACTION_HOVER}: color-mix(in srgb, var(${PRIMARY_ACTION_FILL}) 82%, var(--dsw-alias-bg-layer-1));`);
	if (branded && !defined.has("--dsw-alias-button-primary-dimmed")) out.push(`${PRIMARY_ACTION_DIMMED}: color-mix(in srgb, var(${PRIMARY_ACTION_FILL}) 60%, var(--dsw-alias-bg-layer-1));`);
	if (!defined.has("--dsw-alias-label-primary-foreground") && hasBrand && defined.has("--dsw-alias-brand-primary-invert")) out.push(`${PRIMARY_ACTION_FOREGROUND}: var(${PRIMARY_ACTION_BRAND_INVERT});`);
	return out;
}
//#endregion
//#region src/core/css-safety/transform.ts
//#region src/core/css-safety/transform.ts
/**
* Skin CSS safety pipeline (issue #506, contract section "校验纪律").
*
* Every skin stylesheet passes through this transform before it is served or
* injected — built-in or community, skin.css or patches.css. It is the
* technical enforcement of the coupling boundary:
*
*  - SCOPING: every selector is force-scoped under
*    `html[data-dsh-skin="<id>"]`. Root-ish heads are rewritten, not nested:
*    `:root` / `html` merge into the scope; `body` and bare official
*    `[data-ds-*]` heads (the official dark-theme attribute lives on BODY)
*    become descendants of the scope; everything else becomes a descendant.
*  - ROOT THEME TOKENS: per-theme `--dsw-alias-*` and
*    `--dsw-specific-*` declarations from bare `:root` / `html` are reset
*    on the scope and cloned to body. Root-level shell variables therefore
*    cannot capture a light token while its dark variant belongs on body (#646).
*  - WHITELIST (fail-closed): no `@import`, no remote or protocol-relative
*    URLs, no absolute paths escaping the skin directory; only relative
*    in-directory assets (and `data:`, which warns — prefer assets/ files).
*  - WARNINGS: reliance on CSS-Modules hash class names (`[class*=...]`)
*    warns; generic @keyframes names warn.
*
* Two-pass design (do NOT collapse): selector scoping is a text-level
* surgery guided by lightningcss rule locations, and lightningcss itself is
* only used to PARSE/validate (read-only visitors). Returning mutated rules
* from a lightningcss 1.32/1.33 style visitor crashes declaration
* deserialization on any var() declaration ("failed to deserialize; expected
* an object-like struct named Specifier") — an upstream serialization defect
* the text-level pass sidesteps entirely. A side benefit: the output keeps
* the author's formatting and values byte-for-byte outside selector heads.
*
* NOTE: this module runs host-side (node) in the M2 loader. lightningcss is
* a native dependency and must stay OUT of the browser bundle (external in
* tsdown.config.ts).
* @module @linxin666/dsh-client-ui-skin-center/css-safety
*/
/** Violation of the CSS whitelist. Always fatal (fail-closed). */
var SkinCssSafetyError = class extends Error {
	name = "SkinCssSafetyError";
	violations;
	constructor(message, violations) {
		super(message);
		this.violations = violations;
	}
};
/** Convert a lightningcss Location2 (0-based line, 1-based column) to a char offset. */
function locToOffset(source, line, column) {
	let offset = 0;
	let currentLine = 0;
	while (currentLine < line) {
		const next = source.indexOf("\n", offset);
		if (next === -1) return source.length;
		offset = next + 1;
		currentLine += 1;
	}
	return offset + column - 1;
}
/**
* Find the opening '{' of a rule whose selector starts at `start`,
* tracking parens/brackets/strings so :is(...), [title="{"] etc. cannot
* fake an early brace.
*/
function findOpenBrace(source, start) {
	let parens = 0;
	let brackets = 0;
	let quote = null;
	for (let i = start; i < source.length; i += 1) {
		const ch = source[i];
		if (quote !== null) {
			if (ch === "\\") i += 1;
			else if (ch === quote) quote = null;
			continue;
		}
		if (ch === "\"" || ch === "'") {
			quote = ch;
			continue;
		}
		if (ch === "(") parens += 1;
		else if (ch === ")") parens -= 1;
		else if (ch === "[") brackets += 1;
		else if (ch === "]") brackets -= 1;
		else if (ch === "{" && parens === 0 && brackets === 0) return i;
		else if (ch === ";" && parens === 0 && brackets === 0) return -1;
	}
	return -1;
}
/** Split a selector list on top-level commas (paren/bracket/string aware). */
function splitSelectors(selectorText) {
	const parts = [];
	let parens = 0;
	let brackets = 0;
	let quote = null;
	let current = "";
	for (let i = 0; i < selectorText.length; i += 1) {
		const ch = selectorText[i];
		if (quote !== null) {
			current += ch;
			if (ch === "\\") {
				current += selectorText[i + 1] ?? "";
				i += 1;
			} else if (ch === quote) quote = null;
			continue;
		}
		if (ch === "\"" || ch === "'") {
			quote = ch;
			current += ch;
			continue;
		}
		if (ch === "(") parens += 1;
		else if (ch === ")") parens -= 1;
		else if (ch === "[") brackets += 1;
		else if (ch === "]") brackets -= 1;
		if (ch === "," && parens === 0 && brackets === 0) {
			parts.push(current);
			current = "";
			continue;
		}
		current += ch;
	}
	parts.push(current);
	return parts;
}
const HEAD_DATA_DS = /^\[data-ds-[a-z0-9-]+/;
/**
* Scope one selector under html[data-dsh-skin="<id>"]. Text-level and
* conservative: only the well-defined root-ish heads get rewritten; any
* other selector simply becomes a descendant of the scope.
*/
function scopeSelectorText(selector, skinId) {
	const scope = `html[data-dsh-skin="${skinId}"]`;
	const trimmed = selector.trim();
	const leading = selector.slice(0, selector.length - selector.trimStart().length);
	const trailing = selector.slice(leading.length + trimmed.length);
	if (trimmed === ":root" || trimmed.startsWith(":root ") || trimmed.startsWith(":root,")) return leading + scope + trimmed.slice(5) + trailing;
	if (/^html\[data-ds-/.test(trimmed)) return `${leading}${scope} body${trimmed.slice(4)}${trailing}`;
	if (trimmed === "html" || trimmed.startsWith("html ")) return leading + scope + trimmed.slice(4) + trailing;
	if (trimmed === "body" || trimmed.startsWith("body ") || trimmed.startsWith("body[") || trimmed.startsWith("body:")) return `${leading}${scope} ${trimmed}${trailing}`;
	if (HEAD_DATA_DS.test(trimmed)) return `${leading}${scope} body${trimmed}${trailing}`;
	return `${leading}${scope} ${trimmed}${trailing}`;
}
/** Scope every selector in one selector-list text, preserving separators. */
function scopeSelectorList(selectorText, skinId) {
	return splitSelectors(selectorText).map((sel) => scopeSelectorText(sel, skinId)).join(",");
}
const ROOT_BODY_TOKEN = /^(?:--dsw-alias-|--dsw-specific-)/;
/** A bare root selector owns custom properties evaluated on html itself. */
function hasBareRootSelector(selectorText) {
	return splitSelectors(selectorText).some((selector) => {
		const trimmed = selector.trim();
		return trimmed === ":root" || trimmed === "html";
	});
}
function withoutCssComments(value) {
	return value.replace(/\/\*[\s\S]*?\*\//g, "");
}
/** Per-theme root declarations that must instead take effect from body. */
function rootBodyTokens(block) {
	const tokens = /* @__PURE__ */ new Map();
	const declarations = withoutCssComments(block);
	for (const match of declarations.matchAll(/(?:^|[;{])\s*(--[\w-]+)\s*:\s*([^;}]*)/gm)) {
		const name = match[1];
		if (name !== void 0 && ROOT_BODY_TOKEN.test(name)) tokens.set(name, /!\s*important\s*$/i.test(match[2] ?? ""));
	}
	return [...tokens].map(([name, important]) => ({
		name,
		important
	}));
}
/** Normalize cloned root tokens so dark body declarations can override them. */
function bodyCloneProperty(line) {
	const custom = line.match(/^(--[\w-]+)\s*:/);
	if (custom !== null) {
		const name = custom[1] ?? "";
		return ROOT_BODY_TOKEN.test(name) ? line.replace(/\s*!important(?=\s*;?\s*$)/i, "") : line;
	}
	return /^background-(color|image)\s*:/.test(line) ? line : null;
}
/** Check one url() target against the whitelist. */
function checkUrl(raw, context, violations, warnings) {
	const url = raw.trim().replace(/^["']|["']$/g, "");
	if (/^https?:\/\//i.test(url)) violations.push(`${context}: remote URL "${url}" is not allowed; ship the asset in the skin directory`);
	else if (url.startsWith("//")) violations.push(`${context}: protocol-relative URL "${url}" is not allowed`);
	else if (url.startsWith("/")) violations.push(`${context}: absolute path "${url}" escapes the skin directory`);
	else if (/^(?:\.\.\/)/.test(url)) violations.push(`${context}: path "${url}" escapes the skin directory`);
	else if (/^data:/i.test(url)) warnings.push(`${context}: inline data: URL — prefer a file under assets/`);
}
const GENERIC_KEYFRAMES = /* @__PURE__ */ new Set([
	"spin",
	"pulse",
	"fade",
	"fadein",
	"fade-in",
	"fadeout",
	"fade-out",
	"slide",
	"slidein",
	"slide-in",
	"bounce",
	"glow",
	"blink",
	"shake",
	"float"
]);
/**
* Transform a skin stylesheet: force-scope every selector under
* html[data-dsh-skin="<id>"] and enforce the whitelist. Throws
* SkinCssSafetyError on any violation (fail-closed); lightningcss parse
* errors propagate as-is (malformed CSS is also a hard failure).
*/
function transformSkinCss(css, options) {
	const { skinId } = options;
	const filename = options.filename ?? "skin.css";
	const violations = [];
	const warnings = [];
	const spans = [];
	const defined = /* @__PURE__ */ new Set();
	transform({
		filename,
		code: Buffer.from(css),
		visitor: {
			Rule: {
				import(rule) {
					violations.push(`${filename}: @import "${rule.value.url}" is not allowed; skins are single-file stylesheets`);
				},
				keyframes(rule) {
					const name = rule.value.name;
					const value = typeof name === "string" ? name : name?.value;
					if (typeof value === "string" && GENERIC_KEYFRAMES.has(value.toLowerCase())) warnings.push(`${filename}: generic @keyframes name "${value}" may collide across skins; prefix it (e.g. ${skinId}-${value})`);
				},
				style(rule) {
					const loc = rule.value.loc;
					if (loc) {
						const start = locToOffset(css, loc.line, loc.column);
						const openBrace = findOpenBrace(css, start);
						if (openBrace !== -1) spans.push({
							start,
							openBrace
						});
					}
					for (const sel of rule.value.selectors) for (const c of sel) if (c.type === "attribute" && c.name === "class" && [
						"substring",
						"prefix",
						"suffix"
					].includes(c.operation?.operator)) warnings.push(`${filename}: [class*=...]-style attribute matching relies on CSS-Modules hash class names and may break on any official rebuild`);
				}
			},
			Declaration: { custom(property) {
				defined.add(property.name);
			} },
			Url(url) {
				checkUrl(url.url, filename, violations, warnings);
			}
		}
	});
	if (violations.length > 0) throw new SkinCssSafetyError(`skin CSS violates the whitelist:\n - ${violations.join("\n - ")}`, violations);
	const sorted = [...spans].sort((a, b) => a.start - b.start);
	const scope = `html[data-dsh-skin="${skinId}"]`;
	let out = "";
	let cursor = 0;
	for (const span of sorted) {
		const selectorText = css.slice(span.start, span.openBrace);
		const close = findCloseBrace(css, span.openBrace);
		out += css.slice(cursor, span.start);
		const scoped = scopeSelectorList(selectorText, skinId);
		const block = close === -1 ? css.slice(span.openBrace) : css.slice(span.openBrace, close + 1);
		out += scoped + block;
		if (close !== -1 && hasBareRootSelector(selectorText)) {
			const tokens = rootBodyTokens(block);
			if (tokens.length > 0) out += `\n${scope} {\n  ${tokens.map(({ name, important }) => `${name}: initial${important ? " !important" : ""};`).join("\n  ")}\n}\n`;
		}
		if (hasBareRootSelector(selectorText) && close !== -1) {
			const props = withoutCssComments(css.slice(span.openBrace + 1, close)).split("\n").map((line) => bodyCloneProperty(line.trim())).filter((line) => line !== null);
			if (props.length > 0) out += `\n${scope} body {\n  ${props.join("\n  ")}\n}\n`;
		}
		cursor = close === -1 ? span.openBrace : close + 1;
	}
	out += css.slice(cursor);
	out += `\n${scope} [id="root"] { background: transparent; }\n`;
	out += `\n${scope} body { --shiki-background: var(--dsw-alias-markdown-code-block); }\n`;
	if (options.deriveFallbacks === true) {
		const fallbacks = [...deriveFallbackTokens(defined), ...derivePrimaryActionFallbacks(defined)];
		if (fallbacks.length > 0) out += `\n${scope} body {\n  ${fallbacks.join("\n  ")}\n}\n`;
	}
	return {
		code: out,
		warnings
	};
}
/**
* Find the matching closing brace for the block opening at openBrace.
* Conservative: counts braces, skips strings and comments; returns -1 when
* the block never closes (callers then keep the remainder as-is).
*/
function findCloseBrace(css, openBrace) {
	let depth = 0;
	let i = openBrace;
	let inString = null;
	let inComment = false;
	for (; i < css.length; i++) {
		const ch = css[i];
		const next = css[i + 1];
		if (inComment) {
			if (ch === "*" && next === "/") {
				inComment = false;
				i++;
			}
			continue;
		}
		if (inString !== null) {
			if (ch === "\\") i++;
			else if (ch === inString) inString = null;
			continue;
		}
		if (ch === "/" && next === "*") {
			inComment = true;
			i++;
			continue;
		}
		if (ch === "\"" || ch === "'") {
			inString = ch;
			continue;
		}
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}
//#endregion
//#region src/skin-repo.ts (trimmed: user skins only)
/** User skins live in $DSH_HOME/skins (same root the Appearance Library exports into). */
function userSkinsDir(skinRoot) {
	return resolve(skinRoot);
}
/** Read one skin.json; null when absent or unreadable. */
function readManifest(dir) {
	const manifestPath = join(dir, "skin.json");
	if (!existsSync(manifestPath)) return null;
	try {
		return JSON.parse(readFileSync(manifestPath, "utf8"));
	} catch {
		return null;
	}
}
/** Read the manifest-referenced stylesheets for one skin directory, for the token contract audit. */
function stylesheetEntries(manifest, dir) {
	const entries = [];
	const rels = [manifest.contributes.stylesheet, manifest.contributes.patches ?? null];
	for (const rel of rels) {
		if (!rel) continue;
		const abs = join(dir, rel);
		if (existsSync(abs)) entries.push({
			filename: rel,
			css: readFileSync(abs, "utf8")
		});
	}
	return entries;
}
/** Cheap invalidation fingerprint of the skin root: directory names plus each skin.json's stat. */
function rootFingerprint(root) {
	let dirNames;
	try {
		dirNames = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
	} catch {
		return "";
	}
	const rows = [];
	for (const dirName of dirNames) {
		const manifestPath = join(root, dirName, "skin.json");
		try {
			const st = statSync(manifestPath);
			rows.push(JSON.stringify([dirName, st.mtimeMs, st.size, st.mode]));
		} catch {
			rows.push(JSON.stringify([dirName]));
		}
	}
	return rows.join("\n");
}
/** Process-wide catalog cache, keyed by the skin root. */
const DEFAULT_CATALOG_CACHE = new Map();
const CATALOG_CACHE_MAX_ENTRIES = 16;
/**
* Snapshot the skin catalog from the user skin directory. Never throws:
* unreadable skins land in diagnostics. Memoized until the root fingerprint
* changes, so client polling does not rescan.
* @param options - { skinRoot, catalogCache, now }.
* @returns the catalog snapshot ({ skins, diagnostics, capturedAt }).
*/
function loadSkinCatalog(options = {}) {
	const userDir = options.userDir ?? userSkinsDir(options.skinRoot ?? "");
	const cache = options.catalogCache ?? DEFAULT_CATALOG_CACHE;
	const cacheKey = userDir;
	const fingerprint = rootFingerprint(userDir);
	const hit = cache.get(cacheKey);
	if (hit && hit.fingerprint === fingerprint) return {
		...hit.catalog,
		capturedAt: (options.now ?? Date.now)()
	};
	const catalog = {
		skins: [],
		diagnostics: [],
		capturedAt: (options.now ?? Date.now)()
	};
	const claimed = new Set();
	let dirNames = [];
	try {
		dirNames = readdirSync(userDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
	} catch {
		dirNames = [];
	}
	for (const dirName of dirNames) {
		const dir = join(userDir, dirName);
		const raw = readManifest(dir);
		if (raw === null) {
			if (!existsSync(join(dir, "skin.json"))) continue;
			catalog.diagnostics.push({ subject: dirName, origin: "user", errors: ["skin.json missing or not valid JSON"] });
			continue;
		}
		const result = validateSkinManifestV2(raw);
		if (!result.ok || !result.manifest) {
			catalog.diagnostics.push({ subject: dirName, origin: "user", errors: result.errors });
			continue;
		}
		const manifest = result.manifest;
		if (manifest.id !== dirName) {
			catalog.diagnostics.push({
				subject: dirName,
				origin: "user",
				errors: [`manifest id "${manifest.id}" must equal the directory name "${dirName}"`]
			});
			continue;
		}
		if (claimed.has(manifest.id)) {
			catalog.diagnostics.push({ subject: dirName, origin: "user", errors: [`duplicate id "${manifest.id}" ignored`] });
			continue;
		}
		const warnings = [...result.warnings, ...auditTokenContract(stylesheetEntries(manifest, dir)).warnings];
		claimed.add(manifest.id);
		catalog.skins.push({ manifest, origin: "user", dir, warnings });
	}
	catalog.skins.sort((a, b) => (a.manifest.order ?? Number.MAX_SAFE_INTEGER) - (b.manifest.order ?? Number.MAX_SAFE_INTEGER) || a.manifest.id.localeCompare(b.manifest.id));
	cache.set(cacheKey, { fingerprint, catalog });
	if (cache.size > CATALOG_CACHE_MAX_ENTRIES) cache.clear();
	return catalog;
}
/** Find one skin in a snapshot by id. */
function findSkin(catalog, id) {
	return catalog.skins.find((s) => s.manifest.id === id) ?? null;
}
/** Resolve a file inside a skin directory, refusing any escape. */
function resolveInsideSkin(entry, relPath) {
	const abs = resolve(entry.dir, relPath);
	const root = resolve(entry.dir);
	const rootWithSep = root.endsWith(sep) ? root : root + sep;
	if (abs !== root && !abs.startsWith(rootWithSep)) return null;
	return abs;
}
//#endregion

//#region src/routes.ts (trimmed: catalog, active, skin assets)
const SKIN_CENTER_V2_PREFIX = "/api/skin-center/v2";
const MIME = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".mp4": "video/mp4",
	".webm": "video/webm",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".otf": "font/otf",
	".json": "application/json; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8"
};
/** Serve one manifest-referenced stylesheet through the safety pipeline. */
function serveStylesheet(res, entry, relPath, filename) {
	const abs = resolveInsideSkin(entry, relPath);
	if (!abs || !existsSync(abs)) {
		writeJson(res, 404, { ok: false, error: "stylesheet-not-found" });
		return;
	}
	try {
		const { code } = transformSkinCss(readFileSync(abs, "utf8"), {
			skinId: entry.manifest.id,
			filename,
			deriveFallbacks: filename === "skin.css"
		});
		res.writeHead(200, {
			"content-type": "text/css; charset=utf-8",
			"cache-control": "no-store"
		});
		res.end(code);
	} catch (error) {
		if (error instanceof SkinCssSafetyError) {
			writeJson(res, 422, { ok: false, error: "css-whitelist-violation", violations: error.violations });
			return;
		}
		writeJson(res, 500, { ok: false, error: "css-transform-failed", detail: error?.message ?? String(error) });
	}
}
/**
* Read one `bytes=` range out of a Range header, clamped to the file.
* @param header - the Range header value.
* @param size - the file size in bytes.
* @returns { start, end } or null when the header is unusable.
*/
function parseByteRange(header, size) {
	const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
	if (!match) return null;
	const [, rawStart, rawEnd] = match;
	if (rawStart === "") {
		if (rawEnd === "") return null;
		const suffix = Number(rawEnd);
		if (!Number.isFinite(suffix) || suffix <= 0) return null;
		return { start: Math.max(0, size - suffix), end: size - 1 };
	}
	const start = Number(rawStart);
	if (!Number.isFinite(start) || start >= size) return null;
	const end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
	if (!Number.isFinite(end) || end < start) return null;
	return { start, end };
}
/** Serve one static file from inside the skin directory, honouring Range (a film can be 320 MB). */
function serveAsset(req, res, entry, relPath) {
	const abs = resolveInsideSkin(entry, relPath);
	if (!abs || !existsSync(abs) || !statSync(abs).isFile()) {
		writeJson(res, 404, { ok: false, error: "asset-not-found" });
		return;
	}
	const mime = MIME[extname(abs).toLowerCase()] ?? "application/octet-stream";
	const size = statSync(abs).size;
	const range = req?.headers?.range;
	if (typeof range === "string" && range !== "") {
		const span = parseByteRange(range, size);
		if (span === null) {
			res.writeHead(416, {
				"content-type": mime,
				"cache-control": "no-store",
				"content-range": `bytes */${size}`
			});
			res.end();
			return;
		}
		res.writeHead(206, {
			"content-type": mime,
			"cache-control": "no-store",
			"accept-ranges": "bytes",
			"content-range": `bytes ${span.start}-${span.end}/${size}`,
			"content-length": String(span.end - span.start + 1)
		});
		createReadStream(abs, { start: span.start, end: span.end }).pipe(res);
		return;
	}
	res.writeHead(200, {
		"content-type": mime,
		"cache-control": "no-store",
		"accept-ranges": "bytes",
		"content-length": String(size)
	});
	createReadStream(abs).pipe(res);
}
/**
* Build the skin runtime route set.
*
* The browser runtime in lib/client.js addresses exactly these paths, so they
* keep the skin center's own `/api/skin-center/v2` prefix: the appearance
* panel, the runtime and the persisted selection then agree without a
* translation layer.
* @param deps - { skinRoot, activeStatePath }.
* @returns the route table for ctx.webServer.register.
*/
function makeSkinRuntimeRoutes(deps = {}) {
	const activeStatePath = deps.activeStatePath;
	const loadCatalog = deps.loadCatalog ?? (() => loadSkinCatalog({ skinRoot: deps.skinRoot }));
	const catalogHandler = (_req, res) => {
		const catalog = loadCatalog();
		writeJson(res, 200, {
			ok: true,
			capturedAt: catalog.capturedAt,
			skins: catalog.skins.map((s) => ({ origin: s.origin, warnings: s.warnings, manifest: s.manifest, channel: "local" })),
			diagnostics: catalog.diagnostics
		});
	};
	const skinPrefix = `${SKIN_CENTER_V2_PREFIX}/skins/`;
	const skinsHandler = async (req, res) => {
		const [id, ...tail] = new URL(req.url ?? "/", "http://localhost").pathname.slice(skinPrefix.length).split("/");
		const sub = tail.join("/");
		const entry = id ? findSkin(loadCatalog(), id) : null;
		if (!entry) {
			writeJson(res, 404, { ok: false, error: "skin-not-found" });
			return;
		}
		if (sub === "stylesheet") {
			serveStylesheet(res, entry, entry.manifest.contributes.stylesheet, "skin.css");
			return;
		}
		if (sub === "patches") {
			const patches = entry.manifest.contributes.patches;
			if (!patches) {
				writeJson(res, 404, { ok: false, error: "no-patches" });
				return;
			}
			serveStylesheet(res, entry, patches, "patches.css");
			return;
		}
		if (sub.startsWith("assets/") || sub.startsWith("preview/")) {
			serveAsset(req, res, entry, sub);
			return;
		}
		writeJson(res, 404, { ok: false, error: "unknown-skin-resource" });
	};
	const activeGetHandler = (_req, res) => {
		const state = readActiveState(activeStatePath);
		const catalog = loadCatalog();
		writeJson(res, 200, {
			ok: true,
			active: state.active !== null && !findSkin(catalog, state.active) ? null : state.active,
			background: state.background
		});
	};
	const activePostHandler = async (req, res) => {
		if (!requireSameOrigin(req, res)) return;
		let body;
		try {
			body = await readJsonBody(req, { maxBytes: 16384 });
		} catch {
			writeJson(res, 400, { ok: false, error: "invalid-body" });
			return;
		}
		if (body === null || typeof body !== "object") {
			writeJson(res, 400, { ok: false, error: "invalid-body" });
			return;
		}
		const hasActive = "active" in body;
		const hasBackground = "background" in body;
		if (!hasActive && !hasBackground) {
			writeJson(res, 400, { ok: false, error: "nothing-to-update" });
			return;
		}
		const active = body.active;
		if (hasActive && active !== null && typeof active !== "string") {
			writeJson(res, 400, { ok: false, error: "active-must-be-string-or-null" });
			return;
		}
		if (typeof active === "string" && !findSkin(loadCatalog(), active)) {
			writeJson(res, 404, { ok: false, error: "skin-not-found" });
			return;
		}
		const update = {};
		if (hasActive) update.active = active;
		if (hasBackground) {
			const background = sanitizeSkinBackground(body.background);
			if (background === null) {
				writeJson(res, 400, { ok: false, error: "invalid-background" });
				return;
			}
			update.background = background;
		}
		writeActiveState(activeStatePath, update);
		const state = readActiveState(activeStatePath);
		writeJson(res, 200, { ok: true, active: state.active, background: state.background });
	};
	return [
		{ kind: "exact", path: `${SKIN_CENTER_V2_PREFIX}/catalog`, handler: catalogHandler },
		{ kind: "prefix", path: skinPrefix.replace(/\/$/, ""), handler: skinsHandler },
		{
			kind: "exact",
			path: `${SKIN_CENTER_V2_PREFIX}/active`,
			handler: (req, res) => {
				if (req.method === "GET") return activeGetHandler(req, res);
				if (req.method === "POST") return activePostHandler(req, res);
				writeJson(res, 405, { ok: false, error: "method-not-allowed" });
			}
		}
	];
}
//#endregion

//#region src/config.ts
/**
* Runtime schema for the background section. Persists the master switch
* (`enabled`) beside the background strength fields; every field is volatile
* so the settings page and the appearance panel can both write it.
*/
const SkinBackgroundConfigSchema = z.object({
	enabled: z.boolean().default(SKIN_BACKGROUND_DEFAULTS.enabled).volatile(),
	backgroundOpacity: z.number().min(0).max(100).step(5).default(SKIN_BACKGROUND_DEFAULTS.backgroundOpacity).volatile(),
	backgroundBlurEmpty: z.number().min(0).max(20).step(1).default(SKIN_BACKGROUND_DEFAULTS.backgroundBlurEmpty).volatile(),
	backgroundBlurContent: z.number().min(0).max(20).step(1).default(SKIN_BACKGROUND_DEFAULTS.backgroundBlurContent).volatile(),
	inputCardBlur: z.number().min(0).max(20).step(1).default(SKIN_BACKGROUND_DEFAULTS.inputCardBlur).volatile(),
	bubbleOpacity: z.number().min(0).max(100).step(5).default(SKIN_BACKGROUND_DEFAULTS.bubbleOpacity).volatile(),
	bubbleBlur: z.number().min(0).max(20).step(1).default(SKIN_BACKGROUND_DEFAULTS.bubbleBlur).volatile()
});
/**
* This profile entry's editable configuration: the background section only.
* The family settings binder resolves `skin-background` by namespace, so the
* appearance panel keeps working without the skin center mounted.
*/
const Config = z.object({
	"skin-background": SkinBackgroundConfigSchema
});
//#endregion

export {
	Config,
	SKIN_BACKGROUND_DEFAULTS,
	SKIN_CENTER_V2_PREFIX,
	SkinBackgroundConfigSchema,
	findSkin,
	loadSkinCatalog,
	makeSkinRuntimeRoutes,
	readActiveState,
	resolveInsideSkin,
	transformSkinCss,
	writeActiveState
};
