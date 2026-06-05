import { useEffect, useMemo, useRef, useState } from "react";
import { Tiktoken } from "js-tiktoken/lite";
import { Check, Loader2, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCENARIOS, SESSIONS, buildLoops, buildSessionTurn, type Step } from "@/lib/simulation";

interface CountedStep extends Step {
  tok: number;
}

const TICK_MS = 650; // single-prompt cadence
const SESSION_TICK_MS = 240; // faster, since a session runs many steps

function sum(steps: CountedStep[]) {
  return steps.reduce((a, s) => a + s.tok, 0);
}
function baselineSum(steps: CountedStep[]) {
  return steps.filter((s) => s.baseline).reduce((a, s) => a + s.tok, 0);
}
function revealedSum(steps: CountedStep[], revealed: number) {
  return steps.slice(0, revealed).reduce((a, s) => a + s.tok, 0);
}

// ── Shared tokenizer (cl100k_base ranks loaded lazily, off the main bundle) ────

function useEncoder() {
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
  return enc;
}

interface Controls {
  enc: Tiktoken | null;
  running: boolean;
  started: boolean;
  done: boolean;
  start: () => void;
  reset: () => void;
}

function scrollToLoop() {
  requestAnimationFrame(() =>
    document.getElementById("loop")?.scrollIntoView({ behavior: "smooth", block: "start" })
  );
}

// ── Single-prompt mode: one random scenario, one loop ─────────────────────────

export function useSimulation() {
  const enc = useEncoder();
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const loops = useMemo(() => buildLoops(SCENARIOS[scenarioIdx]), [scenarioIdx]);

  const count = (text: string) => (enc ? enc.encode(text).length : 0);
  const util = useMemo<CountedStep[]>(
    () => loops.util.map((s) => ({ ...s, tok: count(s.content) })),
    [enc, loops]
  );
  const sem = useMemo<CountedStep[]>(
    () => loops.sem.map((s) => ({ ...s, tok: count(s.content) })),
    [enc, loops]
  );

  const maxLen = Math.max(loops.util.length, loops.sem.length);
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

  // First visit: once the tokenizer is ready, jump straight to a completed run
  // so the panels are full instead of empty. Only on initial mount — a manual
  // Reset afterwards still clears to a blank slate.
  const didPrefill = useRef(false);
  useEffect(() => {
    if (didPrefill.current || !enc) return;
    didPrefill.current = true;
    setTick(maxLen);
  }, [enc, maxLen]);

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
      setScenarioIdx((prev) => {
        if (SCENARIOS.length <= 1) return prev;
        let n = prev;
        while (n === prev) n = Math.floor(Math.random() * SCENARIOS.length);
        return n;
      });
      setTick(0);
      setRunning(true);
      scrollToLoop();
    },
    reset: () => {
      setRunning(false);
      setTick(0);
    },
  };
}

type Sim = ReturnType<typeof useSimulation>;

interface RevealedLoop {
  steps: CountedStep[];
  revealed: number;
}

// ── Entire-session mode: a chat of full loops, turn after turn ────────────────

