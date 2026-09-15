import { userMessage } from '../lib/userMessage';
import React, { useEffect, useRef, useState } from 'react';
import { peekCache } from '../lib/dataCache';
import { monday } from '../lib/routineEngine';
import { useRefreshSignal } from '../lib/useRefreshSignal';
import { WeeklyInsight } from '../types';
import { WeeklyReviewPanel } from '../components/WeeklyReviewPanel';
import { PageHeader, LoadingState, displayDate } from '../components/ui';
import {
  getWeeklyInsights,
  getPreviousReflections,
  saveWeeklyReflection,
  WeeklyInsights,
  WeeklyReflection,
} from '../lib/weeklyInsightService';
export const InsightsScreen: React.FC<{ insights: WeeklyInsight[] }> = () => {
  const [weekly, setWeekly] = useState<WeeklyInsights | null>(
    () => peekCache<WeeklyInsights>('week:' + monday()) || null,
  );
  const [history, setHistory] = useState<WeeklyReflection[]>(
    () => peekCache<WeeklyReflection[]>('history:' + monday()) || [],
  );
  const [text, setText] = useState(
    () => peekCache<WeeklyInsights>('week:' + monday())?.reflectionText || '',
  );
  const dirty = useRef(false);
  const loadVersion = useRef(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(() => !peekCache('week:' + monday()));
  const [saved, setSaved] = useState(false);
  const refreshSignal = useRefreshSignal(!busy && !dirty.current);
  useEffect(() => {
    let alive = true;
    const version = ++loadVersion.current;
    const current = () => alive && version === loadVersion.current;
    setError('');
    Promise.all([getWeeklyInsights(), getPreviousReflections()])
      .then(([a, b]) => {
        if (!current()) return;
        if (!a.success) setError(a.error || 'Could not load reflection.');
        else if (!dirty.current) {
          setWeekly(a.data!);
          setText(a.data!.reflectionText);
        }
        if (b.success) setHistory(b.data || []);
        else setError(b.error || 'Could not load previous reflections.');
      })
      .catch((e) => {
        if (current()) setError(userMessage(e));
      })
      .finally(() => {
        if (current()) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshSignal]);
  async function save() {
    if (!weekly || busy) return;
    loadVersion.current++;
    setBusy(true);
    setError('');
    try {
      const result = await saveWeeklyReflection({ reflectionText: text });
      if (!result.success) throw new Error(result.error);
      dirty.current = false;
      setSaved(true);
    } catch (e) {
      setError(userMessage(e, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page page--tab">
      <PageHeader
        editorial
        eyebrow="Pause and notice"
        title="Every week teaches you something."
        accent="teaches you"
        description="Look back with curiosity. Keep what helps and make room to try something different."
      />
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {busy && <LoadingState label={weekly ? 'Saving your reflection…' : 'Loading your week…'} />}
      {weekly && (
        <section className="surface space-y-2">
          <p className="eyebrow">
            This week · {displayDate(weekly.weekStartDate)} to {displayDate(weekly.weekEndDate)}
          </p>
          <p>{weekly.summaryText}</p>
          <p className="text-sm">Most skipped: {weekly.mostSkippedHabit || 'No recorded skips'}</p>
          <p className="text-xs">
            For patterns and proposed changes based on the last completed week, open Adjust.
          </p>
        </section>
      )}
      <div className="space-y-4">
        <label className="block font-bold">
          What helped, and what got in the way?
          <textarea
            disabled={busy || !weekly}
            className="mt-3 w-full min-h-40 p-4 border rounded-2xl font-normal"
            placeholder="A moment that went well, something that felt difficult, or one thing to try next…"
            value={text}
            onChange={(e) => {
              dirty.current = true;
              setText(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <button disabled={busy || !weekly} className="button button--primary" onClick={save}>
          Save reflection
        </button>
        {saved && (
          <p role="status" className="text-emerald-800">
            Reflection saved.
          </p>
        )}
      </div>
      <WeeklyReviewPanel />
      <div className="space-y-4">
        <h2>Previous reflections</h2>
        {!busy && !history.length && (
          <p className="help-text">
            Your saved weekly reflections will appear here as you build your routine.
          </p>
        )}
        {history.map((item) => (
          <article key={item.id} className="border-t pt-4">
            <p className="eyebrow">Week of {displayDate(item.week_start_date)}</p>
            <p className="mt-2 whitespace-pre-wrap">
              {item.reflection_text || 'No written reflection for this week.'}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};
