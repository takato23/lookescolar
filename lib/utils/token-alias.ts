export function normalizeAliasInput(raw: string): string {
  if (!raw) return '';

  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function looksLikeAlias(input: string, maxLength: number = 16): boolean {
  if (!input) return false;
  const normalized = normalizeAliasInput(input);
  return normalized.length > 0 && normalized.length <= maxLength;
}