export function useSession() {
  const enc = useEncoder();
  const count = (text: string) => (enc ? enc.encode(text).length : 0);

  const [sessionIdx, setSessionIdx] = useState(0);
  const turns = useMemo(
    () =>
      SESSIONS[sessionIdx].map((s) => {
        const b = buildSessionTurn(s);
        return {
          util: b.util.map((st) => ({ ...st, tok: count(st.content) })) as CountedStep[],
          sem: b.sem.map((st) => ({ ...st, tok: count(st.content) })) as CountedStep[],
        };
      }),
    [enc, sessionIdx]
  );

  // Each turn lasts as long as its longer (utility) loop; the columns stay
  // turn-aligned, so the semantic side finishes its turn early and waits.
  const turnLen = turns.map((t) => Math.max(t.util.length, t.sem.length));
  const offsets: number[] = [];
  let acc = 0;
  for (const len of turnLen) {
    offsets.push(acc);
    acc += len;
  }
  const totalTicks = acc;

  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const started = tick > 0 || running;
  const done = started && !running && tick >= totalTicks;

  useEffect(() => {
    if (!running) return;
    if (tick >= totalTicks) {
      setRunning(false);
      return;
    }
    const id = setTimeout(() => setTick((t) => t + 1), SESSION_TICK_MS);
    return () => clearTimeout(id);
  }, [running, tick, totalTicks]);

  // First visit: show a completed session instead of empty columns (see above).
  const didPrefill = useRef(false);
  useEffect(() => {
    if (didPrefill.current || !enc) return;
    didPrefill.current = true;
    setTick(totalTicks);
  }, [enc, totalTicks]);

  const clamp = (x: number, hi: number) => Math.max(0, Math.min(hi, x));
  const utilTurns: RevealedLoop[] = turns.map((t, i) => ({
    steps: t.util,
    revealed: clamp(tick - offsets[i], t.util.length),
  }));
  const semTurns: RevealedLoop[] = turns.map((t, i) => ({
    steps: t.sem,
    revealed: clamp(tick - offsets[i], t.sem.length),
  }));

  const cumulativeUtil = utilTurns.reduce((a, t) => a + revealedSum(t.steps, t.revealed), 0);
  const cumulativeSem = semTurns.reduce((a, t) => a + revealedSum(t.steps, t.revealed), 0);
  const totalU = turns.reduce((a, t) => a + sum(t.util), 0);
  const totalS = turns.reduce((a, t) => a + sum(t.sem), 0);
  const taxU = turns.reduce((a, t) => a + (sum(t.util) - baselineSum(t.util)), 0);
  const taxS = turns.reduce((a, t) => a + (sum(t.sem) - baselineSum(t.sem)), 0);

  return {
    enc,
    utilTurns,
    semTurns,
    tick,
    cumulativeUtil,
    cumulativeSem,
    totalU,
    totalS,
    taxU,
    taxS,
    savings: totalS > 0 ? Math.round((1 - totalS / totalU) * 100) : 0,
    running,
    started,
    done,
    start: () => {
      setSessionIdx((prev) => {
        if (SESSIONS.length <= 1) return prev;
        let n = prev;
        while (n === prev) n = Math.floor(Math.random() * SESSIONS.length);
        return n;
      });
      setTick(0);
      setRunning(true);
      scrollToLoop();
    },
    reset: () => {
      setRunning(false);
      setTick(0);
    },
  };
}

type Session = ReturnType<typeof useSession>;

// ── Controls (rendered inside the hero) ──────────────────────────────────────

export function SimControls({
  active,
  label,
  subtle = false,
}: {
  active: Controls;
  label: string;
  subtle?: boolean;
}) {
  const { enc, running, started, start, reset } = active;
  const runIcon = !enc || running ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Play className="h-4 w-4" />
  );

  if (subtle) {
    const runTitle = !enc ? "Loading tokenizer…" : running ? "Running…" : label;
    return (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={start}
          disabled={running || !enc}
          title={runTitle}
          aria-label={runTitle}
        >
          {runIcon}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={reset}
          disabled={!started || running}
          title="Reset"
          aria-label="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={start} disabled={running || !enc}>
        {!enc ? (
          <>
            {runIcon} Loading Tokenizer…
          </>
        ) : running ? (
          <>
            {runIcon} Running…
          </>
        ) : (
          <>
            {runIcon} {label}
          </>
        )}
      </Button>
      <Button variant="ghost" onClick={reset} disabled={!started || running}>
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
    </div>
  );
}

// ── One agent loop: prompt bubble + revealed steps (shared by both modes) ─────

