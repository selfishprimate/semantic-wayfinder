import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const RAW = "https://raw.githubusercontent.com/selfishprimate/semantic-wayfinder/main";

const EDITORS = [
  { key: "claude", name: "Claude", dir: ".claude" },
  { key: "codex", name: "Codex", dir: ".agents" },
  { key: "gemini", name: "Gemini", dir: ".gemini" },
] as const;

function command(dir: string) {
  return `curl -fsSL ${RAW}/${dir}/skills/wayfinder/SKILL.md --create-dirs -o ${dir}/skills/wayfinder/SKILL.md`;
}

export default function InstallCard() {
  const [active, setActive] = useState<(typeof EDITORS)[number]>(EDITORS[0]); // Claude default
  const [copied, setCopied] = useState(false);
  const cmd = command(active.dir);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-left">
      {/* header: label (left) + editor selector (top-right) */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Add the skill to your project
        </span>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.025] p-0.5">
          {EDITORS.map((e) => (
            <button
              key={e.key}
              onClick={() => setActive(e)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active.key === e.key
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {e.name}
            </button>
          ))}
        </div>
      </div>

      {/* command + copy */}
      <div className="relative">
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-black/30 px-3 py-3 pr-12 font-mono text-xs leading-relaxed text-zinc-400">
          {cmd}
        </pre>
        <button
          onClick={copy}
          title={copied ? "Copied" : "Copy command"}
          aria-label="Copy command"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-800 text-zinc-300 shadow-sm transition-colors hover:bg-zinc-700 hover:text-white"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
