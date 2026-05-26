// AFTER Semantic Wayfinder — the "extract sections to components" version
//
// This shows the recommended Wayfinder-friendly structure: extract each
// meaningful section out of the page file into its own component file
// under components/. Each extracted component's root element gets its
// own identity class — and the page file becomes lean.
//
// File layout this example assumes:
//   app/about/page.tsx          ← below (the page file)
//   components/AboutHero.tsx
//   components/Testimonials.tsx
//   components/CTASection.tsx

// ─── app/about/page.tsx ─────────────────────────────────────────────
//
// Page root carries `aboutPage`. Inside, you compose the extracted
// components. The page file is short and obvious.

import AboutHero from "@/components/AboutHero";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";

export default function AboutPage() {
  return (
    <main className="aboutPage min-h-screen bg-white">
      <AboutHero />
      <Testimonials />
      <CTASection />
    </main>
  );
}

// ─── components/AboutHero.tsx ───────────────────────────────────────
//
// Root element carries `aboutHero`. If you later reuse this on a
// different page, the class stays the same — `aboutHero` describes
// what the component IS, not where it's used.

export function AboutHero() {
  return (
    <section className="aboutHero px-6 py-24 md:py-32 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          We build tools for makers
        </h1>
        <p className="mt-6 text-lg text-neutral-600 max-w-2xl mx-auto">
          Our mission is to help indie creators ship sustainable products.
        </p>
      </div>
    </section>
  );
}

// ─── components/Testimonials.tsx ────────────────────────────────────
//
// Root carries `testimonials`. Filename is descriptive enough that no
// `main` prefix is needed unless another `*Testimonials.tsx` shows up.

export function Testimonials() {
  return (
    <section className="testimonials px-6 py-20 bg-neutral-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-semibold mb-12 text-center">
          What people say
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-neutral-200">
            <p>"Changed how I ship products."</p>
            <p className="mt-4 font-medium">— Jane Doe</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-neutral-200">
            <p>"Finally a tool that thinks."</p>
            <p className="mt-4 font-medium">— John Smith</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-neutral-200">
            <p>"Worth every penny."</p>
            <p className="mt-4 font-medium">— Alex Kim</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── components/CTASection.tsx ──────────────────────────────────────
//
// Root carries `cTASection` — wait, camelCase makes the leading
// acronym awkward. Wayfinder treats acronyms as a single capitalized
// token: `CTASection.tsx` → `ctaSection` (PascalCase → camelCase with
// the convention "treat consecutive caps as one word").

export function CTASection() {
  return (
    <section className="ctaSection px-6 py-20 bg-black text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-semibold">Ready to build?</h2>
        <button className="mt-8 px-8 py-3 bg-white text-black rounded-full font-medium">
          Get started
        </button>
      </div>
    </section>
  );
}

// ─── Result: agent targeting becomes trivial ─────────────────────────
//
// "Edit the about page"           → grep aboutPage     → app/about/page.tsx
// "Update the testimonials"       → grep testimonials  → components/Testimonials.tsx
// "Change the CTA"                → grep ctaSection    → components/CTASection.tsx
//
// One grep, one hit, one edit. The page file shows the composition.
// Each component owns its identity.
