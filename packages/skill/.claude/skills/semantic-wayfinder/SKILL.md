---
name: semantic-wayfinder
description: Tags components in your codebase with semantic identity classes so AI agents can target them precisely instead of guessing. Reduces token burn and back-and-forth on edit requests. Runs on first invocation to set up the project; subsequent invocations only touch new or changed files.
version: 0.1.0
license: MIT
homepage: https://github.com/selfishprimate/semantic-wayfinder
---

# Semantic Wayfinder

A component-identity layer for AI-assisted codebases. Adds a single semantic class to each component (e.g. `aboutHero`, `dashboardSidebar`, `pricingFAQ`) so agents can `grep` and target precisely instead of reading entire files trying to figure out which `<section>` you meant.

The skill is invoked with a single command: `/wayfind`. On first run it bootstraps the project. On every later run it only processes what's new or changed. Users do not need to think about modes — the command figures out where it is.

## When to use this skill

Invoke this skill when the user:

- Types `/wayfind` or `/wayfind <path>` in Claude Code
- Asks to "tag components" or "add semantic class names" to their codebase
- Mentions Semantic Wayfinding by name
- Wants AI agents to find their components more reliably

Do not invoke this skill for unrelated styling, refactoring, or formatting tasks.

## Core behavior: one command, two modes

On invocation, check the project root for a `.wayfinder.json` configuration file.

- **No config file present** → run **bootstrap mode** (full setup + full-codebase tagging)
- **Config file present** → run **incremental mode** (tag only new or changed files)
- **`--reset` flag passed** → wipe config and re-run bootstrap

In either mode, never modify files when the working tree is dirty. Always check `git status` first and ask the user to stash or commit before proceeding. After successful work, create an automatic commit with a clear message.

---

## Bootstrap mode (first run)

### Step 1 — Welcome

Show a short greeting:

> Semantic Wayfinder will give your components an identity layer so AI agents can target them precisely. I'll ask a few questions, set up the rules, then tag your existing components. Takes about a minute.

### Step 2 — Detect editors

Scan the project root for existing AI editor configuration:

- `CLAUDE.md` or `.claude/` directory → Claude Code is in use
- `GEMINI.md` → Gemini CLI is in use
- `AGENTS.md` → Codex CLI or generic agent setup is in use

Report what was found. Then ask the user which AI editors they plan to use going forward (multi-select: Claude Code, Gemini CLI, Codex CLI, Other). Instruction files will be written for all selected editors.

### Step 3 — Naming convention

Ask three questions in sequence. Show a live preview after each answer so the user sees what their choices produce.

**Q1 — Casing:**
- `camelCase` (e.g. `aboutHero`)
- `kebab-case` (e.g. `about-hero`)

**Q2 — Prefix:**
- No prefix (default)
- Yes, use `wf` (e.g. `wf-aboutHero` or `wfAboutHero` depending on casing)
- Yes, custom — let the user type their own (e.g. `myco`)

**Q3 — Scope:**
- Page-level sections only (recommended): tag `<section>`, `<header>`, `<aside>`, `<nav>`, `<footer>`, `<main>`, and top-level layout `<div>`s
- All meaningful components: also tag reusable components like cards, banners, buttons inside identifiable groups

Then summarize:

> Got it. With these choices, your components will look like:
> - `wf-about-hero` / `wf-about-testimonials` / `wf-dashboard-sidebar`
> Confirm to proceed.

### Step 4 — Git cleanliness check

Run `git status --porcelain`. If output is non-empty:

> Your working tree has uncommitted changes. Please commit or stash them before I make changes, so anything I do is easy to review and revert.

Wait for the user to clean up. Re-check before proceeding.

### Step 5 — Write configuration

Create `.wayfinder.json` in the project root with the following structure:

```json
{
  "version": "0.1.0",
  "casing": "camelCase | kebab-case",
  "prefix": "wf | custom-string | null",
  "scope": "sections | all",
  "editors": ["claude-code", "gemini-cli", "codex-cli"],
  "createdAt": "ISO-8601 timestamp",
  "lastRunAt": "ISO-8601 timestamp"
}
```

This file is the source of truth for every subsequent run. Do not gitignore it — it should be committed so collaborators inherit the same conventions.

### Step 6 — Write instruction files

For each selected editor, read the matching template from the skill's `templates/` directory, fill in the placeholders from the user's config, and write the result into the project root.

| Editor | Source template | Destination file |
|---|---|---|
| Claude Code | `templates/CLAUDE.md.template` | `CLAUDE.md` |
| Gemini CLI | `templates/GEMINI.md.template` | `GEMINI.md` |
| Codex CLI / generic | `templates/AGENTS.md.template` | `AGENTS.md` |

The templates live alongside this skill at `packages/skill/templates/` in the Semantic Wayfinder repo. When the skill is installed in a user's project (at `.claude/skills/semantic-wayfinder/`), the templates may need to be co-located — either copied next to `SKILL.md` during install, or fetched from the user's clone of the Wayfinder repo. The skill should locate them in this priority order:

