# Changelog

All notable changes to Semantic Wayfinder are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the project is in `0.x`, breaking grammar changes may land in MINOR bumps. Once `1.0.0` ships, semver discipline tightens.

---

## [0.6.0] — 2026-06-06

### Added
- **`/wayfinder --report` flag** to install the savings report after the fact (and `--report off` to uninstall) — for projects that skipped it at bootstrap or want to toggle it later. Editing `.wayfinder.json` alone can't install (the script + hook still need fetching); the flag does the full install/uninstall and commits. Once installed, the `report` block still toggles `terminal`/`file` on its own.

### Changed
- **The savings-report opt-in moved into the upfront setup questions** (Step 3 Q3, alongside casing/prefix), so it always appears in the "review your answers" wizard. Step 6b is now an execution step that installs based on the answer, instead of a separate later question.

### Fixed
- **Bootstrap silently skipped the savings-report opt-in.** The Step 5 config template pre-included a `report` block, so the agent wrote it during config creation and then treated the opt-in as already-decided — the user was never asked (the block landed as `enabled: false`). Removed `report` from the Step 5 template and documented the schema in prose. Combined with the move above, the question is now reliably surfaced and the `report` block is written only on opt-in.

---

## [0.5.0] — 2026-06-05

### Added
- **Savings report (optional).** Bootstrap now offers to install a `post-commit` hook that, after each commit, estimates how much agent navigation the commit's tagged components saved and records it to a cumulative `WAYFINDER_REPORT.md` (and prints a per-commit summary in the terminal). The hook is additive, needs Node, and never blocks or alters a commit.
  - The estimator (`wayfinder-report.mjs`) and hook template ship in the repo under `scripts/`; bootstrap fetches them from the public repo via `curl` (Step 6b). No embedding in `SKILL.md`, so the markdown stays lean and the script stays the single source of truth.
  - **Honesty:** "savings" is a counterfactual, so the token figure is **estimated/modeled** (real `git grep` precision + a ~4-chars/token heuristic), clearly labeled in both the terminal output and the report file — never presented as a billed figure.
  - Controlled from `.wayfinder.json` → `report`: `enabled` (master switch), `terminal` (per-commit print on/off), `file` (cumulative path, or `false` to skip the file).
  - Detects existing hook managers (Husky/lefthook): integrates with them instead of overwriting `.git/hooks/post-commit`.
  - `--remove` uninstalls the report artifacts (Step 3c).

### Changed
- **Manifest schema → `0.3.0`**: adds the optional `report` block. Backward compatible — older manifests without it keep working (defaults apply).

---

## [0.4.1] — 2026-06-02

### Fixed
- **`examples/.wayfinder.json` violated the reserved-words rule.** `Footer.tsx` resolved to `footer`; corrected to `mainFooter` (a bare reserved-word filename always gets the `main` prefix). The example was internally inconsistent — `Header.tsx` was already correctly `mainHeader`.
- **Reserved-words list mislabeled as `(v0.1.1)`** in the three `SKILL.md` copies and `docs/conventions.md`. The list was actually introduced in v0.1.2 — corrected to `(v0.1.2)`.

### Changed
- **`examples/.wayfinder.json` bumped to schema `0.2.0`** and gained the `wrapperMods: {}` field, matching what bootstrap writes since v0.2.0.
- **CLI placeholder no longer promises a specific version.** "Coming in v0.3" / "🚧 v0.3" became impossible once v0.3.0 and v0.4.0 shipped without the CLI — replaced with "coming soon" in `README.md` and `cli/README.md`.

---

## [0.4.0] — 2026-05-27

### Changed
- **Phase 1 discovery report no longer requires a "go" reply.** Earlier versions treated the discovery report as a hard checkpoint — Phase 2 wouldn't start until the user typed "go" or equivalent. This added friction on every clean run for no real safety gain (the user already opted in by invoking `/wayfinder`). The new behavior: always show the discovery report for transparency, but auto-continue to Phase 2 unless a decision is genuinely needed.
- **Decisions that still pause the run:**
  - Custom-component wrapper that doesn't forward `className` (3-option choice: modify wrapper / wrap call sites / skip)
  - Multiple semantic native siblings in a Fragment root (which to tag?)
  - Tie-breaker collisions — two bare filenames sharing a role (e.g. `Header.tsx` AND `Heading.tsx`)
  - Incremental-run rename plans (when a new component introduces a collision that renames an existing class)
