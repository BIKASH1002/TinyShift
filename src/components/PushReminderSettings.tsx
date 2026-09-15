import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from './ui';
import { disablePush, enablePush, pushConfigured, pushStatus, pushSupport } from '../lib/pushService';
import { userMessage } from '../lib/userMessage';

export function PushReminderSettings({ scheduled }: { scheduled: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const changing = useRef(false);
  const refreshVersion = useRef(0);
  const unsupported = pushSupport();
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (changing.current) return;
      const version = ++refreshVersion.current;
      const current = () => alive && version === refreshVersion.current;
      pushStatus().then(value => { if (current()) { setEnabled(value); setError(''); } })
        .catch(e => { if (current()) setError(userMessage(e)); })
        .finally(() => { if (current()) setBusy(false); });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); };
  }, []);
  async function change(action: () => Promise<void>, next: boolean, message: string) {
    if (busy || changing.current) return;
    changing.current = true;
    refreshVersion.current++;
    setBusy(true); setError(''); setNotice('');
    try {
      await action();
      setEnabled(next); setNotice(message);
    } catch (e) { setError(userMessage(e)); }
    finally { changing.current = false; setBusy(false); }
  }
  return (
    <section className="space-y-3 border-t pt-5" aria-label="Push reminders">
      <h3 className="flex items-center gap-2"><Bell size={18} aria-hidden="true" />Push reminders</h3>
      <p className="help-text">
        Optional notifications on this device, using your saved daily and weekly reminder times.
        They can appear when TinyShift is closed. No habit names or personal details appear on your lock screen.
      </p>
      <p role="status">{busy ? 'Updating push reminders…' : enabled ? 'On for this device' : 'Off for this device'}</p>
      {unsupported && <p className="help-text">{unsupported}</p>}
      {!unsupported && !pushConfigured() && <p className="help-text">Push reminders are not available yet. In-app reminders still work.</p>}
      {!scheduled && <p className="help-text">Choose and save a daily or weekly reminder above to receive scheduled notifications.</p>}
      {!unsupported && (
        <div className="action-row">
          {enabled ? (
            <Button variant="secondary" disabled={busy}
              onClick={() => change(() => disablePush(), false, 'Push reminders are off for this device.')}>
              <BellOff size={16} aria-hidden="true" />Turn off on this device
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy || !pushConfigured() || !scheduled}
              onClick={() => change(enablePush, true, 'Push reminders are on. Your next saved reminder time will be used.')}>
              Enable on this device
            </Button>
          )}
        </div>
      )}
      <Button variant="quiet" disabled={busy}
        onClick={() => change(() => disablePush(true), false, 'Push reminders are off on all your devices.')}>
        Turn off on all devices
      </Button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p className="help-text">
        Notification actions open Today, Rescue or your weekly review. Mark a step done only after you do it.
        Delivery depends on your browser and device settings. Signing out turns push off on this device.
      </p>
    </section>
  );
}
