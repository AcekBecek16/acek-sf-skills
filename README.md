# acek-sf-skills

Monorepo for installable [Claude Code](https://claude.com/claude-code) skills. Four independent
npm packages, each installable on its own via `npx`:

| Package | What it is | Install |
|---|---|---|
| [`acek-skills`](packages/acek-skills) | 9 Salesforce role skills — admin, architecture/plan mode, dev, testing, DevOps, security review, data migration, business analysis, ideation, dispatched via 8 owner-skill subagents from `sf-architect` | `npx acek-skills install` |
| [`shaiden`](packages/shaiden) | LWC Design Precision skill (紫電) — SLDS 2 tokens, craft/critique/polish workflow | `npx @nullbotdotexe/shaiden install` |
| [`ashley`](packages/ashley) | Ashley + Eva — takes a Next.js + Supabase SaaS idea from raw concept (`eva`) through a gated technical plan (`ashley`), dispatched to four role subagents (commatoze, isla, asa, channel) | `npx @nullbotdotexe/ashley install` |
| [`mia`](packages/mia) | Manager in Action — blunt PM discovery/spec/verification skill, grills stakeholders into a `spec.md` before the Architect starts, then verifies the build traces back to it | `npx @nullbotdotexe/mia install` |

`acek-skills` and `shaiden` are kept as separate packages on purpose: `acek-skills`' LWC guidance
(`sf-dev`) and `shaiden`'s design system use different, incompatible styling conventions (see each
package's README for details). Install only the one that matches how you want to build LWC
components. `ashley` is a separate product domain entirely (Next.js/Supabase SaaS planning, not
Salesforce) — it doesn't conflict with the other two, it's just unrelated to them. `mia` has no
styling or code-convention opinions and sits upstream of `acek-skills`' `sf-architect` (or any
other planning flow) as an optional discovery/verification gate — it doesn't conflict with any of
the other three.

All four packages also install into Cursor, Windsurf, and GitHub Copilot as static instruction
files, not just Claude Code — see each package's README for the full target list. For `ashley`
and `acek-skills`, only the Claude Code target gets their role subagents and slash commands
(`/eva`, `/sf-init`); the other targets get the skills' workflows only, flattened to that tool's
rule format.

## Structure

```
packages/
  acek-skills/     9 sf-* skills, 8 owner-skill subagents, /sf-init command + install CLI
  shaiden/         LWC design skill + install CLI
  ashley/          eva + ashley planning skills, 4 role subagents, /eva command + install CLI
  mia/             discovery/spec/verification skill + install CLI
```

Managed with npm workspaces — from the repo root:

```bash
npm install          # installs all three packages' dependencies
```

Each package publishes independently (`npm publish -w packages/acek-skills`).

## License

MIT
