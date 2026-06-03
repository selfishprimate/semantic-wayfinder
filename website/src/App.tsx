import { Navigation } from "lucide-react";
import DemoBody, { SimControls, useSimulation } from "@/components/TokenDemo";

export default function App() {
  const sim = useSimulation();
  return (
    <div className="min-h-screen">
      {/* Decorative frame: diagonal-stripe side gutters + content rails (seekter-style).
          Hidden below lg where there's no room for side margins. */}
      <div aria-hidden className="hidden lg:block">
        <div
          className="page-gutter pointer-events-none fixed inset-y-0 z-40 w-14 border-l border-white/[0.07]"
          style={{ right: "calc(50% + 32rem)" }}
        />
        <div
          className="page-gutter pointer-events-none fixed inset-y-0 z-40 w-14 border-r border-white/[0.07]"
          style={{ left: "calc(50% + 32rem)" }}
        />
        <div className="pointer-events-none fixed inset-y-0 left-1/2 z-40 w-full max-w-5xl -translate-x-1/2 border-x border-white/[0.07]" />
      </div>

      {/* Hero */}
      <header className="mx-auto max-w-5xl border-b border-white/[0.07] px-6 pb-16 pt-24 text-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Navigation className="h-6 w-6 text-zinc-300" />
          <span className="font-display text-2xl font-semibold tracking-tight text-white">
            Semantic Wayfinder
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold !leading-[1.15] tracking-tight text-white sm:text-5xl">
          An Identity Layer for Your Code{" "}
          <br className="hidden sm:block" />
          So Agents Stop Guessing
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-zinc-400">
          One semantic class on every page and component, so an AI agent finds the right file with a
          single <code className="text-zinc-300">grep</code> instead of burning tokens on detective work.
        </p>

        <div className="mt-8">
          <SimControls sim={sim} />
        </div>
      </header>

      {/* Demo */}
      <main className="mx-auto max-w-5xl">
        <DemoBody sim={sim} />
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl border-t border-white/[0.07] px-6 py-10 text-center text-sm text-zinc-500">
        Built by{" "}
        <a
          href="https://linkedin.com/in/selfishprimate"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-300 transition-colors hover:text-white"
        >
          selfishprimate
        </a>
      </footer>
    </div>
  );
}
