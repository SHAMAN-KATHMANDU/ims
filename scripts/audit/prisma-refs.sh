#!/usr/bin/env bash
# Scan every Prisma model field name against TS source for references.
# Output: tsv → audit/raw/prisma-refs.tsv
# Columns: model, field, refs_in_src
# Excludes prisma/migrations/, prisma/schema.prisma itself, dist/, .next/
set -uo pipefail
# Note: do NOT use `-e` because rg returns non-zero on zero matches, which is normal here.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCHEMA="$ROOT/apps/api/prisma/schema.prisma"
OUT="$ROOT/audit/raw/prisma-refs.tsv"

if [ ! -f "$SCHEMA" ]; then
  echo "schema.prisma not found at $SCHEMA" >&2
  exit 1
fi

echo -e "model\tfield\tref_count" > "$OUT"

# Parse: when we hit `model X {`, capture model name. Capture each `  name Type` line until `}`.
awk '
  /^model[[:space:]]+[A-Za-z0-9_]+[[:space:]]+\{/ {
    model = $2
    in_model = 1
    next
  }
  in_model && /^\}/ { in_model = 0; next }
  in_model && /^[[:space:]]+[a-zA-Z_][A-Za-z0-9_]*[[:space:]]+/ {
    if ($1 ~ /^@@/) next
    print model "\t" $1
  }
' "$SCHEMA" | while IFS=$'\t' read -r model field; do
  # skip empty
  [ -z "$field" ] && continue
  # search for the field name as a word in TS sources, excluding schema, migrations, dist, .next, node_modules
  # Use a tighter pattern: \.field (member access) OR field: (object literal) OR field" (quoted)
  count=$( { rg -t ts -c --no-messages \
    --glob '!**/node_modules/**' \
    --glob '!**/.next/**' \
    --glob '!**/dist/**' \
    --glob '!**/prisma/migrations/**' \
    --glob '!**/audit/**' \
    --glob '!**/*schema.prisma' \
    -e "[^A-Za-z0-9_]${field}[^A-Za-z0-9_]" \
    "$ROOT/apps" "$ROOT/packages" 2>/dev/null || true; } | awk -F: '{s+=$2} END {print s+0}')
  echo -e "${model}\t${field}\t${count}" >> "$OUT"
done

echo "Wrote $OUT"
echo "Zero-ref candidates:"
awk -F'\t' 'NR>1 && $3==0 {print $1"."$2}' "$OUT" | sort -u
