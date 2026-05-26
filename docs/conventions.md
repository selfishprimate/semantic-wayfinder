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

Wayfinder asks two questions during first-run setup. These are stored in `.wayfinder.json` and never re-asked unless you run `/wayfinder --remove` (full removal) and then re-bootstrap.

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
| `components/Header.tsx` (only Header in project) | `mainHeader` (reserved word — always prefixed even alone) |
| `components/Footer.tsx` (only Footer) | `mainFooter` (reserved word) |

### Collisions — when prefixes appear

A prefix appears for one of two reasons: a real role collision between two components, or the component's role being on the reserved-words list.

**Reason 1 — real collision.** When two or more components share the same role (e.g., `Header.tsx` AND `AdminHeader.tsx`), Wayfinder detects this during Phase 1 and adds disambiguation prefixes.

**Reason 2 — reserved role.** Some role names are so common in HTML/CSS/UI vocabulary that a bare class would be drowned in `grep` noise even when no other component shares the role. The reserved-words list always triggers a `main` prefix on bare filenames.

| Setup | Resolved classes |
|---|---|
| Only `components/Header.tsx` | **`mainHeader`** (reserved word — single occurrence still prefixed) |
| Only `components/TableOfContents.tsx` | `tableOfContents` (not reserved, no prefix) |
| `components/Header.tsx` + `components/AdminHeader.tsx` | `mainHeader` + `adminHeader` |
| `components/Sidebar.tsx` + `components/DocsSidebar.tsx` | `mainSidebar` + `docsSidebar` |
| `components/Header.tsx` + `components/MobileHeader.tsx` + `components/AdminHeader.tsx` | `mainHeader` + `mobileHeader` + `adminHeader` |
| `components/AdminHeader.tsx` + `components/MarketingHeader.tsx` (no bare `Header.tsx`) | `adminHeader` + `marketingHeader` (no `main`Header — there's no "default" to mark) |
| `components/MobileNav.tsx` alone (no bare `Nav.tsx`) | `mobileNav` (qualifier already disambiguates `nav`) |
| `components/FlightCard.tsx` alone | `flightCard` (qualifier disambiguates `card`) |

The prefix rules:

- **`main`** marks the "most global" / "default" instance. Used when a bare filename (no qualifier in front of the reserved word) appears, either alone or alongside qualified variants.
- **Domain or scope prefix** comes from the filename when present. `AdminHeader.tsx` → `adminHeader`, `MarketingHeader.tsx` → `marketingHeader`, `MobileNav.tsx` → `mobileNav`.
- **A component with a scope-bearing name is inherently scoped.** `docsSidebar` says "I am the docs sidebar." If someone uses it outside docs, the name lies — and that's a code review concern, not a Wayfinder concern.

### The reserved-words list (v0.1.1)

These role names always get a `main` prefix when the filename is bare (no qualifier in front). Hardcoded in the skill; not user-configurable in v0.1.x.

| Tier | Words |
|---|---|
| **HTML elements** (collide with literal tags under `grep`) | `header`, `footer`, `nav`, `main`, `aside`, `section`, `article`, `form`, `button`, `input`, `label`, `select`, `dialog`, `menu`, `details`, `summary`, `figure`, `table` |
| **Universal UI patterns** (common across every codebase) | `sidebar`, `modal`, `card`, `dropdown`, `tooltip`, `banner`, `alert`, `toast`, `badge`, `chip`, `avatar`, `icon`, `list`, `link`, `divider` |

Roles outside the list (e.g., `quickAdd`, `themeToggle`, `tableOfContents`, `pricingTier`, `flightCard`, `taskCard`) are considered unique enough on their own — no prefix unless a real component collision shows up.

### Components with already-unique filenames

If the filename is descriptive enough that its role isn't reserved and doesn't collide (`TableOfContents`, `NewsletterSignup`, `PricingTier`, `QuickAdd`, `ThemeToggle`), Wayfinder uses the camelCased filename as-is without any prefix.

The role check uses the **last word** of the PascalCase filename. `TableOfContents` → role `contents` (not reserved). `FlightCard` → role `card` (reserved BUT the filename has a qualifier "Flight", so it resolves to `flightCard` without `main`). `QuickAdd` → role `quickAdd` (single token, not reserved).

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

- **A native element** (`<main>`, `<div>`, `<section>`, etc.): tag it. The common case.

- **A Fragment** (`<>...</>`): Wayfinder inspects the Fragment's children and applies priority:
  - One semantic native element among the children (`<main>`, `<article>`, `<section>`) → tag it. This is the typical Next.js `<><Header /><main>...</main><Footer /></>` pattern.
  - One other native element (e.g. `<div>`) among custom-component siblings → tag with medium confidence.
  - Multiple native siblings with no unique semantic candidate → ask the user.
  - No native elements at all → skip with a report.

- **A custom component** (`<PageWrapper>`, `<AuthShell>`, etc.): Wayfinder inspects the wrapper.
  - If the wrapper forwards `className` → tag normally. The class lands on the wrapper's actual DOM root.
  - If the wrapper doesn't forward `className` → offer three options to the user:
    1. **Modify the wrapper** to add className forwarding (default offer — small structural edit, recorded in `wrapperMods` for `--remove` to revert).
    2. **Wrap the call sites** with a `<div className="...">` instead.
    3. **Skip the affected pages.**

Wayfinder will never wrap your JSX in a `<div>` silently or modify a wrapper without an explicit user confirmation showing the proposed diff.

## Forbidden patterns

These never appear in Wayfinder output:

- **Bare generic role names when there's a collision.** Wayfinder always prefixes them: never just `header` when two Headers exist.
- **Bare reserved-word classes.** Even without a collision, words on the reserved list always get a `main` prefix when the filename is bare. A standalone `Header.tsx` resolves to `mainHeader`, never `header`.
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
| Root of `components/Header.tsx` | `mainHeader` (reserved word) |
| Root of `components/Footer.tsx` | `mainFooter` (reserved word) |
| Root of `components/ContactForm.tsx` | `contactForm` (`form` is reserved BUT filename has qualifier) |
| Root of `components/PricingTier.tsx` | `pricingTier` (not reserved, no collision) |
| Root of `components/TableOfContents.tsx` | `tableOfContents` (not reserved) |
| Root of `components/Newsletter.tsx` | `newsletter` (not reserved, no collision) |
| `app/layout.tsx` | *(not tagged)* |
| Inline `<section>` inside `app/about/page.tsx` | *(not tagged)* |

If later a second header is added (`components/AdminHeader.tsx`), Wayfinder's incremental run detects the role collision and confirms the existing `mainHeader` stays (the bare filename is still the global one) plus adds `adminHeader` for the new file. The manifest is updated accordingly.

If `MobileHeader.tsx` is added instead, the bare `Header.tsx` keeps `mainHeader` and the new file becomes `mobileHeader` — the qualifier in the filename is the disambiguator.
