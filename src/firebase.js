import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDNn43MY_BUBVyPHMCMh6Xl3IRRXxQHO5o",
  authDomain: "diploma-12b94.firebaseapp.com",
  projectId: "diploma-12b94",
  storageBucket: "diploma-12b94.firebasestorage.app",
  messagingSenderId: "35125539138",
  appId: "1:35125539138:web:6a35d9bb371af1446998db"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
