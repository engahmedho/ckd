import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';

// Note: In a real app, these would come from firebase-applet-config.json
// Since the tool failed, we'll use placeholders that the user can update or 
// we'll try to handle the missing config gracefully.
const firebaseConfig = {
  apiKey: "AIzaSy...", // Placeholder
  authDomain: "ckd-predictor.firebaseapp.com",
  projectId: "ckd-predictor",
  storageBucket: "ckd-predictor.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, onSnapshot, limit };
