/**
 * The Krishi Mitra mark.
 *
 * ★ Why this exists: the splash screen drew its emblem as the literal text
 *   `SETU` inside two nested circles — a leftover from the project's earlier
 *   name. The app is called Krishi Mitra everywhere else, so the first screen
 *   a farmer and a judge both see was branded as a different product.
 *
 * ★ What it draws: a sprout rising out of an arch. The arch is the *setu*
 *   (bridge) the project was originally named for, kept as a shape rather than
 *   a word; the sprout is the crop. Together they say what the product does —
 *   it stands between a farmer and the market — without needing a language.
 *
 * ★ It is one path set at every size. The leaves thin out and the second leaf
 *   drops below 28px, because at tab-bar size two leaves turn into a smudge;
 *   everything else scales. That keeps the app icon, the splash emblem and the
 *   28px tab glyph recognisably the same mark instead of three drawings.
 *
 * ★ No PNG. `react-native-svg` is already a dependency and the mark is a
 *   dozen path commands, so shipping raster assets at five densities would be
 *   more bytes and more drift for no gain.
 */

import React from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';

import { colors } from '../../theme/tokens';

interface LogoProps {
  /** Rendered width and height in dp. */
  size?: number;
  /** The disc behind the mark. Defaults to the brand terracotta. */
  background?: string;
  /** The arch and stem. Defaults to the light tint that reads on terracotta. */
  foreground?: string;
  /**
   * Draw only the sprout and arch, with no disc behind them — for placing the
   * mark on a surface that already provides its own shape.
   */
  bare?: boolean;
}

export function Logo({
  size = 48,
  background = colors.primary,
  foreground = colors.onPrimaryContainer,
  bare = false,
}: LogoProps) {
  // Below this the second leaf stops being a leaf and starts being noise.
  const twoLeaves = size >= 28;
  // The stroke has to grow faster than the box or the mark turns spindly when
  // it shrinks; 86 is the viewBox, so these are viewBox units.
  const stroke = size >= 40 ? 4.5 : size >= 28 ? 6 : 7.5;

  return (
    <Svg width={size} height={size} viewBox="0 0 86 86">
      {!bare && <Circle cx={43} cy={43} r={41} fill={background} />}
      <G>
        {/* The bridge — a shallow arch, not a semicircle: a semicircle reads
            as a rainbow, and this has to read as a span. */}
        <Path
          d="M22 58 Q43 36 64 58"
          stroke={foreground}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        {/* The stem, rising through the arch's crown. */}
        <Path
          d="M43 56 L43 34"
          stroke={foreground}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Left leaf — the one that survives at every size. */}
        <Path d="M43 40 Q31 36 30 25 Q42 26 43 40Z" fill={colors.positiveContainer} />
        {twoLeaves && (
          <Path d="M43 44 Q55 40 56 29 Q44 30 43 44Z" fill={colors.tertiaryContainer} />
        )}
      </G>
    </Svg>
  );
}
