import { userMessage } from '../lib/userMessage';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, UserRound, Pencil, Check, X } from 'lucide-react';
import { prepareProfilePhoto } from '../lib/profilePhoto';
import { peekCache } from '../lib/dataCache';
import { useRefreshSignal } from '../lib/useRefreshSignal';
import { AccountProfile, loadProfile, saveProfile } from '../lib/profileService';
import { ReminderSettings } from '../components/ReminderSettings';
import { AccountControls } from '../components/AccountControls';
import { PageHeader, LoadingState, IconButton } from '../components/ui';
interface Props {
  onDeleted: () => void;
}
export const ProfileScreen: React.FC<Props> = ({ onDeleted }) => {
  const [profile, setProfile] = useState<AccountProfile | null>(
    () => peekCache<AccountProfile>('profile') || null,
  );
  const [name, setName] = useState(() => peekCache<AccountProfile>('profile')?.name || '');
  const [photo, setPhoto] = useState<string | null>(
    () => peekCache<AccountProfile>('profile')?.avatarUrl || null,
  );
  const dirty = useRef(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(() => !peekCache('profile'));
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const refreshSignal = useRefreshSignal(!busy && !dirty.current && !editingName);
  useEffect(() => {
    let active = true;
    setLoading(!peekCache('profile'));
    setLoadError('');
    loadProfile(revision > 0)
      .then((value) => {
        if (active && !dirty.current) {
          setProfile(value);
          setName(value.name);
          setPhoto(value.avatarUrl);
          setPhotoFailed(false);
        }
      })
      .catch((e) => {
        if (active) setLoadError(userMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, refreshSignal]);
  return (
    <div className="page page--tab">
      <PageHeader
        editorial
        eyebrow="Make yourself at home"
        title="Your profile"
        accent="profile"
        description="Manage your preferences, reminders and personal information here."
      />
      {loading && <LoadingState label="Loading your profile…" />}
      {loadError && (
        <div role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            disabled={busy || loading}
            className="text-link"
            onClick={() => {
              if (
                profile &&
                (name !== profile.name || photo !== profile.avatarUrl) &&
                !window.confirm('Discard unsaved profile changes and try loading again?')
              )
                return;
              dirty.current = false;
              setEditingName(false);
              setRevision((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
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
      {!loading && profile && (
        <form
          className="surface space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            setMessage('');
            try {
              const saved = await saveProfile(name, profile.updatedAt, photo);
              dirty.current = false;
              setEditingName(false);
              setProfile(saved);
              setName(saved.name);
              setPhoto(saved.avatarUrl);
              setMessage('Profile saved.');
            } catch (e) {
              setError(userMessage(e, 'Could not save profile.'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="profile-identity">
            <div className="profile-avatar">
              {photo && !photoFailed ? (
                <img
                  src={photo}
                  alt="Your profile photo"
                  referrerPolicy="no-referrer"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <UserRound size={48} strokeWidth={1.5} aria-hidden="true" />
              )}
            </div>
            <div
              className={
                editingName || photo !== profile.avatarUrl
                  ? 'profile-name-row profile-name-row--editing'
                  : 'profile-name-row'
              }
            >
              {editingName ? (
                <input
                  autoFocus
                  required
                  maxLength={100}
                  disabled={busy}
                  aria-label="Display name"
                  autoComplete="nickname"
                  value={name}
                  className="profile-name-input"
                  onChange={(e) => {
                    dirty.current = true;
                    setName(e.target.value);
                    setMessage('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && !busy) {
                      e.preventDefault();
                      setName(profile.name);
                      setEditingName(false);
                      dirty.current = photo !== profile.avatarUrl;
                    }
                  }}
                />
              ) : (
                <h2>{profile.name || 'Your profile'}</h2>
              )}
              <div className="profile-name-actions">
                {!editingName && (
                  <IconButton
                    label="Edit"
                    accessibleLabel="Edit display name"
                    disabled={busy}
                    onClick={() => {
                      setName(profile.name);
                      setEditingName(true);
                      setMessage('');
                    }}
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </IconButton>
                )}
                {(editingName || photo !== profile.avatarUrl) && (
                  <IconButton
                    type="submit"
                    label={busy ? 'Saving…' : 'Save'}
                    accessibleLabel="Save profile changes"
                    disabled={busy || !name.trim()}
                    aria-busy={busy}
                  >
                    <Check size={18} aria-hidden="true" />
                  </IconButton>
                )}
                {editingName && (
                  <IconButton
                    label="Cancel"
                    accessibleLabel="Cancel name editing"
                    disabled={busy}
                    onClick={() => {
                      setName(profile.name);
                      setEditingName(false);
                      dirty.current = photo !== profile.avatarUrl;
                    }}
                  >
                    <X size={17} aria-hidden="true" />
                  </IconButton>
                )}
              </div>
            </div>
            <p className="help-text profile-email">{profile.email || 'Email not available'}</p>
            <div className="action-row">
              <button
                type="button"
                className="button button--secondary"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Camera size={16} aria-hidden="true" />
                {photo ? 'Change photo' : 'Add photo'}
              </button>
              {photo && (
                <button
                  type="button"
                  className="button button--quiet"
                  disabled={busy}
                  onClick={() => {
                    dirty.current = true;
                    setPhoto(null);
                    setPhotoFailed(false);
                    setMessage('Select the tick beside your name to save the photo removal.');
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              aria-label="Choose profile photo"
              disabled={busy}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                dirty.current = true;
                setBusy(true);
                setError('');
                setMessage('');
                try {
                  setPhoto(await prepareProfilePhoto(file));
                  setPhotoFailed(false);
                  setMessage('Photo ready. Select the tick beside your name to save it.');
                } catch (error) {
                  setError(
                    userMessage(error, 'We could not prepare your photo. Please try another.'),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            <p className="help-text">
              JPG, PNG or WebP up to 5 MB. Your photo is cropped to a square.
            </p>
          </div>
        </form>
      )}
      <ReminderSettings />
      {profile && <AccountControls email={profile.email} onDeleted={onDeleted} />}
    </div>
  );
};
