import { PushReminderSettings } from './PushReminderSettings';
import { userMessage } from '../lib/userMessage';
import React, { useEffect, useState } from 'react';
import {
  ReminderPreferences,
  loadReminderPreferences,
  saveReminderPreferences,
} from '../lib/reminderService';
export const ReminderSettings: React.FC = () => {
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [scheduled, setScheduled] = useState(false);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    loadReminderPreferences()
      .then((p) => {
        if (active) {
          setPrefs(p);
          setScheduled(p.daily_enabled || p.weekly_enabled);
        }
      })
      .catch((e) => {
        if (active) setError(userMessage(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const change = (next: Partial<ReminderPreferences>) => {
    setPrefs((p) => p && { ...p, ...next });
    setNotice('');
  };
  return (
    <section className="surface space-y-4">
      <h2 className="font-bold">Weekly preparation and reminders</h2>
      <p className="text-sm">
        Choose when you would like a nudge. Reminders appear on Today when you return.
        You can also enable optional push notifications on this device below.
        AI is only used when you request it.
      </p>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
          <button
            disabled={busy}
            className="block underline"
            onClick={() => setRevision((n) => n + 1)}
          >
            Reload settings
          </button>
        </p>
      )}
      {busy && <p role="status">Loading or saving settings...</p>}
      {notice && (
        <p role="status" className="text-emerald-800">
          {notice}
        </p>
      )}
      {prefs && (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            setNotice('');
            try {
              await saveReminderPreferences(prefs);
              setScheduled(prefs.daily_enabled || prefs.weekly_enabled);
              setPrefs({
                ...prefs,
                time_zone: prefs.time_zone.trim(),
                last_error: null,
                last_checked_at: null,
              });
              setNotice(
                'Settings saved. New reminders follow these preferences; prepared proposals remain unchanged.',
              );
            } catch (e) {
              setError(userMessage(e, 'Could not save settings.'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Reminder time zone
            <input
              required
              disabled={busy}
              value={prefs.time_zone}
              maxLength={100}
              className="block w-full mt-1"
              onChange={(e) => change({ time_zone: e.target.value })}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            className="underline text-sm"
            onClick={() => change({ time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone })}
          >
            Use this device's time zone
          </button>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              disabled={busy}
              checked={prefs.daily_enabled}
              onChange={(e) => change({ daily_enabled: e.target.checked })}
            />
            Daily check-in reminder if you have not checked in for a scheduled habit
          </label>
          <label className="block text-sm">
            Daily reminder time
            <input
              type="time"
              required
              disabled={busy}
              value={prefs.daily_time.slice(0, 5)}
              className="block border p-2 rounded-xl mt-1"
              onChange={(e) => change({ daily_time: e.target.value })}
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              disabled={busy}
              checked={prefs.weekly_enabled}
              onChange={(e) => change({ weekly_enabled: e.target.checked })}
            />
            Prepare weekly suggestions from my activity and remind me to review them
          </label>
          <label className="block text-sm">
            Monday preparation time
            <input
              type="time"
              required
              disabled={busy}
              value={prefs.weekly_time.slice(0, 5)}
              className="block border p-2 rounded-xl mt-1"
              onChange={(e) => change({ weekly_time: e.target.value })}
            />
          </label>
          <button disabled={busy} className="button button--primary">
            Save reminder settings
          </button>
          <p className="text-xs">
            Reminders may appear a few minutes after your chosen time. Keep this time zone aligned
            with your device when travelling; Today and Adjust use your device's dates.
          </p>
          {prefs.last_checked_at && (
            <p className="text-xs">
              Last checked: {new Date(prefs.last_checked_at).toLocaleString()}
            </p>
          )}
          {prefs.last_error && (
            <p className="text-xs text-red-800">
              We could not prepare your reminders. We will try again automatically.
            </p>
          )}
        </form>
      )}
      <PushReminderSettings scheduled={scheduled} />
    </section>
  );
};
