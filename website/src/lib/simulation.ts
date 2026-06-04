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
