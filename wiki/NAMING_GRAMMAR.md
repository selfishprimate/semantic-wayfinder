# Naming Grammar

The design reasoning behind Wayfinder's class names. **Not** a reference — see [`docs/conventions.md`](../docs/conventions.md) for the practical lookup tables. This doc captures *why* the grammar looks the way it does, what was tried and rejected, and what's still open.

---

## The grammar in one paragraph

Pages get a `{page}Page` class on their root JSX element, derived from the file path (`app/about/page.tsx` → `aboutPage`, `app/page.tsx` → `homePage`, `app/dashboard/settings/page.tsx` → `dashboardSettingsPage`). Components under `components/` get their filename camelCased on their root element (`ContactForm.tsx` → `contactForm`, `TableOfContents.tsx` → `tableOfContents`). When two components share a role (e.g., both `Header.tsx` and `AdminHeader.tsx`), the more global one gets a `main` prefix and the specialized ones use their scope from the filename — but only on collision. Most projects with one Header per app see just `header`.

Nothing else is tagged. Inline sections inside page files, layout files, generated/test/gitignored paths — all skipped.

---

## The v0.1 → v0.1.1 pivot

### What v0.1 had

The original grammar was `{pageContext}{ComponentRole}` — combining where a component lived with what it did:

```
aboutHero
aboutTestimonials
dashboardSidebar
pricingFAQ
```

The bootstrap wizard asked three questions: casing, prefix, and **scope** (sections-only vs all-components). The tagging engine walked every page file, identified meaningful `<section>` / `<header>` / `<aside>` elements, and produced `{page}{Role}` for each.

### Why it broke

The scenario that surfaced the problem: **a reusable component used across multiple pages cannot carry a page-prefixed name without lying.**

Consider `components/ContactForm.tsx`. Under v0.1, if it was first seen on `app/about/page.tsx`, it would be tagged `aboutPageContactForm`. Then someone imports it on the homepage — and the homepage now has an element with class `aboutPageContactForm`. The name says "I'm the about-page contact form," but it isn't. It's lying about its context.

This was caught during design conversation, not real-world testing. The fix had two equally important parts:

1. **Decouple class name from usage location.** The class describes what the component **is**, never where it's currently rendered.
2. **Use the filename as the identity source.** The filename is stable, descriptive, and already PascalCase by React convention. `ContactForm.tsx` → `contactForm` works without any inference.

### What changed

| | v0.1 | v0.1.1 |
|---|---|---|
| Page tagging | Sections within page files | Page root element only |
| Component tagging | Page-prefixed sections | Component root with filename identity |
| Reusable components | Carried page prefix (`aboutHero`) | Carry stable identity (`contactForm`) |
| Inline sections | Tagged with page context | Not tagged (extract to component if needed) |
| Bootstrap questions | 3 (casing, prefix, scope) | 2 (casing, optional prefix) |
| Tagging engine | One-pass per file | Two phases (analysis + apply) |

The change was breaking, but no one had used v0.1 against a real codebase yet. Cost of pivot: zero. Cost of *not* pivoting and shipping v0.1: every reused component in the wild would lie about its context. Easy call.

---

## Decision log

The specific design questions resolved during the rewrite, with their answers and reasoning.

### Default prefix: `main` or nothing?

**Decision:** Nothing, with one important exception.

