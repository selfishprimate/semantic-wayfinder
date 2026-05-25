# Editor instruction templates

These templates are written into the **user's project root** during the `/wayfind` bootstrap step, after the wizard collects the user's preferences.

## Which template goes where

| Template | Written as | Read by |
|---|---|---|
| `CLAUDE.md.template` | `CLAUDE.md` | Claude Code |
| `GEMINI.md.template` | `GEMINI.md` | Gemini CLI |
| `AGENTS.md.template` | `AGENTS.md` | Codex CLI, Aider, and other generic agents |

The skill writes whichever subset of these files the user selected during the editor-detection step.

## Placeholders

Each template contains placeholders the skill fills in from `.wayfinder.json`:

| Placeholder | Filled with | Example |
|---|---|---|
| `{{CASING}}` | The configured casing | `camelCase` or `kebab-case` |
| `{{PREFIX}}` | The configured prefix, or "none" | `wf-`, `myco-`, or `none` |
| `{{SCOPE}}` | The configured scope keyword | `sections` or `all` |
| `{{SCOPE_DESCRIPTION}}` | A human-readable explanation of scope | `tag <section>, <header>, <aside>, <nav>, <footer>, <main>, and top-level layout <div>s` |
| `{{PREFIX_EXAMPLE}}` | The prefix as it appears in examples | `wf-` for kebab, `wf` for camel, empty if no prefix |
| `{{EXAMPLE_HERO}}` | A live example for an About page hero | `aboutHero`, `wf-aboutHero`, etc. |
| `{{EXAMPLE_TESTIMONIALS}}` | Example for testimonials | `aboutTestimonials`, `wf-about-testimonials`, etc. |
| `{{EXAMPLE_SIDEBAR}}` | Example for a sidebar | `dashboardSidebar`, etc. |
| `{{EXAMPLE_FAQ}}` | Example for an FAQ | `pricingFAQ`, etc. |

## Why three separate templates instead of one universal file

Each agent has its own conventions and tone. Claude Code reads `CLAUDE.md` and responds well to a conversational, principle-led voice. Gemini and Codex respond better to more structured, table-oriented instructions. The substance is identical across all three; only the framing differs.

If you contribute a fix to one template, please mirror the corresponding change in the others so behavior stays consistent.

## Editing these templates

These are the source of truth for what agents see in user projects. Changes here affect every new install.

- Don't change the placeholder names without also updating `SKILL.md` Step 6
- Keep the substance aligned across all three files
- Test by running the skill end-to-end against a small mock project after edits
