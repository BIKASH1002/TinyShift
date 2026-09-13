import { userMessage } from '../lib/userMessage';
import React, { useEffect, useRef, useState } from 'react';
import { Routine, Pattern, reasonLabels, shiftDate } from '../lib/routineEngine';
import { displayDate } from './ui';
import { Sparkles } from 'lucide-react';
import { SelectField } from './SelectField';
import { peekCache } from '../lib/dataCache';
import { SavedAdjustment } from '../../backend/supabase/functions/_shared/habitAdjustment';
import {
  loadAIAdjustments,
  generateAIAdjustment,
  decideAIAdjustment,
} from '../lib/habitAdjustmentService';
interface Props {
  habits: Routine[];
  patterns: Pattern[];
  weekStart: string;
  disabled: boolean;
  onChanged: () => Promise<void>;
}
export const AIAdjustmentPanel: React.FC<Props> = ({
  habits,
  patterns,
  weekStart,
  disabled,
  onChanged,
}) => {
  const [selected, setSelected] = useState(habits[0]?.id || '');
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(() => !peekCache('adjustments:' + weekStart));
  const [proposals, setProposals] = useState<SavedAdjustment[]>(
    () => peekCache<SavedAdjustment[]>('adjustments:' + weekStart) || [],
  );
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const active = useRef(true);
  useEffect(() => {
    let alive = true;
    active.current = true;
    setBusy(!peekCache('adjustments:' + weekStart));
    setError('');
    loadAIAdjustments(weekStart, revision > 0)
      .then((rows) => {
        if (alive) setProposals(rows);
      })
      .catch((e) => {
        if (alive) setError(userMessage(e));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
      active.current = false;
    };
  }, [weekStart, revision]);
  const visible = proposals.filter((p) => habits.some((h) => h.id === p.habit_id));
  const hasSaved = visible.some((p) => p.habit_id === selected);
  const blocked = busy || disabled;
  const pattern = patterns.find((p) => p.habitId === selected);
  const checkIns = pattern ? pattern.done + pattern.skipped : 0;
  const needsHistory = !hasSaved && checkIns < 3;
  async function decide(p: SavedAdjustment, accept: boolean) {
    if (blocked) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const status = await decideAIAdjustment(p.id, accept);
      if (!active.current) return;
      setProposals((rows) => rows.map((row) => (row.id === p.id ? { ...row, status } : row)));
      setNotice(
        status === 'accepted'
          ? 'Change accepted. Your habit is updated.'
          : 'Suggestion rejected. Your habit stays unchanged.',
      );
      try {
        await onChanged();
      } catch {
        if (active.current)
          setError('Decision saved, but the plan could not refresh. Reload Adjust.');
      }
    } catch (e) {
      if (active.current) setError(userMessage(e, 'Could not save decision.'));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <section className="surface ai-panel space-y-4">
      <h2>
        <Sparkles size={19} aria-hidden="true" />
        Personalize with AI
      </h2>
      <p className="help-text">
        An optional second perspective on {displayDate(weekStart)} to{' '}
        {displayDate(shiftDate(weekStart, 6))}. Review every suggestion before making a change.
      </p>
      <SelectField
        label="Choose a habit"
        disabled={blocked}
        value={selected}
        onChange={(value) => {
          setSelected(value);
          setNotice('');
          setConsent(false);
        }}
        options={
          habits.length
            ? habits.map((h) => ({ value: h.id, label: h.name }))
            : [{ value: '', label: 'No active habits', disabled: true }]
        }
      />
      {needsHistory && (
        <p id="adjustment-history" className="help-text">
          Not enough history yet: {checkIns} of 3 check-ins for this habit last week. Keep checking
          in this week, then return next Monday.
        </p>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          disabled={blocked || needsHistory}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Send this habit's name, cue, normal/tiny actions and last week's activity counts to AI. My
        profile and written reflections are not sent.
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={blocked || !consent || !selected || hasSaved || needsHistory}
          aria-describedby={needsHistory ? 'adjustment-history' : undefined}
          className="button button--primary"
          onClick={async () => {
            if (blocked || !consent || !selected || hasSaved || needsHistory) return;
            setBusy(true);
            setError('');
            setNotice('');
            try {
              const result = await generateAIAdjustment(selected);
              if (!active.current) return;
              if (result.start !== weekStart)
                throw new Error('The week changed. Reload Adjust to see this week’s suggestions.');
              if (result.proposal) {
                const proposal = result.proposal;
                setProposals((rows) => [
                  ...rows.filter((p) => p.id !== proposal.id && p.habit_id !== proposal.habit_id),
                  proposal,
                ]);
                setNotice('Suggestion saved for review. No habit was changed.');
              } else setNotice(result.message || 'No change suggested.');
            } catch (e) {
              if (active.current) setError(userMessage(e, 'Suggestion unavailable.'));
            } finally {
              if (active.current) setBusy(false);
            }
          }}
        >
          Generate suggestion
        </button>
        <button
          disabled={blocked}
          className="button button--secondary"
          onClick={() => {
            setNotice('');
            setRevision((n) => n + 1);
          }}
        >
          Reload saved suggestions
        </button>
      </div>
      {hasSaved && (
        <p className="text-xs">
          This habit already has a suggestion or decision for this week. Review it below; another
          may be requested next week.
        </p>
      )}
      <p className="text-xs">
        You can use AI up to 10 times a day. Please wait 15 seconds between requests. A suggestion
        is a proposal, not a guarantee of better results. Review it before accepting.
      </p>
      {busy && <p role="status">Loading, generating or saving a suggestion...</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-emerald-800">
          {notice}
        </p>
      )}
      {visible.map((p) => (
        <article key={p.id} className="border rounded-xl p-4 space-y-2">
          <h3 className="font-bold">
            {habits.find((h) => h.id === p.habit_id)?.name}: AI{' '}
            {p.field === 'anchor' ? 'cue adjustment' : 'normal action adjustment'}
          </h3>
          <p className="text-sm">When suggested: {p.before}</p>
          <p className="font-semibold">Proposed: {p.after}</p>
          <p className="text-sm">{p.rationale}</p>
          <p className="text-xs">
            Your activity: {p.evidence.normal} normal completions, {p.evidence.minimum} tiny
            completions, {p.evidence.skipped} days marked as skipped. Days without a check-in are
            not counted as skipped.
          </p>
          {Object.entries(p.evidence.reasons || {}).map(([reason, count]) => (
            <p key={reason} className="text-xs">
              {reasonLabels[reason] || reason}: {count} skips
            </p>
          ))}
          {p.status === 'pending' ? (
            <>
              <p className="text-xs">
                Accept changes only this field. If you edit this habit, you will need a new
                suggestion.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={blocked}
                  className="button button--primary"
                  onClick={() => decide(p, true)}
                >
                  Accept AI change
                </button>
                <button
                  disabled={blocked}
                  className="button button--secondary"
                  onClick={() => decide(p, false)}
                >
                  Keep current
                </button>
              </div>
            </>
          ) : (
            <p className="pill">
              {p.status === 'accepted' ? 'Change applied' : 'Habit kept as it is'}
            </p>
          )}
        </article>
      ))}
    </section>
  );
};
