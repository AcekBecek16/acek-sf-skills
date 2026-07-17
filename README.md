# acek-sf-skills

Monorepo for installable [Claude Code](https://claude.com/claude-code) skills. Three independent
npm packages, each installable on its own via `npx`:

| Package | What it is | Install |
|---|---|---|
| [`acek-skills`](packages/acek-skills) | 9 Salesforce role skills — admin, architecture/plan mode, dev, testing, DevOps, security review, data migration, business analysis, ideation | `npx acek-skills install` |
| [`shaiden`](packages/shaiden) | LWC Design Precision skill (紫電) — SLDS 2 tokens, craft/critique/polish workflow | `npx @nullbotdotexe/shaiden install` |
| [`ashley`](packages/ashley) | Ashley + Eva — takes a Next.js + Supabase SaaS idea from raw concept (`eva`) through a gated technical plan (`ashley`), dispatched to four role subagents (commatoze, isla, asa, channel) | `npx @nullbotdotexe/ashley install` |

`acek-skills` and `shaiden` are kept as separate packages on purpose: `acek-skills`' LWC guidance
(`sf-dev`) and `shaiden`'s design system use different, incompatible styling conventions (see each
package's README for details). Install only the one that matches how you want to build LWC
components. `ashley` is a separate product domain entirely (Next.js/Supabase SaaS planning, not
Salesforce) — it doesn't conflict with the other two, it's just unrelated to them.

All three packages also install into Cursor, Windsurf, and GitHub Copilot as static instruction
files, not just Claude Code — see each package's README for the full target list. For `ashley`,
only the Claude Code target gets its 4 role subagents and the `/eva` slash command; the other
targets get both skills' workflows only, flattened to that tool's rule format.

## Structure

```
packages/
  acek-skills/     9 sf-* skills + install CLI
  shaiden/         LWC design skill + install CLI
  ashley/          eva + ashley planning skills, 4 role subagents, /eva command + install CLI
```

Managed with npm workspaces — from the repo root:

```bash
npm install          # installs all three packages' dependencies
```

Each package publishes independently (`npm publish -w packages/acek-skills`).

## License

MIT
