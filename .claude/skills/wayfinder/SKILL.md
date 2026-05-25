---
name: wayfinder
description: Tags components in your codebase with semantic identity classes so AI agents can target them precisely instead of guessing. Reduces token burn and back-and-forth on edit requests. Runs on first invocation to set up the project; subsequent invocations only touch new or changed files.
version: 0.1.0
license: MIT
homepage: https://github.com/selfishprimate/semantic-wayfinder
---

# Semantic Wayfinder

A component-identity layer for AI-assisted codebases. Adds a single semantic class to each component (e.g. `aboutHero`, `dashboardSidebar`, `pricingFAQ`) so agents can `grep` and target precisely instead of reading entire files trying to figure out which `<section>` you meant.

The skill is invoked with a single command: `/wayfinder`. On first run it bootstraps the project. On every later run it only processes what's new or changed. Users do not need to think about modes — the command figures out where it is.

## When to use this skill

Invoke this skill when the user:

- Types `/wayfinder` or `/wayfinder <path>` in Claude Code
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
- Yes, use `wf` (e.g. `wfAboutHero` with camelCase or `wf-about-hero` with kebab-case — the prefix style follows the casing, never mixes the two)
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
  "lastRunAt": "ISO-8601 timestamp",
  "tagged": {}
}
```

This file is the source of truth for every subsequent run. Do not gitignore it — it should be committed so collaborators inherit the same conventions.

The `tagged` field is the **manifest** — a record of every identity class Wayfinder has written, keyed by file path:

```json
"tagged": {
  "app/about/page.tsx": ["aboutHero", "aboutContact"],
  "app/page.tsx": ["homeHero", "homeTestimonials"],
  "components/Header.tsx": ["globalHeader"]
}
```

The manifest is the only safe way to distinguish Wayfinder's additions from semantic classes a user wrote by hand. `--remove` reads from it; pattern matching alone would risk deleting user-authored classes that happen to match the convention. The manifest starts empty during Step 5 and is appended to during Step 7.

### Step 6 — Write instruction files

For each editor the user selected, write a file in the project root containing the Wayfinder rules. The file content is given verbatim below — substitute the values from `.wayfinder.json` into the placeholders.

**Placeholder substitution.** Resolve each placeholder once and reuse the same value in every file. From `.wayfinder.json`:

| Placeholder | Source | Example |
|---|---|---|
| `{{CASING}}` | `config.casing` | `camelCase` |
| `{{PREFIX}}` | `config.prefix` or "none" | `wf-`, `myco-`, or `none` |
| `{{SCOPE}}` | `config.scope` | `sections` or `all` |
| `{{SCOPE_DESCRIPTION}}` | Mapped from scope | for `sections`: "tag `<section>`, `<header>`, `<aside>`, `<nav>`, `<footer>`, `<main>`, and top-level layout `<div>`s"; for `all`: "all of the above plus reusable cards, banners, and groups inside identifiable contexts" |
| `{{PREFIX_EXAMPLE}}` | Prefix formatted for the casing | `wf-` (kebab + wf), `wf` (camel + wf), empty string (no prefix) |
| `{{EXAMPLE_HERO}}` | Live example for an About page hero | `aboutHero` (camel, no prefix), `wfAboutHero` (camel + `wf`), or `wf-about-hero` (kebab + `wf`) — never mix the two casings |
| `{{EXAMPLE_TESTIMONIALS}}` | Live example for About testimonials | `aboutTestimonials`, `wf-about-testimonials`, etc. |
| `{{EXAMPLE_SIDEBAR}}` | Live example for a dashboard sidebar | `dashboardSidebar`, etc. |
| `{{EXAMPLE_FAQ}}` | Live example for a pricing FAQ | `pricingFAQ`, etc. |

**If a destination file already exists** (e.g. the user already has a `CLAUDE.md`):
- Do not overwrite. Append the rendered content under a clearly delimited section, opened with `<!-- Begin: Semantic Wayfinder rules -->` and closed with `<!-- End: Semantic Wayfinder rules -->`.
- If a Wayfinder block already exists between those delimiters, replace it. Don't accumulate stale blocks across runs.

---

#### Claude Code → write to `CLAUDE.md`

```markdown
# Project rules for Claude Code

