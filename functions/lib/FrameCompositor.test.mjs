import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FrameCompositor, parseImageData } from './FrameCompositor.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const framePath = join(__dirname, '../assets/frame.png');

async function createTestPhoto(width, height, color) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .jpeg()
    .toBuffer();
}

describe('FrameCompositor', () => {
  it('throws when frame buffer is missing', () => {
    assert.throws(() => new FrameCompositor(null), /Frame buffer is required/);
  });

  it('loads frame from file', async () => {
    const compositor = await FrameCompositor.fromFile(framePath);
    const dims = await compositor.getFrameDimensions();
    assert.equal(dims.width, 1073);
    assert.equal(dims.height, 1393);
  });

  it('composes photo behind frame with frame dimensions', async () => {
    const compositor = await FrameCompositor.fromFile(framePath);
    const photo = await createTestPhoto(800, 600, { r: 255, g: 0, b: 0 });
    const result = await compositor.compose(photo);
    const meta = await sharp(result).metadata();

    assert.equal(meta.width, 1073);
    assert.equal(meta.height, 1393);
    assert.equal(meta.format, 'png');
    assert.ok(result.length > 0);
  });

  it('zooms portrait photo to cover frame area', async () => {
    const compositor = await FrameCompositor.fromFile(framePath);
    const photo = await createTestPhoto(400, 800, { r: 0, g: 128, b: 255 });
    const result = await compositor.compose(photo);
    assert.ok(result.length > 0);
  });

  it('throws when photo buffer is missing', async () => {
    const compositor = await FrameCompositor.fromFile(framePath);
    await assert.rejects(() => compositor.compose(null), /Photo buffer is required/);
  });
});

describe('parseImageData', () => {
  it('parses data URL', () => {
    const buffer = Buffer.from('hello');
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
    const parsed = parseImageData(dataUrl);
    assert.deepEqual(parsed, buffer);
  });

  it('parses raw base64', () => {
    const buffer = Buffer.from('hello');
    const parsed = parseImageData(buffer.toString('base64'));
    assert.deepEqual(parsed, buffer);
  });

  it('throws when image data is missing', () => {
    assert.throws(() => parseImageData(''), /Image data is required/);
  });
});
