import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDFtZ1RVo3V981T4-vWS7IDeKf6c1GqfF4",
  authDomain: "stwipe-sm9-26.firebaseapp.com",
  projectId: "stwipe-sm9-26",
  storageBucket: "stwipe-sm9-26.firebasestorage.app",
  messagingSenderId: "268327536304",
  appId: "1:268327536304:web:2636bc8e04e8a99dd29d75",
  measurementId: "G-KD2ZML56NC"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  return await signInWithPopup(auth, provider);
};

export const signOutUser = async () => {
  return await signOut(auth);
};

export type { User };
