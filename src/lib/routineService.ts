import supabase from './supabaseClient';
import { sessionUser } from './sessionUser';
import { readCache, invalidateHabitData } from './dataCache';
import { loadHabitRows, loadActivity } from './habitData';
import {
  Activity,
  Context,
  Routine,
  Proposal,
  analyze,
  localDate,
  monday,
  redesign,
  shiftDate,
} from './routineEngine';

export interface SavedProposal extends Proposal {
  id: string;
  week_start: string;
  status: 'pending' | 'accepted' | 'rejected';
}
export async function currentUserId() {
  return (await sessionUser()).id;
}
export async function loadRoutineData(day = localDate(), force = false) {
  const id = await currentUserId();
  return readCache(
    id,
    'routine:' + day,
    async () => {
      const start = shiftDate(monday(day), -7);
      const [habits, logs, contextResult] = await Promise.all([
        loadHabitRows(id, force),
        loadActivity(id, day, force),
        supabase
          .from('daily_contexts')
          .select('energy,minutes')
          .eq('user_id', id)
          .eq('day', day)
          .maybeSingle(),
      ]);
      if (contextResult.error) throw contextResult.error;
      return {
        habits,
        logs,
        context: contextResult.data as Context | null,
        start,
        recent: analyze(habits, logs, shiftDate(day, -7), shiftDate(day, -1)),
        weekly: analyze(habits, logs, start, shiftDate(monday(day), -1)),
      };
    },
    force,
  );
}
export async function saveContext(context: Context, day = localDate()) {
  const user_id = await currentUserId();
  const { error } = await supabase.from('daily_contexts').upsert({ user_id, day, ...context });
  if (error) throw error;
  invalidateHabitData();
}
export async function weeklyProposals(
  data: Awaited<ReturnType<typeof loadRoutineData>>,
  day = localDate(),
  force = false,
) {
  const user_id = await currentUserId();
  return readCache(
    user_id,
    'proposals:' + day,
    async () => {
      const week_start = monday(day);
      const { data: existing, error } = await supabase
        .from('routine_proposals')
        .select('*')
        .eq('user_id', user_id)
        .eq('week_start', week_start)
        .order('created_at');
      if (error) throw error;
      const seen = new Set((existing || []).map((p) => p.habit_id));
      const proposed = redesign(data.habits, data.weekly).filter((p) => !seen.has(p.habit_id));
      const activeIds = new Set(data.habits.map((habit) => habit.id));
      if (!proposed.length)
        return (existing || []).filter((p) => activeIds.has(p.habit_id)) as SavedProposal[];
      if (proposed.length) {
        const { error: insertError } = await supabase.from('routine_proposals').upsert(
          proposed.map((p) => ({ ...p, user_id, week_start })),
          { onConflict: 'user_id,habit_id,week_start', ignoreDuplicates: true },
        );
        if (insertError) throw insertError;
      }
      const { data: saved, error: readError } = await supabase
        .from('routine_proposals')
        .select('*')
        .eq('user_id', user_id)
        .eq('week_start', week_start)
        .order('created_at');
      if (readError) throw readError;
      return (saved || []).filter((proposal) =>
        activeIds.has(proposal.habit_id),
      ) as SavedProposal[];
    },
    force,
  );
}
export async function decideProposal(id: string, accept: boolean) {
  const { error } = await supabase.rpc('decide_routine_proposal', {
    proposal_id: id,
    accept_change: accept,
  });
  if (error) throw error;
  invalidateHabitData();
}
