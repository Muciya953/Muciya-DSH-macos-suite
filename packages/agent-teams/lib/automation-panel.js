/**
 * Automation Tasks panel, host half.
 *
 * One sidebar page that answers a single question: what is this Mac running on
 * a schedule, and is it running right now? Three inventories are folded into
 * one snapshot:
 *
 *  1. launchd. Every agent in ~/Library/LaunchAgents is listed (they are the
 *     user's own jobs, and the only ones this panel may start, stop or kick),
 *     plus the system agents and daemons that are *currently loaded*: a plist
 *     sitting on disk in /Library that launchd never bootstrapped is not
 *     running, and listing it would be noise.
 *  2. crontab. macOS still honours it, it is outside launchd, and no API can
 *     safely edit it, so those entries are shown read-only.
 *  3. DSH's own clocks: the task board's cron scheduler and its armed cards,
 *     and the session archive's next check.
 *
 * Failure policy: route mounting problems are logged, never thrown. The web
 * shell fails its whole boot when a plugin apply() throws, and a task list must
 * not be able to take the GUI down with it.
 *
 * @module dsh-plugin-schedule-console
 */

import { execFile } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** This package's manifest name: the loader id and the client module identity. */
const PACKAGE_NAME = "muciya-dsh-plugin-agent-teams";

/** Every HTTP path this plugin owns lives under one prefix. */
const API_PREFIX = "/api/muciya-agent-teams/automation/v1";

/** How long the boot-graph self-check waits before reporting absence. */
const GRAPH_DEADLINE_MS = 5_000;

/** Absolute tool paths, so a thin Electron PATH cannot pick a different binary. */
const LAUNCHCTL = "/bin/launchctl";
const PLUTIL = "/usr/bin/plutil";
const CRONTAB = "/usr/bin/crontab";

/** The three launchd inventories this panel reads. */
const USER_AGENT_DIR = join(homedir(), "Library", "LaunchAgents");
const SYSTEM_AGENT_DIR = "/Library/LaunchAgents";
const SYSTEM_DAEMON_DIR = "/Library/LaunchDaemons";

/** DSH's home, resolved the same way the Host resolves it. */
const DSH_HOME =
  typeof process.env.DSH_HOME === "string" && process.env.DSH_HOME !== "" ? process.env.DSH_HOME : join(homedir(), ".dsh-beta");

/** How many bytes of a task's log file the tail view reads. */
const LOG_TAIL_BYTES = 128 * 1024;

/** How many lines the tail view returns at most. */
const LOG_MAX_LINES = 400;

/** Per-subprocess budget; launchctl list is the slow one. */
const PROBE_TIMEOUT_MS = 8_000;

/** The scopes this plugin knows, and which of them accept writes. */
const USER_SCOPE = "user";
const SYSTEM_AGENT_SCOPE = "system-agent";
const SYSTEM_DAEMON_SCOPE = "system-daemon";
const CRON_SCOPE = "cron";
const DSH_SCOPE = "dsh";

/** cron's own field names, in order. */
const CRON_FIELDS = ["分钟", "小时", "日", "月", "星期"];

/** Weekday names, indexed the way both launchd and cron index them (0 = Sunday). */
const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

/** The hand-written "what does this job do" table this package ships. */
const ABOUT_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "about.json");

/** What a row says when the table carries no line for it. */
const ABOUT_FALLBACKS = {
  apple: "macOS 系统自带任务，随系统维护",
  dshCard: "DSH 任务板里的定时卡片（到点自动跑）",
  fallback: "本机自装的后台任务",
};

/* ── process helpers ─────────────────────────────────────────────────────── */

/** Run one external tool and return its stdout, with a hard timeout. */
async function defaultRun(file, args) {
  const result = await execFileAsync(file, args, { timeout: PROBE_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 });
  return { stdout: String(result.stdout ?? "") };
}

/** An error the panel can render: a stable code plus a readable detail. */
function codeError(code, detail) {
  const error = new Error(detail);
  error.code = code;
  error.detail = detail;
  return error;
}

/** The last readable line of a failed subprocess call. */
function describeFailure(error) {
  const stderr = String(error?.stderr ?? "").trim();
  const text = stderr !== "" ? stderr : String(error?.message ?? error).trim();
  return text.split("\n").filter((line) => line.trim() !== "").slice(-3).join(" ");
}

/** Write one JSON response. */
function writeJson(res, status, body, extraHeaders) {
  const payload = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(payload.byteLength),
    "cache-control": "no-store",
    ...(extraHeaders ?? {}),
  });
  res.end(payload);
}

