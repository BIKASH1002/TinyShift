import React, { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useIsPresent } from 'motion/react';
import type { Habit } from '../../types';
import {
  assignLeafSlots,
  leafPosition,
  readLeafSlots,
  releaseLeafSlots,
  saveLeafSlots,
} from '../../lib/habitLeafSlots';
import { TreeIllustration } from './TreeIllustration';
import './HabitTree.css';

type TreeHabit = Pick<Habit, 'id' | 'name'>;
interface Props {
  accountId: string;
  habits: readonly TreeHabit[];
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
  newHabitId?: string | null;
  onGrowthShown?: () => void;
}
const shapes = [
  'M0 0 C-5-9-20-15-22-29 C-26-42-18-53-14-66 C-8-58 9-54 14-40 C21-25 9-12 0 0Z',
  'M0 0 C-12-9-26-17-28-32 C-30-46-25-54-26-64 C-12-59 3-53 8-40 C16-24 5-12 0 0Z',
  'M0 0 C-14-8-22-22-19-35 C-17-48-6-55-4-65 C0-54 14-47 17-34 C21-20 8-9 0 0Z',
];
const colors = ['#7e9741', '#a1ae53', '#69883c'];

// Seeded by habit ID so natural variation survives editing and navigation.
function leafAppearance(id: string, variant: number) {
  let seed = 2166136261;
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  const random = () => {
    seed += 0x6d2b79f5;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const scale = 0.58 + random() * 0.24;
  const tip = [-12, -22, -4][variant];
  const bend = 1 + random() * 5;
  let veins = `M-1-4 C${bend}-17 ${tip - 7}-32 ${tip}-52`;
  for (let index = 0; index < 6; index++) {
    const t = 0.22 + Math.floor(index / 2) * 0.19 + random() * 0.04;
    const u = 1 - t;
    const x = -(u ** 3) + 3 * u * u * t * bend + 3 * u * t * t * (tip - 7) + t ** 3 * tip;
    const y = -4 * u ** 3 - 51 * u * u * t - 96 * u * t * t - 52 * t ** 3;
    const side = index % 2 ? 1 : -1;
    const reach = 6 + random() * 4;
    const rise = 7 + random() * 5;
    veins += ` M${x} ${y} C${x + side * 2} ${y - 1} ${x + side * reach} ${y - rise * 0.35} ${x + side * reach} ${y - rise}`;
  }
  return { scale, veins };
}

const HabitLeaf = memo(function HabitLeaf({
  habit,
  slot,
  highlighted,
  grow,
  reduced,
  onHighlight,
}: {
  habit: TreeHabit;
  slot: number;
  highlighted: boolean;
  grow: boolean;
  reduced: boolean;
  onHighlight: Props['onHighlight'];
}) {
  const position = leafPosition(slot);
  const appearance = useMemo(
    () => leafAppearance(habit.id, position.variant),
    [habit.id, position.variant],
  );
  const pigmentId = useId();
  const present = useIsPresent();
  return (
    <motion.g
      data-habit-leaf={habit.id}
      data-leaf-slot={slot}
      initial={
        grow
          ? {
              opacity: 0,
              scale: reduced ? 0.98 : 0.12,
              rotate: reduced ? 0 : -18,
            }
          : false
      }
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.12 } }
          : {
              x: [0, 12, -7, 18, 10],
              y: [0, 35, 85, 150, 220],
              rotate: [0, 25, 65, 115, 170],
              opacity: [1, 1, 0.9, 0.5, 0],
              transition: { duration: 0.85, ease: 'easeInOut' },
            }
      }
      transition={
        reduced ? { duration: 0.12 } : { type: 'spring', duration: 0.6, bounce: 0.22 }
      }
      style={{ transformOrigin: position.x + 'px ' + position.y + 'px' }}
    >
      <g
        transform={`translate(${position.x} ${position.y}) rotate(${position.rotation}) scale(${position.scale * appearance.scale})`}
      >
        <motion.g
          animate={{ scale: highlighted && !reduced ? 1.1 : 1 }}
          transition={{ duration: 0.18 }}
          role="button"
          tabIndex={present ? 0 : -1}
          aria-hidden={!present}
          aria-label={habit.name}
          aria-pressed={highlighted}
          style={{ pointerEvents: present ? 'auto' : 'none' }}
          className={highlighted ? 'habit-leaf habit-leaf--active' : 'habit-leaf'}
          onPointerEnter={(event) => {
            if (event.pointerType !== 'touch') onHighlight(habit.id);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType !== 'touch') onHighlight(null);
          }}
          onFocus={() => onHighlight(habit.id)}
          onBlur={() => onHighlight(null)}
          onClick={() => onHighlight(highlighted ? null : habit.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onHighlight(habit.id);
            }
            if (event.key === 'Escape') onHighlight(null);
          }}
        >
          <title>{habit.name}</title>
          <defs>
            <clipPath id={pigmentId + '-outline'}>
              <path d={shapes[position.variant]} />
            </clipPath>
            <linearGradient id={pigmentId} x1="0" y1="0" x2="1" y2=".7">
              <stop stopColor="#d2d58b" />
              <stop offset=".34" stopColor={colors[position.variant]} />
              <stop offset=".55" stopColor="#a6bb62" />
              <stop offset="1" stopColor="#577436" />
            </linearGradient>
          </defs>
          <path
            d={shapes[position.variant]}
            fill={`url(#${pigmentId})`}
            stroke="#7f934e"
            strokeWidth=".55"
          />
          <path
            d="M0 3 Q-1-2-2-9"
            fill="none"
            stroke="#82924c"
            strokeWidth="1.8"
            strokeLinecap="round"
            pointerEvents="none"
          />
          <g clipPath={`url(#${pigmentId}-outline)`} pointerEvents="none">
            <path
              d={appearance.veins}
              fill="none"
              stroke="#e5e7b1"
              strokeWidth=".5"
              opacity=".5"
              pointerEvents="none"
            />
            <path
              d="M-2-5 Q-4-13-5-20"
              fill="none"
              stroke="#476632"
              strokeWidth=".5"
              opacity=".25"
              pointerEvents="none"
            />
          </g>
        </motion.g>
      </g>
    </motion.g>
  );
});

