import { userMessage } from '../lib/userMessage';
import React, { useEffect, useRef, useState } from 'react';
import { Habit, HabitCategory, HabitFrequency } from '../types';
import { HabitDraft } from '../../backend/supabase/functions/_shared/habitDraft';
import { generateHabitDraft } from '../lib/habitDraftService';
import { Button, ConfirmDialog, PageHeader } from '../components/ui';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SelectField } from '../components/SelectField';
interface Props {
  onAddHabit: (habit: Partial<Habit>) => Promise<void> | void;
  onClose: () => void;
  initialDraft?: HabitDraft;
}
export const AddHabitScreen: React.FC<Props> = ({ onAddHabit, onClose, initialDraft }) => {
  const [form, setForm] = useState(
    initialDraft
      ? {
          name: initialDraft.name,
          anchor: initialDraft.anchor,
          normalVersion: initialDraft.normalVersion,
          minimumVersion: initialDraft.minimumVersion,
          motivation: initialDraft.motivation,
        }
      : { name: '', anchor: '', normalVersion: '', minimumVersion: '', motivation: '' },
  );
  const [category, setCategory] = useState<HabitCategory>(initialDraft?.category || 'Health');
  const [frequency, setFrequency] = useState<HabitFrequency>(
    initialDraft?.frequency || 'Daily',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState('');
  const [consent, setConsent] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [candidate, setCandidate] = useState<HabitDraft | null>(null);
  const [draftUsed, setDraftUsed] = useState(false);
  const initialValues = useRef(JSON.stringify({ ...form, category, frequency }));
  const dirty =
    JSON.stringify({ ...form, category, frequency }) !== initialValues.current || !!goal.trim();
  const [confirmClose, setConfirmClose] = useState(false);
  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const fields = [
    ['name', 'Habit', 'Read'],
    ['anchor', 'When this happens', 'After breakfast'],
    ['normalVersion', 'Normal version', 'Read 20 pages'],
    ['minimumVersion', 'Tiny version for difficult days', 'Read one page'],
    ['motivation', 'Why it matters (optional)', 'A calmer start to the day'],
  ] as const;
  return (
    <div className="page page--narrow">
      <ConfirmDialog
        open={confirmClose}
        title="Leave without saving?"
        onCancel={() => setConfirmClose(false)}
        onConfirm={onClose}
      >
        Your habit changes have not been saved. Keep editing, or discard them and return to
        Today.
      </ConfirmDialog>
      <div>
        <Button variant="quiet" disabled={busy || aiBusy} onClick={requestClose}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </Button>
      </div>
      <PageHeader
        eyebrow={initialDraft ? 'Make it work for you' : 'One habit. Two ways to show up.'}
        title={initialDraft ? 'Edit habit' : 'Create a habit'}
        description="Connect a habit to a moment in your day. Keep a smaller version ready for when life gets busy."
      />
      {!initialDraft && (
        <details className="surface ai-panel">
          <summary>
            <span className="inline-flex items-center gap-2">
              <Sparkles size={18} aria-hidden="true" />
              Need a starting point? Design it with AI
            </span>
          </summary>
          <div className="space-y-3 mt-3">
            <label className="block text-sm">
              Your goal and what makes it difficult
              <textarea
                disabled={busy || aiBusy}
                minLength={10}
                maxLength={1500}
                value={goal}
                className="block w-full border rounded-xl p-3 mt-2"
                placeholder="I want to read, but I am exhausted after work."
                onChange={(e) => {
                  setGoal(e.target.value);
                  setCandidate(null);
                }}
              />
            </label>
            <label className="flex gap-2 text-xs items-start">
              <input
                type="checkbox"
                disabled={busy || aiBusy}
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Send this description to AI to suggest a habit. Your existing habits and
              reflections are not sent.
            </label>
            <button
              type="button"
              disabled={busy || aiBusy || !consent || goal.trim().length < 10}
              className="button button--primary"
              onClick={async () => {
                setAiBusy(true);
                setAiError('');
                setCandidate(null);
                try {
                  setCandidate(await generateHabitDraft(goal));
                } catch (e) {
                  setAiError(
                    userMessage(e, 'AI is unavailable. You can still fill in the form below.'),
                  );
                } finally {
                  setAiBusy(false);
                }
              }}
            >
              {aiBusy ? 'Preparing draft...' : 'Generate AI draft'}
            </button>
            <p className="text-xs">
              Optional. You can always fill in the form yourself. Generating does not save a
              habit.
            </p>
            <p className="text-xs">
              You can use AI up to 10 times a day. Please wait 15 seconds between requests.
            </p>
            {aiError && (
              <p role="alert" className="text-red-800 text-sm">
                {aiError}
              </p>
            )}
            {candidate && (
              <div className="bg-orange-50 rounded-xl p-4 space-y-2">
                <h3 className="font-bold">Review the AI suggestion</h3>
                {fields.map(([key, label]) => (
                  <p key={key} className="text-sm">
                    <strong>{label}:</strong> {candidate[key]}
                  </p>
                ))}
                <p className="text-sm">
                  {candidate.category} / {candidate.frequency}
                </p>
                <p className="text-xs">
                  Using this draft replaces the form below. You can edit every field before
                  saving.
                </p>
                <div className="action-row">
                  <button
                    type="button"
                    disabled={busy || aiBusy}
                    className="button button--secondary"
                    onClick={() => {
                      const { category, frequency, ...details } = candidate;
                      setForm(details);
                      setCategory(category);
                      setFrequency(frequency);
                      setCandidate(null);
                      setDraftUsed(true);
                    }}
                  >
                    Use this draft
                  </button>
                  <button
                    type="button"
                    disabled={busy || aiBusy}
                    className="button button--quiet"
                    onClick={() => setCandidate(null)}
                  >
                    Discard draft
                  </button>
                </div>
              </div>
            )}
            {draftUsed && (
              <p role="status" className="text-sm">
                Draft copied to the form. Review it and select Create habit to save.
              </p>
            )}
          </div>
        </details>
      )}
      <form
        className="surface space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || aiBusy) return;
          setBusy(true);
          setError('');
          try {
            await onAddHabit({ ...form, category, frequency });
          } catch (e) {
            setError(userMessage(e, 'Could not create habit.'));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <h2>Your habit, made practical</h2>
          <p className="help-text">All fields are required unless marked optional.</p>
        </div>
        <div className="form-grid">
          {fields.map(([key, label, placeholder]) => (
            <label
              key={key}
              className={`block text-sm font-bold ${key === 'name' || key === 'anchor' || key === 'motivation' ? 'full-width' : ''}`}
            >
              {label}
              <input
                aria-label={label}
                className="w-full p-3 mt-2 border rounded-xl font-normal"
                required={key !== 'motivation'}
                maxLength={500}
                disabled={busy || aiBusy}
                value={form[key]}
                placeholder={placeholder}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
              {key === 'anchor' && (
                <span className="field-help">
                  Choose a familiar moment, such as finishing breakfast.
                </span>
              )}
              {key === 'minimumVersion' && (
                <span className="field-help">Small enough to do even on a difficult day.</span>
              )}
            </label>
          ))}
          <SelectField
            label="Category"
            disabled={busy || aiBusy}
            value={category}
            onChange={(value) => setCategory(value as HabitCategory)}
            options={['Health', 'Focus', 'Mood', 'Learning', 'Movement', 'Other'].map((value) => ({
              value,
              label: value,
            }))}
          />
          <SelectField
            label="Schedule"
            disabled={busy || aiBusy}
            value={frequency}
            onChange={(value) => setFrequency(value as HabitFrequency)}
            options={[
              { value: 'Daily', label: 'Daily' },
              { value: 'Weekdays', label: 'Weekdays' },
              ...(frequency === 'Custom'
                ? [{ value: 'Custom', label: 'Choose Daily or Weekdays', disabled: true }]
                : []),
            ]}
          />
        </div>
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        <div className="form-footer">
          <Button type="submit" busy={busy} disabled={aiBusy}>
            {busy ? 'Saving...' : initialDraft ? 'Save changes' : 'Create habit'}
          </Button>
          <Button variant="quiet" disabled={busy || aiBusy} onClick={requestClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
