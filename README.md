# Semantic Wayfinder

> Give your components an identity layer so AI agents stop guessing.

When you ask an AI agent to "change the testimonials section on the about page," it often edits the wrong section. The reason isn't the AI — it's that utility-class codebases give every component the same outfit and no name tag. The agent has to play detective on every request, and detective work burns tokens.

Semantic Wayfinder adds a single semantic identity class to each component (`aboutHero`, `dashboardSidebar`, `pricingFAQ`...) so agents can `grep` and target precisely instead of reading entire files trying to figure out which `<section>` you meant.

## Why this exists

Read the full argument here: **[Semantic Wayfinding: Why Vibe Coding Needs More Than Utility Classes](#)** *(link your article when published)*

The short version, in numbers from the article:

- A typical "update the testimonials section on the about page" edit, in a utility-only codebase, takes an agent **~1,300 tokens** to complete (multiple file reads, ambiguity, clarification turns).
- The same edit, in a Wayfinder-tagged codebase, takes **~190 tokens**. One `grep`, one edit.
- Roughly **6.9× cheaper, 85% saving** — see the article for the methodology and a transparency note on how the measurements were modeled.

## What's in this repo

Semantic Wayfinder ships as an **Agent Skill** for three editors that share the open Agent Skills standard, plus a CLI on the roadmap for everywhere else.

| Path | Editor | Status |
|---|---|---|
| `.claude/skills/wayfinder/` | Claude Code | ✅ v0.1 |
| `.agents/skills/wayfinder/` | Codex CLI, Aider, and other Agent-Skills-compatible agents | ✅ v0.1 |
| `.gemini/skills/wayfinder/` | Gemini CLI | ✅ v0.1 |
| `cli/` | `npx semantic-wayfinder` for any environment | 🚧 v0.3 |

The three `SKILL.md` files are kept in sync by `scripts/sync-skills.sh`. The `.claude/` copy is the source of truth.

## Quick start

The skill is a single `SKILL.md` file with **zero dependencies** — no runtime, no package install, no build step. Drop it into your project, run `/wayfinder`, done.

### Install in your project

From your project root, run the one-liner for your editor:

**Claude Code**

```bash
curl -fsSL https://raw.githubusercontent.com/selfishprimate/semantic-wayfinder/main/.claude/skills/wayfinder/SKILL.md \
  --create-dirs -o .claude/skills/wayfinder/SKILL.md
```

**Codex CLI** (and other Agent-Skills-compatible agents)

```bash
curl -fsSL https://raw.githubusercontent.com/selfishprimate/semantic-wayfinder/main/.agents/skills/wayfinder/SKILL.md \
  --create-dirs -o .agents/skills/wayfinder/SKILL.md
```

**Gemini CLI**

```bash
curl -fsSL https://raw.githubusercontent.com/selfishprimate/semantic-wayfinder/main/.gemini/skills/wayfinder/SKILL.md \
  --create-dirs -o .gemini/skills/wayfinder/SKILL.md
```

Then open your project in your editor and run:

```
/wayfinder
```

That's it. The wizard takes about a minute on first run; subsequent runs are incremental and silent.

> Prefer to vendor it yourself? Clone this repo and `cp -r .claude/skills/wayfinder your-project/.claude/skills/` (or the equivalent path for your editor). The skill is just markdown — nothing magical about the delivery mechanism.

If you don't use any of those three editors yet, the CLI is on the way — see [`cli/`](./cli) for the planned interface and roadmap.

## How it works

`/wayfinder` runs in one of two modes, auto-detected:

| Run | What happens |
|---|---|
| **First run** (no `.wayfinder.json` in project) | Bootstrap: asks about casing / prefix / scope, writes rule files for the agents you use (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`), tags your entire codebase, commits. |
| **Every later run** | Incremental: reads your existing config, finds new or changed files since last run, tags only those. No questions, no surprises. |

Pass `--reset` if you ever want to start the wizard over.

> **Note — two different file types, easy to confuse:**
>
> - `SKILL.md` files in `.claude/`, `.agents/`, `.gemini/` are the **Wayfinder tool itself** — the instructions the agent reads when you run `/wayfinder`.
> - `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` in your project root are **rule files Wayfinder writes for you** during bootstrap, telling future agent work in this project to keep using the convention.
>
> The skill is the tool. The rule files are the policy.

## Naming conventions

You pick three things during bootstrap, and Wayfinder stays consistent forever after:

| Choice | Options | Example |
|---|---|---|
| **Casing** | `camelCase` or `kebab-case` | `aboutHero` vs `about-hero` |
| **Prefix** | none (default) / `wf` / custom | `aboutHero` vs `wf-aboutHero` vs `myco-aboutHero` |
| **Scope** | page-level sections only (default) / all meaningful components | `<section>` only vs sections + cards + banners |

The config lives in `.wayfinder.json` at your project root. Commit it — your collaborators should inherit the same conventions. See [`docs/conventions.md`](./docs/conventions.md) for the full naming pattern reference.

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

- **v0.1** *(current)* — Skill for Claude Code, Codex CLI, and Gemini CLI; JSX/HTML support; bootstrap + incremental
- **v0.2** — Vue and Svelte template parsers, better confidence scoring
- **v0.3** — `npx semantic-wayfinder` CLI for headless use, CI, and editors without Agent Skills support (BYOK)
- **v0.4** — `.wayfinder-patterns.json` for cross-run pattern learning
- *(later)* — Optional render + vision pass for hard-to-classify components

## Repo layout

```
semantic-wayfinder/
├── .claude/skills/wayfinder/SKILL.md    # Claude Code skill (source of truth)
├── .agents/skills/wayfinder/SKILL.md    # Codex CLI / generic skill
├── .gemini/skills/wayfinder/SKILL.md    # Gemini CLI skill
├── cli/                                          # v0.3 placeholder
├── docs/conventions.md                           # naming rules reference
├── examples/                                     # before/after + sample config
├── scripts/sync-skills.sh                        # keeps the three SKILL.md copies in sync
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Issues, pull requests, and naming-convention bikeshedding all welcome — please open an issue before significant changes so we can align on direction.

## License

MIT — see [`LICENSE`](./LICENSE).

## Credits

Concept and original article by [@selfishprimate](https://github.com/selfishprimate). Part of the broader [Plainify](#) toolkit philosophy around sustainable, structurally sound AI-built products.
