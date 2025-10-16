// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// PRODUCTION Firebase Configuration (live site)
const productionConfig = {
  apiKey: "AIzaSyBeXelC_Y3yXy_CgbPUqU8U139Unt8pZok",
  authDomain: "msh3-assessment-tool.firebaseapp.com",
  projectId: "msh3-assessment-tool",
  storageBucket: "msh3-assessment-tool.firebasestorage.app",
  messagingSenderId: "519181353923",
  appId: "1:519181353923:web:784d5252597039f8aa3376"
};

// DEVELOPMENT Firebase Configuration (local testing)
const developmentConfig = {
  apiKey: "AIzaSyA7_0_pFQaxo0l8FwjLN7yZPTEhCVOHn5o",
  authDomain: "msh3-360-dev.firebaseapp.com",
  projectId: "msh3-360-dev",
  storageBucket: "msh3-360-dev.firebasestorage.app",
  messagingSenderId: "208327001695",
  appId: "1:208327001695:web:297350d5b8c1d0841f3dea"
};

// Automatically select config based on environment
// - Production: When deployed on Vercel (NODE_ENV === 'production')
// - Development: When running locally with npm start
const firebaseConfig = process.env.NODE_ENV === 'production' 
  ? productionConfig 
  : developmentConfig;

// Log which environment is being used (helps with debugging)
console.log(`🔥 Firebase Environment: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`📦 Project ID: ${firebaseConfig.projectId}`);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);