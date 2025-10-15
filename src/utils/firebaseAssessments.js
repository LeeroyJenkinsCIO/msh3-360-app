// src/utils/firebaseAssessments.js
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get all assessments
 */
export async function getAllAssessments() {
  const assessmentsRef = collection(db, 'assessments');
  const snapshot = await getDocs(assessmentsRef);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    completedAt: doc.data().completedAt?.toDate?.() || null,
    createdAt: doc.data().createdAt?.toDate?.() || null
  }));
}

/**
 * Delete all assessments
 */
export async function deleteAllAssessments() {
  const assessmentsRef = collection(db, 'assessments');
  const snapshot = await getDocs(assessmentsRef);
  
  console.log(`📦 Found ${snapshot.docs.length} assessments to delete`);
  
  const deletePromises = snapshot.docs.map(docSnap => 
    deleteDoc(doc(db, 'assessments', docSnap.id))
  );
  
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${snapshot.docs.length} assessments`);
  
  return snapshot.docs.length;
}

/**
 * Delete only draft assessments (safer option)
 */
export async function deleteDraftAssessments() {
  const assessmentsRef = collection(db, 'assessments');
  const snapshot = await getDocs(assessmentsRef);
  
  const drafts = snapshot.docs.filter(doc => doc.data().status === 'draft');
  console.log(`📦 Found ${drafts.length} draft assessments`);
  
  const deletePromises = drafts.map(docSnap => 
    deleteDoc(doc(db, 'assessments', docSnap.id))
  );
  
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${drafts.length} draft assessments`);
  
  return drafts.length;
}

/**
 * Delete only pending assessments
 */
export async function deletePendingAssessments() {
  const assessmentsRef = collection(db, 'assessments');
  const snapshot = await getDocs(assessmentsRef);
  
  const pending = snapshot.docs.filter(doc => doc.data().status === 'pending');
  console.log(`📦 Found ${pending.length} pending assessments`);
  
  const deletePromises = pending.map(docSnap => 
    deleteDoc(doc(db, 'assessments', docSnap.id))
  );
  
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${pending.length} pending assessments`);
  
  return pending.length;
}

/**
 * Delete assessments by status
 */
export async function deleteAssessmentsByStatus(status) {
  const assessmentsRef = collection(db, 'assessments');
  const snapshot = await getDocs(assessmentsRef);
  
  const filtered = snapshot.docs.filter(doc => doc.data().status === status);
  console.log(`📦 Found ${filtered.length} assessments with status: ${status}`);
  
  const deletePromises = filtered.map(docSnap => 
    deleteDoc(doc(db, 'assessments', docSnap.id))
  );
  
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${filtered.length} assessments`);
  
  return filtered.length;
}

/**
 * Get database statistics
 */
export async function getAssessmentStats() {
  const assessmentsRef = collection(db, 'assessments');
  const snapshot = await getDocs(assessmentsRef);
  
  const assessments = snapshot.docs.map(d => d.data());
  
  return {
    totalAssessments: assessments.length,
    aligned: assessments.filter(a => a.status === 'aligned').length,
    notAligned: assessments.filter(a => a.status === 'not-aligned').length,
    pending: assessments.filter(a => a.status === 'pending').length,
    draft: assessments.filter(a => a.status === 'draft').length
  };
}

/**
 * Get assessments by cycle ID
 */
export async function getAssessmentsByCycle(cycleId) {
  const assessmentsRef = collection(db, 'assessments');
  const q = query(assessmentsRef, where('cycleId', '==', cycleId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    completedAt: doc.data().completedAt?.toDate?.() || null,
    createdAt: doc.data().createdAt?.toDate?.() || null
  }));
}