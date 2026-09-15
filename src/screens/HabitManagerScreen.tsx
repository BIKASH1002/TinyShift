import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, LoadingState, PageHeader } from '../components/ui';
import { HabitTree } from '../components/habit-tree/HabitTree';
import { loadRoutineData } from '../lib/routineService';
import { deleteHabit } from '../lib/habitService';
import { localDate } from '../lib/routineEngine';
import { peekCache } from '../lib/dataCache';
import { userMessage } from '../lib/userMessage';
import { useRefreshSignal } from '../lib/useRefreshSignal';

type Data = Awaited<ReturnType<typeof loadRoutineData>>;
interface Props {
  accountId: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onChanged: () => Promise<void>;
  newHabitId: string | null;
  onGrowthShown: () => void;
}
export const HabitManagerScreen: React.FC<Props> = ({
  accountId,
  onAdd,
  onEdit,
  onChanged,
  newHabitId,
  onGrowthShown,
}) => {
  const [data, setData] = useState<Data | null>(
    () => peekCache<Data>('routine:' + localDate()) || null,
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  const acting = useRef(false);
  const alive = useRef(true);
  const refreshSignal = useRefreshSignal(!busy);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current++;
    };
  }, []);
  useEffect(() => {
    if (acting.current) return;
    const request = ++version.current;
    loadRoutineData(localDate(), retry > 0)
      .then((next) => {
        if (alive.current && request === version.current) {
          setData(next);
          setError('');
        }
      })
      .catch((e) => {
        if (alive.current && request === version.current) setError(userMessage(e));
      });
  }, [refreshSignal, retry]);

  async function act(action: () => Promise<void>, success: string) {
    if (acting.current) return;
    acting.current = true;
    version.current++;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (!alive.current) return;
      setNotice(success);
      const next = await loadRoutineData(localDate(), true);
      if (alive.current) setData(next);
      await onChanged();
    } catch (e) {
      if (alive.current) setError(userMessage(e));
    } finally {
      acting.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="page page--tab">
      <PageHeader
        editorial
        eyebrow="Make room for what matters"
        title="Small habits, room to grow."
        accent="grow."
        description="Create and care for your habits here. Today keeps your next steps in focus."
        action={
          <Button onClick={onAdd} disabled={busy}>
            <Plus size={17} aria-hidden="true" />
            New habit
          </Button>
        }
      />
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setRetry((value) => value + 1)}
          >
            Try loading again
          </Button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <LoadingState />}
      {data && (
        <div className="habit-manager-layout">
          <HabitTree
            accountId={accountId}
            habits={data.habits}
            highlightedId={highlightedId}
            onHighlight={setHighlightedId}
            newHabitId={newHabitId}
            onGrowthShown={onGrowthShown}
          />
          <section className="habit-manager-controls" aria-label="Manage your habits">
            <label>
              Find a habit
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your habits"
              />
            </label>
            {!data.habits.length && (
              <p>Add your first habit. A small, familiar step is a good place to start.</p>
            )}
            {!!data.habits.length &&
              !data.habits.some((habit) =>
                habit.name.toLowerCase().includes(query.toLowerCase()),
              ) && <p>No habits match your search.</p>}
            <ul className="habit-manager-list">
              {data.habits
                .filter((habit) => habit.name.toLowerCase().includes(query.toLowerCase()))
                .map((habit) => {
                  const isExpanded = expandedId === habit.id;
                  const toggleExpanded = () => {
                    setExpandedId((current) => (current === habit.id ? null : habit.id));
                  };
                  return (
                    <li
                      key={habit.id}
                      className={
                        'habit-manager-item' +
                        (highlightedId === habit.id ? ' habit-manager-item--active' : '') +
                        (isExpanded ? ' habit-manager-item--expanded' : ' habit-manager-item--collapsed')
                      }
                      onClick={toggleExpanded}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleExpanded();
                        }
                      }}
                      onPointerEnter={() => setHighlightedId(habit.id)}
                      onPointerLeave={() => setHighlightedId(null)}
                      onFocusCapture={() => setHighlightedId(habit.id)}
                      onBlurCapture={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                          setHighlightedId(null);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="habit-manager-row">
                        <div className="habit-manager-name">
                          <h2>{habit.name}</h2>
                          {!isExpanded && (
                            <p className="help-text">
                              {habit.frequency}
                              {habit.category ? ' · ' + habit.category : ''}
                            </p>
                          )}
                        </div>
                        <div className="action-row" onClick={(event) => event.stopPropagation()}>
                          <IconButton
                            disabled={busy}
                            label="Edit"
                            accessibleLabel={'Edit ' + habit.name}
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedId(habit.id);
                              onEdit(habit.id);
                            }}
                          >
                            <Pencil size={18} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            disabled={busy}
                            label="Delete"
                            accessibleLabel={'Delete ' + habit.name}
                            danger
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedId(habit.id);
                              setDeleteId(habit.id);
                            }}
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </IconButton>
                        </div>
                      </div>
                      {isExpanded && (
                        <>
                          <p className="help-text">{habit.anchor}</p>
                          <p>{habit.normal_version}</p>
                          <p className="help-text">Tiny step: {habit.minimum_version}</p>
                          {deleteId === habit.id && (
                            <div className="habit-manager-confirmation">
                              <p>
                                Delete {habit.name} from your routine? Your past records and
                                reflections will remain.
                              </p>
                              <div className="action-row">
                                <button
                                  className="button button--danger"
                                  disabled={busy}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    act(async () => {
                                      const result = await deleteHabit(habit.id);
                                      if (!result.success) throw new Error(result.error);
                                      if (!alive.current) return;
                                      setDeleteId(null);
                                      setExpandedId(null);
                                      setHighlightedId(null);
                                      setData((previous) =>
                                        previous
                                          ? {
                                              ...previous,
                                              habits: previous.habits.filter(
                                                (item) => item.id !== habit.id,
                                              ),
                                            }
                                          : previous,
                                      );
                                    }, 'Habit removed. Your past records were kept.');
                                  }}
                                >
                                  Confirm delete
                                </button>
                                <Button
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeleteId(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
};