- These prompts are surfaced inline as specific questions, not as a generic "reply go". A clean plan flows continuously: discovery report → Phase 2 tagging → commit → closing message.

### Why
The "go" gate was added in v0.1.2 as a reaction to a Plainify test bug where Phase 1 missed 3 of 10 pages. The deeper fix — exhaustive recursive discovery — was added in the same release and made the gate redundant for most projects. The gate stayed in place out of caution, but in practice it added friction every run while catching real problems rarely. v0.4.0 trades the unconditional checkpoint for targeted decision prompts.

---

## [0.3.0] — 2026-05-26

### Removed
- **`--reset` flag.** Replaced by the two-step `/wayfinder --remove` (full removal) + `/wayfinder` (fresh bootstrap). The single-step reset had a subtle bug: it wiped config but left existing tagged classes in source files, which then became orphans if the user picked different casing/prefix in the new bootstrap. The two-step path is unambiguous and cleaner — the manifest is the source of truth for what to strip, and re-bootstrapping starts from a known-clean state.

### Changed
- `cli/README.md` planned-interface block updated to drop `--reset` and replace it with `--remove` in the v0.3 CLI roadmap.
- `docs/conventions.md`, `README.md`, and the editor instruction template's wording reference the two-step path instead of `--reset`.
- **Pre-commit hook simplified to patch-only auto-bump.** Earlier versions tried to grep the commit message for `feat:` / `BREAKING:` markers to choose a bump type, but the pre-commit hook runs *before* git writes the commit message to disk — so it read either an empty file or the previous commit's stale message. The hook now always patch-bumps; for minor or major bumps, run `./scripts/bump-version.sh minor` (or `major`) before staging. The hook still detects manual bumps and skips its own when one is present.
- `CONTRIBUTING.md` versioning section rewritten to reflect the new workflow.

---

## [0.2.0] — 2026-05-26

Two behavior expansions driven by the second Plainify test run, both surfacing real-world patterns that v0.1.x handled poorly.

### Added
- **Fragment-with-tagable-child rule.** When a page's root is a Fragment (`<>...</>`), Wayfinder inspects the children and tags the first semantic native element (`<main>`, `<article>`, `<section>`) instead of skipping the page. This is the standard Next.js pattern (`<><Header /><main>…</main><Footer /></>`) — the v0.1.x skip-all-Fragments rule would have left it untagged. Multiple semantic siblings still trigger a user prompt; Fragments with only custom-component children still skip.
- **Custom-component wrapper className injection.** When a page's root is a custom component that doesn't forward `className`, Wayfinder offers three options: (1) modify the wrapper to add forwarding, (2) wrap the call site in a `<div className="...">`, or (3) skip the page. Default offer is (1). The wrapper modification is recorded in a new `wrapperMods` field of `.wayfinder.json` so `--remove` can offer to revert it. This is the first structural code change Wayfinder is allowed to make, gated by explicit user confirmation showing the diff.
- **`wrapperMods` field** in `.wayfinder.json` schema. Tracks structural modifications made to wrapper components. Used by `--remove` to offer cleanup of those changes.
- **`--remove` step 3b** — after stripping classes, offer to revert wrapper modifications. Three sub-options: revert all, leave them, or review each diff.

### Changed
- `.wayfinder.json` schema bumped to `0.2.0`. Old configs at `0.1.x` are forward-compatible (Wayfinder treats missing `wrapperMods` as an empty object).
- Output summary now reports "Wrapper modifications" and "Fragment accommodations" as separate lines so the user sees what non-class-only changes happened.

### Why these aren't breaking
Existing `v0.1.x`-tagged projects continue to work — none of these rules invalidate previously written classes. Re-running `/wayfinder` on a `v0.1.x`-tagged project will discover new opportunities (Fragment pages, custom-wrapper pages) that were previously skipped, and will add them via the new rules. The manifest format gains a field but doesn't change existing fields.

