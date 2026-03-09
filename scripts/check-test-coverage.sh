#!/usr/bin/env bash
# Fail if new controller has no corresponding test.
# Run from repo root. Use in CI.

set -e
CONTROLLERS=$(find apps/api/src/modules -name "*.controller.ts" -not -path "*/node_modules/*" 2>/dev/null || true)
MISSING=0
for c in $CONTROLLERS; do
  base="${c%.controller.ts}"
  testfile="${base}.controller.test.ts"
  if [ ! -f "$testfile" ]; then
    echo "Missing test: $testfile"
    MISSING=1
  fi
done
if [ $MISSING -eq 1 ]; then
  echo "Every controller must have a .controller.test.ts file."
  exit 1
fi
echo "All controllers have tests."
exit 0
