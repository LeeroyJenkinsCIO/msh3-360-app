// importUsers.js
// Run this ONCE to import all test users to Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// YOUR FIREBASE CONFIG (copy from src/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyBeXelC_Y3yXy_CgbPUqU8U139Unt8pZok",
  authDomain: "msh3-assessment-tool.firebaseapp.com",
  projectId: "msh3-assessment-tool",
  storageBucket: "msh3-assessment-tool.firebasestorage.app",
  messagingSenderId: "519181353923",
  appId: "1:519181353923:web:784d5252597039f8aa3376"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// TEST USERS DATA
const users = [
  {
    id: 'brandon_shelton',
    displayName: 'Brandon Shelton',
    email: 'brandon@test.com',
    orgLayer: 'isf',
    orgRole: 'sme',
    pillar: 'infrastructure',
    subPillar: 'network',
    reportsTo: 'jeremy_kolko',
    status: 'active'
  },
  {
    id: 'ricky_martinez',
    displayName: 'Ricky Martinez',
    email: 'ricky@test.com',
    orgLayer: 'isf',
    orgRole: 'supervisor',
    pillar: 'data_services',
    subPillar: 'bi_i',
    supervisesSubPillar: 'bi_i',
    reportsTo: 'avery_cloutier',
    status: 'active'
  },
  {
    id: 'jeremy_kolko',
    displayName: 'Jeremy Kolko',
    email: 'jeremy@test.com',
    orgLayer: 'isl',
    orgRole: 'pillar_leader',
    pillarLeadFor: 'infrastructure',
    jobTitle: 'Systems and Infrastructure Lead',
    status: 'active'
  },
  {
    id: 'robert_paddock',
    displayName: 'Robert Paddock',
    email: 'robert@test.com',
    orgLayer: 'ise',
    orgRole: 'executive',
    jobTitle: 'Chief Information Officer',
    status: 'active'
  }
];

// IMPORT FUNCTION
async function importUsers() {
  console.log('🚀 Starting user import...');
  
  try {
    for (const user of users) {
      const { id, ...userData } = user;
      await setDoc(doc(db, 'users', id), userData);
      console.log(`✅ Imported: ${userData.displayName}`);
    }
    
    console.log('🎉 All users imported successfully!');
    console.log('📊 Total users:', users.length);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing users:', error);
    process.exit(1);
  }
}

// RUN IT
importUsers();