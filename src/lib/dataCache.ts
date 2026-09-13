// Memory only. Never persist personal data or reuse it across authentication changes.
interface Entry {
  value?: unknown;
  expires: number;
  pending?: Promise<unknown>;
}
const entries = new Map<string, Entry>();
let owner: string | null = null;
let generation = 0;
export function setCacheAccount(id: string | null) {
  if (owner === id) return;
  owner = id;
  generation++;
  entries.clear();
}
export function peekCache<T>(key: string): T | undefined {
  return owner ? (entries.get(key)?.value as T | undefined) : undefined;
}
export function invalidateCache(...prefixes: string[]) {
  for (const key of entries.keys())
    if (prefixes.some((prefix) => key.startsWith(prefix))) entries.delete(key);
}
export function invalidateHabitData() {
  invalidateCache(
    'habits',
    'activity:',
    'routine:',
    'context:',
    'week:',
    'history:',
    'proposals:',
    'adjustments:',
  );
}
export function putCache<T>(id: string, key: string, value: T) {
  if (id === owner) entries.set(key, { value, expires: Date.now() + 60000 });
}
export function readCache<T>(
  id: string,
  key: string,
  fetcher: () => Promise<T>,
  force = false,
): Promise<T> {
  if (id !== owner)
    return Promise.reject(new Error('Your account changed. Please reopen this screen.'));
  const existing = entries.get(key);
  if (existing?.pending) return existing.pending as Promise<T>;
  if (!force && existing && existing.expires > Date.now())
    return Promise.resolve(existing.value as T);
  const epoch = generation;
  const entry: Entry = { value: existing?.value, expires: 0 };
  const promise = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      if (owner !== id || generation !== epoch)
        throw new Error('This information changed while loading. Please reload the screen.');
      if (entries.get(key) !== entry) {
        const replacement = entries.get(key);
        if (replacement?.value !== undefined) return replacement.value as T;
        throw new Error('This information changed while loading. Please reload the screen.');
      }
      entry.value = value;
      entry.expires = Date.now() + 60000;
      entry.pending = undefined;
      return value;
    })
    .catch((error) => {
      if (entries.get(key) === entry) {
        entry.pending = undefined;
        entry.expires = 0;
      }
      throw error;
    });
  entry.pending = promise;
  entries.set(key, entry);
  return promise;
}
