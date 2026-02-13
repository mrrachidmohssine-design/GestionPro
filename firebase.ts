
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBz7BDsepmA1wX6igR56VuN5XhOl0E93qY",
  authDomain: "ecotrack-d6e70.firebaseapp.com",
  projectId: "ecotrack-d6e70",
  storageBucket: "ecotrack-d6e70.firebasestorage.app",
  messagingSenderId: "102451849433",
  appId: "1:102451849433:web:ee036a7603fd4ab12236c8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
