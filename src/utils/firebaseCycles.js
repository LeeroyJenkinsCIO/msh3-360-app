// src/utils/firebaseCycles.js
import { collection, getDocs, deleteDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create new assessment cycle
 * @param {string} cycleName - Name of the cycle (e.g., "Q4 2025 Performance Cycle")
 * @param {string} type - Type of cycle: '1x1' or '360'
 */
export async function createNewAssessmentCycle(cycleName = 'Q4 2025 Performance Cycle', type = '1x1') {
  const cycleData = {
    cycleName,
    cycleId: `cycle-${Date.now()}`,
    type, // '1x1' or '360'
    startDate: new Date(),
    endDate: null,
    status: 'active', // active, closed, archived
    phase: 'data-collection', // data-collection, calibration, feedback
    settings: {
      enableSelfAssessment: type === '360',
      enablePeerNomination: type === '360',
      enable360: type === '360',
      requireManagerApproval: false,
      assessmentType: type,
      scoringScale: {
        min: 0,
        max: 2,
        type: '0-2'
      },
      nineBoxThresholds: {
        low: { min: 0, max: 2 },
        mid: { min: 3, max: 4 },
        high: { min: 5, max: 6 }
      }
    },
    participants: [],
    statistics: {
      totalAssessments: 0,
      completedAssessments: 0,
      pendingAssessments: 0,
      notAlignedAssessments: 0
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system-admin',
    notes: `${type.toUpperCase()} assessment cycle created via admin panel`
  };
  
  const cycleRef = doc(db, 'assessmentCycles', cycleData.cycleId);
  await setDoc(cycleRef, cycleData);
  
  console.log('✅ New assessment cycle created:', cycleData.cycleId);
  
  return cycleData;
}

/**
 * Get all assessment cycles
 */
export async function getAllCycles() {
  const cyclesRef = collection(db, 'assessmentCycles');
  const snapshot = await getDocs(cyclesRef);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate?.toDate?.() || null,
    endDate: doc.data().endDate?.toDate?.() || null,
    createdAt: doc.data().createdAt?.toDate?.() || null,
    updatedAt: doc.data().updatedAt?.toDate?.() || null
  }));
}

/**
 * Get active cycles
 */
export async function getActiveCycles() {
  const cyclesRef = collection(db, 'assessmentCycles');
  const q = query(cyclesRef, where('status', '==', 'active'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate?.toDate?.() || null,
    endDate: doc.data().endDate?.toDate?.() || null
  }));
}

/**
 * Close a cycle (mark as completed)
 */
export async function closeCycle(cycleId) {
  const cycleRef = doc(db, 'assessmentCycles', cycleId);
  await setDoc(cycleRef, {
    status: 'closed',
    endDate: new Date(),
    updatedAt: new Date()
  }, { merge: true });
  
  console.log('✅ Cycle closed:', cycleId);
}

/**
 * Delete all assessment cycles
 */
export async function deleteAllCycles() {
  const cyclesRef = collection(db, 'assessmentCycles');
  const snapshot = await getDocs(cyclesRef);
  
  console.log(`📦 Found ${snapshot.docs.length} cycles to delete`);
  
  const deletePromises = snapshot.docs.map(docSnap => 
    deleteDoc(doc(db, 'assessmentCycles', docSnap.id))
  );
  
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${snapshot.docs.length} cycles`);
  
  return snapshot.docs.length;
}

/**
 * Delete specific cycle
 */
export async function deleteCycle(cycleId) {
  await deleteDoc(doc(db, 'assessmentCycles', cycleId));
  console.log('✅ Cycle deleted:', cycleId);
}