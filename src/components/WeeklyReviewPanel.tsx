import { userMessage } from '../lib/userMessage';
import React, { useEffect, useRef, useState } from 'react';
import { ReviewResult } from '../../backend/supabase/functions/_shared/weeklyReview';
import { generateWeeklyReview } from '../lib/weeklyReviewService';
import { Sparkles } from 'lucide-react';
import { displayDate } from './ui';
export const WeeklyReviewPanel: React.FC = () => {
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null),
    [error, setError] = useState('');
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return (
    <section className="surface ai-panel space-y-3">
      <h2>
        <Sparkles size={19} aria-hidden="true" />
        AI review of last week
      </h2>
      <p className="help-text">
        Get a fresh perspective on your check-ins. Your habits stay unchanged. Days without a
        check-in are not counted as skipped.
      </p>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Send habit names, completion counts and recorded skip-reason counts to AI. My written
        reflections and profile are not sent.
      </label>
      <button
        disabled={!consent || busy}
        className="button button--primary"
        onClick={async () => {
          if (busy || !consent) return;
          setBusy(true);
          setError('');
          setResult(null);
          try {
            const next = await generateWeeklyReview();
            if (active.current) setResult(next);
          } catch (e) {
            if (active.current) setError(userMessage(e, 'Review unavailable.'));
          } finally {
            if (active.current) setBusy(false);
          }
        }}
      >
        {busy ? 'Preparing review...' : 'Generate weekly review'}
      </button>
      <p className="text-xs">
        You can use AI up to 10 times a day. Please wait 15 seconds between requests.
      </p>
      {busy && <p role="status">Reading last week’s activity and preparing commentary...</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {result && (
        <div className="space-y-3">
          <p className="text-sm font-bold">
            {displayDate(result.start)} to {displayDate(result.end)}
          </p>
          {!result.review ? (
            <p>No recorded activity for active habits in this week. No AI request was made.</p>
          ) : (
            <>
              <p>{result.review.summary}</p>
              {result.review.observations.map((o) => (
                <article key={o.habitId} className="border rounded-xl p-3 space-y-2">
                  <h3 className="font-bold">
                    {result.evidence.find((e) => e.habitId === o.habitId)?.name}
                  </h3>
                  <p>{o.interpretation}</p>
                  <p className="italic">{o.question}</p>
                </article>
              ))}
              <details>
                <summary className="cursor-pointer font-bold">
                  Activity used for this review
                </summary>
                {result.evidence.map((e) => (
                  <p key={e.habitId} className="text-sm mt-2">
                    {e.name}: {e.normal} normal completions, {e.minimum} tiny completions,{' '}
                    {e.skipped} days marked as skipped.
                    {Object.entries(e.reasons).map(
                      ([reason, count]) => ' ' + reason.replaceAll('_', ' ') + ': ' + count + '.',
                    )}
                  </p>
                ))}
              </details>
              <p className="text-xs">
                AI can make mistakes. Check that the review matches your experience. This is a
                snapshot, not a saved report; regenerate after changing relevant records. Leaving
                this screen clears it.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
};
