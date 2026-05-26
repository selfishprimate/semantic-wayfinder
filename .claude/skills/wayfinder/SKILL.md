---
name: wayfinder
description: Tags page roots and component roots in your codebase with semantic identity classes so AI agents can target them precisely instead of guessing. Reduces token burn and back-and-forth on edit requests. Runs on first invocation to set up the project; subsequent invocations only touch new or changed files.
version: 0.1.1
license: MIT
homepage: https://github.com/selfishprimate/semantic-wayfinder
---

# Semantic Wayfinder

A component-identity layer for AI-assisted codebases. Adds one semantic class to each **page root** (`aboutPage`, `dashboardSettingsPage`, ...) and one to each **reusable component root** (`contactForm`, `mainHeader`, `docsSidebar`, ...) so agents can `grep` and target precisely instead of reading entire files trying to figure out which `<section>` you meant.

The skill is invoked with a single command: `/wayfinder`. On first run it bootstraps the project. On every later run it only processes what's new or changed. Users do not need to think about modes — the command figures out where it is.

## When to use this skill

Invoke this skill when the user:

- Types `/wayfinder`, `/wayfinder <path>`, or `/wayfinder --remove` in Claude Code
- Asks to "tag components" or "add semantic class names" to their codebase
- Mentions Semantic Wayfinding by name
- Wants AI agents to find their components more reliably

Do not invoke this skill for unrelated styling, refactoring, or formatting tasks.

## Core behavior: one command, three modes

On invocation, check the project root for a `.wayfinder.json` configuration file and the command-line flags.

- **`--remove` flag passed** → run **remove mode** (strip every class in the manifest)
- **`--reset` flag passed** → wipe config and re-run bootstrap (after confirmation)
- **No config file present** → run **bootstrap mode** (full setup + full-codebase tagging)
- **Config file present** → run **incremental mode** (tag only new or changed files; also re-check for newly introduced collisions)

In every mode, never modify files when the working tree is dirty. Always run `git status` first and ask the user to stash or commit before proceeding. After successful work, create an automatic commit with a clear message.

---

## Bootstrap mode (first run)

### Step 1 — Welcome

Show a short greeting:

> Semantic Wayfinder will give your pages and reusable components an identity layer so AI agents can target them precisely. I'll ask two quick questions, set up the rules, then tag your codebase. Takes about a minute.

### Step 2 — Detect editors

Scan the project root for existing AI editor configuration:

- `CLAUDE.md` or `.claude/` directory → Claude Code is in use
- `GEMINI.md` → Gemini CLI is in use
- `AGENTS.md` → Codex CLI or generic agent setup is in use

Report what was found. Then ask the user which AI editors they plan to use going forward (multi-select: Claude Code, Gemini CLI, Codex CLI, Other). Instruction files will be written for all selected editors.

### Step 3 — Naming convention

Two questions in sequence. Show a live preview after each answer so the user sees what their choices produce.

**Q1 — Casing:**
- `camelCase` (recommended for JSX projects) — `aboutPage`, `contactForm`
- `kebab-case` (recommended for plain HTML / CSS-heavy projects) — `about-page`, `contact-form`

**Q2 — Optional global prefix:**
- No prefix (recommended) → `aboutPage`, `contactForm`
- `wf` → `wfAboutPage`, `wfContactForm` (camel) or `wf-about-page`, `wf-contact-form` (kebab)
- Custom → let the user type their own (e.g. `myco`)

Then summarize:

> Got it. With these choices, your pages will look like `aboutPage`, `pricingPage`. Your components will look like `contactForm`, `mainHeader`. Confirm to proceed.

