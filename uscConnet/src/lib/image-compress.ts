import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Downscales and re-encodes a picked image as a base64 JPEG data URL.
 *
 * This mirrors the *numeric targets* of the web app's
 * `lib/image-compression.ts` (`compressImageToDataUrl`) — max 1080px on the
 * long edge, 0.75 JPEG quality — so a post created from either client
 * produces roughly the same payload size. The web implementation is
 * Canvas-based and has no RN equivalent, so this is a from-scratch
 * implementation built on `expo-image-manipulator`'s current context API
 * (`ImageManipulator.manipulate(uri).resize(...).renderAsync()`), not a
 * line-for-line port.
 *
 * Shared across the app's upload flows: Feed's create-post composer
 * (`create-post-sheet.tsx`, default 1080/0.75) and Profile's three photo
 * flows — main photo (default 1080/0.75), gallery photo (default 1080/0.75),
 * and banner (`{ maxDimension: 1600 }`, matching the web's
 * `compressImageToDataUrl(file, { maxDimension: 1600 })` call for banners in
 * `screens/Profile.tsx`). One utility, not duplicated per screen — the
 * signature already matches every call site's needs (a plain `maxDimension`/
 * `quality` options bag), so there was no reason to fork it.
 */
export async function compressImageToDataUrl(
  uri: string,
  originalWidth: number,
  originalHeight: number,
  { maxDimension = 1080, quality = 0.75 }: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  let context = ImageManipulator.manipulate(uri);

  if (originalWidth > 0 && originalHeight > 0) {
    const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
    if (scale < 1) {
      context = context.resize({
        width: Math.round(originalWidth * scale),
        height: Math.round(originalHeight * scale),
      });
    }
  }

  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });

  return `data:image/jpeg;base64,${result.base64 ?? ''}`;
}