/**
 * Same-origin fence for writes: this API can boot a job out of launchd, so a
 * cross-site page must not be able to drive it. A request with no origin
 * signal at all (curl, an offline test) is allowed: it is not a browser.
 */
function requireSameOrigin(req) {
  const site = req.headers["sec-fetch-site"];
  if (typeof site === "string" && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.origin;
  if (typeof origin !== "string" || origin === "") return true;
  const host = req.headers.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Read a JSON body with a hard cap. */
function readJsonBody(req, maxBytes = 16_384) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(codeError("body-too-large", "请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(codeError("bad-json", "请求体不是合法 JSON"));
      }
    });
    req.on("error", reject);
  });
}

/* ── plist reading ───────────────────────────────────────────────────────── */

/** Read one plist as JSON through plutil, so binary and XML plists read alike. */
async function readPlist(path, run) {
  const result = await run(PLUTIL, ["-convert", "json", "-o", "-", path]);
  return JSON.parse(String(result.stdout));
}

/** Parse launchctl list into label -> { pid, lastExitStatus }. */
async function readLaunchdRegistry(run) {
  const result = await run(LAUNCHCTL, ["list"]);
  const rows = new Map();
  const lines = String(result.stdout).split("\n");
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const label = parts.slice(2).join("\t").trim();
    if (label === "") continue;
    const pidText = parts[0].trim();
    const status = Number(parts[1]);
    rows.set(label, {
      pid: pidText === "-" ? null : Number(pidText),
      lastExitStatus: Number.isFinite(status) ? status : null,
    });
  }
  return rows;
}

/**
 * Probe the system domain one label at a time.
 *
 * launchctl list only reports the caller's own domain, so a LaunchDaemon is
 * invisible to it even while it runs; launchctl print system/<label> is
 * readable without root and answers with the state the panel wants. A daemon
 * the probe cannot find is simply not loaded, which keeps this list to the
 * jobs that are actually alive.
 */
async function readDaemonRegistry(dir, run) {
  const registry = new Map();
  let files;
  try {
    files = readdirSync(dir)
      .filter((name) => name.endsWith(".plist"))
      .sort();
  } catch {
    return registry;
  }
  for (const file of files) {
    const path = join(dir, file);
    let label = file.replace(/\.plist$/, "");
    try {
      const plist = await readPlist(path, run);
      if (typeof plist?.Label === "string" && plist.Label !== "") label = plist.Label;
    } catch {
      /* keep the file name as the label */
    }
    let text;
    try {
      const result = await run(LAUNCHCTL, ["print", "system/" + label]);
      text = String(result.stdout);
    } catch {
      continue;
    }
    const pidText = /^\s*pid = (\d+)$/m.exec(text)?.[1] ?? null;
    const exitText = /^\s*last exit code = (-?\d+)$/m.exec(text)?.[1] ?? null;
    registry.set(label, {
      pid: pidText === null ? null : Number(pidText),
      lastExitStatus: exitText === null ? null : Number(exitText),
      stateText: /^\s*state = (.+)$/m.exec(text)?.[1]?.trim() ?? null,
    });
  }
  return registry;
}

/** Normalize StartCalendarInterval (one dict or an array of dicts) into a list. */
function normalizeCalendar(value) {
  if (Array.isArray(value)) return value.filter((entry) => entry !== null && typeof entry === "object");
  if (value !== null && typeof value === "object") return [value];
  return [];
}

