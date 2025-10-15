// updateJobTitles.js
// Run this script to batch update all user job titles in Firebase
// Usage: node updateJobTitles.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Your Firebase Admin SDK key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Job title mapping based on org chart
const jobTitleUpdates = {
  // ISE Layer
  'robert_paddock': 'CIO',
  
  // ISL Layer (Pillar Leaders)
  'justin_ainsworth': 'IS Principal',
  'avery_cloutier': 'Pillar Leader',
  'jeremy_kolko': 'Pillar Leader',
  'david_bynum': 'Pillar Leader',
  'paul_gill': 'Pillar Leader',
  
  // ISF Layer - Data Services
  'ricky_martinez': 'Supervisor',
  'chris_jones': 'BA-PPA',
  'jonathan_swisher': 'Dev',
  'dan_bridgman': 'Dev',
  'doug_carroll': 'DE',
  'juliana_guidi': 'SA',
  'kristen_mohrihoff': 'SA',
  'ron_mayfield': 'Dev/SA',
  
  // ISF Layer - Systems & Infrastructure
  'brandon_shelton': 'NE',
  'drew_ratliff': 'NE',
  'daniel_luger': 'NE',
  'stephen_ellington': 'NE',
  'jim_harrelson': 'SE',
  'justin_dohrman': 'SE',
  'mike_reed': 'SE',
  
  // ISF Layer - Service & Support
  'brendan_schuler': 'SD',
  'tony_newman': 'SD',
  'shane_gilligan': 'SD',
  
  // ISF Layer - PMO/CI
  'stephany_rojas': 'PC'
};

async function updateJobTitles() {
  console.log('🚀 Starting job title batch update...\n');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    let updateCount = 0;
    let skippedCount = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = userData.userId;
      
      // Check if this user has a job title update
      if (jobTitleUpdates[userId]) {
        const newJobTitle = jobTitleUpdates[userId];
        const oldJobTitle = userData.pillarRole || 'None';
        
        // Only update if different
        if (oldJobTitle !== newJobTitle) {
          batch.update(doc.ref, { pillarRole: newJobTitle });
          console.log(`✅ ${userData.displayName || userId}: "${oldJobTitle}" → "${newJobTitle}"`);
          updateCount++;
        } else {
          console.log(`⏭️  ${userData.displayName || userId}: Already set to "${newJobTitle}"`);
          skippedCount++;
        }
      } else {
        console.log(`⚠️  ${userData.displayName || userId}: No job title mapping found (userId: ${userId})`);
        skippedCount++;
      }
    });
    
    // Commit the batch
    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n✨ Successfully updated ${updateCount} job titles!`);
    } else {
      console.log(`\n📋 No updates needed. All job titles are current.`);
    }
    
    console.log(`📊 Summary: ${updateCount} updated, ${skippedCount} skipped`);
    
  } catch (error) {
    console.error('❌ Error updating job titles:', error);
  }
  
  process.exit(0);
}

// Run the update
updateJobTitles();