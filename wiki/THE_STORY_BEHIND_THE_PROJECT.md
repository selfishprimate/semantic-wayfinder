# Semantic Wayfinder — The Story Behind the Project

> A complete record of the conversation that produced Semantic Wayfinder: the theoretical argument, the design decisions, and the reasoning behind each. Meant as deep context for anyone — human or AI — picking up this project.

> ⚠ **Reading note (current as of v0.4.0):** This story is a frozen historical record of the *original v0.1* design conversation — including the `{pageContext}{ComponentRole}` pattern (`aboutHero`, `aboutTestimonials`) that v0.1.1 replaced and the original v0.2/v0.3 placeholders (Vue/Svelte, CLI) that actual v0.2 / v0.3 shipped *different* work for. For active behavior, consult these instead:
>
> - [`docs/conventions.md`](../docs/conventions.md) — the user-facing grammar (the *what*)
> - [`NAMING_GRAMMAR.md`](./NAMING_GRAMMAR.md) — the design memory for current grammar decisions (the *why*), including the reserved-words rule (v0.1.2), Fragment + wrapper-mod handling (v0.2.0), and dynamic-segment naming
> - [`../CHANGELOG.md`](../CHANGELOG.md) — the actual release history
>
> The rest of this story — the article argument, the LoB engagement, the MBP framing, the editor strategy, the sync mechanism, the tooling decisions — remains accurate and is the deepest source for *why* the project exists.

---

## Part 1 — The article that started everything

### The original observation

Working with AI agents (Cursor, Claude Code) on Tailwind-heavy codebases, the same friction kept appearing: you ask the agent to change "the testimonials section on the about page," and the agent edits the wrong section. It greps for "testimonials," gets four hits across `app/about/page.tsx`, `app/dashboard/page.tsx`, `app/pricing/page.tsx`, and `components/sections/Testimonials.tsx`, and then has to read each one to figure out which you meant.

The friction is consistent. The cause isn't the AI — it's that every component looks the same. Tailwind utility classes describe **appearance**, not **identity**. Two visually distinct components are textually indistinguishable: they both open with `<section className="..."` followed by a pile of utilities.

Components have no name tags. The agent has to play detective on every edit. Detective work burns tokens.

### The first articulation

Frame it as a **component identity crisis**. In Tailwind, the code says "this is gray, centered, has 24px padding" but doesn't say "this is the testimonials section." Humans don't need the second part — context fills it in. AI agents grepping a codebase do need it.

### The opposing view to engage with: Locality of Behavior

There's a strong argument for Tailwind in the AI era — Silvermine AI published a piece called "The Utility-Semantic Paradox" arguing that Tailwind is *exactly* the right CSS strategy for AI: when styling lives inline with the component, the AI doesn't need to load a separate CSS file to understand what something does. All the visual info is local to where the AI is reading.

This is the principle of **Locality of Behavior** (LoB): keep the styling and the structure together, so reading one piece tells you everything about it.

The article needs to take this seriously, not dismiss it.

### The counter-argument: Locality of Identity

Tailwind solves "how does this element look?" It does not solve "what *is* this element?"

These are different questions. LoB makes visual properties local. But the component's **role** — its identity within the page — is still nowhere to be found in the code.

The proposal: **Semantic Wayfinding** — adding one semantic identifier class to each component, alongside its utilities. Not replacing utilities. Adding to them.

```html
<!-- Before -->
<section className="px-6 py-20 bg-neutral-50">

<!-- After -->
<section className="aboutTestimonials px-6 py-20 bg-neutral-50">
```

Locality of Behavior stays intact — utilities are still inline. But now the component also has an identity that an agent can `grep` for. We layered **Locality of Identity** on top of Locality of Behavior. The two principles compose; they don't conflict.

This is the article's central move: it doesn't argue against Tailwind. It argues that Tailwind alone is *incomplete* for AI-assisted development, and the missing piece has a name.

### Naming the concept

The conversation considered "Locality of Identity" as a direct technical mirror of LoB, and "Semantic Wayfinding" as a more designer-friendly framing rooted in wayfinding as a design discipline (signage in airports, route markers in museums). Semantic Wayfinding won because:

- It's a designer's vocabulary applied to a code argument — fits the author's "Design in Code" thesis
- Wayfinding is already a recognized term in design, so it carries weight
- It's evocative without being jargon

The tool that *applies* Semantic Wayfinding is therefore called **Semantic Wayfinder**.

### The article's measurements

To support the argument with numbers, two experiments were run:

