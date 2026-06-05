#!/usr/bin/env node
// Wayfinder savings report — estimates how much agent "navigation" a commit
// avoided thanks to semantic identity classes, and records it to a report file.
//
// HONESTY CONTRACT (read this before changing the math):
//   "Savings" is a COUNTERFACTUAL — we can never measure the tokens an agent
//   would have spent on a codebase that ISN'T tagged, because that run never
//   happened. So this script measures what IS observable and estimates the rest:
//
//     MEASURED (real, run against your live repo via `git grep`):
//       • how many files the identity class matches  → the 1-hit precision
//       • how many files a natural generic term matches → the decoy spread
//       • the byte size of those decoy candidate files
//
//     ESTIMATED (modeled, clearly labeled as such):
//       • tokens ≈ chars / 4  (a fast heuristic; the website uses exact
//         js-tiktoken — this hook stays dependency-free on purpose)
//       • "saved" ≈ the decoy files an agent would have had to read to
//         disambiguate, which the single-hit identity grep let it skip
//
// The number is a transparent estimate, never a billed figure. Keep it that way.
//
// Usage:  node scripts/wayfinder-report.mjs [--range <gitRange>] [--root <dir>]
// Default range: the just-made commit (HEAD~1..HEAD), i.e. perfect for a
// post-commit hook. Exits 0 and stays quiet when there's nothing to report.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CHARS_PER_TOKEN = 4; // estimation heuristic — see honesty contract above
const MAX_DECOYS_SAMPLED = 12; // cap file reads; we log when we truncate
const DEFAULT_REPORT_FILE = "WAYFINDER_REPORT.md";

// ── tiny arg parse ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const root = getArg("--root") || process.cwd();

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function git(cArgs) {
  return execFileSync("git", cArgs, { cwd: root, encoding: "utf8" }).trim();
}
function gitSafe(cArgs, fallback = "") {
  try {
    return git(cArgs);
  } catch {
    return fallback;
  }
}

// ── preconditions ─────────────────────────────────────────────────────────────
const manifestPath = join(root, ".wayfinder.json");
if (!existsSync(manifestPath)) {
  // Not a Wayfinder project (or not bootstrapped yet) — stay silent.
  process.exit(0);
}
if (gitSafe(["rev-parse", "--is-inside-work-tree"]) !== "true") process.exit(0);

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  console.error("[wayfinder] .wayfinder.json is not valid JSON — skipping report.");
  process.exit(0);
}

// Report behavior is controlled from .wayfinder.json → "report":
//   { "enabled": true, "terminal": true, "file": "WAYFINDER_REPORT.md" }
// Missing keys fall back to these defaults, so older manifests keep working.
const cfg = manifest.report || {};
if (cfg.enabled === false) process.exit(0); // master off switch
const showTerminal = cfg.terminal !== false; // default: print to terminal
const writeFile = cfg.file !== false; // default: write the .md file
const reportFile = typeof cfg.file === "string" ? cfg.file : DEFAULT_REPORT_FILE;

// path -> identity class (first class wins). Covers both siteMap + tagged.
const tagged = manifest.tagged || {};
const classOf = {};
for (const [p, classes] of Object.entries(tagged)) {
  if (Array.isArray(classes) && classes.length) classOf[p] = classes[0];
}
const taggedPaths = new Set(Object.keys(classOf));
if (!taggedPaths.size) process.exit(0);

// search roots = top-level dirs the manifest lives under (app/, components/, …)
const searchDirs = [...new Set(Object.keys(classOf).map((p) => p.split("/")[0]))].filter(
  (d) => existsSync(join(root, d))
);

// ── which commit(s) are we reporting on? ──────────────────────────────────────
const range = getArg("--range");
let changed;
if (range) {
  changed = gitSafe(["diff", "--name-only", range]);
} else if (gitSafe(["rev-parse", "HEAD~1"])) {
  changed = gitSafe(["diff", "--name-only", "HEAD~1", "HEAD"]);
} else {
  // first commit ever: everything it introduced
  changed = gitSafe(["show", "--name-only", "--pretty=format:", "HEAD"]);
}
const changedFiles = changed.split("\n").map((s) => s.trim()).filter(Boolean);

// tagged components touched by this commit
const touched = changedFiles.filter((f) => taggedPaths.has(f));
if (!touched.length) process.exit(0);

// ── per-component measurement ─────────────────────────────────────────────────
// For the generic-term counterfactual we use the component's ROLE word — the
// last CamelCase segment of its filename (ContactForm → "form"). That's the kind
// of word a dev or agent reaches for when they don't have an identity class.
function roleWord(path) {
  const base = path.split("/").pop().replace(/\.\w+$/, "");
  const segs = base.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?=[A-Z]|$)/g) || [base];
  return segs[segs.length - 1].toLowerCase();
}
function grepCount(pattern, caseInsensitive) {
  const flags = caseInsensitive ? "-lIiF" : "-lIF";
  const out = gitSafe(["grep", flags, pattern, "--", ...(searchDirs.length ? searchDirs : ["."])]);
  return out ? out.split("\n").filter(Boolean) : [];
}
function tokensOf(relPath) {
  try {
    return Math.round(statSync(join(root, relPath)).size / CHARS_PER_TOKEN);
  } catch {
    return 0;
  }
}