function LoopBody({ steps, revealed }: { steps: CountedStep[]; revealed: number }) {
  if (revealed < 1) return null;
  const request = steps[0];
  const rest = steps.slice(1);
  return (
    <>
      <div className="flex items-start gap-2 rounded-md bg-white/[0.045] px-3 py-2">
        <span className="leading-relaxed text-emerald-400">❯</span>
        <span className="flex-1 leading-relaxed font-medium text-zinc-100">{request.label}</span>
        <span className="shrink-0 tabular-nums text-zinc-500">+{request.tok}</span>
      </div>
      {rest.map((s, j) => {
        const i = j + 1;
        if (i >= revealed) return null;
        const isDone = s.kind === "done";
        return (
          <div key={i} className="flex items-start gap-2 px-3">
            <span className="flex h-[1.6em] shrink-0 items-center">
              {isDone ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    s.baseline ? "bg-zinc-600" : "bg-amber-500"
                  )}
                />
              )}
            </span>
            <span
              className={cn(
                "flex-1 leading-relaxed",
                isDone ? "text-emerald-400" : "text-zinc-400"
              )}
            >
              {s.label}
            </span>
            <span className="shrink-0 tabular-nums text-zinc-500">+{s.tok}</span>
          </div>
        );
      })}
    </>
  );
}

// ── Single-mode column ────────────────────────────────────────────────────────

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
  const running = revealedSum(steps, revealed);
  const accent = tone === "utility" ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        <span className={cn("font-mono text-lg font-semibold tabular-nums", accent)}>
          {running}
          <span className="ml-1 text-xs font-normal text-zinc-500">token</span>
        </span>
      </div>
      <div className="min-h-[14rem] flex-1 space-y-1.5 px-5 py-4 font-mono text-xs">
        <LoopBody steps={steps} revealed={revealed} />
      </div>
    </div>
  );
}

// ── Shared results table (Full loop + Detective tax) ─────────────────────────

function ResultsTable({
  totalU,
  totalS,
  taxU,
  taxS,
}: {
  totalU: number;
  totalS: number;
  taxU: number;
  taxS: number;
}) {
  const ratio = totalS > 0 ? (totalU / totalS).toFixed(1) : "—";
  const savings = totalU > 0 ? Math.round((1 - totalS / totalU) * 100) : 0;
  const taxRatio = taxS > 0 ? Math.round(taxU / taxS) : 0;
  return (
    <table className="mt-5 w-full text-sm">
      <thead>
        <tr className="border-b border-white/[0.05] text-xs uppercase tracking-wide text-zinc-500">
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
          <td className="py-2.5 pl-4 text-right text-zinc-400">
            ~{ratio}× · {savings}% saved
          </td>
        </tr>
        <tr className="border-b border-white/[0.02]">
          <td className="py-2.5 pr-4 text-zinc-300">
            Detective tax <span className="text-zinc-600">(finding the file)</span>
          </td>
          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-400">{taxU}</td>
          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-400">{taxS}</td>
          <td className="py-2.5 pl-4 text-right text-zinc-400">~{taxRatio}× less</td>
        </tr>
      </tbody>
    </table>
  );
}

