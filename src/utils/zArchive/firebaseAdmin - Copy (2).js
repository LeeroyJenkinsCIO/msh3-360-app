// src/utils/firebaseAdmin.js
import { 
  collection, 
  getDocs, 
  getDoc,
  deleteDoc, 
  doc, 
  query, 
  where,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get comprehensive database statistics
 */
export async function getDatabaseStats() {
  try {
    // Get assessments stats
    const assessmentsRef = collection(db, 'assessments');
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    
    let draftCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let latestDate = null;
    
    // Track all MSH numbers for gap detection
    const mshNumbers = [];
    
    assessmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || data.alignmentStatus;
      
      if (status === 'draft') draftCount++;
      else if (status === 'pending') pendingCount++;
      else if (status === 'aligned' || status === 'not-aligned' || status === 'completed') completedCount++;
      
      // Track latest assessment date
      if (data.createdAt) {
        const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        if (!latestDate || createdDate > latestDate) {
          latestDate = createdDate;
        }
      }
      
      // Extract MSH number for gap detection
      const mshId = data.mshId || data.MSHId || data.msh_id;
      if (mshId) {
        const mshNumber = parseInt(String(mshId).replace(/\D/g, ''), 10);
        if (!isNaN(mshNumber) && mshNumber > 0) {
          mshNumbers.push(mshNumber);
        }
      }
    });

    // Calculate last posted MSH (highest found)
    let lastPostedMSH = null;
    if (mshNumbers.length > 0) {
      lastPostedMSH = Math.max(...mshNumbers);
    }

    // Calculate MSH gaps - ALL gaps from 1 to lastPostedMSH
    const mshGaps = [];
    if (lastPostedMSH && lastPostedMSH > 0) {
      const uniqueMSHNumbers = [...new Set(mshNumbers)].sort((a, b) => a - b);
      
      // Find all gaps from 1 to lastPostedMSH
      for (let i = 1; i <= lastPostedMSH; i++) {
        if (!uniqueMSHNumbers.includes(i)) {
          mshGaps.push(i);
        }
      }
    }

    // Get users count
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    // Get cycles count
    const cyclesRef = collection(db, 'assessmentCycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    
    // Get MSH counter from the specific document
    let currentMSHNumber = 0;
    try {
      const counterRef = doc(db, 'counters', 'mshCounter');
      const counterDoc = await getDoc(counterRef);
      
      if (counterDoc.exists()) {
        const counterData = counterDoc.data();
        currentMSHNumber = counterData.currentMSH || 0;
        console.log('Read MSH counter:', currentMSHNumber);
      } else {
        console.log('No counter document found');
      }
    } catch (error) {
      console.error('Error reading counter:', error);
    }

    return {
      totalAssessments: assessmentsSnapshot.size,
      totalUsers: usersSnapshot.size,
      totalCycles: cyclesSnapshot.size,
      draftCount,
      pendingCount,
      completedCount,
      currentMSHNumber,
      lastPostedMSH,
      mshGaps,
      nextMSHId: `MSH${currentMSHNumber + 1}`,
      latestAssessmentDate: latestDate ? latestDate.toISOString() : null
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}

/**
 * SELECTIVE OPERATIONS - Delete specific records without affecting MSH counter
 */

export async function getFilteredAssessments(filters) {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side filtering
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      results = results.filter(a => {
        const createdAt = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        return createdAt >= fromDate;
      });
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      results = results.filter(a => {
        const createdAt = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        return createdAt <= toDate;
      });
    }
    
    if (filters.evaluator) {
      results = results.filter(a => 
        a.evaluatorName?.toLowerCase().includes(filters.evaluator.toLowerCase())
      );
    }
    
    if (filters.cycle) {
      results = results.filter(a => 
        a.cycleId?.toLowerCase().includes(filters.cycle.toLowerCase())
      );
    }
    
    return results;
  } catch (error) {
    console.error('Error filtering assessments:', error);
    throw error;
  }
}

