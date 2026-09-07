#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

ops_require_env RESTORE_SOURCE_FILE
ops_require_env RESTORE_AGE_IDENTITY_FILE
ops_require_env RESTORE_TARGET_DB_URL
ops_require_env RESTORE_TARGET_PROJECT_REF
ops_require_env PRODUCTION_PROJECT_REF
ops_require_env RESTORE_CONFIRMATION

ops_validate_project_ref "$RESTORE_TARGET_PROJECT_REF"
ops_validate_project_ref "$PRODUCTION_PROJECT_REF"
[[ "$RESTORE_TARGET_PROJECT_REF" != "$PRODUCTION_PROJECT_REF" ]] || ops_die 'Refusing to restore into the production project'
[[ "$RESTORE_CONFIRMATION" == 'RESTORE_NON_PRODUCTION' ]] || ops_die 'RESTORE_CONFIRMATION must equal RESTORE_NON_PRODUCTION'
[[ "$RESTORE_TARGET_DB_URL" == *"$RESTORE_TARGET_PROJECT_REF"* ]] || ops_die 'Restore target URL does not match RESTORE_TARGET_PROJECT_REF'
[[ "$RESTORE_TARGET_DB_URL" != *"$PRODUCTION_PROJECT_REF"* ]] || ops_die 'Refusing a database URL that references production'

if [[ "${RESTORE_DRY_RUN:-false}" == 'true' ]]; then
  ops_log 'Dry run: decrypt and verify the selected archive, restore only to the confirmed non-production project, compare protected row counts, and write rehearsal evidence.'
  exit 0
fi

ops_require_env RESTORE_EVIDENCE_FILE
ops_require_command age
ops_require_command tar
ops_require_command psql

[[ -f "$RESTORE_SOURCE_FILE" && "$RESTORE_SOURCE_FILE" == *.age ]] || ops_die 'RESTORE_SOURCE_FILE must be an existing .age backup'
[[ -f "$RESTORE_AGE_IDENTITY_FILE" ]] || ops_die 'RESTORE_AGE_IDENTITY_FILE does not exist'
[[ ! -e "$RESTORE_EVIDENCE_FILE" ]] || ops_die 'RESTORE_EVIDENCE_FILE already exists'

work_dir="$(ops_make_temp_dir)"
trap 'ops_remove_temp_dir "$work_dir"' EXIT

ops_log 'Decrypting the selected backup into protected temporary storage.'
age --decrypt \
  --identity "$RESTORE_AGE_IDENTITY_FILE" \
  --output "${work_dir}/backup.tar.gz" \
  "$RESTORE_SOURCE_FILE"
mkdir "${work_dir}/contents"
tar -tzf "${work_dir}/backup.tar.gz" | LC_ALL=C sort > "${work_dir}/archive-entries.txt"
printf '%s\n' SHA256SUMS data.sql manifest.txt roles.sql schema.sql > "${work_dir}/expected-entries.txt"
cmp -s "${work_dir}/archive-entries.txt" "${work_dir}/expected-entries.txt" || ops_die 'Restore archive contains unexpected or missing paths'
tar -C "${work_dir}/contents" -xzf "${work_dir}/backup.tar.gz" roles.sql schema.sql data.sql manifest.txt SHA256SUMS

for required_file in roles.sql schema.sql data.sql manifest.txt SHA256SUMS; do
  [[ -s "${work_dir}/contents/${required_file}" ]] || ops_die "Restore archive is missing: ${required_file}"
done

(
  cd "${work_dir}/contents"
  ops_verify_checksums SHA256SUMS
)

manifest="${work_dir}/contents/manifest.txt"
[[ "$(ops_manifest_value "$manifest" format_version)" == '1' ]] || ops_die 'Unsupported backup format version'
[[ "$(ops_manifest_value "$manifest" project_ref)" == "$PRODUCTION_PROJECT_REF" ]] || ops_die 'Backup manifest does not match the production project reference'

for count_key in auth_users account_profiles saved_scenarios evaluation_reports; do
  count_value="$(ops_manifest_value "$manifest" "$count_key")"
  [[ "$count_value" =~ ^[0-9]+$ ]] || ops_die "Invalid manifest count: ${count_key}"
done

ops_log 'Restoring into the confirmed non-production rehearsal project.'
psql \
  --no-psqlrc \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "${work_dir}/contents/roles.sql" \
  --file "${work_dir}/contents/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "${work_dir}/contents/data.sql" \
  --dbname "$RESTORE_TARGET_DB_URL"

query_target_count() {
  local relation="$1"
  local result
  result="$(psql --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --dbname "$RESTORE_TARGET_DB_URL" --command "select count(*) from ${relation};")"
  result="${result//[[:space:]]/}"
  [[ "$result" =~ ^[0-9]+$ ]] || ops_die "Unable to verify restored relation: ${relation}"
  printf '%s' "$result"
}

verify_count() {
  local key="$1"
  local relation="$2"
  local expected actual
  expected="$(ops_manifest_value "$manifest" "$key")"
  actual="$(query_target_count "$relation")"
  [[ "$actual" == "$expected" ]] || ops_die "Restored count mismatch for ${relation}"
  printf '%s' "$actual"
}

auth_users="$(verify_count auth_users auth.users)"
account_profiles="$(verify_count account_profiles public.account_profiles)"
saved_scenarios="$(verify_count saved_scenarios public.saved_scenarios)"
evaluation_reports="$(verify_count evaluation_reports public.evaluation_reports)"

evidence_dir="$(dirname -- "$RESTORE_EVIDENCE_FILE")"
[[ -d "$evidence_dir" ]] || ops_die 'RESTORE_EVIDENCE_FILE parent directory does not exist'
{
  printf 'restore_rehearsal=passed\n'
  printf 'completed_at=%s\n' "$(date -u +%Y-%m-%dT%H%M%SZ)"
  printf 'source_created_at=%s\n' "$(ops_manifest_value "$manifest" created_at)"
  printf 'target_project_ref=%s\n' "$RESTORE_TARGET_PROJECT_REF"
  printf 'auth_users=%s\n' "$auth_users"
  printf 'account_profiles=%s\n' "$account_profiles"
  printf 'saved_scenarios=%s\n' "$saved_scenarios"
  printf 'evaluation_reports=%s\n' "$evaluation_reports"
} > "$RESTORE_EVIDENCE_FILE"
chmod 600 "$RESTORE_EVIDENCE_FILE"

ops_log "Restore rehearsal passed; evidence written to the requested protected path."
