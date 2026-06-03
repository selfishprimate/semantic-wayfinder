#!/usr/bin/env python3
"""
Semantic Wayfinder — step-by-step agent-loop token simulation.

The same edit request ("enlarge the contact form heading") is simulated step by step in two
codebases; at each step the content that ENTERS the agent's context is measured with tiktoken.
Counting rule: the token sum of every piece added during the loop (user message + each tool
call + each tool result + assistant messages). Provider-specific cache/re-billing is not modeled.

These strings are kept in sync with website/src/lib/simulation.ts, so the live js-tiktoken
counts in the browser match this script.
"""

import tiktoken

ENCODINGS = [("GPT-4", "cl100k_base"), ("GPT-4o", "o200k_base")]

# ─────────────────────────── Mock file contents ───────────────────────────

ABOUT_CONTACT_TSX = '''import Link from "next/link";

export default function AboutContact() {
  return (
    <section className="px-6 py-20 bg-neutral-50">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Get in touch with us
        </h2>
        <p className="mt-4 text-neutral-600">
          Have questions? Our team is happy to help you out.
        </p>
        <Link href="/contact" className="mt-8 inline-block rounded-lg bg-black px-6 py-3 text-white">
          Go to the contact page
        </Link>
      </div>
    </section>
  );
}
'''

CONTACT_FORM_TSX = '''"use client";

import { useState } from "react";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  return (
    <form className="px-6 py-20 bg-neutral-50">
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-medium">Contact Form</h2>
        <label className="mt-6 block text-sm">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
        <label className="mt-4 block text-sm">Your message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          rows={5}
        />
        <button type="submit" className="mt-6 rounded-lg bg-black px-6 py-3 text-white">
          Send
        </button>
      </div>
    </form>
  );
}
'''

# Tagged version: same file, identity class added to the root (one-line difference).
CONTACT_FORM_TAGGED_TSX = CONTACT_FORM_TSX.replace(
    '<form className="px-6 py-20 bg-neutral-50">',
    '<form className="contactForm px-6 py-20 bg-neutral-50">',
)

ABOUT_PAGE_TSX = '''import AboutContact from "@/components/sections/AboutContact";

export default function AboutPage() {
  return (
    <main className="flex flex-col">
      <section className="px-6 py-24 text-center">
        <h1 className="text-5xl font-bold">About us</h1>
        <p className="mt-4 text-neutral-600">A small team with a big dream.</p>
      </section>
      <section className="px-6 py-16">
        <h2 className="text-3xl font-semibold">Our story</h2>
        <p className="mt-4 text-neutral-600">We started out in 2021...</p>
      </section>
      <AboutContact />
    </main>
  );
}
'''

EDIT_PAYLOAD = '''ContactForm.tsx:
- <h2 className="text-2xl font-medium">Contact Form</h2>
+ <h2 className="text-3xl font-medium">Contact Form</h2>'''

GREP_OUT_UTILITY = (
    'app/contact/page.tsx:5:export default function ContactPage() {\n'
    'app/about/page.tsx:1:import AboutContact from "@/components/sections/AboutContact";\n'
    'app/about/page.tsx:14:      <AboutContact />\n'
    'components/sections/AboutContact.tsx:3:export default function AboutContact() {\n'
    'components/sections/ContactForm.tsx:5:export default function ContactForm() {'
)

GREP_OUT_SEMANTIC = (
    'components/sections/ContactForm.tsx:9:    <form className="contactForm px-6 py-20 bg-neutral-50">'
)

DONE_MESSAGE = "Enlarged the heading in the ContactForm component (text-2xl -> text-3xl)."

# ─────────────────────────── Loop definitions ───────────────────────────
# Each step: (label, content, baseline)
#   baseline = irreducible work both loops must pay (request + target read + edit + done).
#   Everything else is the "navigation tax" — effort spent only to find the right file
#   (extra greps, decoy reads, the "which one?" clarification round).

UTILITY_LOOP = [
    ("User request",                     "enlarge the contact form heading on the about page", True),
    ("grep call",                        'grep -rn "contact" app components', False),
    ("grep output (4 matches)",          GREP_OUT_UTILITY, False),
    ("Assistant message",
        "Multiple matches found. Reading the candidate files to figure out which one you mean.", False),
    ("Read: AboutContact.tsx (decoy)",   ABOUT_CONTACT_TSX, False),
    ("Read: ContactForm.tsx (target)",   CONTACT_FORM_TSX, True),
    ("Read: app/about/page.tsx (decoy)", ABOUT_PAGE_TSX, False),
    ("Clarifying question",
        "I see two candidates on the about page: the AboutContact section and the shared "
        "ContactForm component. Which heading should I enlarge?", False),
    ("User reply",                       "the shared ContactForm component", False),
    ("Edit",                             EDIT_PAYLOAD, True),
    ("Done message",                     DONE_MESSAGE, True),
]

SEMANTIC_LOOP = [
    ("User request",                     "enlarge the contactForm heading", True),
    ("grep call",                        'grep -rn "contactForm" app components', False),
    ("grep output (1 match)",            GREP_OUT_SEMANTIC, False),
    ("Read: ContactForm.tsx (target)",   CONTACT_FORM_TAGGED_TSX, True),
    ("Edit",                             EDIT_PAYLOAD, True),
    ("Done message",                     DONE_MESSAGE, True),
]


def count(enc, text):
    return len(enc.encode(text))


def run(enc):
    rows = {}
    for name, loop in [("UTILITY", UTILITY_LOOP), ("SEMANTIC", SEMANTIC_LOOP)]:
        total, baseline, steps = 0, 0, []
        for label, content, is_base in loop:
            t = count(enc, content)
            total += t
            if is_base:
                baseline += t
            steps.append((label, t))
        rows[name] = {"total": total, "baseline": baseline, "steps": steps}
    return rows


for model, enc_name in ENCODINGS:
    enc = tiktoken.get_encoding(enc_name)
    rows = run(enc)
    u, w = rows["UTILITY"], rows["SEMANTIC"]
    print(f"\n{'='*64}\n{model}  ({enc_name})\n{'='*64}")

    for name in ("UTILITY", "SEMANTIC"):
        r = rows[name]
        print(f"\n  -- {name} loop --")
        for label, t in r["steps"]:
            print(f"     {t:>5}  {label}")
        print(f"     {'-'*5}")
        print(f"     {r['total']:>5}  TOTAL")

    pct = 100 * (u["total"] - w["total"]) / u["total"]
    ratio = u["total"] / w["total"]
    print(f"\n  Result (full loop): {u['total']} -> {w['total']} tokens  "
          f"|  {ratio:.1f}x  |  {pct:.0f}% saved")

    u_tax = u["total"] - u["baseline"]
    w_tax = w["total"] - w["baseline"]
    print(f"  Navigation tax (total - irreducible baseline): "
          f"utility {u_tax} vs semantic {w_tax} tokens")
