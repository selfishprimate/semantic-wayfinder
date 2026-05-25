# Contributing to Semantic Wayfinder

Thanks for considering a contribution. This project is small and opinionated — please open an issue before significant changes so we can align on direction first.

## Repo layout

This is a monorepo with two surfaces sharing a single set of conventions:

```
semantic-wayfinder/
├── packages/
│   ├── skill/    ← Claude Code skill (v0.1, available now)
│   └── cli/      ← Standalone CLI (v0.3, planned)
├── docs/         ← Shared documentation (naming rules, conventions)
└── examples/     ← Before/after snippets used by both surfaces
```

Whichever package you contribute to, the naming logic in [`docs/conventions.md`](./docs/conventions.md) is the source of truth. Don't fork it inside a package — update the shared doc.

## What's welcome

- **Bug reports** with a minimal reproduction (a small snippet of the codebase that gets mis-tagged, the config used, what happened, what you expected)
- **Naming convention proposals** — if there's a pattern Wayfinder gets wrong consistently, update or extend `docs/conventions.md`
- **Framework support** — Vue and Svelte parsing is on the v0.2 roadmap for the skill, and on the v0.3 roadmap for the CLI
- **CLI work** — once `packages/cli/` development starts, contributions on Node/TS are welcome
- **Documentation fixes** — typos, unclear examples, missing edge cases

## What's not welcome (in v0.x)

- Adding new flags or options that aren't on the roadmap
- Switching the skill format or bootstrap flow without discussion
- New configuration options — the bar for adding to `.wayfinder.json` is high; every new option is a new way for the wizard to fork
- Changes that make the skill and the CLI behave differently — they must produce identical output for the same input

## How to propose a change

1. Open an issue describing the problem and your proposed approach
2. Wait for a thumbs-up before writing code
3. Keep PRs small and focused — one concern per PR
4. Update `README.md`, the package's own `README.md`, and `docs/conventions.md` if behavior changes
5. Note breaking changes in the PR description

## Editing the skill

The skill lives at `packages/skill/.claude/skills/semantic-wayfinder/SKILL.md`. It's a single markdown file. Be careful with the instruction language — small wording changes can shift Claude's behavior in surprising ways. When in doubt, test on a real project before opening a PR.

## Editing shared docs

When you change `docs/conventions.md`, double-check that the skill (and eventually the CLI) still match. A drift between the docs and the implementation is a bug.
