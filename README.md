# acek-sf-skills

Monorepo for installable [Claude Code](https://claude.com/claude-code) skills. Two independent
npm packages, each installable on its own via `npx`:

| Package | What it is | Install |
|---|---|---|
| [`acek-skills`](packages/acek-skills) | 8 Salesforce role skills — admin, dev, testing, DevOps, security review, data migration, business analysis, ideation | `npx acek-skills install` |
| [`shaiden`](packages/shaiden) | LWC Design Precision skill (紫電) — SLDS 2 tokens, craft/critique/polish workflow | `npx @nullbotdotexe/shaiden install` |

They're kept as separate packages on purpose: `acek-skills`' LWC guidance (`sf-dev`) and
`shaiden`'s design system use different, incompatible styling conventions (see each package's
README for details). Install only the one that matches how you want to build LWC components.

Both packages also install into Cursor, Windsurf, and GitHub Copilot as static instruction
files, not just Claude Code — see each package's README for the full target list.

## Structure

```
packages/
  acek-skills/     8 sf-* skills + install CLI
  shaiden/          LWC design skill + install CLI
```

Managed with npm workspaces — from the repo root:

```bash
npm install          # installs both packages' dependencies
```

Each package publishes independently (`npm publish -w packages/acek-skills`).

## License

MIT
