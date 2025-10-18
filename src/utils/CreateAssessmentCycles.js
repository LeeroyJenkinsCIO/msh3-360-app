// 📁 SAVE TO: src/utils/CreateAssessmentCycles.js
// 🎪 THE RINGLEADER - UPDATED WITH MSH³ VALIDATION
// Complete Assessment Cycle Orchestration System

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
    const cycleType = is360Month ? '360' : '1x1';
    
    // Calculate cycle number (1-4)
    const cycleNumber = getCycleNumber(startMonth);
    
    const cycleDoc = {
      cycleId,
      year: yearNum,
      month: monthNum,
      monthName: getMonthName(monthNum),
      cycleType,
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
    
    console.log(`✅ Created: ${cycleId} (${cycleType}) - Cycle ${cycleNumber}/4, Month ${i+1}/3`);
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
 * Get all managers (ISE + ISL + ISF Supervisors)
 */
const getAllManagers = async () => {
  const usersRef = collection(db, 'users');
  
  // Get ISE and ISL layers
  const managersQuery = query(usersRef, where('layer', 'in', ['ISE', 'ISL']));
  const managersSnapshot = await getDocs(managersQuery);
  
  // Get ISF supervisors
  const supervisorsQuery = query(usersRef, where('flags.isSupervisor', '==', true));
  const supervisorsSnapshot = await getDocs(supervisorsQuery);
  
  const managers = [];
  
  // Add ISE/ISL managers
  managersSnapshot.forEach((docSnap) => {
    const userData = docSnap.data();
    managers.push({
      uid: docSnap.id,
      userId: userData.userId,
      displayName: userData.displayName || userData.name || 'Unknown',
      role: userData.layer,
      directReportIds: userData.directReportIds || []
    });
  });
  
  // Add ISF supervisors
  supervisorsSnapshot.forEach((docSnap) => {
    const userData = docSnap.data();
    if (!managers.find(m => m.uid === docSnap.id)) {
      managers.push({
        uid: docSnap.id,
        userId: userData.userId,
        displayName: userData.displayName || userData.name || 'Unknown',
        role: 'ISF Supervisor',
        directReportIds: userData.directReportIds || []
      });
    }
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
  
  for (const userId of directReportIds) {
    const q = query(usersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      reports.push({
        uid: userDoc.id,
        userId: userId,
        displayName: userDoc.data().displayName || userDoc.data().name || 'Unknown'
      });
    }
  }
  
  return reports;
};

// ═══════════════════════════════════════════════════════════════
// 📝 ASSESSMENT CREATION FUNCTIONS (CLEAN SCHEMA)
// ═══════════════════════════════════════════════════════════════

/**
 * Create ALL assessments for a cycle (3 months worth)
 * Month 1 & 2: 1x1 assessments (manager → direct report)
 * Month 3: 360 assessments (self + bidirectional + P2P)
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
    const cycleType = is360Month ? '360' : '1x1';
    
    console.log(`📝 Creating assessments for ${getMonthName(monthNum)} ${yearNum} (${cycleType})...`);
    
    const batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 500;
    
    if (is360Month) {
      // ═══════════════════════════════════════════════════════════
      // 360 MONTH: Self-assessments + Bidirectional + P2P
      // ═══════════════════════════════════════════════════════════
      
      // STEP 1: Create self-assessments for ALL participants
      
      // Self-assessments for managers
      for (const manager of managers) {
        const selfAssessmentId = `${manager.userId}-self-${cycleId}`;
        const selfAssessmentRef = doc(db, 'assessments', selfAssessmentId);
        
        batch.set(selfAssessmentRef, {
          // Cycle context
          cycleId,
          cycleName: `${getMonthName(monthNum)} ${yearNum}`,
          cycleMonth: monthNum,
          cycleYear: yearNum,
          cycleType: '360',
          
          // Assessment identity - CLEAN SCHEMA
          assessmentType: 'self',
          
          // Participants
          assessorId: manager.uid,
          assessorName: manager.displayName,
          subjectId: manager.uid,
          subjectName: manager.displayName,
          
          // Assessment data
          status: 'pending',
          mshId: null,
          composite: null,
          scores: {},
          notes: {},
          
          // Timestamps
          createdAt: serverTimestamp(),
          dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
        });
        
        batchCount++;
        totalCount++;
        
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batchCount = 0;
        }
      }
      
      // Self-assessments for direct reports (ISF employees)
      for (const manager of managers) {
        const directReports = await getDirectReports(manager.uid, manager.directReportIds);
        
        for (const report of directReports) {
          const selfAssessmentId = `${report.userId}-self-${cycleId}`;
          const selfAssessmentRef = doc(db, 'assessments', selfAssessmentId);
          
          batch.set(selfAssessmentRef, {
            // Cycle context
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            
            // Assessment identity - CLEAN SCHEMA
            assessmentType: 'self',
            
            // Participants
            assessorId: report.uid,
            assessorName: report.displayName,
            subjectId: report.uid,
            subjectName: report.displayName,
            
            // Assessment data
            status: 'pending',
            mshId: null,
            composite: null,
            scores: {},
            notes: {},
            
            // Timestamps
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
      // STEP 2: Create bidirectional manager ↔ direct report assessments
      
      for (const manager of managers) {
        const directReports = await getDirectReports(manager.uid, manager.directReportIds);
        
        for (const report of directReports) {
          // Downward: Manager assesses direct report
          const downwardId = `${manager.userId}-assesses-${report.userId}-${cycleId}`;
          const downwardRef = doc(db, 'assessments', downwardId);
          
          batch.set(downwardRef, {
            // Cycle context
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            
            // Assessment identity - CLEAN SCHEMA
            assessmentType: 'manager-down',
            
            // Participants
            assessorId: manager.uid,
            assessorName: manager.displayName,
            subjectId: report.uid,
            subjectName: report.displayName,
            
            // Assessment data
            status: 'pending',
            mshId: null,
            composite: null,
            scores: {},
            notes: {},
            
            // Timestamps
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          // Upward: Direct report assesses manager
          const upwardId = `${report.userId}-assesses-${manager.userId}-${cycleId}`;
          const upwardRef = doc(db, 'assessments', upwardId);
          
          batch.set(upwardRef, {
            // Cycle context
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            
            // Assessment identity - CLEAN SCHEMA
            assessmentType: 'manager-up',
            
            // Participants
            assessorId: report.uid,
            assessorName: report.displayName,
            subjectId: manager.uid,
            subjectName: manager.displayName,
            
            // Assessment data
            status: 'pending',
            mshId: null,
            composite: null,
            scores: {},
            notes: {},
            
            // Timestamps
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
      // STEP 3: Create ISL peer-to-peer assessments
      
      const islManagers = managers.filter(m => m.role === 'ISL');
      
      for (const islAssessor of islManagers) {
        for (const islSubject of islManagers) {
          // Skip self (P2P doesn't include self)
          if (islAssessor.uid === islSubject.uid) continue;
          
          const p2pId = `${islAssessor.userId}-p2p-${islSubject.userId}-${cycleId}`;
          const p2pRef = doc(db, 'assessments', p2pId);
          
          batch.set(p2pRef, {
            // Cycle context
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            
            // Assessment identity - CLEAN SCHEMA
            assessmentType: 'peer',
            
            // Participants
            assessorId: islAssessor.uid,
            assessorName: islAssessor.displayName,
            subjectId: islSubject.uid,
            subjectName: islSubject.displayName,
            
            // Assessment data
            status: 'pending',
            mshId: null,
            composite: null,
            scores: {},
            notes: {},
            
            // Timestamps
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
    } else {
      // ═══════════════════════════════════════════════════════════
      // 1x1 MONTHS: Manager → Direct Report only
      // ═══════════════════════════════════════════════════════════
      
      for (const manager of managers) {
        const directReports = await getDirectReports(manager.uid, manager.directReportIds);
        
        for (const report of directReports) {
          const assessmentId = `${manager.userId}-${report.userId}-${cycleId}`;
          const assessmentRef = doc(db, 'assessments', assessmentId);
          
          batch.set(assessmentRef, {
            // Cycle context
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '1x1',
            
            // Assessment identity - CLEAN SCHEMA
            assessmentType: 'one-on-one',
            
            // Participants
            assessorId: manager.uid,
            assessorName: manager.displayName,
            subjectId: report.uid,
            subjectName: report.displayName,
            
            // Assessment data
            status: 'pending',
            mshId: null,
            composite: null,
            scores: {},
            notes: {},
            
            // Timestamps
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
    }
    
    // Commit any remaining batch
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
 */
export const getAllCycles = async () => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const snapshot = await getDocs(cyclesRef);
  
  const cycles = snapshot.docs
    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
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

/**
 * Get MSH³ published count for a specific cycle
 */
export const getMshPublishedCount = async (cycleId) => {
  try {
    const mshQuery = query(
      collection(db, 'mshScores'),
      where('cycleId', '==', cycleId)
    );
    const snapshot = await getDocs(mshQuery);
    return snapshot.size;
  } catch (error) {
    console.error(`Error getting MSH count for cycle ${cycleId}:`, error);
    return 0;
  }
};

/**
 * Get total MSH³ published count across all cycles
 */
export const getTotalMshPublished = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'mshScores'));
    return snapshot.size;
  } catch (error) {
    console.error('Error getting total MSH count:', error);
    return 0;
  }
};

