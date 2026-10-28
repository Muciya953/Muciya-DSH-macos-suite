# Muciya Plugin Library

The plugin manager panel: what is installed, what each row is doing, and the switches for both.

This is a **local fork** of `@deepseek-ai/dsh-client-ui-plugin-manager` (upstream: the package of that
name shipped with the harness) that carries the Chinese copy for this machine. It keeps the upstream
package name on purpose — the Host half and both typert halves register under that identity, so
renaming the package would orphan the RPC namespace the browser half talks to.

## What it does

- **Installed rows** — every Loader entry with its id, the package behind it, and a switch that writes
  a profile override instead of editing the bundle.
- **Market** — search, package detail, install, and the pending-build approval step. Installs go
  through pnpm against the profile, exactly as the CLI does.
- **Row detail** — the composed config of one row, so a value a plugin refuses is visible where it was
  set rather than in a log.
- A refresh toast, because a row that changed after an install is otherwise indistinguishable from a
  row that was always there.

## Dependencies (read this before mounting)

The Host half imports four packages that a profile does **not** ship by default:

`zod`, `@deepseek-ai/schemastery`, `@deepseek-ai/dsh-timeout`, `@deepseek-ai/dsh-typert-protocol`

Without them the entry never activates, `dsh-client-modules` skips the package, and the sidebar row is
**silently absent** — no error, no placeholder. Link them from the app bundle into the profile first:

```sh
APP=/Applications/DSH\ Desktop\ Beta.app/Contents/Resources/app/node_modules/@deepseek-ai
PROFILE=~/.dsh-beta/profiles/desktop
ln -sfn "$APP/dsh-timeout" "$PROFILE/node_modules/@deepseek-ai/dsh-timeout"
ln -sfn "$APP/dsh-typert-protocol" "$PROFILE/node_modules/@deepseek-ai/dsh-typert-protocol"
```

`zod` and `schemastery` are ordinary dependencies and install with the package.

## Install

```sh
dsh plugin add github:OWNER/REPO/packages/plugin-library
```

Or mount a checkout by hand (the Host half is imported once per process, so a change needs a restart):

```yaml
- insert:
    - id: muciya-plugin-library
      name: ./plugins/plugin-library/lib/entry.js
```

## Coexistence

Do not mount this row and the upstream `@deepseek-ai/dsh-client-ui-plugin-manager` row at the same
time: both register the same browser module id, and the loader keeps one of them. Pick the fork.
