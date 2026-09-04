---
status: accepted
---

# Authorize Instructor Rooms through Account ownership

Each Room belongs to the Instructor Account that creates it, and authenticated ownership becomes the
authority for opening and controlling its Instructor Console. This replaces private host-token URLs
as the permanent model so an Instructor can safely refresh or reopen their own Room, while trainees
continue joining with only a Room code and nickname.

## Consequences

- Instructor Room operations must verify the authenticated owner rather than possession of a URL
  token.
- One Account may own only one non-ended Room, and only one signed-in device controls it at a time.
- The initial rollout expires active legacy Rooms rather than retaining host tokens as a second
  authorization path.
