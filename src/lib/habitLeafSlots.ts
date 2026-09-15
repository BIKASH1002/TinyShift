// Visual positions only: no habit names, activity or account tokens are stored.
export type LeafAssignments = Record<string, number>;
const memory = new Map<string, LeafAssignments>();
const keyFor = (accountId: string) => 'tinyshift:leaf-slots:v1:' + accountId;

export function assignLeafSlots(previous: LeafAssignments, ids: readonly string[]) {
  const used = new Set(Object.values(previous));
  let result = previous;
  for (const id of ids) {
    if (Object.prototype.hasOwnProperty.call(result, id)) continue;
    if (result === previous) result = { ...previous };
    let slot = 0;
    while (used.has(slot)) slot++;
    result[id] = slot;
    used.add(slot);
  }
  return result;
}

export function releaseLeafSlots(previous: LeafAssignments, activeIds: readonly string[]) {
  const active = new Set(activeIds);
  return Object.fromEntries(Object.entries(previous).filter(([id]) => active.has(id)));
}

export function readLeafSlots(accountId: string): LeafAssignments {
  try {
    const stored = localStorage.getItem(keyFor(accountId));
    if (!stored) return memory.get(accountId) || {};
    const raw: unknown = JSON.parse(stored);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const used = new Set<number>();
    const valid: LeafAssignments = {};
    for (const [id, slot] of Object.entries(raw)) {
      if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
      if (!Number.isSafeInteger(slot) || slot < 0 || used.has(slot)) continue;
      valid[id] = slot;
      used.add(slot);
    }
    return valid;
  } catch {
    return memory.get(accountId) || {};
  }
}

export function saveLeafSlots(accountId: string, slots: LeafAssignments) {
  memory.set(accountId, slots);
  try {
    localStorage.setItem(keyFor(accountId), JSON.stringify(slots));
  } catch {
    /* Memory fallback. */
  }
}

export function clearLeafSlots(accountId: string) {
  memory.delete(accountId);
  try {
    localStorage.removeItem(keyFor(accountId));
  } catch {
    /* Storage may be unavailable. */
  }
}

// Branch tips are intentionally asymmetric. Later layers add individual leaves,
// not a replacement canopy, and never reposition the first layer.
export const leafSlots = [
  { x: 237, y: 104, rotation: -12, scale: 1.15, variant: 0 },
  { x: 155, y: 172, rotation: -54, scale: 1.05, variant: 1 },
  { x: 313, y: 164, rotation: 48, scale: 1.12, variant: 2 },
  { x: 204, y: 133, rotation: -38, scale: 0.95, variant: 2 },
  { x: 279, y: 118, rotation: 28, scale: 1.03, variant: 1 },
  { x: 115, y: 205, rotation: -73, scale: 1.08, variant: 0 },
  { x: 356, y: 199, rotation: 66, scale: 1.05, variant: 1 },
  { x: 171, y: 126, rotation: -30, scale: 1.1, variant: 0 },
  { x: 305, y: 108, rotation: 35, scale: 0.96, variant: 2 },
  { x: 240, y: 164, rotation: 14, scale: 1.15, variant: 1 },
  { x: 136, y: 147, rotation: -60, scale: 0.98, variant: 2 },
  { x: 330, y: 133, rotation: 57, scale: 1.1, variant: 0 },
  { x: 190, y: 199, rotation: -48, scale: 1.14, variant: 1 },
  { x: 294, y: 210, rotation: 55, scale: 1.07, variant: 0 },
  { x: 212, y: 96, rotation: -25, scale: 0.96, variant: 0 },
  { x: 261, y: 90, rotation: 22, scale: 0.92, variant: 2 },
  { x: 92, y: 186, rotation: -58, scale: 0.95, variant: 1 },
  { x: 379, y: 182, rotation: 72, scale: 0.94, variant: 0 },
  { x: 150, y: 231, rotation: -86, scale: 1.03, variant: 2 },
  { x: 335, y: 240, rotation: 82, scale: 1.08, variant: 1 },
  { x: 181, y: 159, rotation: -15, scale: 1, variant: 2 },
  { x: 284, y: 154, rotation: 8, scale: 0.98, variant: 0 },
  { x: 220, y: 208, rotation: -23, scale: 1.05, variant: 1 },
  { x: 267, y: 226, rotation: 34, scale: 1.04, variant: 2 },
  { x: 112, y: 242, rotation: -104, scale: 0.9, variant: 0 },
  { x: 369, y: 234, rotation: 102, scale: 0.93, variant: 2 },
  { x: 192, y: 245, rotation: -69, scale: 1, variant: 0 },
  { x: 311, y: 267, rotation: 94, scale: 0.95, variant: 1 },
] as const;

export function leafPosition(slot: number) {
  const base = leafSlots[slot % leafSlots.length];
  const layer = Math.floor(slot / leafSlots.length);
  if (!layer) return base;
  return {
    ...base,
    x: base.x + Math.sin(layer * 2.4) * Math.min(18, layer * 5),
    y: base.y + Math.cos(layer * 2.4) * Math.min(16, layer * 4),
    rotation: base.rotation + (layer % 2 ? 16 : -16),
    scale: base.scale * 0.88,
  };
}