/** Two-digit clock text for one calendar entry. */
function clockText(entry) {
  const hour = Number.isInteger(entry.Hour) ? entry.Hour : 0;
  const minute = Number.isInteger(entry.Minute) ? entry.Minute : 0;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

/** One calendar entry as Chinese text: 每天 08:00 / 周一 09:30 / 每月 1 日 00:00. */
function describeCalendarEntry(entry) {
  const clock = clockText(entry);
  const weekday = Number.isInteger(entry.Weekday) ? entry.Weekday : null;
  const day = Number.isInteger(entry.Day) ? entry.Day : null;
  const month = Number.isInteger(entry.Month) ? entry.Month : null;
  if (weekday !== null) return "周" + (WEEKDAY_NAMES[weekday] ?? weekday) + " " + clock;
  if (month !== null && day !== null) return month + " 月 " + day + " 日 " + clock;
  if (day !== null) return "每月 " + day + " 日 " + clock;
  if (month !== null) return "每年 " + month + " 月 " + clock;
  return "每天 " + clock;
}

/** A duration in seconds as Chinese text: 10 分钟 / 1 小时 / 45 秒. */
function describeInterval(seconds) {
  if (seconds >= 3600 && seconds % 3600 === 0) return seconds / 3600 + " 小时";
  if (seconds >= 60 && seconds % 60 === 0) return seconds / 60 + " 分钟";
  return seconds + " 秒";
}

/** One task's schedule as Chinese text. */
function describeTiming(plist) {
  if (plist === null || typeof plist !== "object") return "plist 无法读取";
  const parts = [];
  const calendar = normalizeCalendar(plist.StartCalendarInterval);
  if (calendar.length > 0) {
    const labels = calendar.map(describeCalendarEntry);
    parts.push(calendar.length > 3 ? labels.length + " 个时点" : labels.join("、"));
  }
  if (Number.isInteger(plist.StartInterval)) parts.push("每 " + describeInterval(plist.StartInterval));
  if (plist.RunAtLoad === true) parts.push("加载时运行");
  if (plist.KeepAlive === true) parts.push("常驻（退出即重启）");
  if (parts.length === 0) parts.push("未排期（仅手动触发）");
  return parts.join(" · ");
}

/** When one calendar entry fires next, or null when it never does. */
function nextFireForEntry(entry, now) {
  const hour = Number.isInteger(entry.Hour) ? entry.Hour : 0;
  const minute = Number.isInteger(entry.Minute) ? entry.Minute : 0;
  const anchor = new Date(now);
  for (let offset = 0; offset <= 366; offset += 1) {
    const candidate = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset, hour, minute, 0, 0);
    if (candidate.getTime() <= now) continue;
    if (Number.isInteger(entry.Month) && candidate.getMonth() + 1 !== entry.Month) continue;
    if (Number.isInteger(entry.Day) && candidate.getDate() !== entry.Day) continue;
    if (Number.isInteger(entry.Weekday) && candidate.getDay() !== entry.Weekday) continue;
    return candidate.getTime();
  }
  return null;
}

/** The soonest StartCalendarInterval firing, in epoch milliseconds. */
function nextFireAt(plist, now) {
  const calendar = normalizeCalendar(plist?.StartCalendarInterval ?? null);
  let best = null;
  for (const entry of calendar) {
    const at = nextFireForEntry(entry, now);
    if (at !== null && (best === null || at < best)) best = at;
  }
  return best;
}

/** What a plist actually executes, summarized for one row. */
function programSummary(plist) {
  if (plist === null || typeof plist !== "object") return null;
  const argv = Array.isArray(plist.ProgramArguments) ? plist.ProgramArguments.filter((item) => typeof item === "string") : [];
  const explicit = typeof plist.Program === "string" && plist.Program !== "" ? plist.Program : null;
  const program = explicit ?? argv[0] ?? null;
  if (program === null) return null;
  const args = explicit === null ? argv.slice(1) : [];
  return {
    program,
    name: basename(program),
    script: args.length > 0 ? args[0] : null,
    args,
  };
}

/* ── inventories ─────────────────────────────────────────────────────────── */

/** Read one launchd directory into rows; system scopes keep only loaded jobs. */
async function scanLaunchdDir(dir, scope, registry, run, options = {}) {
  const onlyLoaded = options.onlyLoaded === true;
  let files;
  try {
    files = readdirSync(dir)
      .filter((name) => name.endsWith(".plist"))
      .sort();
  } catch {
    return [];
  }
  const rows = [];
  for (const file of files) {
    const path = join(dir, file);
    const fallback = file.replace(/\.plist$/, "");
    let plist = null;
    let error = null;
    try {
      plist = await readPlist(path, run);
    } catch (cause) {
      error = describeFailure(cause);
    }
    const label = typeof plist?.Label === "string" && plist.Label !== "" ? plist.Label : fallback;
    const state = registry.get(label);
    const loaded = state !== undefined;
    if (onlyLoaded && !loaded) continue;
    rows.push({
      id: scope + ":" + label,
      kind: "launchd",
      scope,
      label,
      plistPath: path,
      loaded,
      pid: state?.pid ?? null,
      lastExitStatus: state?.lastExitStatus ?? null,
      stateText: state?.stateText ?? null,
      timing: describeTiming(plist),
      nextFireAt: nextFireAt(plist, Date.now()),
      runAtLoad: plist?.RunAtLoad === true,
      keepAlive: plist?.KeepAlive === true,
      disabled: plist?.Disabled === true,
      program: programSummary(plist),
      stdoutPath: typeof plist?.StandardOutPath === "string" && plist.StandardOutPath !== "" ? plist.StandardOutPath : null,
      stderrPath: typeof plist?.StandardErrorPath === "string" && plist.StandardErrorPath !== "" ? plist.StandardErrorPath : null,
      writable: scope === USER_SCOPE,
      apple: label.startsWith("com.apple."),
      error,
    });
  }
  return rows;
}

