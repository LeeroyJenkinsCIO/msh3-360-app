// src/utils/firebaseUsers.js
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get all users from Firestore
 */
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

/**
 * Create a new user in Firestore
 */
export const createUser = async (userData) => {
  try {
    const usersRef = collection(db, 'users');
    
    // Prepare user data with flags object
    const newUser = {
      userId: userData.userId || userData.email.split('@')[0],
      email: userData.email,
      displayName: userData.displayName,
      layer: userData.layer,
      pillar: userData.pillar || null,
      subPillar: userData.subPillar || null,
      pillarRole: userData.pillarRole || userData.jobTitle || null,
      jobTitle: userData.jobTitle || userData.pillarRole || null,
      directReportIds: userData.directReportIds || [],
      flags: {
        isAdmin: userData.isAdmin || false,
        isSupervisor: userData.isSupervisor || false,
        isExecutive: userData.layer === 'ISE' || false,
        isPillarLeader: userData.layer === 'ISL' || false,
        isHRP: userData.layer === 'HRP' || false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(usersRef, newUser);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update an existing user in Firestore
 */
export const updateUser = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Prepare update data with flags
    const updateData = {
      displayName: userData.displayName,
      layer: userData.layer,
      pillar: userData.pillar || null,
      subPillar: userData.subPillar || null,
      pillarRole: userData.pillarRole || userData.jobTitle || null,
      jobTitle: userData.jobTitle || userData.pillarRole || null,
      directReportIds: userData.directReportIds || [],
      flags: {
        isAdmin: userData.isAdmin || false,
        isSupervisor: userData.isSupervisor || false,
        isExecutive: userData.layer === 'ISE' || false,
        isPillarLeader: userData.layer === 'ISL' || false,
        isHRP: userData.layer === 'HRP' || false
      },
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Get assessment counts for all users across ALL cycles
 * Returns object: { userId: { asAssessor: number, asAssessed: number } }
 */
export const getAssessmentCounts = async () => {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    // Initialize counts object
    const counts = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const assessorId = data.assessorId;
      const assessedId = data.assessedPersonId;
      
      // Initialize user objects if they don't exist
      if (!counts[assessorId]) {
        counts[assessorId] = { asAssessor: 0, asAssessed: 0 };
      }
      if (!counts[assessedId]) {
        counts[assessedId] = { asAssessor: 0, asAssessed: 0 };
      }
      
      // Increment counts
      counts[assessorId].asAssessor++;
      counts[assessedId].asAssessed++;
    });
    
    return counts;
  } catch (error) {
    console.error('Error getting assessment counts:', error);
    return {};
  }
};

/**
 * Get direct report counts for all users
 * Returns object: { userId: number }
 */
export const getDirectReportCounts = (users) => {
  const counts = {};
  
  users.forEach(user => {
    if (user.directReportIds && Array.isArray(user.directReportIds)) {
      counts[user.id] = user.directReportIds.length;
    }
  });
  
  return counts;
};