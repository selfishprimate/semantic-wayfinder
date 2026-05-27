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

### One-time setup: enable the pre-commit hook

After cloning, run this once:

```bash
git config core.hooksPath scripts/hooks
```

This points git at the project's committed hook (`scripts/hooks/pre-commit`) instead of the default `.git/hooks/` folder. From then on, every commit that includes a change to `.claude/skills/wayfinder/SKILL.md` will automatically run `sync-skills.sh`, propagate the change to `.agents/` and `.gemini/`, and stage the synced copies in the same commit. The three files can't drift in a commit, so you can't accidentally push an inconsistent set.

The setting is per-clone — every contributor runs it once after `git clone`.

### Manual sync (if you skip the hook)

You can still run the sync script directly:

```bash
./scripts/sync-skills.sh         # propagate
./scripts/sync-skills.sh --check # verify all three copies match (exits non-zero on drift)
```

## Versioning and the CHANGELOG

The project uses [SemVer](https://semver.org/spec/v2.0.0.html). The version of record lives in `.claude/skills/wayfinder/SKILL.md`'s frontmatter (`version: X.Y.Z`) — this is the **single source of truth**. The other two SKILL.md copies inherit it via sync.

### Automatic patch bumping (via the pre-commit hook)

When you commit a change to `.claude/skills/wayfinder/SKILL.md`, the pre-commit hook **auto-bumps the patch version** unless you already bumped it manually. So a `fix:` or `chore:` commit gets a free patch bump from `0.4.0 → 0.4.1`.

### Manual bumping for minor or major

The hook **only auto-bumps patch**. For minor or major bumps, bump manually before staging:

```bash
./scripts/bump-version.sh patch     # 0.4.0 → 0.4.1
./scripts/bump-version.sh minor     # 0.4.0 → 0.5.0
./scripts/bump-version.sh major     # 0.4.0 → 1.0.0
./scripts/bump-version.sh --show    # just print the current version
```

The script modifies `.claude/skills/wayfinder/SKILL.md` in place. After bumping, stage the file and commit normally — the hook detects the manual bump (frontmatter differs from `HEAD`) and skips its own auto-bump.

```bash
./scripts/bump-version.sh minor
git add .claude/skills/wayfinder/SKILL.md
git commit -m "feat: new behavior X"
```

**Why patch-only auto-detection?** The pre-commit hook runs *before* git writes the commit message to disk, so it can't reliably read `feat:` / `BREAKING:` prefixes to choose a bump type. An earlier version of this hook tried to grep `.git/COMMIT_EDITMSG` and silently produced wrong bump types because the file held the *previous* commit's message. Patch-only with manual override is simpler and reliable.

### CHANGELOG.md

Every behavioral change to the skill must add an entry to `CHANGELOG.md` under the appropriate version heading, following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format (Added / Changed / Deprecated / Removed / Fixed / Security / Breaking).

The pre-commit hook prints a **soft warning** when SKILL.md changes without a CHANGELOG update — not blocking, just a nudge. Doc-only commits don't need a changelog entry.

When you commit changes that should go into the next release, add them under an `## [Unreleased]` section. When the release ships, move them under the new version heading.

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
4. Edit `.claude/skills/wayfinder/SKILL.md` (the source of truth). If you enabled the pre-commit hook, the sync runs automatically when you commit. Otherwise, run `./scripts/sync-skills.sh` yourself.
5. Update `README.md` and `docs/conventions.md` if behavior changes
6. Note breaking changes in the PR description

## Editing the skill

The skill is a single markdown file. Be careful with the instruction language — small wording changes can shift agent behavior in surprising ways. When in doubt, test on a real project before opening a PR.

## Editing shared docs

When you change `docs/conventions.md`, double-check that the skill still matches. A drift between the docs and the skill is a bug.
