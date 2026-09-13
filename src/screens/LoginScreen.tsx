import { userMessage } from '../lib/userMessage';
import React, { useState } from 'react';
import { loginUser, signUpUser } from '../lib/auth';
import { requestPasswordReset, validateNewPassword } from '../lib/accountService';
import { PageHeader } from '../components/ui';
export const LoginScreen: React.FC<{ onLoginSuccess: (routine: string) => void }> = ({
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="auth-page space-y-5">
      <PageHeader
        eyebrow="Your space to keep going"
        title={
          mode === 'reset'
            ? 'Reset your password'
            : mode === 'login'
              ? 'Welcome back'
              : 'Start your first tiny shift'
        }
        description={
          mode === 'reset'
            ? 'We’ll email you a link to choose a new password.'
            : mode === 'login'
              ? 'Your next small step is waiting for you.'
              : 'Start with one habit. You can build from there.'
        }
      />
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          setMessage('');
          try {
            if (mode === 'reset') {
              await requestPasswordReset(email);
              setMessage(
                'If email recovery is available for this address, a reset link will arrive shortly.',
              );
              return;
            }
            if (mode === 'signup') validateNewPassword(password);
            const result =
              mode === 'login'
                ? await loginUser(email.trim(), password)
                : await signUpUser(email.trim(), password, name.trim());
            if (!result.success) throw new Error(result.error);
            if (!result.data?.session)
              setMessage('Account created. Check your email to verify it, then sign in.');
            else onLoginSuccess('morning');
          } catch (e) {
            setError(userMessage(e, 'Could not sign in.'));
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === 'signup' && (
          <label className="block">
            Your name
            <input
              required
              disabled={busy}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="block w-full mt-2 p-3 rounded-xl border"
            />
          </label>
        )}
        <label className="block">
          Email
          <input
            required
            type="email"
            autoComplete="email"
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full mt-2 p-3 rounded-xl border"
          />
        </label>
        {mode !== 'reset' && (
          <label className="block">
            Password
            <input
              required
              type="password"
              minLength={mode === 'signup' ? 10 : 6}
              maxLength={mode === 'signup' ? 128 : undefined}
              disabled={busy}
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full mt-2 p-3 rounded-xl border"
            />
            {mode === 'signup' && <span className="field-help">Use 10–128 characters.</span>}
          </label>
        )}
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
        <button disabled={busy} aria-busy={busy} className="button button--primary w-full">
          {busy
            ? 'Please wait...'
            : mode === 'reset'
              ? 'Send reset link'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <button
          disabled={busy}
          className="underline text-sm"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setMessage('');
          }}
        >
          {mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
        </button>
        {mode === 'login' && (
          <button
            disabled={busy}
            className="underline text-sm"
            onClick={() => {
              setMode('reset');
              setPassword('');
              setError('');
              setMessage('');
            }}
          >
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
};
