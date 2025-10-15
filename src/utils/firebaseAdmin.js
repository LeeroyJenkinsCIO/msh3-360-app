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
// NUCLEAR COUNTER RESET
// ============================================================================

/**
 * 💣 NUCLEAR COUNTER RESET
 * Deletes and recreates all counter documents at 0
 */
export async function resetAllCountersToZero() {
  console.log('🔢 NUCLEAR COUNTER RESET - Deleting and recreating...');
  
  try {
    // Step 1: DELETE all counter documents
    const countersToDelete = [
      doc(db, 'systemSettings', 'mshCounter'),
      doc(db, 'metadata', 'assessmentCounter'),
      doc(db, 'counters', 'assessmentCounter'),
      doc(db, 'counters', 'mshCounter')
    ];
    
    console.log('   Step 1: Deleting old counter documents...');
    await Promise.all(countersToDelete.map(docRef => 
      deleteDoc(docRef).catch(err => {
        // Ignore errors if document doesn't exist
        console.log(`   ℹ️  Document ${docRef.path} didn't exist, skipping`);
      })
    ));
    console.log('   ✅ Old counters deleted');
    
    // Step 2: Wait a moment for Firebase to process
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: CREATE new counter documents at 0
    console.log('   Step 2: Creating new counter documents at 0...');
    const batch = writeBatch(db);
    
    // systemSettings/mshCounter
    batch.set(doc(db, 'systemSettings', 'mshCounter'), {
      currentMSHNumber: 0,
      lastResetDate: new Date().toISOString(),
      lastResetBy: 'admin_nuclear_reset'
    });
    
    // metadata/assessmentCounter
    batch.set(doc(db, 'metadata', 'assessmentCounter'), {
      currentNumber: 0,
      lastUpdated: new Date().toISOString()
    });
    
    // counters/assessmentCounter - THE CRITICAL ONE
    batch.set(doc(db, 'counters', 'assessmentCounter'), {
      value: 0,
      lastReset: new Date().toISOString(),
      resetMethod: 'nuclear'
    });
    
    // counters/mshCounter
    batch.set(doc(db, 'counters', 'mshCounter'), {
      currentMSH: 0,
      lastUpdated: new Date().toISOString()
    });
    
    await batch.commit();
    console.log('   ✅ New counters created at 0');
    
    console.log('');
    console.log('✅ NUCLEAR COUNTER RESET COMPLETE');
    console.log('   All counters now at 0');
    console.log('');
    
    return {
      success: true,
      countersReset: 4
    };
    
  } catch (error) {
    console.error('❌ Error during nuclear counter reset:', error);
    throw error;
  }
}

// ============================================================================
// COMPLETE TRANSACTIONAL RESET - BULLETPROOF VERSION
// ============================================================================

/**
 * ⚡ BULLETPROOF COMPLETE TRANSACTIONAL RESET ⚡
 * 
 * This function ONLY DELETES data. It will NEVER create any records.
 * 
 * What it does:
 * 1. Deletes ALL assessments
 * 2. Deletes ALL cycles (legacy collection)
 * 3. Deletes ALL assessmentCycles
 * 4. NUCLEAR resets all counters to 0
 * 
 * What it preserves:
 * - Users collection
 * - Organizations/Departments/Teams
 * - System configuration (except counters)
 * 
 * @returns {Promise<{deletedAssessments: number, deletedCycles: number, deletedAssessmentCycles: number, mshReset: boolean}>}
 */