function SingleView({ sim }: { sim: Sim }) {
  const { util, sem, revealedU, revealedS, done, totalU, totalS, taxU, taxS } = sim;
  return (
    <div>
      <div
        id="loop"
        className="scroll-mt-8 grid grid-cols-1 divide-y divide-white/[0.05] border-b border-white/[0.05] lg:grid-cols-2 lg:divide-x lg:divide-y-0"
      >
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
            <ResultsTable totalU={totalU} totalS={totalS} taxU={taxU} taxS={taxS} />
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

// ── Session-mode column: a scrolling chat of full loops ───────────────────────

function SessionColumn({
  title,
  tone,
  turns,
  cumulative,
}: {
  title: string;
  tone: "utility" | "semantic";
  turns: RevealedLoop[];
  cumulative: number;
}) {
  const accent = tone === "utility" ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        <span className={cn("font-mono text-lg font-semibold tabular-nums", accent)}>
          {cumulative}
          <span className="ml-1 text-xs font-normal text-zinc-500">token</span>
        </span>
      </div>
      <div className="flex-1 space-y-5 px-5 py-4 font-mono text-xs">
        {turns.map((t, i) =>
          t.revealed >= 1 ? (
            <div key={i} className="space-y-1.5">
              <LoopBody steps={t.steps} revealed={t.revealed} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function SessionView({ session }: { session: Session }) {
  const { utilTurns, semTurns, cumulativeUtil, cumulativeSem, done, totalU, totalS, taxU, taxS, tick, running } =
    session;

  // Auto-follow the growing columns while the session runs — but back off the
  // moment the user takes over scrolling, and resume on the next run.
  const followRef = useRef(true);

  useEffect(() => {
    if (running) followRef.current = true;
  }, [running]);

  // A genuine user gesture (wheel / touch / nav key) cancels auto-follow.
  useEffect(() => {
    if (!running) return;
    const stop = () => {
      followRef.current = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) stop();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
    };
  }, [running]);

  // Defer the scroll to the next frame so it lands after the new step has been
  // painted — scrolling synchronously mid-layout is what caused the flicker.
  useEffect(() => {
    if (!running || !followRef.current) return;
    const id = requestAnimationFrame(() =>
      window.scrollTo({ top: document.body.scrollHeight })
    );
    return () => cancelAnimationFrame(id);
  }, [tick, running]);

  return (
    <div>
      <div
        id="loop"
        className="scroll-mt-8 grid grid-cols-1 divide-y divide-white/[0.05] border-b border-white/[0.05] lg:grid-cols-2 lg:divide-x lg:divide-y-0"
      >
        <SessionColumn title="Utility Classes Only" tone="utility" turns={utilTurns} cumulative={cumulativeUtil} />
        <SessionColumn
          title="Semantic Identity Classes"
          tone="semantic"
          turns={semTurns}
          cumulative={cumulativeSem}
        />
      </div>

      <div className="px-6 py-10">
        {done && (
          <div className="mb-8">
            <h3 className="font-display text-lg font-semibold text-white">
              The tax is per destination, not per turn
            </h3>
            <p className="mt-1.5 text-sm text-zinc-500">
              A real agent doesn't re-search for a file it's already editing — the follow-up tweaks
              here cost the same on both sides, because the file is already in context. The gap only
              opens when the work moves to a <em>new</em> part of the codebase. The utility-only side
              pays the detective tax at each new component; the semantic side lands in one grep. The
              more components a session touches, the wider it gets.
            </p>
            <ResultsTable totalU={totalU} totalS={totalS} taxU={taxU} taxS={taxS} />
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

// ── Segmented control + body ──────────────────────────────────────────────────

const MODES = [
  { value: "single", label: "Single Prompt" },
  { value: "session", label: "Entire Session" },
] as const;

function Segmented({
  mode,
  onChange,
  disabled = false,
}: {
  mode: "single" | "session";
  onChange: (m: "single" | "session") => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-white/10 bg-white/[0.025] p-1 transition-opacity",
        disabled && "opacity-50"
      )}
    >
      {MODES.map((m) => {
        const active = mode === m.value;
        return (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            disabled={disabled}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
              active
                ? "bg-white/[0.08] text-white"
                : "text-zinc-500 enabled:hover:text-zinc-300"
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export default function DemoBody({
  mode,
  setMode,
  single,
  session,
}: {
  mode: "single" | "session";
  setMode: (m: "single" | "session") => void;
  single: Sim;
  session: Session;
}) {
  const active = mode === "single" ? single : session;
  const switchTo = (m: "single" | "session") => {
    if (m === mode || active.running) return;
    // Keep each tab's state intact — both arrive pre-filled with a completed run.
    setMode(m);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] px-6 py-6">
        <Segmented mode={mode} onChange={switchTo} disabled={active.running} />
        <SimControls active={active} label="Start the Session" subtle />
      </div>

      {mode === "single" ? <SingleView sim={single} /> : <SessionView session={session} />}
    </div>
  );
}
