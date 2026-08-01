import sharp from 'sharp';
import { loadFrameBuffer } from './resolveFramePath.mjs';

/**
 * Applies a watermark overlay on the processed image (top-left).
 * @param {Buffer} photoBuffer
 * @param {string} watermarkPath - path relative to public/
 * @param {string|number} widthValue - target watermark width in pixels
 * @param {string|number} offsetValue - pixels for top and left inset
 * @returns {Promise<Buffer>} watermarked PNG
 */
export async function composeProcessedImage(
  photoBuffer,
  watermarkPath,
  widthValue,
  offsetValue,
) {
  if (!photoBuffer?.length) {
    throw new Error('Photo buffer is required');
  }

  const watermarkBuffer = await loadFrameBuffer(watermarkPath);
  const width = Number(widthValue);
  const offset = Math.max(0, Number(offsetValue) || 0);

  let overlay = watermarkBuffer;
  if (Number.isFinite(width) && width > 0) {
    overlay = await sharp(watermarkBuffer)
      .resize({ width: Math.round(width) })
      .toBuffer();
  }

  return sharp(photoBuffer)
    .composite([{ input: overlay, left: offset, top: offset }])
    .png()
    .toBuffer();
}
