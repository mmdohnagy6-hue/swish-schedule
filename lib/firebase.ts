// Standard modular SDK import for Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration for the swish-schedule-official project
// Note: API key is securely retrieved from process.env.API_KEY as per guidelines
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "swish-schedule-official.firebaseapp.com",
  projectId: "swish-schedule-official",
  storageBucket: "swish-schedule-official.firebasestorage.app",
  messagingSenderId: "261709422579",
  appId: "1:261709422579:web:670f0a2034803e9cae7c86",
  measurementId: "G-7QMP4LC5CW"
};

// Initialize the Firebase application
const app = initializeApp(firebaseConfig);

// Export the Firestore database instance for the application
export const db = getFirestore(app);