import { useEffect, useMemo, useState } from "react";
import { Tiktoken } from "js-tiktoken/lite";
import { Play, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { utilitySteps, semanticSteps, type Step } from "@/lib/simulation";

interface CountedStep extends Step {
  tok: number;
}

const TICK_MS = 650;

function sum(steps: CountedStep[]) {
  return steps.reduce((a, s) => a + s.tok, 0);
}
function baselineSum(steps: CountedStep[]) {
  return steps.filter((s) => s.baseline).reduce((a, s) => a + s.tok, 0);
}

// ── Shared simulation state (lifted so the hero can host the controls) ────────

export function useSimulation() {
  const [enc, setEnc] = useState<Tiktoken | null>(null);
  useEffect(() => {
    let active = true;
    import("js-tiktoken/ranks/cl100k_base").then((m) => {
      if (active) setEnc(new Tiktoken(m.default));
    });
    return () => {
      active = false;
    };
  }, []);

  const count = (text: string) => (enc ? enc.encode(text).length : 0);
  const util = useMemo<CountedStep[]>(
    () => utilitySteps.map((s) => ({ ...s, tok: count(s.content) })),
    [enc]
  );
  const sem = useMemo<CountedStep[]>(
    () => semanticSteps.map((s) => ({ ...s, tok: count(s.content) })),
    [enc]
  );

  const maxLen = Math.max(utilitySteps.length, semanticSteps.length);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const started = tick > 0 || running;
  const done = started && !running && tick >= maxLen;

  useEffect(() => {
    if (!running) return;
    if (tick >= maxLen) {
      setRunning(false);
      return;
    }
    const id = setTimeout(() => setTick((t) => t + 1), TICK_MS);
    return () => clearTimeout(id);
  }, [running, tick, maxLen]);

  return {
    enc,
    util,
    sem,
    revealedU: Math.min(tick, util.length),
    revealedS: Math.min(tick, sem.length),
    running,
    started,
    done,
    totalU: sum(util),
    totalS: sum(sem),
    taxU: sum(util) - baselineSum(util),
    taxS: sum(sem) - baselineSum(sem),
    savings: Math.round((1 - sum(sem) / sum(util)) * 100),
    ratio: (sum(util) / sum(sem)).toFixed(1),
    start: () => {
      setTick(0);
      setRunning(true);
    },
    reset: () => {
      setRunning(false);
      setTick(0);
    },
  };
}

type Sim = ReturnType<typeof useSimulation>;

// ── Controls (rendered inside the hero) ──────────────────────────────────────

export function SimControls({ sim }: { sim: Sim }) {
  const { enc, running, done, started, start, reset } = sim;
  return (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={start} disabled={running || !enc}>
        {!enc ? (
          <>
            <Search className="h-4 w-4 animate-pulse" /> Loading Tokenizer…
          </>
        ) : running ? (
          <>
            <Search className="h-4 w-4 animate-pulse" /> Running…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" /> {done ? "Run Again" : "Run the Simulation"}
          </>
        )}
      </Button>
      <Button variant="ghost" onClick={reset} disabled={!started || running}>
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
    </div>
  );
}

// ── One column of the split body (no border, no background of its own) ────────

function Panel({
  title,
  tone,
  steps,
  revealed,
}: {
  title: string;
  tone: "utility" | "semantic";
  steps: CountedStep[];
  revealed: number;
}) {
  const request = steps[0];
  const rest = steps.slice(1);
  const running = steps.slice(0, revealed).reduce((a, s) => a + s.tok, 0);
  const accent = tone === "utility" ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.035] px-5 py-3">
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        <span className={cn("font-mono text-lg font-semibold tabular-nums", accent)}>
          {running}
          <span className="ml-1 text-xs font-normal text-zinc-500">token</span>
        </span>
      </div>
      <div className="min-h-[14rem] flex-1 space-y-1.5 px-5 py-4 font-mono text-xs">
        {/* User request — always visible */}
        <div className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
          <span className="flex-1 leading-relaxed text-zinc-300">{request.label}</span>
          <span className="shrink-0 tabular-nums text-zinc-500">+{request.tok}</span>
        </div>
        {rest.map((s, j) => {
          const i = j + 1;
          if (i >= revealed) return null;
          return (
            <div key={i} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                  s.baseline ? "bg-zinc-600" : "bg-amber-500"
                )}
              />
              <span className="flex-1 leading-relaxed text-zinc-400">{s.label}</span>
              <span className="shrink-0 tabular-nums text-zinc-500">+{s.tok}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── The split body + results ─────────────────────────────────────────────────

export default function DemoBody({ sim }: { sim: Sim }) {
  const { util, sem, revealedU, revealedS, done, totalU, totalS, taxU, taxS, savings, ratio } = sim;

  return (
    <div>
      {/* Two-cell split — panels spread across the halves, divided by a center
          rule; the page rails bound the outer edges. */}
      <div className="grid grid-cols-1 divide-y divide-white/[0.035] border-b border-white/[0.035] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <Panel title="Utility Classes Only" tone="utility" steps={util} revealed={revealedU} />
        <Panel title="Semantic Identity Classes" tone="semantic" steps={sem} revealed={revealedS} />
      </div>

      <div className="px-6 py-10">
        {done && (
          <div className="mb-8">
            <h3 className="font-display text-lg font-semibold text-white">
              Same destination, very different fare
            </h3>
            <p className="mt-1.5 text-sm text-zinc-500">
              Both loops end with the exact same one-line edit. Getting there cost the utility-only
              codebase roughly twice the tokens, and almost all of that difference went to finding the
              right file rather than changing it.
            </p>
            <table className="mt-5 w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.035] text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4 text-left font-medium">Metric (tokens)</th>
                  <th className="px-4 py-2 text-right font-medium text-amber-400">Utility</th>
                  <th className="px-4 py-2 text-right font-medium text-emerald-400">Semantic</th>
                  <th className="py-2 pl-4 text-right font-medium text-zinc-400">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2.5 pr-4 text-zinc-300">Full loop</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-400">{totalU}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-400">{totalS}</td>
                  <td className="py-2.5 pl-4 text-right text-zinc-400">~{ratio}× · {savings}% saved</td>
                </tr>
                <tr className="border-b border-white/[0.02]">
                  <td className="py-2.5 pr-4 text-zinc-300">
                    Detective tax <span className="text-zinc-600">(finding the file)</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-400">{taxU}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-400">{taxS}</td>
                  <td className="py-2.5 pl-4 text-right text-zinc-400">~{Math.round(taxU / taxS)}× less</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-zinc-600">
          Live-tokenized in your browser with{" "}
          <code className="text-zinc-500">js-tiktoken</code> (GPT-4 / cl100k_base). A transparent,
          reproducible model rather than a real agent run.
        </p>
      </div>
    </div>
  );
}