This file gives Claude project-specific context. Anything below applies to every conversation in this codebase unless the user overrides it.

---

## Semantic Wayfinding

This project uses **Semantic Wayfinder** to give every component an identity class that lives alongside its utility classes. The point: when the user asks you to edit "the testimonials section on the about page," you should be able to find it with one `grep` instead of reading through every file to figure out which `<section>` they meant.

### The naming convention for this project

- **Casing**: `{{CASING}}`
- **Prefix**: `{{PREFIX}}`
- **Scope**: `{{SCOPE}}`

Configuration is locked in `.wayfinder.json` at the project root. Always read from there if you need to confirm — never improvise.

### Naming pattern

```
{{PREFIX_EXAMPLE}}<pageContext><componentRole>
```

- **pageContext** is derived from the file path. `app/about/page.tsx` → `about`. `app/dashboard/settings/page.tsx` → `dashboardSettings`.
- **componentRole** is derived from what the component does: `hero`, `testimonials`, `cta`, `sidebar`, `faq`, `pricing`, `features`, `newsletter`, `footer`, etc.

### Examples for this project

- About page hero → `{{EXAMPLE_HERO}}`
- About page testimonials → `{{EXAMPLE_TESTIMONIALS}}`
- Dashboard sidebar → `{{EXAMPLE_SIDEBAR}}`
- Pricing FAQ → `{{EXAMPLE_FAQ}}`

### Rules when creating or modifying components

1. **Always add a semantic identity class first** in the `className` list when you create a new component that matches the scope ({{SCOPE_DESCRIPTION}}).
2. **Never remove utility classes** — Semantic Wayfinder is additive. The identity class lives in front of utilities, not in place of them.
3. **Never overwrite an existing semantic class** that already matches this project's convention.
4. **Don't tag layout primitives.** A `<div className="flex">` with one child is not a semantic component; leave it alone.
5. **Don't tag generated or test files** (`node_modules`, `.next`, `dist`, `*.test.*`, `*.spec.*`).
6. **Shared / reusable components need a scope, never a bare role.** When creating something in `components/`, `src/components/`, or `app/_components/`, the identity class must combine a scope and a role — never just `header`, `footer`, `sidebar`, `nav` on their own.
   - `components/Header.tsx` → `globalHeader` (not `header`, not `Header`, not `MarketingHeader` unless the file is actually `MarketingHeader.tsx`).
   - `components/MarketingHeader.tsx` → `marketingHeader` (the filename already carries the scope; convert PascalCase to the project casing).
   - `components/admin/AdminSidebar.tsx` → `adminSidebar`.
   - Use `global` as the default scope for site-wide components; use `main` only if the project has multiple distinct top-level surfaces and `global` would feel too broad. Stay consistent within a project.
7. **Never echo a filename's PascalCase as the identity class.** The casing always follows `.wayfinder.json` (camelCase or kebab-case). `MarketingHeader.tsx` becomes `marketingHeader`, never `MarketingHeader`.

### When the user asks you to edit a specific component

The semantic class is your fastest path. Reach for `grep` (or your equivalent search tool) on the identity class first — single hit, single target, no detective work.

### When the user wants to bulk-tag the codebase

They should run `/wayfinder` (the Semantic Wayfinder skill). Don't try to retroactively tag the whole codebase yourself in a single conversation; that's what the skill is for. Just keep new code Wayfinder-compliant.

### When the user wants to remove Wayfinder

They should run `/wayfinder --remove`. The skill reads its own manifest in `.wayfinder.json` and strips only the classes it originally added — leaving utility classes and any semantic classes the user wrote by hand untouched. Don't attempt to grep-and-strip classes yourself; it would risk deleting user-authored work.
```

---

#### Gemini CLI → write to `GEMINI.md`

```markdown
# Project Instructions for Gemini

