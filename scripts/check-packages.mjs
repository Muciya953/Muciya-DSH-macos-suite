#!/usr/bin/env node
/**
 * Offline structural check for the five split packages.
 *
 * This is the check a machine can run: manifests declare a bundle patch and a web client,
 * every row names an id and an entry, the browser half is a real `__ModuleLoader__.load`
 * envelope with the identity the Host half expects, no package still points at the old
 * suite-wide API prefix, and every README says enough to be reviewed.
 *
 * It does not boot the harness. `docs` for that: MANUAL.zh.md.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = [
	// The fork keeps the upstream package name because its typert halves register under it.
	{ dir: "plugin-library", id: "@deepseek-ai/dsh-client-ui-plugin-manager", host: "lib/entry.js", selfNamed: false },
	{ dir: "skill-library", id: "muciya-dsh-plugin-skill-library", host: "lib/index.js" },
	{ dir: "appearance-library", id: "muciya-dsh-plugin-appearance-library", host: "lib/index.js" },
	{ dir: "agent-teams", id: "muciya-dsh-plugin-agent-teams", host: "lib/index.js" },
	{ dir: "usage", id: "muciya-dsh-plugin-usage", host: "lib/index.js" },
];

let checks = 0;
let failures = 0;

function check(what, ok, detail) {
	checks += 1;
	if (ok) return;
	failures += 1;
	console.error(`FAIL ${what}${detail === undefined ? "" : ` — ${detail}`}`);
}

function read(path) {
	return readFileSync(path, "utf8");
}

function parses(path) {
	try {
		execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
		return true;
	} catch (error) {
		return String(error.stderr ?? error.message).trim();
	}
}

for (const pkg of PACKAGES) {
	const root = join("packages", pkg.dir);
	const manifestPath = join(root, "package.json");
	check(`${pkg.dir}: package.json exists`, existsSync(manifestPath));
	if (!existsSync(manifestPath)) continue;

	const manifest = JSON.parse(read(manifestPath));
	check(`${pkg.dir}: name is ${pkg.id}`, manifest.name === pkg.id, manifest.name);
	check(`${pkg.dir}: version is semver`, /^\d+\.\d+\.\d+/.test(String(manifest.version)), manifest.version);
	check(`${pkg.dir}: is private`, manifest.private === true);
	check(`${pkg.dir}: declares dsh.bundle.patch`, manifest.dsh?.bundle?.patch === "./cordis.patch.yml", manifest.dsh?.bundle?.patch);
	check(`${pkg.dir}: declares a web client`, manifest.dsh?.client?.platform === "web", manifest.dsh?.client?.platform);
	check(`${pkg.dir}: declares an engines range`, typeof manifest.dsh?.engines?.dsh === "string", manifest.dsh?.engines?.dsh);
	const inject = manifest.dsh?.client?.inject;
	if (inject !== undefined) {
		check(`${pkg.dir}: client inject names packages, not bare service keys`, Array.isArray(inject) && inject.every((entry) => entry.includes("/")), JSON.stringify(inject));
	}
	const clientExport = manifest.exports?.["./client"];
	const clientTarget = typeof clientExport === "string" ? clientExport : clientExport?.default;
	check(`${pkg.dir}: export map exposes the client`, clientTarget === "./lib/client.js", JSON.stringify(clientExport ?? null));

	const patchPath = join(root, "cordis.patch.yml");
	check(`${pkg.dir}: cordis.patch.yml exists`, existsSync(patchPath));
	if (existsSync(patchPath)) {
		const patch = read(patchPath);
		check(`${pkg.dir}: patch inserts a row`, patch.includes("- insert:"));
		check(`${pkg.dir}: patch names an id`, /- id: [\w@/.-]+/.test(patch));
		check(`${pkg.dir}: patch names an entry`, /name:\s*["']?[\w@/.\\-]+["']?/.test(patch));
	}

	const hostPath = join(root, pkg.host);
	check(`${pkg.dir}: host half exists (${pkg.host})`, existsSync(hostPath));
	if (existsSync(hostPath)) {
		const hostParse = parses(hostPath);
		check(`${pkg.dir}: host half parses`, hostParse === true, hostParse);
		const host = read(hostPath);
		check(`${pkg.dir}: host half has no suite-wide API prefix`, !host.includes("/api/macos-suite/"));
		if (pkg.selfNamed !== false) check(`${pkg.dir}: host half is the package the row mounts`, host.includes(pkg.id), "package identity missing from the Host half");
	}

	const clientPath = join(root, "lib/client.js");
	check(`${pkg.dir}: browser half exists`, existsSync(clientPath));
	if (existsSync(clientPath)) {
		const client = read(clientPath);
		check(`${pkg.dir}: browser half is a loader envelope`, client.includes("window.__ModuleLoader__.load({"), "no __ModuleLoader__.load");
		check(`${pkg.dir}: browser half registers as ${pkg.id}`, client.includes(`id: "${pkg.id}"`), "loader id differs from the package name");
		const clientParse = parses(clientPath);
		check(`${pkg.dir}: browser half parses`, clientParse === true, clientParse);
		check(`${pkg.dir}: browser half has no suite-wide API prefix`, !client.includes("/api/macos-suite/"));
	}

	const readmePath = join(root, "README.md");
	check(`${pkg.dir}: README exists`, existsSync(readmePath));
	if (existsSync(readmePath)) {
		check(`${pkg.dir}: README documents the plugin`, read(readmePath).split("\n").length >= 20);
	}
}

// Ported features: each merged module must still be present and wired, and no
// retired API prefix may survive the move.
const appearanceFiles = ["lib/index.js", "lib/client.js", "lib/skin/host.js", "lib/startup/boot.js", "lib/usage/host.js"];
for (const rel of appearanceFiles) {
	check(`appearance-library: ${rel} exists`, existsSync(join("packages/appearance-library", rel)));
}
const appearanceClient = read("packages/appearance-library/lib/client.js");
check("appearance-library: hover tokens are merged in", appearanceClient.includes("var __hoverTokens = (function () {"));
check("appearance-library: hover tokens are applied", appearanceClient.includes("__hoverTokens.apply(ctx);"));
const agentHost = read("packages/agent-teams/lib/index.js");
check("agent-teams: automation panel module exists", existsSync("packages/agent-teams/lib/automation-panel.js"));
check("agent-teams: host imports the automation panel", agentHost.includes('from "./automation-panel.js"'));
check("agent-teams: host calls the automation panel", agentHost.includes("applyAutomationPanel(ctx);"));
const agentClient = read("packages/agent-teams/lib/client.js");
check("agent-teams: automation console is merged in", agentClient.includes("var __automationPanel = (function () {"));
check("agent-teams: automation console is applied", agentClient.includes("__automationPanel.apply(ctx);"));
const pluginLibraryClient = read("packages/plugin-library/lib/client.js");
check("plugin-library: market entry is merged in", pluginLibraryClient.includes("var __marketLauncher = (function () {"));
check("plugin-library: market entry is applied", pluginLibraryClient.includes("__marketLauncher.apply(ctx);"));
check("plugin-library: the market port owns no sidebar row", !pluginLibraryClient.includes('ctx.slots.inject("main", () =>'));
check("plugin-library: the market port registers a shortcut", pluginLibraryClient.includes('id: "muciya-plugin-library.market.open"'));
const retiredPrefixes = ["/api/appearance-library/v1", "/api/schedule-console/v1", "/api/macos-suite/"];
for (const spec of PACKAGES) {
	const client = read(join("packages", spec.dir, "lib/client.js"));
	const host = read(join("packages", spec.dir, spec.host));
	for (const prefix of retiredPrefixes) {
		check(`${spec.dir}: no retired prefix ${prefix} (client)`, !client.includes(prefix));
		check(`${spec.dir}: no retired prefix ${prefix} (host)`, !host.includes(prefix));
	}
}

const suitePatch = read("cordis.patch.yml");
for (const id of ["muciya-plugin-library", "muciya-skill-library", "muciya-appearance-library", "muciya-agent-teams", "muciya-usage"]) {
	check(`suite patch mounts ${id}`, suitePatch.includes(`- id: ${id}`));
}

const suite = JSON.parse(read("package.json"));
for (const pkg of PACKAGES) {
	check(`suite depends on ${pkg.id}`, Object.values(suite.dependencies ?? {}).some((spec) => spec.includes(`packages/${pkg.dir}`)), JSON.stringify(suite.dependencies ?? {}));
}
check("suite declares no web client of its own", suite.dsh?.client === undefined, JSON.stringify(suite.dsh?.client ?? null));
const entryParse = parses("src/index.js");
check("suite entry parses", entryParse === true, entryParse);

if (failures > 0) {
	console.error(`\n${failures} check(s) failed of ${checks}`);
	process.exit(1);
}
console.log(`${checks} checks passed across ${PACKAGES.length} packages`);
