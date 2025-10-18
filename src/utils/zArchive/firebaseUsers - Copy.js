// src/utils/firebaseUsers.js
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp, addDoc, query, where } from 'firebase/firestore';

/**
 * Get all users from Firestore
 */
export async function getAllUsers() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users = [];
    snapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
}

/**
 * Update user in Firestore
 * @param {string} userId - The user ID to update
 * @param {object} userData - The user data to update
 */
export async function updateUser(userId, userData) {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Prepare update data with nested flags structure
    // Note: Email is intentionally excluded - it should not be changed via this function
    const updateData = {
      displayName: userData.displayName,
      layer: userData.layer,
      pillar: userData.pillar || null,
      subPillar: userData.subPillar || null,
      pillarRole: userData.pillarRole || null,
      jobTitle: userData.jobTitle || null,  // Add job title support
      // Store supervisor and admin flags in nested structure
      'flags.isSupervisor': userData.isSupervisor || false,
      'flags.isAdmin': userData.isAdmin || false,
      // Also update top-level fields for backwards compatibility
      isSupervisor: userData.isSupervisor || false,
      isAdmin: userData.isAdmin || false,
      updatedAt: serverTimestamp()
    };

    await updateDoc(userRef, updateData);
    console.log('User updated successfully:', userId);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

/**
 * Get assessment counts for all users
 * Returns an object with userId as key and counts object as value
 */
export async function getAssessmentCounts() {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const snapshot = await getDocs(assessmentsRef);
    
    const counts = {};
    
    snapshot.forEach((doc) => {
      const assessment = doc.data();
      const assessorId = assessment.assessorId || assessment.raterId;
      const assessedId = assessment.employeeId || assessment.subjectId;
      
      if (!counts[assessorId]) {
        counts[assessorId] = { asAssessor: 0, asAssessed: 0 };
      }
      if (!counts[assessedId]) {
        counts[assessedId] = { asAssessor: 0, asAssessed: 0 };
      }
      
      counts[assessorId].asAssessor++;
      counts[assessedId].asAssessed++;
    });
    
    return counts;
  } catch (error) {
    console.error('Error fetching assessment counts:', error);
    return {};
  }
}

/**
 * Count direct reports for each user
 * Returns an object with userId as key and count as value
 */
export function getDirectReportCounts(users) {
  const counts = {};
  
  users.forEach(user => {
    // Count users who have this user as their supervisor
    const directReports = users.filter(u => 
      u.supervisorId === user.id || 
      u.supervisor === user.id ||
      u.managerId === user.id
    );
    
    // Also check if user has directReportIds array
    const fromDirectReportIds = user.directReportIds?.length || 0;
    
    // Use the maximum of both methods
    counts[user.id] = Math.max(directReports.length, fromDirectReportIds);
  });
  
  return counts;
}

/**
 * Create a new user in Firestore
 * @param {object} userData - The user data to create
 * @returns {Promise<string>} The new user ID
 */
export async function createUser(userData) {
  try {
    const usersRef = collection(db, 'users');
    
    const newUser = {
      displayName: userData.displayName,
      email: userData.email,
      layer: userData.layer,
      pillar: userData.pillar || null,
      subPillar: userData.subPillar || null,
      pillarRole: userData.pillarRole || null,
      jobTitle: userData.jobTitle || null,
      'flags.isSupervisor': userData.isSupervisor || false,
      'flags.isAdmin': userData.isAdmin || false,
      isSupervisor: userData.isSupervisor || false,
      isAdmin: userData.isAdmin || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(usersRef, newUser);
    console.log('User created successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }
}