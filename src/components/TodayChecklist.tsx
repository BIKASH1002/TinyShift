import React, { useId, useRef, useState } from 'react';
import { Check, ChevronDown, RotateCcw } from 'lucide-react';
import { dailyPlan, reasonLabels } from '../lib/routineEngine';
import { loadRoutineData } from '../lib/routineService';
import { markHabitDone, undoHabitLog } from '../lib/habitService';
import './TodayChecklist.css';

type Plan = ReturnType<typeof dailyPlan>;
type Data = Awaited<ReturnType<typeof loadRoutineData>>;
interface Props {
  plan: Plan;
  logs: Data['logs'];
  day: string;
  busy: boolean;
  act: (action: () => Promise<void>, success: string) => Promise<boolean>;
  onRescue: (id: string) => void;
}
export const TodayChecklist: React.FC<Props> = ({ plan, logs, day, busy, act, onRescue }) => {
  const [filter, setFilter] = useState<'todo' | 'completed' | 'all'>('todo');
  const [limit, setLimit] = useState(4);
  const [completedLimit, setCompletedLimit] = useState(4);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recentId, setRecentId] = useState<string | null>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const prefix = useId();
  const todayLogs = new Map<string, Data['logs'][number]>(
    logs.filter((log) => log.log_date === day).map((log) => [log.habit_id, log]),
  );
  const done = plan.filter((item) => todayLogs.get(item.habit.id)?.status === 'done');
  const todo = plan.filter((item) => todayLogs.get(item.habit.id)?.status !== 'done');
  const filtered = filter === 'todo' ? todo : filter === 'completed' ? done : plan;
  const recent = recentId ? todayLogs.get(recentId) : undefined;
  async function complete(id: string, mode: 'normal' | 'minimum') {
    const saved = await act(async () => {
      const result = await markHabitDone(id, mode);
      if (!result.success) throw new Error(result.error);
    }, 'Completion saved.');
    if (saved) {
      setRecentId(id);
      requestAnimationFrame(() => feedback.current?.focus({ preventScroll: true }));
    }
  }
  function row(item: Plan[number]) {
    const habit = item.habit;
    const log = todayLogs.get(habit.id);
    const finished = log?.status === 'done';
    const open = expanded === habit.id;
    const detailsId = prefix + habit.id;
    const mode = finished ? log.completion_method : item.mode;
    return (
      <article key={habit.id} className={'today-row' + (finished ? ' today-row--done' : '')}>
        <div className="today-row-main">
          <div className="today-row-copy">
            <h3>{habit.name}</h3>
            <p>
              {finished
                ? log.rescue_action ||
                  (mode === 'minimum' ? habit.minimum_version : habit.normal_version)
                : item.action}
            </p>
            {log?.status === 'skipped' && (
              <span className="today-skip-note">
                Skipped: {reasonLabels[log.skip_reason || ''] || 'reason not recorded'}. You
                can still return to it.
              </span>
            )}
          </div>
          <span className="pill today-step">
            {finished && <Check size={13} aria-hidden="true" />}
            {finished
              ? log.rescue_action
                ? 'Rescue completed'
                : 'Completed'
              : mode === 'minimum'
                ? 'Tiny step'
                : 'Usual step'}
          </span>
          {finished ? (
            <button
              className="button button--secondary today-done"
              disabled={busy}
              aria-label={'Undo completion for ' + habit.name}
              onClick={() =>
                act(() => undoHabitLog(log), 'Record undone. Your habit is pending again.')
              }
            >
              <RotateCcw size={14} aria-hidden="true" />
              Undo
            </button>
          ) : (
            <button
              className="button button--primary today-done"
              disabled={busy}
              aria-label={
                'Complete ' +
                habit.name +
                (item.mode === 'minimum' ? ' (tiny version)' : ' (usual version)')
              }
              onClick={() => complete(habit.id, item.mode)}
            >
              Done
            </button>
          )}
          <button
            type="button"
            className="today-expand"
            aria-label={(open ? 'Hide details for ' : 'Show details for ') + habit.name}
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setExpanded(open ? null : habit.id)}
          >
            <ChevronDown size={19} aria-hidden="true" />
          </button>
        </div>
        <div id={detailsId} hidden={!open} className="today-row-details">
          <dl>
            <div>
              <dt>Your cue</dt>
              <dd>{habit.anchor}</dd>
            </div>
            <div>
              <dt>{item.mode === 'minimum' ? 'Usual version' : 'Tiny alternative'}</dt>
              <dd>{item.mode === 'minimum' ? habit.normal_version : habit.minimum_version}</dd>
            </div>
          </dl>
          {!finished && (
            <>
              <p className="help-text">{item.reason}</p>
              <div className="action-row">
                <button
                  disabled={busy}
                  className="button button--secondary"
                  onClick={() =>
                    complete(habit.id, item.mode === 'minimum' ? 'normal' : 'minimum')
                  }
                >
                  {item.mode === 'minimum' ? 'I did the full version' : 'Do the tiny version'}
                </button>
                <button
                  disabled={busy}
                  className="button button--quiet"
                  onClick={() => onRescue(habit.id)}
                >
                  Rescue / skip
                </button>
                {log?.status === 'skipped' && (
                  <button
                    disabled={busy}
                    className="button button--secondary"
                    onClick={() =>
                      act(() => undoHabitLog(log), 'Skip undone. Your habit is pending again.')
                    }
                  >
                    Undo skip
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </article>
    );
  }
  return (
    <section className="today-checklist" aria-label="Today's habits">
      <div>
        <h2>
          {done.length === plan.length ? 'You showed up today.' : 'Your next small steps'}
        </h2>
        <p className="help-text">Choose what fits right now.</p>
      </div>
      {recent?.status === 'done' && (
        <div ref={feedback} tabIndex={-1} className="today-feedback">
          <span>
            {plan.find((item) => item.habit.id === recentId)?.habit.name}: completed.
          </span>
          <button
            className="button button--quiet"
            disabled={busy}
            onClick={async () => {
              if (
                await act(
                  () => undoHabitLog(recent),
                  'Record undone. Your habit is pending again.',
                )
              )
                setRecentId(null);
            }}
          >
            Undo last completion
          </button>
        </div>
      )}
      <div className="today-filters" role="group" aria-label="Filter today's habits">
        {(
          [
            ['todo', 'To do', todo.length],
            ['completed', 'Completed', done.length],
            ['all', 'All', plan.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setLimit(4);
              setExpanded(null);
            }}
          >
            {label}
            <span>{count}</span>
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="today-checklist-box">
          {filtered.slice(0, limit).map(row)}
          {filtered.length > limit && (
            <button className="today-show-more" onClick={() => setLimit((value) => value + 4)}>
              Show remaining {filtered.length - limit}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          )}
          {limit > 4 && filtered.length > 4 && (
            <button className="today-show-more" onClick={() => setLimit(4)}>
              Show fewer
            </button>
          )}
        </div>
      ) : (
        <p className="today-empty">
          {filter === 'completed'
            ? 'No completions yet. A tiny step counts, too.'
            : 'Nothing left to do today. Take a moment to enjoy it.'}
        </p>
      )}
      {filter === 'todo' && done.length > 0 && (
        <details className="today-completed">
          <summary>
            <Check size={17} aria-hidden="true" />
            Completed today ({done.length})
          </summary>
          <div className="today-checklist-box">
            {done.slice(0, completedLimit).map(row)}
            {done.length > completedLimit && (
              <button
                className="today-show-more"
                onClick={() => setCompletedLimit((value) => value + 4)}
              >
                Show remaining {done.length - completedLimit}
              </button>
            )}
          </div>
        </details>
      )}
    </section>
  );
};
