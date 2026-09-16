/**
 * `@react-native/assets-registry/registry` — a stub.
 *
 * `react-native-svg`'s web build imports this to resolve `<Image href={...}>`
 * against React Native's asset registry, and the package ships Flow-typed
 * source that webpack cannot parse without a Flow preset. Rather than add a
 * compiler pass for one import, this provides the two functions it calls.
 *
 * Nothing in this app puts a bundled image inside an SVG — every icon, chart
 * and logo here is drawn from paths and shapes — so the registry is never
 * populated and `getAssetByID` is never asked for a real asset. If that ever
 * changes, this stub is the thing that will be silently wrong, so it returns
 * `undefined` rather than a fake asset object: an empty `<image>` is easier to
 * spot than a broken path.
 */

export interface PackagerAsset {
  __packager_asset: boolean;
  fileSystemLocation?: string;
  httpServerLocation?: string;
  width?: number;
  height?: number;
  scales: number[];
  hash?: string;
  name: string;
  type: string;
}

const assets: PackagerAsset[] = [];

export function registerAsset(asset: PackagerAsset): number {
  return assets.push(asset);
}

export function getAssetByID(assetId: number): PackagerAsset | undefined {
  return assets[assetId - 1];
}

export default { registerAsset, getAssetByID };