/** Parse one cron field into the set of values it selects. */
function parseCronField(field, min, max) {
  const values = new Set();
  for (const part of String(field).split(",")) {
    const step = /^(\*|\d+|\d+-\d+)\/(\d+)$/.exec(part);
    if (step !== null) {
      const size = Number(step[2]);
      if (!Number.isFinite(size) || size <= 0) continue;
      const bounds = /^(\d+)-(\d+)$/.exec(step[1]);
      const from = bounds === null ? min : Math.max(min, Number(bounds[1]));
      const to = bounds === null ? max : Math.min(max, Number(bounds[2]));
      for (let value = from; value <= to; value += size) values.add(value);
      continue;
    }
    if (part === "*") {
      for (let value = min; value <= max; value += 1) values.add(value);
      continue;
    }
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range !== null) {
      for (let value = Number(range[1]); value <= Number(range[2]); value += 1) {
        if (value >= min && value <= max) values.add(value);
      }
      continue;
    }
    const single = Number(part);
    if (Number.isInteger(single) && single >= min && single <= max) values.add(single === 7 && max === 6 ? 0 : single);
  }
  return values;
}

/**
 * The next firing of one crontab line, in epoch milliseconds.
 *
 * Vixie semantics are kept for the day-of-month / day-of-week pair: when both
 * are restricted the match is an OR, otherwise the restricted one wins. A line
 * that never fires inside a year returns null rather than looping forever.
 */
function nextCronFireAt(fields, now) {
  const minutes = parseCronField(fields[0], 0, 59);
  const hours = parseCronField(fields[1], 0, 23);
  const days = parseCronField(fields[2], 1, 31);
  const months = parseCronField(fields[3], 1, 12);
  const weekdays = parseCronField(fields[4], 0, 6);
  if (minutes.size === 0 || hours.size === 0) return null;
  const dayRestricted = String(fields[2]).trim() !== "*";
  const weekdayRestricted = String(fields[4]).trim() !== "*";
  const anchor = new Date(now);
  const sortedHours = [...hours].sort((a, b) => a - b);
  const sortedMinutes = [...minutes].sort((a, b) => a - b);
  for (let offset = 0; offset <= 366; offset += 1) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset);
    if (months.size > 0 && !months.has(date.getMonth() + 1)) continue;
    const dayMatch = !dayRestricted || days.has(date.getDate());
    const weekdayMatch = !weekdayRestricted || weekdays.has(date.getDay());
    const allowed = dayRestricted && weekdayRestricted ? dayMatch || weekdayMatch : dayMatch && weekdayMatch;
    if (!allowed) continue;
    for (const hour of sortedHours) {
      for (const minute of sortedMinutes) {
        const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0).getTime();
        if (at > now) return at;
      }
    }
  }
  return null;
}

/** The user's crontab as rows; an absent crontab is an empty list, not an error. */
async function readCronRows(run) {
  let stdout = "";
  try {
    const result = await run(CRONTAB, ["-l"]);
    stdout = String(result.stdout);
  } catch {
    return [];
  }
  const rows = [];
  const lines = stdout.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "" || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 6) continue;
    const fields = parts.slice(0, 5);
    if (!/^[\d*,/\-]+$/.test(fields.join(""))) continue;
    const command = parts.slice(5).join(" ");
    rows.push({
      id: "cron:" + index,
      kind: "cron",
      scope: CRON_SCOPE,
      label: command.length > 76 ? command.slice(0, 76) + "…" : command,
      command,
      plistPath: null,
      loaded: true,
      pid: null,
      lastExitStatus: null,
      stateText: null,
      timing: fields.map((field, position) => CRON_FIELDS[position] + " " + field).join(" · "),
      nextFireAt: nextCronFireAt(fields, Date.now()),
      program: null,
      stdoutPath: null,
      stderrPath: null,
      writable: false,
      apple: false,
      error: null,
    });
  }
  return rows;
}

/** Read one JSON file, ignoring every failure: these are hints, not contracts. */
function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * The one-line description table. A missing or malformed file is not an error:
 * the panel still lists every job, and unlisted ones fall back to a generic line.
 */
function readAbout(path) {
  const source = typeof path === "string" && path !== "" ? path : ABOUT_PATH;
  const parsed = readJsonFile(source);
  const table = parsed !== null && typeof parsed === "object" ? parsed : {};
  const items = table.items !== null && typeof table.items === "object" ? table.items : {};
  const line = (value, fallback) => (typeof value === "string" && value.trim() !== "" ? value.trim() : fallback);
  return {
    items,
    apple: line(table.apple, ABOUT_FALLBACKS.apple),
    dshCard: line(table.dshCard, ABOUT_FALLBACKS.dshCard),
    fallback: line(table.fallback, ABOUT_FALLBACKS.fallback),
  };
}

