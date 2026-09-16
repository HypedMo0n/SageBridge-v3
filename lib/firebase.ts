import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

const EXPECTED_PROJECT_ID = 'sagebridge-identity-hypedmoon';
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyD4yC2vQ3vQ3vQ3vQ3vQ3vQ3vQ3vQ3vQ3vQ',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${EXPECTED_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || EXPECTED_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${EXPECTED_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1002291229577',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1002291229577:web:47ad66fb14296222fbe758',
};

if (firebaseConfig.projectId !== EXPECTED_PROJECT_ID) {
  throw new Error(`Invalid Firebase project: expected ${EXPECTED_PROJECT_ID}`);
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
if (typeof window !== 'undefined') void setPersistence(auth, browserLocalPersistence);
