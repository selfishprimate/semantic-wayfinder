// Step-by-step agent-loop model with 10 rotating scenarios.
// Token counts are computed live in the browser with js-tiktoken (cl100k_base);
// each scenario produces its own numbers. A transparent model, not a real agent run.

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
  label: string;
  content: string;
  kind: StepKind;
  baseline?: boolean; // irreducible work both loops must pay
}

interface FileDef {
  path: string;
  name: string;
  tag: string;
  cls: string; // utility-only classes on the root element
  body: string[];
}

interface Scenario {
  promptUtil: string;
  promptSem: string;
  grepWord: string; // utility grep term (matches several files)
  className: string; // semantic identity class (matches one)
  pageRefs: string[]; // extra grep-output lines from page/layout files
  decoys: FileDef[];
  target: FileDef;
  edit: { label: string; payload: string };
  clarifyQ: string;
  reply: string;
  doneMsg: string;
}

// ── Component source generator (keeps mock files realistic but compact) ───────

function mk(f: FileDef, extraClass?: string): string {
  const cls = extraClass ? `${extraClass} ${f.cls}` : f.cls;
  return (
    `export default function ${f.name}() {\n` +
    `  return (\n` +
    `    <${f.tag} className="${cls}">\n` +
    f.body.map((l) => "      " + l).join("\n") +
    `\n    </${f.tag}>\n` +
    `  );\n}\n`
  );
}

function defLine(f: FileDef): string {
  return `${f.path}:3:export default function ${f.name}() {`;
}

// Capitalize the first letter and ensure terminal punctuation.
function cap(s: string): string {
  const t = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.?!]$/.test(t) ? t : t + ".";
}

export function buildLoops(s: Scenario): { util: Step[]; sem: Step[] } {
  const matches = s.pageRefs.length + s.decoys.length + 1;
  const util: Step[] = [
    { label: cap(s.promptUtil), content: cap(s.promptUtil), kind: "request", baseline: true },
    {
      label: 'Assistant — "On it. Let me find the right file first, then make the change."',
      content: "On it. Let me find the right file first, then make the change.",
      kind: "message",
      baseline: true,
    },
    {
      label: `grep -rn "${s.grepWord}" app components`,
      content: `grep -rn "${s.grepWord}" app components`,
      kind: "search",
    },
    {
      label: `grep output — ${matches} matches`,
      content: [...s.pageRefs, ...s.decoys.map(defLine), defLine(s.target)].join("\n"),
      kind: "output",
    },
    {
      label: 'Assistant — "multiple matches, reading files…"',
      content: "Multiple matches found. Reading the candidate files to figure out which one you mean.",
      kind: "message",
    },
    ...s.decoys.map(
      (d): Step => ({ label: `Read  ${d.path}  (decoy)`, content: mk(d), kind: "read" })
    ),
    { label: `Read  ${s.target.path}  (target)`, content: mk(s.target), kind: "read", baseline: true },
    { label: "Clarifying question — which one?", content: s.clarifyQ, kind: "clarify" },
    { label: `"${cap(s.reply)}"`, content: cap(s.reply), kind: "clarify" },
    { label: s.edit.label, content: s.edit.payload, kind: "edit", baseline: true },
    { label: "Done", content: s.doneMsg, kind: "done", baseline: true },
  ];
  const sem: Step[] = [
    { label: cap(s.promptSem), content: cap(s.promptSem), kind: "request", baseline: true },
    {
      label: 'Assistant — "On it. Grepping the identity class, then I\'ll make the change."',
      content: "On it. Grepping the identity class, then I'll make the change.",
      kind: "message",
      baseline: true,
    },
    {
      label: `grep -rn "${s.className}" app components`,
      content: `grep -rn "${s.className}" app components`,
      kind: "search",
    },
    {
      label: "grep output — 1 match",
      content: `${s.target.path}:4:    <${s.target.tag} className="${s.className} ${s.target.cls}">`,
      kind: "output",
    },
    {
      label: `Read  ${s.target.path}  (target)`,
      content: mk(s.target, s.className),
      kind: "read",
      baseline: true,
    },
    { label: s.edit.label, content: s.edit.payload, kind: "edit", baseline: true },
    { label: "Done", content: s.doneMsg, kind: "done", baseline: true },
  ];
  return { util, sem };
}

// ── 10 scenarios ──────────────────────────────────────────────────────────────

