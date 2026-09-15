import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Habit } from '../types';
import { RescuePreview } from '../../backend/supabase/functions/_shared/rescueCoach';
import { completeRescueStep, generateRescueStep } from '../lib/rescueCoachService';
import { userMessage } from '../lib/userMessage';
import { Button } from './ui';
interface Props {
  habit: Habit;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onCompleted: () => Promise<void>;
}
export const RescueCoach: React.FC<Props> = ({
  habit,
  disabled,
  onBusyChange,
  onCompleted,
}) => {
  const [context, setContext] = useState('');
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<RescuePreview | null>(null);
  const [phase, setPhase] = useState<'idle' | 'generating' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const active = useRef(true),
    acting = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const busy = phase === 'generating' || phase === 'saving';
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (preview) resultHeading.current?.focus({ preventScroll: true });
  }, [preview]);
  async function generate() {
    if (acting.current || disabled || !consent) return;
    acting.current = true;
    setPhase('generating');
    onBusyChange(true);
    setError('');
    setPreview(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const next = await generateRescueStep(habit.id, context, controller.signal);
      if (active.current) setPreview(next);
    } catch (e) {
      if (active.current) setError(userMessage(e));
    } finally {
      acting.current = false;
      if (active.current) {
        setPhase('idle');
        onBusyChange(false);
      }
    }
  }
  async function complete() {
    if (!preview || acting.current || disabled || phase === 'saved') return;
    acting.current = true;
    setPhase('saving');
    onBusyChange(true);
    setError('');
    let saved = false;
    try {
      await completeRescueStep(preview);
      saved = true;
      if (!active.current) return;
      setContext('');
      setPhase('saved');
      try {
        await onCompleted();
      } catch {
        if (active.current)
          setError('Your rescue was saved, but the summary could not refresh. Reopen Today.');
      }
    } catch (e) {
      if (active.current)
        setError(userMessage(e, 'Could not save. Reopen Today to check before retrying.'));
    } finally {
      acting.current = false;
      if (active.current) {
        if (!saved) setPhase('idle');
        onBusyChange(false);
      }
    }
  }
  return (
    <section className="surface ai-panel space-y-4" aria-label="Rescue Coach">
      <h2>
        <Sparkles size={19} aria-hidden="true" /> Rescue Coach
      </h2>
      <p>Too tired or stuck right now? Tell me in one sentence.</p>
      <p className="help-text">
        Find a step for {habit.name} that fits where you are, in about a minute or less.
      </p>
      {phase === 'saved' ? (
        <p role="status">
          Rescue completed. That counts as a tiny win. You can undo it on Today.
        </p>
      ) : (
        <details open={!preview}>
          <summary>
            {preview ? 'Change your situation or try another idea' : 'Describe your situation'}
          </summary>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void generate();
            }}
          >
            <label className="block">
              What is making this habit difficult right now?
              <textarea
                className="block w-full mt-2"
                required
                minLength={5}
                maxLength={1000}
                placeholder="Stuck at an airport gate, no book with me, and very tired."
                value={context}
                disabled={disabled || busy}
                onChange={(event) => {
                  setContext(event.target.value);
                  setPreview(null);
                  setError('');
                }}
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                disabled={disabled || busy}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  setPreview(null);
                }}
              />
              Send this sentence and this habit's name, cue, usual and tiny steps to Google
              Gemini. Your profile, history and reflections are not sent.
            </label>
            <Button
              type="submit"
              busy={phase === 'generating'}
              disabled={disabled || busy || !consent || context.trim().length < 5}
            >
              {phase === 'generating'
                ? 'Finding a small step...'
                : preview
                  ? 'Try another idea'
                  : 'Find my rescue step'}
            </Button>
            <p className="help-text">
              Optional. Your sentence is not saved in TinyShift. Only a step you mark done is
              saved. Shared AI limit: 10 requests a day, with 15 seconds between requests.
            </p>
          </form>
        </details>
      )}
      {phase === 'generating' && (
        <p role="status">Finding something that fits your situation...</p>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && phase !== 'saved' && (
        <div className="space-y-3 border-t pt-4">
          <span className="pill">
            {preview.suggestion.kind === 'pause'
              ? 'Room to pause'
              : 'About ' + preview.suggestion.seconds + ' seconds'}
          </span>
          <h3 ref={resultHeading} tabIndex={-1}>
            {preview.suggestion.action}
          </h3>
          <p className="help-text">{preview.suggestion.reason}</p>
          {preview.suggestion.kind === 'step' ? (
            <>
              <p className="help-text">
                Try it only if it feels appropriate. Mark done after you do it.
              </p>
              <Button busy={phase === 'saving'} disabled={disabled || busy} onClick={complete}>
                {phase === 'saving' ? 'Saving...' : 'Done - I did this rescue step'}
              </Button>
            </>
          ) : (
            <p className="help-text">
              Nothing has been logged. You can use Skip today and save why below.
            </p>
          )}
          <Button variant="quiet" disabled={disabled || busy} onClick={() => setPreview(null)}>
            {preview.suggestion.kind === 'step' ? 'Not for me' : 'Dismiss'}
          </Button>
        </div>
      )}
    </section>
  );
};
