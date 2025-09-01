import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCS47SPal5HxoTmVm_aCp356JPj9fxJuAs",
  authDomain: "expense-sharing-6703c.firebaseapp.com",
  projectId: "expense-sharing-6703c",
  storageBucket: "expense-sharing-6703c.firebasestorage.app",
  messagingSenderId: "171635924995",
  appId: "1:171635924995:web:346d9c786673721d676e36",
  measurementId: "G-7SKBNHCGP9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);

export default app;
