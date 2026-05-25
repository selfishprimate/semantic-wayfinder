// app/about/page.tsx — AFTER Semantic Wayfinder
//
// One semantic identity class added at the start of each section's className.
// Utility classes are untouched. Styling is identical. But now every section
// has a name an AI agent can grep for in one shot.
//
// Config used for this example:
//   { "casing": "camelCase", "prefix": null, "scope": "sections" }

export default function AboutPage() {
  return (
    <main className="aboutPage min-h-screen bg-white">
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

      <section className="aboutTestimonials px-6 py-20 bg-neutral-50">
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

      <section className="aboutCTA px-6 py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-semibold">Ready to build?</h2>
          <button className="mt-8 px-8 py-3 bg-white text-black rounded-full font-medium">
            Get started
          </button>
        </div>
      </section>
    </main>
  );
}
