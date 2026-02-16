
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBz7BDsepmA1wX6igR56VuN5XhOl0E93qY",
  authDomain: "ecotrack-d6e70.firebaseapp.com",
  projectId: "ecotrack-d6e70",
  storageBucket: "ecotrack-d6e70.firebasestorage.app",
  messagingSenderId: "102451849433",
  appId: "1:102451849433:web:ee036a7603fd4ab12236c8"
};

// Singleton pattern for Firebase initialization
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize and export services with the explicit app instance
// This ensures that Auth is registered on the same instance used elsewhere
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export default app;