**Experiment 1 — Prompt-level tokenization** (using OpenAI's `tiktoken`)

- `"the testimonials section under the hero on the about page"` → 10 tokens (GPT-4)
- `"aboutTestimonials"` → 3 tokens (GPT-4), 2 tokens (GPT-4o)

Roughly **70-80% saving** on the reference phrase alone. The tokenizer splits camelCase at natural boundaries (`['about', 'Test', 'imonials']`), so even long identifier names stay cheap.

**Experiment 2 — Full agent-loop simulation**

Two near-identical mock projects: one utility-only, one Wayfinder-tagged. The same edit request modeled step by step (parse prompt, list directory, grep, read files, reasoning, edit). Every step counted with `tiktoken`.

- Utility-only: **~1,300 tokens** (multiple file reads, ambiguity, clarification turn)
- Wayfinder-tagged: **~190 tokens** (one grep, one read, one edit)

**6.9× cheaper, ~85% saving.** This is the article's headline number.

### Honesty about the measurement

The full-agent-loop simulation is **modeled**, not recorded from a real Cursor or Claude Code session. The article says so explicitly. The exact tool-call pattern varies by model, version, and system prompt. The numbers are a directional signal, not a benchmark.

The reasoning behind including this caveat: technical readers will ask "how did you measure this," and pretending the simulation is more than it is would erode trust. The honest framing — "the ratio is real, the absolute numbers will vary" — is stronger than a false precision claim.

### Where the article ends

The article closes by connecting Semantic Wayfinding to a broader thesis: **Minimum Bearable Product (MBP)**. AI-generated code that "works" isn't enough. It needs structural soundness, identity, the ability to be maintained months later. Vibe coding without identity layers leads to codebases where every interaction with the AI requires re-establishing what each component is.

Wayfinder is one concrete step in turning vibe coding into MBP. The article ends with the announcement that this tool exists — first as a Claude skill, eventually as a CLI.

---

## Part 2 — From article to product

### Why a tool, not just a convention

A blog post saying "you should add semantic identifier classes" is good. A tool that adds them for you is better. The conversation moved quickly from "this is an idea" to "this should be an actual product."

The reasoning: convention asks every developer to do extra manual work. A tool removes that friction. Adoption follows wherever friction is lowest.

### The progression of decisions

The product design unfolded through a sequence of either/or choices, each one constraining the next. Here's the path, with the reasoning at each fork:

#### 1. New-code prevention vs. existing-code remediation

A tool could do two things: (a) ensure new code generated by AI gets semantic classes from the start, or (b) go back over existing untagged code and add semantic classes retroactively. The decision was **both** — the tool handles existing codebases, and also leaves behind rule files (`CLAUDE.md`/`GEMINI.md`/`AGENTS.md`) that keep future AI work compliant.

#### 2. Detection method — content analysis or pattern matching?

Two ways to figure out what a component *is*: read its code (headings, body text, structural patterns) or compare it visually to known UI kit components.

Final answer: **content analysis only**. The conversation briefly considered render + vision (taking screenshots, comparing to Tailwind UI / shadcn references), but cut it. Most components reveal their identity through code anyway. Adding a headless browser and a vision model for marginal accuracy gain is the wrong trade-off.

#### 3. Handling ambiguity — guess, skip, or ask?

When the tool can't confidently identify a component (a generic `<div>` with no headings), what should it do?

Final answer: **confidence-based interaction**. High confidence → tag silently. Medium → tag with a review flag. Low → ask the user, batch where possible, learn from the user's choice within a single run.

#### 4. Naming convention — who decides?

The tool could enforce a single convention, or let the user pick at setup time.

Final answer: **user picks at bootstrap, then stays consistent**. Three choices:
- Casing: `camelCase` or `kebab-case`
- Prefix: none / `wf` / custom
- Scope: page-level sections only (default) / all meaningful components

These get locked in `.wayfinder.json` and never asked again.

#### 5. Editor surface — which agents?

Originally the conversation considered Lovable, v0, Bolt and other browser-based AI builders. Those got cut — they're closed systems with no file system access, you can't run a tool inside them.

Final scope: **Claude Code, Codex CLI, Gemini CLI**. All three are terminal-based, all three have file system access, and — critically — all three support the open **Agent Skills standard** (the same `SKILL.md` format works in all three, just in different folders).

The reasoning for cutting Lovable: pretending to support it would mean two completely different code paths (prevention-only for closed builders, prevention + remediation for terminals). That complexity doesn't pay off.

#### 6. Application surface — skill, CLI, or both?

Final answer: **skill first, CLI later**.

The skill is fast to ship (it's just a markdown file). It validates the idea. CLI development is its own thing — TypeScript, parsing, BYOK API keys, npm publishing. CLI is planned for v0.3 and lives in `cli/` as a placeholder.

The roadmap explicitly says CLI is not v0.1 scope. Don't blur the lines.

#### 7. CLI economics (the one we didn't fully decide)

The conversation hit but didn't resolve: when CLI ships, will it be BYOK (user brings their own Anthropic/OpenAI key), hosted (we run the API calls and bill users), or local (Ollama, etc.)?

Tentative lean toward **BYOK** — minimum infrastructure for us, maximum control for the user, fits open source. But this is genuinely undecided. Don't commit to it in v0.3 design until there's more evidence.

#### 8. Tracking — passive or active?

Should the tool watch the file system and auto-tag new components, or wait to be invoked?

Final answer: **passive only**. The rule files Wayfinder writes (`CLAUDE.md`/`GEMINI.md`/`AGENTS.md`) tell the AI editor "follow this convention when generating new code." That handles new components automatically. To catch drift in existing code, the user re-runs `/wayfinder` — which only touches new or changed files.

No file watchers, no daemons. The tool is a deliberate command, not background magic.

#### 9. One command or two?

Considered: `/wayfinder-init` for setup and `/wayfinder` for routine use.

Final answer: **one command**. `/wayfinder` checks if `.wayfinder.json` exists. If not, bootstrap mode (full setup, full tagging). If yes, incremental mode (only new/changed files). Users don't have to remember a second command.

After bootstrap finishes, the tool automatically continues into tagging — the user doesn't need to type a second command for the initial tag-up.

#### 10. File modification — branch, PR, or in-place?

Final answer: **in-place + git safety belt**. The tool refuses to modify files when the working tree is dirty (asks user to stash/commit first), and creates its own commit when done. No automatic PRs (extra complexity, surprises the user), no branch creation (mismatches some workflows).

#### 11. Repo structure — monorepo or single?

The skill and the CLI share conventions (same `.wayfinder.json` format, same naming logic). Logically related, surface-different.

Final answer: **monorepo from day one**, but flat. No `packages/` wrapper — that's a Node.js convention that only makes sense with workspaces and `package.json`. Wayfinder's skill is markdown, no build system. Putting it under `packages/` adds depth without benefit.

So the final structure is flat at the root:

```
semantic-wayfinder/
├── .claude/skills/wayfinder/SKILL.md
├── .agents/skills/wayfinder/SKILL.md
├── .gemini/skills/wayfinder/SKILL.md
├── scripts/sync-skills.sh
├── cli/
├── docs/
├── examples/
└── ...
```

#### 12. Three skill copies — synced, symlinked, or single?

The Agent Skills standard works across all three editors, but each expects the skill in a different folder. Three options were considered:

- **Symlink**: clean, single file, broken on Windows and some Git GUIs. Cut.
- **Single file referenced by config**: would require building a custom resolver. Over-engineered.
- **Three copies + sync script**: boring, reliable, works everywhere. Allows future divergence if we want it.

Final answer: **three copies**. `.claude/skills/wayfinder/SKILL.md` is the source of truth. `scripts/sync-skills.sh` propagates to the other two. `--check` mode for CI.

#### 13. Naming — long form vs. short form

The conversation went back and forth on whether the daily-use name should be `semantic-wayfinder` or `wayfinder`.

Final answer: **both**. Long form for the brand (repo name, npm package, article title). Short form for daily use (skill folder, command, config file).

| Surface | Name |
|---|---|
| Command | `/wayfinder` |
| Skill folder | `wayfinder` |
| Config file | `.wayfinder.json` |
| Repo | `semantic-wayfinder` |
| npm package (future) | `semantic-wayfinder` |
| Brand / article | "Semantic Wayfinder" |

Daily use is short. Marketing is long. Both names earn their place.

### What we tried and cut

It's worth recording what got built and then removed, so it doesn't get rebuilt by accident:

- **`templates/` folder**: We initially separated the editor instruction files (`CLAUDE.md.template`, `GEMINI.md.template`, `AGENTS.md.template`) into a templates folder. Then realized it was an abstraction with only one consumer (the skill), so we inlined the templates into `SKILL.md` Step 6. The templates are now embedded markdown blocks the skill renders with placeholder substitution.

- **`packages/` wrapper**: Briefly tried a monorepo layout with `packages/skill/` and `packages/cli/`. Cut because Node-style monorepo conventions don't make sense when the skill isn't code.

- **Lovable / v0 / Bolt support**: Considered but cut. Different execution model, would require a different architecture.

- **Render + vision**: Considered but cut. Marginal accuracy gain for huge infrastructure cost.

- **Hosted cloud service**: Considered for CLI economics, then explicitly removed from v0.x scope.

If a future contributor proposes any of these, the burden of proof is high — show why this time is different.

---

## Part 3 — The two file types that confuse everyone

This deserves its own section because it confused the author twice during the design conversation, and will confuse anyone else.

Wayfinder involves **two completely separate file types** that both contain instructions for AI agents. Always know which one you're talking about.

### Type A — SKILL.md files (the Wayfinder tool)

Location in this repo:
- `.claude/skills/wayfinder/SKILL.md`
- `.agents/skills/wayfinder/SKILL.md`
- `.gemini/skills/wayfinder/SKILL.md`

These are read by the agent when the user types `/wayfinder`. They contain the wizard flow, the tagging engine logic, the rules about what to tag and what not to tag, and the embedded templates for what Type B files should look like.

**Edit only the `.claude/` copy. Run `scripts/sync-skills.sh` to propagate.**

### Type B — Rule files Wayfinder writes for users

Location in a user's project (not this repo):
- `<user-project>/CLAUDE.md`
- `<user-project>/GEMINI.md`
- `<user-project>/AGENTS.md`

These are written by Wayfinder during the bootstrap step. Wayfinder fills in placeholders from `.wayfinder.json` (the user's casing, prefix, scope) and saves the result. From then on, when the user's AI editor reads this file, it knows to add semantic identity classes when generating new components.

**These never get edited in this repo. The skill writes them into other projects.**

### And then there's the third CLAUDE.md

There's a `CLAUDE.md` at the root of this repo too. That one is **for Claude Code working on this project** — it's project context, not Wayfinder behavior. If you're reading this Story document, the `CLAUDE.md` next to it is what Claude Code reads when you `cd` into the Wayfinder repo and start a session.

So in total: **three categories of file**, two of which happen to share the name "CLAUDE.md."

Don't confuse them. When in doubt, look at the path.

---

## Part 4 — The reasoning style worth preserving

Some patterns showed up repeatedly in the design conversation and they're worth preserving as the project evolves.

### Surface trade-offs, don't optimize silently

Almost every decision had at least two viable options. The pattern that worked: lay out the options, name the trade-offs, then ask. Don't pick the "obviously right" answer and ship it — there usually wasn't an obviously right answer.

When something feels obvious, that's a flag to be extra suspicious.

### Bias toward less

The project flirted with `templates/`, `packages/`, render + vision, Lovable support, and a hosted CLI service. All got cut. The pattern: every additional layer needs to earn its weight. If you can do without, do without.

This isn't minimalism for its own sake. It's about what a v0.1 contributor needs to understand to be useful. Every extra concept is a tax on that.

### Names are design

The conversation spent real time on `semantic-wayfinder` vs. `wayfinder`, on `/wayfind` vs. `/wayfinder`, on whether the prefix should default to `wf`. These weren't trivial. A name shapes how people talk about the thing, which shapes what the thing becomes.

When proposing a rename, treat it as a design change. Surface the implications.

### Honesty about uncertainty

The article's token-economics numbers are modeled, not measured from real agent runs. The doc says so. That honesty matters — it's the difference between a piece that earns trust and one that gets picked apart on Hacker News.

The same standard applies inside the project. If a feature is experimental, label it. If a measurement is approximate, say so. If a design decision was a coin flip, don't pretend it was inevitable.

### Pace by user understanding

A pattern that worked: when the user said "wait, I don't understand," the right response was always to stop and explain, never to push through. The user being confused is a real signal — usually it means a design choice doesn't survive a fresh look.

Apply the same heuristic with contributors. If they get confused, that's a UX problem, not their problem.

---

## Part 5 — What hasn't happened yet

For accuracy about the project's current state:

- **The article hasn't been published.** The Medium piece referenced throughout this doc is drafted but not live. When it lands, link it from `README.md` and from `cli/README.md`.
- **No real-world testing.** The skill has been specified in detail but never run against an actual codebase. The first run might surface things — be ready to iterate on `SKILL.md` instructions based on what happens.
- **No CLI.** `cli/` is just a README. v0.3 work hasn't started.
- **No tests.** No build system, no CI, nothing. The skill is markdown, so there's nothing to test in the traditional sense, but a `--check` for the sync script could be wired into CI when there is one.
- **Naming is final but the article isn't.** If the article ends up calling things differently, names might need to follow.

When you start work on this project, the most valuable first task is probably: run `/wayfinder` against a small real project (maybe one of the author's own — Plainify, Sketchize, Mossaique, Gerillass) and see where the skill instructions fall short. That feedback is what should drive v0.1.1.

---

## How to use this document

If you're Claude Code in a fresh session: this is your design memory. Read it before making changes. When you encounter a question that isn't covered, ask before assuming — the answer might just have been a coin flip that's worth revisiting.

If you're a future human contributor: same advice. Open an issue before significant changes. The decisions documented here aren't sacred but they have history.

If you're the author returning to this months later: this is the conversation that produced the project, distilled. Use it to remember why each choice was made before changing it.