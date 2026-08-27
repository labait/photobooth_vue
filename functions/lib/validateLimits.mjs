import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '../../src/firebase.js'
import { Support } from './Support.mjs'
import { isSuccessfulGeneration } from '../../src/itemStorage.js'

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'photobooth-laba-2ca9f'

function parseFirestoreStringArray(field) {
  const values = field?.arrayValue?.values
  if (!Array.isArray(values)) return []
  return values
    .map((entry) => entry.stringValue)
    .filter((value) => typeof value === 'string')
}

function buildLimitError(title, limitNumber, limitTimeframe) {
  return {
    error: title,
    limitNumber,
    limitTimeframe,
    message: `max ${limitNumber} generazioni in ${Support.timeframeHuman(limitTimeframe)}`,
    hint: 'torna a visitarci e riprova più tardi',
  }
}

function checkLimit(count, limitNumber, limitTimeframe, title, isAdmin) {
  const limitAdminOverride = Support.isTrue(process.env.VITE_LIMIT_ADMIN_OVERRIDE)

  if (!limitTimeframe) return null
  if (!limitNumber && limitNumber !== 0) return null
  if (count < limitNumber) return null
  if (limitAdminOverride && isAdmin) return null

  return buildLimitError(title, limitNumber, limitTimeframe)
}

export async function resolveIsAdmin(idToken) {
  if (!idToken) return false

  const apiKey = process.env.VITE_FIREBASE_API_KEY
  if (!apiKey) return false

  try {
    const lookupResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )
    const lookupData = await lookupResponse.json()
    const uid = lookupData.users?.[0]?.localId
    if (!uid) return false

    const accountResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/accounts/${uid}`,
      {
        headers: { Authorization: `Bearer ${idToken}` },
      },
    )
    if (!accountResponse.ok) return false

    const accountData = await accountResponse.json()
    const roles = parseFirestoreStringArray(accountData.fields?.roles)
    return roles.includes('admin')
  } catch {
    return false
  }
}

export function validateLimitUser({ generationsRaw = '', isAdmin = false } = {}) {
  const limitNumber = Number(process.env.VITE_LIMIT_USER_NUMBER)
  const limitTimeframe = Number(process.env.VITE_LIMIT_USER_TIMEFRAME)
  const windowStart = limitTimeframe ? Date.now() - limitTimeframe * 1000 : 0
  const count = (limitTimeframe
    ? Support.generationsInWindow(generationsRaw, windowStart)
    : Support.parseGenerations(generationsRaw)
  ).length

  return checkLimit(
    count,
    limitNumber,
    limitTimeframe,
    'Limite utente raggiunto',
    isAdmin,
  )
}

export async function validateLimitTotal({ edition, isAdmin = false } = {}) {
  const limitNumber = Number(process.env.VITE_LIMIT_TOTAL_NUMBER)
  const limitTimeframe = Number(process.env.VITE_LIMIT_TOTAL_TIMEFRAME)

  if (!edition || !limitTimeframe) {
    return checkLimit(0, limitNumber, limitTimeframe, 'Limite totale raggiunto', isAdmin)
  }

  const itemsQuery = query(
    collection(db, 'items'),
    where('edition', '==', edition),
  )
  const snapshot = await getDocs(itemsQuery)
  const now = Date.now()
  const windowStart = now - limitTimeframe * 1000
  const count = snapshot.docs.filter((item) => {
    const data = item.data()
    const ms = data.timestamp?.toMillis?.() ?? 0
    if (ms < windowStart) return false
    return isSuccessfulGeneration(data)
  }).length

  return checkLimit(
    count,
    limitNumber,
    limitTimeframe,
    'Limite totale raggiunto',
    isAdmin,
  )
}

export async function validateLimits({ generationsRaw = '', edition, idToken } = {}) {
  const isAdmin = await resolveIsAdmin(idToken)

  const userError = validateLimitUser({ generationsRaw, isAdmin })
  if (userError) return userError

  return validateLimitTotal({ edition, isAdmin })
}
