# Semantic Wayfinder — CLI

> 🚧 **Coming in v0.3** — this package is a placeholder. The Agent Skill is available now in [`.claude/`](../.claude/skills/semantic-wayfinder), [`.agents/`](../.agents/skills/semantic-wayfinder), and [`.gemini/`](../.gemini/skills/semantic-wayfinder), and the CLI will share its engine.

## What this will be

A standalone command-line tool that brings Semantic Wayfinding to **any** AI coding environment — not just Claude Code. Run it from your terminal, from CI, from a git hook, or from inside Gemini CLI / Codex CLI.

```bash
# Planned interface — subject to change:
npx semantic-wayfinder              # bootstrap or incremental, auto-detected
npx semantic-wayfinder app/about    # tag a specific path
npx semantic-wayfinder --check      # CI-friendly: exit non-zero if untagged components exist
npx semantic-wayfinder --reset      # wipe config and re-run the wizard
```

## Why this exists separately from the skill

The skill is great if you live in Claude Code. The CLI exists for everyone else:

- **Gemini CLI** and **Codex CLI** users — drop in a `GEMINI.md` or `AGENTS.md` once with the skill rules, then use the CLI for bootstrapping and bulk tagging
- **CI pipelines** — block PRs that introduce untagged components (`--check` mode)
- **Headless / scripted use** — automate Wayfinder in your release scripts, monorepo tooling, or codebase audits
- **Other agents** — Aider, Cline, Continue, whatever ships next — they can all benefit from the same identity layer

## Planned architecture

| Concern | Approach |
|---|---|
| **Engine** | TypeScript, shared with the skill via the same `.wayfinder.json` config format |
| **AI calls** | BYOK — bring your own Anthropic or OpenAI key via env var. No hosted service in v0.x. |
| **Parsing** | AST-based for JSX/TSX (Babel or SWC), regex-assisted for HTML, framework-specific parsers for Vue and Svelte |
| **Distribution** | npm, runnable via `npx semantic-wayfinder` without global install |

## What's not planned

A few things explicitly **not** on the v0.3 menu:

- A hosted cloud service (privacy concerns, infrastructure cost, scope creep)
- A GUI or web dashboard
- Auto-fix watchers / file system daemons — Wayfinder stays a deliberate command, not background magic
- Local LLM support (Ollama) — possible later, but quality on small models isn't there yet for code understanding

## Track progress

- [ ] CLI scaffolding, `package.json`, build setup
- [ ] Port skill logic to a shared `engine/` package
- [ ] BYOK Anthropic client
- [ ] BYOK OpenAI client
- [ ] JSX/TSX AST parser
- [ ] HTML parser
- [ ] Vue / Svelte template parsers
- [ ] `--check` mode for CI
- [ ] `--reset` mode
- [ ] First publish to npm

Want to help build this? See [`CONTRIBUTING.md`](../CONTRIBUTING.md) and open an issue first so we can align on direction.
