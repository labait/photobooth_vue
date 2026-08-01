import { FrameCompositor } from './FrameCompositor.mjs';
import { resolveFramePath } from './resolveFramePath.mjs';

/**
 * Composes a processed photo with the edition frame from VITE_IMAGE_FRAME.
 * @param {Buffer} photoBuffer
 * @param {string} framePathEnv - e.g. /public/editions/totem1/frame1.png
 * @returns {Promise<Buffer>} framed PNG
 */
export async function composeFramedImage(photoBuffer, framePathEnv) {
  const compositor = await FrameCompositor.fromFile(resolveFramePath(framePathEnv));
  return compositor.compose(photoBuffer);
}
