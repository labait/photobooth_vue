import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/firebase';
import { FrameCompositor, parseImageData } from './lib/FrameCompositor.mjs';

const functionsDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FRAME_PATH = join(functionsDir, 'assets/frame.png');

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return new Response(JSON.stringify({ error: 'Missing image data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const frameBuffer = await readFile(DEFAULT_FRAME_PATH);
    const compositor = FrameCompositor.fromBuffer(frameBuffer);
    const photoBuffer = parseImageData(image);
    const composed = await compositor.compose(photoBuffer);

    const fileId = `${Date.now()}`;
    const storagePath = `test/${fileId}.png`;
    const imageRef = storageRef(storage, storagePath);

    await uploadBytes(imageRef, composed, { contentType: 'image/png' });
    const url = await getDownloadURL(imageRef);

    return new Response(
      JSON.stringify({ storagePath, url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('composeTestFrame error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Composition failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