/** The line that belongs on one row: an exact label match first, then its kind. */
function aboutOf(row, about) {
  const hit = about.items[row.label];
  if (typeof hit === "string" && hit.trim() !== "") return hit.trim();
  if (row.apple === true) return about.apple;
  if (typeof row.id === "string" && row.id.startsWith("dsh:task:")) return about.dshCard;
  return about.fallback;
}

/** Epoch milliseconds from a number or an ISO string, or null. */
function epochOf(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** The DSH-internal clocks this Host owns, as rows. */
function readDshRows(deps = {}) {
  const home = typeof deps.dshHome === "string" && deps.dshHome !== "" ? deps.dshHome : DSH_HOME;
  const rows = [];
  const ledger = readJsonFile(join(home, "task-board", "ledger-v2.json"));
  const scheduler = ledger?.scheduler ?? null;
  if (scheduler !== null && typeof scheduler === "object") {
    const lastTickAt = epochOf(scheduler.lastTickAt);
    rows.push({
      id: "dsh:task-board",
      kind: "dsh",
      scope: DSH_SCOPE,
      label: "任务板调度器",
      detail: "cron 到点即运行对应卡片",
      timing: "持续运行（每分钟检查一次）" + (typeof scheduler.timeZone === "string" ? " · " + scheduler.timeZone : ""),
      lastFiredAt: lastTickAt,
      nextFireAt: lastTickAt === null ? null : lastTickAt + 60_000,
      loaded: true,
      pid: null,
      lastExitStatus: null,
      program: { program: "dsh task-board scheduler", name: "dsh scheduler", script: null, args: [] },
      stdoutPath: null,
      stderrPath: null,
      writable: false,
      apple: false,
      error: null,
    });
    const tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
    for (const task of tasks) {
      const schedule = task?.schedule ?? null;
      if (schedule === null || typeof schedule !== "object" || schedule.enabled !== true) continue;
      rows.push({
        id: "dsh:task:" + String(task?.id ?? rows.length),
        kind: "dsh",
        scope: DSH_SCOPE,
        label: typeof task?.title === "string" && task.title !== "" ? task.title : "未命名卡片",
        detail: "任务板卡片",
        timing:
          "cron " + String(schedule.cron ?? "?") + (typeof schedule.timeZone === "string" && schedule.timeZone !== "" ? " · " + schedule.timeZone : ""),
        nextFireAt: null,
        loaded: true,
        pid: null,
        lastExitStatus: null,
        program: null,
        stdoutPath: null,
        stderrPath: null,
        writable: false,
        apple: false,
        error: null,
      });
    }
  } else {
    rows.push({
      id: "dsh:task-board:absent",
      kind: "dsh",
      scope: DSH_SCOPE,
      label: "任务板调度器",
      detail: "尚未初始化（打开过任务板后出现）",
      timing: "—",
      loaded: false,
      pid: null,
      lastExitStatus: null,
      program: null,
      stdoutPath: null,
      stderrPath: null,
      writable: false,
      apple: false,
      error: null,
    });
  }
  const archive = readJsonFile(join(home, "dsh-session-archive", "state.json"));
  const nextCheckAt = epochOf(archive?.nextCheckAt);
  rows.push({
    id: "dsh:session-archive",
    kind: "dsh",
    scope: DSH_SCOPE,
    label: "会话归档检查",
    detail: "DSH 自身的周期维护",
    timing: "周期性检查",
    nextFireAt: nextCheckAt,
    loaded: nextCheckAt !== null,
    pid: null,
    lastExitStatus: null,
    program: null,
    stdoutPath: null,
    stderrPath: null,
    writable: false,
    apple: false,
    error: null,
  });
  return rows;
}

/** One snapshot of every automation this Mac is running. */
async function buildSnapshot(deps = {}) {
  const run = deps.runCommand ?? defaultRun;
  const userDir = deps.userAgentDir ?? USER_AGENT_DIR;
  const systemAgentDir = deps.systemAgentDir ?? SYSTEM_AGENT_DIR;
  const systemDaemonDir = deps.systemDaemonDir ?? SYSTEM_DAEMON_DIR;
  const registry = await readLaunchdRegistry(run).catch(() => new Map());
  const daemonRegistry = await readDaemonRegistry(systemDaemonDir, run).catch(() => new Map());
  const userRows = await scanLaunchdDir(userDir, USER_SCOPE, registry, run);
  const systemAgentRows = await scanLaunchdDir(systemAgentDir, SYSTEM_AGENT_SCOPE, registry, run, { onlyLoaded: true });
  const daemonRows = await scanLaunchdDir(systemDaemonDir, SYSTEM_DAEMON_SCOPE, daemonRegistry, run, { onlyLoaded: true });
  const cronRows = await readCronRows(run);
  const dshRows = readDshRows(deps);
  const groups = [
    {
      id: USER_SCOPE,
      title: "用户级 launchd",
      hint: "~/Library/LaunchAgents · 可启用、停用、立即运行",
      rows: userRows,
    },
    {
      id: SYSTEM_AGENT_SCOPE,
      title: "系统级 Agents（已加载）",
      hint: "/Library/LaunchAgents · 只读",
      rows: systemAgentRows,
    },
    {
      id: SYSTEM_DAEMON_SCOPE,
      title: "系统级 Daemons（已加载）",
      hint: "/Library/LaunchDaemons · 只读",
      rows: daemonRows,
    },
    {
      id: CRON_SCOPE,
      title: "计划任务（crontab）",
      hint: "macOS 保留的 cron · 只读",
      rows: cronRows,
    },
    {
      id: DSH_SCOPE,
      title: "DSH 后台维护",
      hint: "任务板调度器与会话归档检查 · 不是用户建的定时任务",
      rows: dshRows,
    },
  ];
  const all = groups.reduce((list, group) => list.concat(group.rows), []);
  const about = readAbout(deps.aboutPath);
  for (const row of all) row.about = aboutOf(row, about);
  return {
    generatedAt: Date.now(),
    platform: process.platform,
    summary: {
      total: all.length,
      running: all.filter((row) => row.pid !== null && row.pid !== undefined).length,
      loaded: all.filter((row) => row.loaded === true).length,
      userCount: userRows.length,
      systemCount: systemAgentRows.length + daemonRows.length,
      cronCount: cronRows.length,
      dshCount: dshRows.length,
    },
    groups,
  };
}

/* ── mutations ───────────────────────────────────────────────────────────── */

/** The launchd domain a scope belongs to. */
function launchdDomain(scope) {
  if (scope === SYSTEM_DAEMON_SCOPE) return "system";
  return "gui/" + process.getuid();
}

/** Find the freshly scanned row for one label, so no client path is ever trusted. */
async function findRow(label, scope, run, deps = {}) {
  if (typeof label !== "string" || label === "" || label.includes("/")) return null;
  const registry = await readLaunchdRegistry(run).catch(() => new Map());
  const dir =
    scope === USER_SCOPE
      ? (deps.userAgentDir ?? USER_AGENT_DIR)
      : scope === SYSTEM_AGENT_SCOPE
        ? (deps.systemAgentDir ?? SYSTEM_AGENT_DIR)
        : (deps.systemDaemonDir ?? SYSTEM_DAEMON_DIR);
  const rows = await scanLaunchdDir(dir, scope, registry, run, { onlyLoaded: scope !== USER_SCOPE });
  return rows.find((row) => row.label === label) ?? null;
}

/** Start or stop one user-level launchd job. */
async function toggleTask(body, run, deps = {}) {
  const label = typeof body?.label === "string" ? body.label : "";
  const scope = typeof body?.scope === "string" ? body.scope : "";
  const action = body?.action === "disable" ? "disable" : "enable";
  if (scope !== USER_SCOPE) throw codeError("readonly-scope", "只有用户级 launchd 任务可以在面板里改状态");
  const row = await findRow(label, scope, run, deps);
  if (row === null) throw codeError("not-found", "找不到任务：" + label);
  const domain = launchdDomain(scope);
  if (action === "enable") {
    if (row.loaded === true) return { changed: false, state: "already-enabled", detail: "任务已处于加载状态" };
    try {
      await run(LAUNCHCTL, ["bootstrap", domain, row.plistPath]);
    } catch (error) {
      try {
        await run(LAUNCHCTL, ["load", "-w", row.plistPath]);
      } catch {
        throw codeError("enable-failed", describeFailure(error));
      }
    }
    return { changed: true, state: "enabled" };
  }
  if (row.loaded !== true) return { changed: false, state: "already-disabled", detail: "任务当前未加载" };
  try {
    await run(LAUNCHCTL, ["bootout", domain + "/" + row.label]);
  } catch (error) {
    try {
      await run(LAUNCHCTL, ["unload", "-w", row.plistPath]);
    } catch {
      throw codeError("disable-failed", describeFailure(error));
    }
  }
  return { changed: true, state: "disabled" };
}

/** Run one user-level launchd job immediately. */
async function kickTask(body, run, deps = {}) {
  const label = typeof body?.label === "string" ? body.label : "";
  const scope = typeof body?.scope === "string" ? body.scope : "";
  if (scope !== USER_SCOPE) throw codeError("readonly-scope", "只有用户级 launchd 任务可以立即运行");
  const row = await findRow(label, scope, run, deps);
  if (row === null) throw codeError("not-found", "找不到任务：" + label);
  if (row.loaded !== true) throw codeError("not-loaded", "任务未加载：先启用它再立即运行");
  try {
    await run(LAUNCHCTL, ["kickstart", "-k", launchdDomain(scope) + "/" + row.label]);
  } catch (error) {
    throw codeError("run-failed", describeFailure(error));
  }
  return { state: "kicked", detail: "已请求立即运行" };
}

/** The tail of one task's log, read from the path its plist declares. */
function readLogTail(path, wanted) {
  const size = statSync(path).size;
  const start = Math.max(0, size - LOG_TAIL_BYTES);
  const length = size - start;
  const buffer = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buffer, 0, length, start);
  } finally {
    closeSync(fd);
  }
  const all = buffer.toString("utf8").split("\n");
  // A log file normally ends with a newline; that trailing empty piece is not a line.
  if (all.length > 0 && all[all.length - 1] === "") all.pop();
  const count = Number.isInteger(wanted) && wanted > 0 ? Math.min(wanted, LOG_MAX_LINES) : LOG_MAX_LINES;
  const lines = all.slice(Math.max(0, all.length - count));
  return { lines, truncated: start > 0 || all.length > count, size };
}

