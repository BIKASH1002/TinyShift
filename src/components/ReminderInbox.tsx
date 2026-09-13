import { userMessage } from '../lib/userMessage';
import React, { useEffect, useState } from 'react';
import { RoutineReminder, dismissReminder, loadReminders } from '../lib/reminderService';
export const ReminderInbox: React.FC<{ onWeekly: () => void }> = ({ onWeekly }) => {
  const [items, setItems] = useState<RoutineReminder[]>([]);
  const [error, setError] = useState(''),
    [busyId, setBusyId] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true,
      running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const next = await loadReminders();
        if (active) {
          setItems(next);
          setError('');
        }
      } catch (e) {
        if (active) setError(userMessage(e, 'Reminders unavailable.'));
      } finally {
        running = false;
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [revision]);
  if (!items.length && !error) return null;
  return (
    <section className="surface space-y-3">
      <h2>A little nudge</h2>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
          <button className="underline ml-2" onClick={() => setRevision((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}
      {items.map((item) => (
        <article key={item.id} className="space-y-2">
          <p className="text-sm">
            {item.kind === 'weekly'
              ? 'Your weekly check is ready. Open Adjust to review your activity and suggestions.'
              : 'A check-in reminder was prepared for today. If you have already logged your habits, you can dismiss it.'}
          </p>
          <p className="text-xs">For {item.period_start}</p>
          <div className="flex gap-3">
            {item.kind === 'weekly' && (
              <button className="underline text-sm" onClick={onWeekly}>
                Open Adjust
              </button>
            )}
            <button
              disabled={!!busyId}
              className="underline text-sm disabled:opacity-50"
              onClick={async () => {
                setBusyId(item.id);
                setError('');
                try {
                  await dismissReminder(item.id);
                  setItems((old) => old.filter((x) => x.id !== item.id));
                } catch (e) {
                  setError(userMessage(e, 'Could not dismiss reminder.'));
                } finally {
                  setBusyId('');
                }
              }}
            >
              Dismiss
            </button>
          </div>
        </article>
      ))}
    </section>
  );
};
