---
status: accepted
---

# Reproduce trainee monitors from semantic projections

The Instructor Spectator view reproduces a trainee's complete simulator presentation from a participant-specific Trainee monitor projection rather than streaming captured pixels or replaying evaluation events. A semantic projection can cover dispatch, device, local interaction, and timed-progress state while remaining host-authorized, read-only, testable, and independent of browser chrome or device screen-capture permission; literal streaming would create a materially different privacy and infrastructure boundary, while the existing sparse action log cannot reconstruct what the trainee currently sees.

## Consequences

- Trainee-visible local state that is currently held in component hooks must gain an explicit projection contract.
- The Spectator renderer must consume that projection without hydrating or mutating the Instructor Console's persisted monitor store.
- Exact browser pixels, cursor/finger location, and waveform sweep phase are outside the fidelity contract; semantic clinical values, surfaces, transitions, and timer phases are inside it.