---

## [0.1.2] — 2026-05-26

Reactive hardening driven by the first real-world Wayfinder run (Plainify project, May 26). Four behavior fixes that surfaced when the spec met an actual codebase: a bare `header` class drowned in `grep` noise, an empty manifest after a partial run, missed auth pages, and a dirty working tree with no commit.

### Added
- **Reserved-words list.** Hardcoded set of common HTML element names (`header`, `footer`, `nav`, `aside`, `section`, `article`, `form`, `button`, `input`, `label`, `select`, `dialog`, `menu`, `details`, `summary`, `figure`, `table`) and universal UI patterns (`sidebar`, `modal`, `card`, `dropdown`, `tooltip`, `banner`, `alert`, `toast`, `badge`, `chip`, `avatar`, `icon`, `list`, `link`, `divider`). Bare components matching these roles always get a `main` prefix even without a real collision. Prevents ambient `grep` noise that made `Header.tsx → header` unusable in practice.
- **Phase 1 user-confirmation checkpoint.** Before Phase 2 starts writing anything, the agent must show the full discovery plan (every page, every component, with derived class names and skip reasons) and wait for explicit user approval. Catches missing files and wrong resolutions before they turn into bad tags.
- **Phase 2 completeness check.** End-of-run comparison of `siteMap` vs `tagged`. Mismatches surface as explicit "incomplete run" warnings in the closing summary, with a per-file pending list.
- **Partial-completion commit mode.** Bootstrap Step 8 and Incremental Step 6 write a distinct `chore: partial wayfind…` commit when not every file in the siteMap was tagged. `INCOMPLETE` marker visible in `git log`.
- `wiki/NAMING_GRAMMAR.md` — design memory for the active grammar (added in v0.1.1, predates this hardening pass).

### Changed
- **Manifest writes are now atomic with source-file writes.** Each tagged file is paired with its `.wayfinder.json` entry in a single transaction, persisted to disk before moving to the next file. Replaces the previous "persist at end of run" rule, which caused empty manifests when runs were interrupted by token limits.
- **Page discovery is explicitly recursive.** Spec now lists common failure modes (shallow `ls`, stopping early, skipping route-group parens) and requires exhaustive walks at every depth. Worked examples added for route groups (`(marketing)`, `(auth)`), dynamic routes (`[id]`, `[slug]`), parallel routes (`@modal`), and catch-all brackets (`[...params]`).
- **Component discovery now skips test files, underscore-prefixed helpers, index barrels, and pure-utility files** that don't return JSX. Filename normalization documented: `kebab-case`, `snake_case`, and `PascalCase` all yield the same camelCase token.
- **Step 8 commit is mandatory.** Any modified source file or created `.wayfinder.json` must end with a commit, even on partial runs. Prevents the "dirty working tree, no clue what happened" failure mode that the first Plainify run produced.
- Next.js special files (`layout.tsx`, `template.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `global-error.tsx`, `route.ts`, `middleware.ts`, `_app.tsx`, `_document.tsx`, `_error.tsx`) explicitly listed as out-of-scope. Their file-system convention already serves as wayfinding.

### Fixed
- Auth pages under `app/` (e.g., `app/login/page.tsx`, `app/signup/page.tsx`, `app/forgot-password/page.tsx`) were silently dropped from the siteMap during the first Plainify run. Fixed by formalizing exhaustive discovery.
- Bare reserved-word components like `Header.tsx` no longer resolve to ambient class names like `header` — they now correctly become `mainHeader`.
- Closing summary no longer claims success when work is unfinished. Partial runs are reported explicitly with pending file lists.

---

## [0.1.1] — 2026-05-26

Naming grammar rewrite, replacing the original `pageContext + componentRole` pattern with **component-identity tagging**. Triggered by the realization that reusable components carrying page-prefixed names lie when used on other pages (e.g., `aboutPageContactForm` rendered on the homepage).

### Changed
- **New grammar.** Pages get `{page}Page` on their root element (e.g., `aboutPage`, `dashboardSettingsPage`, `homePage`). Components get their filename camelCased on their root element (e.g., `contactForm`, `tableOfContents`, `docsSidebar`). Collision detection adds `main` or domain prefixes only when components share a role.
- **Two-phase engine.** Phase 1 (structural analysis) maps the whole project — pages, components, role collisions — before Phase 2 (tagging) writes anything. Stored in `.wayfinder.json` as `siteMap`.
- **`.wayfinder.json` schema updated.** Added `siteMap` field. Removed `scope` field (the bootstrap question is gone — Wayfinder always tags page roots and component roots, never anything else).
- **Bootstrap simplified to two questions** (casing + optional prefix) instead of three. The `scope` question (sections-only vs all) was retired.
- **Single shared instruction template** in `SKILL.md` Step 6, replacing three near-identical templates that drifted across editors. A `{{EDITOR_NAME}}` placeholder differentiates the rendered files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`); the body is byte-identical.