This file provides Gemini with project-specific guidance. These rules apply to all code generation and modification within this repository.

---

## Semantic Wayfinding Convention

This project uses **Semantic Wayfinder** — every component carries a semantic identity class alongside its utility classes. This makes component targeting predictable and reduces token cost on edit requests.

### Project Configuration

| Setting | Value |
|---|---|
| Casing | `{{CASING}}` |
| Prefix | `{{PREFIX}}` |
| Scope | `{{SCOPE}}` |

The canonical configuration lives in `.wayfinder.json` at the project root. Reference it for the authoritative values.

### Naming Pattern

Identity classes follow this structure:

```
{{PREFIX_EXAMPLE}}<pageContext><componentRole>
```

- `pageContext`: derived from the file path
  - `app/about/page.tsx` → `about`
  - `app/dashboard/settings/page.tsx` → `dashboardSettings`
- `componentRole`: derived from the component's purpose
  - Common roles: `hero`, `testimonials`, `cta`, `sidebar`, `faq`, `pricing`, `features`, `newsletter`, `footer`, `header`

### Concrete Examples

| Component | Resulting class |
|---|---|
| About page hero | `{{EXAMPLE_HERO}}` |
| About page testimonials | `{{EXAMPLE_TESTIMONIALS}}` |
| Dashboard sidebar | `{{EXAMPLE_SIDEBAR}}` |
| Pricing FAQ | `{{EXAMPLE_FAQ}}` |

### Required Behavior

When generating or modifying components in this project:

1. **Add the semantic identity class as the first class** in the `className` (JSX) or `class` (HTML/Vue/Svelte) attribute, before any utility classes.
2. **Preserve all utility classes.** Semantic Wayfinder is strictly additive; never remove or replace utility classes.
3. **Never overwrite an existing semantic class** that already matches the project's convention.
4. **Respect the scope.** This project uses `{{SCOPE}}` scope: {{SCOPE_DESCRIPTION}}.
5. **Do not tag layout primitives.** Generic wrappers (e.g. `<div class="flex">` containing a single child) should not receive identity classes.
6. **Exclude generated and test files** from tagging: `node_modules`, `.next`, `dist`, `build`, `*.test.*`, `*.spec.*`.
7. **Shared components require a scope, never a bare role.** For files under `components/`, `src/components/`, `app/_components/`, etc., the identity class must combine a scope word with the role. `components/Header.tsx` → `globalHeader`. `components/MarketingHeader.tsx` → `marketingHeader`. `components/admin/AdminSidebar.tsx` → `adminSidebar`. Never produce `header`, `footer`, `sidebar`, or `nav` on their own — they collide and break the grep-ability guarantee. Use `global` as the default scope; use `main` only when the project has multiple top-level surfaces.
8. **Casing follows `.wayfinder.json`, not the filename.** A PascalCase filename like `MarketingHeader.tsx` becomes `marketingHeader` in camelCase or `marketing-header` in kebab-case — never `MarketingHeader`.

### Component Targeting

When the user requests an edit to a named component, the semantic class is the most efficient path to locate it. Use `grep` or your equivalent search tool against the identity class for direct targeting.

### Bulk Tagging

The user can run the Semantic Wayfinder tooling to retroactively tag the codebase. Do not attempt full-codebase tagging during normal conversations; maintain compliance for newly generated code only.

### Removing Wayfinder

If the user wants to remove Wayfinder from this project, direct them to run `/wayfinder --remove`. That command consults the manifest in `.wayfinder.json` and strips only Wayfinder-added classes — never utility classes or user-authored semantic classes. Do not attempt manual cleanup via grep; it would risk deleting hand-written work.
```

---

#### Codex CLI / generic agents → write to `AGENTS.md`

```markdown
# AGENTS.md

