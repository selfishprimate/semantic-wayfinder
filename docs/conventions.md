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

Components that live under `components/`, `src/components/`, `app/_components/`, etc. — i.e. not bound to a single page — still follow the `<pageContext><componentRole>` pattern. `pageContext` just comes from a different source.

### The rule: scope from filename or fall back to `global`

1. **Filename already carries a scope word.** PascalCase filenames split on word boundaries. The trailing word is the role; the leading word(s) form the context.

   | File | Context | Role | Identity class |
   |---|---|---|---|
   | `components/MarketingHeader.tsx` | `marketing` | `header` | `marketingHeader` |
   | `components/DashboardSidebar.tsx` | `dashboard` | `sidebar` | `dashboardSidebar` |
   | `components/BlogPostFooter.tsx` | `blogPost` | `footer` | `blogPostFooter` |
   | `components/admin/AdminSidebar.tsx` | `admin` | `sidebar` | `adminSidebar` |

2. **Filename is just a bare role.** Components named `Header.tsx`, `Footer.tsx`, `Sidebar.tsx`, `Nav.tsx` are global. Prefix with `global`:

   | File | Identity class |
   |---|---|
   | `components/Header.tsx` | `globalHeader` |
   | `components/Footer.tsx` | `globalFooter` |
   | `components/Nav.tsx` | `globalNav` |

   Use `main` instead of `global` if the project has multiple distinct top-level surfaces (e.g. a marketing site **and** a dashboard share the same root layout). Stay consistent — don't mix `global` and `main` for the same kind of component within one project.

### What is forbidden

- **Bare role names.** Never produce `header`, `footer`, `sidebar`, or `nav` on their own. They collide with multiple instances and defeat the entire point of wayfinding.
- **PascalCase echoes.** Never use `Header`, `Footer`, `MarketingHeader` literally. The casing must follow `.wayfinder.json` — `MarketingHeader.tsx` becomes `marketingHeader` (camelCase) or `marketing-header` (kebab-case).

### Call-site wrappers

When a generic component (e.g. `<Hero />`) is reused across pages, the *call site* can add a page-level wrapper class so the specific instance is still greppable from the page:

```jsx
// app/about/page.tsx
<div className="aboutHeroWrapper">
  <Hero title="…" />
</div>
```

This keeps the reusable component free of page-specific naming while still giving page-level edits a single grep target.

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
