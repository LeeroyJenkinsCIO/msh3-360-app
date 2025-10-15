// migratePillars.js
// Run this script with: node migratePillars.js

import { db } from './src/firebase.js';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

// Define the complete pillar structure based on org chart
const pillarsData = {
  data_services: {
    name: "data_services",
    displayName: "Data Services",
    subPillars: [
      { id: "bi_and_i", name: "BI & I" },
      { id: "devops", name: "DevOps" },
      { id: "system_analysts", name: "System Analysts" }
    ],
    order: 1
  },
  infrastructure: {
    name: "infrastructure",
    displayName: "Systems & Infrastructure",
    subPillars: [
      { id: "network", name: "Network" },
      { id: "server", name: "Server" }
    ],
    order: 2
  },
  service_support: {
    name: "service_support",
    displayName: "Service & Support",
    subPillars: [],
    order: 3
  },
  risk_governance: {
    name: "risk_governance",
    displayName: "Risk & Governance",
    subPillars: [],
    order: 4
  },
  pmo_ci: {
    name: "pmo_ci",
    displayName: "PMO/CI",
    subPillars: [],
    order: 5
  }
};

async function migratePillars() {
  console.log('🚀 Starting pillars migration...\n');

  try {
    // First, list existing pillars
    console.log('📋 Current pillars in database:');
    const pillarsRef = collection(db, 'pillars');
    const snapshot = await getDocs(pillarsRef);
    snapshot.forEach(doc => {
      console.log(`  - ${doc.id}: ${JSON.stringify(doc.data())}`);
    });
    console.log('');

    // Update each pillar
    for (const [pillarId, pillarData] of Object.entries(pillarsData)) {
      console.log(`✏️  Updating ${pillarId}...`);
      
      const pillarRef = doc(db, 'pillars', pillarId);
      await setDoc(pillarRef, pillarData, { merge: true });
      
      console.log(`   ✅ ${pillarData.displayName}`);
      console.log(`      Sub-pillars: ${pillarData.subPillars.length}`);
      if (pillarData.subPillars.length > 0) {
        pillarData.subPillars.forEach(sp => {
          console.log(`        - ${sp.name}`);
        });
      }
      console.log('');
    }

    console.log('✨ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total pillars: ${Object.keys(pillarsData).length}`);
    console.log(`   Total sub-pillars: ${Object.values(pillarsData).reduce((sum, p) => sum + p.subPillars.length, 0)}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migratePillars()
  .then(() => {
    console.log('\n✅ Done! You can now verify the changes in Firebase Console.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });