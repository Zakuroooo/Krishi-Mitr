/**
 * Tab bar icons. Hand-rolled `react-native-svg`. Pranay.
 *
 * ★ Why this file exists at all: React Navigation does not render a text-only
 *   tab bar when you omit `tabBarIcon`. `bottom-tabs/BottomTabBar.js` substitutes
 *   its own `MissingIcon`, which renders the single codepoint U+23F7 (⏷) — and
 *   that codepoint has no glyph in the stock Android font, so it comes out as a
 *   tofu box ▯. Twelve tabs, twelve ▯. It is React Navigation's deliberate
 *   "you forgot your icons" marker and it reads, correctly, as unfinished.
 *
 * ★ Why not an icon library: `12_STACK.md` §2 bans `react-native-vector-icons`
 *   (a font asset per platform plus a native link step, for twelve glyphs).
 *   `react-native-svg` is already a dependency for the charts, so twelve paths
 *   in one file costs nothing new and nothing can fail to link.
 *
 * ★ Why outline, not filled: the icons carry no meaning a farmer relies on — the
 *   Marathi label below does. These exist so the bar reads as a finished product
 *   and so the shape gives a second, non-reading cue to which tab you are on.
 *   An outline at `strokeWidth` 1.9/2.6 thickens visibly when focused, which is
 *   the cheapest possible active state on a cheap screen in sunlight.
 *
 * Every path is drawn in a 24×24 box and scaled by the `size` React Navigation
 * hands us, so it tracks the platform's own icon sizing (25 round / 24 material).
 */

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** One per tab, farmer then buyer. Keys are referenced by name in both navigators. */
export type TabIconName =
  | 'home'
  | 'prices'
  | 'lots'
  | 'assistant'
  | 'demand'
  | 'matches'
  | 'offers'
  | 'deals'
  | 'ledger'
  | 'provenance'
  | 'dispute'
  | 'chat';

type Props = {
  name: TabIconName;
  /** React Navigation passes the resolved active/inactive tint. */
  color: string;
  /** React Navigation passes its platform icon size; the paths scale to it. */
  size: number;
  focused: boolean;
};

/**
 * `d` strings only — no per-icon components, no props threading. A tab icon that
 * needs more than two paths and a dot is too detailed to read at 24 px anyway.
 */
const PATHS: Record<TabIconName, readonly string[]> = {
  /** A house. The one icon that needs no explanation in any language. */
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V21h13V9.5'],
  /** Axes with a rising line — the same shape as S5/S7's own charts. */
  prices: ['M4 4v16h16', 'M7 16l3.5-4.2 3 2.4L20 8'],
  /** A crate, seen in isometric. "माझे लॉट" is a physical pile of onions. */
  lots: ['M12 3 20.5 7.5v9L12 21l-8.5-4.5v-9L12 3Z', 'M3.5 7.5 12 12l8.5-4.5', 'M12 12v9'],
  /** A speech bubble asking something — the help tab, not the chat tab. */
  assistant: [
    'M4 5h16v11h-8l-5 4v-4H4V5Z',
    'M10.3 8.6a1.8 1.8 0 1 1 2.5 1.7c-.6.3-1 .8-1 1.5',
  ],
  /** A megaphone: the buyer announcing what he wants to buy. */
  demand: ['M4 10v4.5l9.5 3.5V6.5L4 10Z', 'M13.5 8.6a4 4 0 0 1 0 6.8'],
  /** Two arrows passing each other — a demand meeting a lot. */
  matches: ['M4 8.5h10', 'M11.5 6 14 8.5 11.5 11', 'M20 15.5H10', 'M12.5 13 10 15.5 12.5 18'],
  /** A price tag. */
  offers: ['M4 11.5 11.5 4H20v8.5L12.5 20 4 11.5Z'],
  /** A handshake — the Stitch footer's own glyph for this tab. Drawn as two
   * forearms meeting at a clasp rather than the interlocked-fingers shape,
   * which turns to mush below about 20 px. */
  deals: [
    'M3 11.5l3-3 3.2 3.2a2 2 0 0 0 2.8 0L14 9.5',
    'M21 11.5l-3-3-3.4 3.4',
    'M9.2 11.7l2.3 2.3',
    'M11.5 14l1.8 1.8',
    'M3 11.5V15a2 2 0 0 0 2 2h1',
    'M21 11.5V15a2 2 0 0 1-2 2h-1',
  ],
  /** A ledger book with ruled lines. Append-only, so it is drawn closed. */
  ledger: ['M5.5 4h10.5a2 2 0 0 1 2 2v14H7.5a2 2 0 0 1-2-2V4Z', 'M9 8.5h6', 'M9 12h6', 'M9 15.5h4'],
  /** A chain link: where the number came from. */
  provenance: [
    'M9.8 14.2 14.2 9.8',
    'M11.4 7.6 13.1 5.9a3.6 3.6 0 0 1 5.1 5.1l-1.7 1.7',
    'M12.6 16.4l-1.7 1.7a3.6 3.6 0 0 1-5.1-5.1l1.7-1.7',
  ],
  /** An alert triangle. Deliberately the only sharp-cornered icon in the set. */
  dispute: ['M12 4 21 19.5H3L12 4Z', 'M12 10v4'],
  /** A plain speech bubble; the dots below distinguish it from `assistant`. */
  chat: ['M4 5h16v11h-8l-5 4v-4H4V5Z'],
};

/** Icons that need a dot no `d` string can carry legibly at this size. */
const DOTS: Partial<Record<TabIconName, readonly { cx: number; cy: number; r: number }[]>> = {
  assistant: [{ cx: 11.8, cy: 14.4, r: 0.95 }],
  dispute: [{ cx: 12, cy: 16.6, r: 0.95 }],
  offers: [{ cx: 15.6, cy: 8.4, r: 1.4 }],
  chat: [
    { cx: 9, cy: 10.5, r: 0.95 },
    { cx: 12, cy: 10.5, r: 0.95 },
    { cx: 15, cy: 10.5, r: 0.95 },
  ],
};

export function TabIcon({ name, color, size, focused }: Props) {
  // The focused weight is the whole active state. Keep the gap wide enough to
  // read across a mandi at arm's length, not a designer's 0.2 px nicety.
  const strokeWidth = focused ? 2.6 : 1.9;
  const dots = DOTS[name] ?? [];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map(d => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {dots.map(dot => (
        <Circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r={dot.r} fill={color} />
      ))}
    </Svg>
  );
}

/**
 * The shape React Navigation's `tabBarIcon` option wants. Written as a factory so
 * each `Tab.Screen` is one line and no navigator file repeats the destructuring.
 */
export function tabIcon(name: TabIconName) {
  return function renderTabIcon({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) {
    return <TabIcon name={name} color={color} size={size} focused={focused} />;
  };
}