export function HabitTree({
  accountId,
  habits,
  highlightedId,
  onHighlight,
  newHabitId,
  onGrowthShown,
}: Props) {
  const ids = useMemo(() => habits.map((habit) => habit.id), [habits]);
  const [slots, setSlots] = useState(() =>
    assignLeafSlots(releaseLeafSlots(readLeafSlots(accountId), ids), ids),
  );
  const assigned = useMemo(() => assignLeafSlots(slots, ids), [slots, ids]);
  const mounted = useRef(false);
  const activeIds = useRef(ids);
  const reduced = !!useReducedMotion();
  useEffect(() => {
    activeIds.current = ids;
    mounted.current = true;
    setSlots(assigned);
    saveLeafSlots(accountId, assigned);
    if (newHabitId && ids.includes(newHabitId)) onGrowthShown?.();
  }, [accountId, assigned, ids, newHabitId, onGrowthShown]);
  const selected = habits.find((habit) => habit.id === highlightedId);
  return (
    <section className="habit-tree-panel" aria-label="Your habit tree">
      <div className="habit-tree-heading">
        <h2>Your habit tree</h2>
        <span className="pill">
          {habits.length} {habits.length === 1 ? 'habit' : 'habits'}
        </span>
      </div>
      <p className="help-text">One leaf for each active habit. There is no score to chase.</p>
      <svg
        className="habit-tree"
        viewBox="0 0 480 470"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Select a leaf to see its habit"
      >
        <TreeIllustration />
        <AnimatePresence
          onExitComplete={() => {
            setSlots((previous) => {
              const next = releaseLeafSlots(previous, activeIds.current);
              saveLeafSlots(accountId, next);
              return next;
            });
          }}
        >
          {habits.map((habit) => (
            <HabitLeaf
              key={habit.id}
              habit={habit}
              slot={assigned[habit.id]}
              highlighted={habit.id === highlightedId}
              grow={mounted.current || habit.id === newHabitId}
              reduced={reduced}
              onHighlight={onHighlight}
            />
          ))}
        </AnimatePresence>
      </svg>
      <p className="habit-tree-caption" aria-live="polite">
        {selected
          ? selected.name
          : habits.length
            ? 'Hover, tap or focus a leaf to find its habit.'
            : 'Add a habit and grow your tree.'}
      </p>
    </section>
  );
}
