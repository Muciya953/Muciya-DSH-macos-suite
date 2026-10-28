# Muciya Usage

Session usage accounting for this profile: where the tokens went, what they cost, and what the
providers say is left.

## What it does

- **Ledger** — every finished assistant turn is folded into a local day bucket per provider and model:
  input, output, cache-read and cache-write tokens plus call count. Days are bucketed in the **user's
  local time**, because that is the sense of "today" the numbers are read in.
- **Spend** — CNY pricing with DeepSeek's peak windows (working days 09:00-12:00 and 14:00-18:00,
  weekends and Chinese public holidays at the off-peak rate). Cost is frozen at fold time, so a later
  price change never rewrites history.
- **Balances** — read-only probes for the providers this profile actually has credentials for:
  DeepSeek, Moonshot (both regions), OpenRouter, SiliconFlow, Z.ai (both origins), MiniMax, Kimi
  coding plans, ChatGPT plans and a few resellers. Probes never bill anything, and a failed probe keeps
  the last good value instead of blanking the row.
- **Observed spend** — the DeepSeek balance is also sampled over time; a drop counts as real spend, a
  top-up does not, which gives a second, independent series next to the folded estimate.
- **Sidebar foot card** — a compact today-shape card with a collapsed state remembered per profile.
- **Settings section** — retention days, poll interval, which providers are listed, and the ledger's
  own path.

## Data

Everything lives under `$DSH_HOME/muciya-usage/`:

- `usage-ledger.json` — the folded ledger (`version: 1`)
- `provider-snapshots.json` — the last good balance/plan per provider plus the spend watch

You can run this package and `@linxin666/dsh-usage` side by side: the row ids, API prefix
(`/api/muciya-usage/…`), settings namespace and data directory are all distinct, so each keeps its own
fold of the same session stream.

## Install

```sh
dsh plugin add github:OWNER/REPO/packages/usage
```

Or mount a checkout by hand from your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: muciya-usage
      name: ./plugins/usage/lib/index.js
```

## Requirement

`@deepseek-ai/schemastery` (a normal dependency) and the `react` peer the browser half renders with.
