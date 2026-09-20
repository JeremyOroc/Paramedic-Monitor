# Keep Wagami A language local to the Scenario device

Wagami A defaults to French but lets one Scenario device switch its interface and scripted clinical
prompts to English for the current Attempt, mirrored by that device's Spectator view. The choice
survives navigation, power cycles, and reloads, then resets on New Attempt or a new Room; it does
not modify instructor-confirmed clinical state or authored curriculum. This favors a shared
device's presentation preference over an Instructor-wide scenario language and requires localized
fixed event/report rendering without rewriting historical scenario data.