// ═══════════════════════════════════════════════════════════════
// 📊 ASSESSMENT COUNT PREVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Get preview of assessment counts based on current user database
 * Shows expected counts for a full 3-month cycle
 */
export const getAssessmentCountPreview = async () => {
  try {
    console.log('📊 Calculating assessment count preview...');
    
    const managers = await getAllManagers();
    const managerDetails = [];
    
    let totalDirectReports = 0;
    let iseCount = 0, iseDirectReports = 0;
    let islCount = 0, islDirectReports = 0;
    let isfSupervisorCount = 0, isfSupervisorDirectReports = 0;
    
    // Count managers and their direct reports
    for (const manager of managers) {
      const directReports = await getDirectReports(manager.uid, manager.directReportIds);
      const drCount = directReports.length;
      
      totalDirectReports += drCount;
      
      if (manager.role === 'ISE') {
        iseCount++;
        iseDirectReports += drCount;
      } else if (manager.role === 'ISL') {
        islCount++;
        islDirectReports += drCount;
      } else if (manager.role === 'ISF Supervisor') {
        isfSupervisorCount++;
        isfSupervisorDirectReports += drCount;
      }
      
      managerDetails.push({
        name: manager.displayName,
        layer: manager.role,
        directReports: drCount
      });
    }
    
    console.log('📊 Manager breakdown:', {
      iseCount, iseDirectReports,
      islCount, islDirectReports, 
      isfSupervisorCount, isfSupervisorDirectReports,
      totalManagers: managers.length,
      totalDirectReports
    });
    
    // Calculate 1x1 assessment counts (Months 1 & 2)
    const assessments1x1PerMonth = totalDirectReports;
    const assessments1x1Total = assessments1x1PerMonth * 2;
    
    // Calculate 360 assessment counts (Month 3) - FROM ACTUAL PARTICIPANTS
    // Get all unique people who would participate in 360 assessments
    const uniqueParticipants = new Set();
    
    // Add all managers (they assess themselves + others)
    for (const manager of managers) {
      uniqueParticipants.add(manager.uid);
    }
    
    // Add all direct reports (they assess themselves + their managers)
    for (const manager of managers) {
      const directReports = await getDirectReports(manager.uid, manager.directReportIds);
      for (const report of directReports) {
        uniqueParticipants.add(report.uid);
      }
    }
    
    const selfAssessments360 = uniqueParticipants.size;
    
    // Bidirectional assessments: Manager ↔ Direct Report (2 per pair)
    const managerDRPairs360 = totalDirectReports * 2;
    
    // Peer-to-peer: ISL managers assess each other (n × (n-1))
    const p2pAssessments360 = islCount * (islCount - 1);
    
    const total360Assessments = selfAssessments360 + managerDRPairs360 + p2pAssessments360;
    
    // Calculate MSH³ published expected counts
    const msh1x1Expected = 48; // 24 per month × 2 months
    const msh360Expected = 34; // 24 MR-DR pairs + 10 P2P pairs
    const mshTotalExpected = msh1x1Expected + msh360Expected; // 82 per cycle
    
    // Grand total per 3-month cycle
    const grandTotalPerCycle = assessments1x1Total + total360Assessments;
    
    const counts = {
      // Manager breakdown
      totalManagers: managers.length,
      totalDirectReports,
      iseCount,
      iseDirectReports,
      islCount,
      islDirectReports,
      isfSupervisorCount,
      isfSupervisorDirectReports,
      
      // 1x1 assessments (Months 1 & 2)
      assessments1x1PerMonth,
      assessments1x1Total,
      
      // 360 assessments (Month 3)
      selfAssessments360,
      managerDRPairs360,
      p2pAssessments360,
      total360Assessments,
      
      // MSH³ expected counts
      msh1x1Expected,
      msh360Expected,
      mshTotalExpected,
      
      // Grand total
      grandTotalPerCycle,
      
      // Detailed manager list
      managers: managerDetails
    };
    
    console.log('✅ Assessment count preview calculated:', counts);
    
    return {
      success: true,
      counts
    };
    
  } catch (error) {
    console.error('❌ Error calculating assessment preview:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔍 DATABASE VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get validation statistics comparing actual database counts with expected counts
 * Queries all cycles and their associated assessments to verify Ringleader accuracy
 */
export const getCycleValidationStats = async () => {
  try {
    console.log('🔍 Getting cycle validation stats...');
    
    const cyclesRef = collection(db, 'assessmentCycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    
    console.log(`Found ${cyclesSnapshot.size} cycles in database`);

    const cycles = [];
    let totalAssessments = 0;
    let assessments1x1 = 0;
    let assessments360 = 0;
    let totalMshPublished = 0;
    
    // Status counts
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      calibrated: 0
    };

    // Process each cycle and count its assessments + MSH scores
    for (const cycleDoc of cyclesSnapshot.docs) {
      const cycleData = cycleDoc.data();
      
      // Count assessments
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('cycleId', '==', cycleData.cycleId)
      );
      
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessmentCount = assessmentsSnapshot.size;
      
      // Count by status
      assessmentsSnapshot.forEach(assessmentDoc => {
        const status = assessmentDoc.data().status || 'pending';
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        }
      });
      
      // Count MSH published for this cycle
      const mshPublishedCount = await getMshPublishedCount(cycleData.cycleId);
      
      console.log(`Cycle ${cycleData.cycleId}: ${assessmentCount} assessments, ${mshPublishedCount} MSH published`);
      
      totalAssessments += assessmentCount;
      totalMshPublished += mshPublishedCount;

      if (cycleData.cycleType === '1x1') {
        assessments1x1 += assessmentCount;
      } else if (cycleData.cycleType === '360') {
        assessments360 += assessmentCount;
      }

      cycles.push({
        cycleId: cycleData.cycleId,
        monthName: cycleData.monthName,
        year: cycleData.year,
        month: cycleData.month,
        cycleType: cycleData.cycleType,
        cycleNumber: cycleData.cycleNumber,
        assessmentCount,
        mshPublishedCount
      });
    }

    // Sort cycles chronologically (oldest first)
    cycles.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Determine if all cycles are valid
    const allCyclesValid = cycles.every(cycle => {
      const assessmentMatch = cycle.cycleType === '1x1' 
        ? cycle.assessmentCount === 24 
        : cycle.assessmentCount === 93;
      
      const mshMatch = cycle.cycleType === '1x1'
        ? cycle.mshPublishedCount === 24
        : cycle.mshPublishedCount === 34;
      
      return assessmentMatch && mshMatch;
    });

    console.log('✅ Validation stats calculated successfully');

    return {
      success: true,
      stats: {
        totalCycles: cycles.length,
        totalAssessments,
        assessments1x1,
        assessments360,
        totalMshPublished,
        statusCounts,
        cycles,
        allCyclesValid
      }
    };

  } catch (error) {
    console.error('❌ Error getting cycle validation stats:', error);
    return {
      success: false,
      error: error.message,
      stats: {
        totalCycles: 0,
        totalAssessments: 0,
        assessments1x1: 0,
        assessments360: 0,
        totalMshPublished: 0,
        statusCounts: {
          pending: 0,
          in_progress: 0,
          completed: 0,
          calibrated: 0
        },
        cycles: [],
        allCyclesValid: false
      }
    };
  }
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
  if (startMonth >= 10 && startMonth <= 12) return 1;
  if (startMonth >= 1 && startMonth <= 3) return 2;
  if (startMonth >= 4 && startMonth <= 6) return 3;
  if (startMonth >= 7 && startMonth <= 9) return 4;
  return 1;
}

/**
 * Get last day of month
 */
function getLastDayOfMonth(month, year) {
  return new Date(year, month, 0).getDate();
}