# Sync Mechanism

How the three copies of `SKILL.md` stay byte-identical, and why we accept the overhead of keeping three copies in the first place.

---

## The three copies

Wayfinder ships as an **Agent Skill**. The Agent Skills standard lets the same `SKILL.md` work across editors, but each editor expects it at a specific path:

| Editor | Expected path |
|---|---|
| Claude Code | `.claude/skills/wayfinder/SKILL.md` |
| Codex CLI (and other Agent-Skills-compatible agents) | `.agents/skills/wayfinder/SKILL.md` |
| Gemini CLI | `.gemini/skills/wayfinder/SKILL.md` |

So we need three files at three different paths. The rest of this doc answers: how do we keep them identical?

## Why not symlinks

Symlinks are the obvious "single file, multiple paths" answer. We considered them and cut them for three reasons:

- **Cross-platform fragility.** Windows file systems and some Git GUI clients handle symlinks inconsistently — sometimes dereferencing them and committing copies, sometimes treating them as literal files.
- **Future divergence.** Editor-specific tone or commands may eventually justify three actually-different files. Symlinks would force perfect equality.
- **Diff readability.** When something changes, seeing three real files in `git status` is clearer than a symlink dance.

So we keep three real files and absorb the maintenance cost via tooling.

## Source of truth

**`.claude/skills/wayfinder/SKILL.md` is canonical.** Always edit there. The other two are derived.

If you find yourself wanting to edit `.agents/` or `.gemini/` directly: don't. The pre-commit hook will overwrite the edit. If a specific editor genuinely needs a different version, that's a design discussion, not a sneaky local change.

## The sync script

`scripts/sync-skills.sh` is a small POSIX shell script that propagates the source to the other two paths. It has two modes:

```bash
./scripts/sync-skills.sh         # propagate
./scripts/sync-skills.sh --check # verify, exit non-zero on drift
```

- **Propagate** (default): copies `.claude/skills/wayfinder/SKILL.md` to the other two locations. Output reports each propagation.
- **Check**: compares the three files byte-for-byte. If they differ, exits non-zero with a message. Used by the pre-commit hook and (eventually) by CI.

You rarely need to invoke this manually — the pre-commit hook does it for you. Manual invocation exists as a fallback and for one-off verification.

## The pre-commit hook

`scripts/hooks/pre-commit` is a POSIX shell script that git runs automatically before each commit. The hook:

1. Checks if `.claude/skills/wayfinder/SKILL.md` is staged for the commit.
2. If yes:
   - Runs `sync-skills.sh` (propagation)
   - Stages the propagated `.agents/` and `.gemini/` copies via `git add`
   - Runs `sync-skills.sh --check` to verify
3. If anything fails, the commit aborts and the user sees the error.

If `.claude/SKILL.md` isn't staged, the hook is a no-op — zero overhead on unrelated commits.

### Activation (one-time, per clone)

After cloning, every contributor runs this once:

```bash
git config core.hooksPath scripts/hooks
```

This tells git to look for hooks in `scripts/hooks/` instead of the default `.git/hooks/` folder. The setting is local to that clone (stored in `.git/config`, not in the repo), so each new clone needs the command once.

### Why `core.hooksPath`?

Git's default hooks folder (`.git/hooks/`) is intentionally not version-controlled — anything you put there only exists on your machine. To share hooks across the team, we commit them under `scripts/hooks/` and tell git to use that folder via `core.hooksPath`.

The alternative is a tool like **Husky** (npm package that auto-installs hooks). We didn't use Husky because Wayfinder has no Node dependency. Adding `package.json`, `npm install`, and a Node runtime just for hook management would dwarf the rest of the project's footprint. `core.hooksPath` is one git config command and zero external tooling.

### What if a contributor skips the activation?

Their commits don't run the hook. They might forget to sync, drift sneaks in, and a `git push` carries the drift to `main`.

Backstops:
- A contributor can still run `./scripts/sync-skills.sh --check` manually before pushing.
- CI (once configured) will run `--check` on every PR and block merges on drift.

The hook is the primary defense; CI is the backstop. Together they cover both careful and careless contributors.

## Cross-platform notes

- The hook is a POSIX shell script (`#!/bin/sh`). Works on macOS, Linux, WSL, and Git for Windows' bundled bash.
- On native Windows, git invokes the script via its MSYS shell. If the hook misbehaves, check that the file has Unix line endings (LF, not CRLF). `git config core.autocrlf input` handles this for new clones.

## Drift detection

"Drift" means the three copies are not byte-identical. Causes:

- A contributor edited `.agents/` or `.gemini/` directly (against the rule)
- Someone skipped the hook and forgot to run sync
- A merge conflict was resolved inconsistently across the three files

To check current state:

```bash
./scripts/sync-skills.sh --check
```

Fix: always keep `.claude/`'s version, then run `sync-skills.sh` (no flag) to overwrite the others.

## What this doc *doesn't* cover

This doc is about the **three files staying byte-identical**. It doesn't cover the structure inside `SKILL.md` (the shared instruction template, placeholder substitution, Step 6 mechanics) — those live one level deeper and have their own doc: see [`INSTRUCTION_TEMPLATE.md`](./INSTRUCTION_TEMPLATE.md).

## Related

- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — the one-line activation command and the contributor workflow
- [`INSTRUCTION_TEMPLATE.md`](./INSTRUCTION_TEMPLATE.md) — how the shared template inside SKILL.md gets rendered into user projects (a separate maintenance concern at a different level)
- [`THE_STORY_BEHIND_THE_PROJECT.md`](./THE_STORY_BEHIND_THE_PROJECT.md) — Part 2 documents the design discussion that produced the three-copies-plus-sync-script decision over symlinks
