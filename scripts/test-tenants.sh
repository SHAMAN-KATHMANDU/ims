#!/usr/bin/env bash
#
# Multi-Tenant Isolation Test Script
# -----------------------------------
# Tests that two tenants see completely separate data.
#
# Usage: source apps/api/.env && bash scripts/test-tenants.sh
#

set -uo pipefail

API="${API_URL:-http://localhost:4000/api/v1}"
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

pass=0
fail=0

api_call() {
  curl -s --connect-timeout 5 --max-time 15 "$@"
}

check() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}PASS${NC} $label (got: $actual)"
    ((pass++)) || true
  else
    echo -e "  ${RED}FAIL${NC} $label — expected ${BOLD}$expected${NC}, got ${BOLD}$actual${NC}"
    ((fail++)) || true
  fi
}

check_not_equal() {
  local label="$1" val1="$2" val2="$3"
  if [[ "$val1" != "$val2" ]]; then
    echo -e "  ${GREEN}PASS${NC} $label (values differ)"
    ((pass++)) || true
  else
    echo -e "  ${RED}FAIL${NC} $label — both values are identical: $val1"
    ((fail++)) || true
  fi
}

count_items() {
  local file="$1"
  python3 -c "
import json
d = json.load(open('$file'))
if isinstance(d, list): print(len(d))
elif 'data' in d and isinstance(d['data'], list): print(len(d['data']))
elif 'pagination' in d and 'total' in d['pagination']: print(d['pagination']['total'])
else: print(0)
" 2>/dev/null || echo "0"
}

get_names() {
  local file="$1"
  python3 -c "
import json
d = json.load(open('$file'))
items = d if isinstance(d, list) else d.get('data', [])
print(', '.join(sorted(c.get('name','') for c in items[:5])))
" 2>/dev/null || echo "?"
}

echo ""
echo -e "${BOLD}${CYAN}========================================${NC}"
echo -e "${BOLD}${CYAN} Multi-Tenant Isolation Test${NC}"
echo -e "${BOLD}${CYAN}========================================${NC}"
echo ""

