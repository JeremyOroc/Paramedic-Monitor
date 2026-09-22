---
status: accepted
---

# Use the shared timer to select Fused vital input semantics

The Instructor Console will expose one numeric Fused vital input per vital rather than separate
direct-value and Trend-target inputs. A blank or zero shared duration makes a sent value immediate;
a positive duration makes it an absolute Trend target. This was chosen to reduce duplicate controls
and make all numeric vitals follow one visible timer-selected delivery mode.

## Consequences

- One Send can no longer first jump a vital to one value and then trend it toward a different value;
  that workflow requires two Sends.
- A newly sent timed instruction rebuilds applicable participation from live Send-time values, while
  unrelated Sends never restart the consumed instruction.
- Existing scenarios with separate Trend targets require a compatibility projection into the Fused
  vital inputs, and the retained duration must be disarmed after completion or a no-op Send.