export async function deleteSelectedAssessments(assessmentIds) {
  try {
    const deletePromises = assessmentIds.map(id => 
      deleteDoc(doc(db, 'assessments', id))
    );
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${assessmentIds.length} selected assessments`);
    return { deletedCount: assessmentIds.length };
  } catch (error) {
    console.error('Error deleting selected assessments:', error);
    throw error;
  }
}

export async function getFilteredCycles(filters) {
  try {
    const cyclesRef = collection(db, 'assessmentCycles');
    const snapshot = await getDocs(cyclesRef);
    
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Apply filters
    if (filters.year && filters.year.length > 0) {
      results = results.filter(c => filters.year.includes(String(c.year)));
    }
    
    if (filters.type && filters.type.length > 0) {
      results = results.filter(c => filters.type.includes(c.assessmentType));
    }
    
    if (filters.status && filters.status.length > 0) {
      results = results.filter(c => filters.status.includes(c.status));
    }
    
    return results;
  } catch (error) {
    console.error('Error filtering cycles:', error);
    throw error;
  }
}

export async function deleteSelectedCycles(cycleIds) {
  try {
    const deletePromises = cycleIds.map(id => 
      deleteDoc(doc(db, 'assessmentCycles', id))
    );
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${cycleIds.length} selected cycles`);
    return { deletedCount: cycleIds.length };
  } catch (error) {
    console.error('Error deleting selected cycles:', error);
    throw error;
  }
}

/**
 * TRANSACTIONAL OPERATIONS - Complete deletion with counter reset
 */

export async function deleteAllAssessments() {
  try {
    // Delete all assessments
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    const deletePromises = snapshot.docs.map(document => 
      deleteDoc(doc(db, 'assessments', document.id))
    );
    await Promise.all(deletePromises);
    
    const deletedCount = snapshot.size;
    console.log(`Deleted ${deletedCount} assessments`);
    
    // Reset MSH counter to 0
    await resetMSHCounter();
    
    return {
      deletedCount,
      message: `Deleted ${deletedCount} assessments and reset MSH counter to 0`
    };
  } catch (error) {
    console.error('Error deleting all assessments:', error);
    throw error;
  }
}

export async function deleteAllCycles() {
  try {
    const cyclesRef = collection(db, 'assessmentCycles');
    const snapshot = await getDocs(cyclesRef);
    
    const deletePromises = snapshot.docs.map(document => 
      deleteDoc(doc(db, 'assessmentCycles', document.id))
    );
    await Promise.all(deletePromises);
    
    const deletedCount = snapshot.size;
    console.log(`Deleted ${deletedCount} cycles`);
    
    return {
      deletedCount,
      message: `Deleted ${deletedCount} cycles`
    };
  } catch (error) {
    console.error('Error deleting all cycles:', error);
    throw error;
  }
}

/**
 * ⚡ BULLETPROOF COMPLETE TRANSACTIONAL RESET ⚡
 * 
 * CRITICAL RULES:
 * 1. ONLY DELETES - NEVER CREATES
 * 2. Deletes ALL assessments
 * 3. Deletes ALL cycles
 * 4. Resets counter to 0
 * 5. Returns result and EXITS
 * 6. NO initialization logic
 * 7. NO data creation of any kind
 */
