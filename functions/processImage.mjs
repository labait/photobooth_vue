// Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2

import { getDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../src/firebase'
import { validateLimits } from './lib/validateLimits.mjs'
import { loadEditionJson } from './lib/loadEdition.mjs'

export default async (request, context) => {
  try {
    const url = new URL(request.url)
    const docId = url.searchParams.get('docId')
    const docRef = doc(db, 'items', docId)
    const docData = await getDoc(docRef)
    const docDataJson = docData.data()
    const imageUrl = docDataJson.image_source

    const idToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null
    const generationsRaw = url.searchParams.get('generations') ?? ''
    const edition = url.searchParams.get('edition')
      || docDataJson.edition
      || process.env.VITE_EDITION

    const limitError = await validateLimits({
      generationsRaw,
      edition,
      idToken,
    })

    if (limitError) {
      return new Response(JSON.stringify(limitError), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = {
      docId: docData.id,
      docData: docDataJson,
      result: null,
    }

    const apiUrl = 'https://api.replicate.com/v1/models/google/nano-banana-pro/predictions'
    const posterPathRaw = url.searchParams.get('poster') || ''
    const normalizedPosterPath = posterPathRaw
      .replace(/^\.\//, '')
      .replace(/^\/+/, '')
      .replace(/\.\./g, '')
    if (!normalizedPosterPath) {
      return new Response(JSON.stringify({
        error: 'Missing poster path',
      }), {
        status: 400,
      })
    }

    const editionJson = await loadEditionJson(edition)
    const posterUrl = `${process.env.VITE_PUBLIC_URL}/editions/${normalizedPosterPath}`
    console.log('posterUrl', posterUrl)

    const editionInput = { ...(editionJson.replicate_input || {}) }
    const replicateInput = {
      ...editionInput,
      image_input: [
        posterUrl,
        imageUrl,
      ],
    }

    const body = {
      input: replicateInput,
    }

    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify(body),
      },
    )

    const result = await response.json()
    console.log('Replicate status:', response.status)
    console.log('Replicate result:', JSON.stringify(result, null, 2))
    data.result = result

    await updateDoc(doc(db, 'items', docId), {
      status: 'processing',
      image_processed: null,
      process_result: result,
      edition_input: replicateInput,
    })

    console.log('processResult', result)
    return new Response(JSON.stringify(data))
  } catch (error) {
    return new Response(error.toString(), {
      status: 500,
    })
  }
}
