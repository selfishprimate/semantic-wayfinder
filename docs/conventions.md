# Naming Conventions Reference

This document is the **single source of truth** for how Semantic Wayfinder names elements. The skill (in `.claude/`, `.agents/`, and `.gemini/`) and the upcoming [CLI](../cli) follow these same rules so output stays identical regardless of which surface you use.

## What gets tagged

Wayfinder tags exactly two things:

1. **The root element of every page file** (`app/*/page.tsx`, `pages/*.tsx`, route files in Vue/Svelte equivalents)
2. **The root element of every component file** under `components/`, `src/components/`, `app/_components/`, etc.

Wayfinder does **not** tag:
- Inline sections inside page files (extract them as components if you want them greppable)
- Layout files (`app/*/layout.tsx`)
- Generated or build files (`node_modules`, `.next`, `dist`, `build`)
- Test files (`*.test.*`, `*.spec.*`)
- Gitignored paths

## The two bootstrap choices

Wayfinder asks two questions during first-run setup. These are stored in `.wayfinder.json` and never re-asked unless you run `/wayfinder --reset`.

### 1. Casing

How identity classes are written.

| Choice | Example pages | Example components |
|---|---|---|
| `camelCase` (default) | `aboutPage`, `dashboardSettingsPage` | `contactForm`, `mainHeader` |
| `kebab-case` | `about-page`, `dashboard-settings-page` | `contact-form`, `main-header` |

camelCase is friendlier in JSX; kebab-case is friendlier in plain HTML / CSS files.

### 2. Optional global prefix

A short string prepended to every class Wayfinder writes — useful when you want all Wayfinder-managed classes to be visually distinguishable from your other class names.

| Choice | What you get |
|---|---|
| **None** (default, recommended) | `aboutPage`, `contactForm`, `mainHeader` |
| **`wf`** | `wfAboutPage`, `wfContactForm`, `wfMainHeader` (camelCase) — or `wf-about-page`, `wf-contact-form` (kebab) |
| **Custom** (e.g. `myco`) | `mycoAboutPage`, `mycoContactForm` (camel) — or `myco-about-page` (kebab) |

The prefix style always follows the casing — capital letter for camelCase, hyphen for kebab-case. **The two styles never mix.** There is no `wf-aboutPage` form.

## Naming rules

### Pages

The root JSX element of a page file gets a `{page}Page` class. The `page` part comes from the file path:

| File | Identity class |
|---|---|
| `app/page.tsx` | `homePage` |
| `app/about/page.tsx` | `aboutPage` |
| `app/contact/page.tsx` | `contactPage` |
| `app/blog/page.tsx` | `blogPage` |
| `app/dashboard/settings/page.tsx` | `dashboardSettingsPage` |
| `pages/about.tsx` | `aboutPage` |
| `app/(marketing)/landing/page.tsx` | `landingPage` (route group parens are ignored) |
| `src/routes/about/+page.svelte` | `aboutPage` |

Nested routes concatenate path segments in camelCase (or kebab-case): `app/dashboard/settings/billing/page.tsx` → `dashboardSettingsBillingPage`.

### Components

The root JSX element of a component file gets the component's identity name, derived from the filename (PascalCase → camelCase or kebab-case per your config).

| File | Identity class |
|---|---|
| `components/TableOfContents.tsx` | `tableOfContents` |
| `components/ContactForm.tsx` | `contactForm` |
| `components/DocsSidebar.tsx` | `docsSidebar` |
| `components/FlightCard.tsx` | `flightCard` |
| `components/Header.tsx` (only Header in project) | `header` |
| `components/Footer.tsx` (only Footer) | `footer` |

### Collisions — when prefixes appear

When two or more components share the same role (e.g., a project has both `Header.tsx` and `AdminHeader.tsx`), bare names would collide under `grep`. Wayfinder detects this during Phase 1 (structural analysis) and adds disambiguation prefixes:

| Setup | Resolved classes |
|---|---|
| Only `components/Header.tsx` | `header` |
| `components/Header.tsx` + `components/AdminHeader.tsx` | `mainHeader` + `adminHeader` |
| `components/Sidebar.tsx` + `components/DocsSidebar.tsx` | `mainSidebar` + `docsSidebar` |
| `components/Header.tsx` + `components/MobileHeader.tsx` + `components/AdminHeader.tsx` | `mainHeader` + `mobileHeader` + `adminHeader` |

The prefix rules:

