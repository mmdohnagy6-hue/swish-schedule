import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// تم تحديث هذه القيم بناءً على الصورة التي أرفقتها لمشروع swish-schedule-official
const firebaseConfig = {
  apiKey: "AIzaSyByXR1oKSuWZnXGQmzvHCPaIBWfxUyGLXQ",
  authDomain: "swish-schedule-official.firebaseapp.com",
  projectId: "swish-schedule-official",
  storageBucket: "swish-schedule-official.firebasestorage.app",
  messagingSenderId: "261709422579",
  appId: "1:261709422579:web:670f0a2034803e9cae7c86",
  measurementId: "G-7QMP4LC5CW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);