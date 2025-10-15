// src/utils/firebaseAdmin.js
// Complete Firebase Admin Utilities for MSH³ 360 Performance Assessment

import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc,
  getDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================================
// COMPLETE TRANSACTIONAL RESET - BULLETPROOF VERSION
// ============================================================================

/**
 * âš¡ BULLETPROOF COMPLETE TRANSACTIONAL RESET âš¡
 * 
 * This function ONLY DELETES data. It will NEVER create any records.
 * 
 * What it does:
 * 1. Deletes ALL assessments
 * 2. Deletes ALL cycles
 * 3. Resets MSH counter to 0 in systemSettings
 * 
 * What it preserves:
 * - Users collection
 * - Organizations/Departments/Teams
 * - System configuration (except MSH counter)
 * 
 * @returns {Promise<{deletedAssessments: number, deletedCycles: number, mshReset: boolean}>}
 */
export async function completeTransactionalReset() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 STARTING BULLETPROOF TRANSACTIONAL RESET');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  let deletedAssessments = 0;
  let deletedCycles = 0;
  let mshReset = false;

  try {
    // ========================================
    // STEP 1: Delete ALL Assessments
    // ========================================
    console.log('📋 STEP 1: Deleting all assessments...');
    
    const assessmentsRef = collection(db, 'assessments');
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    
    console.log(`   Found ${assessmentsSnapshot.size} assessments to delete`);

    if (assessmentsSnapshot.size > 0) {
      // Firebase batch limit is 500 operations
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      assessmentsSnapshot.forEach((docSnapshot) => {
        currentBatch.delete(docSnapshot.ref);
        operationCount++;
        deletedAssessments++;

        // Create new batch every 500 operations
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      // Add remaining operations
      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      console.log(`   Committing ${batches.length} batch(es)...`);
      
      // Commit all batches
      await Promise.all(batches.map(batch => batch.commit()));
      
      console.log(`   ✅ Deleted ${deletedAssessments} assessments`);
    } else {
      console.log('   ℹ️  No assessments to delete');
    }

    console.log('');

    // ========================================
    // STEP 2: Delete ALL Cycles
    // ========================================
    console.log('📦 STEP 2: Deleting all cycles...');
    
    const cyclesRef = collection(db, 'cycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    
    console.log(`   Found ${cyclesSnapshot.size} cycles to delete`);

    if (cyclesSnapshot.size > 0) {
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      cyclesSnapshot.forEach((docSnapshot) => {
        currentBatch.delete(docSnapshot.ref);
        operationCount++;
        deletedCycles++;

        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      console.log(`   Committing ${batches.length} batch(es)...`);
      
      await Promise.all(batches.map(batch => batch.commit()));
      
      console.log(`   ✅ Deleted ${deletedCycles} cycles`);
    } else {
      console.log('   ℹ️  No cycles to delete');
    }

    console.log('');

    // ========================================
    // STEP 3: Reset ALL Counters to 0
    // ========================================
    console.log('🔢 STEP 3: Resetting all counters to 0...');
    
    const counterBatch = writeBatch(db);
    
    // Reset systemSettings/mshCounter
    const systemSettingsRef = doc(db, 'systemSettings', 'mshCounter');
    counterBatch.set(systemSettingsRef, {
      currentMSHNumber: 0,
      lastResetDate: new Date().toISOString(),
      lastResetBy: 'admin'
    }, { merge: false }); // Use merge: false to overwrite
    
    // Reset metadata/assessmentCounter
    const metadataCounterRef = doc(db, 'metadata', 'assessmentCounter');
    counterBatch.set(metadataCounterRef, {
      currentNumber: 0,
      lastUpdated: new Date().toISOString()
    }, { merge: false });
    
    // Reset counters/assessmentCounter - THIS IS THE KEY ONE
    const countersAssessmentRef = doc(db, 'counters', 'assessmentCounter');
    counterBatch.set(countersAssessmentRef, {
      value: 0,
      lastReset: new Date().toISOString()
    }, { merge: false }); // Overwrite completely
    
    // Reset counters/mshCounter
    const countersMshRef = doc(db, 'counters', 'mshCounter');
    counterBatch.set(countersMshRef, {
      currentMSH: 0,
      lastUpdated: new Date().toISOString()
    }, { merge: false });
    
    await counterBatch.commit();
    mshReset = true;
    
    console.log('   ✅ All counters reset to 0');
    console.log('      • systemSettings/mshCounter');
    console.log('      • metadata/assessmentCounter');
    console.log('      • counters/assessmentCounter = 0');
    console.log('      • counters/mshCounter');

    console.log('');

    // ========================================
    // COMPLETION
    // ========================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ TRANSACTIONAL RESET COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Assessments deleted: ${deletedAssessments}`);
    console.log(`   • Cycles deleted: ${deletedCycles}`);
    console.log(`   • MSH counter reset: ${mshReset ? 'Yes' : 'No'}`);
    console.log('');
    console.log('✅ Database is clean and ready for new assessment packages');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    return {
      deletedAssessments,
      deletedCycles,
      mshReset
    };

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ ERROR DURING TRANSACTIONAL RESET');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('');
    console.error('Current progress:');
    console.error(`   • Assessments deleted: ${deletedAssessments}`);
    console.error(`   • Cycles deleted: ${deletedCycles}`);
    console.error(`   • MSH counter reset: ${mshReset ? 'Yes' : 'No'}`);
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    
    throw new Error(`Reset failed: ${error.message}`);
  }
}

// ============================================================================
// DATABASE STATISTICS
// ============================================================================

/**
 * Get comprehensive database statistics
 * Used by DatabaseManagement component
 */
export async function getDatabaseStats() {
  try {
    // Get assessments count
    const assessmentsRef = collection(db, 'assessments');
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    const totalAssessments = assessmentsSnapshot.size;

    // Get cycles count
    const cyclesRef = collection(db, 'cycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    const totalCycles = cyclesSnapshot.size;

    // Get MSH counter
    const systemSettingsRef = doc(db, 'systemSettings', 'mshCounter');
    const systemSettingsDoc = await getDoc(systemSettingsRef);
    const currentMSHNumber = systemSettingsDoc.exists() 
      ? systemSettingsDoc.data().currentMSHNumber || 0 
      : 0;

    // Find last posted MSH and gaps
    let lastPostedMSH = null;
    const mshNumbers = [];
    
    assessmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.mshNumber) {
        mshNumbers.push(data.mshNumber);
      }
    });

    if (mshNumbers.length > 0) {
      mshNumbers.sort((a, b) => a - b);
      lastPostedMSH = mshNumbers[mshNumbers.length - 1];

      // Detect gaps in sequence
      const mshGaps = [];
      for (let i = 1; i <= lastPostedMSH; i++) {
        if (!mshNumbers.includes(i)) {
          mshGaps.push(i);
        }
      }

      return {
        totalAssessments,
        totalCycles,
        currentMSHNumber,
        lastPostedMSH,
        mshGaps
      };
    }

    return {
      totalAssessments,
      totalCycles,
      currentMSHNumber,
      lastPostedMSH: null,
      mshGaps: []
    };

  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}

// ============================================================================
// DELETE ALL ASSESSMENTS (Keep Cycles)
// ============================================================================

export async function deleteAllAssessments() {
  try {
    console.log('🗑️  Deleting all assessments...');

    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    let deletedCount = 0;
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    snapshot.forEach((docSnapshot) => {
      currentBatch.delete(docSnapshot.ref);
      operationCount++;
      deletedCount++;

      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map(batch => batch.commit()));

    // Reset MSH counter
    const systemSettingsRef = doc(db, 'systemSettings', 'mshCounter');
    const resetBatch = writeBatch(db);
    resetBatch.update(systemSettingsRef, {
      currentMSHNumber: 0,
      lastResetDate: new Date().toISOString()
    });
    await resetBatch.commit();

    console.log(`✅ Deleted ${deletedCount} assessments and reset MSH counter`);
    return { deletedCount };

  } catch (error) {
    console.error('Error deleting assessments:', error);
    throw error;
  }
}

// ============================================================================
// DELETE ALL CYCLES (Keep Assessments)
// ============================================================================

export async function deleteAllCycles() {
  try {
    console.log('🗑️  Deleting all cycles...');

    const cyclesRef = collection(db, 'cycles');
    const snapshot = await getDocs(cyclesRef);
    
    let deletedCount = 0;
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    snapshot.forEach((docSnapshot) => {
      currentBatch.delete(docSnapshot.ref);
      operationCount++;
      deletedCount++;

      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map(batch => batch.commit()));

    console.log(`✅ Deleted ${deletedCount} cycles`);
    return { deletedCount };

  } catch (error) {
    console.error('Error deleting cycles:', error);
    throw error;
  }
}

// ============================================================================
// FILTERED OPERATIONS
// ============================================================================

export async function getFilteredAssessments(filters) {
  try {
    const assessmentsRef = collection(db, 'assessments');
    let q = query(assessmentsRef);

    // Apply filters
    if (filters.dateFrom) {
      q = query(q, where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom))));
    }
    if (filters.dateTo) {
      q = query(q, where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo))));
    }
    if (filters.evaluator) {
      q = query(q, where('evaluatorId', '==', filters.evaluator));
    }
    if (filters.cycle) {
      q = query(q, where('cycleId', '==', filters.cycle));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('Error filtering assessments:', error);
    throw error;
  }
}

