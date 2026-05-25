# Naming Conventions Reference

This document is the **single source of truth** for how Semantic Wayfinder names components. The skill (in `.claude/`, `.agents/`, and `.gemini/`) and the upcoming [CLI](../cli) read from this same set of rules, so output stays identical no matter which surface you use.

## The three choices

Wayfinder asks three questions during bootstrap. Each is stored in `.wayfinder.json` and never re-asked unless you `--reset`.

### 1. Casing

How identifier classes are written.

| Choice | Pattern | Example |
|---|---|---|
| `camelCase` | `pageContextComponentRole` | `aboutHero`, `dashboardSidebar` |
| `kebab-case` | `page-context-component-role` | `about-hero`, `dashboard-sidebar` |

camelCase is friendlier in JSX (`className="aboutHero ..."`); kebab-case is friendlier in plain HTML and CSS files.

### 2. Prefix

A short string prepended to every Wayfinder-generated class. Useful for avoiding collisions with existing class names and for making Wayfinder's output easy to spot in your codebase.

| Choice | camelCase | kebab-case |
|---|---|---|
| **None** (default) | `aboutHero` | `about-hero` |
| **`wf`** | `wfAboutHero` | `wf-about-hero` |
| **Custom** (e.g. `myco`) | `mycoAboutHero` | `myco-about-hero` |

The prefix style always follows the casing — capital letter as the separator in camelCase, hyphen in kebab-case. The two styles **never mix** in a single class name. There is no `wf-aboutHero` form.

### 3. Scope

Which elements get tagged.

| Choice | What gets a class |
|---|---|
| **Sections only** (default) | `<section>`, `<header>`, `<aside>`, `<nav>`, `<footer>`, `<main>`, top-level layout `<div>`s |
| **All meaningful components** | Above, plus reusable cards, banners, and groups inside identifiable contexts |

"Sections only" is recommended for most projects — it gives agents the wayfinding they need without cluttering every leaf node.

## Naming pattern

All identifier classes follow this pattern:

```
<prefix><pageContext><componentRole>
```

- **prefix**: from config (may be empty)
- **pageContext**: derived from file path (`app/about/page.tsx` → `about`)
- **componentRole**: derived from the component's content and structure (`hero`, `testimonials`, `cta`, `sidebar`, `faq`, etc.)

### How pageContext is derived

| File path | pageContext |
|---|---|
| `app/about/page.tsx` | `about` |
| `app/pricing/page.tsx` | `pricing` |
| `app/dashboard/settings/page.tsx` | `dashboardSettings` |
| `app/(marketing)/landing/page.tsx` | `landing` (parens are ignored) |
| `components/sections/Hero.tsx` | *(none — see "shared components" below)* |
| `pages/about.tsx` | `about` |
| `src/routes/about/+page.svelte` | `about` |

### How componentRole is derived

The engine combines several signals:

- **Element type** — `<header>`, `<nav>`, `<aside>`, etc.
- **Heading text** — `<h1>`, `<h2>`, `<h3>` inside the component
- **Body text fragments** — words like "testimonials", "pricing", "subscribe", "FAQ"
- **Structural patterns** — three repeated cards, sticky positioning, form + email input
- **Sibling order** — first section under `<main>` is usually `hero`

## Common roles

A non-exhaustive list of roles Wayfinder produces. These are the most common — actual output depends on what the engine detects.

| Role | Typical signals |
|---|---|
| `hero` | First section, `<h1>`, large copy, no repeated children |
| `testimonials` | 2+ repeated cards with quoted text and author names |
| `pricing` | 2+ repeated cards with currency, "month/year", "per user" |
| `features` | 3+ repeated cards with short heading + body |
| `faq` | Repeated question/answer pattern, `<details>`, accordion structure |
| `cta` | Section with single prominent button, often dark background |
| `newsletter` | Form with email input and subscribe button |
| `header` | `<header>` or sticky element with nav links |
| `sidebar` | `<aside>`, often fixed-position, with nav or filter UI |
| `footer` | `<footer>`, links and copyright |
| `team` | Repeated cards with images + names + roles |
| `logos` | Row of images (logo cloud / social proof) |

## Shared / reusable components

Components that don't belong to a single page (e.g. `components/sections/Hero.tsx` reused across `about`, `pricing`, `landing`) are tagged differently:

- **Inside the component file itself**: no `pageContext` prefix — just `hero`, `testimonials`, etc.
- **At the call site**: the page-level wrapper element gets the contextualized name, e.g. `<div className="aboutHeroWrapper"><Hero {...} /></div>`

This avoids reusable components getting locked to one page's naming.

## Collisions and edge cases

- **Two heroes on one page** — the second gets a numeric suffix: `aboutHero`, `aboutHero2`
- **Existing class with the same name** — Wayfinder detects and skips; never overwrites
- **Component already has a Wayfinder-conformant class** — skipped on subsequent runs (idempotent)
- **No detectable role** — flagged as low confidence; user is asked or it's skipped

## What's never named

- Pure layout primitives — `<div className="flex">` with one child
- Generated files — `node_modules`, `.next`, `dist`, `build`
- Test files — `*.test.*`, `*.spec.*` (unless explicitly included)
- Gitignored files
