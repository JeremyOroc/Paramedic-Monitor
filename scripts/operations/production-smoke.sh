#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

ops_require_env PRODUCTION_BASE_URL
base_url="${PRODUCTION_BASE_URL%/}"
if [[ "$base_url" != https://* && "${ALLOW_HTTP_SMOKE:-false}" != 'true' ]]; then
  ops_die 'PRODUCTION_BASE_URL must use HTTPS'
fi

if [[ "${SMOKE_DRY_RUN:-false}" == 'true' ]]; then
  ops_log 'Dry run: verify health, public landing, protected Instructor redirect, and legacy Admin compatibility.'
  exit 0
fi

ops_require_command curl
work_dir="$(ops_make_temp_dir)"
trap 'ops_remove_temp_dir "$work_dir"' EXIT

health_status="$(curl --silent --show-error --output "${work_dir}/health.json" --write-out '%{http_code}' "${base_url}/api/health")"
[[ "$health_status" == '200' ]] || ops_die 'Production health endpoint did not return HTTP 200'
grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "${work_dir}/health.json" || ops_die 'Production health endpoint is not healthy'
grep -Eq '"database"[[:space:]]*:[[:space:]]*"ok"' "${work_dir}/health.json" || ops_die 'Production database health check is not healthy'

root_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "${base_url}/")"
[[ "$root_status" == '200' ]] || ops_die 'Public landing page did not return HTTP 200'

instructor_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-redirs 0 "${base_url}/instructor")"
[[ "$instructor_status" =~ ^30[2378]$ ]] || ops_die 'Anonymous Instructor entry did not redirect'

admin_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-redirs 0 "${base_url}/admin")"
[[ "$admin_status" =~ ^30[2378]$ ]] || ops_die 'Legacy Admin compatibility route did not redirect'

ops_log 'Unauthenticated production smoke checks passed.'
