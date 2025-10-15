// resetFirebase.mjs
// NUCLEAR OPTION: Delete all assessments and reset all counters from command line

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  writeBatch, 
  doc 
} from 'firebase/firestore';

// ============================================================================
// FIREBASE CONFIG - PASTE YOUR CONFIG HERE
// ============================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================================
// NUCLEAR RESET FUNCTION
// ============================================================================
async function nuclearReset() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💣 NUCLEAR RESET - STARTING');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  let totalDeleted = 0;

  try {
    // ========================================
    // STEP 1: Delete ALL Assessments
    // ========================================
    console.log('🗑️  STEP 1: Deleting all assessments...');
    const assessmentsRef = collection(db, 'assessments');
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    
    console.log(`   Found ${assessmentsSnapshot.size} assessments`);

    if (assessmentsSnapshot.size > 0) {
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      assessmentsSnapshot.forEach((docSnapshot) => {
        currentBatch.delete(docSnapshot.ref);
        count++;
        totalDeleted++;

        if (count === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });

      if (count > 0) {
        batches.push(currentBatch);
      }

      console.log(`   Committing ${batches.length} batch(es)...`);
      await Promise.all(batches.map(batch => batch.commit()));
      console.log(`   ✅ Deleted ${totalDeleted} assessments`);
    } else {
      console.log('   ℹ️  No assessments found');
    }

    console.log('');

    // ========================================
    // STEP 2: Delete ALL Cycles
    // ========================================
    console.log('🗑️  STEP 2: Deleting all cycles...');
    const cyclesRef = collection(db, 'cycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    
    console.log(`   Found ${cyclesSnapshot.size} cycles`);
    let cycleCount = 0;

    if (cyclesSnapshot.size > 0) {
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      cyclesSnapshot.forEach((docSnapshot) => {
        currentBatch.delete(docSnapshot.ref);
        count++;
        cycleCount++;

        if (count === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });

      if (count > 0) {
        batches.push(currentBatch);
      }

      console.log(`   Committing ${batches.length} batch(es)...`);
      await Promise.all(batches.map(batch => batch.commit()));
      console.log(`   ✅ Deleted ${cycleCount} cycles`);
    } else {
      console.log('   ℹ️  No cycles found');
    }

    console.log('');

    // ========================================
    // STEP 2b: Delete ALL Assessment Cycles
    // ========================================
    console.log('🗑️  STEP 2b: Deleting all assessment cycles...');
    const assessmentCyclesRef = collection(db, 'assessmentCycles');
    const assessmentCyclesSnapshot = await getDocs(assessmentCyclesRef);
    
    console.log(`   Found ${assessmentCyclesSnapshot.size} assessment cycles`);
    let assessmentCycleCount = 0;

    if (assessmentCyclesSnapshot.size > 0) {
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      assessmentCyclesSnapshot.forEach((docSnapshot) => {
        currentBatch.delete(docSnapshot.ref);
        count++;
        assessmentCycleCount++;

        if (count === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });

      if (count > 0) {
        batches.push(currentBatch);
      }

      console.log(`   Committing ${batches.length} batch(es)...`);
      await Promise.all(batches.map(batch => batch.commit()));
      console.log(`   ✅ Deleted ${assessmentCycleCount} assessment cycles`);
    } else {
      console.log('   ℹ️  No assessment cycles found');
    }

    console.log('');

    // ========================================
    // STEP 3: Reset ALL Counters to 0
    // ========================================
    console.log('🔢 STEP 3: Resetting ALL counters to 0...');
    
    const counterBatch = writeBatch(db);
    
    // systemSettings/mshCounter
    counterBatch.set(doc(db, 'systemSettings', 'mshCounter'), {
      currentMSHNumber: 0,
      lastResetDate: new Date().toISOString(),
      lastResetBy: 'script'
    });
    
    // metadata/assessmentCounter
    counterBatch.set(doc(db, 'metadata', 'assessmentCounter'), {
      currentNumber: 0,
      lastUpdated: new Date().toISOString()
    });
    
    // counters/assessmentCounter
    counterBatch.set(doc(db, 'counters', 'assessmentCounter'), {
      value: 0,
      lastReset: new Date().toISOString()
    });
    
    // counters/mshCounter
    counterBatch.set(doc(db, 'counters', 'mshCounter'), {
      currentMSH: 0,
      lastUpdated: new Date().toISOString()
    });
    
    await counterBatch.commit();
    console.log('   ✅ All counters reset to 0');

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ NUCLEAR RESET COMPLETED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Assessments deleted: ${totalDeleted}`);
    console.log(`   • Cycles deleted: ${cycleCount}`);
    console.log(`   • Assessment Cycles deleted: ${assessmentCycleCount}`);
    console.log('   • All counters reset to 0');
    console.log('');
    console.log('🎯 Database is now completely clean');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ ERROR');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('');
    process.exit(1);
  }
}

// ============================================================================
// RUN IT
// ============================================================================
console.log('');
console.log('⚠️  WARNING: This will DELETE ALL assessments and cycles!');
console.log('⚠️  Make sure you have a backup!');
console.log('');
console.log('Starting in 3 seconds...');
console.log('Press Ctrl+C to cancel NOW!');
console.log('');

setTimeout(() => {
  nuclearReset();
}, 3000);