- **`main`** is reserved for the "most global" / "default" instance — the Header you use on the marketing site, the Sidebar that ships site-wide.
- **Domain or scope prefix** is taken from the filename when present. `AdminHeader.tsx` already names its scope (`admin`), so no analysis needed: it becomes `adminHeader`.
- **A component with a scope-bearing name is inherently scoped.** `docsSidebar` says "I am the docs sidebar." If someone uses it outside docs, the name lies — and that's a code review concern, not a Wayfinder concern.

### Components with already-unique filenames

If the filename is descriptive enough that it can't collide (`TableOfContents`, `FlightCard`, `NewsletterSignup`, `PricingTier`), Wayfinder uses it as-is without adding `main` or any other prefix.

The collision check is based on the **role** (last word of the filename in PascalCase, or the whole name if it's a single word). `TableOfContents` doesn't share its role with anything else, so no prefix is needed.

## What about reused components?

A component like `ContactForm.tsx` carries the same class (`contactForm`) wherever it's used — on the about page, on the homepage, in a modal. The class reflects **what the component is**, not **where it's rendered**. This is by design:

- `grep contactForm` finds every instance across the codebase in one shot
- The component's identity is stable across refactors (moving it from About to Pricing doesn't require a rename)
- Reusable components stop lying about their context

If you need to target a specific instance, you'll usually grep the *containing page* — `grep aboutPage` to find the about page, then narrow within it.

## Multiple instances of the same component on one page

Wayfinder makes no attempt to distinguish them via name. Two `<ContactForm />` elements on the same page both have class `contactForm`. Position-in-page is enough disambiguation for human + agent reading the file.

## When the page root isn't a native HTML element

A page file might return:

- A native element (`<main>`, `<div>`, `<section>`): **Tag it.** This is the common case.
- A Fragment (`<>...</>`): **Skip with a report.** Fragments have no DOM element to receive a class. Wayfinder warns the user and suggests adding a wrapping element.
- A custom component (`<PageWrapper>...</PageWrapper>`): **Inspect the wrapper.** If it forwards `className`, Wayfinder writes the page class and flags it as medium-confidence for review. If it doesn't forward (or Wayfinder can't tell), skip with a report.

Wayfinder will never wrap your JSX in a `<div>` for you. That would cross the "additive only" line.

## Forbidden patterns

These never appear in Wayfinder output:

- **Bare generic role names when there's a collision.** Wayfinder always prefixes them: never just `header` when two Headers exist.
- **PascalCase echoes.** `MarketingHeader.tsx` becomes `marketingHeader` (camel) or `marketing-header` (kebab), never `MarketingHeader`.
- **Mixed casing.** No `wf-aboutPage` (kebab dash + camelCase identifier). Prefix style follows casing.
- **Page context inside component classes.** A `ContactForm` is never `aboutPageContactForm` — even if it lives on `app/about/page.tsx`.

## What's never named

- Inline sections inside page files
- Layout files (for now — under review for v0.2)
- Pure layout primitives — `<div className="flex">` with one child
- Generated files (`node_modules`, `.next`, `dist`, `build`)
- Test files (`*.test.*`, `*.spec.*`) by default
- Gitignored files

## A short example

A project with:

```
app/
├── page.tsx              # homepage
├── about/page.tsx        # about page
├── pricing/page.tsx      # pricing page
└── layout.tsx            # shared layout (skipped)

components/
├── Header.tsx            # only Header
├── Footer.tsx            # only Footer
├── ContactForm.tsx
├── PricingTier.tsx
├── TableOfContents.tsx
└── Newsletter.tsx
```

Produces these classes:

| Where | Class |
|---|---|
| Root of `app/page.tsx` | `homePage` |
| Root of `app/about/page.tsx` | `aboutPage` |
| Root of `app/pricing/page.tsx` | `pricingPage` |
| Root of `components/Header.tsx` | `header` |
| Root of `components/Footer.tsx` | `footer` |
| Root of `components/ContactForm.tsx` | `contactForm` |
| Root of `components/PricingTier.tsx` | `pricingTier` |
| Root of `components/TableOfContents.tsx` | `tableOfContents` |
| Root of `components/Newsletter.tsx` | `newsletter` |
| `app/layout.tsx` | *(not tagged)* |
| Inline `<section>` inside `app/about/page.tsx` | *(not tagged)* |

If later a second header is added (`components/AdminHeader.tsx`), Wayfinder's incremental run detects the role collision and proposes renaming `header` → `mainHeader`, plus adding `adminHeader` for the new file. User confirms; both classes are updated atomically and the manifest is rewritten.