export async function completeTransactionalReset() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 STARTING BULLETPROOF TRANSACTIONAL RESET');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  let deletedAssessments = 0;
  let deletedCycles = 0;
  let deletedAssessmentCycles = 0;
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
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      assessmentsSnapshot.forEach((docSnapshot) => {
        currentBatch.delete(docSnapshot.ref);
        operationCount++;
        deletedAssessments++;

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
      console.log(`   ✅ Deleted ${deletedAssessments} assessments`);
    } else {
      console.log('   ℹ️  No assessments to delete');
    }

    console.log('');

    // ========================================
    // STEP 2: Delete ALL Cycles (Legacy)
    // ========================================
    console.log('📦 STEP 2: Deleting all cycles (legacy)...');
    
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
    // STEP 2b: Delete ALL Assessment Cycles
    // ========================================
    console.log('📦 STEP 2b: Deleting all assessment cycles...');
    const assessmentCyclesRef = collection(db, 'assessmentCycles');
    const assessmentCyclesSnapshot = await getDocs(assessmentCyclesRef);
    
    console.log(`   Found ${assessmentCyclesSnapshot.size} assessment cycles`);

    if (assessmentCyclesSnapshot.size > 0) {
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      assessmentCyclesSnapshot.forEach((docSnapshot) => {
        currentBatch.delete(docSnapshot.ref);
        count++;
        deletedAssessmentCycles++;

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
      console.log(`   ✅ Deleted ${deletedAssessmentCycles} assessment cycles`);
    } else {
      console.log('   ℹ️  No assessment cycles found');
    }

    console.log('');

    // ========================================
    // STEP 3: NUCLEAR COUNTER RESET
    // ========================================
    console.log('💣 STEP 3: NUCLEAR COUNTER RESET...');
    
    const resetResult = await resetAllCountersToZero();
    mshReset = resetResult.success;

    console.log('');

    // ========================================
    // COMPLETION
    // ========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TRANSACTIONAL RESET COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Assessments deleted: ${deletedAssessments}`);
    console.log(`   • Cycles deleted: ${deletedCycles}`);
    console.log(`   • Assessment Cycles deleted: ${deletedAssessmentCycles}`);
    console.log(`   • Counters reset: ${mshReset ? 'Yes (NUCLEAR)' : 'No'}`);
    console.log('');
    console.log('✅ Database is clean and ready for new assessment packages');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    return {
      deletedAssessments,
      deletedCycles: deletedCycles + deletedAssessmentCycles, // Combined for UI display
      deletedAssessmentCycles,
      mshReset
    };

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ ERROR DURING TRANSACTIONAL RESET');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('');
    console.error('Current progress:');
    console.error(`   • Assessments deleted: ${deletedAssessments}`);
    console.error(`   • Cycles deleted: ${deletedCycles}`);
    console.error(`   • Assessment Cycles deleted: ${deletedAssessmentCycles}`);
    console.error(`   • Counters reset: ${mshReset ? 'Yes' : 'No'}`);
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
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
 * ✅ FIXED: Uses correct 'assessmentCycles' collection
 */
export async function getDatabaseStats() {
  try {
    // Get assessments count
    const assessmentsRef = collection(db, 'assessments');
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    const totalAssessments = assessmentsSnapshot.size;

    // ✅ FIXED: Get cycles count from 'assessmentCycles' collection
    const cyclesRef = collection(db, 'assessmentCycles');
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
    
    assessmentsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
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

    // Reset MSH counter using nuclear method
    await resetAllCountersToZero();

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

/**
 * Delete all assessment cycles
 * ✅ FIXED: Uses correct 'assessmentCycles' collection
 */
export async function deleteAllCycles() {
  try {
    console.log('🗑️  Deleting all cycles...');

    // ✅ FIXED: Use 'assessmentCycles' collection
    const cyclesRef = collection(db, 'assessmentCycles');
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
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

  } catch (error) {
    console.error('Error filtering assessments:', error);
    throw error;
  }
}

/**
 * Get filtered cycles
 * ✅ FIXED: Uses correct 'assessmentCycles' collection
 */
export async function getFilteredCycles(filters) {
  try {
    // ✅ FIXED: Use 'assessmentCycles' collection
    const cyclesRef = collection(db, 'assessmentCycles');
    let q = query(cyclesRef);

    if (filters.year && filters.year.length > 0) {
      q = query(q, where('year', 'in', filters.year.map(y => parseInt(y))));
    }
    if (filters.type && filters.type.length > 0) {
      q = query(q, where('assessmentType', 'in', filters.type));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
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

/**
 * Delete selected cycles
 * ✅ FIXED: Uses correct 'assessmentCycles' collection
 */
export async function deleteSelectedCycles(cycleIds) {
  try {
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    cycleIds.forEach((id) => {
      // ✅ FIXED: Use 'assessmentCycles' collection
      const docRef = doc(db, 'assessmentCycles', id);
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