Agent instructions for this repository. Read before generating or modifying code.

---

## Semantic Wayfinding

This project applies **Semantic Wayfinder**: every in-scope component receives a semantic identity class in addition to its utility classes. The identity class makes components grep-targetable in one shot.

### Convention (locked in `.wayfinder.json`)

- Casing: `{{CASING}}`
- Prefix: `{{PREFIX}}`
- Scope: `{{SCOPE}}`

### Pattern

```
{{PREFIX_EXAMPLE}}<pageContext><componentRole>
```

`pageContext` comes from the file path. `componentRole` comes from the component's structure and content (hero, testimonials, cta, sidebar, faq, pricing, features, newsletter, footer, header, etc.).

### Examples

- `{{EXAMPLE_HERO}}` — About page hero
- `{{EXAMPLE_TESTIMONIALS}}` — About page testimonials
- `{{EXAMPLE_SIDEBAR}}` — Dashboard sidebar
- `{{EXAMPLE_FAQ}}` — Pricing FAQ

### Rules

1. **Place the identity class first** in the class list. Utilities follow.
2. **Additive only.** Do not remove, replace, or reorder existing utility classes.
3. **Idempotent.** If a matching identity class already exists, leave it.
4. **Scope is `{{SCOPE}}`**: {{SCOPE_DESCRIPTION}}.
5. **Do not tag**: pure layout primitives, generated files (`node_modules`, `.next`, `dist`, `build`), test files (`*.test.*`, `*.spec.*`), gitignored paths.
6. **Shared components require a scope.** For files under `components/`, `src/components/`, or `app/_components/`, every identity class must combine a scope word with the role. Examples: `components/Header.tsx` → `globalHeader`; `components/MarketingHeader.tsx` → `marketingHeader`; `components/admin/AdminSidebar.tsx` → `adminSidebar`. Bare role names (`header`, `footer`, `sidebar`, `nav`) are forbidden — they defeat `grep`-based targeting. `global` is the default scope; `main` is an alternative when the project has multiple top-level surfaces.
7. **Casing follows `.wayfinder.json`.** `MarketingHeader.tsx` becomes `marketingHeader` or `marketing-header`, never `MarketingHeader`.

### Targeting an existing component

Grep the identity class. Single hit, single edit. Avoid scanning full files when the convention provides a direct lookup.

### Bulk operations

Full-codebase tagging is handled by the Semantic Wayfinder tooling (`/wayfinder` skill or `npx semantic-wayfinder` CLI when available). Do not perform bulk retroactive tagging in normal task execution; ensure newly generated code is compliant.

### Removal

If the user wants to remove Wayfinder from this project, the correct command is `/wayfinder --remove`. It reads the manifest in `.wayfinder.json` and strips only the identity classes Wayfinder added — utility classes and any user-authored semantic classes are preserved. Do not attempt manual class removal via grep or pattern matching.
```

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

> Done. Tagged `N` components, skipped `M` ambiguous ones (you can run `/wayfinder` again to revisit them).
>
> From now on, when an AI agent in this project creates new components, it'll add semantic classes automatically. When you've made significant changes and want to catch any drift, run `/wayfinder` again — it will only touch what's new or changed.

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
- Update manifest in .wayfinder.json
```

Update `lastRunAt` in `.wayfinder.json` and include it in the commit.

---

## Remove mode (`/wayfinder --remove`)

Triggered when the user explicitly passes `--remove`. This mode is the inverse of tagging — it strips the identity classes Wayfinder previously added, while leaving every other class (utilities, user-authored semantic classes, anything not in the manifest) untouched.

The manifest in `.wayfinder.json` is the **only** source of truth for what gets removed. Pattern matching against the convention is not used — a user-written `aboutContact` (added by hand, never recorded in the manifest) must never be removed.

### Step 1 — Confirm

Removal is destructive in the eyes of the user. Show what will happen and ask for confirmation:

