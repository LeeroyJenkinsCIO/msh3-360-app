// src/utils/firebaseAdmin.js
import { 
  collection, 
  getDocs, 
  getDoc,
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  limit,
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
    });

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
      const counterDoc = await getDocs(query(collection(db, 'counters'), where('__name__', '==', 'mshCounter')));
      
      if (!counterDoc.empty) {
        const counterData = counterDoc.docs[0].data();
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
      nextMSHId: `MSH${currentMSHNumber + 1}`,
      latestAssessmentDate: latestDate ? latestDate.toISOString() : null
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}

/**
 * Delete draft assessments only
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

/**
 * Delete pending assessments only
 */
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

/**
 * Delete completed/published assessments only
 */
export async function deleteCompletedAssessments() {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    let deletedCount = 0;
    const deletePromises = snapshot.docs.map(async (document) => {
      const data = document.data();
      const status = data.status || data.alignmentStatus;
      
      // Delete if aligned, not-aligned, or completed (but not draft or pending)
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

/**
 * Delete all assessments and reset MSH counter (keeps cycles)
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
    
    // Reset MSH counter
    await resetMSHCounter();
    
    return {
      deletedCount,
      message: `Deleted ${deletedCount} assessments and reset counter`
    };
  } catch (error) {
    console.error('Error deleting all assessments:', error);
    throw error;
  }
}

/**
 * Delete all assessment cycles (keeps assessments)
 */
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
 * Complete transactional reset - delete everything
 */
export async function completeTransactionalReset() {
  try {
    // Delete all assessments
    const assessmentsRef = collection(db, 'assessments');
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    const assessmentDeletePromises = assessmentsSnapshot.docs.map(document => 
      deleteDoc(doc(db, 'assessments', document.id))
    );
    await Promise.all(assessmentDeletePromises);
    const deletedAssessments = assessmentsSnapshot.size;
    
    // Delete all cycles
    const cyclesRef = collection(db, 'assessmentCycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    const cycleDeletePromises = cyclesSnapshot.docs.map(document => 
      deleteDoc(doc(db, 'assessmentCycles', document.id))
    );
    await Promise.all(cycleDeletePromises);
    const deletedCycles = cyclesSnapshot.size;
    
    // Reset MSH counter
    await resetMSHCounter();
    
    console.log(`Transactional reset complete: ${deletedAssessments} assessments, ${deletedCycles} cycles deleted`);
    
    return {
      deletedAssessments,
      deletedCycles,
      message: 'Complete transactional reset successful'
    };
  } catch (error) {
    console.error('Error in transactional reset:', error);
    throw error;
  }
}

/**
 * Get filtered assessments based on criteria
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

/**
 * Get filtered cycles based on criteria
 */
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

/**
 * Delete selected assessments by ID array
 */
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

/**
 * Delete selected cycles by ID array
 */
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
 * Sync MSH counter to highest MSH number found in assessments
 */
export async function syncMSHCounter() {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    let highestMSH = 0;
    
    snapshot.docs.forEach(document => {
      const data = document.data();
      
      // Check all possible field names for MSH ID
      const mshId = data.mshId || data.MSHId || data.msh_id || data.id || document.id;
      
      console.log('Checking document:', document.id, 'MSH field:', mshId, 'All data:', data);
      
      if (mshId) {
        // Extract number from MSH format (e.g., "MSH5" -> 5)
        const mshNumber = parseInt(String(mshId).replace(/\D/g, ''), 10);
        if (!isNaN(mshNumber) && mshNumber > highestMSH) {
          highestMSH = mshNumber;
          console.log('New highest MSH found:', highestMSH);
        }
      }
    });
    
    console.log(`Final highest MSH: ${highestMSH}`);
    
    // Set counter to highest found
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
 * Reset MSH counter to 0
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

/**
 * Legacy functions for backwards compatibility
 */

// Old function names that may be used elsewhere
export async function safeDeletDrafts() {
  return deleteDraftAssessments();
}

export async function safeDeletPending() {
  return deletePendingAssessments();
}

export async function deleteAllAssessmentsAndReset() {
  return deleteAllAssessments();
}

export async function resetAndCreateNewCycle(cycleName, cycleType) {
  // This function is deprecated
  console.warn('resetAndCreateNewCycle is deprecated. Use completeTransactionalReset() and create cycles via AdminCyclesManager.');
  
  const resetResult = await completeTransactionalReset();
  
  return {
    ...resetResult,
    newCycle: {
      name: 'Use Admin Cycles Manager to create cycles',
      type: cycleType
    }
  };
}

// Backwards compatibility alias
export async function completeNuclearReset() {
  return completeTransactionalReset();
}