# Semantic Wayfinder

> Give your components an identity layer so AI agents stop guessing.

When you ask an AI agent to "change the testimonials section on the about page," it often edits the wrong section. The reason isn't the AI — it's that utility-class codebases give every component the same outfit and no name tag. The agent has to play detective on every request, and detective work burns tokens.

Semantic Wayfinder adds a single semantic identity class to each component (`aboutHero`, `dashboardSidebar`, `pricingFAQ`...) so agents can `grep` and target precisely instead of reading entire files trying to figure out which `<section>` you meant.

## Why this exists

Read the full argument here: **[Semantic Wayfinding: Why Vibe Coding Needs More Than Utility Classes](#)** *(link your Medium article when published)*

The short version, in numbers from the article:

- A typical "update the testimonials section on the about page" edit, in a utility-only codebase, takes an agent **~1,300 tokens** to complete (multiple file reads, ambiguity, clarification turns).
- The same edit, in a Wayfinder-tagged codebase, takes **~190 tokens**. One `grep`, one edit.
- Roughly **6.9× cheaper, 85% saving** — see the article for the methodology and a transparency note on how the measurements were modeled.

## This repo contains two things

Semantic Wayfinder ships as two surfaces over the same engine. The skill is here today; the CLI is the next thing on the roadmap.

| Package | What it is | Status | Where |
|---|---|---|---|
| **[Skill](./packages/skill)** | A Claude Code skill. Drop it into your project, run `/wayfind`, get tagged components. | ✅ v0.1 — available now | [`packages/skill/`](./packages/skill) |
| **[CLI](./packages/cli)** | An `npx semantic-wayfinder` command for Gemini CLI, Codex CLI, headless use, and CI. | 🚧 Coming in v0.3 | [`packages/cli/`](./packages/cli) |

Both packages use the same `.wayfinder.json` config format and produce identical output. Pick whichever interface fits where you work.

## Quick start

If you're on **Claude Code**, you're ready today:

```bash
# In your existing project:
cp -r path/to/semantic-wayfinder/packages/skill/.claude/skills/semantic-wayfinder \
      .claude/skills/
```

Then open the project in Claude Code and run `/wayfind`. The wizard takes about a minute.

If you're on **Gemini CLI**, **Codex CLI**, or any other agent — the CLI is on the roadmap. In the meantime, you can copy the contents of [`SKILL.md`](./packages/skill/.claude/skills/semantic-wayfinder/SKILL.md) into a `GEMINI.md` or `AGENTS.md` in your project root; your agent will follow the rules, just without the bootstrap wizard.

## How it works

`/wayfind` runs in one of two modes, auto-detected:

| Run | What happens |
|---|---|
| **First run** (no `.wayfinder.json` in project) | Bootstrap: detects which agents you use, asks about casing / prefix / scope, writes instruction files, tags your entire codebase, commits. |
| **Every later run** | Incremental: reads your existing config, finds new or changed files since last run, tags only those. No questions, no surprises. |

Pass `--reset` if you ever want to start the wizard over.

## Naming conventions

You pick three things during bootstrap, and Wayfinder stays consistent forever after:

| Choice | Options | Example |
|---|---|---|
| **Casing** | `camelCase` or `kebab-case` | `aboutHero` vs `about-hero` |
| **Prefix** | none (default) / `wf` / custom | `aboutHero` vs `wf-aboutHero` vs `myco-aboutHero` |
| **Scope** | page-level sections only (default) / all meaningful components | `<section>` only vs sections + cards + banners |

The config lives in `.wayfinder.json` at your project root. Commit it — your collaborators should inherit the same conventions.

## Examples

See [`examples/`](./examples) for a before/after on an About page, plus a sample `.wayfinder.json`.

**Before** → utility-only `<section className="px-6 py-20 bg-neutral-50">`
**After** → identity-tagged `<section className="aboutTestimonials px-6 py-20 bg-neutral-50">`

Same styling, same behavior. Now `grep aboutTestimonials` gives one hit, an agent finds it instantly, and you stop spending tokens on detective work.

## What it never does

- Modifies files when your working tree is dirty (asks you to stash or commit first)
- Overwrites existing semantic classes that match your conventions
- Tags components when it isn't confident (asks you instead)
- Touches `node_modules`, build outputs, or gitignored files
- Removes utility classes — Wayfinder is **additive only**
- Reformats your code — preserves indentation, quotes, line breaks

## Roadmap

- **v0.1** *(current)* — Claude Code skill, JSX/HTML support, bootstrap + incremental
- **v0.2** — Vue and Svelte template parsers, better confidence scoring
- **v0.3** — `npx semantic-wayfinder` CLI for Gemini CLI, Codex CLI, and headless use (BYOK with Anthropic / OpenAI keys)
- **v0.4** — `.wayfinder-patterns.json` for cross-run pattern learning
- *(later)* — Optional render + vision pass for hard-to-classify components

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Issues, pull requests, and naming-convention bikeshedding all welcome — please open an issue before significant changes so we can align on direction.

## License

MIT — see [`LICENSE`](./LICENSE).

## Credits

Concept and original article by [@selfishprimate](https://github.com/selfishprimate). Part of the broader [Plainify](#) toolkit philosophy around sustainable, structurally sound AI-built products.