### Added
- `wiki/NAMING_GRAMMAR.md` documenting why the grammar looks the way it does, what was tried and rejected, and what's still open for v0.2+.
- `--remove` flag with manifest-driven class removal — only strips classes Wayfinder originally added, never user-authored ones that happen to match the convention.
- Manifest field (`tagged`) in `.wayfinder.json` to track which classes Wayfinder wrote, keyed by file path.

### Removed
- `aboutHero`, `aboutTestimonials`, `aboutContact` and other page-prefixed component names. Components no longer carry their host page in the class.
- Inline section tagging inside page files. To make a section greppable, extract it as a component file.
- The `scope` bootstrap question and its supporting placeholders (`{{SCOPE}}`, `{{SCOPE_DESCRIPTION}}`, `{{EXAMPLE_HERO}}`, `{{EXAMPLE_TESTIMONIALS}}`).

### Breaking
- Any project tagged under v0.1.0 has class names that no longer match v0.1.1+ output. Re-running `/wayfinder --remove` then `/wayfinder` will transition cleanly. No v0.1.0 users in the wild, so no backwards-compat shim needed.

---

## [0.1.0] — 2026-05-25

Initial release. Skill specification and surrounding documentation; the original `pageContext + componentRole` grammar (later superseded). Never run against a real codebase before v0.1.1 replaced it.

### Added
- `SKILL.md` for Claude Code, Codex CLI, and Gemini CLI (three byte-identical copies under `.claude/`, `.agents/`, `.gemini/`).
- `scripts/sync-skills.sh` to keep the three copies in sync, with `--check` mode for verification.
- `scripts/hooks/pre-commit` for automatic sync on commit (activated via `git config core.hooksPath scripts/hooks`).
- `docs/conventions.md` — user-facing naming reference.
- `wiki/` design memory: `THE_STORY_BEHIND_THE_PROJECT.md`, `SYNC_MECHANISM.md`, `INSTRUCTION_TEMPLATE.md`.
- `examples/` with before/after demos plus a sample `.wayfinder.json`.
- `README.md`, `CONTRIBUTING.md`, `LICENSE`, and a `cli/` placeholder for the v0.3 CLI roadmap.
- Bootstrap → tag flow as a single command (`/wayfinder`).
- Git safety: refuses to modify files when working tree is dirty; commits its own work with clear messages.

---

[Unreleased]: https://github.com/selfishprimate/semantic-wayfinder/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/selfishprimate/semantic-wayfinder/releases/tag/v0.4.1
[0.4.0]: https://github.com/selfishprimate/semantic-wayfinder/releases/tag/v0.4.0
[0.3.0]: https://github.com/selfishprimate/semantic-wayfinder/releases/tag/v0.3.0
[0.2.0]: https://github.com/selfishprimate/semantic-wayfinder/releases/tag/v0.2.0
[0.1.2]: https://github.com/selfishprimate/semantic-wayfinder/releases/tag/v0.1.2
[0.1.1]: https://github.com/selfishprimate/semantic-wayfinder/releases/tag/v0.1.1
[0.1.0]: https://github.com/selfishprimate/semantic-wayfinder/releases/tag/v0.1.0