/* ── routes ──────────────────────────────────────────────────────────────── */

/**
 * Build this plugin's route table.
 * @param deps - injectable seams for the offline tests.
 * @returns the route descriptors to hand to ctx.webServer.register.
 */
export function makeAutomationRoutes(deps = {}) {
  const run = deps.runCommand ?? defaultRun;
  const log = typeof deps.log === "function" ? deps.log : () => {};
  const dirDeps = {};
  for (const key of ["userAgentDir", "systemAgentDir", "systemDaemonDir"]) {
    if (typeof deps[key] === "string" && deps[key] !== "") dirDeps[key] = deps[key];
  }
  const snapshotDeps = { runCommand: run, dshHome: deps.dshHome ?? DSH_HOME, ...dirDeps };

  /** Answer one failure with its stable code instead of a generic 500. */
  const fail = (res, error) => {
    const code = typeof error?.code === "string" && error.code !== "" ? error.code : "internal-error";
    const detail = String(error?.detail ?? error?.message ?? error);
    log("[schedule-console] " + code + ": " + detail);
    writeJson(res, code === "internal-error" ? 500 : 400, { ok: false, error: code, detail });
  };

  async function listHandler(req, res) {
    try {
      writeJson(res, 200, { ok: true, ...(await buildSnapshot(snapshotDeps)) });
    } catch (error) {
      fail(res, error);
    }
  }

  async function toggleHandler(req, res) {
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin", detail: "跨站请求被拒绝" });
      return;
    }
    try {
      const body = await readJsonBody(req);
      const result = await toggleTask(body, run, dirDeps);
      writeJson(res, 200, { ok: true, ...result });
    } catch (error) {
      fail(res, error);
    }
  }

  async function runHandler(req, res) {
    if (!requireSameOrigin(req)) {
      writeJson(res, 403, { ok: false, error: "cross-origin", detail: "跨站请求被拒绝" });
      return;
    }
    try {
      const body = await readJsonBody(req);
      const result = await kickTask(body, run, dirDeps);
      writeJson(res, 200, { ok: true, ...result });
    } catch (error) {
      fail(res, error);
    }
  }

  async function logHandler(req, res) {
    try {
      const params = new URL(req?.url ?? "/", "http://localhost").searchParams;
      const label = params.get("label") ?? "";
      const scope = params.get("scope") ?? USER_SCOPE;
      const stream = params.get("stream") === "stderr" ? "stderr" : "stdout";
      const wanted = Number(params.get("lines"));
      const row = await findRow(label, scope, run, dirDeps);
      if (row === null) throw codeError("not-found", "找不到任务：" + label);
      const path = stream === "stderr" ? row.stderrPath : row.stdoutPath;
      if (path === null) {
        throw codeError("no-log-path", "该任务没有配置 " + (stream === "stderr" ? "StandardErrorPath" : "StandardOutPath"));
      }
      if (!existsSync(path)) throw codeError("log-missing", "日志文件还不存在：" + path);
      const tail = readLogTail(path, Number.isFinite(wanted) ? wanted : null);
      writeJson(res, 200, { ok: true, path, stream, ...tail });
    } catch (error) {
      fail(res, error);
    }
  }

  return [
    { kind: "exact", path: API_PREFIX + "/list", handler: listHandler },
    { kind: "exact", path: API_PREFIX + "/toggle", handler: toggleHandler },
    { kind: "exact", path: API_PREFIX + "/run", handler: runHandler },
    { kind: "exact", path: API_PREFIX + "/log", handler: logHandler },
  ];
}

