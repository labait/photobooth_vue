// Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2

import { storage,db } from '../src/firebase'
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore'

export default async (request, context) => {
  try {
    const url = new URL(request.url)
    const docId = url.searchParams.get('docId')
    const docRef = doc(db, 'items', docId)
    let docData = (await getDoc(docRef)).data();
    const processUrl = docData.process_result.urls.get
    const processResponse = await fetch(
      processUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`
        }
      }
    );
    const processResult = await processResponse.json();
    await updateDoc(docRef, {
      process_result: processResult,
    })

    console.log('processResult', docData.image_id)
    // download image_processed and save to firebase storage
    if(
      processResult.status == "succeeded" 
      && processResult.output
      && !docData.image_processed
    ) {
      console.log("processResult", processResult)
      console.log("save image_processed", docData.image_id)
      const imageRef = storageRef(storage, `images/${docData.image_id}/${docData.image_id}-processed.png`)
      const imageResponse = await fetch(processResult.output);
      const blob = await imageResponse.blob();
      await uploadBytes(imageRef, blob);
      const image_processed = await getDownloadURL(imageRef)
      await updateDoc(docRef, {
        status: 'processed',
        image_processed: image_processed,
      })
      docData = (await getDoc(docRef)).data(); // update docData
    }

    return new Response(JSON.stringify(docData))
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.toString(),
    }))
  }
}
