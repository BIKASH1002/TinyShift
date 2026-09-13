import { userMessage } from '../lib/userMessage';
import React, { useEffect, useRef, useState } from 'react';
import { useRefreshSignal } from '../lib/useRefreshSignal';
import {
  Context,
  dailyPlan,
  localDate,
  reasonLabels,
  shiftDate,
  monday,
} from '../lib/routineEngine';
import {
  SavedProposal,
  decideProposal,
  loadRoutineData,
  saveContext,
  weeklyProposals,
} from '../lib/routineService';
import { deleteHabit, markHabitDone, undoHabitLog } from '../lib/habitService';
import { AIAdjustmentPanel } from '../components/AIAdjustmentPanel';
import { ReminderInbox } from '../components/ReminderInbox';
import {
  Button,
  IconButton,
  EmptyState,
  LoadingState,
  PageHeader,
  displayDate,
} from '../components/ui';
import { Check, Plus, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { SelectField } from '../components/SelectField';
import { peekCache } from '../lib/dataCache';

interface Props {
  view: 'today' | 'weekly';
  onChanged: () => Promise<void>;
  onRescue: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onWeekly: () => void;
}
type Data = Awaited<ReturnType<typeof loadRoutineData>>;
const panel = 'surface space-y-3';
const primary = 'button button--primary';
const secondary = 'button button--secondary';
const message = userMessage;

export const AdaptiveScreen: React.FC<Props> = ({
  view,
  onChanged,
  onRescue,
  onAdd,
  onEdit,
  onWeekly,
}) => {
  const [data, setData] = useState<Data | null>(
    () => peekCache<Data>('routine:' + localDate()) || null,
  );
  const [proposals, setProposals] = useState<SavedProposal[]>(
    () => peekCache<SavedProposal[]>('proposals:' + localDate()) || [],
  );
  const [context, setContext] = useState<Context>(
    () => peekCache<Data>('routine:' + localDate())?.context || { energy: 'steady', minutes: 30 },
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(() => !peekCache('routine:' + localDate()));
  const [preparing, setPreparing] = useState(false);
  const [day, setDay] = useState(localDate());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const contextDirty = useRef(false);
  const loadVersion = useRef(0);
  const refreshSignal = useRefreshSignal(!busy && !contextDirty.current);

  async function refresh(force = false) {
    const next = await loadRoutineData(day, force);
    setData(next);
    contextDirty.current = false;
    setContext(next.context || { energy: 'steady', minutes: 30 });
    if (view === 'weekly') setProposals(await weeklyProposals(next, day, force));
  }
  useEffect(() => {
    let alive = true;
    const version = ++loadVersion.current;
    const current = () => alive && version === loadVersion.current;
    const cached = peekCache<Data>('routine:' + day);
    setData(cached || null);
    setBusy(!cached);
    setPreparing(view === 'weekly');
    setError('');
    loadRoutineData(day)
      .then(async (next) => {
        if (!current()) return;
        setData(next);
        if (!contextDirty.current) setContext(next.context || { energy: 'steady', minutes: 30 });
        setBusy(false);
        if (view === 'weekly') {
          const proposals = await weeklyProposals(next, day);
          if (current()) setProposals(proposals);
        }
      })
      .catch((e) => {
        if (current()) setError(message(e));
      })
      .finally(() => {
        if (current()) {
          setBusy(false);
          setPreparing(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [day, view, refreshSignal]);
  useEffect(() => {
    const tick = () => setDay(localDate());
    const timer = window.setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, []);
  async function act(action: () => Promise<void>, success: string) {
    loadVersion.current++;
    setPreparing(false);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await Promise.all([refresh(), onChanged()]);
      setNotice(success);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const plan = data
    ? dailyPlan(data.habits, data.recent, data.context || { energy: 'steady', minutes: 30 }, day)
    : [];
  const completed = plan.filter((item) =>
    data?.logs.some(
      (l) => l.habit_id === item.habit.id && l.log_date === day && l.status === 'done',
    ),
  ).length;
  return (
    <div className="page page--tab">
      <PageHeader
        editorial
        eyebrow={view === 'today' ? displayDate(day) : 'Learn from your week'}
        introKey={view === 'today' ? 'today-welcome' : undefined}
        title={view === 'today' ? 'A little progress, your way.' : 'Find what works for you.'}
        description={
          view === 'today'
            ? 'Make room for the habits that matter. A tiny step counts, too.'
            : `Your activity from ${displayDate(shiftDate(monday(day), -7))} to ${displayDate(shiftDate(monday(day), -1))}.`
        }
        action={
          view === 'today' && (
            <Button variant="secondary" disabled={busy} onClick={onAdd}>
              <Plus size={17} aria-hidden="true" />
              New habit
            </Button>
          )
        }
      />
      {error && (
        <div role="alert" className="bg-red-50 text-red-800 rounded-xl p-3 text-sm">
          {error}
          <button
            disabled={busy}
            className="block underline mt-2"
            onClick={() => act(() => refresh(true), 'Reloaded.')}
          >
            Retry loading
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm">
          {notice}
        </p>
      )}
      {busy && !data && <LoadingState />}
      {busy && data && <p role="status">Updating your routine…</p>}
      {view === 'today' && (
        <>
          <ReminderInbox onWeekly={onWeekly} />
          <details className="daily-context">
            <summary>
              <span>
                <span className="context-title">What fits today?</span>
                <span className="context-summary">
                  {data?.context?.energy || 'steady'} energy · {data?.context?.minutes ?? 30}{' '}
                  minutes available
                </span>
              </span>
              <span className="context-edit">Adjust pace</span>
            </summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(() => saveContext(context, day), 'Your daily plan is updated.');
              }}
            >
              <div className="context-controls">
                <SelectField
                  label="Energy"
                  disabled={busy}
                  value={context.energy}
                  onChange={(value) => {
                    contextDirty.current = true;
                    setContext({ ...context, energy: value as Context['energy'] });
                  }}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'steady', label: 'Steady' },
                    { value: 'high', label: 'High' },
                  ]}
                />
                <SelectField
                  label="Time available for your routine"
                  disabled={busy}
                  value={String(context.minutes)}
                  onChange={(value) => {
                    contextDirty.current = true;
                    setContext({ ...context, minutes: Number(value) });
                  }}
                  options={[5, 10, 30, 60].map((n) => ({
                    value: String(n),
                    label: n + ' minutes',
                  }))}
                />
                <button disabled={busy || !data} className={primary}>
                  Update my plan
                </button>
              </div>
              <p className="help-text">
                This adjusts today’s suggested steps, not your saved habits. Time is a guide, not a
                timer.
              </p>
            </form>
          </details>
          {!busy && data && plan.length > 0 && (
            <div className="daily-progress">
              <div>
                <h2>
                  {completed === plan.length ? 'You showed up today.' : 'Your next small steps'}
                </h2>
                <p>
                  {completed} of {plan.length} completed
                  {completed === plan.length
                    ? ' · Take a moment to enjoy it.'
                    : ' · Go at your own pace.'}
                </p>
              </div>
              <progress aria-label="Habits completed today" value={completed} max={plan.length} />
            </div>
          )}
          <div className="habit-list">
            {plan.map((item) => {
              const log = data?.logs.find(
                (l) => l.habit_id === item.habit.id && l.log_date === day,
              );
              return (
                <article
                  key={item.habit.id}
                  className={`habit-item ${log?.status === 'done' ? 'habit-item--done' : ''}`}
                >
                  <div className="habit-top">
                    <div>
                      <h2>{item.habit.name}</h2>
                      <p className="habit-cue">{item.habit.anchor}</p>
                    </div>
                    <span className="pill">
                      {log?.status === 'done' ? (
                        <>
                          <Check size={13} aria-hidden="true" />
                          Done
                        </>
                      ) : item.mode === 'minimum' ? (
                        'Tiny step'
                      ) : (
                        'Usual step'
                      )}
                    </span>
                  </div>
                  <p className="habit-action">
                    {log?.status === 'done'
                      ? log.completion_method === 'minimum'
                        ? item.habit.minimum_version
                        : item.habit.normal_version
                      : item.action}
                  </p>
                  <p className="help-text">
                    {log?.status === 'done' ? 'A step taken. That counts.' : item.reason}
                  </p>
                  <div className="habit-actions">
                    {log && (
                      <button
                        disabled={busy}
                        className={secondary}
                        onClick={() =>
                          act(
                            () => undoHabitLog(log),
                            'Record undone. Your habit is pending again.',
                          )
                        }
                      >
                        {log.status === 'done' ? 'Undo completion' : 'Undo skip'}
                        <RotateCcw size={14} aria-hidden="true" />
                      </button>
                    )}
                    {log && (
                      <p className="text-sm font-bold">
                        {log.status === 'done'
                          ? `Completed (${log.completion_method === 'minimum' ? 'tiny version' : 'normal version'})`
                          : `Skipped: ${reasonLabels[log.skip_reason || ''] || 'reason not recorded'}. You can still return to it today.`}
                      </p>
                    )}
                    {log?.status !== 'done' && (
                      <>
                        <button
                          disabled={busy}
                          className={primary}
                          onClick={() =>
                            act(async () => {
                              const result = await markHabitDone(item.habit.id, item.mode);
                              if (!result.success) throw new Error(result.error);
                            }, 'Completion saved.')
                          }
                        >
                          Done: {item.mode === 'minimum' ? 'tiny version' : 'normal version'}
                        </button>
                        {item.mode === 'minimum' && (
                          <button
                            disabled={busy}
                            className={secondary}
                            onClick={() =>
                              act(async () => {
                                const result = await markHabitDone(item.habit.id, 'normal');
                                if (!result.success) throw new Error(result.error);
                              }, 'Normal completion saved.')
                            }
                          >
                            I did the full version
                          </button>
                        )}
                        <button
                          disabled={busy}
                          className={secondary}
                          onClick={() => onRescue(item.habit.id)}
                        >
                          Rescue / skip
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!busy && data && plan.length === 0 && (
            <EmptyState
              title={
                data.habits.length ? 'A little breathing room.' : 'Start with one small habit.'
              }
              action={
                <Button onClick={onAdd}>
                  <Plus size={17} aria-hidden="true" />
                  Create a habit
                </Button>
              }
            >
              {data.habits.length
                ? 'Nothing is scheduled today. Your weekday habits return on Monday.'
                : 'Choose something that matters to you. Give it a usual step and a tiny version for busy days.'}
            </EmptyState>
          )}
          {data && data.habits.length > 0 && (
            <details className="manage-list">
              <summary>
                Manage habits <span className="help-text">({data.habits.length})</span>
              </summary>
              <p className="text-xs">
                All active habits, including those not scheduled today. Deleting removes a habit
                from your routine; past logs and reflections are kept.
              </p>
              {data.habits.map((habit) => (
                <div key={habit.id} className="border-t pt-3 space-y-2">
                  <div className="manage-row">
                    <strong>{habit.name}</strong>
                    <div className="action-row">
                      <IconButton
                        disabled={busy}
                        label="Edit"
                        accessibleLabel={`Edit ${habit.name}`}
                        onClick={() => onEdit(habit.id)}
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        disabled={busy}
                        label="Delete"
                        accessibleLabel={`Delete ${habit.name}`}
                        danger
                        onClick={() => setDeleteId(habit.id)}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                  {!plan.some((item) => item.habit.id === habit.id) &&
                    data.logs
                      .filter((log) => log.habit_id === habit.id && log.log_date === day)
                      .map((log) => (
                        <button
                          key={log.id}
                          disabled={busy}
                          className={secondary}
                          onClick={() => act(() => undoHabitLog(log), 'Today record undone.')}
                        >
                          Undo today's record
                        </button>
                      ))}
                  {deleteId === habit.id && (
                    <div className="bg-red-50 rounded-xl p-3 space-y-3">
                      <p className="text-sm">
                        Delete {habit.name} from your routine? It will no longer appear in Today,
                        Rescue, or Adjust. Your past records will remain.
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          className="button button--danger"
                          onClick={() =>
                            act(async () => {
                              const result = await deleteHabit(habit.id);
                              if (!result.success) throw new Error(result.error);
                              setDeleteId(null);
                            }, 'Habit removed from your routine. Past records were kept.')
                          }
                        >
                          Confirm delete
                        </button>
                        <button
                          disabled={busy}
                          className={secondary}
                          onClick={() => setDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </details>
          )}
        </>
      )}
      {view === 'weekly' && data && (
        <>
          <p className="help-text">
            Small adjustments, based on last week. Nothing changes until you accept a suggestion.
          </p>
          {!data.habits.length && (
            <EmptyState
              title="Your patterns start with a habit."
              action={<Button onClick={onAdd}>Create a habit</Button>}
            >
              Add a habit and check in during the week. Your activity will help shape useful
              suggestions.
            </EmptyState>
          )}
          {data.weekly.map((p) => (
            <article className={panel} key={p.habitId}>
              <h2 className="font-bold">{p.name}</h2>
              <div className="week-stats">
                <div>
                  <strong>{p.done}</strong>
                  <span>completed · {p.minimum} tiny</span>
                </div>
                <div>
                  <strong>{p.skipped}</strong>
                  <span>skipped</span>
                </div>
                <div>
                  <strong>{p.unlogged}</strong>
                  <span>no check-in</span>
                </div>
              </div>
              <p className="text-xs">
                Out of {p.opportunities} scheduled days. Missing logs do not tell us whether you did
                the habit.
              </p>
              {Object.entries(p.reasons).map(([key, count]) => (
                <p className="text-xs" key={key}>
                  {reasonLabels[key] || key}: {count} skips
                </p>
              ))}
              {p.done + p.skipped < 3 && (
                <p className="text-xs text-primary">
                  Not enough records to recommend a change yet. Keep checking in to help us
                  understand what works for you.
                </p>
              )}
            </article>
          ))}
          {data.habits.length > 0 && (
            <AIAdjustmentPanel
              key={shiftDate(monday(day), -7)}
              habits={data.habits}
              patterns={data.weekly}
              weekStart={shiftDate(monday(day), -7)}
              disabled={busy}
              onChanged={async () => {
                await refresh();
                await onChanged();
              }}
            />
          )}
          <h2 className="text-lg font-bold">Suggestions from your activity</h2>
          {preparing && !proposals.length && <p role="status">Checking for useful adjustments…</p>}
          {!preparing && proposals.length === 0 && (
            <p className="text-sm">
              No changes suggested. Your recorded week has not shown a clear enough pattern yet.
            </p>
          )}
          {proposals.map((p) => (
            <article className={panel} key={p.id}>
              <h3 className="font-bold">
                {data.habits.find((h) => h.id === p.habit_id)?.name || 'Habit'}:{' '}
                {p.field === 'anchor' ? 'cue adjustment' : 'smaller target'}
              </h3>
              <p className="text-sm">Current: {p.before}</p>
              <p className="text-sm font-bold">Proposed: {p.after}</p>
              <p className="text-xs">{p.evidence}</p>
              {p.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    className={primary}
                    onClick={() =>
                      act(
                        () => decideProposal(p.id, true),
                        'Habit updated. Future plans will use the accepted change.',
                      )
                    }
                  >
                    Accept change
                  </button>
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() =>
                      act(
                        () => decideProposal(p.id, false),
                        'Proposal rejected. Your habit stays unchanged.',
                      )
                    }
                  >
                    Keep current
                  </button>
                </div>
              ) : (
                <p className="pill">
                  {p.status === 'accepted' ? 'Change applied' : 'Habit kept as it is'}
                </p>
              )}
            </article>
          ))}
        </>
      )}
    </div>
  );
};
