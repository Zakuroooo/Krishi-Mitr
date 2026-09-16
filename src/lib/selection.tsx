/**
 * What the farmer is currently asking about: a crop, a district, a mandi.
 *
 * ★ Why this is app-level state rather than screen state. The Market screen
 *   owned the crop and district pickers in its own `useState`, so switching to
 *   tomato moved that screen's price, chart and forecast — and left Home still
 *   asking about onion at Lasalgaon, because Home read the `DEFAULT_*`
 *   constants directly. The two screens disagreed about what the farmer was
 *   looking at.
 *
 *   That is the exact seam a judge finds: change the crop, go back to Home,
 *   and the recommendation has not moved. One inconsistent number is enough to
 *   stop believing the rest of the screen, which is a much larger loss than
 *   the bug itself.
 *
 * ★ Persisted, because the crop a farmer grows does not change between app
 *   launches and re-picking it every time is a chore for the one person we
 *   cannot ask to do chores.
 *
 * ★ It holds the *question*, never the answer. No prices, no verdict, no
 *   forecast — those stay in TanStack Query, keyed off these values, so
 *   changing a picker invalidates and refetches everything that depends on it
 *   rather than leaving a stale number behind.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_COMMODITY_ID,
  DEFAULT_DISTRICT_ID,
  DEFAULT_MARKET_ID,
} from '../config';

const KEY = 'app.selection';

export interface Selection {
  commodityId: string;
  districtId: string;
  /** `null` until a district's market list has loaded and one is chosen. */
  marketId: string | null;
}

interface SelectionContextValue extends Selection {
  setCommodity: (id: string) => void;
  setDistrict: (id: string) => void;
  setMarket: (id: string | null) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

const INITIAL: Selection = {
  commodityId: DEFAULT_COMMODITY_ID,
  districtId: DEFAULT_DISTRICT_ID,
  marketId: DEFAULT_MARKET_ID,
};

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [sel, setSel] = useState<Selection>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw || cancelled) return;
        const saved = JSON.parse(raw) as Partial<Selection>;
        setSel(cur => ({
          commodityId: saved.commodityId ?? cur.commodityId,
          districtId: saved.districtId ?? cur.districtId,
          marketId: saved.marketId ?? cur.marketId,
        }));
      } catch {
        // A corrupt or absent selection is not worth a crash on launch — the
        // demo defaults are a perfectly good starting point.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Selection) => {
    setSel(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<SelectionContextValue>(
    () => ({
      ...sel,
      setCommodity: id => persist({ ...sel, commodityId: id }),
      // ★ Changing district clears the mandi. Markets are district-scoped, so
      //   keeping the old one would leave Home asking about a mandi that is
      //   not in the new district's list — a silently wrong question rather
      //   than a visible empty state.
      setDistrict: id => persist({ ...sel, districtId: id, marketId: null }),
      setMarket: id => persist({ ...sel, marketId: id }),
    }),
    [sel, persist],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used inside a SelectionProvider');
  return ctx;
}
