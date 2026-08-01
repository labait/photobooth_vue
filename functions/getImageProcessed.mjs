import { storage, db } from '../src/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import {
  itemStoragePath,
  ITEM_IMAGE_FILES,
  isFrameEnabled,
} from '../src/itemStorage.js';
import { composeFramedImage } from './lib/composeFramedImage.mjs';

function predictionErrorMessage(processResult) {
  return processResult?.error || `Prediction ${processResult?.status || 'failed'}`;
}

async function markItemFailed(docRef, errorMessage) {
  await updateDoc(docRef, {
    status: 'failed',
    error: errorMessage,
  });
}

export default async (request) => {
  const url = new URL(request.url);
  const docId = url.searchParams.get('docId');

  if (!docId) {
    return new Response(JSON.stringify({ error: 'Missing docId' }), {
      status: 400,
    });
  }

  const docRef = doc(db, 'items', docId);

  try {
    let docData = (await getDoc(docRef)).data();
    if (!docData?.process_result?.urls?.get) {
      const errorMessage = 'Missing Replicate prediction URL';
      await markItemFailed(docRef, errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }));
    }

    const processUrl = docData.process_result.urls.get;
    const processResponse = await fetch(processUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
    });

    if (!processResponse.ok) {
      const errorMessage = `Replicate poll failed: HTTP ${processResponse.status}`;
      await markItemFailed(docRef, errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }));
    }

    const processResult = await processResponse.json();
    await updateDoc(docRef, {
      process_result: processResult,
    });

    console.log('processResult', docData.image_id);

    if (processResult.status === 'failed' || processResult.status === 'canceled') {
      const errorMessage = predictionErrorMessage(processResult);
      await markItemFailed(docRef, errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }));
    }

    if (
      processResult.status === 'succeeded'
      && processResult.output
      && !docData.image_processed
    ) {
      console.log('processResult', processResult);
      console.log('save image_processed', docData.image_id);

      const edition = docData.edition || process.env.VITE_EDITION;
      const imageId = docData.image_id;
      const imageResponse = await fetch(processResult.output);
      const blob = await imageResponse.blob();
      const photoBuffer = Buffer.from(await blob.arrayBuffer());

      const processedRef = storageRef(
        storage,
        itemStoragePath(edition, imageId, ITEM_IMAGE_FILES.processed),
      );
      await uploadBytes(processedRef, photoBuffer, { contentType: 'image/png' });
      const image_processed = await getDownloadURL(processedRef);

      const updates = {
        status: 'processed',
        image_processed,
      };

      if (isFrameEnabled(process.env.VITE_IMAGE_FRAME)) {
        console.log('save image_framed', imageId);
        const framedBuffer = await composeFramedImage(
          photoBuffer,
          process.env.VITE_IMAGE_FRAME,
        );
        const framedRef = storageRef(
          storage,
          itemStoragePath(edition, imageId, ITEM_IMAGE_FILES.framed),
        );
        await uploadBytes(framedRef, framedBuffer, { contentType: 'image/png' });
        updates.image_framed = await getDownloadURL(framedRef);
      }

      await updateDoc(docRef, updates);
      docData = (await getDoc(docRef)).data();
    }

    return new Response(JSON.stringify(docData));
  } catch (error) {
    const errorMessage = error?.message || String(error);
    try {
      await markItemFailed(docRef, errorMessage);
    } catch (updateError) {
      console.error('Failed to save error on item', updateError);
    }

    return new Response(JSON.stringify({
      error: errorMessage,
    }));
  }
};
