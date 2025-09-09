export function extractTokenFromStoreUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // Accept absolute or relative
    const parts = url.split('/store-unified/');
    if (parts.length < 2) return null;
    const tail = parts[1];
    const token = tail.split(/[?#/]/)[0]?.trim();
    if (!token) return null;
    // Basic sanity: hex tokens (32/64) or legacy 16-64
    const isHex = /^[a-f0-9]{32}$/i.test(token) || /^[a-f0-9]{64}$/i.test(token);
    const isLegacy = token.length >= 16 && token.length <= 64;
    return isHex || isLegacy ? token : null;
  } catch {
    return null;
  }
}

