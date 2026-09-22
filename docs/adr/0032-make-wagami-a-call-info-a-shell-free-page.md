# Make Wagami A Call Info a shell-free page

Wagami A's reopened Call Info uses the same page-filling, live Assignment dashboard workflow as
Wagami X rather than remaining in the inner display aperture. This is a deliberate exception to
ADR 0029's persistent-shell rule, which still governs A's other secondary destinations: the
larger, interactive dispatch surface outweighs continuous shell visibility for Call Info. Because
the shell's defibrillation controls are hidden on this page, A blocks entry during analysis,
charging, and charged states; clinical alarms continue and their active labels remain in the
page header. Wagami X's entry behavior is unchanged.
