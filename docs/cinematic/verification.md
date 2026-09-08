# Opening cinematic — implementation verification

Date: 2026-09-08. Branch: `phase/2-opening-cinematic`. Local implementation only; not deployed.

## Automated checks

- 34 focused tests pass across OpeningCinematic, LandingExperience, LandingRoute, SessionLandingPage,
  artwork preloading, and CinematicAudio. This includes 32 new tests and the two existing landing tests.
- Coverage includes mandatory first strike, all three skip keys, pointer/replay skip, exact title
  strings, decorative artwork, polite announcement, inert controls, manual versus timed focus,
  preserved form values, browser-cache restoration, dev=1/2 bypasses, reduced motion and live preference
  changes, late image resolution, 1.2-second preload ceiling, decode failure, unmount/hidden cleanup,
  denied autoplay, dropped late audio cues, independent mute, fade-out, grunt playback trim, full title,
  fetch/decode errors, absent Web Audio, and audio disposal.
- Final full Vitest run: **1,323 passed, 2 failed, 1 skipped**, across 153 files. Both failures are in
  the unchanged `src/server/sessions/__tests__/roomOwnership.test.ts`: the fixed fixture expires at
  `2026-09-08T12:00:00.000Z`, before this run, so it no longer represents the active Room those tests
  expect. The same two failures reproduce in isolation. No session-service code was changed.
- A spectator status assertion failed on the first full run, then passed both the isolated rerun and
  final full run. It is unrelated to the root-route cinematic and was left unchanged.
- TypeScript (`tsc --noEmit`) passes.
- ESLint (`eslint src`) reports zero errors and the same 12 pre-existing warnings in unrelated files.
- `next build --webpack` passes, including type checking and static generation of the root route.
  Default Turbopack build fails before compilation because its CSS worker cannot bind a local port
  (`Operation not permitted`), including an escalated retry. The repository build script is unchanged.
- `git diff --check` passes.

## Rendered browser checks

Used the CUA in-app browser's supported Playwright surface on the existing `http://localhost:3000/`
development server. A standalone Browser plugin and local Playwright package were unavailable; no
dependency was installed. Viewport overrides were reset afterward.

- Inspected generated wind-up and arms-wide apex compositing and the molten split-title reveal.
- At 900 × 700, both title halves fit and remain legible with the character behind them.
- At 1280 × 800, DOM bounds confirm titles fit the viewport and all character images decode.
- At 1024 × 768, verified landscape sizing with no document horizontal overflow and working replay
  controls. This is viewport coverage, **not** physical iPad/Safari certification.
- At 390 × 844, visually inspected the tighter character crop and two-line subtitle. Both titles fit
  their halves; document width remains 390 pixels, without monitor minimum-width inheritance.
- Refresh and the sign-in page's client-side Return to room access link visibly restart the overlay.
- Browser Back returns to the working landing page; the automation's navigation wait outlasted the
  cinematic, so the exact Back replay moment is covered by restoration tests rather than claimed as
  a captured browser observation.
- Immediate replay Skip reveals the original Room-access interface and focuses Room code.
- Instructor sign-in remains outside the cinematic route. The dev-mode link opens the monitor
  directly without the cinematic.
- No warning/error console entries were captured during the cinematic/landing checks.

## Remaining release checks

- Listen on the intended physical devices to confirm subjective voice/grunt balance and perceived
  synchronization. Audio scheduling, blocked playback, decoding errors and cleanup have automated
  coverage; audible playback was not independently listened to through this browser tool.
- Verify actual Safari/iPad behavior, including a fresh autoplay-blocked visit, Replay with sound,
  OS reduced-motion preference, and browser Back/bfcache. No device-level result is implied above.
- Public-use provenance follows ADR 0019. The product owner is responsible for permission to publish
  the recognizable character and supplied recordings.

## Reproduction

```sh
npm run test:run
npx tsc --noEmit
npx eslint src
npx next build --webpack
npm run dev
```

Open `/`, then use Replay with sound. Refresh to test the initial mandatory strike; replay itself is
immediately skippable. `/instructor/login` and `/?dev=1` must remain outside the cinematic.
