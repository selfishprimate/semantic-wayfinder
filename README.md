# Semantic Wayfinder

> Give your pages and components an identity layer so AI agents stop guessing.

When you ask an AI agent to "update the contact form" or "edit the about page," it often edits the wrong file. The reason isn't the AI — it's that utility-class codebases give every element the same outfit and no name tag. The agent has to play detective on every request, and detective work burns tokens.

Semantic Wayfinder adds one identity class to each **page root** (`aboutPage`, `homePage`, `dashboardSettingsPage`...) and one to each **component root** (`contactForm`, `mainHeader`, `docsSidebar`...) so agents can `grep` and target precisely.

## Why this exists

Read the full argument here: **[Semantic Wayfinding: Why Vibe Coding Needs More Than Utility Classes](#)** *(link your article when published)*

The short version, in numbers from the article:

- A typical "update the contact form" edit, in a utility-only codebase, takes an agent **~1,300 tokens** to complete (multiple file reads, ambiguity, clarification turns).
- The same edit, in a Wayfinder-tagged codebase, takes **~190 tokens**. One `grep`, one edit.
- Roughly **6.9× cheaper, 85% saving** — see the article for the methodology and a transparency note on how the measurements were modeled.

## What's in this repo

Semantic Wayfinder ships as an **Agent Skill** for three editors that share the open Agent Skills standard, plus a CLI on the roadmap for everywhere else.

| Path | Editor | Status |
|---|---|---|
| `.claude/skills/wayfinder/` | Claude Code | ✅ v0.4.0 |
| `.agents/skills/wayfinder/` | Codex CLI, Aider, and other Agent-Skills-compatible agents | ✅ v0.4.0 |
| `.gemini/skills/wayfinder/` | Gemini CLI | ✅ v0.4.0 |
| `cli/` | `npx semantic-wayfinder` for any environment | 🚧 v0.3 |

The three `SKILL.md` files are kept in sync by `scripts/sync-skills.sh`. The `.claude/` copy is the source of truth.

## Quick start

The skill is a single `SKILL.md` file with **zero dependencies** — no runtime, no package install, no build step. Drop it into your project, run `/wayfinder`, done.

### Install in your project

From your project root, run the one-liner for your editor:

**Claude Code**

```bash
curl -fsSL https://raw.githubusercontent.com/selfishprimate/semantic-wayfinder/main/.claude/skills/wayfinder/SKILL.md \
  --create-dirs -o .claude/skills/wayfinder/SKILL.md
```

**Codex CLI** (and other Agent-Skills-compatible agents)

```bash
curl -fsSL https://raw.githubusercontent.com/selfishprimate/semantic-wayfinder/main/.agents/skills/wayfinder/SKILL.md \
  --create-dirs -o .agents/skills/wayfinder/SKILL.md
```

**Gemini CLI**

```bash
curl -fsSL https://raw.githubusercontent.com/selfishprimate/semantic-wayfinder/main/.gemini/skills/wayfinder/SKILL.md \
  --create-dirs -o .gemini/skills/wayfinder/SKILL.md
```

Then open your project in your editor and run:

```
/wayfinder
```

That's it. The wizard takes about a minute on first run; subsequent runs are incremental and silent.

> Prefer to vendor it yourself? Clone this repo and `cp -r .claude/skills/wayfinder your-project/.claude/skills/` (or the equivalent path for your editor). The skill is just markdown — nothing magical about the delivery mechanism.

If you don't use any of those three editors yet, the CLI is on the way — see [`cli/`](./cli) for the planned interface and roadmap.

## How it works

Wayfinder tags exactly two things — and nothing else:

1. **The root element of every page file** gets a `{page}Page` class. `app/about/page.tsx` → `aboutPage`. `app/page.tsx` → `homePage`. `app/dashboard/settings/page.tsx` → `dashboardSettingsPage`.
2. **The root element of every component file** gets the component's identity name. `components/ContactForm.tsx` → `contactForm`. `components/TableOfContents.tsx` → `tableOfContents`. `components/DocsSidebar.tsx` → `docsSidebar`.

Inline sections inside page files, layout files, generated files, and tests are all skipped. If you want something greppable, make it a component file.

`/wayfinder` runs in one of three modes, auto-detected (except `--remove`, which is explicit):

| Run | What happens |
|---|---|
| **First run** (no `.wayfinder.json`) | Bootstrap: asks about casing and (optional) prefix, writes rule files for the agents you use (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`), analyzes the project structure (Phase 1), tags every page root and component root (Phase 2), commits. |
| **Every later run** | Incremental: reads your existing config, finds new or changed files since last run, tags only those. Re-checks for newly introduced collisions and asks before renaming. |
| **`/wayfinder --remove`** | Strips every identity class Wayfinder added (per its manifest in `.wayfinder.json`), optionally deletes the config and instruction blocks. Utility classes and any semantic classes you wrote by hand are left untouched. |

To start over with different settings, run `/wayfinder --remove` (with the "full removal" option to also delete `.wayfinder.json` and the instruction blocks), then run `/wayfinder` again — bootstrap will trigger automatically.

> **Note — two different file types, easy to confuse:**
>
> - `SKILL.md` files in `.claude/`, `.agents/`, `.gemini/` are the **Wayfinder tool itself** — the instructions the agent reads when you run `/wayfinder`.
> - `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` in your project root are **rule files Wayfinder writes for you** during bootstrap, telling future agent work in this project to keep using the convention.
>
> The skill is the tool. The rule files are the policy.

## Naming conventions

You pick two things during bootstrap; Wayfinder stays consistent forever after.

| Choice | Options | Example |
|---|---|---|
| **Casing** | `camelCase` (default) or `kebab-case` | `aboutPage` vs `about-page`; `contactForm` vs `contact-form` |
| **Optional prefix** | none (default) / `wf` / custom | `aboutPage` vs `wfAboutPage` (camel) or `wf-about-page` (kebab) |

That's it. There used to be a third "scope" question in early drafts; it's gone. Wayfinder always tags page roots and component roots — the rule is fixed, no choice needed.

**Collision handling.** When two components share a role (e.g., both `Header.tsx` and `AdminHeader.tsx`), Wayfinder adds disambiguation prefixes during Phase 1: the most global one becomes `mainHeader`, the specialized one becomes `adminHeader`.

There's also a **reserved-words rule**: role names that are HTML elements (`header`, `footer`, `nav`, `aside`, `section`, `form`, ...) or universal UI patterns (`sidebar`, `modal`, `card`, `tooltip`, `banner`, ...) always get a `main` prefix when the filename is bare, even without a collision — a bare `header` class would be drowned by every `<header>` tag in `grep`. So a single `Header.tsx` alone resolves to `mainHeader`, not `header`. Roles outside this list with no collision keep their bare filename: `TableOfContents.tsx` → `tableOfContents`, `QuickAdd.tsx` → `quickAdd`.

The config lives in `.wayfinder.json` at your project root. Commit it — your collaborators should inherit the same conventions. See [`docs/conventions.md`](./docs/conventions.md) for the full grammar reference.

## Examples

See [`examples/`](./examples) for a before/after, plus a sample `.wayfinder.json`.

**Before** → utility-only:
```jsx
// components/ContactForm.tsx
export default function ContactForm() {
  return (
    <form className="px-6 py-20 bg-neutral-50">...</form>
  )
}
```

**After** → identity-tagged:
```jsx
// components/ContactForm.tsx
export default function ContactForm() {
  return (
    <form className="contactForm px-6 py-20 bg-neutral-50">...</form>
  )
}
```

Same styling, same behavior. Now `grep contactForm` lands directly on this component definition — across any page that uses it.

## What it never does

- Modifies files when your working tree is dirty (asks you to stash or commit first)
- Overwrites existing semantic classes that match your conventions
- Tags components when it isn't confident (asks you instead)
- Touches `node_modules`, build outputs, or gitignored files
- Removes utility classes — Wayfinder is **additive only**
- Reformats your code — preserves indentation, quotes, line breaks

## Roadmap

**Released** *(see [`CHANGELOG.md`](./CHANGELOG.md) for full notes):*

- **v0.4.0** *(current)* — Phase 1 discovery report auto-continues to Phase 2 unless a real decision is pending
- **v0.3.0** — `--reset` removed in favor of `--remove` + re-bootstrap; pre-commit hook simplified to patch-only auto-bump
- **v0.2.0** — Fragment-with-tagable-child rule; custom-component wrapper `className` injection; `wrapperMods` manifest field
- **v0.1.2** — Reserved-words list (`mainHeader` etc.); Phase 1 confirmation checkpoint; atomic manifest writes
- **v0.1.1** — Grammar rewrite: filename-derived component identity replaces page-prefixed names
- **v0.1.0** — Initial skill across Claude Code, Codex CLI, and Gemini CLI

**Planned:**

- **Next** — Vue and Svelte template parsers, better confidence scoring
- **Later** — `npx semantic-wayfinder` CLI for headless use, CI, and editors without Agent Skills support (BYOK)
- **Speculative** — `.wayfinder-patterns.json` for cross-run pattern learning; optional render + vision pass for hard-to-classify components

## Repo layout

```
semantic-wayfinder/
├── .claude/skills/wayfinder/SKILL.md    # Claude Code skill (source of truth)
├── .agents/skills/wayfinder/SKILL.md    # Codex CLI / generic skill
├── .gemini/skills/wayfinder/SKILL.md    # Gemini CLI skill
├── cli/                                          # v0.3 placeholder
├── docs/conventions.md                           # naming rules reference
├── examples/                                     # before/after + sample config
├── scripts/sync-skills.sh                        # keeps the three SKILL.md copies in sync
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Issues, pull requests, and naming-convention bikeshedding all welcome — please open an issue before significant changes so we can align on direction.

## License

MIT — see [`LICENSE`](./LICENSE).

## Credits

Concept and original article by [@selfishprimate](https://github.com/selfishprimate). Part of the broader [Plainify](#) toolkit philosophy around sustainable, structurally sound AI-built products.
