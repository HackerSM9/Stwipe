// src/firebase.js

// Import the functions you need from the Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Optional, for storing files

// Firebase configuration for your Stwipe project
// Replace placeholders with your actual Firebase project details
const firebaseConfig = {
  apiKey: "AIzaSyDFtZ1RVo3V981T4-vWS7IDeKf6c1GqfF4",
  authDomain: "stwipe-sm9-26.firebaseapp.com",
  projectId: "stwipe-sm9-26",
  storageBucket: "stwipe-sm9-26.firebasestorage.app",
  messagingSenderId: "268327536304",
  appId: "1:268327536304:web:2636bc8e04e8a99dd29d75",
  measurementId: "G-KD2ZML56NC"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);         // For authentication (login/signup)
const db = getFirestore(app);      // For Firestore database operations
const storage = getStorage(app);   // Optional: For uploading/downloading files

// Export services for use in other parts of the app
export { auth, db, storage };
