#!/usr/bin/env bash
# Mizaan data pipeline loop (owner approval, 2026-11-20). Run by
# .github/workflows/pipeline.yml; see that file for why it exists.
#
# For up to PIPELINE_RUN_MIN minutes:
#   - every PIPELINE_INTERVAL_MIN minutes: ingest news, then cluster/rank/write
#     (both run here in the runner, writing to Postgres, as before);
#   - every 15 minutes while the US market is open, and hourly otherwise:
#     GET /api/cron/quotes (US stocks, crypto, FX);
#   - once at the start of the run: GET /api/cron/macro (economic data and the
#     channels' latest videos).
#
# Writes `chain=true|false` to $GITHUB_OUTPUT: false when the Vercel deployment
# is disabled (HTTP 402) or the run was too short to be healthy, so a broken
# pipeline never restarts itself in a tight loop.
set -uo pipefail

: "${APP_URL:?APP_URL secret must be set}"
: "${CRON_SECRET:?CRON_SECRET secret must be set}"
INTERVAL_MIN="${PIPELINE_INTERVAL_MIN:-30}"
RUN_MIN="${PIPELINE_RUN_MIN:-300}"
OUT="${GITHUB_OUTPUT:-/dev/null}"

started=$(date +%s)
deadline=$((started + RUN_MIN * 60))
chain=true
job_failures=0
last_quotes=0

log() { echo "$(date -u '+%H:%M:%S UTC') $*"; }

# 09:25–16:15 New York time, Monday to Friday (EST/EDT handled by TZ).
in_session() {
  local dow hm
  dow=$(TZ=America/New_York date +%u)
  hm=$(TZ=America/New_York date +%H%M)
  [ "$dow" -le 5 ] && [ "$((10#$hm))" -ge 925 ] && [ "$((10#$hm))" -le 1615 ]
}

# GET a cron route. Returns 2 on HTTP 402 (deployment disabled).
call_route() {
  local route=$1 code
  code=$(curl --show-error --silent --retry 2 --retry-delay 5 --max-time 90 \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -o response.txt -w '%{http_code}' \
    "${APP_URL%/}/api/cron/${route}") || true
  log "${route}: HTTP ${code} $(head -c 160 response.txt 2>/dev/null | tr -d '\n')"
  if [ "${code}" = "402" ]; then
    echo "::error::HTTP 402 — the Vercel deployment is disabled (billing/usage). Stopping the pipeline."
    return 2
  fi
  [ "${code}" = "200" ]
}

stop_for_402() {
  chain=false
  echo "chain=${chain}" >>"$OUT"
  exit 1
}

# Quotes when due: every 15 min in the US session, hourly otherwise.
quotes_if_due() {
  local now gap
  now=$(date +%s)
  if in_session; then gap=$((15 * 60)); else gap=$((60 * 60)); fi
  if [ $((now - last_quotes)) -ge "${gap}" ]; then
    last_quotes=${now}
    call_route quotes
    [ $? -eq 2 ] && stop_for_402
  fi
  return 0
}

run_job() {
  local name=$1 limit=$2
  log "${name}: start"
  if timeout "${limit}" pnpm --silent "job:${name}"; then
    log "${name}: done"
    return 0
  fi
  echo "::warning::${name} job failed or timed out"
  return 1
}

call_route macro
[ $? -eq 2 ] && stop_for_402

while [ "$(date +%s)" -lt "${deadline}" ]; do
  cycle=$(date +%s)
  quotes_if_due

  ok=true
  run_job ingest 10m || ok=false
  quotes_if_due
  run_job cluster 20m || ok=false
  if ${ok}; then
    job_failures=0
  else
    job_failures=$((job_failures + 1))
    if [ "${job_failures}" -ge 3 ]; then
      echo "::error::Three pipeline cycles in a row had a failing job; stopping this run."
      break
    fi
  fi

  # Wait for the next cycle, refreshing quotes on time meanwhile.
  next=$((cycle + INTERVAL_MIN * 60))
  while [ "$(date +%s)" -lt "${next}" ] && [ "$(date +%s)" -lt "${deadline}" ]; do
    quotes_if_due
    sleep 60
  done
done

# Restart only after a healthy-length run, so a failing pipeline cannot spin.
if [ $(($(date +%s) - started)) -lt $((30 * 60)) ]; then
  echo "::warning::Run ended after under 30 minutes; not restarting it (the backup schedule will)."
  chain=false
fi
echo "chain=${chain}" >>"$OUT"
[ "${job_failures}" -ge 3 ] && exit 1
exit 0
