const windows = new Map<string, number[]>();

export function allowRequest(waId: string, limit = 20, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const stamps = (windows.get(waId) ?? []).filter((t) => now - t < windowMs);
  if (stamps.length >= limit) {
    windows.set(waId, stamps);
    return false;
  }
  stamps.push(now);
  windows.set(waId, stamps);
  return true;
}
