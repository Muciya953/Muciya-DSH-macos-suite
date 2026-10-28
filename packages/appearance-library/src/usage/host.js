/**
 * Usage glance: the read-only half of the sidebar "today's spend" card.
 *
 * The card used to come from `@linxin666/dsh-usage`, which folds session usage
 * into `$DSH_HOME/dsh-usage/usage-ledger.json` and probes provider balances
 * into `$DSH_HOME/dsh-usage/provider-snapshots.json`. This module reads those
 * two documents and serves one aggregated overview; it never writes them, so
 * the ledger owner can keep folding while the card is mounted here.
 *
 * Route: `GET /api/appearance-library/v1/usage`
 *
 * Nothing in this module reaches the network: a balance is whatever the last
 * probe recorded, and its timestamp is served with it so the card can say how
 * old the number is.
 * @module dsh-plugin-appearance-library/usage/host
 */

import { appendFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Days the trend strip keeps (today included). */
const TREND_DAYS = 7;
/** Model rows kept per provider; the rest fold into the provider total. */
const MODEL_CAP = 5;
/** Token fields that make up the served total (reasoning is inside output). */
const TOKEN_FIELDS = ["inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"];

/** Usage data directory inside the harness home. */
export function usageDir(env = process.env) {
  const home = typeof env.DSH_HOME === "string" && env.DSH_HOME.length > 0 ? env.DSH_HOME : join(homedir(), ".dsh-beta");
  return join(home, "muciya-usage");
}

/**
 * Append one page-side report next to the plugin's other diagnostics.
 *
 * The desktop fences every non-renderer request, so the browser cannot be
 * inspected from a shell here; the card reports its own mount state and that
 * line is the only view of it. Failures never bubble: a missing diagnostic
 * must not take the card down.
 */
export function appendUsageDiag(env, payload) {
  try {
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    const file = join(root, "diag", "usage-card.jsonl");
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...payload }) + "\n");
  } catch (error) {
    void error;
    void env;
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
    const text = readFileSync(path, "utf8");
    const parsed = JSON.parse(text);
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
      rows.push({ model, tokens: tokensOf(copy), cost: copy.cost, calls: copy.calls, totals: copy });
      addInto(providerTotals, copy);
    }
    rows.sort((a, b) => b.tokens - a.tokens);
    providers.push({
      provider,
      tokens: tokensOf(providerTotals),
      cost: providerTotals.cost,
      calls: providerTotals.calls,
      models: rows.slice(0, MODEL_CAP).map(({ model, tokens, cost, calls }) => ({ model, tokens, cost, calls })),
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

/** Balance rows worth showing: configured providers that carry a balance. */
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
  return rows;
}

/**
 * Build the overview document the card renders.
 * @param env - environment holding `DSH_HOME`.
 * @param nowMs - clock injection for tests.
 */
export function buildUsageOverview(env = process.env, nowMs = Date.now()) {
  const dir = usageDir(env);
  const ledgerPath = join(dir, "usage-ledger.json");
  const snapshotsPath = join(dir, "provider-snapshots.json");
  const ledger = readJson(ledgerPath);
  const snapshots = readJson(snapshotsPath);
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
    mtimeOf(ledgerPath),
    mtimeOf(snapshotsPath),
    0,
  );
  return {
    ok: true,
    updatedAt: freshest > 0 ? freshest : nowMs,
    today: { date: todayKey, ...today },
    balances,
    history,
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
 * Mount the usage glance route.
 * @param options - `env` for the harness home, `now` for tests.
 * @returns the webServer route records.
 */
export function makeUsageRoutes(options = {}) {
  const env = options.env ?? process.env;
  const now = options.now ?? (() => Date.now());
  return [
    {
      kind: "exact",
      path: "/api/muciya-appearance/v1/usage",
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
      path: "/api/appearance-library/v1/usage/probe",
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
        appendUsageDiag(env, { event, data });
        writeJson(res, 200, { ok: true });
      },
    },
  ];
}

export { TREND_DAYS };
