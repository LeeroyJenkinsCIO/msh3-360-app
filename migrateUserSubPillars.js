// migrateUserSubPillars.js
// Run this script with: node migrateUserSubPillars.js

import { db } from './src/firebase.js';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Sub Pillar mapping based on org chart
// Maps userId to their subPillar
const subPillarMapping = {
  // Data Services -> BI & I
  'ricky_martinez': 'BI & I',
  'chris_jones': 'BI & I',
  
  // Data Services -> DevOps
  'jonathan_swisher': 'DevOps',
  'dan_bridgman': 'DevOps',
  'doug_carrol': 'DevOps',
  'ron_mayfield': 'DevOps',
  
  // Data Services -> System Analysts
  'juliana_guidi': 'System Analysts',
  'kristen_mohnhoff': 'System Analysts',
  
  // Systems & Infrastructure -> Network
  'brandon_shelton': 'Network',
  'drew_ratliff': 'Network',
  'daniel_luger': 'Network',
  'stephen_ellington': 'Network',
  
  // Systems & Infrastructure -> Server
  'jim_harrelson': 'Server',
  'justin_dohrman': 'Server',
  'mike_reed': 'Server',
  
  // Service & Support -> NO SUB PILLARS (leave null)
  'brendan_schuler': null,
  'tony_newman': null,
  'shane_gilligan': null,
  'david_bynum': null,
  
  // Risk & Governance -> NO SUB PILLARS
  // (no team members shown in org chart currently)
  
  // PMO/CI -> NO SUB PILLARS
  'paul_gill': null,
  'stephany_rojas': null,
  
  // Leadership (no sub pillars)
  'jeremy_kolko': null,
  'avery_cloutier': null,
  'justin_ainsworth': null,
  'robert_paddock': null
};

async function migrateUserSubPillars() {
  console.log('🚀 Starting user subPillar migration...\n');

  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`📊 Found ${usersSnapshot.size} users in database\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.data().userId;
      const displayName = userDoc.data().displayName;
      const currentSubPillar = userDoc.data().subPillar;

      // Determine the correct subPillar
      const correctSubPillar = subPillarMapping[userId] !== undefined 
        ? subPillarMapping[userId] 
        : null;

      // Check if update is needed
      const needsUpdate = currentSubPillar !== correctSubPillar;

      if (needsUpdate) {
        try {
          const userRef = doc(db, 'users', userDoc.id);
          await updateDoc(userRef, {
            subPillar: correctSubPillar
          });

          console.log(`✅ Updated: ${displayName} (${userId})`);
          console.log(`   Old: ${currentSubPillar === undefined ? 'MISSING' : currentSubPillar}`);
          console.log(`   New: ${correctSubPillar || 'null'}\n`);
          
          updatedCount++;
        } catch (error) {
          console.error(`❌ Error updating ${displayName}:`, error);
          errorCount++;
        }
      } else {
        console.log(`⏭️  Skipped: ${displayName} (${userId}) - already correct: ${correctSubPillar || 'null'}`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Migration Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total users: ${usersSnapshot.size}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (already correct): ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateUserSubPillars()
  .then(() => {
    console.log('\n✅ Done! All users now have consistent subPillar fields.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });