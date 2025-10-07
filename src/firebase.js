import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBeXelC_Y3yXy_CgbPUqU8U139Unt8pZok",
  authDomain: "msh3-assessment-tool.firebaseapp.com",
  projectId: "msh3-assessment-tool",
  storageBucket: "msh3-assessment-tool.firebasestorage.app",
  messagingSenderId: "519181353923",
  appId: "1:519181353923:web:784d5252597039f8aa3376"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);