# Wagami A — active rolling UI updates handoff

**Authorized:** 2026-09-20

**Working branch:** `wagami-a-v2`

**Baseline commit:** `bd13ffc6f14befca696f440f9fb045d187c11af0`

**Baseline relationship:** the working branch, local `main`, and `origin/main` shared this commit
when this handoff was created.

## Authority

The programmer has authorized ongoing Wagami A UI experimentation and refinement on
`wagami-a-v2`. This is a rolling workstream, not a numbered phase. A clear UI request from the
programmer is enough authority to implement that batch: summarize the intended edits, resolve only
material ambiguity, then proceed. Completed and tested UI batches may be committed and pushed to
`origin/wagami-a-v2` without a separate phase or handoff approval.

This authorization covers layout, spacing, sizing, typography, color-token use, responsive fit,
visual states, accessibility, component composition, code-native shell/display styling, and
behavior-preserving UI refactors. Creative exploration is welcome; the implementation does not need
to follow a predetermined phase sequence.

Separate approval is required before changing clinical timing or guards, Supabase/data contracts,
production or release configuration, the default model, X/Z availability, tracked reference-asset
distribution, or merging/pushing this branch into `main`.

## Stable product boundaries

- Keep WAGAMI X and WAGAMI Z available; WAGAMI X remains the default unless explicitly changed.
- Keep Wagami A's six destinations and physical-style shell controls functional.
- French remains Wagami A's default device language, with English selectable.
- Use `WAGAMI_A_COLORS` and `--color-wagami-a-*`; do not substitute X/Z palette tokens.
- Preserve the current live Instructor, trainee, Spectator, projection, and report contracts unless
  a request explicitly expands beyond UI work.
- Treat physical-iPad acceptance and qualified distinctness/IP review as pre-public-release gates,
  not blockers to internal UI iteration.

## Working loop

1. Fetch and check out `origin/wagami-a-v2`; confirm `bd13ffc` is an ancestor and the checkout is
   clean before editing.
2. Read `AGENTS.md`, the Wagami A section of `PLAN.md`, the current top of `STATUS.md`, and the
   relevant component/tests. Read the applicable local Next.js 16.3 guide before framework work.
3. For a clear programmer request, state a short execution summary and implement it. Ask only when
   ambiguity would materially change behavior or leave the authorized UI boundary.
4. Add or update proportionate component/interaction tests. Run focused Vitest, TypeScript,
   affected-file ESLint, rendered QA at relevant supported landscape sizes, and the production build
   when the batch affects shared layout, routing, configuration, or integration.
5. Record meaningful requirement changes in `PLAN.md`, completed work in `STATUS.md`, and a new top
   entry in `CHANGELOG.md`.
6. Commit using the repository format and push the completed batch to `origin/wagami-a-v2`.

## Copy-ready prompt

```text
Continue Wagami A UI work in the Paramedic Monitor repository on branch wagami-a-v2. Read AGENTS.md
and docs/handoff/wagami-a-ui-updates.md, then inspect the relevant Wagami A plan/status entries,
components, and tests. The rolling UI workstream is already authorized: for a clear UI request,
briefly summarize the edits and proceed without creating a numbered phase or asking for duplicate
approval. Freely refine the Wagami A visual interface while preserving its stable functional
contracts and the separate X/Z models. Add proportionate tests and rendered QA, update PLAN.md when
requirements materially change, update STATUS.md and add a top CHANGELOG.md entry when the batch is
complete, then commit and push the tested work to origin/wagami-a-v2. Ask before clinical, database,
production/release, model-default/availability, X/Z-removal, reference-asset-distribution, or main-
merge changes.
```
