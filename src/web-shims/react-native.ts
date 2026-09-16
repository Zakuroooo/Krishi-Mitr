/**
 * `react-native` for the browser: everything `react-native-web` exports, plus
 * the one module it does not.
 *
 * ★ Why this file exists at all.
 *
 *   Three screens read `PermissionsAndroid.PERMISSIONS.CAMERA` (or
 *   `.RECORD_AUDIO`) into a module-scope constant. On the phone that is a
 *   plain string lookup. In the browser `PermissionsAndroid` is `undefined` —
 *   react-native-web has no such module, because the web has no such concept —
 *   so the lookup threw *while the module was being imported*, before React
 *   ever rendered. The whole app mounted as a blank parchment page, and the
 *   only clue was "Cannot read properties of undefined (reading 'PERMISSIONS')".
 *
 *   The fix could have been three edits to those screens. It is this instead,
 *   because those three files are the phone's files: every edit to them is a
 *   place the web and the phone can drift. A shim at the module boundary keeps
 *   `src/` identical to the app and puts the whole difference in one file that
 *   announces itself as the difference.
 *
 * ★ The permission calls answer "granted" without prompting. That is not a
 *   stub that lies: the browser asks for the camera and the microphone at the
 *   moment they are used — `getUserMedia` and the file input raise their own
 *   prompts — so the *browser* is the permission layer here, and a denied
 *   prompt surfaces as the error each caller already handles. Answering
 *   "granted" lets the code reach the point where the real prompt happens.
 */

export * from 'react-native-web';

const RESULTS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  NEVER_ASK_AGAIN: 'never_ask_again',
} as const;

const PERMISSIONS = {
  CAMERA: 'android.permission.CAMERA',
  RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
  READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
  WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
  ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
  ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
} as const;

export const PermissionsAndroid = {
  PERMISSIONS,
  RESULTS,
  check: async (_permission: string): Promise<boolean> => true,
  request: async (_permission: string): Promise<string> => RESULTS.GRANTED,
  requestMultiple: async (permissions: string[]): Promise<Record<string, string>> =>
    Object.fromEntries(permissions.map(permission => [permission, RESULTS.GRANTED])),
};
