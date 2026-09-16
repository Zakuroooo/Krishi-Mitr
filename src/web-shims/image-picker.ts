/**
 * `react-native-image-picker` on the web, over a hidden `<input type="file">`.
 *
 * `capture="environment"` is what makes a phone browser open the rear camera
 * directly instead of the photo library — the same intent S17's camera guide
 * has on the phone. A desktop browser ignores the attribute and shows a file
 * chooser, which is the only sensible thing it could do.
 *
 * The photo comes back as a data URL. Every consumer downstream (S18's
 * review screen, the grading call) treats `asset.uri` as an opaque string, so
 * a data URL travels the same path a `file://` uri does on the phone.
 */

export interface Asset {
  uri?: string;
  fileName?: string;
  type?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

export interface Response {
  didCancel?: boolean;
  errorCode?: string;
  errorMessage?: string;
  assets?: Asset[];
}

export interface CameraOptions {
  mediaType?: string;
  saveToPhotos?: boolean;
  [key: string]: unknown;
}

function pick(useCamera: boolean, callback?: (response: Response) => void): void {
  if (!callback) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (useCamera) input.setAttribute('capture', 'environment');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);

  // There is no "cancel" event with reliable support, so a dialog the farmer
  // dismissed simply never calls back. That matches how the screens behave on
  // a cancelled native picker: they stay where they are.
  const cleanup = () => {
    if (input.parentNode) input.parentNode.removeChild(input);
  };

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) {
      callback({ didCancel: true });
      cleanup();
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      callback({ errorCode: 'others', errorMessage: 'could not read the photo' });
      cleanup();
    };
    reader.onload = () => {
      const uri = String(reader.result);
      // Measure it, because the grading screens show the photo and a couple
      // of them size their preview from these numbers.
      const img = new Image();
      img.onload = () => {
        callback({
          assets: [
            {
              uri,
              fileName: file.name,
              type: file.type,
              fileSize: file.size,
              width: img.naturalWidth,
              height: img.naturalHeight,
            },
          ],
        });
        cleanup();
      };
      img.onerror = () => {
        callback({
          assets: [{ uri, fileName: file.name, type: file.type, fileSize: file.size }],
        });
        cleanup();
      };
      img.src = uri;
    };
    reader.readAsDataURL(file);
  });

  input.click();
}

export function launchCamera(
  _options: CameraOptions,
  callback?: (response: Response) => void,
): void {
  pick(true, callback);
}

export function launchImageLibrary(
  _options: CameraOptions,
  callback?: (response: Response) => void,
): void {
  pick(false, callback);
}

export default { launchCamera, launchImageLibrary };
