#!/usr/bin/env bash
# Diff every KEY= in .env.example files against process.env.KEY references in source.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/audit/raw/env-refs.tsv"
SEEN_FILE=$(mktemp)
trap "rm -f $SEEN_FILE" EXIT

echo -e "key\tdefined_in\tref_count\tref_files" > "$OUT"

for example in "$ROOT/.env.example" "$ROOT/apps/api/.env.example" "$ROOT/apps/web/.env.example" "$ROOT/apps/tenant-site/.env.example"; do
  [ -f "$example" ] || continue
  while IFS= read -r line; do
    case "$line" in
      \#*|"") continue ;;
    esac
    key="${line%%=*}"
    key="${key// }"
    case "$key" in
      *[!A-Z0-9_]*|"") continue ;;
    esac
    # dedupe via sentinel file
    if grep -qxF "$key" "$SEEN_FILE" 2>/dev/null; then continue; fi
    echo "$key" >> "$SEEN_FILE"

    count=$( { rg -c --no-messages \
      --glob '!**/node_modules/**' \
      --glob '!**/.next/**' \
      --glob '!**/dist/**' \
      --glob '!**/audit/**' \
      --glob '!**/.env*' \
      "process\.env\.${key}\b|process\.env\[\"${key}\"\]|process\.env\['${key}'\]" \
      "$ROOT/apps" "$ROOT/packages" "$ROOT/scripts" 2>/dev/null || true; } | awk -F: '{s+=$2} END {print s+0}')

    files=""
    if [ "$count" -gt 0 ]; then
      files=$( { rg -l --no-messages \
        --glob '!**/node_modules/**' \
        --glob '!**/.next/**' \
        --glob '!**/dist/**' \
        --glob '!**/audit/**' \
        --glob '!**/.env*' \
        "process\.env\.${key}\b|process\.env\[\"${key}\"\]|process\.env\['${key}'\]" \
        "$ROOT/apps" "$ROOT/packages" "$ROOT/scripts" 2>/dev/null || true; } | head -3 | tr '\n' ',' | sed "s|$ROOT/||g")
    fi

    echo -e "${key}\t${example#$ROOT/}\t${count}\t${files}" >> "$OUT"
  done < "$example"
done

echo "Wrote $OUT"
echo ""
echo "Zero-reference env vars (defined in .env.example but never read):"
awk -F'\t' 'NR>1 && $3==0 {print $1"\t("$2")"}' "$OUT"
