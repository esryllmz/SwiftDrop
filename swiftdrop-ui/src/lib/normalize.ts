export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hasOuterWhitespace(value: string): boolean {
  return value !== value.trim();
}
