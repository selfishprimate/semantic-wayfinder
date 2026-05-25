# Contributing to Semantic Wayfinder

Thanks for considering a contribution. This project is small and opinionated — please open an issue before significant changes so we can align on direction first.

## Repo layout

```
semantic-wayfinder/
├── .claude/skills/wayfinder/SKILL.md   ← source of truth
├── .agents/skills/wayfinder/SKILL.md   ← synced copy (Codex / generic)
├── .gemini/skills/wayfinder/SKILL.md   ← synced copy (Gemini CLI)
├── cli/                                          ← v0.3 placeholder
├── docs/conventions.md                           ← naming rules
├── examples/                                     ← before/after demos
├── scripts/sync-skills.sh                        ← keeps the three SKILL.md copies in sync
└── ...
```

Naming logic is defined in [`docs/conventions.md`](./docs/conventions.md) — it's the single source of truth referenced by every skill copy.

## The three SKILL.md files

The Agent Skills standard lets the same `SKILL.md` work across Claude Code, Codex CLI, and Gemini CLI, but each editor expects it in a different folder. We keep three physical copies because:

- Symlinks break on Windows and some Git GUI clients
- Future divergence is possible (editor-specific tone or commands)
- Diffs stay readable

**`.claude/skills/wayfinder/SKILL.md` is the source of truth.** Always edit there.

After editing, run:

```bash
./scripts/sync-skills.sh
```

This copies the source to `.agents/` and `.gemini/`. In CI, the same script run with `--check` will fail the build if the copies drift.

```bash
./scripts/sync-skills.sh --check
```

## What's welcome

- **Bug reports** with a minimal reproduction (a small snippet of the codebase that gets mis-tagged, the config used, what happened, what you expected)
- **Naming convention proposals** — if there's a pattern Wayfinder gets wrong consistently, update or extend `docs/conventions.md`
- **Framework support** — Vue and Svelte parsing is on the v0.2 roadmap
- **CLI work** — once `cli/` development starts, contributions on Node/TS are welcome
- **Documentation fixes** — typos, unclear examples, missing edge cases

## What's not welcome (in v0.x)

- Adding new flags or options that aren't on the roadmap
- Switching the skill format or bootstrap flow without discussion
- New configuration options — the bar for adding to `.wayfinder.json` is high; every new option is a new way for the wizard to fork
- Changes that make the three skill copies behave differently — they must produce identical output for the same input until we explicitly decide to diverge

## How to propose a change

1. Open an issue describing the problem and your proposed approach
2. Wait for a thumbs-up before writing code
3. Keep PRs small and focused — one concern per PR
4. Edit `.claude/skills/wayfinder/SKILL.md` (the source of truth), then run `./scripts/sync-skills.sh`
5. Update `README.md` and `docs/conventions.md` if behavior changes
6. Note breaking changes in the PR description

## Editing the skill

The skill is a single markdown file. Be careful with the instruction language — small wording changes can shift agent behavior in surprising ways. When in doubt, test on a real project before opening a PR.

## Editing shared docs

When you change `docs/conventions.md`, double-check that the skill still matches. A drift between the docs and the skill is a bug.
