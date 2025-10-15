// src/utils/CreateAssessmentCycles.js
// 🎪 THE RINGLEADER - Complete Assessment Cycle Orchestration System

import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where,
  writeBatch,
  serverTimestamp,
  orderBy,
  updateDoc,
  deleteDoc,
  limit
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN RINGLEADER FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * 🎪 THE RINGLEADER
 * Creates ONE cycle (3 months) and ALL associated pending assessments
 * 
 * @param {number|null} startYear - Year for cycle (if first time), null to auto-detect
 * @param {number|null} startMonth - Starting month (if first time), null to auto-detect
 * @returns {Promise<Object>} Summary of what was created
 */
export const createNextCycle = async (startYear = null, startMonth = null) => {
  console.log('🎪 Ringleader starting...');
  
  try {
    // STEP 1: Check if cycles exist
    const lastCycle = await getLastCycle();
    
    let cycleStartYear, cycleStartMonth;
    
    if (!lastCycle) {
      // NO CYCLES EXIST - First time setup
      if (!startYear || !startMonth) {
        throw new Error('First cycle requires startYear and startMonth parameters');
      }
      cycleStartYear = startYear;
      cycleStartMonth = startMonth;
      console.log(`🎬 First cycle! Starting at ${cycleStartMonth}/${cycleStartYear}`);
    } else {
      // CYCLES EXIST - Auto-calculate next 3 months
      const nextMonth = lastCycle.month + 1;
      cycleStartMonth = nextMonth > 12 ? 1 : nextMonth;
      cycleStartYear = nextMonth > 12 ? lastCycle.year + 1 : lastCycle.year;
      console.log(`🎬 Continuing from last cycle. Next: ${cycleStartMonth}/${cycleStartYear}`);
    }
    
    // STEP 2: Check for duplicates
    const hasDuplicates = await checkForDuplicateCycles(cycleStartYear, cycleStartMonth);
    if (hasDuplicates) {
      throw new Error(`Cycle already exists for ${cycleStartMonth}/${cycleStartYear}`);
    }
    
    // STEP 3: Create 3 months of cycle documents
    const cycleIds = await createCycleDocuments(cycleStartYear, cycleStartMonth);
    console.log('✅ Created cycle documents:', cycleIds);
    
    // STEP 4: Get all managers
    const managers = await getAllManagers();
    console.log(`✅ Found ${managers.length} managers`);
    
    // STEP 5: Create ALL assessments for this cycle (pending, no MSH ID)
    const assessmentSummary = await createAssessmentsForCycle(
      cycleIds,
      managers,
      cycleStartYear,
      cycleStartMonth
    );
    
    // STEP 6: Calculate cycle number
    const cycleNumber = getCycleNumber(cycleStartMonth);
    
    // 🎉 SUCCESS SUMMARY
    const summary = {
      success: true,
      cycleNumber,
      cycleStartMonth,
      cycleStartYear,
      cyclesCreated: cycleIds,
      monthsCreated: cycleIds.length,
      managersProcessed: managers.length,
      totalAssessments: assessmentSummary.total,
      assessmentsByMonth: assessmentSummary.byMonth,
      timestamp: new Date().toISOString()
    };
    
    console.log('🎊 Ringleader complete!', summary);
    return summary;
    
  } catch (error) {
    console.error('❌ Ringleader failed:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// 📅 CYCLE CREATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create 3 consecutive month cycle documents
 */
const createCycleDocuments = async (startYear, startMonth) => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const createdCycles = [];
  
  for (let i = 0; i < 3; i++) {
    let monthNum = startMonth + i;
    let yearNum = startYear;
    
    // Handle year rollover
    if (monthNum > 12) {
      monthNum = monthNum - 12;
      yearNum = yearNum + 1;
    }
    
    const paddedMonth = String(monthNum).padStart(2, '0');
    const cycleId = `cycle-${yearNum}-${paddedMonth}`;
    
    // Determine if 360 month (every 3rd month: 3, 6, 9, 12)
    const is360Month = [3, 6, 9, 12].includes(monthNum);
    const assessmentType = is360Month ? '360' : '1x1';
    
    // Calculate cycle number (1-4)
    const cycleNumber = getCycleNumber(startMonth);
    
    const cycleDoc = {
      cycleId,
      year: yearNum,
      month: monthNum,
      monthName: getMonthName(monthNum),
      assessmentType,
      cycleNumber,
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: 'admin',
      metadata: {
        monthInCycle: i + 1, // 1st, 2nd, or 3rd month of this cycle
        is360: is360Month
      }
    };
    
    await setDoc(doc(cyclesRef, cycleId), cycleDoc);
    createdCycles.push(cycleId);
    
    console.log(`✅ Created: ${cycleId} (${assessmentType}) - Cycle ${cycleNumber}/4, Month ${i+1}/3`);
  }
  
  return createdCycles;
};

/**
 * Check if cycles already exist for these months
 */
const checkForDuplicateCycles = async (startYear, startMonth) => {
  const cyclesRef = collection(db, 'assessmentCycles');
  
  for (let i = 0; i < 3; i++) {
    let monthNum = startMonth + i;
    let yearNum = startYear;
    
    if (monthNum > 12) {
      monthNum = monthNum - 12;
      yearNum = yearNum + 1;
    }
    
    const paddedMonth = String(monthNum).padStart(2, '0');
    const cycleId = `cycle-${yearNum}-${paddedMonth}`;
    
    const cycleDoc = await getDoc(doc(cyclesRef, cycleId));
    if (cycleDoc.exists()) {
      console.log(`⚠️ Duplicate found: ${cycleId}`);
      return true;
    }
  }
  
  return false;
};

// ═══════════════════════════════════════════════════════════════
// 👥 MANAGER & DIRECT REPORTS FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all managers (ISE + ISL layers)
 */
const getAllManagers = async () => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('layer', 'in', ['ISE', 'ISL']));
  
  const snapshot = await getDocs(q);
  const managers = [];
  
  snapshot.forEach((docSnap) => {
    const userData = docSnap.data();
    managers.push({
      uid: docSnap.id,
      displayName: userData.displayName || userData.name || 'Unknown',
      role: userData.layer,
      directReportIds: userData.directReportIds || []
    });
  });
  
  return managers;
};