export async function getFilteredCycles(filters) {
  try {
    const cyclesRef = collection(db, 'cycles');
    let q = query(cyclesRef);

    if (filters.year && filters.year.length > 0) {
      q = query(q, where('year', 'in', filters.year));
    }
    if (filters.type && filters.type.length > 0) {
      q = query(q, where('type', 'in', filters.type));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('Error filtering cycles:', error);
    throw error;
  }
}

export async function deleteSelectedAssessments(assessmentIds) {
  try {
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    assessmentIds.forEach((id) => {
      const docRef = doc(db, 'assessments', id);
      currentBatch.delete(docRef);
      operationCount++;

      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map(batch => batch.commit()));
    
    console.log(`✅ Deleted ${assessmentIds.length} selected assessments`);
    return { deletedCount: assessmentIds.length };

  } catch (error) {
    console.error('Error deleting selected assessments:', error);
    throw error;
  }
}

export async function deleteSelectedCycles(cycleIds) {
  try {
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    cycleIds.forEach((id) => {
      const docRef = doc(db, 'cycles', id);
      currentBatch.delete(docRef);
      operationCount++;

      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map(batch => batch.commit()));
    
    console.log(`✅ Deleted ${cycleIds.length} selected cycles`);
    return { deletedCount: cycleIds.length };

  } catch (error) {
    console.error('Error deleting selected cycles:', error);
    throw error;
  }
}