export const SCENARIOS: Scenario[] = [
  {
    promptUtil: "enlarge the contact form heading on the about page",
    promptSem: "enlarge the contactForm heading",
    grepWord: "contact",
    className: "contactForm",
    pageRefs: [
      'app/about/page.tsx:1:import AboutContact from "@/components/sections/AboutContact";',
      "app/about/page.tsx:14:      <AboutContact />",
    ],
    decoys: [
      {
        path: "components/sections/AboutContact.tsx",
        name: "AboutContact",
        tag: "section",
        cls: "px-6 py-20 bg-neutral-50",
        body: [
          '<h2 className="text-3xl font-semibold">Get in touch</h2>',
          '<p className="mt-4 text-neutral-600">Our team is happy to help.</p>',
          '<a href="/contact" className="mt-8 inline-block rounded-lg bg-black px-6 py-3 text-white">Contact page</a>',
        ],
      },
    ],
    target: {
      path: "components/sections/ContactForm.tsx",
      name: "ContactForm",
      tag: "form",
      cls: "px-6 py-20 bg-neutral-50",
      body: [
        '<h2 className="text-2xl font-medium">Contact Form</h2>',
        '<label className="mt-6 block text-sm">Email</label>',
        '<input type="email" className="mt-1 w-full rounded border px-3 py-2" />',
        '<label className="mt-4 block text-sm">Your message</label>',
        '<textarea className="mt-1 w-full rounded border px-3 py-2" rows={5} />',
        '<button className="mt-6 rounded-lg bg-black px-6 py-3 text-white">Send</button>',
      ],
    },
    edit: {
      label: "Edit  ContactForm.tsx  (text-2xl → text-3xl)",
      payload:
        'ContactForm.tsx:\n- <h2 className="text-2xl font-medium">Contact Form</h2>\n+ <h2 className="text-3xl font-medium">Contact Form</h2>',
    },
    clarifyQ:
      "I see two candidates on the about page: the AboutContact section and the shared ContactForm component. Which heading should I enlarge?",
    reply: "the shared ContactForm component",
    doneMsg: "Enlarged the heading in the ContactForm component.",
  },

  {
    promptUtil: "make the price label bolder on the pricing page",
    promptSem: "make the pricingCard price bolder",
    grepWord: "pricing",
    className: "pricingCard",
    pageRefs: [
      'app/pricing/page.tsx:1:import PricingCard from "@/components/PricingCard";',
      "app/pricing/page.tsx:9:      <PricingCard plan={pro} />",
    ],
    decoys: [
      {
        path: "components/PricingFaq.tsx",
        name: "PricingFaq",
        tag: "section",
        cls: "px-6 py-16",
        body: [
          '<h2 className="text-2xl font-semibold">Pricing FAQ</h2>',
          '<ul className="mt-6 space-y-4 text-neutral-600"><li>Can I cancel anytime?</li></ul>',
        ],
      },
    ],
    target: {
      path: "components/PricingCard.tsx",
      name: "PricingCard",
      tag: "div",
      cls: "rounded-2xl border p-8",
      body: [
        '<h3 className="text-lg font-semibold">Pro</h3>',
        '<p className="mt-2 text-4xl font-medium">$29<span className="text-base">/mo</span></p>',
        '<ul className="mt-6 space-y-2 text-sm text-neutral-600"><li>Unlimited projects</li></ul>',
        '<button className="mt-8 w-full rounded-lg bg-black py-3 text-white">Choose Pro</button>',
      ],
    },
    edit: {
      label: "Edit  PricingCard.tsx  (font-medium → font-bold)",
      payload:
        'PricingCard.tsx:\n- <p className="mt-2 text-4xl font-medium">$29<span className="text-base">/mo</span></p>\n+ <p className="mt-2 text-4xl font-bold">$29<span className="text-base">/mo</span></p>',
    },
    clarifyQ:
      "There's a PricingFaq and a PricingCard on the pricing page. Which one's price label did you mean?",
    reply: "the PricingCard",
    doneMsg: "Made the price label bold in PricingCard.",
  },

  {
    promptUtil: "change the subscribe button text in the newsletter on the homepage",
    promptSem: "change the newsletterSignup button text",
    grepWord: "newsletter",
    className: "newsletterSignup",
    pageRefs: ['app/page.tsx:1:import NewsletterSignup from "@/components/NewsletterSignup";'],
    decoys: [
      {
        path: "components/Footer.tsx",
        name: "Footer",
        tag: "footer",
        cls: "border-t px-6 py-12",
        body: [
          '<p className="text-sm text-neutral-500">Join our newsletter for updates.</p>',
          '<input className="mt-3 rounded border px-3 py-2" placeholder="Email" />',
        ],
      },
    ],
    target: {
      path: "components/NewsletterSignup.tsx",
      name: "NewsletterSignup",
      tag: "section",
      cls: "rounded-xl bg-neutral-900 px-8 py-12 text-white",
      body: [
        '<h2 className="text-2xl font-semibold">Stay in the loop</h2>',
        '<p className="mt-2 text-neutral-300">One email a month, no spam.</p>',
        '<input className="mt-6 w-full rounded border px-3 py-2 text-black" placeholder="you@example.com" />',
        '<button className="mt-4 rounded-lg bg-white px-6 py-3 text-black">Subscribe</button>',
      ],
    },
    edit: {
      label: 'Edit  NewsletterSignup.tsx  ("Subscribe" → "Join")',
      payload:
        'NewsletterSignup.tsx:\n- <button className="mt-4 rounded-lg bg-white px-6 py-3 text-black">Subscribe</button>\n+ <button className="mt-4 rounded-lg bg-white px-6 py-3 text-black">Join</button>',
    },
    clarifyQ:
      "A newsletter sign-up appears in the Footer and as a standalone NewsletterSignup. Which button?",
    reply: "the NewsletterSignup component",
    doneMsg: "Updated the NewsletterSignup button text.",
  },

  {
    promptUtil: "make the logo bigger in the site header",
    promptSem: "make the mainHeader logo bigger",
    grepWord: "Header",
    className: "mainHeader",
    pageRefs: ['app/layout.tsx:2:import Header from "@/components/Header";'],
    decoys: [
      {
        path: "components/AdminHeader.tsx",
        name: "AdminHeader",
        tag: "header",
        cls: "flex items-center justify-between border-b px-6 py-3",
        body: [
          '<span className="font-semibold">Admin</span>',
          '<nav className="flex gap-4 text-sm"><a href="/admin/users">Users</a></nav>',
        ],
      },
      {
        path: "components/CardHeader.tsx",
        name: "CardHeader",
        tag: "div",
        cls: "flex items-center justify-between px-4 py-3",
        body: ['<h3 className="text-sm font-medium">{title}</h3>'],
      },
    ],
    target: {
      path: "components/Header.tsx",
      name: "Header",
      tag: "header",
      cls: "flex items-center justify-between px-6 py-4",
      body: [
        '<img src="/logo.svg" className="h-6 w-auto" alt="Logo" />',
        '<nav className="flex gap-6 text-sm"><a href="/about">About</a><a href="/pricing">Pricing</a></nav>',
      ],
    },
    edit: {
      label: "Edit  Header.tsx  (h-6 → h-8)",
      payload:
        'Header.tsx:\n- <img src="/logo.svg" className="h-6 w-auto" alt="Logo" />\n+ <img src="/logo.svg" className="h-8 w-auto" alt="Logo" />',
    },
    clarifyQ:
      "There are three matches: Header, AdminHeader and a CardHeader. Which one's logo did you mean?",
    reply: "the main site Header",
    doneMsg: "Enlarged the logo in the main Header.",
  },

  {
    promptUtil: "change the star color in the testimonials section on the homepage",
    promptSem: "change the testimonials star color",
    grepWord: "testimonial",
    className: "testimonials",
    pageRefs: ['app/page.tsx:3:import Testimonials from "@/components/Testimonials";'],
    decoys: [
      {
        path: "components/TestimonialCard.tsx",
        name: "TestimonialCard",
        tag: "figure",
        cls: "rounded-xl border p-6",
        body: [
          '<blockquote className="text-neutral-700">{quote}</blockquote>',
          '<figcaption className="mt-4 text-sm font-medium">{author}</figcaption>',
        ],
      },
    ],
    target: {
      path: "components/Testimonials.tsx",
      name: "Testimonials",
      tag: "section",
      cls: "px-6 py-20",
      body: [
        '<h2 className="text-3xl font-semibold">What people say</h2>',
        '<div className="mt-8 flex gap-1 text-yellow-400">★★★★★</div>',
        '<div className="mt-6 grid gap-6 sm:grid-cols-3">{items}</div>',
      ],
    },
    edit: {
      label: "Edit  Testimonials.tsx  (text-yellow-400 → text-amber-500)",
      payload:
        'Testimonials.tsx:\n- <div className="mt-8 flex gap-1 text-yellow-400">★★★★★</div>\n+ <div className="mt-8 flex gap-1 text-amber-500">★★★★★</div>',
    },
    clarifyQ:
      "There's a Testimonials section and a TestimonialCard. Which stars did you mean?",
    reply: "the Testimonials section",
    doneMsg: "Updated the star color in Testimonials.",
  },

  {
    promptUtil: "widen the sidebar in the docs section",
    promptSem: "widen the docsSidebar",
    grepWord: "sidebar",
    className: "docsSidebar",
    pageRefs: ['app/docs/layout.tsx:2:import DocsSidebar from "@/components/DocsSidebar";'],
    decoys: [
      {
        path: "components/AdminSidebar.tsx",
        name: "AdminSidebar",
        tag: "aside",
        cls: "w-56 border-r p-4",
        body: ['<nav className="space-y-1 text-sm"><a href="/admin">Dashboard</a></nav>'],
      },
    ],
    target: {
      path: "components/DocsSidebar.tsx",
      name: "DocsSidebar",
      tag: "aside",
      cls: "w-64 border-r p-6",
      body: [
        '<input className="w-full rounded border px-3 py-2 text-sm" placeholder="Search docs" />',
        '<nav className="mt-6 space-y-1 text-sm"><a href="/docs/intro">Introduction</a><a href="/docs/setup">Setup</a></nav>',
      ],
    },
    edit: {
      label: "Edit  DocsSidebar.tsx  (w-64 → w-72)",
      payload:
        'DocsSidebar.tsx:\n- <aside className="docsSidebar w-64 border-r p-6">\n+ <aside className="docsSidebar w-72 border-r p-6">',
    },
    clarifyQ: "There's a DocsSidebar and an AdminSidebar. Which one did you mean?",
    reply: "the DocsSidebar",
    doneMsg: "Widened the DocsSidebar.",
  },

  {
    promptUtil: "change the headline font on the homepage hero",
    promptSem: "change the homeHero headline font",
    grepWord: "hero",
    className: "homeHero",
    pageRefs: ['app/page.tsx:2:import HomeHero from "@/components/HomeHero";'],
    decoys: [
      {
        path: "components/HeroVideo.tsx",
        name: "HeroVideo",
        tag: "div",
        cls: "relative aspect-video overflow-hidden rounded-xl",
        body: ['<video src="/hero.mp4" className="h-full w-full object-cover" autoPlay muted />'],
      },
    ],
    target: {
      path: "components/HomeHero.tsx",
      name: "HomeHero",
      tag: "section",
      cls: "px-6 py-28 text-center",
      body: [
        '<h1 className="font-sans text-5xl font-bold">Ship faster</h1>',
        '<p className="mx-auto mt-4 max-w-xl text-neutral-600">The toolkit for modern teams.</p>',
        '<button className="mt-8 rounded-lg bg-black px-6 py-3 text-white">Get started</button>',
      ],
    },
    edit: {
      label: "Edit  HomeHero.tsx  (font-sans → font-serif)",
      payload:
        'HomeHero.tsx:\n- <h1 className="font-sans text-5xl font-bold">Ship faster</h1>\n+ <h1 className="font-serif text-5xl font-bold">Ship faster</h1>',
    },
    clarifyQ: "The homepage has a HomeHero and a HeroVideo. Which headline did you mean?",
    reply: "the HomeHero",
    doneMsg: "Changed the HomeHero headline font.",
  },

  {
    promptUtil: "update the placeholder in the search box",
    promptSem: "update the searchInput placeholder",
    grepWord: "search",
    className: "searchInput",
    pageRefs: ['components/Header.tsx:4:import SearchInput from "@/components/SearchInput";'],
    decoys: [
      {
        path: "components/SearchResults.tsx",
        name: "SearchResults",
        tag: "ul",
        cls: "divide-y",
        body: ['<li className="py-3">{result.title}</li>'],
      },
    ],
    target: {
      path: "components/SearchInput.tsx",
      name: "SearchInput",
      tag: "div",
      cls: "relative flex items-center rounded-lg border px-3 py-2",
      body: [
        '<svg className="mr-2 h-4 w-4 text-neutral-400" />',
        '<input className="flex-1 bg-transparent text-sm outline-none" placeholder="Search..." />',
      ],
    },
    edit: {
      label: 'Edit  SearchInput.tsx  ("Search..." → "Search docs...")',
      payload:
        'SearchInput.tsx:\n- <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Search..." />\n+ <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Search docs..." />',
    },
    clarifyQ: "There's a SearchInput and a SearchResults. Which one did you mean?",
    reply: "the SearchInput",
    doneMsg: "Updated the SearchInput placeholder.",
  },

  {
    promptUtil: "update the copyright year in the footer",
    promptSem: "update the mainFooter copyright year",
    grepWord: "footer",
    className: "mainFooter",
    pageRefs: ['app/layout.tsx:3:import Footer from "@/components/Footer";'],
    decoys: [
      {
        path: "components/FooterNav.tsx",
        name: "FooterNav",
        tag: "nav",
        cls: "flex gap-6 text-sm",
        body: ['<a href="/privacy">Privacy</a><a href="/terms">Terms</a>'],
      },
    ],
    target: {
      path: "components/Footer.tsx",
      name: "Footer",
      tag: "footer",
      cls: "border-t px-6 py-10 text-center text-sm text-neutral-500",
      body: [
        "<FooterNav />",
        '<p className="mt-6">© 2025 Acme, Inc. All rights reserved.</p>',
      ],
    },
    edit: {
      label: "Edit  Footer.tsx  (2025 → 2026)",
      payload:
        'Footer.tsx:\n- <p className="mt-6">© 2025 Acme, Inc. All rights reserved.</p>\n+ <p className="mt-6">© 2026 Acme, Inc. All rights reserved.</p>',
    },
    clarifyQ: "There's a Footer and a FooterNav. Which one has the copyright line?",
    reply: "the main Footer",
    doneMsg: "Updated the copyright year in Footer.",
  },

  {
    promptUtil: "make the confirm button red in the delete dialog on the settings page",
    promptSem: "make the deleteModal confirm button red",
    grepWord: "Modal",
    className: "deleteModal",
    pageRefs: ['app/settings/page.tsx:4:import DeleteModal from "@/components/DeleteModal";'],
    decoys: [
      {
        path: "components/SettingsModal.tsx",
        name: "SettingsModal",
        tag: "div",
        cls: "fixed inset-0 grid place-items-center bg-black/50",
        body: [
          '<div className="w-96 rounded-xl bg-white p-6"><h3 className="font-semibold">Settings</h3></div>',
        ],
      },
    ],
    target: {
      path: "components/DeleteModal.tsx",
      name: "DeleteModal",
      tag: "div",
      cls: "fixed inset-0 grid place-items-center bg-black/50",
      body: [
        '<div className="w-96 rounded-xl bg-white p-6">',
        '  <h3 className="text-lg font-semibold">Delete account?</h3>',
        '  <p className="mt-2 text-sm text-neutral-600">This cannot be undone.</p>',
        '  <button className="mt-6 rounded-lg bg-zinc-800 px-5 py-2 text-white">Confirm</button>',
        "</div>",
      ],
    },
    edit: {
      label: "Edit  DeleteModal.tsx  (bg-zinc-800 → bg-red-600)",
      payload:
        'DeleteModal.tsx:\n- <button className="mt-6 rounded-lg bg-zinc-800 px-5 py-2 text-white">Confirm</button>\n+ <button className="mt-6 rounded-lg bg-red-600 px-5 py-2 text-white">Confirm</button>',
    },
    clarifyQ: "There's a SettingsModal and a DeleteModal. Which confirm button did you mean?",
    reply: "the DeleteModal",
    doneMsg: "Made the DeleteModal confirm button red.",
  },

  {
    promptUtil: "tighten the spacing in the feature grid on the homepage",
    promptSem: "tighten the featureGrid spacing",
    grepWord: "feature",
    className: "featureGrid",
    pageRefs: ['app/page.tsx:4:import FeatureGrid from "@/components/FeatureGrid";'],
    decoys: [
      {
        path: "components/FeatureCard.tsx",
        name: "FeatureCard",
        tag: "div",
        cls: "rounded-xl border p-6",
        body: [
          '<div className="h-10 w-10 rounded bg-neutral-100" />',
          '<h3 className="mt-4 font-semibold">{title}</h3>',
          '<p className="mt-2 text-sm text-neutral-600">{description}</p>',
        ],
      },
    ],
    target: {
      path: "components/FeatureGrid.tsx",
      name: "FeatureGrid",
      tag: "section",
      cls: "px-6 py-20",
      body: [
        '<h2 className="text-3xl font-semibold">Everything you need</h2>',
        '<div className="mt-10 grid gap-8 sm:grid-cols-3">{features}</div>',
      ],
    },
    edit: {
      label: "Edit  FeatureGrid.tsx  (gap-8 → gap-5)",
      payload:
        'FeatureGrid.tsx:\n- <div className="mt-10 grid gap-8 sm:grid-cols-3">{features}</div>\n+ <div className="mt-10 grid gap-5 sm:grid-cols-3">{features}</div>',
    },
    clarifyQ: "There's a FeatureGrid and a FeatureCard. Which spacing did you mean?",
    reply: "the FeatureGrid",
    doneMsg: "Tightened the spacing in FeatureGrid.",
  },

  {
    promptUtil: "shrink the breadcrumb text in the docs header",
    promptSem: "shrink the breadcrumb text",
    grepWord: "breadcrumb",
    className: "breadcrumb",
    pageRefs: ['app/docs/layout.tsx:3:import Breadcrumb from "@/components/Breadcrumb";'],
    decoys: [
      {
        path: "components/DocsNav.tsx",
        name: "DocsNav",
        tag: "nav",
        cls: "flex gap-4 text-sm",
        body: ['<a href="/docs">Docs</a><a href="/docs/api">API</a>'],
      },
    ],
    target: {
      path: "components/Breadcrumb.tsx",
      name: "Breadcrumb",
      tag: "nav",
      cls: "flex items-center gap-2 text-sm text-neutral-500",
      body: ['<a href="/docs">Docs</a>', "<span>/</span>", '<span className="text-neutral-900">Setup</span>'],
    },
    edit: {
      label: "Edit  Breadcrumb.tsx  (text-sm → text-xs)",
      payload:
        'Breadcrumb.tsx:\n- <nav className="breadcrumb flex items-center gap-2 text-sm text-neutral-500">\n+ <nav className="breadcrumb flex items-center gap-2 text-xs text-neutral-500">',
    },
    clarifyQ: "There's a Breadcrumb and a DocsNav. Which text did you mean?",
    reply: "the Breadcrumb",
    doneMsg: "Shrank the breadcrumb text.",
  },

  {
    promptUtil: "underline the active tab on the settings page",
    promptSem: "underline the settingsTabs active tab",
    grepWord: "Tabs",
    className: "settingsTabs",
    pageRefs: ['app/settings/page.tsx:2:import SettingsTabs from "@/components/SettingsTabs";'],
    decoys: [
      {
        path: "components/ProfileTabs.tsx",
        name: "ProfileTabs",
        tag: "div",
        cls: "flex gap-6 border-b",
        body: ['<button className="py-2">Overview</button><button className="py-2">Activity</button>'],
      },
    ],
    target: {
      path: "components/SettingsTabs.tsx",
      name: "SettingsTabs",
      tag: "div",
      cls: "flex gap-6 border-b",
      body: [
        '<button className="border-b-2 border-transparent py-2">General</button>',
        '<button className="py-2">Billing</button>',
        '<button className="py-2">Security</button>',
      ],
    },
    edit: {
      label: "Edit  SettingsTabs.tsx  (border-transparent → border-black)",
      payload:
        'SettingsTabs.tsx:\n- <button className="border-b-2 border-transparent py-2">General</button>\n+ <button className="border-b-2 border-black py-2">General</button>',
    },
    clarifyQ: "There's a SettingsTabs and a ProfileTabs. Which active tab?",
    reply: "the SettingsTabs",
    doneMsg: "Underlined the active SettingsTabs tab.",
  },

  {
    promptUtil: "add a divider above sign out in the user menu",
    promptSem: "add a divider to the userMenu",
    grepWord: "Menu",
    className: "userMenu",
    pageRefs: ['components/Header.tsx:5:import UserMenu from "@/components/UserMenu";'],
    decoys: [
      {
        path: "components/MobileMenu.tsx",
        name: "MobileMenu",
        tag: "nav",
        cls: "flex flex-col gap-2 p-4",
        body: ['<a href="/about">About</a><a href="/pricing">Pricing</a>'],
      },
      {
        path: "components/ContextMenu.tsx",
        name: "ContextMenu",
        tag: "div",
        cls: "absolute rounded-md border bg-white py-1 shadow",
        body: ['<button className="px-3 py-1.5 text-sm">Copy</button>'],
      },
    ],
    target: {
      path: "components/UserMenu.tsx",
      name: "UserMenu",
      tag: "div",
      cls: "absolute right-0 w-48 rounded-lg border bg-white py-1 shadow",
      body: [
        '<a className="block px-3 py-2 text-sm" href="/account">Account</a>',
        '<a className="block px-3 py-2 text-sm" href="/settings">Settings</a>',
        '<button className="block w-full px-3 py-2 text-left text-sm">Sign out</button>',
      ],
    },
    edit: {
      label: "Edit  UserMenu.tsx  (add divider)",
      payload:
        'UserMenu.tsx:\n  <a className="block px-3 py-2 text-sm" href="/settings">Settings</a>\n+ <hr className="my-1 border-neutral-200" />\n  <button className="block w-full px-3 py-2 text-left text-sm">Sign out</button>',
    },
    clarifyQ: "There are three menus: UserMenu, MobileMenu and a ContextMenu. Which one?",
    reply: "the UserMenu",
    doneMsg: "Added a divider to the UserMenu.",
  },

  {
    promptUtil: "make the error toast message bigger",
    promptSem: "make the errorToast message bigger",
    grepWord: "Toast",
    className: "errorToast",
    pageRefs: ['app/layout.tsx:4:import ToastProvider from "@/components/ToastProvider";'],
    decoys: [
      {
        path: "components/ToastProvider.tsx",
        name: "ToastProvider",
        tag: "div",
        cls: "fixed bottom-4 right-4 space-y-2",
        body: ["{toasts.map((t) => <Toast key={t.id} {...t} />)}"],
      },
    ],
    target: {
      path: "components/ErrorToast.tsx",
      name: "ErrorToast",
      tag: "div",
      cls: "flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-white",
      body: ['<span className="text-sm">{message}</span>', '<button className="ml-auto text-white/80">×</button>'],
    },
    edit: {
      label: "Edit  ErrorToast.tsx  (text-sm → text-base)",
      payload:
        'ErrorToast.tsx:\n- <span className="text-sm">{message}</span>\n+ <span className="text-base">{message}</span>',
    },
    clarifyQ: "There's an ErrorToast and a ToastProvider. Which message?",
    reply: "the ErrorToast",
    doneMsg: "Enlarged the ErrorToast message.",
  },

  {
    promptUtil: "add more spacing between items in the FAQ accordion",
    promptSem: "add spacing to the faqAccordion",
    grepWord: "accordion",
    className: "faqAccordion",
    pageRefs: ['app/pricing/page.tsx:5:import FaqAccordion from "@/components/FaqAccordion";'],
    decoys: [
      {
        path: "components/MobileAccordion.tsx",
        name: "MobileAccordion",
        tag: "div",
        cls: "divide-y",
        body: ["<details className=\"py-2\"><summary>Menu</summary></details>"],
      },
    ],
    target: {
      path: "components/FaqAccordion.tsx",
      name: "FaqAccordion",
      tag: "div",
      cls: "space-y-2",
      body: [
        '<details className="rounded-lg border p-4">',
        '  <summary className="font-medium">Can I cancel anytime?</summary>',
        '  <p className="mt-2 text-sm text-neutral-600">Yes, cancel whenever you like.</p>',
        "</details>",
      ],
    },
    edit: {
      label: "Edit  FaqAccordion.tsx  (space-y-2 → space-y-4)",
      payload:
        'FaqAccordion.tsx:\n- <div className="faqAccordion space-y-2">\n+ <div className="faqAccordion space-y-4">',
    },
    clarifyQ: "There's a FaqAccordion and a MobileAccordion. Which one?",
    reply: "the FaqAccordion",
    doneMsg: "Added spacing to the FaqAccordion.",
  },

  {
    promptUtil: "make the metric number bigger in the stat card on the dashboard",
    promptSem: "make the statCard number bigger",
    grepWord: "stat",
    className: "statCard",
    pageRefs: ['app/dashboard/page.tsx:3:import StatCard from "@/components/StatCard";'],
    decoys: [
      {
        path: "components/ChartCard.tsx",
        name: "ChartCard",
        tag: "div",
        cls: "rounded-xl border p-6",
        body: ['<h3 className="text-sm text-neutral-500">Revenue</h3>', '<div className="mt-4 h-32">{chart}</div>'],
      },
    ],
    target: {
      path: "components/StatCard.tsx",
      name: "StatCard",
      tag: "div",
      cls: "rounded-xl border p-6",
      body: [
        '<h3 className="text-sm text-neutral-500">Active users</h3>',
        '<p className="mt-2 text-2xl font-semibold">12,480</p>',
      ],
    },
    edit: {
      label: "Edit  StatCard.tsx  (text-2xl → text-4xl)",
      payload:
        'StatCard.tsx:\n- <p className="mt-2 text-2xl font-semibold">12,480</p>\n+ <p className="mt-2 text-4xl font-semibold">12,480</p>',
    },
    clarifyQ: "There's a StatCard and a ChartCard on the dashboard. Which number?",
    reply: "the StatCard",
    doneMsg: "Enlarged the StatCard number.",
  },

  {
    promptUtil: "round the day buttons more in the date picker on the booking page",
    promptSem: "round the datePicker day buttons more",
    grepWord: "Picker",
    className: "datePicker",
    pageRefs: ['app/booking/page.tsx:2:import DatePicker from "@/components/DatePicker";'],
    decoys: [
      {
        path: "components/TimePicker.tsx",
        name: "TimePicker",
        tag: "div",
        cls: "grid grid-cols-4 gap-2",
        body: ['{slots.map((s) => <button key={s} className="rounded border py-1 text-sm">{s}</button>)}'],
      },
    ],
    target: {
      path: "components/DatePicker.tsx",
      name: "DatePicker",
      tag: "div",
      cls: "grid grid-cols-7 gap-1",
      body: [
        "{days.map((d) => (",
        '  <button key={d.date} className="rounded p-2 text-sm hover:bg-neutral-100">{d.day}</button>',
        "))}",
      ],
    },
    edit: {
      label: "Edit  DatePicker.tsx  (rounded → rounded-lg)",
      payload:
        'DatePicker.tsx:\n- <button key={d.date} className="rounded p-2 text-sm hover:bg-neutral-100">{d.day}</button>\n+ <button key={d.date} className="rounded-lg p-2 text-sm hover:bg-neutral-100">{d.day}</button>',
    },
    clarifyQ: "There's a DatePicker and a TimePicker. Which one?",
    reply: "the DatePicker",
    doneMsg: "Rounded the DatePicker day buttons.",
  },

  {
    promptUtil: "change the accept button color in the cookie banner",
    promptSem: "change the cookieBanner accept button color",
    grepWord: "Banner",
    className: "cookieBanner",
    pageRefs: ['app/layout.tsx:5:import CookieBanner from "@/components/CookieBanner";'],
    decoys: [
      {
        path: "components/PromoBanner.tsx",
        name: "PromoBanner",
        tag: "div",
        cls: "bg-black px-4 py-2 text-center text-sm text-white",
        body: ["<span>Summer sale, 30% off.</span>"],
      },
    ],
    target: {
      path: "components/CookieBanner.tsx",
      name: "CookieBanner",
      tag: "div",
      cls: "fixed bottom-4 left-4 right-4 flex items-center gap-4 rounded-xl border bg-white p-4 shadow",
      body: [
        '<p className="text-sm text-neutral-600">We use cookies to improve your experience.</p>',
        '<button className="ml-auto rounded-lg bg-black px-4 py-2 text-sm text-white">Accept</button>',
      ],
    },
    edit: {
      label: "Edit  CookieBanner.tsx  (bg-black → bg-emerald-600)",
      payload:
        'CookieBanner.tsx:\n- <button className="ml-auto rounded-lg bg-black px-4 py-2 text-sm text-white">Accept</button>\n+ <button className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Accept</button>',
    },
    clarifyQ: "There's a CookieBanner and a PromoBanner. Which accept button?",
    reply: "the CookieBanner",
    doneMsg: "Changed the CookieBanner accept button color.",
  },

  {
    promptUtil: "make the table header sticky in the orders list on the admin page",
    promptSem: "make the ordersTable header sticky",
    grepWord: "Table",
    className: "ordersTable",
    pageRefs: ['app/admin/orders/page.tsx:2:import OrdersTable from "@/components/OrdersTable";'],
    decoys: [
      {
        path: "components/DataTable.tsx",
        name: "DataTable",
        tag: "table",
        cls: "w-full text-sm",
        body: ["<thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>"],
      },
    ],
    target: {
      path: "components/OrdersTable.tsx",
      name: "OrdersTable",
      tag: "table",
      cls: "w-full text-sm",
      body: [
        '<thead className="text-left text-neutral-500"><tr><th className="py-2">Order</th><th className="py-2">Status</th></tr></thead>',
        "<tbody>{orders.map((o) => <tr key={o.id}><td>{o.id}</td></tr>)}</tbody>",
      ],
    },
    edit: {
      label: "Edit  OrdersTable.tsx  (add sticky header)",
      payload:
        'OrdersTable.tsx:\n- <thead className="text-left text-neutral-500">\n+ <thead className="sticky top-0 bg-white text-left text-neutral-500">',
    },
    clarifyQ: "There's an OrdersTable and a DataTable. Which header?",
    reply: "the OrdersTable",
    doneMsg: "Made the OrdersTable header sticky.",
  },
];

