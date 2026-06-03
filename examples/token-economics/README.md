# Token Economics — reproducible simulation

`simulate.py` is the reproducible model behind the article's **Deney 2** (full agent-loop)
token comparison. It steps through the same edit request ("enlarge the contact form heading")
in two mock codebases — one tagged only with utility classes, one with semantic identity
classes — and measures every piece of content that enters the agent's context with OpenAI's
`tiktoken` (GPT-4 / `cl100k_base`).

The website demo (`../../website`) mirrors these exact step strings with `js-tiktoken`, so the
numbers shown live in the browser match this script byte-for-byte.

## Run it

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install tiktoken
python simulate.py
```

## What it reports

- Per-step token cost for each loop, plus totals (utility ~780 → semantic ~361).
- The **navigation tax**: tokens spent only to *find* the right file — i.e. total minus the
  irreducible baseline (issue request + read target file once + edit + report done).
  Utility ~455 vs semantic ~38.

> These are a transparent **model**, not a live agent log. Absolute numbers scale with how messy
> the project is (more similarly-named files / bigger components → bigger gap). What stays
> constant is the mechanism: a semantic identity class drives the file-finding cost toward zero.
