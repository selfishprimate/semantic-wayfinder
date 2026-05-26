#!/bin/sh
# Bump the semver version stored in .claude/skills/wayfinder/SKILL.md frontmatter.
#
# Usage:
#   ./scripts/bump-version.sh patch     # 0.1.2 → 0.1.3
#   ./scripts/bump-version.sh minor     # 0.1.2 → 0.2.0
#   ./scripts/bump-version.sh major     # 0.1.2 → 1.0.0
#   ./scripts/bump-version.sh --show    # just print current version, don't bump
#
# The bumped value is printed to stdout. The source file is modified in place.
# Other SKILL.md copies (.agents/, .gemini/) are NOT updated here — run
# scripts/sync-skills.sh after this, or rely on the pre-commit hook.

set -e

SOURCE=".claude/skills/wayfinder/SKILL.md"

if [ ! -f "$SOURCE" ]; then
  echo "error: $SOURCE not found (run from repo root)" >&2
  exit 1
fi

CURRENT=$(grep "^version:" "$SOURCE" | head -1 | sed 's/^version: *//' | tr -d ' ')

if [ -z "$CURRENT" ]; then
  echo "error: could not read current version from $SOURCE frontmatter" >&2
  exit 1
fi

if [ "$1" = "--show" ] || [ -z "$1" ]; then
  echo "$CURRENT"
  exit 0
fi

MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
PATCH=$(echo "$CURRENT" | cut -d. -f3)

case "$1" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "error: unknown bump type '$1' (expected: patch, minor, major)" >&2
    exit 1
    ;;
esac

NEW="$MAJOR.$MINOR.$PATCH"

# Update in place. Use a portable sed approach that works on both BSD (macOS)
# and GNU sed.
TMP=$(mktemp)
sed "s/^version: .*$/version: $NEW/" "$SOURCE" > "$TMP" && mv "$TMP" "$SOURCE"

echo "$NEW"
