const windows = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;
const MAX_WINDOW_MS = 60 * 60 * 1000;

function stampsFor(key: string, now: number, windowMs: number): number[] | null {
  const stamps = (windows.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (stamps.length > 0) {
    windows.set(key, stamps);
    return stamps;
  }

  windows.delete(key);
  if (windows.size >= MAX_TRACKED_KEYS) {
    for (const [trackedKey, trackedStamps] of windows) {
      if (trackedStamps.every((stamp) => now - stamp >= MAX_WINDOW_MS)) {
        windows.delete(trackedKey);
      }
    }
  }

  return windows.size < MAX_TRACKED_KEYS ? [] : null;
}

export function allowRequest(key: string, limit = 20, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const stamps = stampsFor(key, now, windowMs);
  if (!stamps || stamps.length >= limit) return false;

  stamps.push(now);
  windows.set(key, stamps);
  return true;
}

export function resetRequestLimit(key: string): void {
  windows.delete(key);
}