// ── Entire-session demo: 20 realistic working sessions ────────────────────────
// A real agent does NOT re-search for a file it's already editing. Within a
// component, follow-up tweaks are free on BOTH sides — no grep, no re-read —
// because the file is already in context. The gap only opens when the work moves
// to a NEW part of the codebase: utility-only pays the detective tax at every
// new target, while the semantic codebase lands in one grep. Each session below
// is a coherent feature built across a few components, mixing "locate" turns
// (a fresh component) with in-context "follow-up" turns. One is picked at random.

export type SessionTurn =
  | ({ kind: "locate" } & Scenario)
  | {
      // A follow-up on the file we're already editing — no class name needed,
      // because the agent already has it in context.
      kind: "followup";
      prompt: string;
      targetName: string;
      edit: { label: string; payload: string };
      doneMsg: string;
    };

// Compact builders so 20 sessions stay readable.
function f(path: string, name: string, tag: string, cls: string, ...body: string[]): FileDef {
  return { path, name, tag, cls, body };
}
function loc(
  pu: string,
  ps: string,
  grep: string,
  cls: string,
  page: string,
  decoys: FileDef[],
  target: FileDef,
  editLabel: string,
  editPayload: string,
  clarify: string,
  reply: string,
  done: string
): SessionTurn {
  return {
    kind: "locate",
    promptUtil: pu,
    promptSem: ps,
    grepWord: grep,
    className: cls,
    pageRefs: [page],
    decoys,
    target,
    edit: { label: editLabel, payload: editPayload },
    clarifyQ: clarify,
    reply,
    doneMsg: done,
  };
}
function fu(
  prompt: string,
  targetName: string,
  editLabel: string,
  editPayload: string,
  done: string
): SessionTurn {
  return { kind: "followup", prompt, targetName, edit: { label: editLabel, payload: editPayload }, doneMsg: done };
}

