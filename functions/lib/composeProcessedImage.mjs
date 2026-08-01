import sharp from 'sharp';
import { loadFrameBuffer } from './resolveFramePath.mjs';

/**
 * Applies a watermark overlay on the processed image (top-left).
 * @param {Buffer} photoBuffer
 * @param {string} watermarkPathEnv - e.g. public/images/watermark.png
 * @param {string|number} widthEnv - target watermark width in pixels
 * @returns {Promise<Buffer>} watermarked PNG
 */
export async function composeProcessedImage(photoBuffer, watermarkPathEnv, widthEnv) {
  if (!photoBuffer?.length) {
    throw new Error('Photo buffer is required');
  }

  const watermarkBuffer = await loadFrameBuffer(watermarkPathEnv);
  const width = Number(widthEnv);

  let overlay = watermarkBuffer;
  if (Number.isFinite(width) && width > 0) {
    overlay = await sharp(watermarkBuffer)
      .resize({ width: Math.round(width) })
      .toBuffer();
  }

  return sharp(photoBuffer)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}