> You're about to remove all Semantic Wayfinder identity classes from this project. I'll strip `N` classes across `M` files (per the manifest in `.wayfinder.json`). Utility classes and any semantic classes you wrote by hand will be preserved.
>
> After removal, do you want me to also delete `.wayfinder.json` and the editor instruction blocks (`CLAUDE.md`/`GEMINI.md`/`AGENTS.md`)? You can re-install at any time by running `/wayfinder`.
>
> 1) Yes, full removal (strip classes + delete config + remove instruction blocks)
> 2) Yes, classes only (strip classes, keep config and instruction blocks)
> 3) Cancel

### Step 2 — Git cleanliness check

Same as bootstrap step 4. Refuse to proceed if the working tree is dirty.

### Step 3 — Strip classes per the manifest

For each `(file, classes[])` entry in `config.tagged`:

1. Open the file.
2. For each class in the array: find it in any `className` / `class` / `:class` attribute and remove it. Preserve:
   - the order of remaining classes
   - the surrounding whitespace, quotes, and indentation
   - any class not in the manifest entry, even if it matches the convention pattern
3. If a class is not found in the file (drift — the file was edited by hand after tagging), skip it and record it as drifted. Do not search other files for it.
4. Once all manifest classes for the file are processed, write the file back.

If the className list ends up empty (`className=""`), preserve the empty attribute — don't delete the attribute itself. The user's downstream tooling decides what to do with empty classes.

### Step 4 — Clean up config and instruction files (if "full removal" was chosen)

- Delete `.wayfinder.json`.
- In each editor instruction file (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) that exists in the project root, locate the `<!-- Begin: Semantic Wayfinder rules -->` … `<!-- End: Semantic Wayfinder rules -->` block and remove it.
  - If the instruction file becomes empty (only the Wayfinder block existed), delete the file.
  - If other content remains, keep the file with the Wayfinder block excised.

### Step 5 — Commit

Single commit:

```
chore: remove semantic wayfinder

- Strip <N> identity classes from <M> files (per manifest)
- Remove .wayfinder.json
- Excise Semantic Wayfinder blocks from instruction files
```

If only "classes only" was chosen, adjust the commit message to reflect that and clear the `tagged` field in `.wayfinder.json` (keep the config and instruction files in place).

### Step 6 — Closing message

