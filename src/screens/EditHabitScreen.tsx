import { userMessage } from '../lib/userMessage';
import React, { useEffect, useState } from 'react';
import { EditableHabit, getEditableHabit, updateHabit } from '../lib/habitService';
import { AddHabitScreen } from './AddHabitScreen';
export const EditHabitScreen: React.FC<{
  id: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ id, onClose, onSaved }) => {
  const [habit, setHabit] = useState<EditableHabit | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    getEditableHabit(id)
      .then((h) => {
        if (alive) setHabit(h);
      })
      .catch((e) => {
        if (alive) setError(userMessage(e, 'Could not load habit.'));
      });
    return () => {
      alive = false;
    };
  }, [id]);
  if (!habit)
    return (
      <div className="p-5 space-y-3">
        <p role={error ? 'alert' : 'status'}>{error || 'Loading habit...'}</p>
        <button onClick={onClose} className="underline">
          Back to habits
        </button>
      </div>
    );
  return (
    <AddHabitScreen
      initialDraft={habit.draft}
      onClose={onClose}
      onAddHabit={async (data) => {
        await updateHabit(
          habit.id,
          {
            name: data.name || '',
            category: data.category,
            frequency: data.frequency,
            anchor: data.anchor || '',
            normalVersion: data.normalVersion || '',
            minimumVersion: data.minimumVersion || '',
            motivation: data.motivation,
          },
          habit.updatedAt,
        );
        onSaved();
      }}
    />
  );
};
