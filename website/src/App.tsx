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
          className="page-gutter pointer-events-none fixed inset-y-0 z-40 w-14 border-l border-white/[0.035]"
          style={{ right: "calc(50% + 32rem)" }}
        />
        <div
          className="page-gutter pointer-events-none fixed inset-y-0 z-40 w-14 border-r border-white/[0.035]"
          style={{ left: "calc(50% + 32rem)" }}
        />
        <div className="pointer-events-none fixed inset-y-0 left-1/2 z-40 w-full max-w-5xl -translate-x-1/2 border-x border-white/[0.035]" />
      </div>

      {/* Hero */}
      <header className="mx-auto max-w-5xl border-b border-white/[0.035] px-6 pb-24 pt-24 text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Navigation className="h-7 w-7 text-emerald-400" />
          <span className="font-mono text-xl font-medium tracking-tight text-white">
            <span className="text-zinc-500">.</span>semanticWayfinder
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold !leading-[1.15] tracking-tight text-white sm:text-5xl">
          An Identity Layer for Your Code{" "}
          <br className="hidden sm:block" />
          So Agents Stop Guessing
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-zinc-400">
          One semantic class on every page and component, naming what each one is. That's{" "}
          <span className="text-zinc-200">Locality of Identity</span>, applied through a convention
          called <span className="text-zinc-200">Semantic Wayfinding</span>, so an AI agent finds the
          right file with a single <code className="text-zinc-300">grep</code> instead of burning
          tokens on detective work.
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
      <footer className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 border-t border-white/[0.035] px-6 py-8 text-sm text-zinc-500 sm:flex-row">
        <span className="font-mono">
          <span className="text-zinc-500">.</span>
          <span className="text-zinc-400">semanticWayfinder</span>
          <span className="text-zinc-600"> © 2026</span>
        </span>
        <span>
          Made by{" "}
          <a
            href="https://linkedin.com/in/selfishprimate"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            selfishprimate
          </a>{" "}
          for the open source community.
        </span>
      </footer>
    </div>
  );
}
