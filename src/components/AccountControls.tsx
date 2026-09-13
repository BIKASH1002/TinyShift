import { userMessage } from '../lib/userMessage';
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  deleteMyAccount,
  downloadAccountExport,
  requestPasswordReset,
} from '../lib/accountService';
export const AccountControls: React.FC<{ email: string; onDeleted: () => void }> = ({
  email,
  onDeleted,
}) => {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState('');
  async function action(fn: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(message);
    } catch (e) {
      setError(userMessage(e, 'Account action failed.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="surface space-y-4">
        <h2 className="font-bold">Account and privacy</h2>
        <p className="text-sm">
          TinyShift saves your habits, check-ins and reflections so you can return to them. AI is
          optional. Before you use it, we explain what information will be shared and ask for your
          permission. Reminders do not use AI.
        </p>
        <details className="text-sm space-y-2">
          <summary className="cursor-pointer underline">
            Who helps us store your data and provide AI?
          </summary>
          <p>
            We use Supabase to store your account information and saved activity. When you choose an
            AI feature, the information listed beside its checkbox is sent to Google Gemini to
            prepare your suggestion or review.
          </p>
        </details>
        <p className="text-sm">
          You can download a copy of your saved information, including past habits, check-ins,
          reflections, suggestions and reminder settings. Keep this file private.
        </p>
        <details className="text-sm space-y-2">
          <summary className="cursor-pointer underline">What is included in my download?</summary>
          <p>
            It includes habits you removed from your routine and records of how often you used
            certain features. It does not include passwords, sign-in details that give access to
            your account, or AI reviews that disappear when you leave the screen. Copies and records
            kept separately by the companies that help run TinyShift are not included.
          </p>
        </details>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            className="button button--secondary"
            onClick={() =>
              action(
                downloadAccountExport,
                'Your download has started. Check your downloads folder.',
              )
            }
          >
            Download my data
          </button>
          <button
            disabled={busy || !email}
            className="button button--secondary"
            onClick={() =>
              action(
                () => requestPasswordReset(email),
                'If email recovery is available, a reset link will arrive shortly.',
              )
            }
          >
            Send password reset email
          </button>
        </div>
        {notice && (
          <p role="status" className="text-emerald-800">
            {notice}
          </p>
        )}
        {error && !confirming && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        {busy && <p role="status">Please wait...</p>}
      </section>
      <section className="account-deletion" aria-label="Delete your account">
        {!confirming ? (
          <button
            type="button"
            disabled={busy}
            className="button button--danger-outline"
            onClick={() => {
              setConfirming(true);
              setError('');
              setNotice('');
            }}
          >
            <Trash2 size={17} aria-hidden="true" />
            Delete my account
          </button>
        ) : (
          <form
            className="border border-red-300 bg-red-50 rounded-xl p-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || confirmation !== 'DELETE' || !password) return;
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await deleteMyAccount(password, confirmation);
                setPassword('');
                onDeleted();
              } catch (e) {
                setError(userMessage(e, 'Deletion failed.'));
              } finally {
                setPassword('');
                setBusy(false);
              }
            }}
          >
            <h3 className="font-bold text-red-900">Permanently delete this account?</h3>
            {error && (
              <p role="alert" className="text-red-800">
                {error}
              </p>
            )}
            <p className="text-sm">
              This permanently deletes your account and the information saved in TinyShift,
              including your habits, check-ins, reflections, suggestions and reminder settings. You
              cannot undo this. Download your data first if you want to keep a copy.
            </p>
            <p className="text-sm">
              Deleting your account may not remove information already shared with AI, or copies and
              records kept by the companies that help run TinyShift. Those companies decide how long
              they keep that information.
            </p>
            <label className="block text-sm">
              Current password
              <input
                type="password"
                required
                maxLength={1024}
                autoComplete="current-password"
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full p-3 border rounded-xl mt-1"
              />
            </label>
            <label className="block text-sm">
              Type DELETE to confirm
              <input
                required
                autoComplete="off"
                disabled={busy}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="block w-full p-3 border rounded-xl mt-1"
              />
            </label>
            <button
              disabled={busy || confirmation !== 'DELETE' || !password}
              className="button button--danger"
            >
              Permanently delete account
            </button>
            <button
              type="button"
              disabled={busy}
              className="underline ml-3"
              onClick={() => {
                setConfirming(false);
                setPassword('');
                setConfirmation('');
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </section>
    </>
  );
};
