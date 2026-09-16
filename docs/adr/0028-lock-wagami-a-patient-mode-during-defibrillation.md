# Lock Wagami A Patient mode during active defibrillation

Wagami A's shell Patient mode control is disabled from Analyze or Charge start through shock
delivery or cancellation, including shock-ready states. Unlike Wagami X's current mode action,
this prevents a late category change from silently changing pending shock energy; the disabled
control must communicate the guard while preserving the current clinical process and leaving
X/Z behavior unchanged.
