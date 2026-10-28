/**
 * Skill Library — host half.
 *
 * The plugin is a pure UI plugin: every pixel it owns lives in the browser
 * half (`exports["./client"]`, discovered through this package's
 * `dsh.client` declaration), and the Host half exists only so the row is a
 * real Loader entry the browser roster can scan.
 *
 * It also carries one self-check. A Web plugin that never reaches the
 * composed boot graph fails silently in the browser — no sidebar row, no
 * error — so this half reports the outcome once, at the first graph that
 * contains the row or at a bounded deadline. It never throws and never
 * retries: the sidebar is decoration, and a missing row must not take the
 * Host composition down with it.
 *
 * @module dsh-plugin-skill-library
 */

/** This package's manifest name — the browser module identity of its client half. */
const PACKAGE_NAME = "dsh-plugin-skill-library";

/** How long the self-check waits for a recomposition before reporting absence. */
const GRAPH_DEADLINE_MS = 5_000;

/**
 * Contribute the Host-side row and report whether the sidebar panel reached
 * the web boot graph.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
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
          ctx.logger.warn("[skill-library] could not read the web boot graph: %s", String(error));
        });
        return;
      }
      if (!entries.some((entry) => entry?.id === PACKAGE_NAME)) return;
      finish(() => {
        ctx.logger.info("[skill-library] sidebar panel is composed into the web boot graph");
      });
    };
    unsubscribe = typeof registry.onGraphChanged === "function" ? registry.onGraphChanged(check) : undefined;
    deadline = setTimeout(() => {
      finish(() => {
        ctx.logger.warn(
          "[skill-library] the sidebar panel never reached the web boot graph; the sidebar entry stays hidden until the Host composes it (check this package's dsh.client declaration and exports[\"./client\"])",
        );
      });
    }, GRAPH_DEADLINE_MS);
    if (typeof deadline?.unref === "function") deadline.unref();
    ctx.effect(() => () => {
      settled = true;
      if (unsubscribe !== undefined) unsubscribe();
      clearTimeout(deadline);
    }, "skill-library: boot-graph self-check");
    check();
  });
}

/** Exposed for this package's offline tests; the Loader ignores unknown exports. */
export const __internals = {
  PACKAGE_NAME,
  GRAPH_DEADLINE_MS,
};