export async function completeTransactionalReset() {
  try {
    console.log('🚀 Starting complete transactional reset...');
    console.log('⚠️  DESTRUCTION ONLY MODE - NO DATA WILL BE CREATED');
    
    // ============================================
    // STEP 1: DELETE ALL ASSESSMENTS
    // ============================================
    console.log('');
    console.log('📦 STEP 1: Deleting assessments...');
    const assessmentsRef = collection(db, 'assessments');
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    
    console.log(`   Found ${assessmentsSnapshot.size} assessments to delete`);
    
    const assessmentDeletePromises = assessmentsSnapshot.docs.map(document => {
      console.log(`   🗑️  Deleting: ${document.id}`);
      return deleteDoc(doc(db, 'assessments', document.id));
    });
    
    await Promise.all(assessmentDeletePromises);
    const deletedAssessments = assessmentsSnapshot.size;
    console.log(`   ✅ Deleted ${deletedAssessments} assessments`);
    
    // ============================================
    // STEP 2: DELETE ALL CYCLES
    // ============================================
    console.log('');
    console.log('📦 STEP 2: Deleting cycles...');
    const cyclesRef = collection(db, 'assessmentCycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    
    console.log(`   Found ${cyclesSnapshot.size} cycles to delete`);
    
    const cycleDeletePromises = cyclesSnapshot.docs.map(document => {
      console.log(`   🗑️  Deleting: ${document.id}`);
      return deleteDoc(doc(db, 'assessmentCycles', document.id));
    });
    
    await Promise.all(cycleDeletePromises);
    const deletedCycles = cyclesSnapshot.size;
    console.log(`   ✅ Deleted ${deletedCycles} cycles`);
    
    // ============================================
    // STEP 3: RESET MSH COUNTER TO 0
    // ============================================
    console.log('');
    console.log('🔄 STEP 3: Resetting MSH counter...');
    const counterRef = doc(db, 'counters', 'mshCounter');
    await setDoc(counterRef, {
      currentMSH: 0,
      lastUpdated: Timestamp.now()
    });
    console.log('   ✅ MSH counter reset to 0');
    
    // ============================================
    // STEP 4: RETURN RESULT AND EXIT
    // ============================================
    console.log('');
    console.log('🎉 TRANSACTIONAL RESET COMPLETE');
    console.log(`   • Assessments deleted: ${deletedAssessments}`);
    console.log(`   • Cycles deleted: ${deletedCycles}`);
    console.log(`   • Counter reset: 0`);
    console.log('');
    console.log('⚠️  CRITICAL: Function exiting. NO data creation will occur.');
    
    const result = {
      deletedAssessments,
      deletedCycles,
      message: 'Complete transactional reset successful - database is clean'
    };
    
    // RETURN AND EXIT - DO NOT ADD ANY CODE AFTER THIS LINE
    return result;
    
  } catch (error) {
    console.error('❌ Error in transactional reset:', error);
    throw error;
  }
}

/**
 * UTILITY FUNCTIONS
 */

async function resetMSHCounter() {
  try {
    const counterRef = doc(db, 'counters', 'mshCounter');
    await setDoc(counterRef, {
      currentMSH: 0,
      lastUpdated: Timestamp.now()
    });
    console.log('MSH counter reset to 0');
  } catch (error) {
    console.error('Error resetting MSH counter:', error);
    throw error;
  }
}

export async function syncMSHCounter() {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    let highestMSH = 0;
    
    snapshot.docs.forEach(document => {
      const data = document.data();
      const mshId = data.mshId || data.MSHId || data.msh_id;
      
      if (mshId) {
        const mshNumber = parseInt(String(mshId).replace(/\D/g, ''), 10);
        if (!isNaN(mshNumber) && mshNumber > highestMSH) {
          highestMSH = mshNumber;
        }
      }
    });
    
    console.log(`Highest MSH found: ${highestMSH}`);
    
    const counterRef = doc(db, 'counters', 'mshCounter');
    await setDoc(counterRef, {
      currentMSH: highestMSH,
      lastUpdated: Timestamp.now()
    });
    
    console.log(`Synced MSH counter to ${highestMSH}`);
    
    return {
      syncedToNumber: highestMSH,
      totalAssessments: snapshot.size,
      message: `Counter synced to MSH${highestMSH}`
    };
  } catch (error) {
    console.error('Error syncing MSH counter:', error);
    throw error;
  }
}

/**
 * LEGACY FUNCTIONS - Status-based deletion
 */

export async function deleteDraftAssessments() {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const q = query(assessmentsRef, where('status', '==', 'draft'));
    const snapshot = await getDocs(q);
    
    let deletedCount = 0;
    const deletePromises = snapshot.docs.map(async (document) => {
      await deleteDoc(doc(db, 'assessments', document.id));
      deletedCount++;
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${deletedCount} draft assessments`);
    
    return deletedCount;
  } catch (error) {
    console.error('Error deleting drafts:', error);
    throw error;
  }
}

export async function deletePendingAssessments() {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const q = query(assessmentsRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    
    let deletedCount = 0;
    const deletePromises = snapshot.docs.map(async (document) => {
      await deleteDoc(doc(db, 'assessments', document.id));
      deletedCount++;
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${deletedCount} pending assessments`);
    
    return deletedCount;
  } catch (error) {
    console.error('Error deleting pending:', error);
    throw error;
  }
}

export async function deleteCompletedAssessments() {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    let deletedCount = 0;
    const deletePromises = snapshot.docs.map(async (document) => {
      const data = document.data();
      const status = data.status || data.alignmentStatus;
      
      if (status === 'aligned' || status === 'not-aligned' || status === 'completed') {
        await deleteDoc(doc(db, 'assessments', document.id));
        deletedCount++;
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${deletedCount} completed assessments`);
    
    return deletedCount;
  } catch (error) {
    console.error('Error deleting completed:', error);
    throw error;
  }
}

// Backwards compatibility aliases
export async function safeDeletDrafts() {
  return deleteDraftAssessments();
}

export async function safeDeletPending() {
  return deletePendingAssessments();
}

export async function deleteAllAssessmentsAndReset() {
  return deleteAllAssessments();
}

export async function completeNuclearReset() {
  return completeTransactionalReset();
}