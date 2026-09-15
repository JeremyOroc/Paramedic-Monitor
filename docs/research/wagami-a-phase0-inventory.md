# Wagami A Phase 0 — Repository Asset and Reference Inventory

This is a read-only provenance inventory for design planning, not an IP clearance or a conclusion
that any asset is infringing. No assets were removed or replaced.

## Reference material in the repository

- `screenshots/1.png`–`17.png` and `screenshots/SCREENSHOTS_SUMMARY.md` are tracked in Git and
  explicitly describe ZOLL X Series photographs.
- `screenshots/wagami-z-video/frame-*.png` and two Wagami Z concept PNGs are present locally but
  ignored by Git. `docs/research/wagami-z-defibrillation-video.md` records a source-video link and
  timestamps; `docs/design/wagami-z-layout-spec.md` records reference-derived measurements.
- Wagami X and Z shells are code-native in `DeviceShell.tsx`, `WagamiZDevice.tsx`,
  `WagamiZScreen.tsx`, and `globals.css`; historical `PLAN.md` sections state screenshot/pixel
  matching as their original goals.

## Assets served from `public/` or shipped in app source

- `public/images/*-strip.*` raster ECG strips are used by `TwelveLeadPrintout.tsx`.
- `public/audio/*` contains clinical alarm, defibrillation, CPR, and UI cue files, plus character-
  named files whose playback paths are currently commented out.
- `public/videos/*` includes tracked character-named media and `compression-cpr.mov`.
- `public/logo.png` and `src/app/icon.png` are matching Star-of-Life raster images; instructor
  patient-physical graphics are also supplied raster assets.

## Provenance gap and next decisions

The status/changelog call several strips, icons, sounds, and videos “supplied” or “provided,” but
no per-asset license, permission, source, or ownership record was found in the repository. That
absence does not establish that the files lack permission. Before A reuses any of them, record
their provenance or choose original replacements. Decide separately whether tracked ZOLL reference
photos and other supplied assets belong in the eventual distributable repository; do not delete
the retained Wagami X/Z models by assumption.
