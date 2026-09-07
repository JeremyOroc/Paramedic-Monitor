#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

ops_require_env SUPABASE_DB_URL
ops_require_env PRODUCTION_PROJECT_REF
ops_require_env BACKUP_PROJECT_SLUG
ops_require_env BACKUP_AGE_RECIPIENT
ops_require_env BACKUP_RCLONE_REMOTE

ops_validate_project_ref "$PRODUCTION_PROJECT_REF"
ops_validate_slug "$BACKUP_PROJECT_SLUG"
[[ "$SUPABASE_DB_URL" == *"$PRODUCTION_PROJECT_REF"* ]] || ops_die 'Backup database URL does not match PRODUCTION_PROJECT_REF'
[[ "$BACKUP_RCLONE_REMOTE" =~ ^[A-Za-z0-9._-]+:.+ ]] || ops_die 'BACKUP_RCLONE_REMOTE must name an rclone remote and path'

if [[ "${BACKUP_DRY_RUN:-false}" == 'true' ]]; then
  ops_log 'Dry run: validate source, export roles/schema/data, verify Auth and ownership content, checksum, encrypt, upload, rotate 30 daily/12 monthly copies, then purge expired audits.'
  exit 0
fi

ops_require_command supabase
ops_require_command psql
ops_require_command age
ops_require_command rclone
ops_require_command tar

work_dir="$(ops_make_temp_dir)"
trap 'ops_remove_temp_dir "$work_dir"' EXIT

created_at="${BACKUP_CREATED_AT:-$(date -u +%Y-%m-%dT%H%M%SZ)}"
[[ "$created_at" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z$ ]] || ops_die 'BACKUP_CREATED_AT must use YYYY-MM-DDTHHMMSSZ'
day="${created_at:0:10}"
month="${created_at:0:7}"
archive_name="${BACKUP_PROJECT_SLUG}-${created_at}.tar.gz"

query_count() {
  local relation="$1"
  local result
  result="$(psql --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --dbname "$SUPABASE_DB_URL" --command "select count(*) from ${relation};")"
  result="${result//[[:space:]]/}"
  [[ "$result" =~ ^[0-9]+$ ]] || ops_die "Unable to verify required relation: ${relation}"
  printf '%s' "$result"
}

ops_log 'Exporting protected production database content.'
supabase db dump --db-url "$SUPABASE_DB_URL" --file "${work_dir}/roles.sql" --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" --file "${work_dir}/schema.sql"
supabase db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "${work_dir}/data.sql" \
  --use-copy \
  --data-only \
  --exclude storage.buckets_vectors \
  --exclude storage.vector_indexes

for required_file in roles.sql schema.sql data.sql; do
  [[ -s "${work_dir}/${required_file}" ]] || ops_die "Backup export is empty: ${required_file}"
done

grep -Eq 'COPY "auth"\."users"|INSERT INTO "auth"\."users"' "${work_dir}/data.sql" || ops_die 'Data export does not contain Auth identities'
grep -Eq 'COPY "public"\."account_profiles"|INSERT INTO "public"\."account_profiles"' "${work_dir}/data.sql" || ops_die 'Data export does not contain Account ownership mappings'
grep -Eq 'CREATE TABLE( IF NOT EXISTS)? "public"\."account_profiles"' "${work_dir}/schema.sql" || ops_die 'Schema export does not contain Account profiles'

auth_users="$(query_count 'auth.users')"
account_profiles="$(query_count 'public.account_profiles')"
saved_scenarios="$(query_count 'public.saved_scenarios')"
evaluation_reports="$(query_count 'public.evaluation_reports')"

{
  printf 'format_version=1\n'
  printf 'created_at=%s\n' "$created_at"
  printf 'project_slug=%s\n' "$BACKUP_PROJECT_SLUG"
  printf 'project_ref=%s\n' "$PRODUCTION_PROJECT_REF"
  printf 'auth_users=%s\n' "$auth_users"
  printf 'account_profiles=%s\n' "$account_profiles"
  printf 'saved_scenarios=%s\n' "$saved_scenarios"
  printf 'evaluation_reports=%s\n' "$evaluation_reports"
} > "${work_dir}/manifest.txt"

: > "${work_dir}/SHA256SUMS"
for required_file in roles.sql schema.sql data.sql manifest.txt; do
  printf '%s  %s\n' "$(ops_sha256 "${work_dir}/${required_file}")" "$required_file" >> "${work_dir}/SHA256SUMS"
done

tar -C "$work_dir" -czf "${work_dir}/${archive_name}" roles.sql schema.sql data.sql manifest.txt SHA256SUMS
age --encrypt \
  --recipient "$BACKUP_AGE_RECIPIENT" \
  --output "${work_dir}/${archive_name}.age" \
  "${work_dir}/${archive_name}"

[[ -s "${work_dir}/${archive_name}.age" ]] || ops_die 'Encrypted backup was not created'
rm -- "${work_dir}/${archive_name}"

daily_remote="${BACKUP_RCLONE_REMOTE%/}/daily"
monthly_remote="${BACKUP_RCLONE_REMOTE%/}/monthly"
ops_log 'Uploading encrypted backup.'
rclone copyto "${work_dir}/${archive_name}.age" "${daily_remote}/${archive_name}.age"

monthly_name="${BACKUP_PROJECT_SLUG}-${month}.tar.gz.age"
if ! rclone lsf "$monthly_remote" --files-only 2>/dev/null | grep -Fxq "$monthly_name"; then
  rclone copyto "${work_dir}/${archive_name}.age" "${monthly_remote}/${monthly_name}"
fi

prune_remote() {
  local remote_path="$1"
  local keep_count="$2"
  local name_pattern="$3"
  local inventory_file="${work_dir}/remote-inventory.txt"
  local candidates_file="${work_dir}/prune-candidates.txt"

  rclone lsf "$remote_path" --files-only 2>/dev/null | LC_ALL=C sort -r > "$inventory_file"
  while IFS= read -r candidate; do
    [[ -z "$candidate" ]] && continue
    [[ "$candidate" =~ $name_pattern ]] || ops_die 'Refusing to rotate a remote path containing an unexpected filename'
  done < "$inventory_file"

  awk -v keep="$keep_count" 'NR > keep' "$inventory_file" > "$candidates_file"
  while IFS= read -r candidate; do
    [[ -z "$candidate" ]] && continue
    rclone deletefile "${remote_path}/${candidate}"
  done < "$candidates_file"
}

prune_remote "$daily_remote" 30 "^${BACKUP_PROJECT_SLUG}-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z\\.tar\\.gz\\.age$"
prune_remote "$monthly_remote" 12 "^${BACKUP_PROJECT_SLUG}-[0-9]{4}-[0-9]{2}\\.tar\\.gz\\.age$"

if [[ "${BACKUP_PURGE_AUDITS:-true}" == 'true' ]]; then
  ops_log 'Purging audit rows beyond the approved one-year retention floor.'
  psql \
    --no-psqlrc \
    --quiet \
    --tuples-only \
    --set ON_ERROR_STOP=1 \
    --dbname "$SUPABASE_DB_URL" \
    --command "select private.purge_account_audits(now() - interval '1 year');" >/dev/null
fi

ops_log "Backup completed: ${archive_name}.age (${auth_users} Auth identities, ${account_profiles} Account profiles)."
