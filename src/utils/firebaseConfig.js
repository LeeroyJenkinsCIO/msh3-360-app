// src/utils/firebaseConfig.js
// Utilities for reading organizational configuration from Firebase
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Get all pillars from Firebase
 * @returns {Promise<Array>} Array of pillar objects
 */
export async function getAllPillars() {
  try {
    const pillarsRef = collection(db, 'pillars');
    const snapshot = await getDocs(pillarsRef);
    
    const pillars = [];
    snapshot.forEach((doc) => {
      pillars.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by order field
    pillars.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return pillars;
  } catch (error) {
    console.error('Error fetching pillars:', error);
    throw new Error(`Failed to fetch pillars: ${error.message}`);
  }
}

/**
 * Get a specific pillar by ID
 * @param {string} pillarId - The pillar ID
 * @returns {Promise<Object>} Pillar object
 */
export async function getPillarById(pillarId) {
  try {
    const pillarRef = doc(db, 'pillars', pillarId);
    const snapshot = await getDoc(pillarRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching pillar:', error);
    throw new Error(`Failed to fetch pillar: ${error.message}`);
  }
}

/**
 * Get all sub-pillars for a specific pillar
 * @param {string} pillarId - The pillar ID
 * @returns {Promise<Array>} Array of sub-pillar objects
 */
export async function getSubPillarsForPillar(pillarId) {
  try {
    const pillar = await getPillarById(pillarId);
    
    if (!pillar || !pillar.subPillars) {
      return [];
    }
    
    // Convert subPillars object to array
    const subPillars = Object.keys(pillar.subPillars).map(key => ({
      id: key,
      name: pillar.subPillars[key].name,
      supervisorId: pillar.subPillars[key].supervisorId,
      memberIds: pillar.subPillars[key].memberIds || [],
      pillarId: pillarId
    }));
    
    return subPillars;
  } catch (error) {
    console.error('Error fetching sub-pillars:', error);
    return [];
  }
}

/**
 * Get pillar display name by ID
 * @param {string} pillarId - The pillar ID
 * @returns {string} Display name
 */
export function formatPillarName(pillarId, pillars = []) {
  const pillar = pillars.find(p => p.id === pillarId || p.pillarId === pillarId);
  return pillar?.pillarName || pillarId;
}

/**
 * Get pillar color by ID
 * @param {string} pillarId - The pillar ID
 * @param {Array} pillars - Array of pillar objects
 * @returns {string} Color hex code
 */
export function getPillarColor(pillarId, pillars = []) {
  const pillar = pillars.find(p => p.id === pillarId || p.pillarId === pillarId);
  return pillar?.color || '#6B7280'; // Default gray
}

/**
 * Get available roles/layers
 * Currently hardcoded, but can be moved to Firebase in the future
 */
export function getAvailableRoles() {
  return [
    { id: 'ISE', name: 'ISE', displayName: 'ISE - Individual Self Evaluation', order: 1 },
    { id: 'ISL', name: 'ISL', displayName: 'ISL - ISF Supervisor Leadership', order: 2 },
    { id: 'ISF', name: 'ISF', displayName: 'ISF - ISF Team Member', order: 3 },
    { id: 'HRP', name: 'HRP', displayName: 'HRP - HR Partner', order: 4 },
    { id: 'ADMIN', name: 'ADMIN', displayName: 'ADMIN - System Administrator', order: 5 }
  ];
}

/**
 * Check if a pillar exists and is valid
 * @param {string} pillarId - The pillar ID to check
 * @param {Array} pillars - Array of pillar objects
 * @returns {boolean}
 */
export function isValidPillar(pillarId, pillars = []) {
  return pillars.some(p => p.id === pillarId || p.pillarId === pillarId);
}

/**
 * Check if a sub-pillar exists for a given pillar
 * @param {string} pillarId - The pillar ID
 * @param {string} subPillarId - The sub-pillar ID
 * @param {Array} pillars - Array of pillar objects
 * @returns {boolean}
 */
export function isValidSubPillar(pillarId, subPillarId, pillars = []) {
  const pillar = pillars.find(p => p.id === pillarId || p.pillarId === pillarId);
  if (!pillar || !pillar.subPillars) return false;
  return subPillarId in pillar.subPillars;
}