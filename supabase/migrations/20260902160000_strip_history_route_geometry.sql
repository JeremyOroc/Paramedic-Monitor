-- Phase 13f -- the evaluation record stores what the instructor sent and what
-- the trainee pressed. The route polyline is neither: it is what the map drew
-- from an origin and a destination, and nothing ever reads it back from
-- history. It was 86% of everything stored there. `updateSessionState` now
-- strips it on write; this clears it from the rows written before that.
--
-- The live session_state row is untouched -- the trainee's map is drawn from it.
update session_state_history
   set state = jsonb_set(state, '{dispatchRouteConfirmed,geometry}', '[]'::jsonb)
 where jsonb_typeof(state #> '{dispatchRouteConfirmed,geometry}') = 'array'
   and jsonb_array_length(state #> '{dispatchRouteConfirmed,geometry}') > 0;
