#!/usr/bin/env bash
# Walk every flag in packages/shared/src/config/{features,env-features}.ts
# and count references in apps/api/src and apps/web (excluding the defining file).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/audit/raw/feature-flag-refs.tsv"

echo -e "kind\tflag\tdefined_in\tapi_refs\tweb_refs\ttenant_refs\ttotal" > "$OUT"

scan() {
  local kind="$1"
  local file="$2"
  # Use grep+sed to extract enum members. POSIX-portable.
  awk '
    /^export[[:space:]]+enum[[:space:]]/ { in_enum=1; next }
    in_enum && /^\}/ { in_enum=0; next }
    in_enum {
      line = $0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]*=.*$/, "", line)
      if (line ~ /^[A-Z_][A-Z0-9_]*$/) print line
    }
  ' "$file" | while read -r flag; do
    [ -z "$flag" ] && continue

    api=$( { rg -c --no-messages \
      --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/dist/**' --glob '!**/audit/**' \
      "[^A-Za-z0-9_]${flag}[^A-Za-z0-9_]" \
      "$ROOT/apps/api/src" 2>/dev/null || true; } | awk -F: '{s+=$2} END {print s+0}')

    web=$( { rg -c --no-messages \
      --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/dist/**' --glob '!**/audit/**' \
      "[^A-Za-z0-9_]${flag}[^A-Za-z0-9_]" \
      "$ROOT/apps/web" 2>/dev/null || true; } | awk -F: '{s+=$2} END {print s+0}')

    tenant=$( { rg -c --no-messages \
      --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/dist/**' --glob '!**/audit/**' \
      "[^A-Za-z0-9_]${flag}[^A-Za-z0-9_]" \
      "$ROOT/apps/tenant-site" 2>/dev/null || true; } | awk -F: '{s+=$2} END {print s+0}')

    total=$(( api + web + tenant ))
    echo -e "${kind}\t${flag}\t${file#$ROOT/}\t${api}\t${web}\t${tenant}\t${total}" >> "$OUT"
  done
}

scan "Feature" "$ROOT/packages/shared/src/config/features.ts"
scan "EnvFeature" "$ROOT/packages/shared/src/config/env-features.ts"

echo "Wrote $OUT"
echo ""
echo "Flags with total<=1 (only the definition itself, no consumers):"
awk -F'\t' 'NR>1 && $7<=1 {printf "%-12s %-40s api=%d web=%d tenant=%d\n", $1, $2, $4, $5, $6}' "$OUT"
echo ""
echo "Flags with low usage (total 2..3):"
awk -F'\t' 'NR>1 && $7>1 && $7<=3 {printf "%-12s %-40s api=%d web=%d tenant=%d\n", $1, $2, $4, $5, $6}' "$OUT"
