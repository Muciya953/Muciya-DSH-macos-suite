/**
 * Usage glance: the read-only Host half of the sidebar "today's spend" card.
 *
 * The numbers are folded by `@linxin666/dsh-usage`, which subscribes to
 * `session/event`, prices DeepSeek's peak/off-peak windows and probes provider
 * balances, then writes two documents into the harness home:
 *
 *   - `$DSH_HOME/dsh-usage/usage-ledger.json`      — day → provider → model totals
 *   - `$DSH_HOME/dsh-usage/provider-snapshots.json` — last balance/plan probe per route
 *
 * This module only READS them. It never writes, never folds an event and never
 * reaches the network, so the ledger keeps exactly one owner: whichever
 * `@linxin666/dsh-usage` row the profile mounts. A profile without that plugin
 * keeps working — the card simply reports that no ledger exists yet.
 *
 * Route: `GET /api/macos-suite/usage/v1/overview` (the card's only source)
 *        `GET /api/macos-suite/usage/v1/probe`    (page-side self-report, off the fence)
 *
 * The prefix is namespaced to the suite (`/api/macos-suite/…`) for the same
 * reason the appearance routes are: a profile may mount the standalone
 * `@linxin666/dsh-usage` at the same time, and two owners of one path would
 * make the second registration fail.
 *
 * @module muciya-dsh-plugin-macos-suite/host/usage-glance
 */

import { appendFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Every route of this half lives under this prefix; the client half mirrors it. */
export const API_PREFIX = "/api/macos-suite/usage/v1";

/** Days the trend strip keeps (today included). */
const TREND_DAYS = 7;

/** Model rows kept per provider; the rest fold into the provider total. */
const MODEL_CAP = 5;

/** Balance rows the card will show at most. */
const BALANCE_CAP = 3;

/** Token fields that make up the served total (reasoning is already inside output). */
const TOKEN_FIELDS = ["inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"];

/**
 * Usage data directory inside the harness home.
 *
 * `DSH_HOME` wins when the Host exports one; otherwise this mirrors the
 * harness' own default (`~/.dsh-beta`), which is where `@linxin666/dsh-usage`
 * resolves its persist directory too.
 * @param env - environment holding `DSH_HOME`.
 * @returns the absolute `…/dsh-usage` directory.
 */
export function usageDir(env = process.env) {
  const home = typeof env.DSH_HOME === "string" && env.DSH_HOME.length > 0 ? env.DSH_HOME : join(homedir(), ".dsh-beta");
  return join(home, "dsh-usage");
}

/** Absolute path of the diagnostics this half writes; `lib/host/` sits two levels down. */
export function diagPath() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "diag", "usage-glance.jsonl");
}

/**
 * Append one line to this half's own diagnostics.
 *
 * The desktop fences every non-renderer request, so the card cannot be inspected
 * from a shell while it runs; the page posts its own mount state here and that
 * line is the only view of a real run. A failing diagnostic must never take the
 * route down, so every error is swallowed.
 * @param payload - the record to append.
 * @param file - target file; the harness points this at a temp dir so running
 *   the offline tests never writes into the package.
 */
export function appendUsageDiag(payload, file = diagPath()) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...payload }) + "\n");
  } catch (error) {
    void error;
  }
}

