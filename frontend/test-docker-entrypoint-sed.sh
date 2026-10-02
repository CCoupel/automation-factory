#!/bin/sh
# Regression test for the PROD version-masking sed in frontend/docker-entrypoint.sh
# (task 2.6 of the X.Y.Z.a versioning migration — see _work/reports/plan-20260918-163620.md, constat C6)
#
# What it guards against: the sed that strips the build counter (4th segment
# of X.Y.Z.a) — or the legacy -rc.n suffix — from the frontend /version
# endpoint MUST be scoped to the "version":"..." line only. A sed applied to
# the whole nginx.conf (the old behaviour: `sed -i 's/-rc\.[0-9]*//g'`) can
# corrupt unrelated values anywhere in the file — e.g. mutate an IP address
# such as 192.168.1.217 appearing in another directive.
#
# This test extracts the exact two sed expressions currently used in
# docker-entrypoint.sh (rather than reimplementing them) so it fails loudly
# if the production logic drifts from what this test exercises.
#
# Usage: sh frontend/test-docker-entrypoint-sed.sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ENTRYPOINT="$SCRIPT_DIR/docker-entrypoint.sh"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

FAILED=0

fail() {
  echo "FAIL: $1"
  FAILED=1
}

pass() {
  echo "PASS: $1"
}

# The two sed expressions below MUST be kept byte-for-byte identical to the
# ones in docker-entrypoint.sh's PROD branch. We assert that here first so a
# silent drift (someone edits one but not the other) fails fast instead of
# giving false confidence.
EXPR1='/"version":"/s/\("version":"[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)\.[0-9][0-9]*"/\1"/'
EXPR2='/"version":"/s/\("version":"[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)-rc\.[0-9][0-9]*"/\1"/'

if ! grep -qF "$EXPR1" "$ENTRYPOINT"; then
  fail "drift detected: EXPR1 no longer found verbatim in $ENTRYPOINT — update this test to match"
fi
if ! grep -qF "$EXPR2" "$ENTRYPOINT"; then
  fail "drift detected: EXPR2 no longer found verbatim in $ENTRYPOINT — update this test to match"
fi
if [ "$FAILED" -ne 0 ]; then
  echo "Aborting: cannot validate stale/mismatched sed expressions."
  exit 2
fi

# Also assert the old dangerous global sed is gone for good.
if grep -qE "sed -i 's/-rc\\\\\.\[0-9\]\*//g'" "$ENTRYPOINT"; then
  fail "the old global sed 's/-rc\\.[0-9]*//g' (whole-file, unscoped) is still present in $ENTRYPOINT"
fi

run_case() {
  label="$1"
  input_version_line="$2"
  expected_version_line="$3"

  conf="$TMP_DIR/nginx-$label.conf"
  cat > "$conf" <<EOF
server {
    listen 80;

    # Backend reachable at 192.168.1.217 — must survive the sed byte-for-byte
    set \$backend_ip 192.168.1.217;
    # proxy_pass http://192.168.1.217:8000;

    location = /health {
        return 200 'OK';
    }

    location = /version {
        access_log off;
        add_header Content-Type application/json;
        return 200 '$input_version_line';
    }
}
EOF

  sed -i -e "$EXPR1" -e "$EXPR2" "$conf"

  if grep -qF "$expected_version_line" "$conf"; then
    pass "$label: version line stripped to expected value"
  else
    fail "$label: expected [$expected_version_line], got: $(grep 'return 200' "$conf" | grep version)"
  fi

  if grep -qF '192.168.1.217' "$conf"; then
    pass "$label: unrelated IP 192.168.1.217 left intact"
  else
    fail "$label: IP 192.168.1.217 was mutated by the sed"
  fi

  occurrences=$(grep -c '192\.168\.1\.217' "$conf")
  if [ "$occurrences" -eq 3 ]; then
    pass "$label: all 3 IP occurrences (comment + set + proxy_pass) preserved"
  else
    fail "$label: expected 3 occurrences of the IP, found $occurrences"
  fi
}

# Case 1: current 4-segment format X.Y.Z.a -> strip build counter
run_case "four-segment" \
  '{"version":"2.4.4.3","name":"Automation Factory Frontend","environment":"development"}' \
  '{"version":"2.4.4","name":"Automation Factory Frontend","environment":"development"}'

# Case 2: legacy -rc.n suffix -> stripped for backward compat during transition
run_case "legacy-rc" \
  '{"version":"2.4.3-rc.2","name":"Automation Factory Frontend","environment":"development"}' \
  '{"version":"2.4.3","name":"Automation Factory Frontend","environment":"development"}'

# Case 3: already-bare X.Y.Z (a PROD-released version) -> left untouched
run_case "already-bare" \
  '{"version":"2.4.4","name":"Automation Factory Frontend","environment":"development"}' \
  '{"version":"2.4.4","name":"Automation Factory Frontend","environment":"development"}'

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "All docker-entrypoint.sh version-sed tests passed."
  exit 0
else
  echo "Some docker-entrypoint.sh version-sed tests FAILED."
  exit 1
fi
