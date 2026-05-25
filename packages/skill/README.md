# Semantic Wayfinder — Skill

This is the **Claude Code skill** for Semantic Wayfinder. It's a single markdown file (`.claude/skills/semantic-wayfinder/SKILL.md`) that Claude reads to handle the `/wayfind` command.

For the bigger picture (what Semantic Wayfinding is and why it exists), see the [root README](../../README.md) and the [accompanying article](#).

## What this package is

A drop-in skill folder. Copy it into your own project and you get a `/wayfind` command in Claude Code that:

- Asks for your naming convention preferences (camelCase / kebab-case, optional prefix, scope) on first run
- Writes `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` instruction files so future AI work in this project follows the convention
- Tags every component in your codebase with a semantic identity class
- On subsequent runs, only touches new or changed files

## Install

```bash
# From the root of your existing project:
cp -r path/to/semantic-wayfinder/packages/skill/.claude/skills/semantic-wayfinder \
      .claude/skills/
```

Then open your project in Claude Code and run:

```
/wayfind
```

That's it. The wizard takes about a minute.

## File structure

```
packages/skill/
└── .claude/skills/semantic-wayfinder/
    └── SKILL.md       ← the entire skill, one file
```

That's the whole package. Nothing to build, nothing to install, no dependencies.

## Editing the skill

The `SKILL.md` file is the entire implementation. If you want to tweak the behavior — say, change the wizard wording, add a new naming preset, or adjust the confidence rules — edit that single file. See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) at the repo root for guidance before opening a PR.

## What's next

Once the [CLI](../cli) lands in v0.3, the same conventions will work in Gemini CLI, Codex CLI, and headless contexts. Same engine, different surface.
