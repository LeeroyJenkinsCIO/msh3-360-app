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
 * 1x1 Months: 24 assessments (one per direct report)
 * 360 Months: 25 assessments (one self-assessment per manager)
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
    
    // STEP 5: Get all direct reports (for 1x1 months)
    const allDirectReports = await getAllDirectReports(managers);
    console.log(`✅ Found ${allDirectReports.length} total direct reports`);
    
    // STEP 6: Create ALL assessments for this cycle (pending, no MSH ID)
    const assessmentSummary = await createAssessmentsForCycle(
      cycleIds,
      managers,
      allDirectReports,
      cycleStartYear,
      cycleStartMonth
    );
    
    // STEP 7: Calculate cycle number
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
      directReportsProcessed: allDirectReports.length,
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
 * Returns 25 managers total
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
      userId: userData.userId,
      displayName: userData.displayName || userData.name || 'Unknown',
      role: userData.layer,
      directReportIds: userData.directReportIds || []
    });
  });
  
  console.log(`📊 Found ${managers.length} managers (ISE/ISL)`);
  return managers;
};

/**
 * Get ALL unique direct reports across ALL managers
 * Returns 24 direct reports total
 */
const getAllDirectReports = async (managers) => {
  const usersRef = collection(db, 'users');
  const directReportMap = new Map(); // Use Map to avoid duplicates
  
  // Collect all unique direct report IDs
  for (const manager of managers) {
    if (manager.directReportIds && manager.directReportIds.length > 0) {
      for (const reportId of manager.directReportIds) {
        if (!directReportMap.has(reportId)) {
          // Fetch the direct report user data
          const userDoc = await getDoc(doc(usersRef, reportId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            directReportMap.set(reportId, {
              uid: userDoc.id,
              userId: userData.userId,
              displayName: userData.displayName || userData.name || 'Unknown',
              managerId: manager.uid // Track who their manager is
            });
          }
        }
      }
    }
  }
  
  const directReports = Array.from(directReportMap.values());
  console.log(`📊 Found ${directReports.length} unique direct reports`);
  return directReports;
};

// ═══════════════════════════════════════════════════════════════
// 📝 ASSESSMENT CREATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create ALL assessments for a cycle (3 months worth)
 * All created as PENDING with NO MSH ID
 * 
 * 1x1 Months: Create assessments for 24 direct reports
 * 360 Months: Create self-assessments for 25 managers
 */
const createAssessmentsForCycle = async (
  cycleIds, 
  managers, 
  directReports, 
  startYear, 
  startMonth
) => {
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
    const monthName = getMonthName(monthNum);
    
    console.log('');
    console.log(`📝 Creating assessments for ${monthName} ${yearNum} (${is360Month ? '360' : '1x1'})...`);
    
    const batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 500;
    
    if (is360Month) {
      // ═══════════════════════════════════════════════════════
      // 360 MONTH: Create 25 self-assessments (one per manager)
      // ═══════════════════════════════════════════════════════
      console.log(`🎯 360 Month: Creating ${managers.length} self-assessments...`);
      
      for (const manager of managers) {
        const assessmentId = `${manager.userId}-self-${cycleId}`;
        const assessmentRef = doc(db, 'assessments', assessmentId);
        
        const assessmentDoc = {
          assessorId: manager.userId,
          assessorName: manager.displayName,
          subjectId: manager.userId,
          subjectName: manager.displayName,
          cycleId,
          cycleName: `${monthName} ${yearNum}`,
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
        
        batch.set(assessmentRef, assessmentDoc);
        batchCount++;
        totalCount++;
        
        // Commit batch if reaching limit
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          console.log(`  💾 Committed batch of ${batchCount} assessments`);
          batchCount = 0;
        }
      }
      
    } else {
      // ═══════════════════════════════════════════════════════
      // 1x1 MONTH: Create 24 assessments (one per direct report)
      // ═══════════════════════════════════════════════════════
      console.log(`🎯 1x1 Month: Creating ${directReports.length} assessments...`);
      
      for (const report of directReports) {
        // Find the manager for this direct report
        const manager = managers.find(m => 
          m.directReportIds && m.directReportIds.includes(report.uid)
        );
        
        if (!manager) {
          console.warn(`⚠️ No manager found for ${report.displayName}`);
          continue;
        }
        
        const assessmentId = `${manager.userId}-${report.userId}-${cycleId}`;
        const assessmentRef = doc(db, 'assessments', assessmentId);
        
        const assessmentDoc = {
          assessorId: manager.userId,
          assessorName: manager.displayName,
          subjectId: report.userId,
          subjectName: report.displayName,
          cycleId,
          cycleName: `${monthName} ${yearNum}`,
          cycleMonth: monthNum,
          cycleYear: yearNum,
          assessmentType: '1x1',
          isSelfAssessment: false,
          
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
          console.log(`  💾 Committed batch of ${batchCount} assessments`);
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  💾 Committed final batch of ${batchCount} assessments`);
    }
    
    assessmentsByMonth[`${monthName} ${yearNum}`] = batchCount;
    console.log(`✅ Created ${batchCount} assessments for ${monthName} ${yearNum}`);
  }
  
  console.log('');
  console.log(`🎉 Total assessments created: ${totalCount}`);
  
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
  const snapshot = await getDocs(cyclesRef);
  
  if (snapshot.empty) {
    return null;
  }
  
  // Sort in JavaScript to avoid index requirements
  const cycles = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // Descending year
      return b.month - a.month; // Descending month
    });
  
  return cycles[0]; // Most recent
};

/**
 * Get all cycles
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