# ─── 1. Login to Default Tenant ──────────────────────────────────────
echo -e "${YELLOW}1. Login to Default Organization${NC}"
api_call -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: default" \
  -d "{\"username\": \"${SUPERADMIN_USERNAME:-admin}\", \"password\": \"${SUPERADMIN_PASSWORD:-admin123}\"}" \
  > "$TMP/d_login.json"

DEFAULT_TOKEN=$(python3 -c "import json; print(json.load(open('$TMP/d_login.json')).get('token',''))" 2>/dev/null)
DEFAULT_TENANT=$(python3 -c "import json; t=json.load(open('$TMP/d_login.json')).get('tenant',{}); print(f\"{t.get('name','')} ({t.get('plan','')})\")" 2>/dev/null)

if [[ -z "$DEFAULT_TOKEN" ]]; then
  echo -e "  ${RED}FAIL${NC} Could not login. Set SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD."
  exit 1
fi
echo -e "  ${GREEN}OK${NC} $DEFAULT_TENANT"

# ─── 2. Login to Test Tenant ─────────────────────────────────────────
echo -e "\n${YELLOW}2. Login to Asha Boutique (test-org)${NC}"
api_call -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: test-org" \
  -d '{"username": "testadmin", "password": "test123"}' \
  > "$TMP/t_login.json"

TEST_TOKEN=$(python3 -c "import json; print(json.load(open('$TMP/t_login.json')).get('token',''))" 2>/dev/null)
TEST_TENANT=$(python3 -c "import json; t=json.load(open('$TMP/t_login.json')).get('tenant',{}); print(f\"{t.get('name','')} ({t.get('plan','')})\")" 2>/dev/null)

if [[ -z "$TEST_TOKEN" ]]; then
  echo -e "  ${RED}FAIL${NC} Could not login to test tenant."
  exit 1
fi
echo -e "  ${GREEN}OK${NC} $TEST_TENANT"

# ─── 3. Products ─────────────────────────────────────────────────────
echo -e "\n${YELLOW}3. Products${NC}"
api_call "$API/products" -H "Authorization: Bearer $DEFAULT_TOKEN" > "$TMP/d_prod.json"
api_call "$API/products" -H "Authorization: Bearer $TEST_TOKEN" > "$TMP/t_prod.json"
D_PROD=$(count_items "$TMP/d_prod.json")
T_PROD=$(count_items "$TMP/t_prod.json")
echo -e "  Default: $D_PROD | Test: $T_PROD"
check_not_equal "Product counts differ" "$D_PROD" "$T_PROD"

# ─── 4. Categories ───────────────────────────────────────────────────
echo -e "\n${YELLOW}4. Categories${NC}"
api_call "$API/categories" -H "Authorization: Bearer $DEFAULT_TOKEN" > "$TMP/d_cat.json"
api_call "$API/categories" -H "Authorization: Bearer $TEST_TOKEN" > "$TMP/t_cat.json"
D_CAT=$(get_names "$TMP/d_cat.json")
T_CAT=$(get_names "$TMP/t_cat.json")
echo -e "  Default: $D_CAT"
echo -e "  Test:    $T_CAT"
check_not_equal "Categories differ" "$D_CAT" "$T_CAT"

# ─── 5. Members ──────────────────────────────────────────────────────
echo -e "\n${YELLOW}5. Members${NC}"
api_call "$API/members" -H "Authorization: Bearer $DEFAULT_TOKEN" > "$TMP/d_mem.json"
api_call "$API/members" -H "Authorization: Bearer $TEST_TOKEN" > "$TMP/t_mem.json"
D_MEM=$(count_items "$TMP/d_mem.json")
T_MEM=$(count_items "$TMP/t_mem.json")
echo -e "  Default: $D_MEM | Test: $T_MEM"
check_not_equal "Member counts differ" "$D_MEM" "$T_MEM"

# ─── 6. Cross-tenant blocked ─────────────────────────────────────────
echo -e "\n${YELLOW}6. Cross-Tenant Isolation${NC}"
echo -e "  (Test-org token should always see only test-org data)"
api_call "$API/products" -H "Authorization: Bearer $TEST_TOKEN" -H "X-Tenant-Slug: default" > "$TMP/cross.json"
CROSS=$(count_items "$TMP/cross.json")
echo -e "  Test token + default slug: $CROSS products"
check "Cross-tenant blocked" "$CROSS" "$T_PROD"

# ─── 7. Subscription Headers ─────────────────────────────────────────
echo -e "\n${YELLOW}7. Subscription Headers${NC}"
api_call -D "$TMP/headers.txt" "$API/products" -H "Authorization: Bearer $TEST_TOKEN" -o /dev/null 2>/dev/null
SUB_STATUS=$(grep -i "x-subscription-status" "$TMP/headers.txt" 2>/dev/null | tr -d '\r' | awk -F': ' '{print $2}' || echo "missing")
PLAN_TIER=$(grep -i "x-plan-tier" "$TMP/headers.txt" 2>/dev/null | tr -d '\r' | awk -F': ' '{print $2}' || echo "missing")
echo -e "  X-Subscription-Status: $SUB_STATUS"
echo -e "  X-Plan-Tier: $PLAN_TIER"
check "Subscription status = TRIAL" "$SUB_STATUS" "TRIAL"
check "Plan tier = STARTER" "$PLAN_TIER" "STARTER"

# ─── Summary ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}========================================${NC}"
total=$((pass + fail))
echo -e "${BOLD}${CYAN} Results: ${GREEN}$pass${CYAN}/${total} passed${NC}"
if [[ $fail -gt 0 ]]; then
  echo -e "          ${RED}$fail failed${NC}"
fi
echo -e "${BOLD}${CYAN}========================================${NC}"
echo ""
echo -e "${BOLD}Test Accounts:${NC}"
echo -e "  Default Org:    ${SUPERADMIN_USERNAME:-admin} / (from .env)"
echo -e "  Asha Boutique:  testadmin / test123"
echo -e "  Asha (user):    testuser / test123"
echo -e "  Platform Admin: platform / platform123"
echo ""

if [[ $fail -gt 0 ]]; then exit 1; fi