let totalSaved = 0;
let truncated = false;
const rows = [];
for (const path of touched) {
  const cls = classOf[path];
  const idMatches = grepCount(cls, false); // identity class → ~1 hit (measured)
  const role = roleWord(path);
  const genericMatches = grepCount(role, true); // generic term → N candidates (measured)
  const decoys = genericMatches.filter((p) => p !== path);
  const sampled = decoys.slice(0, MAX_DECOYS_SAMPLED);
  if (sampled.length < decoys.length) truncated = true;
  // estimated tokens an agent skipped: reading the decoy candidates to disambiguate
  const saved = sampled.reduce((a, p) => a + tokensOf(p), 0);
  totalSaved += saved;
  rows.push({ path, cls, role, hits: idMatches.length, candidates: genericMatches.length, saved });
}

const shortHash = gitSafe(["rev-parse", "--short", "HEAD"]) || "staged";
const subject = gitSafe(["log", "-1", "--pretty=%s"]) || "";
const today = new Date().toISOString().slice(0, 10);
const fmt = (n) => n.toLocaleString("en-US");

// ── terminal output (toggle via report.terminal) ──────────────────────────────
if (showTerminal) {
  const line = "─".repeat(58);
  console.log("");
  console.log(c.cyan(`  ⌖ Wayfinder — savings since the last commit`));
  console.log(c.dim(`  ${line}`));
  for (const r of rows) {
    console.log(
      `  ${c.green("●")} ${c.bold("." + r.cls)}  ` +
        c.dim(`located in ${r.hits} hit${r.hits === 1 ? "" : "s"} ` +
          `(generic "${r.role}" → ${r.candidates} candidate${r.candidates === 1 ? "" : "s"})`)
    );
  }
  console.log(c.dim(`  ${line}`));
  console.log(
    `  ${c.bold(c.green(`~${fmt(totalSaved)} tokens`))} of agent navigation skipped ` +
      c.dim(`(estimated)`)
  );
  if (truncated) console.log(c.dim(`  (decoy sample capped at ${MAX_DECOYS_SAMPLED}/file — real spread is larger)`));
  if (writeFile) console.log(c.dim(`  ↳ recorded in ${reportFile}`));
  console.log("");
}

// ── report file, cumulative (skipped when report.file === false) ──────────────
if (!writeFile) process.exit(0);
const reportPath = join(root, reportFile);
let prevTokens = 0;
let prevCommits = 0;
let prevRows = [];
if (existsSync(reportPath)) {
  const txt = readFileSync(reportPath, "utf8");
  prevTokens = Number((txt.match(/wf:cumulative-tokens=(\d+)/) || [])[1] || 0);
  prevCommits = Number((txt.match(/wf:commits=(\d+)/) || [])[1] || 0);
  prevRows = txt.split("\n").filter((l) => /^\| \d{4}-\d{2}-\d{2} /.test(l));
}
const cumTokens = prevTokens + totalSaved;
const cumCommits = prevCommits + 1;

const compCell = rows.map((r) => `\`.${r.cls}\``).join(", ");
const locatedCell = rows
  .map((r) => `${r.hits}↜${r.candidates}`)
  .join(" · ");
const newRow =
  `| ${today} | \`${shortHash}\` | ${compCell} | ${locatedCell} | ~${fmt(totalSaved)} |`;

const report = `# Wayfinder Savings Report

<!-- wf:cumulative-tokens=${cumTokens} -->
<!-- wf:commits=${cumCommits} -->

Estimated cumulative agent-navigation savings: **~${fmt(cumTokens)} tokens** across ${cumCommits} commit${cumCommits === 1 ? "" : "s"}.

Each row is one commit. **Located** reads as \`hits↜candidates\`: how many files the
identity class matched vs. how many a natural generic search would have surfaced.

| Date | Commit | Components | Located | Est. tokens saved |
|------|--------|-----------|---------|-------------------|
${[...prevRows, newRow].join("\n")}

---

\\* **Estimated, modeled.** "Saved" tokens approximate the decoy candidate files an
agent would have read to disambiguate a generic search — work the single-hit
identity grep let it skip. Token count uses a ~${CHARS_PER_TOKEN}-chars/token heuristic
(the website uses exact \`js-tiktoken\`). This is a transparent estimate, not a
billed figure — and it can't capture the counterfactual exactly, by definition.
`;

writeFileSync(reportPath, report);
process.exit(0);
