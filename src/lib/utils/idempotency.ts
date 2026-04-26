export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rs_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
