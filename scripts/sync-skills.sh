#!/usr/bin/env bash
#
# sync-skills.sh
#
# Keeps the three SKILL.md copies in sync. Semantic Wayfinder ships the same
# skill instructions for three editors that share the Agent Skills standard:
#
#   .claude/skills/semantic-wayfinder/SKILL.md   (Claude Code)
#   .agents/skills/semantic-wayfinder/SKILL.md   (Codex CLI, generic agents)
#   .gemini/skills/semantic-wayfinder/SKILL.md   (Gemini CLI)
#
# We treat .claude/ as the source of truth and copy from there to the other
# two. If you need editor-specific divergence later, this script is the place
# to teach it.
#
# Usage:
#   ./scripts/sync-skills.sh           # copy source to the others
#   ./scripts/sync-skills.sh --check   # exit non-zero if they differ (for CI)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$REPO_ROOT/.claude/skills/semantic-wayfinder/SKILL.md"
TARGETS=(
  "$REPO_ROOT/.agents/skills/semantic-wayfinder/SKILL.md"
  "$REPO_ROOT/.gemini/skills/semantic-wayfinder/SKILL.md"
)

if [[ ! -f "$SOURCE" ]]; then
  echo "Source not found: $SOURCE" >&2
  exit 1
fi

if [[ "${1:-}" == "--check" ]]; then
  status=0
  for target in "${TARGETS[@]}"; do
    if [[ ! -f "$target" ]]; then
      echo "Missing: $target"
      status=1
      continue
    fi
    if ! diff -q "$SOURCE" "$target" > /dev/null; then
      echo "Out of sync: $target"
      status=1
    fi
  done
  if [[ $status -eq 0 ]]; then
    echo "All skill copies are in sync."
  fi
  exit $status
fi

for target in "${TARGETS[@]}"; do
  mkdir -p "$(dirname "$target")"
  cp "$SOURCE" "$target"
  echo "Synced → $target"
done

echo "Done."
