import { storage, db } from '../src/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import {
  itemStoragePath,
  ITEM_IMAGE_FILES,
  isFrameEnabled,
} from '../src/itemStorage.js';
import { composeFramedImage } from './lib/composeFramedImage.mjs';

export default async (request) => {
  try {
    const url = new URL(request.url);
    const docId = url.searchParams.get('docId');
    const docRef = doc(db, 'items', docId);
    let docData = (await getDoc(docRef)).data();
    const processUrl = docData.process_result.urls.get;
    const processResponse = await fetch(processUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
    const processResult = await processResponse.json();
    await updateDoc(docRef, {
      process_result: processResult,
    });

    console.log('processResult', docData.image_id);

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
    return new Response(JSON.stringify({
      error: error.toString(),
    }));
  }
};