/** Local `YYYY-MM-DD` key, matching the ledger's own day bucketing. */
export function localDateKey(ms) {
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Read one JSON document; a missing or malformed file resolves to null. */
function readJson(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/** Epoch ms of the file's last write, or 0 when it is absent. */
function mtimeOf(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

/** Finite number or 0. */
function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Empty token bucket. */
function emptyBucket() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, calls: 0, cost: 0 };
}

/** Add one bucket into another, in place. */
function addInto(target, source) {
  for (const key of Object.keys(target)) target[key] += num(source[key]);
  return target;
}

/** Billed total of one bucket (reasoning is already inside output). */
function tokensOf(bucket) {
  let total = 0;
  for (const key of TOKEN_FIELDS) total += num(bucket[key]);
  return total;
}

/** Fold one day's `provider -> model -> totals` map into a served summary. */
function summarizeDay(day) {
  const providers = [];
  const totals = emptyBucket();
  for (const [provider, models] of Object.entries(day ?? {})) {
    if (typeof models !== "object" || models === null) continue;
    const providerTotals = emptyBucket();
    const rows = [];
    for (const [model, bucket] of Object.entries(models)) {
      if (typeof bucket !== "object" || bucket === null) continue;
      const copy = addInto(emptyBucket(), bucket);
      rows.push({ model, tokens: tokensOf(copy), cost: copy.cost, calls: copy.calls });
      addInto(providerTotals, copy);
    }
    rows.sort((a, b) => b.tokens - a.tokens);
    providers.push({
      provider,
      tokens: tokensOf(providerTotals),
      cost: providerTotals.cost,
      calls: providerTotals.calls,
      models: rows.slice(0, MODEL_CAP),
    });
    addInto(totals, providerTotals);
  }
  providers.sort((a, b) => b.cost - a.cost || b.tokens - a.tokens);
  return {
    tokens: tokensOf(totals),
    cost: totals.cost,
    calls: totals.calls,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    cacheReadTokens: totals.cacheReadTokens,
    cacheWriteTokens: totals.cacheWriteTokens,
    providers,
  };
}

/** Balance rows worth showing: routes whose last probe recorded a balance. */
function readBalances(snapshots) {
  const rows = [];
  const providers = snapshots?.providers;
  if (typeof providers !== "object" || providers === null) return rows;
  for (const [provider, entry] of Object.entries(providers)) {
    if (typeof entry !== "object" || entry === null) continue;
    const balance = entry.balance;
    if (typeof balance !== "object" || balance === null) continue;
    const totalBalance = typeof balance.totalBalance === "string" ? balance.totalBalance : String(balance.totalBalance ?? "");
    if (totalBalance.length === 0) continue;
    rows.push({
      provider,
      displayName: typeof entry.displayName === "string" && entry.displayName.length > 0 ? entry.displayName : provider,
      credential: typeof entry.credential === "string" ? entry.credential : "none",
      currency: typeof balance.currency === "string" ? balance.currency : "",
      totalBalance,
      updatedAt: num(balance.updatedAt) || num(entry.updatedAt),
    });
  }
  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  return rows.slice(0, BALANCE_CAP);
}

/**
 * Build the overview document the card renders.
 *
 * `hasLedger` separates "no usage yet today" from "the ledger plugin is not
 * installed at all": the first renders an empty day, the second renders the
 * card's install hint.
 * @param env - environment holding `DSH_HOME`.
 * @param nowMs - clock injection for tests.
 * @returns the overview payload served at `/overview`.
 */
export function buildUsageOverview(env = process.env, nowMs = Date.now()) {
  const dir = usageDir(env);
  const ledgerPath = join(dir, "usage-ledger.json");
  const snapshotsPath = join(dir, "provider-snapshots.json");
  const ledger = readJson(ledgerPath);
  const snapshots = readJson(snapshotsPath);
  const ledgerMtime = mtimeOf(ledgerPath);
  const snapshotsMtime = mtimeOf(snapshotsPath);
  const days = typeof ledger?.days === "object" && ledger.days !== null ? ledger.days : {};

  const todayKey = localDateKey(nowMs);
  const keys = Object.keys(days)
    .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort()
    .slice(-TREND_DAYS);
  const history = keys.map((date) => {
    const summary = summarizeDay(days[date]);
    return { date, tokens: summary.tokens, cost: summary.cost, calls: summary.calls };
  });
  const today = summarizeDay(days[todayKey]);
  const balances = readBalances(snapshots);
  const freshest = Math.max(
    ...balances.map((row) => row.updatedAt).filter((value) => value > 0),
    ledgerMtime,
    snapshotsMtime,
    0,
  );
  return {
    ok: true,
    updatedAt: freshest > 0 ? freshest : nowMs,
    hasLedger: ledgerMtime > 0,
    today: { date: todayKey, ...today },
    balances,
    history,
    trendDays: TREND_DAYS,
  };
}

/** Serve one JSON document. */
function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

/**
 * Build the two routes of this half.
 *
 * `overview` reads the two documents on every request instead of caching: a
 * poll is one `stat` plus at most two small `readFile`s, and a cache would make
 * the card lie for up to one poll interval after the ledger advanced.
 * `probe` never touches the ledger; it only records what the page reports.
 * @param options - `env` for the harness home, `now` and `diag` for tests.
 * @returns the route descriptors to hand to `ctx.webServer.register`.
 */
export function makeUsageRoutes(options = {}) {
  const env = options.env ?? process.env;
  const now = options.now ?? (() => Date.now());
  const diag = options.diag;
  return [
    {
      kind: "exact",
      path: API_PREFIX + "/overview",
      handler(req, res) {
        if (req.method !== "GET" && req.method !== "HEAD") {
          writeJson(res, 405, { ok: false, error: "method-not-allowed" });
          return;
        }
        let overview;
        try {
          overview = buildUsageOverview(env, now());
        } catch (error) {
          writeJson(res, 500, { ok: false, error: String(error) });
          return;
        }
        writeJson(res, 200, overview);
      },
    },
    {
      kind: "exact",
      path: API_PREFIX + "/probe",
      handler(req, res) {
        if (req.method !== "GET" && req.method !== "HEAD") {
          writeJson(res, 405, { ok: false, error: "method-not-allowed" });
          return;
        }
        let params;
        try {
          params = new URL(req.url ?? "/", "http://x").searchParams;
        } catch {
          writeJson(res, 400, { ok: false, error: "bad-url" });
          return;
        }
        const event = (params.get("event") ?? "?").slice(0, 40);
        let data;
        try {
          data = JSON.parse(params.get("data") ?? "{}");
        } catch {
          data = { raw: (params.get("data") ?? "").slice(0, 200) };
        }
        appendUsageDiag({ event, data }, diag);
        writeJson(res, 200, { ok: true });
      },
    },
  ];
}

/**
 * Mount the usage glance routes.
 *
 * The service is asked for through `ctx.inject` rather than read off the plugin
 * context: cordis refuses an undeclared read with `cannot get property "…"
 * without inject`, and that refusal used to surface as a warning with no routes
 * behind it. Injecting also delays the callback until `webServer` exists.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  try {
    ctx.inject(["webServer"], (webCtx) => {
      const routes = makeUsageRoutes();
      webCtx.effect(() => {
        const disposers = routes.map((route) => webCtx.webServer.register(route));
        return () => {
          for (const dispose of disposers) dispose();
        };
      }, "usage-glance: API routes");
      webCtx.logger.info(`[usage-glance] ${routes.length} API routes mounted under ${API_PREFIX}`);
    });
  } catch (error) {
    ctx.logger.warn("[usage-glance] route registration failed: %s", String(error));
  }
}

/** Exposed for this package's own offline tests; the Loader ignores unknown exports. */
export const __internals = {
  API_PREFIX,
  TREND_DAYS,
  MODEL_CAP,
  BALANCE_CAP,
  TOKEN_FIELDS,
  usageDir,
  diagPath,
  localDateKey,
  buildUsageOverview,
  makeUsageRoutes,
};
