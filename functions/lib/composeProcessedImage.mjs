import sharp from 'sharp';
import { loadFrameBuffer } from './resolveFramePath.mjs';

/**
 * Applies a watermark overlay on the processed image (top-left).
 * @param {Buffer} photoBuffer
 * @param {string} watermarkPathEnv - e.g. public/images/watermark.png
 * @param {string|number} offsetEnv - pixels for top and left inset
 * @returns {Promise<Buffer>} watermarked PNG
 */
export async function composeProcessedImage(photoBuffer, watermarkPathEnv, offsetEnv) {
  if (!photoBuffer?.length) {
    throw new Error('Photo buffer is required');
  }

  const watermarkBuffer = await loadFrameBuffer(watermarkPathEnv);
  const offset = Math.max(0, Number(offsetEnv) || 0);

  return sharp(photoBuffer)
    .composite([{ input: watermarkBuffer, left: offset, top: offset }])
    .png()
    .toBuffer();
}
