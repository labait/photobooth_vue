import { ref } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const user = ref(null)
const isAdmin = ref(false)
const authReady = ref(false)
let started = false

async function resolveAdmin(uid) {
  const accountRef = doc(db, 'accounts', uid)
  const accountSnap = await getDoc(accountRef)

  if (!accountSnap.exists()) {
    await setDoc(accountRef, { uid, roles: [] })
    return false
  }

  const data = accountSnap.data()
  return Array.isArray(data?.roles) && data.roles.includes('admin')
}

function initAuth() {
  if (started) return
  started = true

  onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    isAdmin.value = firebaseUser ? await resolveAdmin(firebaseUser.uid) : false
    authReady.value = true
  })
}

function waitForAuth() {
  initAuth()

  if (authReady.value) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const check = () => {
      if (authReady.value) {
        resolve()
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
}

export function useAuth() {
  initAuth()
  return { user, isAdmin, authReady, initAuth, waitForAuth }
}
