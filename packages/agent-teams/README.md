# Muciya Agent Teams

A roster, a topology graph and a shared task board for the agents a session is running.

## What it does

- **Roster** — every member the session has spawned, with its role and current state marker.
- **Topology** — who reports to whom, drawn from the team's own parent/child edges rather than a
  guess from names.
- **Task board** — the shared task list with owner, blockers and write scopes, so a blocked task is
  visible as blocked instead of as a stalled row.
- Everything is fed by the `agentTeam` Session projection the official Agent Teams bundle publishes;
  this package draws it and owns no state of its own.

The panel is a browser half only. The Host half reports once whether the panel reached the web boot
graph — a Web plugin the Host never composes fails silently, with no row and no error.

## Install

```sh
dsh plugin add github:OWNER/REPO/packages/agent-teams
```

Or mount a checkout by hand from your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: muciya-agent-teams
      name: ./plugins/agent-teams/lib/index.js
```

## Requirement

The session must publish the `agentTeam` projection (the official Agent Teams bundle does). Without
it the panel still mounts and says so, instead of rendering an empty board that looks like an idle
team.
