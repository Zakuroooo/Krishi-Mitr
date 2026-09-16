/**
 * Icon — Professional SVG icon system for Krishi Mitra.
 *
 * NO EMOJIS. Every icon is a proper vector path rendered via react-native-svg.
 * Usage: <Icon name="leaf" size={24} color={colors.primary} />
 */

import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export type IconName =
  | 'leaf'
  | 'volume'
  | 'volume-off'
  | 'lock'
  | 'shield'
  | 'shield-check'
  | 'trending-up'
  | 'trending-down'
  | 'building'
  | 'handshake'
  | 'phone'
  | 'mic'
  | 'check'
  | 'check-circle'
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'bell'
  | 'truck'
  | 'clipboard'
  | 'home'
  | 'chart-bar'
  | 'box'
  | 'tag'
  | 'zap'
  | 'globe'
  | 'sim'
  | 'signal'
  | 'star'
  | 'eye'
  | 'clock'
  | 'info'
  | 'x-circle'
  | 'message-circle'
  | 'edit'
  | 'refresh'
  | 'map-pin'
  | 'plus'
  | 'camera'
  | 'scale'
  | 'share';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * All paths are drawn in a 24x24 viewBox for consistency.
 */
const ICON_PATHS: Record<IconName, (color: string) => React.ReactElement> = {
  leaf: (c) => (
    <G>
      <Path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  volume: (c) => (
    <G>
      <Path d="M11 5L6 9H2V15H6L11 19V5Z" fill={c} />
      <Path d="M19.07 4.93C20.94 6.8 22 9.34 22 12C22 14.66 20.94 17.2 19.07 19.07M15.54 8.46C16.48 9.4 17 10.67 17 12C17 13.33 16.48 14.6 15.54 15.54" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),

  'volume-off': (c) => (
    <G>
      <Path d="M11 5L6 9H2V15H6L11 19V5Z" fill={c} />
      <Path d="M23 9L17 15M17 9L23 15" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),

  lock: (c) => (
    <Path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11ZM7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  shield: (c) => (
    <Path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
  ),

  'shield-check': (c) => (
    <G>
      <Path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Path d="M9 12L11 14L15 10" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  'trending-up': (c) => (
    <Path d="M23 6L13.5 15.5L8.5 10.5L1 18M23 6H17M23 6V12" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  'trending-down': (c) => (
    <Path d="M23 18L13.5 8.5L8.5 13.5L1 6M23 18H17M23 18V12" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  building: (c) => (
    <G>
      <Path d="M6 22V4C6 3.44772 6.44772 3 7 3H17C17.5523 3 18 3.44772 18 4V22" stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M2 22H22" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Rect x={9} y={7} width={2.5} height={2.5} rx={0.5} fill={c} />
      <Rect x={12.5} y={7} width={2.5} height={2.5} rx={0.5} fill={c} />
      <Rect x={9} y={11.5} width={2.5} height={2.5} rx={0.5} fill={c} />
      <Rect x={12.5} y={11.5} width={2.5} height={2.5} rx={0.5} fill={c} />
      <Rect x={10} y={17} width={4} height={5} rx={0.5} fill={c} />
    </G>
  ),

  handshake: (c) => (
    <G>
      <Path d="M20 11L14.5 5.5C14 5 13 5 12.5 5.5L4 14L7 17L12 12L10.5 17L13 19.5C13.5 20 14.5 20 15 19.5L20 14.5C20.5 14 20.5 13 20 12.5" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M2 10L8 4M22 14L16 20" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),

  phone: (c) => (
    <Path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7293C21.7209 20.9845 21.5573 21.2136 21.3521 21.4019C21.1468 21.5901 20.9046 21.7335 20.6407 21.8227C20.3769 21.9119 20.0974 21.9451 19.82 21.92C16.7428 21.5856 13.787 20.5341 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.19 12.85C3.49998 10.2412 2.44824 7.27099 2.12 4.18C2.09501 3.90347 2.12787 3.62476 2.2165 3.36162C2.30513 3.09849 2.44757 2.85669 2.63476 2.65162C2.82196 2.44655 3.0498 2.28271 3.30379 2.17052C3.55777 2.05833 3.83233 2.00026 4.11 2H7.11C7.5953 1.99523 8.06579 2.16708 8.43376 2.48353C8.80173 2.79999 9.04208 3.23945 9.11 3.72C9.23662 4.68007 9.47145 5.62273 9.81 6.53C9.94455 6.88792 9.97366 7.27691 9.89391 7.65088C9.81415 8.02485 9.62886 8.36811 9.36 8.64L8.09 9.91C9.51355 12.4135 11.5865 14.4865 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9752 14.1858 16.3491 14.1061C16.7231 14.0263 17.1121 14.0554 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7658 14.9585 21.2094 15.2032 21.5265 15.5775C21.8437 15.9518 22.0122 16.4296 22 16.92Z" stroke={c} strokeWidth={1.5} fill="none" />
  ),

  mic: (c) => (
    <G>
      <Rect x={9} y={1} width={6} height={12} rx={3} stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Path d="M12 19V23M8 23H16" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),

  check: (c) => (
    <Path d="M20 6L9 17L4 12" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  'check-circle': (c) => (
    <G>
      <Path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85782 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.86" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Path d="M22 4L12 14.01L9 11.01" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  'arrow-right': (c) => (
    <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  'arrow-left': (c) => (
    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  'chevron-right': (c) => (
    <Path d="M9 18L15 12L9 6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  'chevron-down': (c) => (
    <Path d="M6 9L12 15L18 9" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),

  bell: (c) => (
    <G>
      <Path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M13.73 21C13.5542 21.3031 13.3018 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),

  truck: (c) => (
    <G>
      <Path d="M1 3H16V16H1V3Z" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Path d="M16 8H20L23 11V16H16V8Z" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Circle cx={5.5} cy={18.5} r={2.5} stroke={c} strokeWidth={1.5} fill="none" />
      <Circle cx={18.5} cy={18.5} r={2.5} stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  clipboard: (c) => (
    <G>
      <Path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke={c} strokeWidth={1.5} fill="none" />
      <Rect x={8} y={2} width={8} height={4} rx={1} stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  home: (c) => (
    <G>
      <Path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Path d="M9 22V12H15V22" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
    </G>
  ),

  'chart-bar': (c) => (
    <G>
      <Path d="M12 20V10" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M18 20V4" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M6 20V16" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
    </G>
  ),

  box: (c) => (
    <G>
      <Path d="M21 16V8C20.9996 7.6493 20.9071 7.30483 20.7316 7.00017C20.556 6.69552 20.3037 6.44139 20 6.26L13 2.26C12.696 2.07844 12.3511 1.98281 12 1.98281C11.6489 1.98281 11.304 2.07844 11 2.26L4 6.26C3.69626 6.44139 3.44398 6.69552 3.26846 7.00017C3.09294 7.30483 3.00036 7.6493 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9998C3.44398 17.3045 3.69626 17.5586 4 17.74L11 21.74C11.304 21.9216 11.6489 22.0172 12 22.0172C12.3511 22.0172 12.696 21.9216 13 21.74L20 17.74C20.3037 17.5586 20.556 17.3045 20.7316 16.9998C20.9071 16.6952 20.9996 16.3507 21 16Z" stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M3.27 6.96L12 12.01L20.73 6.96M12 22.08V12" stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  tag: (c) => (
    <Path d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41Z" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
  ),

  zap: (c) => (
    <Path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={c} />
  ),

  globe: (c) => (
    <G>
      <Circle cx={12} cy={12} r={10} stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M2 12H22M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  sim: (c) => (
    <G>
      <Path d="M18 2H10L6 6V20C6 21.1046 6.89543 22 8 22H18C19.1046 22 20 21.1046 20 20V4C20 2.89543 19.1046 2 18 2Z" stroke={c} strokeWidth={1.5} fill="none" />
      <Rect x={9} y={12} width={8} height={6} rx={1} stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  signal: (c) => (
    <G>
      <Path d="M2 20H4V12H2V20Z" fill={c} />
      <Path d="M7 20H9V8H7V20Z" fill={c} />
      <Path d="M12 20H14V4H12V20Z" fill={c} />
      <Path d="M17 20H19V2H17V20Z" fill={c} />
    </G>
  ),

  star: (c) => (
    <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={c} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
  ),

  eye: (c) => (
    <G>
      <Path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke={c} strokeWidth={1.5} fill="none" />
      <Circle cx={12} cy={12} r={3} stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  clock: (c) => (
    <G>
      <Circle cx={12} cy={12} r={10} stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M12 6V12L16 14" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),

  info: (c) => (
    <G>
      <Circle cx={12} cy={12} r={10} stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M12 16V12M12 8H12.01" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </G>
  ),

  'x-circle': (c) => (
    <G>
      <Circle cx={12} cy={12} r={10} stroke={c} strokeWidth={1.5} fill="none" />
      <Path d="M15 9L9 15M9 9L15 15" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </G>
  ),

  'message-circle': (c) => (
    <G>
      <Path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  edit: (c) => (
    <G>
      <Path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  refresh: (c) => (
    <G>
      <Path d="M23 4V10H17" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M1 20V14H7" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.77921 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1112 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  'map-pin': (c) => (
    <G>
      <Path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={12} cy={10} r={3} stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  plus: (c) => (
    <G>
      <Path d="M12 5V19M5 12H19" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  camera: (c) => (
    <G>
      <Path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={12} cy={13} r={4} stroke={c} strokeWidth={1.5} fill="none" />
    </G>
  ),

  scale: (c) => (
    <G>
      <Path d="M16 16L12 12M12 12L8 16M12 12V21" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M20.39 18.39A5 5 0 0 0 18 9H16.74A8 8 0 1 0 3 16.3" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),
  share: (c) => (
    <G>
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M16 6L12 2L8 6" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M12 2v13" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),
};


export function Icon({ name, size = 24, color = '#1C1C17' }: IconProps) {
  const renderIcon = ICON_PATHS[name];
  if (!renderIcon) return null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderIcon(color)}
    </Svg>
  );
}

export default Icon;
