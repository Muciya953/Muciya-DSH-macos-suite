# Muciya Skill Library

The Skill Library panel for DSH Web: every skill this profile can see, in one place.

## What it does

- Enumerates the skill roots DSH actually discovers — `$DSH_HOME/skills`, `~/.agents/skills`, and the
  workspace's `.dsh/skills` / `.agents/skills` — instead of a copied index, so a skill you add or
  delete shows up on the next poll with no reinstall.
- One row per skill: name, the three-line Chinese summary when the catalog has one, source root, and
  whether the skill is currently visible to the model.
- Rows are filterable and each row states where it came from, which is the question that actually
  comes up when two roots define the same name.

The panel is a browser half only. The Host half exists so the row is a real Loader entry the browser
roster can scan, and it reports once whether the panel reached the web boot graph — a Web plugin the
Host never composes fails silently, with no row and no error.

## Install

```sh
dsh plugin add github:OWNER/REPO/packages/skill-library
```

Or mount a checkout by hand from your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: muciya-skill-library
      name: ./plugins/skill-library/lib/index.js
```

## Data

Read-only. Nothing here writes to a skill directory; enabling or disabling a skill goes through the
harness itself, not through this panel.
