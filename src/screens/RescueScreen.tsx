import { userMessage } from '../lib/userMessage';
import React, { useState } from 'react';
import { Habit, RescueReason } from '../types';
import { reasonLabels } from '../lib/routineEngine';
import { PageHeader, EmptyState } from '../components/ui';
import { SelectField } from '../components/SelectField';
interface Props {
  habits: Habit[];
  initialHabitId?: string | null;
  onUseMinimum: (id: string) => Promise<void> | void;
  onSkip: (id: string, reason: RescueReason) => Promise<void> | void;
}
export const RescueScreen: React.FC<Props> = ({ habits, initialHabitId, onUseMinimum, onSkip }) => {
  const available = habits.filter((h) => !h.completedToday && h.statusToday !== 'skipped');
  const [id, setId] = useState(initialHabitId || '');
  const [reason, setReason] = useState<RescueReason>('low_energy');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const habit = available.find((h) => h.id === id) || available[0];
  async function save(skip: boolean) {
    if (!habit || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (skip) await onSkip(habit.id, reason);
      else await onUseMinimum(habit.id);
      setMessage(skip ? 'Skip and reason saved.' : 'Tiny completion saved. That counts.');
    } catch (e) {
      setError(userMessage(e, 'Could not save. Please retry.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page page--tab">
      <PageHeader
        editorial
        eyebrow="A gentler way forward"
        title="A smaller step still counts."
        description="When the original plan feels like too much, make it smaller. Mark it complete after you do it."
      />
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-emerald-800">
          {message}
        </p>
      )}
      {!habit ? (
        <EmptyState title="Nothing needs rescuing right now.">
          No pending habits here. You can return to skipped habits on Today whenever you feel ready.
        </EmptyState>
      ) : (
        <>
          <div className="form-grid">
            <SelectField
              label="Habit"
              disabled={busy}
              value={habit.id}
              onChange={setId}
              options={available.map((h) => ({ value: h.id, label: h.name }))}
            />
            <SelectField
              label="What got in the way?"
              disabled={busy}
              value={reason}
              onChange={(value) => setReason(value as RescueReason)}
              options={Object.entries(reasonLabels).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <article className="surface space-y-4">
            <span className="pill">Your tiny version</span>
            <h2 className="text-xl font-bold">{habit.minimumVersion}</h2>
            <p className="text-sm">Instead of: {habit.normalVersion}</p>
            <div className="action-row">
              <button
                disabled={busy}
                onClick={() => save(false)}
                className="button button--primary"
              >
                I completed the tiny version
              </button>
              <button
                disabled={busy}
                onClick={() => save(true)}
                className="button button--secondary"
              >
                Skip today and save why
              </button>
            </div>
            <p className="help-text">
              Skipping is information, not a failure. Your reason helps us understand what gets in
              the way.
            </p>
          </article>
        </>
      )}
    </div>
  );
};
