/**
 * offline.ts — P11. Hand-rolled persistence for the TanStack Query cache, so
 * a cold start with no network renders the last known values (with a stale
 * banner) instead of an error screen.
 *
 * ★ No `@tanstack/react-query-persist-client`. CLAUDE.md §3 forbids a new
 *   dependency without asking the team, and the core `@tanstack/react-query`
 *   package already exports `dehydrate`/`hydrate` — the persist-client
 *   package is a wrapper around exactly those two functions plus a scheduler
 *   this file writes by hand instead.
 *
 * ★ Only successful queries are ever written. `dehydrate`'s default
 *   `shouldDehydrateQuery` already filters to `status === 'success'`; passed
 *   explicitly below so that guarantee is visible here, not just inherited.
 *
 * ★ Hydrated JSON is untrusted. It came from disk, not from the network, but
 *   the same rule applies: a corrupted or hand-edited cache file must not
 *   crash the app on boot. `isDehydratedState` checks the shape before a
 *   single byte of it reaches `hydrate()`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultShouldDehydrateQuery,
  dehydrate,
  hydrate,
} from '@tanstack/react-query';
import type { DehydratedState, QueryClient } from '@tanstack/react-query';

/**
 * Namespaced like every other AsyncStorage key in this app (`app.locale`,
 * `auth.token`) so a logout can clear this one key without touching those —
 * see `clearOfflineCache`.
 */
const CACHE_KEY = 'offline.query-cache.v1';

/** A screen with several queries settling in the same burst (S5/S6/S7 on one
 * tab switch, say) would otherwise trigger one disk write per query. */
const DEHYDRATE_DEBOUNCE_MS = 1000;

let debounceHandle: ReturnType<typeof setTimeout> | null = null;

interface UnknownDehydratedQuery {
  queryHash: string;
  queryKey: unknown[];
  state: Record<string, unknown>;
}

interface UnknownDehydratedState {
  queries: UnknownDehydratedQuery[];
}

function isDehydratedQuery(value: unknown): value is UnknownDehydratedQuery {
  if (typeof value !== 'object' || value === null) return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.queryHash === 'string' &&
    Array.isArray(q.queryKey) &&
    typeof q.state === 'object' &&
    q.state !== null
  );
}

/**
 * Not a full `DehydratedState` type check (that would mean re-deriving
 * `QueryState`'s internal shape by hand) — just enough structure that
 * `hydrate()` is never handed something that isn't at least shaped like
 * what `dehydrate()` produces. `hydrate` accepts `Partial<DehydratedState>`,
 * so `mutations` is optional here even though `dehydrate` always includes it.
 */
function isDehydratedState(value: unknown): value is UnknownDehydratedState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.queries)) return false;
  return candidate.queries.every(isDehydratedQuery);
}

/**
 * Call once, before the app's first render. Reads whatever was last written,
 * validates its shape, and hydrates the client — or does nothing at all if
 * there is no cache yet, the JSON is corrupt, or the shape is not what
 * `dehydrate()` would have produced. A bad cache degrades to "no cache", not
 * to a crash.
 */
export async function hydrateQueryClient(queryClient: QueryClient): Promise<void> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  if (!isDehydratedState(parsed)) return;

  // `isDehydratedState` has already confirmed `parsed` has a `queries` array
  // where every entry carries a `queryHash` string, a `queryKey` array and a
  // `state` object — the minimum `hydrate()` needs to not throw. Each
  // query's `state` is not re-derived field-by-field against `QueryState`
  // here (that would mean maintaining a second copy of an internal
  // TanStack Query type by hand); this cast reflects that the shape has
  // been checked as far as this function goes, not that it is unchecked.
  hydrate(queryClient, parsed as unknown as Partial<DehydratedState>);
}

/**
 * Subscribes to the query cache and writes a debounced dehydrated snapshot
 * to disk on every change. Returns the unsubscribe function so the caller
 * can tear it down (there is nowhere in this app that does today, but a
 * leaked subscription on a `QueryClient` that outlives the whole app process
 * is not worth guarding against — this exists so it is possible to).
 */
export function persistQueryClient(queryClient: QueryClient): () => void {
  return queryClient.getQueryCache().subscribe(() => {
    if (debounceHandle) clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => {
      const dehydrated = dehydrate(queryClient, {
        shouldDehydrateQuery: defaultShouldDehydrateQuery,
        shouldDehydrateMutation: () => false,
      });
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dehydrated)).catch(() => {
        // Best-effort. A disk write failing here must never surface to the
        // UI — the offline cache is a convenience on top of the network
        // path, not a source of truth anything else depends on.
      });
    }, DEHYDRATE_DEBOUNCE_MS);
  });
}

/**
 * For logout. Clears only this namespace — the auth token (`auth.token`)
 * and the locale choice (`app.locale`) are separate keys and are untouched.
 */
export async function clearOfflineCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
