# Instruction Template

How Step 6 of bootstrap writes the same Wayfinder rules into a user's `CLAUDE.md` / `GEMINI.md` / `AGENTS.md`, using a single shared template inside `SKILL.md`.

---

## Three file types — always know which one you mean

Wayfinder involves several files that share confusing names. Always know which one is being discussed. The path tells you.

### Type 1 — Wayfinder's own `SKILL.md` (in this repo)

Lives at:
- `.claude/skills/wayfinder/SKILL.md`
- `.agents/skills/wayfinder/SKILL.md`
- `.gemini/skills/wayfinder/SKILL.md`

This **is the tool itself.** It contains the bootstrap wizard, the tagging engine, the rules, and the shared instruction template (which this doc explains). Edit only the `.claude/` copy — the other two are synced from it. See [`SYNC_MECHANISM.md`](./SYNC_MECHANISM.md).

### Type 2 — Rule files Wayfinder writes for users (in their projects)

Lives at:
- `<user-project>/CLAUDE.md`
- `<user-project>/GEMINI.md`
- `<user-project>/AGENTS.md`

These are written *into* the user's project during `/wayfinder` bootstrap. They tell the user's AI editor "follow this naming convention when generating new code in this project." Wayfinder writes them during Step 6 of bootstrap and re-renders them when configuration changes.

### Type 3 — `CLAUDE.md` in the root of *this* repo

`<this-repo>/CLAUDE.md` is project context for Claude Code working on Wayfinder itself. It's neither the skill nor a user instruction file — it's a third category that happens to share the same filename.

If a contributor says "edit CLAUDE.md," figure out which one they mean first.

## The pre-consolidation history (briefly)

Step 6 used to contain **three separate instruction templates** inside `SKILL.md` — one for each editor, each in a slightly different format (Claude as a numbered list, Gemini as a table-with-numbered-list, Codex as a terser list). Adding a new behavioral rule meant editing all three, plus the tagging engine, plus the "never do" list. The three templates accumulated minor drift even though they said the same thing.

In v0.1 we **consolidated** to a single shared template with a placeholder for the editor name. The user-visible behavior is identical: three files written, one per editor. The internal maintenance is one template instead of three.

See the commit titled *"Consolidate the three editor instruction templates into one shared template"* for the changeover.

## How Step 6 works now

### 1. Destination map

`SKILL.md` Step 6 maintains a table that pairs each editor with its destination file and the value to substitute for `{{EDITOR_NAME}}`:

| Editor | Destination file | `{{EDITOR_NAME}}` value |
|---|---|---|
| Claude Code | `CLAUDE.md` | `Claude Code` |
| Gemini CLI | `GEMINI.md` | `Gemini CLI` |
| Codex CLI (and other Agent-Skills-compatible agents) | `AGENTS.md` | `Codex CLI` |

The user selects editors during Step 2 of bootstrap. Step 6 iterates over the selection and writes to each destination.

### 2. The shared template

A single markdown block inside `SKILL.md` (under `### Step 6 — Write instruction files`) defines the body of the instruction file. The body is identical regardless of editor — only `{{EDITOR_NAME}}` in the heading changes per-file.

The template body covers:

- Project configuration (casing, prefix, scope, drawn from `.wayfinder.json`)
- Naming pattern with `pageContext` + `componentRole` explanation
- Concrete examples for the user's choices
- Rules when creating or modifying components (7 rules in v0.1)
- What to do when the user asks to edit a specific component
- What to do when the user wants to bulk-tag or remove Wayfinder

### 3. Placeholder substitution

Placeholders look like `{{NAME}}` and are resolved from the user's `.wayfinder.json` config (or, for `{{EDITOR_NAME}}`, from the destination map).

| Placeholder | Source | Example value |
|---|---|---|
| `{{EDITOR_NAME}}` | Destination map (per file) | `Claude Code` |
| `{{CASING}}` | `.wayfinder.json` `casing` | `camelCase` |
| `{{PREFIX}}` | `.wayfinder.json` `prefix` or `"none"` | `wf-`, `myco-`, or `none` |
| `{{SCOPE}}` | `.wayfinder.json` `scope` | `sections` or `all` |
| `{{SCOPE_DESCRIPTION}}` | Mapped from scope value | multi-sentence description |
| `{{PREFIX_EXAMPLE}}` | Prefix formatted for the casing | `wf-` (kebab + wf), `wf` (camel + wf), empty for no prefix |
| `{{EXAMPLE_HERO}}` | Computed live example | `aboutHero`, `wfAboutHero`, `wf-about-hero`, etc. |
| `{{EXAMPLE_CONTACT}}` | Computed live example | `aboutContact`, `wf-about-contact`, etc. |
| `{{EXAMPLE_SIDEBAR}}` | Computed live example | `dashboardSidebar`, etc. |
| `{{EXAMPLE_FAQ}}` | Computed live example | `pricingFAQ`, etc. |

All project-wide placeholders (everything except `{{EDITOR_NAME}}`) are resolved **once per run** and reused across all three files. Only `{{EDITOR_NAME}}` varies per file.

### 4. Append-vs-overwrite behavior

If a destination file already exists (e.g., the user already has a `CLAUDE.md` for their own reasons), Wayfinder **does not overwrite**. Instead it manages a delimited block:

```
<!-- Begin: Semantic Wayfinder rules -->
...rendered template body...
<!-- End: Semantic Wayfinder rules -->
```

Rules:
- If no block exists, the rendered content is appended at the end of the file inside fresh delimiters.
- If a block already exists between those delimiters, the new content **replaces just that block** — stale blocks never accumulate across runs.
- Everything outside the delimiters (the user's own content) is untouched.

This lets Wayfinder coexist with hand-written project rules in the same file.

## Adding a new rule — the maintenance flow

When a new behavioral rule arises (e.g., "shared components need a scope, never a bare role"), update the following places:

1. **Shared template inside `SKILL.md`** (Step 6) → add to the "Rules when creating or modifying components" list. *One place, one edit.*
2. **Tagging engine inside `SKILL.md`** → if the rule also constrains how Wayfinder tags during bootstrap/incremental, add it to the relevant per-component algorithm step.
3. **"Things the skill must never do"** → if the rule has a negative form ("never produce X"), add it there.
4. **`docs/conventions.md`** → if the rule has user-facing reference value, add it.
5. **Commit** — the pre-commit hook propagates `.claude/` to `.agents/` and `.gemini/` automatically.

Total touch points: typically **1–3** edits. Down from 5+ before consolidation (three template copies + tagging engine + never-do).

## Why one template instead of three

The pre-consolidation templates had different formats (table vs list, different headings, different intro wording) but said the same things. Format differences were stylistic, not functional — Claude, Gemini, and Codex agents read all formats the same way. The maintenance cost of keeping three formats in sync wasn't earning its weight.

Trade-off accepted: user-facing instruction files for the three editors now look identical (apart from the heading). If we ever discover a real functional reason for editor-specific instructions (e.g., one editor needs different `grep` phrasing), the destination-map structure already supports branching back to per-editor templates — but no contributor should reintroduce branching without showing what changed to justify it.

## Related

- [`SYNC_MECHANISM.md`](./SYNC_MECHANISM.md) — how the three `SKILL.md` *files* stay identical (a different concern at a different level)
- [`THE_STORY_BEHIND_THE_PROJECT.md`](./THE_STORY_BEHIND_THE_PROJECT.md) Part 3 — the long-form version of "three file types confusion" and the project's evolving thinking
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contributor workflow for editing the skill
- [`docs/conventions.md`](../docs/conventions.md) — the user-facing naming reference (separate from this internal doc)
