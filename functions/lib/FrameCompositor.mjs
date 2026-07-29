import sharp from 'sharp';

/**
 * Composes a user photo behind a PNG frame.
 * The photo is scaled with "cover" behavior (max zoom) and centered.
 * The frame is layered on top preserving its alpha channel.
 */
export class FrameCompositor {
  #frameBuffer;

  constructor(frameBuffer) {
    if (!frameBuffer?.length) {
      throw new Error('Frame buffer is required');
    }
    this.#frameBuffer = frameBuffer;
  }

  static async fromFile(framePath) {
    const { readFile } = await import('node:fs/promises');
    const buffer = await readFile(framePath);
    return new FrameCompositor(buffer);
  }

  static fromBuffer(frameBuffer) {
    return new FrameCompositor(frameBuffer);
  }

  async getFrameDimensions() {
    const meta = await sharp(this.#frameBuffer).metadata();
    return { width: meta.width, height: meta.height };
  }

  /**
   * @param {Buffer} photoBuffer - raw image bytes (jpeg/png/webp)
   * @returns {Promise<Buffer>} composed PNG buffer
   */
  async compose(photoBuffer) {
    if (!photoBuffer?.length) {
      throw new Error('Photo buffer is required');
    }

    const frameMeta = await sharp(this.#frameBuffer).metadata();
    const frameWidth = frameMeta.width;
    const frameHeight = frameMeta.height;

    const resizedPhoto = await sharp(photoBuffer)
      .resize(frameWidth, frameHeight, { fit: 'cover', position: 'centre' })
      .toBuffer();

    return sharp(resizedPhoto)
      .composite([{ input: this.#frameBuffer, left: 0, top: 0 }])
      .png()
      .toBuffer();
  }
}

/**
 * Parses a data URL or raw base64 string into a Buffer.
 * @param {string} imageData
 * @returns {Buffer}
 */
export function parseImageData(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    throw new Error('Image data is required');
  }

  const base64 = imageData.includes(',')
    ? imageData.split(',')[1]
    : imageData;

  return Buffer.from(base64, 'base64');
}