1. `.claude/skills/semantic-wayfinder/templates/` (co-located with the skill)
2. Any `semantic-wayfinder/packages/skill/templates/` path in the project tree
3. As a fallback, generate the file content inline from the placeholder mapping below (warn the user that templates were not found)

**Placeholder mapping**, filled from `.wayfinder.json`:

| Placeholder | Source | Example |
|---|---|---|
| `{{CASING}}` | `config.casing` | `camelCase` |
| `{{PREFIX}}` | `config.prefix` or "none" | `wf-`, `myco-`, or `none` |
| `{{SCOPE}}` | `config.scope` | `sections` or `all` |
| `{{SCOPE_DESCRIPTION}}` | Mapped from scope | `"tag <section>, <header>, <aside>, <nav>, <footer>, <main>, and top-level layout <div>s"` (for `sections`) or `"all of the above plus reusable cards, banners, and groups inside identifiable contexts"` (for `all`) |
| `{{PREFIX_EXAMPLE}}` | Prefix formatted for the casing | `wf-` (kebab + wf), `wf` (camel + wf), `` (none) |
| `{{EXAMPLE_HERO}}` | Live example | `aboutHero`, `wf-aboutHero`, or `wfAboutHero` |
| `{{EXAMPLE_TESTIMONIALS}}` | Live example | `aboutTestimonials`, `wf-about-testimonials`, etc. |
| `{{EXAMPLE_SIDEBAR}}` | Live example | `dashboardSidebar`, etc. |
| `{{EXAMPLE_FAQ}}` | Live example | `pricingFAQ`, etc. |

**If the destination file already exists** (e.g. user already has a `CLAUDE.md`):
- Do not overwrite. Append the rendered template content under a clearly delimited section, prefixed with `<!-- Begin: Semantic Wayfinder rules -->` and closed with `<!-- End: Semantic Wayfinder rules -->`.
- If a Wayfinder block already exists between those delimiters, replace it. Don't accumulate stale blocks across runs.

### Step 7 — Tag the existing codebase

Proceed automatically into the tagging phase (described in "Tagging Engine" below). The user does not need to issue a second command.

### Step 8 — Commit

Stage `.wayfinder.json`, the editor instruction files, and all tagged source files. Create a single commit:

```
chore: set up semantic wayfinder

- Add .wayfinder.json with project conventions
- Add instruction files for <selected editors>
- Tag <N> components with semantic identity classes
```

### Step 9 — Closing message

Tell the user what happened and what to do next:

> Done. Tagged `N` components, skipped `M` ambiguous ones (you can run `/wayfind` again to revisit them).
>
> From now on, when an AI agent in this project creates new components, it'll add semantic classes automatically. When you've made significant changes and want to catch any drift, run `/wayfind` again — it will only touch what's new or changed.

---

## Incremental mode (subsequent runs)

Triggered when `.wayfinder.json` already exists.

### Step 1 — Acknowledge state

Read `.wayfinder.json`. Show a brief status line:

> Found existing Wayfinder config (casing: camelCase, prefix: wf-). Looking for new or untagged components.

Do not re-ask any setup questions. The config is the source of truth.

### Step 2 — Identify scope of work

Find untagged components by combining two signals:

- **Changed files since last run**: `git log --since="<lastRunAt>" --name-only --pretty=format:` then filter to source files in scope (`.tsx`, `.jsx`, `.html`, `.vue`, `.svelte` — whatever the project uses)
- **Files containing untagged in-scope elements**: regardless of git history, find any `<section>`, `<header>`, etc. in the configured scope that lacks a semantic class matching the project's prefix and casing convention

If both sets are empty, tell the user everything is up to date and exit:

> Everything looks tagged. No new or changed components to handle.

### Step 3 — Git cleanliness check

Same as bootstrap step 4.

### Step 4 — Run the tagging engine

Use the same engine as bootstrap. Use the existing config — do not improvise convention.

### Step 5 — Commit

```
chore: wayfind incremental update

- Tag <N> new or changed components
```

Update `lastRunAt` in `.wayfinder.json` and include it in the commit.

---

## The tagging engine

This is the core logic. It runs in both modes.

### Input
- A set of files to process
- The project's `.wayfinder.json` config

### Per-component algorithm

For each file in scope, parse out candidate components — elements that match the scope rule (sections only, or all meaningful components). For each candidate:

**1. Skip if already tagged.** A component is "already tagged" if its className list contains a token that matches the prefix + casing convention. Never overwrite existing semantic classes.

**2. Gather identity signals.** Collect these data points:

- **Path context**: the file's location reveals page/route context. `app/about/page.tsx` → "about" context. `app/dashboard/settings/page.tsx` → "dashboard settings" context. `components/ui/Button.tsx` → reusable UI primitive.
- **Element type**: `<section>`, `<header>`, `<aside>`, `<nav>`, `<footer>`, etc. Each implies a role.
- **Heading text**: any `<h1>`, `<h2>`, or `<h3>` inside the component. Strong signal of purpose.
- **Body text fragments**: words like "subscribe", "testimonials", "pricing", "FAQ", "newsletter" inside the component.
- **Structural patterns**: three repeated child elements often means a card grid (features, testimonials, pricing tiers, team members). A form with email + button often means newsletter or contact. Sticky positioning + nav links means header.
- **Sibling order**: a component's position relative to its siblings in the same file gives ordering context. The first section after `<main>` in a page is usually a hero.

