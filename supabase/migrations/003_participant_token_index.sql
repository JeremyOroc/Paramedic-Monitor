-- Participant lookups now go through the deterministic token hash
-- (join resume, event auth, and the presence heartbeat on every poll).
create index if not exists participants_token_hash_idx
  on participants (token_hash);
