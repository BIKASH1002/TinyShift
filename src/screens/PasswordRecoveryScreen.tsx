import { userMessage } from '../lib/userMessage';
import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';
import { updateAccountPassword } from '../lib/accountService';
export const PasswordRecoveryScreen: React.FC<{ hasSession: boolean; onFinished: () => void }> = ({
  hasSession,
  onFinished,
}) => {
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false),
    [updated, setUpdated] = useState(false),
    [error, setError] = useState('');
  async function finish() {
    const { error } = await supabase.auth.signOut({ scope: updated ? 'global' : 'local' });
    if (error) throw new Error('Could not sign out. Please retry.');
    onFinished();
  }
  return (
    <div className="auth-page space-y-4">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      {!hasSession && !updated && (
        <p>
          The recovery link is invalid, expired, or already used. Return to sign in and request
          another.
        </p>
      )}
      {updated && <p role="status">Password updated. Sign in with your new password.</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {hasSession && !updated && (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            try {
              if (password !== confirm) throw new Error('Passwords do not match.');
              await updateAccountPassword(password);
              setPassword('');
              setConfirm('');
              setUpdated(true);
              const result = await supabase.auth.signOut();
              if (result.error)
                throw new Error(
                  'Password updated, but sign-out failed. Use Return to sign in to retry.',
                );
              onFinished();
            } catch (e) {
              setError(userMessage(e, 'Could not update password.'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            New password
            <input
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full border rounded-xl p-3 mt-1"
            />
          </label>
          <label className="block">
            Confirm password
            <input
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              disabled={busy}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="block w-full border rounded-xl p-3 mt-1"
            />
          </label>
          <button disabled={busy} className="button button--primary">
            Update password
          </button>
        </form>
      )}
      <button
        disabled={busy}
        className="underline"
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await finish();
          } catch (e) {
            setError(userMessage(e, 'Could not sign out.'));
          } finally {
            setBusy(false);
          }
        }}
      >
        Return to sign in
      </button>
    </div>
  );
};