/**
 * Get direct reports for a manager
 */
const getDirectReports = async (managerUid, directReportIds) => {
  if (!directReportIds || directReportIds.length === 0) {
    return [];
  }
  
  const usersRef = collection(db, 'users');
  const reports = [];
  
  // Fetch each direct report
  for (const reportId of directReportIds) {
    const userDoc = await getDoc(doc(usersRef, reportId));
    if (userDoc.exists()) {
      reports.push({
        uid: userDoc.id,
        displayName: userDoc.data().displayName || userDoc.data().name || 'Unknown'
      });
    }
  }
  
  return reports;
};

// ═══════════════════════════════════════════════════════════════
// 📝 ASSESSMENT CREATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create ALL assessments for a cycle (3 months worth)
 * All created as PENDING with NO MSH ID
 */
const createAssessmentsForCycle = async (cycleIds, managers, startYear, startMonth) => {
  const assessmentsByMonth = {};
  let totalCount = 0;
  
  for (let i = 0; i < 3; i++) {
    let monthNum = startMonth + i;
    let yearNum = startYear;
    
    if (monthNum > 12) {
      monthNum = monthNum - 12;
      yearNum = yearNum + 1;
    }
    
    const cycleId = cycleIds[i];
    const is360Month = [3, 6, 9, 12].includes(monthNum);
    
    console.log(`📝 Creating assessments for ${getMonthName(monthNum)} ${yearNum}...`);
    
    const batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 500;
    
    for (const manager of managers) {
      // Get direct reports
      const directReports = await getDirectReports(manager.uid, manager.directReportIds);
      
      // Create manager → report assessments
      for (const report of directReports) {
        const assessmentId = `${manager.uid}-${report.uid}-${cycleId}`;
        const assessmentRef = doc(db, 'assessments', assessmentId);
        
        const assessmentDoc = {
          assessorId: manager.uid,
          assessorName: manager.displayName,
          subjectId: report.uid,
          subjectName: report.displayName,
          cycleId,
          cycleName: `${getMonthName(monthNum)} ${yearNum}`,
          cycleMonth: monthNum,
          cycleYear: yearNum,
          assessmentType: is360Month ? '360' : '1x1',
          
          // 🎯 PENDING STATE - NO MSH ID YET!
          status: 'pending',
          mshId: null,
          ratings: {},
          notes: '',
          
          createdAt: serverTimestamp(),
          dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
        };
        
        batch.set(assessmentRef, assessmentDoc);
        batchCount++;
        totalCount++;
        
        // Commit batch if reaching limit
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batchCount = 0;
        }
      }
      
      // If 360 month, add SELF-ASSESSMENT
      if (is360Month) {
        const selfAssessmentId = `${manager.uid}-self-${cycleId}`;
        const selfAssessmentRef = doc(db, 'assessments', selfAssessmentId);
        
        const selfAssessmentDoc = {
          assessorId: manager.uid,
          assessorName: manager.displayName,
          subjectId: manager.uid,
          subjectName: manager.displayName,
          cycleId,
          cycleName: `${getMonthName(monthNum)} ${yearNum}`,
          cycleMonth: monthNum,
          cycleYear: yearNum,
          assessmentType: '360',
          isSelfAssessment: true,
          
          // 🎯 PENDING STATE - NO MSH ID YET!
          status: 'pending',
          mshId: null,
          ratings: {},
          notes: '',
          
          createdAt: serverTimestamp(),
          dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
        };
        
        batch.set(selfAssessmentRef, selfAssessmentDoc);
        batchCount++;
        totalCount++;
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }
    
    assessmentsByMonth[`${getMonthName(monthNum)} ${yearNum}`] = batchCount;
    console.log(`✅ Created ${batchCount} assessments for ${getMonthName(monthNum)} ${yearNum}`);
  }
  
  return {
    total: totalCount,
    byMonth: assessmentsByMonth
  };
};

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get the most recent cycle
 */
