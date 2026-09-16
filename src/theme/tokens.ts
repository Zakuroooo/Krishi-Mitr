/**
 * Design tokens — transcribed verbatim from the approved Stitch export
 * (`krishi_mitra_farmer_ux/mandi_tactile_modern/DESIGN.md`, "Mandi Tactile
 * Modern"). This file is the single source for colour, type and spacing; a
 * screen that hardcodes a hex value instead of importing from here has
 * drifted from the approved system, not made a local style choice.
 *
 * ★ Font files: `PlusJakartaSans-{Regular,Medium,SemiBold,Bold,ExtraBold}.ttf`
 *   in `android/app/src/main/assets/fonts/` (instanced from Google's variable
 *   font — the family ships with no static weights upstream). Each weight is
 *   its own `fontFamily` string on Android; there is no `fontWeight` prop that
 *   selects between them the way a system font would.
 *
 * ★ iOS font linking (Info.plist `UIAppFonts` + Xcode "Copy Bundle
 *   Resources") is NOT done yet — the files are staged in `ios/MandiSetu/
 *   Fonts/` but wiring them in needs the Xcode project file, which is unsafe
 *   to hand-edit blind. Flagged, not silently skipped: iOS will fall back to
 *   the system font until this is finished.
 */

export const colors = {
  // Surfaces — warm parchment, not white-and-grey.
  background: '#FAF6EE',
  surface: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F7F3EB',
  surfaceContainer: '#F1EDE6',
  surfaceContainerHigh: '#ECE8E0',
  surfaceContainerHighest: '#E6E2DA',
  surfaceDim: '#DDDAD2',
  surfaceBright: '#FDF9F1',
  surfaceTint: '#AC3400',
  inverseSurface: '#31302B',
  inverseOnSurface: '#F4F0E8',

  // Text
  onBackground: '#1C1C17',
  onSurface: '#1C1C17',
  // ★ Darkened from #59413A for AA contrast on the parchment ground.
  onSurfaceVariant: '#4A342E',
  outline: '#8D7168',
  outlineVariant: '#E1BFB5',

  // Brand — deep marigold, not agri-green.
  primary: '#9B2F00',
  primaryContainer: '#C2410C',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFECE7',
  inversePrimary: '#FFB59D',

  secondary: '#A53C19',
  secondaryContainer: '#FB7B54',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#6B1A00',

  // Tertiary — verified emerald for positive states
  tertiary: '#006146',
  tertiaryContainer: '#0F7C5B',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#B9FFDE',

  // Semantic — separate from the brand accent, never doubling as it.
  positive: '#047857',
  positiveContainer: '#B9FFDE',
  /** ★ A+D contrast upgrade: solid fills for the gain/risk pair, so the two
   *   figures read at a glance in sunlight instead of as two pale tints. White
   *   on these clears WCAG AA at the sizes we use them. */
  positiveSolid: '#046C4E',
  criticalSolid: '#B3261E',
  onPositive: '#FFFFFF',
  onPositiveContainer: '#00513A',

  critical: '#B91C1C',
  criticalContainer: '#FFDAD6',
  onCritical: '#FFFFFF',
  onCriticalContainer: '#93000A',

  warning: '#B45309',
  warningContainer: '#FFEDD5',

  // Structural borders — the jute-fiber warm tones
  // ★ Darkened from #EADEC7 — the old card edge disappeared on a bright screen.
  borderCard: '#DCC9A8',
  borderField: '#D6C7B2',
  borderActive: '#C2410C',
  borderInput: '#E5D9C3',
} as const;

/** Android matches a font by the exact filename in `assets/fonts/`, one
 * family string per weight. */
export const fontFamily = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
} as const;

/**
 * ★ Sizes raised one step across the body and label roles (2026-09-08).
 *
 *   The scale was transcribed from a desktop mockup and read small on the
 *   device it is actually for: a cheap phone, held at arm's length, in sunlight,
 *   often by someone whose close vision is not what it was. Body text at 13-14px
 *   is comfortable in a design tool and marginal in a mandi.
 *
 *   Headline roles are unchanged — they were never the problem, and moving them
 *   would reflow every screen. Only the roles a farmer has to *read* moved.
 */
export const type = {
  displayLg: { fontFamily: fontFamily.extraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  headlineLg: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headlineMd: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  headlineSm: { fontFamily: fontFamily.semiBold, fontSize: 18, lineHeight: 24 },
  titleLg: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22 },
  titleMd: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22 },
  bodyLg: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  labelLg: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20, letterSpacing: 0.3 },
  labelMd: { fontFamily: fontFamily.semiBold, fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  labelSm: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  // The two roles the mockups reserve for on-screen figures — a hero number
  // (today's price, the hero gain) and a smaller in-line data number.
  numeralHero: { fontFamily: fontFamily.extraBold, fontSize: 36, lineHeight: 42, letterSpacing: -0.3 },
  numeralData: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
} as const;

export const radius = { sm: 4, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 } as const;

/** Touch target constants for outdoor usability on cheap screens. */
export const touch = {
  // ★ Raised from 48. Android's own guidance floor is 48dp for a fully-sighted
  //   user indoors; this app is used one-handed, outdoors, sometimes with wet
  //   or calloused hands, so the floor here is the hero size and the hero is
  //   bigger again.
  targetMin: 56,
  targetHero: 64,
} as const;

/** ── Elevation System ─────────────────────────────────────────────
 *
 *  Four depth layers from the DESIGN.md spec, each with its own
 *  shadow and optional border treatment. Use by spreading into a
 *  StyleSheet — e.g. `...elevation.level1`.
 */
export const elevation = {
  /** Level 0 — Parchment Foundation. Flat, non-reflective. */
  level0: {
    backgroundColor: colors.background,
  },

  /** Level 1 — Card & Lot Containers. */
  level1: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  /** Level 2 — Active Bidding Cards, Live Statuses & Dropdowns. */
  level2: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },

  /** Level 3 — Sticky Bottom Trays & Floating Triggers. */
  level3: {
    backgroundColor: colors.surface,
    borderTopWidth: 1.5,
    borderTopColor: colors.borderInput,
    shadowColor: '#18181B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },

  /** Level 4 — Modals, Sliders, OTP Sheets. */
  level4: {
    backgroundColor: colors.surface,
    shadowColor: '#18181B',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 8,
  },
} as const;

/** One elevated-card shadow, used everywhere a surface needs to read as
 * "lifted" rather than merely bordered — matches the mockups' soft, warm
 * shadow rather than a default grey Material one. */
export const cardShadow = {
  shadowColor: '#59413A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;
