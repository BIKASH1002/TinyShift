import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, Sprout } from 'lucide-react';
let brandEntranceShown = false;
export function Brand({ ready = false }: { ready?: boolean }) {
  const [entering, setEntering] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!ready || brandEntranceShown) return;
    let timer: number | undefined;
    const start = () => {
      window.clearTimeout(timer);
      if (document.hidden || brandEntranceShown) return;
      timer = window.setTimeout(() => {
        if (document.hidden || brandEntranceShown) return;
        brandEntranceShown = true;
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setEntering(true);
      }, 120);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', start);
    };
  }, [ready]);
  return (
    <span
      className={hovered ? 'brand brand--hovered' : 'brand'}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
    >
      <span className="brand-mark">
        <span
          className={entering ? 'brand-sprout brand-sprout--entering' : 'brand-sprout'}
          onAnimationEnd={() => setEntering(false)}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 41h27M24 41v-8c0-7 3-11 6-14" />
            <path d="M25 29C14 33 8 26 8 18c10-1 16 3 17 11Z" />
            <path d="M26 21C25 11 31 7 40 8c1 10-5 16-14 13Z" />
            <path d="M24 4v5M14 10l4 3" />
          </svg>
        </span>
      </span>
      <span className="brand-wordmark">
        <span className="brand-name">TinyShift</span>
        <span className="brand-caption">SMALL STEPS. REAL LIFE.</span>
      </span>
    </span>
  );
}
export function IconButton({
  label,
  accessibleLabel,
  danger = false,
  children,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string;
  accessibleLabel: string;
  danger?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <span className="icon-action">
      <button
        type="button"
        {...props}
        className={`icon-button ${danger ? 'icon-button--danger' : ''}`}
        aria-label={accessibleLabel}
        aria-describedby={visible ? id : undefined}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setVisible(false);
        }}
      >
        {children}
      </button>
      {visible && (
        <span id={id} role="tooltip" className="icon-tooltip">
          {label}
        </span>
      )}
    </span>
  );
}
export function Button({
  variant = 'primary',
  busy = false,
  children,
  className = '',
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`button button--${variant} ${className}`}
    >
      {busy && <LoaderCircle size={17} className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
const shownHeadingIntros = new Set<string>();
const HeadingCopy: React.FC<{
  title: string;
  accent?: string;
  description?: string;
  introKey?: string;
  editorial?: boolean;
}> = ({ title, accent, description, introKey, editorial }) => {
  const [phase, setPhase] = useState(() =>
    introKey && !shownHeadingIntros.has(introKey) ? 'pending' : 'done',
  );
  useEffect(() => {
    if (!introKey || phase !== 'pending') return;
    let frame = 0;
    const start = () => {
      if (document.hidden) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          shownHeadingIntros.add(introKey);
          setPhase(
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'done' : 'running',
          );
        });
      });
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', start);
    };
  }, [introKey, phase]);
  return (
    <div
      className={
        introKey || editorial
          ? `editorial-heading-copy${introKey && phase === 'pending' ? ' heading-intro-pending' : introKey && phase === 'running' ? ' heading-intro' : ''}`
          : undefined
      }
      onAnimationEnd={() => setPhase('done')}
    >
      <h1 tabIndex={-1}>
        {accent && title.includes(accent) ? (
          <>
            {title.slice(0, title.indexOf(accent))}
            <em>{accent}</em>
            {title.slice(title.indexOf(accent) + accent.length)}
          </>
        ) : (
          title
        )}
      </h1>
      {description && <p className="page-description">{description}</p>}
    </div>
  );
};
export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
  action,
  introKey,
  editorial = false,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  description?: string;
  action?: React.ReactNode;
  introKey?: string;
  editorial?: boolean;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <HeadingCopy
          key={introKey || 'plain'}
          title={title}
          accent={accent}
          description={description}
          introKey={introKey}
          editorial={editorial}
        />
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Sprout size={30} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function LoadingState({ label = 'Loading your routine…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-label">
        <LoaderCircle size={17} className="spinner" aria-hidden="true" />
        {label}
      </span>
      <div aria-hidden="true" className="skeleton" />
      <div aria-hidden="true" className="skeleton skeleton-short" />
    </div>
  );
}
export function displayDate(value: string) {
  return new Date(value + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
export function ConfirmDialog({
  open,
  title,
  children,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={id}>{title}</h2>
      <p className="help-text mt-3">{children}</p>
      <div className="form-footer mt-5">
        <Button autoFocus variant="secondary" onClick={onCancel}>
          Keep editing
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Discard changes
        </Button>
      </div>
    </dialog>
  );
}
