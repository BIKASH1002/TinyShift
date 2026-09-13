import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}
interface Props {
  label: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** Select-only combobox: focus stays on the trigger; the active option is announced. */
export function SelectField({ label, value, options, disabled, onChange }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const selected = options.findIndex((option) => option.value === value);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const show = () => {
    if (disabled || !enabled.length) return;
    setActive(selected >= 0 && !options[selected].disabled ? selected : enabled[0]);
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled || disabled) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const place = () => {
      if (!trigger.current) return;
      const rect = trigger.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const flip = below < 200 && above > below;
      setPosition({
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(48, Math.min(280, flip ? above : below)),
        ...(flip ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    const list = menu.current;
    const option = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [open, active]);
  function keyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        show();
        return;
      }
      const index = enabled.indexOf(active);
      setActive(
        event.key === 'Home'
          ? enabled[0]
          : event.key === 'End'
            ? enabled[enabled.length - 1]
            : enabled[
                (index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
              ],
      );
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active);
      else show();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text =
        (now - search.current.time < 700 ? search.current.text : '') + event.key.toLowerCase();
      search.current = { text, time: now };
      const index = enabled.find((i) => options[i].label.toLowerCase().startsWith(text));
      if (!open) show();
      if (index !== undefined) setActive(index);
    }
  }
  return (
    <div className="select-field">
      <label id={id + '-label'} htmlFor={id} className="field-label">
        {label}
      </label>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        className="select-trigger"
        aria-labelledby={id + '-label'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id + '-list' : undefined}
        aria-activedescendant={open ? id + '-option-' + active : undefined}
        disabled={disabled || !enabled.length}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={keyDown}
        onBlur={() => setOpen(false)}
      >
        <span>{options[selected]?.label || 'Choose an option'}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id + '-list'}
            role="listbox"
            aria-labelledby={id + '-label'}
            className="select-menu"
            style={position}
            onMouseDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={id + '-option-' + index}
                role="option"
                aria-selected={value === option.value}
                aria-disabled={option.disabled || undefined}
                data-index={index}
                data-active={index === active || undefined}
                className="select-option"
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {value === option.value && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
