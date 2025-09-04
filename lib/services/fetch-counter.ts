// Simple in-memory fetch counter to measure number of fetches per scope/key
// Works in both server and client runtimes (per process/tab).

type Scope = string | number | undefined | null;

class FetchCounter {
  private counts = new Map<string, number>();

  private key(base: string, scope?: Scope) {
    return `${base}|${scope ?? 'all'}`;
  }

  increment(base: string, scope?: Scope) {
    const k = this.key(base, scope);
    const next = (this.counts.get(k) || 0) + 1;
    this.counts.set(k, next);
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[fetch-counter] ${base} scope=${scope ?? 'all'} count=${next}`);
    }
    return next;
  }

  getCount(base: string, scope?: Scope) {
    return this.counts.get(this.key(base, scope)) || 0;
  }

  getAll() {
    return Array.from(this.counts.entries()).reduce<Record<string, number>>(
      (acc, [k, v]) => {
        acc[k] = v;
        return acc;
      },
      {}
    );
  }

  reset(base?: string) {
    if (!base) {
      this.counts.clear();
      return;
    }
    for (const k of Array.from(this.counts.keys())) {
      if (k.startsWith(`${base}|`)) this.counts.delete(k);
    }
  }
}

export const fetchCounter = new FetchCounter();

