import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/firebase';
import { parseImageData } from './lib/FrameCompositor.mjs';
import { composeFramedImage } from './lib/composeFramedImage.mjs';
import { isFrameEnabled } from '../src/itemStorage.js';

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

    const framePathEnv = isFrameEnabled(process.env.VITE_IMAGE_FRAME)
      ? process.env.VITE_IMAGE_FRAME
      : null;

    if (!framePathEnv) {
      return new Response(JSON.stringify({ error: 'VITE_IMAGE_FRAME is not configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const photoBuffer = parseImageData(image);
    const composed = await composeFramedImage(photoBuffer, framePathEnv);

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