// Follow-up turn: one short, identical loop on both sides (request + ack + edit + done).
function followupLoop(t: Extract<SessionTurn, { kind: "followup" }>): Step[] {
  return [
    { label: cap(t.prompt), content: cap(t.prompt), kind: "request", baseline: true },
    {
      label: `Assistant — "${t.targetName} is already open — applying it."`,
      content: `${t.targetName} is already open from the last edit. Applying the change.`,
      kind: "message",
      baseline: true,
    },
    { label: t.edit.label, content: t.edit.payload, kind: "edit", baseline: true },
    { label: "Done", content: t.doneMsg, kind: "done", baseline: true },
  ];
}

export function buildSessionTurn(t: SessionTurn): { util: Step[]; sem: Step[] } {
  if (t.kind === "locate") return buildLoops(t);
  const loop = followupLoop(t);
  // Same work both sides — clone so each column animates independently.
  return { util: loop, sem: loop.map((s) => ({ ...s })) };
}

export const SESSIONS: SessionTurn[][] = [
  // 1 — Checkout flow
  [
    loc(
      "add a card number field to the checkout form",
      "add a card number field to the checkoutForm",
      "card",
      "checkoutForm",
      'app/checkout/page.tsx:3:import CheckoutForm from "@/components/CheckoutForm";',
      [
        f("components/PricingCard.tsx", "PricingCard", "div", "rounded-2xl border p-8", '<h3 className="text-lg font-semibold">Pro</h3>'),
        f("components/CardSkeleton.tsx", "CardSkeleton", "div", "animate-pulse rounded-xl bg-zinc-100", '<div className="h-24 w-full" />'),
      ],
      f("components/CheckoutForm.tsx", "CheckoutForm", "form", "space-y-4 rounded-2xl border p-6", '<h2 className="text-xl font-semibold">Checkout</h2>', '<button className="w-full rounded-lg bg-black py-3 text-white">Pay</button>'),
      "Edit  CheckoutForm.tsx  (+ card number input)",
      'CheckoutForm.tsx:\n+ <input className="w-full rounded-lg border px-3 py-2" placeholder="Card number" />',
      "There's a CheckoutForm, a PricingCard and a CardSkeleton. Which one?",
      "the CheckoutForm",
      "Added a card number field to the CheckoutForm."
    ),
    fu("now add expiry and CVC next to it", "CheckoutForm", "Edit  CheckoutForm.tsx  (+ expiry / CVC row)", 'CheckoutForm.tsx:\n+ <div className="flex gap-3"><input placeholder="MM / YY" /><input placeholder="CVC" /></div>', "Added expiry and CVC inputs."),
    loc(
      "show the tax line in the order summary",
      "show the tax line in the orderSummary",
      "summary",
      "orderSummary",
      'app/checkout/page.tsx:4:import OrderSummary from "@/components/OrderSummary";',
      [
        f("components/CartSummary.tsx", "CartSummary", "div", "rounded-xl border p-4", '<p className="text-sm">{itemCount} items</p>'),
        f("components/SummaryCard.tsx", "SummaryCard", "div", "rounded-2xl bg-zinc-50 p-6", '<dl className="space-y-1">{rows}</dl>'),
      ],
      f("components/OrderSummary.tsx", "OrderSummary", "aside", "space-y-2 rounded-2xl border p-6", '<div className="flex justify-between"><span>Total</span><span>$49</span></div>'),
      "Edit  OrderSummary.tsx  (+ tax line)",
      'OrderSummary.tsx:\n+ <div className="flex justify-between"><span>Tax</span><span>$3.92</span></div>',
      "There's an OrderSummary, a CartSummary and a SummaryCard. Which one?",
      "the OrderSummary",
      "Added the tax line to the OrderSummary."
    ),
    fu("round the total to two decimals", "OrderSummary", "Edit  OrderSummary.tsx  (format total)", 'OrderSummary.tsx:\n- <span>$49</span>\n+ <span>{total.toFixed(2)}</span>', "Formatted the total."),
  ],
  // 2 — Blog article page
  [
    loc(
      "widen the line length on the article body",
      "widen the line length on the articleBody",
      "article",
      "articleBody",
      'app/blog/[slug]/page.tsx:5:import ArticleBody from "@/components/ArticleBody";',
      [
        f("components/ArticleMeta.tsx", "ArticleMeta", "div", "flex gap-3 text-sm text-zinc-500", "<span>{date}</span>"),
        f("components/ArticleList.tsx", "ArticleList", "ul", "space-y-6", "{posts.map(renderRow)}"),
      ],
      f("components/ArticleBody.tsx", "ArticleBody", "article", "prose mx-auto max-w-2xl", "{children}"),
      "Edit  ArticleBody.tsx  (max-w-2xl → max-w-3xl)",
      'ArticleBody.tsx:\n- <article className="prose mx-auto max-w-2xl">\n+ <article className="prose mx-auto max-w-3xl">',
      "There's an ArticleBody, an ArticleMeta and an ArticleList. Which one?",
      "the ArticleBody",
      "Widened the ArticleBody."
    ),
    fu("bump the base font a touch", "ArticleBody", "Edit  ArticleBody.tsx  (prose → prose-lg)", 'ArticleBody.tsx:\n- className="prose mx-auto max-w-3xl"\n+ className="prose prose-lg mx-auto max-w-3xl"', "Bumped the font size."),
    loc(
      "make the author avatar bigger in the author card",
      "make the avatar bigger in the authorCard",
      "author",
      "authorCard",
      'app/blog/[slug]/page.tsx:6:import AuthorCard from "@/components/AuthorCard";',
      [f("components/AuthorBio.tsx", "AuthorBio", "p", "text-sm text-zinc-500", "{bio}")],
      f("components/AuthorCard.tsx", "AuthorCard", "div", "flex items-center gap-3", '<img className="h-10 w-10 rounded-full" />'),
      "Edit  AuthorCard.tsx  (h-10 → h-14)",
      'AuthorCard.tsx:\n- <img className="h-10 w-10 rounded-full" />\n+ <img className="h-14 w-14 rounded-full" />',
      "There's an AuthorCard and an AuthorBio. Which one?",
      "the AuthorCard",
      "Enlarged the AuthorCard avatar."
    ),
  ],
  // 3 — Analytics dashboard
  [
    loc(
      "tighten the gaps in the stats grid",
      "tighten the gaps in the statsGrid",
      "grid",
      "statsGrid",
      'app/dashboard/page.tsx:4:import StatsGrid from "@/components/StatsGrid";',
      [
        f("components/FeatureGrid.tsx", "FeatureGrid", "section", "px-6 py-20", "<div className=\"grid gap-8\">{features}</div>"),
        f("components/ImageGrid.tsx", "ImageGrid", "div", "grid grid-cols-3 gap-2", "{photos.map(renderTile)}"),
      ],
      f("components/StatsGrid.tsx", "StatsGrid", "div", "grid gap-6 sm:grid-cols-4", "{stats.map(renderStat)}"),
      "Edit  StatsGrid.tsx  (gap-6 → gap-4)",
      'StatsGrid.tsx:\n- <div className="statsGrid grid gap-6 sm:grid-cols-4">\n+ <div className="statsGrid grid gap-4 sm:grid-cols-4">',
      "There's a StatsGrid, a FeatureGrid and an ImageGrid. Which one?",
      "the StatsGrid",
      "Tightened the StatsGrid."
    ),
    fu("make it two columns on mobile", "StatsGrid", "Edit  StatsGrid.tsx  (+ grid-cols-2)", 'StatsGrid.tsx:\n- grid gap-4 sm:grid-cols-4\n+ grid grid-cols-2 gap-4 sm:grid-cols-4', "Made it two columns on mobile."),
    loc(
      "add a timestamp to each row in the activity feed",
      "add a timestamp to the activityFeed rows",
      "activity",
      "activityFeed",
      'app/dashboard/page.tsx:6:import ActivityFeed from "@/components/ActivityFeed";',
      [f("components/ActivityChart.tsx", "ActivityChart", "div", "h-64", "<Line data={data} />")],
      f("components/ActivityFeed.tsx", "ActivityFeed", "ul", "divide-y", "{events.map(renderEvent)}"),
      "Edit  ActivityFeed.tsx  (+ timestamp)",
      'ActivityFeed.tsx:\n+ <time className="text-xs text-zinc-500">{e.at}</time>',
      "There's an ActivityFeed and an ActivityChart. Which one?",
      "the ActivityFeed",
      "Added timestamps to the ActivityFeed."
    ),
  ],
  // 4 — Account settings
  [
    loc(
      "make the save button full width on the profile form",
      "make the save button full width on the profileForm",
      "profile",
      "profileForm",
      'app/settings/page.tsx:3:import ProfileForm from "@/components/ProfileForm";',
      [
        f("components/ProfileHeader.tsx", "ProfileHeader", "header", "flex items-center gap-4", "<Avatar />"),
        f("components/ProfileTabs.tsx", "ProfileTabs", "nav", "flex gap-4 border-b", "{tabs}"),
      ],
      f("components/ProfileForm.tsx", "ProfileForm", "form", "space-y-4", '<button className="rounded-lg bg-black px-4 py-2 text-white">Save</button>'),
      "Edit  ProfileForm.tsx  (+ w-full on button)",
      'ProfileForm.tsx:\n- <button className="rounded-lg bg-black px-4 py-2 text-white">Save</button>\n+ <button className="w-full rounded-lg bg-black px-4 py-2 text-white">Save</button>',
      "There's a ProfileForm, a ProfileHeader and ProfileTabs. Which one?",
      "the ProfileForm",
      "Made the ProfileForm save button full width."
    ),
    fu("disable it until something changes", "ProfileForm", "Edit  ProfileForm.tsx  (+ disabled)", 'ProfileForm.tsx:\n+ disabled={!isDirty}', "Disabled the button until the form is dirty."),
    loc(
      "make the delete account button red in the danger zone",
      "make the delete button red in the dangerZone",
      "danger",
      "dangerZone",
      'app/settings/page.tsx:8:import DangerZone from "@/components/DangerZone";',
      [f("components/DangerNote.tsx", "DangerNote", "p", "text-sm text-zinc-500", "{note}")],
      f("components/DangerZone.tsx", "DangerZone", "section", "rounded-2xl border border-red-200 p-6", '<button className="rounded-lg border px-4 py-2">Delete account</button>'),
      "Edit  DangerZone.tsx  (+ bg-red-600)",
      'DangerZone.tsx:\n- <button className="rounded-lg border px-4 py-2">Delete account</button>\n+ <button className="rounded-lg bg-red-600 px-4 py-2 text-white">Delete account</button>',
      "There's a DangerZone and a DangerNote. Which one?",
      "the DangerZone",
      "Made the DangerZone delete button red."
    ),
  ],
  // 5 — Auth / login
  [
    loc(
      "add a remember-me checkbox to the login form",
      "add a remember-me checkbox to the loginForm",
      "login",
      "loginForm",
      'app/login/page.tsx:2:import LoginForm from "@/components/LoginForm";',
      [
        f("components/LoginHero.tsx", "LoginHero", "div", "hidden lg:block", "<img src=\"/hero.jpg\" />"),
        f("components/LogoutButton.tsx", "LogoutButton", "button", "text-sm text-zinc-500", "Sign out"),
      ],
      f("components/LoginForm.tsx", "LoginForm", "form", "space-y-4", '<input placeholder="Email" />', '<input type="password" />'),
      "Edit  LoginForm.tsx  (+ remember-me)",
      'LoginForm.tsx:\n+ <label className="flex gap-2 text-sm"><input type="checkbox" /> Remember me</label>',
      "There's a LoginForm, a LoginHero and a LogoutButton. Which one?",
      "the LoginForm",
      "Added a remember-me checkbox to the LoginForm."
    ),
    fu("add a forgot-password link under it", "LoginForm", "Edit  LoginForm.tsx  (+ forgot link)", 'LoginForm.tsx:\n+ <a href="/reset" className="text-sm text-zinc-500">Forgot password?</a>', "Added a forgot-password link."),
    loc(
      "space out the social login buttons",
      "space out the socialLogin buttons",
      "social",
      "socialLogin",
      'app/login/page.tsx:3:import SocialLogin from "@/components/SocialLogin";',
      [f("components/SocialShare.tsx", "SocialShare", "div", "flex gap-2", "<ShareIcons />")],
      f("components/SocialLogin.tsx", "SocialLogin", "div", "flex gap-2", '<button>Google</button><button>GitHub</button>'),
      "Edit  SocialLogin.tsx  (gap-2 → gap-3, stack)",
      'SocialLogin.tsx:\n- <div className="socialLogin flex gap-2">\n+ <div className="socialLogin grid gap-3">',
      "There's a SocialLogin and a SocialShare. Which one?",
      "the SocialLogin",
      "Spaced out the SocialLogin buttons."
    ),
  ],
  // 6 — Pricing page
  [
    loc(
      "highlight the popular plan in the pricing table",
      "highlight the popular plan in the pricingTable",
      "pricing",
      "pricingTable",
      'app/pricing/page.tsx:2:import PricingTable from "@/components/PricingTable";',
      [
        f("components/PricingFaq.tsx", "PricingFaq", "section", "px-6 py-16", '<h2>Pricing FAQ</h2>'),
        f("components/PricingHero.tsx", "PricingHero", "header", "py-20 text-center", "<h1>Plans</h1>"),
      ],
      f("components/PricingTable.tsx", "PricingTable", "div", "grid gap-6 sm:grid-cols-3", "{plans.map(renderPlan)}"),
      "Edit  PricingTable.tsx  (+ ring on popular)",
      'PricingTable.tsx:\n+ className={p.popular ? "ring-2 ring-black" : ""}',
      "There's a PricingTable, a PricingFaq and a PricingHero. Which one?",
      "the PricingTable",
      "Highlighted the popular plan in the PricingTable."
    ),
    fu("add a Most Popular badge to it", "PricingTable", "Edit  PricingTable.tsx  (+ badge)", 'PricingTable.tsx:\n+ {p.popular && <span className="rounded-full bg-black px-2 text-xs text-white">Most Popular</span>}', "Added a Most Popular badge."),
    loc(
      "add more spacing between the FAQ items",
      "add spacing to the faqAccordion",
      "accordion",
      "faqAccordion",
      'app/pricing/page.tsx:4:import FaqAccordion from "@/components/FaqAccordion";',
      [f("components/MobileAccordion.tsx", "MobileAccordion", "div", "divide-y", "<details><summary>Menu</summary></details>")],
      f("components/FaqAccordion.tsx", "FaqAccordion", "div", "space-y-2", '<details className="rounded-lg border p-4"><summary>Can I cancel?</summary></details>'),
      "Edit  FaqAccordion.tsx  (space-y-2 → space-y-4)",
      'FaqAccordion.tsx:\n- <div className="faqAccordion space-y-2">\n+ <div className="faqAccordion space-y-4">',
      "There's a FaqAccordion and a MobileAccordion. Which one?",
      "the FaqAccordion",
      "Spaced out the FaqAccordion."
    ),
  ],
  // 7 — Search experience
  [
    loc(
      "add a clear button to the search bar",
      "add a clear button to the searchBar",
      "search",
      "searchBar",
      'app/search/page.tsx:2:import SearchBar from "@/components/SearchBar";',
      [
        f("components/SearchFilters.tsx", "SearchFilters", "aside", "w-56 space-y-3", "{facets}"),
        f("components/SearchHistory.tsx", "SearchHistory", "ul", "text-sm", "{recent.map(renderItem)}"),
      ],
      f("components/SearchBar.tsx", "SearchBar", "div", "relative", '<input className="w-full rounded-full border px-4 py-2" />'),
      "Edit  SearchBar.tsx  (+ clear button)",
      'SearchBar.tsx:\n+ <button className="absolute right-3 top-2" onClick={clear}>×</button>',
      "There's a SearchBar, SearchFilters and SearchHistory. Which one?",
      "the SearchBar",
      "Added a clear button to the SearchBar."
    ),
    fu("only show it when there's text", "SearchBar", "Edit  SearchBar.tsx  (conditional clear)", 'SearchBar.tsx:\n+ {query && <button onClick={clear}>×</button>}', "Showed the clear button only when there's text."),
    loc(
      "add empty-state text to the results list",
      "add an empty state to the resultsList",
      "results",
      "resultsList",
      'app/search/page.tsx:5:import ResultsList from "@/components/ResultsList";',
      [f("components/ResultsCount.tsx", "ResultsCount", "p", "text-sm text-zinc-500", "{count} results")],
      f("components/ResultsList.tsx", "ResultsList", "ul", "space-y-4", "{hits.map(renderHit)}"),
      "Edit  ResultsList.tsx  (+ empty state)",
      'ResultsList.tsx:\n+ {hits.length === 0 && <p className="text-zinc-500">No results found.</p>}',
      "There's a ResultsList and a ResultsCount. Which one?",
      "the ResultsList",
      "Added an empty state to the ResultsList."
    ),
  ],
  // 8 — Notifications
  [
    loc(
      "mark unread rows in the notification list",
      "mark unread rows in the notificationList",
      "notification",
      "notificationList",
      'app/inbox/page.tsx:3:import NotificationList from "@/components/NotificationList";',
      [
        f("components/NotificationBell.tsx", "NotificationBell", "button", "relative", "<BellIcon />"),
        f("components/NotificationToast.tsx", "NotificationToast", "div", "fixed bottom-4 right-4", "{message}"),
      ],
      f("components/NotificationList.tsx", "NotificationList", "ul", "divide-y", "{items.map(renderItem)}"),
      "Edit  NotificationList.tsx  (+ unread bg)",
      'NotificationList.tsx:\n+ className={n.read ? "" : "bg-blue-50"}',
      "There's a NotificationList, a NotificationBell and a NotificationToast. Which one?",
      "the NotificationList",
      "Marked unread rows in the NotificationList."
    ),
    fu("add a mark-all-read button at the top", "NotificationList", "Edit  NotificationList.tsx  (+ mark all)", 'NotificationList.tsx:\n+ <button onClick={markAll}>Mark all read</button>', "Added a mark-all-read button."),
    loc(
      "add a count badge to the bell",
      "add a count badge to the notificationBell",
      "bell",
      "notificationBell",
      'components/AppShell.tsx:7:import NotificationBell from "@/components/NotificationBell";',
      [f("components/DinnerBell.tsx", "DinnerBell", "span", "text-2xl", "🔔")],
      f("components/NotificationBell.tsx", "NotificationBell", "button", "relative", "<BellIcon />"),
      "Edit  NotificationBell.tsx  (+ count badge)",
      'NotificationBell.tsx:\n+ {count > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1 text-xs text-white">{count}</span>}',
      "There's a NotificationBell and a DinnerBell. Which one?",
      "the NotificationBell",
      "Added a count badge to the NotificationBell."
    ),
  ],
  // 9 — Product detail page
  [
    loc(
      "add thumbnails under the product gallery",
      "add thumbnails to the productGallery",
      "gallery",
      "productGallery",
      'app/products/[id]/page.tsx:4:import ProductGallery from "@/components/ProductGallery";',
      [
        f("components/PhotoGallery.tsx", "PhotoGallery", "div", "columns-3", "{photos.map(renderPhoto)}"),
        f("components/GalleryModal.tsx", "GalleryModal", "div", "fixed inset-0", "<img src={active} />"),
      ],
      f("components/ProductGallery.tsx", "ProductGallery", "div", "space-y-3", '<img className="aspect-square w-full rounded-xl" />'),
      "Edit  ProductGallery.tsx  (+ thumbnail row)",
      'ProductGallery.tsx:\n+ <div className="flex gap-2">{images.map(renderThumb)}</div>',
      "There's a ProductGallery, a PhotoGallery and a GalleryModal. Which one?",
      "the ProductGallery",
      "Added thumbnails to the ProductGallery."
    ),
    fu("highlight the selected thumbnail", "ProductGallery", "Edit  ProductGallery.tsx  (selected ring)", 'ProductGallery.tsx:\n+ className={i === active ? "ring-2 ring-black" : ""}', "Highlighted the selected thumbnail."),
    loc(
      "make the add-to-cart bar sticky on mobile",
      "make the addToCartBar sticky on mobile",
      "cart",
      "addToCartBar",
      'app/products/[id]/page.tsx:6:import AddToCartBar from "@/components/AddToCartBar";',
      [f("components/CartDrawer.tsx", "CartDrawer", "aside", "fixed right-0 top-0 h-full w-80", "{lines}")],
      f("components/AddToCartBar.tsx", "AddToCartBar", "div", "flex items-center justify-between border-t p-4", '<button className="rounded-lg bg-black px-6 py-2 text-white">Add to cart</button>'),
      "Edit  AddToCartBar.tsx  (+ sticky bottom)",
      'AddToCartBar.tsx:\n- <div className="addToCartBar flex items-center justify-between border-t p-4">\n+ <div className="addToCartBar sticky bottom-0 flex items-center justify-between border-t bg-white p-4">',
      "There's an AddToCartBar and a CartDrawer. Which one?",
      "the AddToCartBar",
      "Made the AddToCartBar sticky."
    ),
  ],
  // 10 — Public profile
  [
    loc(
      "add a cover image to the profile header",
      "add a cover image to the profileHeader",
      "profile",
      "profileHeader",
      'app/u/[handle]/page.tsx:3:import ProfileHeader from "@/components/ProfileHeader";',
      [
        f("components/ProfileStats.tsx", "ProfileStats", "div", "flex gap-6", "{stats}"),
        f("components/ProfileFeed.tsx", "ProfileFeed", "ul", "space-y-4", "{posts.map(renderPost)}"),
      ],
      f("components/ProfileHeader.tsx", "ProfileHeader", "header", "flex items-center gap-4 p-6", "<Avatar size={64} />"),
      "Edit  ProfileHeader.tsx  (+ cover image)",
      'ProfileHeader.tsx:\n+ <img className="h-32 w-full object-cover" src={cover} />',
      "There's a ProfileHeader, ProfileStats and a ProfileFeed. Which one?",
      "the ProfileHeader",
      "Added a cover image to the ProfileHeader."
    ),
    fu("pull the avatar up over the cover", "ProfileHeader", "Edit  ProfileHeader.tsx  (-mt on avatar)", 'ProfileHeader.tsx:\n+ <Avatar className="-mt-8 ring-4 ring-white" />', "Pulled the avatar over the cover."),
    loc(
      "swap the follow button to an outline style",
      "restyle the followButton to outline",
      "follow",
      "followButton",
      'app/u/[handle]/page.tsx:5:import FollowButton from "@/components/FollowButton";',
      [f("components/FollowList.tsx", "FollowList", "ul", "space-y-2", "{users.map(renderUser)}")],
      f("components/FollowButton.tsx", "FollowButton", "button", "rounded-full bg-black px-4 py-1 text-white", "Follow"),
      "Edit  FollowButton.tsx  (solid → outline)",
      'FollowButton.tsx:\n- <button className="followButton rounded-full bg-black px-4 py-1 text-white">\n+ <button className="followButton rounded-full border px-4 py-1">',
      "There's a FollowButton and a FollowList. Which one?",
      "the FollowButton",
      "Restyled the FollowButton."
    ),
  ],
  // 11 — Comments thread
  [
    loc(
      "indent replies in the comment list",
      "indent replies in the commentList",
      "comment",
      "commentList",
      'app/post/[id]/page.tsx:7:import CommentList from "@/components/CommentList";',
      [
        f("components/CommentForm.tsx", "CommentForm", "form", "flex gap-2", '<textarea />'),
        f("components/CommentSort.tsx", "CommentSort", "select", "text-sm", "<option>Top</option>"),
      ],
      f("components/CommentList.tsx", "CommentList", "ul", "space-y-4", "{comments.map(renderComment)}"),
      "Edit  CommentList.tsx  (+ reply indent)",
      'CommentList.tsx:\n+ className={c.parentId ? "ml-8" : ""}',
      "There's a CommentList, a CommentForm and a CommentSort. Which one?",
      "the CommentList",
      "Indented replies in the CommentList."
    ),
    fu("collapse threads past depth 3", "CommentList", "Edit  CommentList.tsx  (collapse deep)", 'CommentList.tsx:\n+ {depth > 3 && <button>Show more replies</button>}', "Collapsed deep threads."),
    loc(
      "grow the comment box as you type",
      "auto-grow the commentForm textarea",
      "comment",
      "commentForm",
      'app/post/[id]/page.tsx:8:import CommentForm from "@/components/CommentForm";',
      [f("components/CommentList.tsx", "CommentList", "ul", "space-y-4", "{comments.map(renderComment)}")],
      f("components/CommentForm.tsx", "CommentForm", "form", "flex gap-2", '<textarea className="w-full rounded border p-2" />'),
      "Edit  CommentForm.tsx  (+ auto-grow)",
      'CommentForm.tsx:\n+ <textarea rows={1} onInput={autoGrow} className="w-full rounded border p-2" />',
      "There's a CommentForm and a CommentList. Which one?",
      "the CommentForm",
      "Made the CommentForm textarea auto-grow."
    ),
  ],
  // 12 — Site chrome / navigation
  [
    loc(
      "make the site header shrink on scroll",
      "make the siteHeader shrink on scroll",
      "header",
      "siteHeader",
      'app/layout.tsx:6:import SiteHeader from "@/components/SiteHeader";',
      [
        f("components/SectionHeader.tsx", "SectionHeader", "div", "mb-6", "<h2>{title}</h2>"),
        f("components/TableHeader.tsx", "TableHeader", "thead", "bg-zinc-50", "<tr>{cols}</tr>"),
      ],
      f("components/SiteHeader.tsx", "SiteHeader", "header", "flex h-16 items-center px-6", "<Logo /><MainNav />"),
      "Edit  SiteHeader.tsx  (+ scroll shrink)",
      'SiteHeader.tsx:\n+ className={scrolled ? "h-12" : "h-16"}',
      "There's a SiteHeader, a SectionHeader and a TableHeader. Which one?",
      "the SiteHeader",
      "Made the SiteHeader shrink on scroll."
    ),
    fu("add a subtle shadow once shrunk", "SiteHeader", "Edit  SiteHeader.tsx  (+ shadow)", 'SiteHeader.tsx:\n+ className={scrolled ? "h-12 shadow-sm" : "h-16"}', "Added a shadow on scroll."),
    loc(
      "close the mobile menu when a link is tapped",
      "close the mobileMenu on link tap",
      "menu",
      "mobileMenu",
      'components/SiteHeader.tsx:4:import MobileMenu from "@/components/MobileMenu";',
      [f("components/ContextMenu.tsx", "ContextMenu", "div", "absolute rounded-lg border bg-white", "{items}")],
      f("components/MobileMenu.tsx", "MobileMenu", "nav", "fixed inset-0 bg-white p-6", "{links.map(renderLink)}"),
      "Edit  MobileMenu.tsx  (+ close on click)",
      'MobileMenu.tsx:\n+ onClick={() => setOpen(false)}',
      "There's a MobileMenu and a ContextMenu. Which one?",
      "the MobileMenu",
      "Closed the MobileMenu on link tap."
    ),
  ],
  // 13 — Footer + newsletter
  [
    loc(
      "stack the footer columns on mobile",
      "stack the siteFooter columns on mobile",
      "footer",
      "siteFooter",
      'app/layout.tsx:9:import SiteFooter from "@/components/SiteFooter";',
      [
        f("components/PageFooter.tsx", "PageFooter", "div", "border-t py-4 text-center", "<small>{year}</small>"),
        f("components/StickyFooter.tsx", "StickyFooter", "div", "fixed bottom-0 w-full", "{cta}"),
      ],
      f("components/SiteFooter.tsx", "SiteFooter", "footer", "grid grid-cols-4 gap-8 px-6 py-12", "{columns.map(renderCol)}"),
      "Edit  SiteFooter.tsx  (responsive cols)",
      'SiteFooter.tsx:\n- <footer className="siteFooter grid grid-cols-4 gap-8 px-6 py-12">\n+ <footer className="siteFooter grid grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">',
      "There's a SiteFooter, a PageFooter and a StickyFooter. Which one?",
      "the SiteFooter",
      "Stacked the SiteFooter columns on mobile."
    ),
    fu("shrink the gap on mobile too", "SiteFooter", "Edit  SiteFooter.tsx  (gap-8 → gap-6)", 'SiteFooter.tsx:\n- grid-cols-2 gap-8 px-6\n+ grid-cols-2 gap-6 px-6', "Shrank the mobile gap."),
    loc(
      "inline the newsletter input and button",
      "inline the newsletterForm input and button",
      "newsletter",
      "newsletterForm",
      'components/SiteFooter.tsx:3:import NewsletterForm from "@/components/NewsletterForm";',
      [f("components/NewsletterBanner.tsx", "NewsletterBanner", "div", "bg-zinc-900 p-8 text-white", "<h3>Subscribe</h3>")],
      f("components/NewsletterForm.tsx", "NewsletterForm", "form", "space-y-2", '<input placeholder="Email" /><button>Join</button>'),
      "Edit  NewsletterForm.tsx  (stack → inline)",
      'NewsletterForm.tsx:\n- <form className="newsletterForm space-y-2">\n+ <form className="newsletterForm flex gap-2">',
      "There's a NewsletterForm and a NewsletterBanner. Which one?",
      "the NewsletterForm",
      "Inlined the NewsletterForm."
    ),
  ],
  // 14 — Onboarding wizard
  [
    loc(
      "add a back button to the step wizard",
      "add a back button to the stepWizard",
      "step",
      "stepWizard",
      'app/onboarding/page.tsx:2:import StepWizard from "@/components/StepWizard";',
      [
        f("components/StepList.tsx", "StepList", "ol", "space-y-2", "{steps.map(renderStep)}"),
        f("components/StepDots.tsx", "StepDots", "div", "flex gap-1", "{dots}"),
      ],
      f("components/StepWizard.tsx", "StepWizard", "div", "space-y-6", "{renderCurrentStep()}<button>Next</button>"),
      "Edit  StepWizard.tsx  (+ back button)",
      'StepWizard.tsx:\n+ <button onClick={prev} disabled={step === 0}>Back</button>',
      "There's a StepWizard, a StepList and StepDots. Which one?",
      "the StepWizard",
      "Added a back button to the StepWizard."
    ),
    fu("hide Next on the last step", "StepWizard", "Edit  StepWizard.tsx  (conditional Next)", 'StepWizard.tsx:\n+ {!isLast && <button onClick={next}>Next</button>}', "Hid Next on the last step."),
    loc(
      "animate the progress bar fill",
      "animate the progressBar fill",
      "progress",
      "progressBar",
      'components/StepWizard.tsx:3:import ProgressBar from "@/components/ProgressBar";',
      [f("components/ProgressRing.tsx", "ProgressRing", "svg", "h-10 w-10", "<circle />")],
      f("components/ProgressBar.tsx", "ProgressBar", "div", "h-2 w-full rounded-full bg-zinc-200", '<div className="h-full rounded-full bg-black" style={{ width }} />'),
      "Edit  ProgressBar.tsx  (+ transition)",
      'ProgressBar.tsx:\n- <div className="h-full rounded-full bg-black" style={{ width }} />\n+ <div className="h-full rounded-full bg-black transition-all" style={{ width }} />',
      "There's a ProgressBar and a ProgressRing. Which one?",
      "the ProgressBar",
      "Animated the ProgressBar fill."
    ),
  ],
  // 15 — Calendar
  [
    loc(
      "highlight today in the calendar grid",
      "highlight today in the calendarGrid",
      "calendar",
      "calendarGrid",
      'app/calendar/page.tsx:3:import CalendarGrid from "@/components/CalendarGrid";',
      [
        f("components/CalendarHeader.tsx", "CalendarHeader", "div", "flex justify-between", "<MonthNav />"),
        f("components/MiniCalendar.tsx", "MiniCalendar", "div", "grid grid-cols-7 text-xs", "{days}"),
      ],
      f("components/CalendarGrid.tsx", "CalendarGrid", "div", "grid grid-cols-7 gap-px", "{days.map(renderDay)}"),
      "Edit  CalendarGrid.tsx  (+ today ring)",
      'CalendarGrid.tsx:\n+ className={isToday(d) ? "ring-2 ring-black" : ""}',
      "There's a CalendarGrid, a CalendarHeader and a MiniCalendar. Which one?",
      "the CalendarGrid",
      "Highlighted today in the CalendarGrid."
    ),
    fu("dim days outside this month", "CalendarGrid", "Edit  CalendarGrid.tsx  (dim outside)", 'CalendarGrid.tsx:\n+ className={d.outside ? "text-zinc-300" : ""}', "Dimmed days outside the month."),
    loc(
      "make the event modal wider",
      "make the eventModal wider",
      "modal",
      "eventModal",
      'components/CalendarGrid.tsx:4:import EventModal from "@/components/EventModal";',
      [f("components/ConfirmModal.tsx", "ConfirmModal", "div", "max-w-sm rounded-2xl bg-white p-6", "{message}")],
      f("components/EventModal.tsx", "EventModal", "div", "max-w-md rounded-2xl bg-white p-6", "<EventForm />"),
      "Edit  EventModal.tsx  (max-w-md → max-w-lg)",
      'EventModal.tsx:\n- <div className="eventModal max-w-md rounded-2xl bg-white p-6">\n+ <div className="eventModal max-w-lg rounded-2xl bg-white p-6">',
      "There's an EventModal and a ConfirmModal. Which one?",
      "the EventModal",
      "Widened the EventModal."
    ),
  ],
  // 16 — Chat
  [
    loc(
      "show avatars next to each message in the message list",
      "show avatars in the messageList",
      "message",
      "messageList",
      'app/chat/page.tsx:4:import MessageList from "@/components/MessageList";',
      [
        f("components/MessageBubble.tsx", "MessageBubble", "div", "rounded-2xl px-3 py-2", "{text}"),
        f("components/MessageInput.tsx", "MessageInput", "form", "flex gap-2", "<input />"),
      ],
      f("components/MessageList.tsx", "MessageList", "div", "flex flex-col gap-2 overflow-y-auto", "{messages.map(renderMessage)}"),
      "Edit  MessageList.tsx  (+ avatar)",
      'MessageList.tsx:\n+ <img className="h-6 w-6 rounded-full" src={m.author.avatar} />',
      "There's a MessageList, a MessageBubble and a MessageInput. Which one?",
      "the MessageList",
      "Added avatars to the MessageList."
    ),
    fu("group consecutive messages from the same person", "MessageList", "Edit  MessageList.tsx  (group runs)", 'MessageList.tsx:\n+ {sameAuthorAsPrev ? null : <img ... />}', "Grouped consecutive messages."),
    loc(
      "send the composer on Enter",
      "send the composer on Enter",
      "composer",
      "composer",
      'app/chat/page.tsx:6:import Composer from "@/components/Composer";',
      [f("components/EmojiPicker.tsx", "EmojiPicker", "div", "grid grid-cols-8", "{emojis}")],
      f("components/Composer.tsx", "Composer", "form", "flex gap-2 border-t p-3", '<textarea className="flex-1" />'),
      "Edit  Composer.tsx  (+ Enter to send)",
      'Composer.tsx:\n+ onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}',
      "There's a Composer and an EmojiPicker. Which one?",
      "the Composer",
      "Made the Composer send on Enter."
    ),
  ],
  // 17 — Admin users table
  [
    loc(
      "make the header row sticky on the users table",
      "make the header sticky on the usersTable",
      "table",
      "usersTable",
      'app/admin/users/page.tsx:3:import UsersTable from "@/components/UsersTable";',
      [
        f("components/UsersGrid.tsx", "UsersGrid", "div", "grid gap-4 sm:grid-cols-3", "{users.map(renderCard)}"),
        f("components/RolesTable.tsx", "RolesTable", "table", "w-full", "<tbody>{roles}</tbody>"),
      ],
      f("components/UsersTable.tsx", "UsersTable", "table", "w-full text-sm", "<thead><tr>{cols}</tr></thead>"),
      "Edit  UsersTable.tsx  (+ sticky head)",
      'UsersTable.tsx:\n+ <thead className="sticky top-0 bg-white">',
      "There's a UsersTable, a UsersGrid and a RolesTable. Which one?",
      "the UsersTable",
      "Made the UsersTable header sticky."
    ),
    fu("zebra-stripe the rows", "UsersTable", "Edit  UsersTable.tsx  (+ odd:bg)", 'UsersTable.tsx:\n+ className="odd:bg-zinc-50"', "Zebra-striped the rows."),
    loc(
      "add a search input to the filter bar",
      "add a search input to the filterBar",
      "filter",
      "filterBar",
      'app/admin/users/page.tsx:5:import FilterBar from "@/components/FilterBar";',
      [f("components/FilterChips.tsx", "FilterChips", "div", "flex gap-2", "{chips}")],
      f("components/FilterBar.tsx", "FilterBar", "div", "flex items-center gap-3 border-b p-3", "<RoleSelect />"),
      "Edit  FilterBar.tsx  (+ search input)",
      'FilterBar.tsx:\n+ <input className="rounded-lg border px-3 py-1" placeholder="Search users" />',
      "There's a FilterBar and FilterChips. Which one?",
      "the FilterBar",
      "Added a search input to the FilterBar."
    ),
  ],
  // 18 — Media player
  [
    loc(
      "add a fullscreen button to the video player",
      "add a fullscreen button to the videoPlayer",
      "player",
      "videoPlayer",
      'app/watch/[id]/page.tsx:3:import VideoPlayer from "@/components/VideoPlayer";',
      [
        f("components/AudioPlayer.tsx", "AudioPlayer", "div", "flex items-center gap-3", "<PlayButton />"),
        f("components/PlayerControls.tsx", "PlayerControls", "div", "flex gap-2", "<Scrubber />"),
      ],
      f("components/VideoPlayer.tsx", "VideoPlayer", "div", "relative aspect-video bg-black", "<video src={src} />"),
      "Edit  VideoPlayer.tsx  (+ fullscreen)",
      'VideoPlayer.tsx:\n+ <button onClick={requestFullscreen}>⤢</button>',
      "There's a VideoPlayer, an AudioPlayer and PlayerControls. Which one?",
      "the VideoPlayer",
      "Added a fullscreen button to the VideoPlayer."
    ),
    fu("auto-hide the controls after 3s", "VideoPlayer", "Edit  VideoPlayer.tsx  (auto-hide)", 'VideoPlayer.tsx:\n+ className={idle ? "opacity-0 transition-opacity" : ""}', "Auto-hid the controls."),
    loc(
      "highlight the now-playing item in the playlist",
      "highlight the active item in the playlistSidebar",
      "playlist",
      "playlistSidebar",
      'app/watch/[id]/page.tsx:5:import PlaylistSidebar from "@/components/PlaylistSidebar";',
      [f("components/PlaylistCard.tsx", "PlaylistCard", "div", "rounded-xl border p-3", "{title}")],
      f("components/PlaylistSidebar.tsx", "PlaylistSidebar", "aside", "w-72 space-y-2 overflow-y-auto", "{items.map(renderItem)}"),
      "Edit  PlaylistSidebar.tsx  (+ active row)",
      'PlaylistSidebar.tsx:\n+ className={i.id === currentId ? "bg-zinc-100" : ""}',
      "There's a PlaylistSidebar and a PlaylistCard. Which one?",
      "the PlaylistSidebar",
      "Highlighted the now-playing item."
    ),
  ],
  // 19 — Contact page
  [
    loc(
      "add a subject field to the contact form",
      "add a subject field to the contactForm",
      "contact",
      "contactForm",
      'app/contact/page.tsx:2:import ContactForm from "@/components/ContactForm";',
      [
        f("components/ContactInfo.tsx", "ContactInfo", "div", "space-y-1 text-sm", "<p>{email}</p>"),
        f("components/ContactCard.tsx", "ContactCard", "div", "rounded-xl border p-4", "{person}"),
      ],
      f("components/ContactForm.tsx", "ContactForm", "form", "space-y-4", '<input placeholder="Name" /><textarea placeholder="Message" />'),
      "Edit  ContactForm.tsx  (+ subject field)",
      'ContactForm.tsx:\n+ <input className="w-full rounded-lg border px-3 py-2" placeholder="Subject" />',
      "There's a ContactForm, ContactInfo and a ContactCard. Which one?",
      "the ContactForm",
      "Added a subject field to the ContactForm."
    ),
    fu("make the message box taller", "ContactForm", "Edit  ContactForm.tsx  (rows=6)", 'ContactForm.tsx:\n+ <textarea rows={6} placeholder="Message" />', "Made the message box taller."),
    loc(
      "round the corners on the map embed",
      "round the corners on the mapEmbed",
      "map",
      "mapEmbed",
      'app/contact/page.tsx:4:import MapEmbed from "@/components/MapEmbed";',
      [f("components/Sitemap.tsx", "Sitemap", "nav", "columns-3 text-sm", "{links}")],
      f("components/MapEmbed.tsx", "MapEmbed", "div", "h-64 w-full overflow-hidden", "<iframe src={mapUrl} />"),
      "Edit  MapEmbed.tsx  (+ rounded-2xl)",
      'MapEmbed.tsx:\n- <div className="mapEmbed h-64 w-full overflow-hidden">\n+ <div className="mapEmbed h-64 w-full overflow-hidden rounded-2xl">',
      "There's a MapEmbed and a Sitemap. Which one?",
      "the MapEmbed",
      "Rounded the MapEmbed corners."
    ),
  ],
  // 20 — Kanban board
  [
    loc(
      "add a card count to each board column",
      "add a card count to the boardColumn",
      "column",
      "boardColumn",
      'app/board/page.tsx:3:import BoardColumn from "@/components/BoardColumn";',
      [
        f("components/BoardHeader.tsx", "BoardHeader", "div", "flex justify-between p-4", "<h1>Board</h1>"),
        f("components/TableColumn.tsx", "TableColumn", "th", "px-3 py-2 text-left", "{label}"),
      ],
      f("components/BoardColumn.tsx", "BoardColumn", "div", "w-72 shrink-0 space-y-2 rounded-xl bg-zinc-50 p-3", "<h3>{title}</h3>{cards.map(renderCard)}"),
      "Edit  BoardColumn.tsx  (+ count)",
      'BoardColumn.tsx:\n+ <span className="text-xs text-zinc-500">{cards.length}</span>',
      "There's a BoardColumn, a BoardHeader and a TableColumn. Which one?",
      "the BoardColumn",
      "Added a card count to the BoardColumn."
    ),
    fu("show an add-card button at the bottom", "BoardColumn", "Edit  BoardColumn.tsx  (+ add card)", 'BoardColumn.tsx:\n+ <button className="w-full text-left text-sm text-zinc-500">+ Add a card</button>', "Added an add-card button."),
    loc(
      "make the card modal close on backdrop click",
      "close the cardModal on backdrop click",
      "modal",
      "cardModal",
      'components/BoardColumn.tsx:5:import CardModal from "@/components/CardModal";',
      [f("components/ImageModal.tsx", "ImageModal", "div", "fixed inset-0 grid place-items-center", "<img src={src} />")],
      f("components/CardModal.tsx", "CardModal", "div", "fixed inset-0 grid place-items-center bg-black/40", '<div className="w-lg rounded-2xl bg-white p-6">{card}</div>'),
      "Edit  CardModal.tsx  (+ backdrop close)",
      'CardModal.tsx:\n+ <div className="cardModal fixed inset-0 ... bg-black/40" onClick={onClose}>',
      "There's a CardModal and an ImageModal. Which one?",
      "the CardModal",
      "Closed the CardModal on backdrop click."
    ),
  ],
];