> Removed `N` identity classes from `M` files. `D` entries in the manifest had drifted (the class wasn't found in the expected file) and were skipped — these are listed in the report above.
>
> To re-install Wayfinder, run `/wayfinder` from this project root.

### Drift reporting

If any classes were skipped due to drift, report them clearly. The user may want to clean those up by hand or accept them as is. Wayfinder must never guess — silently deleting a class that doesn't match its expected location risks deleting user-authored code.

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

**3. Form a candidate identity.** Combine the signals into a `pageContext` + `componentRole` pair.

**Case A — Page files** (`app/<page>/page.tsx`, `app/<page>/layout.tsx`, `pages/<page>.tsx`, `src/routes/<page>/+page.svelte`, etc.):

- `pageContext`: derived from the path segment. `app/about/page.tsx` → `about`. `app/dashboard/settings/page.tsx` → `dashboardSettings`.
- `componentRole`: derived from element + headings + body + structure.

Examples:
- `<section>` with `<h1>` containing "We build tools…" in `app/about/page.tsx` → `aboutHero`
- `<section>` with three repeated cards and the word "testimonials" anywhere in `app/page.tsx` → `homeTestimonials`
- `<aside className="sticky">` with nav links in `app/dashboard/layout.tsx` → `dashboardSidebar`

**Case B — Shared / reusable components** (anything under `components/`, `src/components/`, `app/_components/`, `lib/components/`, etc. — not bound to a single page):

The same `<pageContext><componentRole>` pattern still applies, but `pageContext` cannot be derived from the path. Resolve it with this priority:

1. **If the filename already carries a scope word**, use it. The PascalCase filename is split on word boundaries; the trailing word becomes the role, the leading word(s) become the context.
   - `components/MarketingHeader.tsx` → context `marketing`, role `header` → `marketingHeader`
   - `components/DashboardSidebar.tsx` → context `dashboard`, role `sidebar` → `dashboardSidebar`
   - `components/BlogPostFooter.tsx` → context `blogPost`, role `footer` → `blogPostFooter`

2. **If the filename is just a bare role** (`Header.tsx`, `Footer.tsx`, `Sidebar.tsx`, `Nav.tsx`), the component is global. Prefix with `global` as the default context:
   - `components/Header.tsx` → `globalHeader`
   - `components/Footer.tsx` → `globalFooter`
   - `components/Nav.tsx` → `globalNav`

   Use `main` instead of `global` if the project clearly has multiple top-level surfaces (e.g. marketing site + dashboard share the same root layout) and `global` would feel too broad. The choice is consistent within one run — don't mix `global` and `main` for the same kind of component.

3. **Bare role names are forbidden.** Never produce just `header`, `footer`, `sidebar`, `nav` as an identity class. They collide with multiple instances and defeat the entire wayfinding purpose. Always carry a scope (`global`, `main`, `marketing`, `dashboard`, …).

4. **Casing always follows config.** Regardless of the filename's PascalCase, the output respects `.wayfinder.json`. `MarketingHeader.tsx` → `marketingHeader` (camelCase) or `marketing-header` (kebab-case), never `MarketingHeader`.

Examples:
- `<header>` in `components/Header.tsx` with nav links → `globalHeader`
- `<footer>` in `components/MarketingFooter.tsx` → `marketingFooter`
- `<aside>` in `components/admin/AdminSidebar.tsx` → `adminSidebar`

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

### Manifest update

Every time Wayfinder writes a new identity class into a file, append it to the `tagged` field in `.wayfinder.json`:

```json
"tagged": {
  "<relative/file/path>": ["<class1>", "<class2>", ...]
}
```

Rules:
- File paths are project-root relative, forward-slashed, regardless of OS.
- Within a file's array, classes appear in the order they were added.
- Never write the same class twice for the same file — if it's already in the manifest, the tagging engine should have skipped the candidate (rule 1 of the per-component algorithm).
- The manifest is persisted at the end of the run alongside the file changes, in the same commit.
- If a file gets renamed or moved between runs, the next incremental run should detect the new path and migrate the manifest entry. If the file is deleted, drop the entry.

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
- Never produce a bare role name (`header`, `footer`, `sidebar`, `nav`) for a shared component — every identity class must carry a scope (`global`, `main`, `marketing`, `dashboard`, etc.) so it stays unique under `grep`
- Never echo a filename's PascalCase as the class name. Casing always follows `.wayfinder.json` — `MarketingHeader.tsx` becomes `marketingHeader` (camelCase) or `marketing-header` (kebab-case), never `MarketingHeader`
- Never remove a class during `--remove` unless it is recorded in the manifest for that exact file path. Pattern-matching the convention is not a substitute for the manifest — a user may have written `aboutContact` by hand
- Never write to the same `tagged` entry without checking for duplicates. If a class is already in the manifest for a file, the candidate should have been skipped earlier in the pipeline

---

## Flags

- `/wayfinder` — default behavior (bootstrap or incremental, auto-detected)
- `/wayfinder <path>` — limit work to a specific directory
- `/wayfinder --reset` — wipe `.wayfinder.json` and re-run bootstrap (asks for confirmation first)
- `/wayfinder --remove` — strip every identity class Wayfinder added (per the manifest), then optionally delete `.wayfinder.json` and the editor instruction blocks. User-authored semantic classes and utilities are preserved. Asks for confirmation first
- `/wayfinder --dry-run` — analyze and report what would change, without writing any files
- `/wayfinder --check` — same as `--dry-run` but exits with non-zero status if untagged components exist (useful for CI)
