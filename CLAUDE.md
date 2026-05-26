# Semantic Wayfinder — Project Context for Claude Code

This file gives you the design context for this repository. Read it before making changes. The reasoning behind each decision matters — when in doubt, preserve the spirit of these decisions rather than the literal implementation.

---

## What this project is

Semantic Wayfinder is an **Agent Skill** that adds one semantic identity class to every page root (`aboutPage`, `homePage`, `dashboardSettingsPage`...) and one to every component root (`contactForm`, `mainHeader`, `docsSidebar`...). The point: when a developer asks an AI agent to "update the contact form" or "edit the about page," the agent can `grep` for `contactForm` or `aboutPage` and land on the right file in one hit, instead of reading every file trying to guess which one was meant.

The whole motivation is **token economics**. Article-level numbers: a single edit request on a utility-only codebase can burn ~1,300 tokens; on a Wayfinder-tagged codebase, ~190 tokens. The skill is the engine that gets a project from one state to the other.

There's a companion article being written (linked from `README.md` once published) that argues the broader case — call it "Semantic Wayfinding" as a concept that sits on top of Tailwind's "Locality of Behavior" idea, not against it.

**Important — grammar history.** The v0.1 release used a `pageContext + componentRole` pattern (e.g., `aboutHero`, `aboutTestimonials`). That pattern was replaced in v0.1.1 because reusable components carrying page-prefixed names would lie when used on a different page. The current grammar is: pages get `{page}Page`; components get their filename camelCased (with `main`/domain prefix only on role collision). Do not reintroduce page-prefixed component names. See `docs/conventions.md` for the active grammar and `wiki/THE_STORY_BEHIND_THE_PROJECT.md` for the historical design conversation.

## The current state of the project (v0.1.1)

- The skill itself is fully specified in three identical `SKILL.md` files (see "Repo structure" below).
- The CLI is **not yet built**. It's a placeholder in `cli/README.md` with the planned interface and roadmap.
- There are no tests, no build system, no package manager. The skill is just markdown.
- Nothing has been published yet — no npm, no GitHub release, no Medium article live.

What's working: the skill instructions, the editor coverage (Claude Code, Codex CLI, Gemini CLI), the sync script, the documentation, before/after examples.

What needs work: real-world testing on actual codebases, the CLI implementation, possibly Vue/Svelte support, the article being published.

## Repo structure

```
semantic-wayfinder/
├── .claude/skills/wayfinder/SKILL.md   ← source of truth
├── .agents/skills/wayfinder/SKILL.md   ← synced copy (Codex CLI, generic Agent-Skills agents)
├── .gemini/skills/wayfinder/SKILL.md   ← synced copy (Gemini CLI)
├── scripts/sync-skills.sh               ← keeps the three SKILL.md copies in sync
├── cli/                                 ← v0.3 placeholder, just README
├── docs/conventions.md                  ← naming rules reference
├── examples/                            ← before.tsx, after.tsx, .wayfinder.json
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── .gitignore
└── CLAUDE.md                            ← this file
```

## The naming convention you should know

This is intentional and was the result of a long conversation. Don't change these casually:

| Thing | Name | Why |
|---|---|---|
| Command | `/wayfinder` | Matches the skill folder, easy to type |
| Skill folder | `wayfinder` | Same as command for consistency |
| Config file in user projects | `.wayfinder.json` | Brand-aligned, descriptive |
| Repo name | `semantic-wayfinder` | Long-form brand name for discovery |
| Future npm package | `semantic-wayfinder` | Long-form for npm search |
| Brand / article title | "Semantic Wayfinder" | Two words for marketing copy |

So: short word for daily use, long phrase for marketing. Both names earn their place.

## Two file types people will confuse — be careful with this distinction

This came up multiple times during design. Always be precise about which one you're talking about.

**`SKILL.md` files** (`.claude/skills/wayfinder/`, `.agents/skills/wayfinder/`, `.gemini/skills/wayfinder/`)
These are **the Wayfinder tool itself** — the instructions that an agent reads when the user types `/wayfinder`. They live in *this* repo.

