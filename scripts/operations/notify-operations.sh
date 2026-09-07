#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

ops_require_env OPS_ALERT_SMTP_URL
ops_require_env OPS_ALERT_SMTP_USERNAME
ops_require_env OPS_ALERT_SMTP_PASSWORD
ops_require_env OPS_ALERT_FROM
ops_require_env OPS_ALERT_TO
ops_require_env OPS_EVENT_CODE

[[ "$OPS_ALERT_SMTP_URL" == smtp://* || "$OPS_ALERT_SMTP_URL" == smtps://* ]] || ops_die 'OPS_ALERT_SMTP_URL must use smtp:// or smtps://'
[[ "$OPS_EVENT_CODE" =~ ^[a-z0-9_:-]{3,80}$ ]] || ops_die 'OPS_EVENT_CODE is not sanitized'
[[ "$OPS_ALERT_FROM" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || ops_die 'OPS_ALERT_FROM is not a valid email address'

IFS=',' read -r -a raw_recipients <<< "$OPS_ALERT_TO"
recipients=()
for raw_recipient in "${raw_recipients[@]}"; do
  recipient="${raw_recipient//[[:space:]]/}"
  [[ "$recipient" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || ops_die 'OPS_ALERT_TO contains an invalid email address'
  recipients+=("$recipient")
done
[[ "${#recipients[@]}" -ge 2 ]] || ops_die 'OPS_ALERT_TO must contain at least two developer recipients'

to_header=""
for recipient in "${recipients[@]}"; do
  if [[ -n "$to_header" ]]; then
    to_header="${to_header}, ${recipient}"
  else
    to_header="$recipient"
  fi
done

if [[ "${OPS_ALERT_DRY_RUN:-false}" == 'true' ]]; then
  ops_log "Dry run: send sanitized event ${OPS_EVENT_CODE} to ${#recipients[@]} developer recipients."
  exit 0
fi

ops_require_command curl
work_dir="$(ops_make_temp_dir)"
trap 'ops_remove_temp_dir "$work_dir"' EXIT

run_url="${OPS_RUN_URL:-unavailable}"
[[ "$run_url" == 'unavailable' || "$run_url" == https://* ]] || ops_die 'OPS_RUN_URL must be an HTTPS URL'

{
  printf 'From: %s\r\n' "$OPS_ALERT_FROM"
  printf 'To: %s\r\n' "$to_header"
  printf 'Subject: [Paramedic Monitor] Operational failure: %s\r\n' "$OPS_EVENT_CODE"
  printf 'Content-Type: text/plain; charset=UTF-8\r\n'
  printf '\r\n'
  printf 'A sanitized operational failure was recorded.\r\n'
  printf 'Event: %s\r\n' "$OPS_EVENT_CODE"
  printf 'Run: %s\r\n' "$run_url"
  printf 'No Account, Student, report, invitation, or credential data is included.\r\n'
} > "${work_dir}/message.txt"

curl_args=(
  --silent
  --show-error
  --fail
  --ssl-reqd
  --url "$OPS_ALERT_SMTP_URL"
  --user "${OPS_ALERT_SMTP_USERNAME}:${OPS_ALERT_SMTP_PASSWORD}"
  --mail-from "$OPS_ALERT_FROM"
)
for recipient in "${recipients[@]}"; do
  curl_args+=(--mail-rcpt "$recipient")
done
curl "${curl_args[@]}" --upload-file "${work_dir}/message.txt"

ops_log "Operational alert sent to ${#recipients[@]} developer recipients."
