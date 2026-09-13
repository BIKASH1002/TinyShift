import { userMessage } from './lib/userMessage';
import React, { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Brand, LoadingState } from './components/ui';
import { Session } from '@supabase/supabase-js';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { AddHabitScreen } from './screens/AddHabitScreen';
import { EditHabitScreen } from './screens/EditHabitScreen';
import { RescueScreen } from './screens/RescueScreen';
import { AdaptiveScreen } from './screens/AdaptiveScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PasswordRecoveryScreen } from './screens/PasswordRecoveryScreen';
import { BottomTabNavigation, TabType } from './components/BottomTabNavigation';
import { CompletionMode, Habit, RescueReason } from './types';
import supabase from './lib/supabaseClient';
import { setCacheAccount } from './lib/dataCache';
import { getCurrentSession, logoutUser } from './lib/auth';
import { createHabit, getTodayHabits, markHabitDone, skipHabit } from './lib/habitService';

export default function App() {
  const [screen, setScreen] = useState<
    'onboarding' | 'login' | 'main' | 'add' | 'edit' | 'recovery' | 'deleted'
  >(() =>
    new URLSearchParams(window.location.search).get('account') === 'recovery' ||
    new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'
      ? 'recovery'
      : 'onboarding',
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('today');
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [rescueId, setRescueId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    const result = await logoutUser();
    if (!result.success) throw new Error(result.error || 'Could not sign out. Please try again.');
  }
  const mainRef = useRef<HTMLElement>(null);
  const navigationReady = useRef(false);
  useEffect(() => {
    if (navigationReady.current) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const heading = mainRef.current?.querySelector('h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
    navigationReady.current = true;
  }, [screen, tab]);
  async function load() {
    const result = await getTodayHabits();
    if (!result.success) throw new Error(result.error);
    setHabits(result.data || []);
  }
  useEffect(() => {
    let active = true;
    getCurrentSession().then((r) => {
      if (!active) return;
      setCacheAccount(r.data?.session?.user.id || null);
      setSession(r.data?.session || null);
      if (r.data?.session) setScreen((current) => (current === 'recovery' ? current : 'main'));
      if (!r.success) setError(userMessage(r.error) || 'Could not restore session.');
      setChecking(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setCacheAccount(next?.user.id || null);
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setScreen('recovery');
      if (!next) {
        setHabits([]);
        setScreen((current) =>
          current === 'deleted' || current === 'recovery' ? current : 'onboarding',
        );
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setHabits([]);
    setError('');
    if (session)
      getTodayHabits().then((r) => {
        if (!active) return;
        if (r.success) setHabits(r.data || []);
        else setError(userMessage(r.error) || 'Could not load habits.');
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  async function complete(id: string, mode: CompletionMode) {
    const result = await markHabitDone(id, mode);
    if (!result.success) throw new Error(result.error);
    await load();
  }
  async function skip(id: string, reason: RescueReason) {
    const result = await skipHabit(id, reason);
    if (!result.success) throw new Error(result.error);
    await load();
  }
  async function add(data: Partial<Habit>) {
    const result = await createHabit({
      name: data.name || '',
      category: data.category,
      frequency: data.frequency,
      anchor: data.anchor || '',
      normalVersion: data.normalVersion || data.name || '',
      minimumVersion: data.minimumVersion || '',
      motivation: data.motivation,
    });
    if (!result.success) throw new Error(result.error);
    setScreen('main');
    setTab('today');
    load().catch(() => setError('Habit created, but the summary could not refresh. Reload Today.'));
  }
  const rescue = (id: string) => {
    setRescueId(id);
    setTab('rescue');
  };
  let content: React.ReactNode;
  if (checking) content = <LoadingState label="Getting things ready…" />;
  else if (screen === 'deleted')
    content = (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Account deleted</h1>
        <p>Your login and saved TinyShift data were removed. This cannot be undone in the app.</p>
        <button
          className="underline"
          onClick={() => window.location.replace(import.meta.env.BASE_URL)}
        >
          Return to start
        </button>
      </div>
    );
  else if (screen === 'recovery')
    content = (
      <PasswordRecoveryScreen
        hasSession={!!session}
        onFinished={() => {
          window.history.replaceState(null, '', window.location.pathname);
          setSession(null);
          setHabits([]);
          setScreen('login');
        }}
      />
    );
  else if (screen === 'onboarding')
    content = <OnboardingScreen onGetStarted={() => setScreen('login')} />;
  else if (!session)
    content = (
      <LoginScreen
        onLoginSuccess={() => {
          setScreen('main');
          setTab('today');
        }}
      />
    );
  else if (screen === 'add')
    content = <AddHabitScreen onAddHabit={add} onClose={() => setScreen('main')} />;
  else if (screen === 'edit' && editingId)
    content = (
      <EditHabitScreen
        key={editingId}
        id={editingId}
        onClose={() => setScreen('main')}
        onSaved={() => {
          setScreen('main');
          setTab('today');
          load().catch(() =>
            setError('Habit saved, but the summary could not refresh. Reload Today.'),
          );
        }}
      />
    );
  else if (tab === 'today' || tab === 'refresh')
    content = (
      <AdaptiveScreen
        key={session.user.id + tab}
        view={tab === 'today' ? 'today' : 'weekly'}
        onChanged={load}
        onRescue={rescue}
        onAdd={() => setScreen('add')}
        onEdit={(id) => {
          setEditingId(id);
          setScreen('edit');
        }}
        onWeekly={() => setTab('refresh')}
      />
    );
  else if (tab === 'rescue')
    content = (
      <RescueScreen
        key={rescueId}
        habits={habits}
        initialHabitId={rescueId}
        onUseMinimum={(id) => complete(id, 'minimum')}
        onSkip={skip}
      />
    );
  else if (tab === 'insights') content = <InsightsScreen key={session.user.id} insights={[]} />;
  else
    content = (
      <ProfileScreen
        key={session.user.id}
        onDeleted={() => {
          setCacheAccount(null);
          setScreen('deleted');
          setSession(null);
          setHabits([]);
          setError('');
          void supabase.auth.signOut({ scope: 'local' });
        }}
      />
    );
  const showNavigation = !!session && screen === 'main';
  const showLanding = !checking && !session && screen === 'onboarding';
  return (
    <div
      className={`app-shell ${showNavigation ? 'app-shell--signed-in' : 'app-shell--focused'}${showLanding ? ' app-shell--landing' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {showLanding ? (
        <header className="landing-header">
          <div className="landing-header-inner">
            <Brand />
            <nav aria-label="Welcome navigation">
              <a href="#how-it-works">How it works</a>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setScreen('login')}
              >
                Sign in
              </button>
            </nav>
          </div>
        </header>
      ) : (
        <aside className="app-rail">
          <div className="app-brand">
            <Brand ready={showNavigation && !checking} />
          </div>
          {showNavigation && (
            <BottomTabNavigation
              activeTab={tab}
              onChangeTab={(next) => {
                setTab(next);
                setRescueId(null);
              }}
            />
          )}
          {showNavigation && (
            <div className="rail-footer">
              <button
                type="button"
                className="button button--quiet rail-signout"
                disabled={signingOut}
                aria-busy={signingOut}
                onClick={async () => {
                  if (signingOut) return;
                  setSigningOut(true);
                  setError('');
                  try {
                    await signOut();
                  } catch (e) {
                    setError(userMessage(e, 'Could not sign out. Please try again.'));
                  } finally {
                    setSigningOut(false);
                  }
                }}
              >
                <LogOut size={18} aria-hidden="true" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </aside>
      )}
      <main id="main-content" ref={mainRef} tabIndex={-1} className="app-main">
        {error && <p role="alert">{error}</p>}
        {content}
      </main>
      {showLanding && (
        <footer className="landing-footer">
          <div>© 2026 TinyShift</div>
        </footer>
      )}
    </div>
  );
}