Earlier sketches treated `main` as the default prefix for all global components (so a project's only Header would be `mainHeader`). The initial v0.1.1 design simplified this: `main` would be a **disambiguation prefix only**, not a default — if there's only one Header in the project, the class would be just `header`.

**Then the first real test (Plainify, 2026-05-26) surfaced a problem:** a bare `header` class doesn't grep cleanly because `<header>` is itself an HTML element. Every `<header>` tag in the project, every comment mentioning "header," every import of a Header component — all show up in `grep header` results. The class is ambient noise rather than a unique identity marker.

**Refinement: the reserved-words list.** A short list of role names always get a `main` prefix when the filename is bare, even without a real component collision:

- **HTML elements** (will always appear in source as `<tag>` form): `header`, `footer`, `nav`, `main`, `aside`, `section`, `article`, `form`, `button`, `input`, `label`, `select`, `dialog`, `menu`, `details`, `summary`, `figure`, `table`
- **Universal UI patterns** (common class words across every codebase): `sidebar`, `modal`, `card`, `dropdown`, `tooltip`, `banner`, `alert`, `toast`, `badge`, `chip`, `avatar`, `icon`, `list`, `link`, `divider`

The rule:

- `Header.tsx` alone → `mainHeader` (reserved word, bare filename)
- `AdminHeader.tsx` alone → `adminHeader` (reserved word BUT qualifier in filename)
- `TableOfContents.tsx` alone → `tableOfContents` (not reserved, no prefix)
- `QuickAdd.tsx` alone → `quickAdd` (not reserved, no prefix)

For roles outside the list, the original rule still holds: no prefix unless a real collision shows up.

Why this exception: the simpler rule worked for cleanly-named multi-word components, but the test revealed that single-word common roles are *always* noisy regardless of whether another component shares the role. Hardcoding a small reserved list catches the noise without forcing every component to carry `main`.

### Body tag vs page root?

**Decision:** Page root.

The pull was strong toward putting the page identity literally on `<body>`. In static HTML this is trivial. In Next.js / React it's not — `<body>` lives in `app/layout.tsx`, shared across all pages, and there's no clean way to per-page-flavor it without one of:

- `usePathname` hook in a client-rendered layout (kills React Server Components performance)
- `useEffect` + `document.body.classList` in every page (hacky, hydration races, requires `'use client'` directives and import statements)

Both options force Wayfinder to write structural code — hooks, imports, directives — not just classNames. That crosses the "additive only" line.

Page root (the outermost JSX element of the page file) achieves the same `grep aboutPage` behavior with zero structural change. The class is on `<main>` or `<div>` instead of `<body>`, but for the agent reading source code, that's a distinction without a difference.

### Hierarchy depth — how deep can names go?

**Decision:** 1-2 tokens by default, 3 tokens for collisions, 4 only in rare nested cases.

Earlier sketches considered deeper hierarchies (`aboutPageContactFormSubmitButton`). The simpler component-identity grammar makes most of this irrelevant — `ContactForm.tsx` → `contactForm` is two tokens, full stop. The depth question only matters for collision-resolution:

- `header` (no collision)
- `mainHeader` (collision, one is the most-global)
- `mainFooterList` (3 tokens, when a global Footer has its own list sub-component file)
- `blogPageSidebarListItem` (4 tokens, allowed but pushing it)

Beyond 4 tokens, readability tanks. If you find yourself wanting 5, that's a sign the component needs splitting or the project needs better separation.

### Inline sections inside page files — tag or skip?

**Decision:** Skip. Encourage extraction.

A page file like `app/about/page.tsx` often has multiple `<section>` elements written inline — not reusable components, just JSX in the page. v0.1 tagged these with page-context names. v0.1.1 doesn't.

The reasoning: tagging inline sections incentivizes leaving them inline. By only tagging extracted components, Wayfinder gently pushes users toward better composition. "If you want it greppable, make it a component." This is opinion baked into tooling, but it's the right opinion — reusable components are the unit of React, not inline sections.

For users who refuse to extract, the page-root tag (`aboutPage`) still gives single-grep targeting of the entire page file — they can navigate to the file and find the inline section visually.

### Layout files — tag or skip?

**Decision:** Skip for now (v0.1.x), revisit in v0.2.

`app/layout.tsx` and `app/[route]/layout.tsx` wrap pages. They're compositional plumbing, not user-facing identity. Tagging them with `mainLayout` or `dashboardLayout` is technically possible but:

- The Header, Footer, Sidebar inside the layout are already tagged via their component files.
- The layout itself is rarely the target of an edit request ("change the layout" usually means change a component within it).
- Adding it now would commit to a naming pattern (`mainLayout`? `rootLayout`?) without evidence it's needed.

Easier to skip and add later if real-world testing shows it's missed.

### Collision detection — who wins the `main` prefix?

**Decision:** Path-shortness as the heuristic, user-confirmable.

When `Header.tsx` and `AdminHeader.tsx` collide, the one closer to the project root (`components/Header.tsx`) gets the `main` prefix and the more-nested or filename-qualified one (`components/AdminHeader.tsx`) keeps its scope.

If two components are equally "global" (e.g., both at the top of `components/` with no scope qualifier), Wayfinder asks the user rather than guessing.

### Fragment root edge case

**Decision:** Skip with report. Never auto-wrap.

A page file that returns `<>...</>` has no DOM element to receive a class. Three options were considered:

- Skip and report
- Auto-wrap in `<div>` (or `<main>`)
- Tag the first child instead

Auto-wrap was rejected because it's a structural code change — Wayfinder writes JSX, not classNames. Tag-the-first-child was rejected because that child is meaningfully different from the page root (often a `<section>` with its own identity). Skip-and-report keeps Wayfinder honest: the user is told why the page wasn't tagged and what to do.

A future rule in the editor instruction template will tell agents generating new pages to use a wrapping element, reducing this case to near-zero.

---

## Rejected approaches

These were proposed or actively sketched and then cut. Re-proposing any of them requires showing what new evidence has emerged.

- **`{page}{Role}` for all components** (the v0.1 grammar). Cut: reusable components couldn't carry honest names. See "the pivot" above.
- **Page-prefixed identity for components called from a page** (e.g., `aboutPageContactForm` for `ContactForm` rendered on the about page). Cut: same problem; reused components would lie.
- **Body-level tagging via `useEffect`**. Cut: requires writing hooks, imports, and `'use client'` directives — Wayfinder is additive-only.
- **Body-level tagging via `usePathname` in layout.** Cut: same — turns the layout into a client component, costs React Server Component performance.
- **Auto-wrapping Fragment-rooted pages in `<div>`**. Cut: structural JSX modification, beyond Wayfinder's scope.
- **Deeper hierarchies (5+ tokens)** like `aboutPageContactFormSubmitButton`. Cut: unreadable, signals architecture problems rather than naming problems.
- **Tagging atomic primitives by default** (`Button`, `Card`, `Input`). Cut for v0.1.x — too noisy, every button in the codebase would carry a class. Under review for v0.2 with opt-in.
- **`main` as default prefix for ALL global components** (even non-reserved ones like `TableOfContents`). Cut: would add noise to already-unique names. The narrower version — `main` as default only for reserved-word roles — was adopted after the Plainify test.

---

## Open questions (v0.2 and beyond)

- **Layout files.** Should `app/[route]/layout.tsx` be tagged? Real-world testing will tell. If users frequently say "edit the dashboard layout" and the agent can't find it without reading multiple files, this becomes worth doing.
- **Atomic primitive policy.** `Button`, `Card`, `Input`, `Modal` — currently not tagged. Should they be, with an opt-in flag? Or are they too granular to add value?
- **Vue and Svelte conventions.** The grammar assumes filenames are PascalCase (React convention). Vue/Svelte communities lean toward kebab-case files. Adapter logic needed for v0.2.
- **Multi-language pages.** `app/[locale]/about/page.tsx` — should the locale appear in the class (`enAboutPage`), or be ignored (`aboutPage`)? Probably ignored, but worth confirming with a real i18n project.
- **Pattern learning across runs.** `.wayfinder-patterns.json` was floated for v0.4 — recording user-chosen names for ambiguous components so the next project's bootstrap learns from prior choices. Speculative.
- **Configurable reserved-words list.** v0.1.1 hardcodes the reserved list inside the skill. v0.2 could expose it as `reservedWords` in `.wayfinder.json` so users can add domain-specific noisy words (e.g., a media-streaming project might add `player`, `track`, `stream`). For now, the hardcoded list is the universally safe baseline.

---

## Related

- [`docs/conventions.md`](../docs/conventions.md) — the practical "what classes do I get?" reference
- [`THE_STORY_BEHIND_THE_PROJECT.md`](./THE_STORY_BEHIND_THE_PROJECT.md) — the broader project history (Part 1 covers the article; Part 2 covers original v0.1 design decisions, several now superseded)
- [`SYNC_MECHANISM.md`](./SYNC_MECHANISM.md) — how the three SKILL.md copies stay identical (different concern)
- [`INSTRUCTION_TEMPLATE.md`](./INSTRUCTION_TEMPLATE.md) — how Step 6 renders rules into user projects
