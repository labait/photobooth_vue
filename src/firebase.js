// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// https://firebase.google.com/docs/web/setup#available-libraries

// set process if not in browser
if (typeof window === 'undefined') {
  const process = {
    env: {}
  }
}

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

let firebaseApiKey = null;
let storageBucket = "photobooth-laba-2ca9f";
try {
  firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || storageBucket;
  console.log('firebaseApiKey from import.meta.env');
} catch (error) {
  firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
  storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || storageBucket;
  console.log('firebaseApiKey from process.env');
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: "photobooth-laba-2ca9f.firebaseapp.com",
  projectId: "photobooth-laba-2ca9f",
  storageBucket,
  messagingSenderId: "143520660072",
  appId: "1:143520660072:web:587350d075f83bf94f19dd",
  measurementId: "G-70RQDF3V0V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app);
const db = getFirestore(app);

export { app, auth, googleProvider, storage, db };