/**
 * Agent Team Panel — host half.
 *
 * A pure UI plugin: the roster, the topology graph and the shared task board
 * all live in the browser half (`exports["./client"]`, discovered through this
 * package's `dsh.client` declaration, and fed by the `agentTeam` Session
 * projection the official Agent Teams bundle publishes). This half exists so
 * the package is a real Loader entry the browser roster can scan.
 *
 * It also carries the one self-check a Web plugin needs. A Web plugin the Host
 * never composes fails silently in the browser — no sidebar row, no error — so
 * this half reports the outcome once, either at the first graph that contains
 * the row or at a bounded deadline. It never throws and never retries: the
 * sidebar is decoration, and a missing row must not take the Host composition
 * down with it.
 *
 * @module muciya-dsh-plugin-agent-teams
 */

import { applyAutomationPanel } from "./automation-panel.js";

/** This package's manifest name — the browser module identity of its client half. */
const PACKAGE_NAME = "muciya-dsh-plugin-agent-teams";

/** How long the self-check waits for a recomposition before reporting absence. */
const GRAPH_DEADLINE_MS = 5_000;

/**
 * Contribute the Host-side row and report whether the sidebar panel reached the
 * web boot graph.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  // Automation console (ported from `dsh-plugin-schedule-console`): launchd +
  // crontab + DSH clocks, mounted under /api/muciya-agent-teams/automation/v1.
  applyAutomationPanel(ctx);
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
        finish(() => {
          ctx.logger.warn("[agent-team-panel] could not read the web boot graph: %s", String(error));
        });
        return;
      }
      if (!entries.some((entry) => entry?.id === PACKAGE_NAME)) return;
      finish(() => {
        ctx.logger.info("[agent-team-panel] sidebar panel is composed into the web boot graph");
      });
    };
    unsubscribe = typeof registry.onGraphChanged === "function" ? registry.onGraphChanged(check) : undefined;
    deadline = setTimeout(() => {
      finish(() => {
        ctx.logger.warn(
          "[agent-team-panel] the sidebar panel never reached the web boot graph; the sidebar entry stays hidden until the Host composes it (check this package's dsh.client declaration and exports[\"./client\"])",
        );
      });
    }, GRAPH_DEADLINE_MS);
    if (typeof deadline?.unref === "function") deadline.unref();
    ctx.effect(() => () => {
      settled = true;
      if (unsubscribe !== undefined) unsubscribe();
      clearTimeout(deadline);
    }, "agent-team-panel: boot-graph self-check");
    check();
  });
}
