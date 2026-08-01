// Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2

import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../src/firebase'

const edition = process.env.VITE_EDITION
const MAX_ITEMS = 50

function getTimestampMs(item) {
  const ts = item.timestamp
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  return 0
}

export default async () => {
  try {
    if (!edition) {
      return new Response(JSON.stringify({ error: 'Missing EDITION environment variable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const docRef = collection(db, 'items')
    const q = query(
      docRef,
      where('status', '==', 'accepted'),
      where('edition', '==', edition),
    )
    const docData = await getDocs(q)
    const data = docData.docs
      .map((doc) => ({ ...doc.data(), docId: doc.id }))
      .filter((item) => item.image_processed)
      .sort((a, b) => getTimestampMs(b) - getTimestampMs(a))
      .slice(0, MAX_ITEMS)

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
