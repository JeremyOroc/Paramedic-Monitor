#!/usr/bin/env bash

set -euo pipefail
umask 077

ops_die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

ops_log() {
  printf '[operations] %s\n' "$1"
}

ops_require_env() {
  local variable_name="$1"
  [[ -n "${!variable_name:-}" ]] || ops_die "Missing required environment variable: ${variable_name}"
}

ops_require_command() {
  command -v "$1" >/dev/null 2>&1 || ops_die "Required command is unavailable: $1"
}

ops_validate_project_ref() {
  [[ "$1" =~ ^[a-z0-9]{20}$ ]] || ops_die "Invalid Supabase project reference"
}

ops_validate_slug() {
  [[ "$1" =~ ^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$ ]] || ops_die "Invalid backup project slug"
}

ops_make_temp_dir() {
  local temp_base="${TMPDIR:-/tmp}"
  temp_base="${temp_base%/}"
  mktemp -d "${temp_base}/paramedic-monitor-ops.XXXXXX"
}

ops_remove_temp_dir() {
  local temp_dir="$1"
  local temp_base="${TMPDIR:-/tmp}"
  temp_base="${temp_base%/}"
  if [[ -n "$temp_dir" && "$temp_dir" == "${temp_base}/paramedic-monitor-ops."* && -d "$temp_dir" ]]; then
    rm -rf -- "$temp_dir"
  fi
}

ops_sha256() {
  local file_path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
    return
  fi
  ops_die 'Required checksum command is unavailable: sha256sum or shasum'
}

ops_verify_checksums() {
  local checksum_file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum --check "$checksum_file"
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 --check "$checksum_file"
    return
  fi
  ops_die 'Required checksum command is unavailable: sha256sum or shasum'
}

ops_manifest_value() {
  local manifest_path="$1"
  local key="$2"
  awk -F= -v wanted="$key" '$1 == wanted { print substr($0, index($0, "=") + 1); exit }' "$manifest_path"
}