**3. Form a candidate identity.** Combine the signals into a `pageContext` + `componentRole` pair:

- `pageContext`: derived from path. `app/about/page.tsx` → "about". `app/dashboard/page.tsx` → "dashboard".
- `componentRole`: derived from element + headings + body + structure.

Examples:
- `<section>` with `<h1>` containing "We build tools…" in `app/about/page.tsx` → `aboutHero`
- `<section>` with three repeated cards and the word "testimonials" anywhere → `aboutTestimonials`
- `<aside className="sticky">` with nav links in `app/dashboard/layout.tsx` → `dashboardSidebar`

**4. Apply convention.** Format the candidate using the config's casing and prefix:

- `camelCase` + no prefix → `aboutHero`
- `camelCase` + `wf` prefix → `wfAboutHero`
- `kebab-case` + `wf` prefix → `wf-about-hero`

**5. Assign confidence.** Rate the candidate identity:

- **High**: clear signals across at least three data points (e.g. element type matches, heading text matches role, path context matches)
- **Medium**: signals are partially conflicting or only two of the three present
- **Low**: very little distinguishing signal — generic `<div>` with no headings, no clear structural pattern

**6. Act on confidence:**

- **High** → write the class to the file directly. Add to the high-confidence summary.
- **Medium** → write it but flag it for the user to review.
- **Low** → ask the user.

### Interactive prompts for low-confidence components

Show a focused prompt per component:

```
[12/42] components/PromoBanner.tsx — line 8

  <section className="px-6 py-12 bg-gradient-to-r ...">
    <h2>Limited time offer</h2>
    <p>Get 30% off until midnight</p>
    <button>Claim now</button>
  </section>

My best guesses:
  1) promoBanner
  2) ctaBanner
  3) saleAnnouncement
  4) Type your own
  5) Skip this one
```

After the user answers, store the choice and apply the convention. Then check whether other low-confidence candidates in the project share strong structural similarity — if yes, suggest applying the same name in a batch:

```
I found 3 other components that look very similar. Apply `promoBanner` to all of them?
[Yes, all] [Show me each] [No, ask one by one]
```

### Pattern learning within a run

Track user choices in memory during a run. If a user names a component with a structural signature, prefer that name for structurally similar components later in the same run. Do not persist this across runs in V1 — the config file holds conventions, not specific name-to-pattern mappings.

### File modification rules

When writing a semantic class into a file:

- The semantic class goes **first** in the className list
- Existing classes are preserved in order
- For JSX: `className="aboutHero px-6 py-20 bg-neutral-50"`
- For HTML: `class="aboutHero px-6 py-20 bg-neutral-50"`
- For Vue: `class="aboutHero px-6 py-20"` (in template) or `:class` (preserve dynamic bindings, prepend to the static portion)
- For Svelte: same as HTML
- Never reformat surrounding code. Preserve indentation, quotes, line breaks.

### What never to tag

- Components already carrying a semantic class matching the project's prefix and casing
- Pure utility wrappers with no semantic role (e.g. `<div className="flex">` containing only a single child — these are layout primitives)
- Generated files (`node_modules`, `.next`, `dist`, `build`)
- Test files (`*.test.*`, `*.spec.*`) by default, unless the user explicitly includes them
- Files inside paths gitignored by the project

---

## Output and reporting

After each run, present a structured summary:

```
Semantic Wayfinder — Run Summary

Mode: bootstrap (first run) | incremental
Files scanned: 57
Components found in scope: 134
Already tagged: 0 | 89
Newly tagged: 47 (high confidence) + 6 (after review)
Skipped: 12 (low confidence, user declined)

Committed as: chore: set up semantic wayfinder
```

If anything went wrong (parse errors, unreadable files, git problems), report it clearly without aborting the entire run — partial progress is better than total failure.

---

## Things the skill must never do

- Never modify files when git is dirty without explicit user override
- Never overwrite existing semantic classes that match the project's conventions
- Never tag components with low confidence without asking the user
- Never invent new naming conventions mid-run; always use `.wayfinder.json`
- Never tag files outside of source directories (no `node_modules`, no build output)
- Never delete utility classes or change styling — Semantic Wayfinding is additive only
- Never silently skip files due to parse errors — always report them in the summary
- Never change `.wayfinder.json` configuration during an incremental run — that's what `--reset` is for

---

## Flags

- `/wayfind` — default behavior (bootstrap or incremental, auto-detected)
- `/wayfind <path>` — limit work to a specific directory
- `/wayfind --reset` — wipe `.wayfinder.json` and re-run bootstrap (asks for confirmation first)
- `/wayfind --dry-run` — analyze and report what would change, without writing any files
- `/wayfind --check` — same as `--dry-run` but exits with non-zero status if untagged components exist (useful for CI)