export const getLastCycle = async () => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const q = query(cyclesRef, orderBy('year', 'desc'), orderBy('month', 'desc'), limit(1));
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Get all cycles
 * ✅ FIXED: No orderBy to avoid index requirement - sort in JavaScript instead
 */
export const getAllCycles = async () => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const snapshot = await getDocs(cyclesRef);
  
  // Sort in JavaScript instead of Firestore
  const cycles = snapshot.docs
    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
      // Sort by year asc, then month asc
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  
  return cycles;
};

/**
 * Get active cycle (current month)
 */
export const getActiveCycle = async () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  const paddedMonth = String(currentMonth).padStart(2, '0');
  const cycleId = `cycle-${currentYear}-${paddedMonth}`;
  
  const cycleDoc = await getDoc(doc(db, 'assessmentCycles', cycleId));
  
  if (cycleDoc.exists()) {
    return { id: cycleDoc.id, ...cycleDoc.data() };
  }
  
  return null;
};

/**
 * Get cycle by ID
 */
export const getCycleById = async (cycleId) => {
  const cycleDoc = await getDoc(doc(db, 'assessmentCycles', cycleId));
  
  if (cycleDoc.exists()) {
    return { id: cycleDoc.id, ...cycleDoc.data() };
  }
  
  return null;
};

/**
 * Check if cycles exist for a year
 */
export const cyclesExistForYear = async (year) => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const q = query(cyclesRef, where('year', '==', year), limit(1));
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Close a cycle (mark as completed)
 */
export const closeCycle = async (cycleId) => {
  const cycleRef = doc(db, 'assessmentCycles', cycleId);
  await updateDoc(cycleRef, {
    status: 'closed',
    closedAt: serverTimestamp()
  });
  console.log(`✅ Cycle ${cycleId} closed`);
};

/**
 * Delete a specific cycle
 */
export const deleteCycle = async (cycleId) => {
  await deleteDoc(doc(db, 'assessmentCycles', cycleId));
  console.log(`✅ Cycle ${cycleId} deleted`);
};

// ═══════════════════════════════════════════════════════════════
// 🧮 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get month name from number
 */
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}

/**
 * Get cycle number (1-4) based on starting month
 */
function getCycleNumber(startMonth) {
  // Oct/Nov/Dec = Cycle 1
  // Jan/Feb/Mar = Cycle 2
  // Apr/May/Jun = Cycle 3
  // Jul/Aug/Sep = Cycle 4
  if (startMonth >= 10 && startMonth <= 12) return 1;
  if (startMonth >= 1 && startMonth <= 3) return 2;
  if (startMonth >= 4 && startMonth <= 6) return 3;
  if (startMonth >= 7 && startMonth <= 9) return 4;
  return 1; // Default
}

/**
 * Get last day of month
 */
function getLastDayOfMonth(month, year) {
  return new Date(year, month, 0).getDate();
}