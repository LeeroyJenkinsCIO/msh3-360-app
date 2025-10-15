// src/utils/firebaseCounters.js
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get next MSH ID by incrementing counter atomically
 * @returns {Promise<string>} Next MSH ID (e.g., "MSH1", "MSH2")
 */
export async function getNextMSHId() {
  try {
    const counterRef = doc(db, 'counters', 'assessmentCounter');
    
    const newMshId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      if (!counterDoc.exists()) {
        // Initialize counter if it doesn't exist
        transaction.set(counterRef, { value: 1 });
        return 'MSH1';
      }
      
      // Get current value and increment
      const currentValue = counterDoc.data().value || 0;
      const nextValue = currentValue + 1;
      
      // Update counter
      transaction.update(counterRef, { value: nextValue });
      
      // Return new MSH ID
      return `MSH${nextValue}`;
    });
    
    return newMshId;
  } catch (error) {
    console.error('Error generating MSH ID:', error);
    // Fallback to timestamp-based ID if transaction fails
    return `MSH${Date.now()}`;
  }
}

/**
 * Reset assessment counter to 0
 * Used when clearing all assessments
 */
export async function resetAssessmentCounter() {
  const counterRef = doc(db, 'counters', 'assessmentCounter');
  await setDoc(counterRef, {
    value: 0,
    lastReset: new Date()
  });
  console.log('✅ Assessment counter reset to 0');
}

/**
 * Get current counter value
 */
export async function getCurrentCounterValue() {
  const counterRef = doc(db, 'counters', 'assessmentCounter');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    return 0;
  }
  
  return counterDoc.data().value || 0;
}

/**
 * Initialize counter if it doesn't exist
 */
export async function initializeCounter() {
  const counterRef = doc(db, 'counters', 'assessmentCounter');
  const counterDoc = await getDoc(counterRef);
  
  if (!counterDoc.exists()) {
    await setDoc(counterRef, {
      value: 0,
      createdAt: new Date()
    });
    console.log('✅ Counter initialized');
  }
}