**`CLAUDE.md` / `GEMINI.md` / `AGENTS.md` files** (in a user's project root, written by the bootstrap step)
These are **the rule files Wayfinder writes for the user** during the first `/wayfinder` run. They tell the user's editor "when you generate new components in this project, follow the convention." Wayfinder doesn't run from these — they're the policy file Wayfinder leaves behind in user projects.

If a contributor or future Claude says "edit CLAUDE.md," figure out which one they mean first. The CLAUDE.md you're reading right now is a *third* category — it's project context for this repo only.

## The three SKILL.md copies — DO NOT edit them all by hand

`.claude/skills/wayfinder/SKILL.md` is the **source of truth**. The other two (`.agents/`, `.gemini/`) are byte-identical copies kept in sync by `scripts/sync-skills.sh`.

When you change the skill, edit only the `.claude/` copy and then run:

```bash
./scripts/sync-skills.sh
```

There's also `./scripts/sync-skills.sh --check` for CI — it exits non-zero if the copies have drifted.

Why this design: symlinks break on Windows and some Git GUI clients, and we want future flexibility to let the copies diverge (e.g. editor-specific tone). Two files + a script is the boring-but-reliable answer.

## Major design decisions and what's behind them

Each of these was discussed at length. Don't reverse them without good reason.

### One command, two modes (no separate `/wayfinder-init`)

`/wayfinder` figures out if it's a first run (no `.wayfinder.json`) or an incremental run (config exists) and behaves accordingly. The user doesn't have to remember a separate init command.

### Bootstrap automatically continues into tagging

When `/wayfinder` runs the first time, after the wizard collects preferences and writes config + rule files, it asks: "Tag your existing codebase now?" and proceeds into the tagging engine without requiring a second command.

### Track is passive, not active

Wayfinder does **not** watch the file system or run as a daemon. New components stay compliant because the rule files (`CLAUDE.md`/`GEMINI.md`/`AGENTS.md`) tell agents to follow the convention when generating new code. To catch drift, the user re-runs `/wayfinder` — which only touches new or changed files.

### No render + vision

We considered using a headless browser to render components and a vision model to compare against UI kit references. Decision: not worth it. Most components reveal their identity through code (HTML tag, headings, body text, structural patterns). The render path adds enormous infrastructure cost for marginal accuracy gain.

### Confidence-based interaction

The engine assigns each candidate identity a confidence level: high → tag silently, medium → tag and flag for review, low → ask the user. The user can also bulk-apply a chosen name to similar components within the same run.

### Git safety is non-negotiable

Wayfinder refuses to modify files when the working tree is dirty. It always commits its own changes with a clear message. This is a hard rule. Don't add bypass flags.

### Additive only, never destructive

Wayfinder never removes utility classes, never reformats surrounding code, never overwrites existing semantic classes that match the convention. The identity class goes *first* in the className list, utilities follow.

### Markdown is the entire implementation

There's no parser, no AST traversal in code, no Node.js. The skill is just instructions; the agent reading it (Claude Code, Codex, Gemini) does the heavy lifting. This is intentional for v0.1. The CLI in v0.3 will introduce actual code.

## Things explicitly *not* in scope for v0.x

- Hosted cloud service for the CLI (privacy concerns, infrastructure cost)
- GUI or web dashboard
- File system watchers / background daemons
- Local LLM support (Ollama) — quality on small models isn't there for code understanding
- Adding new naming convention options without a clear case
- Making the three skill copies behave differently (until we explicitly decide to)
- Vue and Svelte support — slated for v0.2, not v0.1
- Tests, build system, CI infrastructure — none of this exists yet, add it deliberately

## Where to look when you have a question

- **Skill behavior**: `.claude/skills/wayfinder/SKILL.md`
- **Naming rules**: `docs/conventions.md`
- **What the user sees first**: `README.md`
- **Contribution norms**: `CONTRIBUTING.md`
- **Planned CLI scope**: `cli/README.md`

If a question crosses these, the answer is usually in the conversation log that produced this project (not committed to the repo — that lives in the founder's chat history).

## Working style suggestions

A few things that worked during design and that I'd want to preserve:

- **Ask before doing.** When a design choice has trade-offs, surface them and let the user pick. Don't optimize in silence.
- **Avoid over-engineering.** This project flirted with a `templates/` folder and a `packages/` monorepo wrapper and both got cut because they weren't earning their complexity. The bias is toward fewer files, flatter structure, less indirection.
- **Names matter.** A lot of time went into picking `wayfinder` over `semantic-wayfinder` for the daily-use name. Treat naming changes as design changes.
- **Honesty about uncertainty.** The token-economics numbers in the article are modeled, not measured from real agent runs. Don't tighten the language to sound more certain than it is.

---

When you're ready to make a change, start by reading the relevant `SKILL.md` (the source-of-truth copy in `.claude/`). Test against a small mock project before committing. Run `./scripts/sync-skills.sh` to propagate.
