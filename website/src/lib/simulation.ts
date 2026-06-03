// Step-by-step agent-loop model — kept in sync with examples/token-economics/simulate.py.
// Token counts are computed live in the browser with js-tiktoken (cl100k_base), so whatever
// strings live here are what gets measured. (English copy; counts differ from the Turkish
// article on purpose — same mechanism, different language.)

export type StepKind =
  | "request"
  | "search"
  | "output"
  | "message"
  | "read"
  | "clarify"
  | "edit"
  | "done";

export interface Step {
  /** Short label shown in the terminal row. */
  label: string;
  /** The exact text that gets tokenized (what enters the agent's context). */
  content: string;
  kind: StepKind;
  /** Irreducible work both loops must pay (request + target read + edit + done). */
  baseline?: boolean;
}

// ── Mock file contents ───────────────────────────────────────────────────────

const ABOUT_CONTACT_TSX = `import Link from "next/link";

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
`;

const CONTACT_FORM_TSX = `"use client";

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
`;

const CONTACT_FORM_TAGGED_TSX = CONTACT_FORM_TSX.replace(
  '<form className="px-6 py-20 bg-neutral-50">',
  '<form className="contactForm px-6 py-20 bg-neutral-50">'
);

const ABOUT_PAGE_TSX = `import AboutContact from "@/components/sections/AboutContact";

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
`;

const EDIT_PAYLOAD = `ContactForm.tsx:
- <h2 className="text-2xl font-medium">Contact Form</h2>
+ <h2 className="text-3xl font-medium">Contact Form</h2>`;

const GREP_OUT_UTILITY = `app/contact/page.tsx:5:export default function ContactPage() {
app/about/page.tsx:1:import AboutContact from "@/components/sections/AboutContact";
app/about/page.tsx:14:      <AboutContact />
components/sections/AboutContact.tsx:3:export default function AboutContact() {
components/sections/ContactForm.tsx:5:export default function ContactForm() {`;

const GREP_OUT_SEMANTIC = `components/sections/ContactForm.tsx:9:    <form className="contactForm px-6 py-20 bg-neutral-50">`;

const DONE_MESSAGE =
  "Enlarged the heading in the ContactForm component (text-2xl -> text-3xl).";

// ── The two loops ────────────────────────────────────────────────────────────

export const utilitySteps: Step[] = [
  {
    label: '"enlarge the contact form heading on the about page"',
    content: "enlarge the contact form heading on the about page",
    kind: "request",
    baseline: true,
  },
  { label: 'grep -rn "contact" app components', content: 'grep -rn "contact" app components', kind: "search" },
  { label: "grep output — 4 matches", content: GREP_OUT_UTILITY, kind: "output" },
  {
    label: 'Assistant — "multiple matches, reading files to disambiguate…"',
    content:
      "Multiple matches found. Reading the candidate files to figure out which one you mean.",
    kind: "message",
  },
  { label: "Read  components/sections/AboutContact.tsx  (decoy)", content: ABOUT_CONTACT_TSX, kind: "read" },
  { label: "Read  components/sections/ContactForm.tsx  (target)", content: CONTACT_FORM_TSX, kind: "read", baseline: true },
  { label: "Read  app/about/page.tsx  (decoy)", content: ABOUT_PAGE_TSX, kind: "read" },
  {
    label: "Clarifying question — which one?",
    content:
      "I see two candidates on the about page: the AboutContact section and the shared ContactForm component. Which heading should I enlarge?",
    kind: "clarify",
  },
  { label: '"the shared ContactForm component"', content: "the shared ContactForm component", kind: "clarify" },
  { label: "Edit  ContactForm.tsx  (text-2xl → text-3xl)", content: EDIT_PAYLOAD, kind: "edit", baseline: true },
  { label: "Done", content: DONE_MESSAGE, kind: "done", baseline: true },
];

export const semanticSteps: Step[] = [
  {
    label: '"enlarge the contactForm heading"',
    content: "enlarge the contactForm heading",
    kind: "request",
    baseline: true,
  },
  { label: 'grep -rn "contactForm" app components', content: 'grep -rn "contactForm" app components', kind: "search" },
  { label: "grep output — 1 match", content: GREP_OUT_SEMANTIC, kind: "output" },
  { label: "Read  components/sections/ContactForm.tsx  (target)", content: CONTACT_FORM_TAGGED_TSX, kind: "read", baseline: true },
  { label: "Edit  ContactForm.tsx  (text-2xl → text-3xl)", content: EDIT_PAYLOAD, kind: "edit", baseline: true },
  { label: "Done", content: DONE_MESSAGE, kind: "done", baseline: true },
];