(Substitute the live examples for the user's actual casing and prefix.)

### Step 4 — Git cleanliness check

Run `git status --porcelain`. If output is non-empty:

> Your working tree has uncommitted changes. Please commit or stash them before I make changes, so anything I do is easy to review and revert.

Wait for the user to clean up. Re-check before proceeding.

### Step 5 — Write configuration

Create `.wayfinder.json` in the project root:

```json
{
  "version": "0.1.1",
  "casing": "camelCase | kebab-case",
  "prefix": "wf | custom-string | null",
  "editors": ["claude-code", "gemini-cli", "codex-cli"],
  "createdAt": "ISO-8601 timestamp",
  "lastRunAt": "ISO-8601 timestamp",
  "siteMap": {
    "pages": {},
    "components": {}
  },
  "tagged": {}
}
```

This file is the source of truth for every subsequent run. Do not gitignore it — it should be committed so collaborators inherit the same conventions.

Two structural fields:

- **`siteMap`** captures the result of Phase 1 (structural analysis). `pages` maps each page file path to its resolved class name. `components` maps each component file path to its resolved class name (after collision resolution). This is what Phase 2 reads to know what to write.

- **`tagged`** is the manifest — a record of every identity class Wayfinder has written, keyed by file path. `--remove` reads from it; pattern matching alone would risk deleting user-authored classes. Both fields start empty during Step 5 and are populated during Step 7.

### Step 6 — Write instruction files

For each editor the user selected during Step 2, write the **shared instruction template** below to the editor's destination file in the project root:

| Editor | Destination file | `{{EDITOR_NAME}}` value |
|---|---|---|
| Claude Code | `CLAUDE.md` | `Claude Code` |
| Gemini CLI | `GEMINI.md` | `Gemini CLI` |
| Codex CLI (and other Agent-Skills-compatible agents) | `AGENTS.md` | `Codex CLI` |

The body of the template is identical regardless of editor — only the `{{EDITOR_NAME}}` placeholder in the heading differs.

**Placeholder substitution.** Resolve each placeholder once per project and reuse the same value across every file. From `.wayfinder.json`:

| Placeholder | Source | Example |
|---|---|---|
| `{{EDITOR_NAME}}` | Per-file, from destination map above | `Claude Code` |
| `{{CASING}}` | `config.casing` | `camelCase` |
| `{{PREFIX}}` | `config.prefix` or `"none"` | `wf-`, `myco-`, or `none` |
| `{{PREFIX_EXAMPLE}}` | Prefix formatted for the casing | `wf-` (kebab + wf), `wf` (camel + wf), empty for no prefix |
| `{{EXAMPLE_PAGE}}` | Live example of a page class | `aboutPage`, `wfAboutPage`, or `wf-about-page` |
| `{{EXAMPLE_COMPONENT}}` | Live example of a unique-name component class | `contactForm`, `wfContactForm`, or `wf-contact-form` |
| `{{EXAMPLE_SCOPED}}` | Live example of a domain-scoped component | `docsSidebar`, `wfDocsSidebar`, or `wf-docs-sidebar` |
| `{{EXAMPLE_PREFIXED}}` | Live example of a collision-resolved component | `mainHeader`, `wfMainHeader`, or `wf-main-header` |

**If a destination file already exists** (e.g. the user already has a `CLAUDE.md`):
- Do not overwrite. Append the rendered content between `<!-- Begin: Semantic Wayfinder rules -->` and `<!-- End: Semantic Wayfinder rules -->` delimiters.
- If a Wayfinder block already exists between those delimiters, replace just that block. Don't accumulate stale blocks across runs.

---

#### Shared instruction template

```markdown
# Project rules for {{EDITOR_NAME}}

This file gives {{EDITOR_NAME}} project-specific context. Rules below apply to all code generation and modification in this repository unless the user overrides them.

---

## Semantic Wayfinding

This project uses **Semantic Wayfinder** to give every page and every reusable component an identity class. The point: when the user asks you to edit a specific page or component, you can find it with one `grep` instead of reading through every file trying to figure out which `<section>` they meant.

### Project configuration

| Setting | Value |
|---|---|
| Casing | `{{CASING}}` |
| Optional prefix | `{{PREFIX}}` |

The canonical configuration lives in `.wayfinder.json` at the project root. Read from it if you need to confirm — never improvise.

### What gets tagged

Exactly two things:

1. **The root JSX element of each page file** (`app/*/page.tsx`, `pages/*.tsx`, route files) gets a `{page}Page` class derived from the file path.
2. **The root JSX element of each component file** under `components/`, `src/components/`, `app/_components/`, etc. gets the component's identity name, derived from the filename.

Nothing else is tagged. Inline sections inside page files, layout files, generated files, and test files are all skipped.

### Pattern

```
{{PREFIX_EXAMPLE}}<identity>
```

- **For pages**: `{path-as-camelCase}Page`. `app/page.tsx` → `homePage`. `app/about/page.tsx` → `aboutPage`. `app/dashboard/settings/page.tsx` → `dashboardSettingsPage`.
- **For components**: filename in camelCase (or kebab-case per config). `ContactForm.tsx` → `contactForm`. `TableOfContents.tsx` → `tableOfContents`. `DocsSidebar.tsx` → `docsSidebar`.
- **For components with role collisions** (e.g., multiple Headers): the most global one gets `main` prefix, others use their domain. `Header.tsx` + `AdminHeader.tsx` → `mainHeader` + `adminHeader`.

### Examples for this project

| Element | Resulting class |
|---|---|
| About page root | `{{EXAMPLE_PAGE}}` |
| `ContactForm.tsx` root | `{{EXAMPLE_COMPONENT}}` |
| `DocsSidebar.tsx` root | `{{EXAMPLE_SCOPED}}` |
| `Header.tsx` (with a sibling `AdminHeader.tsx` causing collision) | `{{EXAMPLE_PREFIXED}}` |

### Rules when creating or modifying code

1. **For a new page file**: add the identity class to the root JSX element (the outermost `<main>`, `<div>`, etc.). The class name is `{path}Page` per the pattern above.
2. **For a new component file**: add the identity class to the root JSX element. The class name is the filename camelCased.
   - **Reserved role names always get a `main` prefix when the filename is bare**, even if no other component shares the role. The reserved list covers HTML element names (`header`, `footer`, `nav`, `main`, `aside`, `section`, `article`, `form`, `button`, `input`, `label`, `select`, `dialog`, `menu`, `details`, `summary`, `figure`, `table`) and universal UI patterns (`sidebar`, `modal`, `card`, `dropdown`, `tooltip`, `banner`, `alert`, `toast`, `badge`, `chip`, `avatar`, `icon`, `list`, `link`, `divider`). So `Header.tsx` → `mainHeader`, `Footer.tsx` → `mainFooter`, `Card.tsx` → `mainCard`.
   - **If the filename already has a qualifier** (`AdminHeader.tsx`, `FlightCard.tsx`, `MobileNav.tsx`), use the camelCased filename as-is — no extra `main`. The qualifier already disambiguates from the reserved word.
   - **For non-reserved filenames** without collisions, use the camelCased filename directly (`ContactForm.tsx` → `contactForm`, `TableOfContents.tsx` → `tableOfContents`, `QuickAdd.tsx` → `quickAdd`).
   - **If you add a second component with the same role as a bare one** (e.g., adding `MobileHeader.tsx` to a project that has `Header.tsx`), the bare one gets renamed to `mainHeader` — but that's a job for `/wayfinder` to detect and ask about, not for you to do mid-conversation.
3. **Place the identity class first** in the `className` list, before utility classes.
4. **Additive only.** Never remove, replace, or reorder existing utility classes. Never delete a Wayfinder identity class either — if removal is intended, the user runs `/wayfinder --remove`.
5. **Idempotent.** Never overwrite an existing identity class that already matches the convention.
6. **Don't tag inline sections** inside page files. If the user asks for a `<section>` inside `app/about/page.tsx` to be greppable, suggest extracting it to a component file (`components/AboutHero.tsx`) instead of inventing an inline class.
7. **Don't tag layout files** (`app/*/layout.tsx`). Layouts are plumbing, out of scope for v0.1.x.
8. **Don't tag** generated files (`node_modules`, `.next`, `dist`, `build`), test files (`*.test.*`, `*.spec.*`), or gitignored paths.
9. **Casing follows `.wayfinder.json`, not the filename.** `MarketingHeader.tsx` becomes `marketingHeader` in camelCase, never `MarketingHeader`.

### What you can rely on when targeting components

When the user asks you to edit a specific page or component, the identity class is your fastest path. Reach for `grep` (or your equivalent search tool) on the identity class first — single hit, single target, no detective work.

- "Edit the about page" → `grep aboutPage` → one file
- "Update the contact form" → `grep contactForm` → one file (the component definition)
- "Change the admin header" → `grep adminHeader` → one file

### Reusable components carry their identity wherever they go

A `ContactForm` used on five different pages still has class `contactForm` everywhere. The class describes **what the component is**, never **where it's currently rendered**. Don't try to invent page-specific variants of a component class — if a component appears on multiple pages with truly different needs, that's a refactor decision (split into two components), not a naming decision.

### When the user wants to bulk-tag the codebase

They should run `/wayfinder` (the Semantic Wayfinder skill). Don't try to retroactively tag the whole codebase yourself in a single conversation; that's what the skill is for. Just keep new code Wayfinder-compliant.

### When the user wants to remove Wayfinder

They should run `/wayfinder --remove`. The skill reads its own manifest in `.wayfinder.json` and strips only the classes it originally added — leaving utility classes and any semantic classes the user wrote by hand untouched. Don't attempt to grep-and-strip classes yourself; it would risk deleting user-authored work.
```

### Step 7 — Tag the existing codebase

Proceed automatically into the tagging phase (described in "The tagging engine" below). The user does not need to issue a second command.

### Step 8 — Commit

Stage `.wayfinder.json`, the editor instruction files, and all tagged source files. Create a single commit:

```
chore: set up semantic wayfinder

- Add .wayfinder.json with site map and manifest
- Add instruction files for <selected editors>
- Tag <N> page roots and <M> component roots with identity classes
```

### Step 9 — Closing message

Tell the user what happened and what to do next:

> Done. Tagged `N` page roots and `M` component roots. Skipped `S` files (low confidence or unsupported root — see report above).
>
> From now on, when an AI agent in this project creates new pages or components, it'll add identity classes automatically. When you've made significant changes and want to catch any drift, run `/wayfinder` again — it will only touch what's new or changed and re-check for any newly introduced collisions.

---

## Incremental mode (subsequent runs)

Triggered when `.wayfinder.json` already exists and no special flag is passed.

### Step 1 — Acknowledge state

Read `.wayfinder.json`. Show a brief status line:

> Found existing Wayfinder config (casing: camelCase, prefix: none). Looking for new or untagged pages and components, plus any newly introduced collisions.

Do not re-ask any setup questions. The config is the source of truth.

### Step 2 — Identify scope of work

Two signals combined:

- **Changed files since last run**: `git log --since="<lastRunAt>" --name-only --pretty=format:` then filter to relevant source files (page files and files under `components/`).
- **Files not present in `siteMap`**: any page file or component file whose path isn't tracked in `config.siteMap`.

### Step 3 — Re-run Phase 1 on changed scope

Re-analyze component role collisions. A new component might introduce a collision with an existing one (e.g., adding `MobileHeader.tsx` when only `Header.tsx` existed before). When this happens:

> I detected a new role collision. `Header.tsx` was previously tagged as `header`; with `MobileHeader.tsx` added, I'd rename it to `mainHeader` and tag the new file as `mobileHeader`. This will update existing class references and the manifest. Proceed? (yes / no / show me each rename)

If the user agrees, perform the rename across all locations (single component file each — minimal blast radius). Update the manifest with old → new mappings.

### Step 4 — Git cleanliness check

Same as bootstrap step 4.

### Step 5 — Run Phase 2 on new and changed files

Use the same engine as bootstrap. Use the existing config — do not improvise convention.

### Step 6 — Commit

```
chore: wayfind incremental update

- Tag <N> new or changed page roots
- Tag <M> new or changed component roots
- <K> collision rename(s): <summary>
- Update siteMap and manifest in .wayfinder.json
```

Update `lastRunAt` in `.wayfinder.json` and include it in the commit.

---

## Remove mode (`/wayfinder --remove`)

Triggered when the user explicitly passes `--remove`. This mode is the inverse of tagging — it strips the identity classes Wayfinder previously added, while leaving every other class (utilities, user-authored semantic classes, anything not in the manifest) untouched.

The manifest in `.wayfinder.json` is the **only** source of truth for what gets removed. Pattern matching against the convention is not used — a user-written class that happens to match the convention must never be removed.

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
3. If a class is not found (drift — the file was edited by hand after tagging), skip it and record it as drifted. Do not search other files.
4. Write the file back.

If the className list ends up empty (`className=""`), preserve the empty attribute — don't delete the attribute itself.

### Step 4 — Clean up config and instruction files (if "full removal" was chosen)

- Delete `.wayfinder.json`.
- In each editor instruction file in the project root, locate the `<!-- Begin: Semantic Wayfinder rules -->` … `<!-- End: Semantic Wayfinder rules -->` block and remove it.
  - If the instruction file becomes empty (only the Wayfinder block existed), delete the file.
  - If other content remains, keep the file with the Wayfinder block excised.

### Step 5 — Commit

```
chore: remove semantic wayfinder

- Strip <N> identity classes from <M> files (per manifest)
- Remove .wayfinder.json
- Excise Semantic Wayfinder blocks from instruction files
```

If only "classes only" was chosen, adjust the commit message and clear the `tagged` field in `.wayfinder.json` (keep the config and instruction files in place).

### Step 6 — Closing message

> Removed `N` identity classes from `M` files. `D` entries in the manifest had drifted (the class wasn't found in the expected file) and were skipped — listed in the report above.
>
> To re-install Wayfinder, run `/wayfinder` from this project root.

### Drift reporting

If any classes were skipped due to drift, report them clearly. The user may want to clean those up by hand or accept them as is. Wayfinder must never guess.

---

## The tagging engine

This is the core logic. Runs in both bootstrap and incremental modes, in two phases.

### Phase 1 — Structural analysis

Build a map of the project's pages and components before writing anything to source files.

**1. Discover page files.** Pages are files matching project-router conventions:
- `app/**/page.{tsx,jsx,ts,js}` (Next.js App Router)
- `app/**/page.{vue,svelte}` (Vue/Svelte adaptations)
- `pages/**/*.{tsx,jsx,ts,js}` excluding `_app.*`, `_document.*`, `api/**` (Next.js Pages Router)
- `src/routes/**/+page.svelte` (SvelteKit)
- `src/pages/**/*.{vue,svelte}` (Nuxt / Astro / similar)

For each page file, derive the page identity:
- Strip the suffix and route-file noise (`page.tsx`, `+page.svelte`, etc.)
- Drop route-group parens segments like `(marketing)`
- Join remaining path segments and camelCase them
- Append `Page`
- Examples: `app/page.tsx` → `homePage` (the empty path becomes `home`). `app/about/page.tsx` → `aboutPage`. `app/dashboard/settings/page.tsx` → `dashboardSettingsPage`.

**2. Discover component files.** Components live under any of:
- `components/`
- `src/components/`
- `app/_components/`
- `lib/components/`
- Any folder named `components/` at any depth inside `src/` or `app/`

For each component file, derive a candidate identity:
- Take the filename without extension
- Convert PascalCase → camelCase
- This is the candidate role/identity (e.g., `Header.tsx` → `header`, `DocsSidebar.tsx` → `docsSidebar`).

**3. Detect role collisions.** Group component candidates by their "role" — the last word of the PascalCase filename (or the whole filename if it's a single word):

- `Header.tsx` → role = `header`
- `AdminHeader.tsx` → role = `header` (last word)
- `DocsSidebar.tsx` → role = `sidebar` (last word)
- `Sidebar.tsx` → role = `sidebar`
- `MobileNav.tsx` → role = `nav` (last word)
- `ContactForm.tsx` → role = `form` (last word)
- `TableOfContents.tsx` → role = `contents` (last word)
- `FlightCard.tsx` → role = `card` (last word)
- `QuickAdd.tsx` → role = `quickAdd` (single token; whole filename is the role)
- `ThemeToggle.tsx` → role = `toggle` (last word)

Single-word filenames have themselves as the role. Multi-word filenames use the trailing PascalCase word.

**4. Check the reserved-words list.** Some role names are inherently noisy under `grep` even without a component-level collision — either because they're native HTML element names (`<header>`, `<footer>`, `<nav>`) or because they're universal UI patterns that appear in every codebase. A bare `header` class would compete with every `<header>` element in the project for grep attention.

The hardcoded reserved list (v0.1.1):

| Tier | Words |
|---|---|
| **HTML elements** | `header`, `footer`, `nav`, `main`, `aside`, `section`, `article`, `form`, `button`, `input`, `label`, `select`, `dialog`, `menu`, `details`, `summary`, `figure`, `table` |
| **Universal UI patterns** | `sidebar`, `modal`, `card`, `dropdown`, `tooltip`, `banner`, `alert`, `toast`, `badge`, `chip`, `avatar`, `icon`, `list`, `link`, `divider` |

If a component's role (from step 3) appears in either tier, treat it as if it were colliding even when no other component shares the role. This guarantees that a bare `Header.tsx` in a small project still resolves to `mainHeader`, never just `header`.

**5. Resolve names.**

For each component, apply this decision tree:

- **No collision AND role not reserved** → use the camelCased filename directly. `TableOfContents.tsx` → `tableOfContents`. `QuickAdd.tsx` → `quickAdd`. `ThemeToggle.tsx` → `themeToggle`.

- **Reserved role AND filename has no qualifier (bare)** → prepend `main`. `Header.tsx` → `mainHeader`. `Sidebar.tsx` → `mainSidebar`. `Card.tsx` → `mainCard`. This applies even when no other component shares the role — the reserved word is treated as a permanent collision risk.

- **Reserved role AND filename already has a qualifier** → use the camelCased filename as-is. `MobileNav.tsx` → `mobileNav`. `AdminHeader.tsx` → `adminHeader`. `FlightCard.tsx` → `flightCard`. The filename's leading word already disambiguates from the reserved word, so no extra `main` is needed.

- **Real collision: bare filename + qualified filenames** (e.g., `Header.tsx` AND `AdminHeader.tsx` together):
  - Bare → `mainHeader`
  - Qualified → `adminHeader`

- **Real collision: all filenames have qualifiers** (e.g., `AdminHeader.tsx` + `MobileHeader.tsx`, no bare `Header.tsx`):
  - Each uses its own camelCased filename: `adminHeader` + `mobileHeader`. No `main` needed because the absence of a bare default means there's nothing to call "the main one."

- **Tie-breaker** (two bare filenames at the same level — e.g., `Header.tsx` AND `Heading.tsx`): ask the user how to disambiguate.

**6. Build the siteMap.** Populate `config.siteMap` with the resolved names:

```json
"siteMap": {
  "pages": {
    "app/page.tsx": "homePage",
    "app/about/page.tsx": "aboutPage",
    "app/dashboard/settings/page.tsx": "dashboardSettingsPage"
  },
  "components": {
    "components/Header.tsx": "mainHeader",
    "components/AdminHeader.tsx": "adminHeader",
    "components/ContactForm.tsx": "contactForm",
    "components/TableOfContents.tsx": "tableOfContents"
  }
}
```

The siteMap is consulted during Phase 2 (no re-derivation) and persisted to `.wayfinder.json` for later runs.

**7. Report resolutions to the user.** When prefixes were added (either from real collisions or from the reserved-words list), show the decisions clearly so the user can object:

```
[wayfinder] Prefix decisions:
  components/Header.tsx        → mainHeader   (reserved word — main is the global one)
  components/AdminHeader.tsx   → adminHeader  (collision with Header, qualified by filename)
  components/Footer.tsx        → mainFooter   (reserved word — bare filename, no other competitors)
  components/Sidebar.tsx       → mainSidebar  (reserved word)
  components/DocsSidebar.tsx   → docsSidebar  (collision with Sidebar, qualified by filename)
  components/TableOfContents.tsx → tableOfContents  (multi-word, no prefix needed)
  components/ContactForm.tsx   → contactForm  (last word `form` is reserved BUT filename has qualifier "Contact")
  components/QuickAdd.tsx      → quickAdd     (no prefix — not reserved, no collision)

Confirm to proceed, or type 'rename' to override any of these.
```

### Phase 2 — Apply tags

For each file in the siteMap, read the source, find the root JSX element, and add the identity class.

**Per-file algorithm:**

1. **Skip if the file isn't a page or component file in the siteMap.** (Layout files, generated files, test files, gitignored files — all skipped.)

2. **Find the root JSX element returned by the file.** Patterns:
   - Default-exported function component: find the `return ( ... )` block, identify the outermost element.
   - Arrow function shorthand: `export default () => <main>...</main>` — the element is the body.
   - Class component: find the `render()` method's outermost return element.

3. **Classify the root element type:**
   - **Native HTML element** (`<main>`, `<div>`, `<section>`, `<header>`, `<article>`, `<aside>`, `<nav>`, `<footer>`, etc.): proceed to write the class.
   - **Fragment** (`<>` or `<React.Fragment>`): skip with a clear report. Fragments have no DOM element to receive a class. Suggest the user add a wrapping element.
   - **Custom component** (`<PageWrapper>`, etc.): inspect the wrapper's definition if accessible. If it forwards `className`, write the class and flag as medium-confidence for user review. If it doesn't forward, or Wayfinder can't determine, skip with a report.

4. **Skip if already tagged.** If the root element's className list already contains a class matching the convention (and matching the siteMap entry), do nothing — idempotent.

5. **Skip if a non-conforming Wayfinder-like class exists.** If the className contains something that looks like a Wayfinder class but doesn't match the siteMap (e.g., user hand-tagged something), skip and report for human review. Never overwrite.

6. **Write the class AND update the manifest as a single transaction.** This is the critical rule that prevents partial-state bugs. For each file you tag, perform BOTH of the following before moving to the next file — never split them, never batch them, never defer them:

   a. **Edit the source file** to insert the identity class as the **first** entry in the className list. Preserve every other class in order.

   b. **Edit `.wayfinder.json`** to add the entry to the `tagged` field:
   ```json
   "tagged": {
     "<this/file/path>": ["<class>"]
   }
   ```
   Persist the JSON to disk immediately — do not hold it in memory across files.

   The reason this is enforced per-file rather than batched: if the run is interrupted (token limit, user cancellation, error), the manifest must accurately reflect what was actually tagged. A manifest that says "nothing tagged" while the source files have classes is worse than no manifest at all — `--remove` would silently do nothing and the user would have orphaned classes.

   **Treat the pair as one unit of work.** If you cannot update the manifest after writing the class (e.g., `.wayfinder.json` is locked or unreadable), revert the source file edit and report the error.

### File modification rules

When writing a semantic class into a file:

- The semantic class goes **first** in the className list
- Existing classes are preserved in order
- For JSX: `className="aboutPage px-6 py-20 bg-neutral-50"`
- For HTML: `class="aboutPage px-6 py-20 bg-neutral-50"`
- For Vue: `class="aboutPage px-6 py-20"` (in template) or `:class` (preserve dynamic bindings, prepend to the static portion)
- For Svelte: same as HTML
- Never reformat surrounding code. Preserve indentation, quotes, line breaks.

### Manifest update — the per-file transaction

Every time Wayfinder writes a new identity class into a source file, it must immediately write the corresponding entry to `.wayfinder.json`'s `tagged` field as part of the same atomic transaction (see Phase 2 step 6 for the enforcing rule).

Format:

```json
"tagged": {
  "<relative/file/path>": ["<class>"]
}
```

Rules:
- **Per-file persistence.** `.wayfinder.json` is written to disk after every single tagged file — never batched, never deferred to "end of run." If the run is interrupted after tagging 5 files, the manifest must show those 5 files. Partial completion is acceptable; partial-completion-with-empty-manifest is a correctness failure.
- **File paths are project-root relative**, forward-slashed, regardless of OS.
- **Each page file or component file has exactly one entry** in `tagged` (one class per file).
- **Never write the same class twice for the same file** — if it's already in the manifest, Phase 2 should have skipped the file via the idempotency check (step 4).
- **If a file gets renamed or moved between runs**, the incremental run detects the new path, migrates the manifest entry, and updates the siteMap. If the file is deleted, drop both entries.
- **Atomic failure.** If the manifest write fails after a source file write succeeded, revert the source file change and report the error. Do not leave the manifest and source files out of sync.

### Phase 2 completeness check — runs at the end of every tagging pass

Immediately before producing the closing summary, compare `config.siteMap` to `config.tagged`:

- **Every entry in `siteMap.pages`** should have a corresponding entry in `tagged` (with the resolved class name as the only value in the array).
- **Every entry in `siteMap.components`** should have a corresponding entry in `tagged` (same shape).
- **Exception:** files that were intentionally skipped (Fragment root, custom-component root that doesn't forward `className`, drift, etc.) should be listed separately as "skipped" — they're allowed to be missing from `tagged` but must be reported.

If any siteMap entry is missing from `tagged` AND wasn't recorded as a skip, the run is **incomplete** — not "successfully done." The closing summary must explicitly say:

> "Wayfinder did not tag every file in the siteMap. <N> files were planned but never processed. Re-run /wayfinder to finish — incremental mode will pick up where this run left off."

Never claim success when work is unfinished. The user needs to know.

### Collision rename (incremental only)

When Phase 1 in an incremental run detects a new collision that requires renaming an existing class:

1. Show the user the rename plan and ask for confirmation (see "Incremental mode Step 3").
2. On approval, for each file that needs renaming:
   - Open the file and replace the old class with the new class in the root element's className.
   - Update `siteMap.components[file]` from old → new.
   - Update `tagged[file]` to contain the new class instead of the old.
3. The atomic rename keeps siteMap, manifest, and source files consistent. There's no intermediate broken state.

---

## Output and reporting

After each run, present a structured summary:

```
Semantic Wayfinder — Run Summary

Mode: bootstrap (first run) | incremental | remove
Files scanned: 57
  Pages: 8
  Components: 23

Phase 1 (analysis):
  Resolved without prefix: 18 components
  Resolved with `main` prefix: 2 components (Header → mainHeader, Sidebar → mainSidebar)
  Resolved with scope prefix: 3 components (AdminHeader → adminHeader, ...)

Phase 2 (tagging):
  Newly tagged: 31 (all roots — 8 pages + 23 components)
  Skipped (Fragment root): 1 — app/redirect/page.tsx
  Skipped (custom wrapper, unclear): 0
  Already tagged: 0 (first run)
  Manifest entries written: 31  ← must equal "Newly tagged"
  Completeness check: ✓ siteMap matches manifest (32 planned − 1 intentional skip = 31 expected = 31 written)

Committed as: chore: set up semantic wayfinder
```

If the completeness check fails (siteMap has entries that aren't in the manifest and aren't intentional skips), the summary must reframe the run as **incomplete**:

```
⚠ Run was incomplete. <N> files in the siteMap were never tagged:
  - components/quick-add.tsx (mapped to quickAdd, never processed)
  - components/theme-toggle.tsx (mapped to themeToggle, never processed)
  ... [list all]

These files are still in the siteMap but not in the manifest. Re-run /wayfinder to finish — incremental mode will tag only the missing ones.

Manifest reflects what was actually tagged (<M> entries). Existing tagged files are safe to use; --remove will correctly clean up only those.
```

If anything went wrong during the run (parse errors, unreadable files, git problems), report it clearly without aborting the entire run — partial progress is better than total failure, and the per-file manifest transaction guarantees the partial state is recoverable.

---

## Things the skill must never do

- Never modify files when git is dirty without explicit user override
- Never overwrite existing identity classes that match the project's conventions
- Never produce a bare role name for a colliding component — every colliding role must carry a disambiguation prefix (`main` or domain)
- Never produce a bare reserved-word class (`header`, `footer`, `nav`, `sidebar`, `card`, `button`, etc.) when the source filename is bare. The reserved-words list applies even without a real component collision — bare reserved words are too ambient under `grep` to be useful identity classes
- Never echo a filename's PascalCase as the class name. Casing always follows `.wayfinder.json` — `MarketingHeader.tsx` becomes `marketingHeader` (camelCase) or `marketing-header` (kebab-case), never `MarketingHeader`
- Never tag inline sections inside page files, layout files, generated files, build outputs, test files, or gitignored paths
- Never wrap a Fragment-rooted page in a `<div>` to make it taggable — report and let the user decide
- Never delete utility classes or change styling — Semantic Wayfinder is additive only
- Never invent new naming conventions mid-run; always use `.wayfinder.json`
- Never silently skip files due to parse errors — always report them in the summary
- Never change `.wayfinder.json` configuration (casing, prefix) during an incremental run — that's what `--reset` is for
- Never remove a class during `--remove` unless it is recorded in the manifest for that exact file path. Pattern-matching is not a substitute for the manifest
- Never write to the same `tagged` entry without checking for duplicates
- **Never defer manifest writes to "end of run."** Each tagged file must be paired with its manifest entry in the same atomic transaction, with `.wayfinder.json` persisted to disk before moving to the next file. A run that gets interrupted mid-tagging must leave a manifest that correctly lists every file that was actually tagged
- **Never report success when work is unfinished.** If Phase 2 ends with siteMap entries that have no corresponding manifest entry (and weren't recorded as intentional skips), the closing summary must explicitly tell the user the run is incomplete and that re-running `/wayfinder` will finish the job

---

## Flags

- `/wayfinder` — default behavior (bootstrap or incremental, auto-detected)
- `/wayfinder <path>` — limit work to a specific directory
- `/wayfinder --reset` — wipe `.wayfinder.json` and re-run bootstrap (asks for confirmation first)
- `/wayfinder --remove` — strip every identity class Wayfinder added (per the manifest), then optionally delete `.wayfinder.json` and the editor instruction blocks. User-authored classes and utilities are preserved. Asks for confirmation first
- `/wayfinder --dry-run` — analyze (Phase 1) and report what Phase 2 would change, without writing any files
- `/wayfinder --check` — same as `--dry-run` but exits with non-zero status if untagged pages or components exist (useful for CI)
