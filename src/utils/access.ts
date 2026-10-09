import type { AppState, Gym } from '../../types';

/**
 * WHAT THIS ACCOUNT MAY SEE of external gyms, schools and cheer teams.
 *
 * The owner sees everything. A coach sees:
 *   • an external gym or school ONLY if the owner ticked "School Gym" on their profile
 *   • a cheer team ONLY if it is assigned to them (a sub-team follows its parent)
 *
 * The result feeds the logging screens, Management, Setup and the schedule, so an
 * organisation a coach has no access to also has no way to be logged against.
 * Pricing and pay screens keep using the full state, so a coach's past sessions
 * still add up even if their access is later removed.
 */
export function accessStateFor(state: AppState): AppState {
  if (state.profile.role === 'owner') return state;

  const gyms: Gym[] = state.gyms || [];
  const canExternal = !!state.profile.can_view_school_gyms;
  const cheerIds = state.profile.assigned_cheer_org_ids || [];
  const rootOf = (g: Gym) => (g.parent_gym_id ? gyms.find(x => x.id === g.parent_gym_id) || g : g);

  const allowed = gyms.filter(g => {
    const root = rootOf(g);
    return root.gym_type === 'cheer' ? cheerIds.includes(root.id) : canExternal;
  });
  const allowedIds = new Set(allowed.map(g => g.id));
  const allGymIds = new Set(gyms.map(g => g.id));

  return {
    ...state,
    gyms: allowed,
    // A timetable entry for an organisation the coach cannot see is hidden too, so
    // it cannot be used to start logging a session there.
    schedules: (state.schedules || []).filter(sc =>
      !(sc.class_ids || []).some(id => allGymIds.has(id) && !allowedIds.has(id)))
  };
}

/** Which kinds of session this account may log. */
export function loggingAccess(state: AppState): { tumbling: boolean; cheer: boolean; external: boolean } {
  const owner = state.profile.role === 'owner';
  const gyms: Gym[] = state.gyms || [];
  const typeOf = (g: Gym) => (g.parent_gym_id ? gyms.find(x => x.id === g.parent_gym_id) || g : g).gym_type;
  return {
    tumbling: owner || !!state.profile.can_view_tumbling,
    cheer: owner || gyms.some(g => typeOf(g) === 'cheer'),
    external: owner || gyms.some(g => typeOf(g) !== 'cheer')
  };
}
