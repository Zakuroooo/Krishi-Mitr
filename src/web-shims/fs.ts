/**
 * `react-native-fs` on the web — an in-memory store, not a filesystem.
 *
 * The app uses exactly three calls, and only for one job: take the base64
 * audio Sarvam returned, put it somewhere `react-native-sound` can open, play
 * it, then delete it. A browser has no path to write to, but it does not need
 * one — a data URL is already "somewhere a player can open". So `writeFile`
 * records `path → data URL`, `web-shims/sound.ts` looks the path up, and
 * `unlink` forgets it.
 *
 * Nothing here survives a reload, which is correct: these files were never
 * meant to outlive the sentence they carry.
 */

const files = new Map<string, string>();

/** Where the app thinks it is writing. Any stable string works. */
export const CachesDirectoryPath = '/krishi-mitr/cache';
export const DocumentDirectoryPath = '/krishi-mitr/documents';
export const TemporaryDirectoryPath = '/krishi-mitr/tmp';

function mimeFor(path: string): string {
  if (path.endsWith('.mp3')) return 'audio/mpeg';
  if (path.endsWith('.m4a') || path.endsWith('.mp4')) return 'audio/mp4';
  return 'audio/wav';
}

export async function writeFile(
  path: string,
  contents: string,
  encoding: string = 'utf8',
): Promise<void> {
  files.set(
    path,
    encoding === 'base64'
      ? `data:${mimeFor(path)};base64,${contents}`
      : `data:text/plain;charset=utf-8,${encodeURIComponent(contents)}`,
  );
}

export async function unlink(path: string): Promise<void> {
  const url = files.get(path);
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
  files.delete(path);
}

export async function exists(path: string): Promise<boolean> {
  return files.has(path);
}

export async function readFile(path: string): Promise<string> {
  const url = files.get(path);
  if (!url) throw new Error(`ENOENT: ${path}`);
  return url;
}

/** Used by `web-shims/sound.ts` to resolve a written path back to something
 *  an `<audio>` element accepts. Not part of the react-native-fs API. */
export function readFileUrl(path: string): string | null {
  return files.get(path) ?? null;
}

export default {
  CachesDirectoryPath,
  DocumentDirectoryPath,
  TemporaryDirectoryPath,
  writeFile,
  unlink,
  exists,
  readFile,
};