/* ── plugin ──────────────────────────────────────────────────────────────── */

/**
 * Mount the routes and report whether the sidebar panel reached the web boot
 * graph.
 *
 * Both halves ask for their service through ctx.inject, never by reading it off
 * the plugin context: cordis refuses an undeclared service read, and because
 * this plugin must never take the GUI down with it, that refusal would surface
 * as a silently missing panel. Injecting is what makes the read legal and
 * delays the callback until the service exists.
 *
 * @param ctx - Host plugin context.
 */
export function applyAutomationPanel(ctx) {
  try {
    ctx.inject(["webServer"], (webCtx) => {
      const routes = makeAutomationRoutes({ log: (line) => webCtx.logger.warn(line) });
      webCtx.effect(() => {
        const disposers = routes.map((route) => webCtx.webServer.register(route));
        return () => {
          for (const dispose of disposers) dispose();
        };
      }, "schedule-console: API routes");
      webCtx.logger.info("[schedule-console] " + routes.length + " API routes mounted under " + API_PREFIX);
    });
  } catch (error) {
    ctx.logger.warn("[schedule-console] route registration failed: %s", String(error));
  }

  try {
    ctx.inject(["clientModules"], (clientCtx) => {
      const registry = clientCtx.clientModules;
      if (registry === undefined || typeof registry.graph !== "function") return;
      let settled = false;
      let unsubscribe;
      let deadline;
      const finish = (report) => {
        if (settled) return;
        settled = true;
        if (unsubscribe !== undefined) unsubscribe();
        clearTimeout(deadline);
        report();
      };
      const check = () => {
        if (settled) return;
        let entries;
        try {
          entries = registry.graph()?.entries ?? [];
        } catch (error) {
          finish(() => ctx.logger.warn("[schedule-console] could not read the web boot graph: %s", String(error)));
          return;
        }
        if (!entries.some((entry) => entry?.id === PACKAGE_NAME)) return;
        finish(() => ctx.logger.info("[schedule-console] sidebar panel is composed into the web boot graph"));
      };
      unsubscribe = typeof registry.onGraphChanged === "function" ? registry.onGraphChanged(check) : undefined;
      deadline = setTimeout(() => {
        finish(() => {
          ctx.logger.warn(
            "[schedule-console] the sidebar panel never reached the web boot graph; the row stays hidden until the Host composes it (check this package's dsh.client declaration and exports[\"./client\"])",
          );
        });
      }, GRAPH_DEADLINE_MS);
      if (typeof deadline?.unref === "function") deadline.unref();
      ctx.effect(() => () => {
        settled = true;
        if (unsubscribe !== undefined) unsubscribe();
        clearTimeout(deadline);
      }, "schedule-console: boot-graph self-check");
      check();
    });
  } catch (error) {
    ctx.logger.warn("[schedule-console] boot-graph self-check unavailable: %s", String(error));
  }
}

/** Exposed for this package's offline tests; the Loader ignores unknown exports. */
export const __internals = {
  PACKAGE_NAME,
  API_PREFIX,
  ABOUT_PATH,
  USER_AGENT_DIR,
  SYSTEM_AGENT_DIR,
  SYSTEM_DAEMON_DIR,
  USER_SCOPE,
  SYSTEM_AGENT_SCOPE,
  SYSTEM_DAEMON_SCOPE,
  CRON_SCOPE,
  DSH_SCOPE,
  defaultRun,
  readPlist,
  readLaunchdRegistry,
  readDaemonRegistry,
  normalizeCalendar,
  describeCalendarEntry,
  describeInterval,
  describeTiming,
  nextFireAt,
  nextCronFireAt,
  parseCronField,
  programSummary,
  scanLaunchdDir,
  readCronRows,
  readDshRows,
  readAbout,
  aboutOf,
  buildSnapshot,
  toggleTask,
  kickTask,
  readLogTail,
  makeAutomationRoutes,
  requireSameOrigin,
};
