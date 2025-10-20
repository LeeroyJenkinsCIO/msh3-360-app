// 📁 SAVE TO: src/utils/CreateAssessmentCycles.js
// 🎪 THE RINGLEADER - FIXED 360 PAIR LINKING
// Complete Assessment Cycle Orchestration System with Proper 360 Pair Connections

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
  limit,
  arrayUnion
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN RINGLEADER FUNCTION
// ═══════════════════════════════════════════════════════════════

export const createNextCycle = async (startYear = null, startMonth = null) => {
  console.log('🎪 Ringleader starting with FIXED 360 pair linking...');
  
  try {
    const lastCycle = await getLastCycle();
    
    let cycleStartYear, cycleStartMonth;
    
    if (!lastCycle) {
      if (!startYear || !startMonth) {
        throw new Error('First cycle requires startYear and startMonth parameters');
      }
      cycleStartYear = startYear;
      cycleStartMonth = startMonth;
      console.log(`🎬 First cycle! Starting at ${cycleStartMonth}/${cycleStartYear}`);
    } else {
      const nextMonth = lastCycle.month + 1;
      cycleStartMonth = nextMonth > 12 ? 1 : nextMonth;
      cycleStartYear = nextMonth > 12 ? lastCycle.year + 1 : lastCycle.year;
      console.log(`🎬 Continuing from last cycle. Next: ${cycleStartMonth}/${cycleStartYear}`);
    }
    
    const hasDuplicates = await checkForDuplicateCycles(cycleStartYear, cycleStartMonth);
    if (hasDuplicates) {
      throw new Error(`Cycle already exists for ${cycleStartMonth}/${cycleStartYear}`);
    }
    
    const cycleIds = await createCycleDocuments(cycleStartYear, cycleStartMonth);
    console.log('✅ Created cycle documents:', cycleIds);
    
    const managers = await getAllManagers();
    console.log(`✅ Found ${managers.length} managers`);
    
    const assessmentSummary = await createAssessmentsForCycle(
      cycleIds,
      managers,
      cycleStartYear,
      cycleStartMonth
    );
    
    const cycleNumber = getCycleNumber(cycleStartMonth);
    
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
    
    console.log('🎊 Ringleader complete with FIXED 360 pair linking!', summary);
    return summary;
    
  } catch (error) {
    console.error('❌ Ringleader failed:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// 📅 CYCLE CREATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const createCycleDocuments = async (startYear, startMonth) => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const createdCycles = [];
  
  for (let i = 0; i < 3; i++) {
    let monthNum = startMonth + i;
    let yearNum = startYear;
    
    if (monthNum > 12) {
      monthNum = monthNum - 12;
      yearNum = yearNum + 1;
    }
    
    const paddedMonth = String(monthNum).padStart(2, '0');
    const cycleId = `cycle-${yearNum}-${paddedMonth}`;
    
    const is360Month = [3, 6, 9, 12].includes(monthNum);
    const cycleType = is360Month ? '360' : '1x1';
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
        monthInCycle: i + 1,
        is360: is360Month
      }
    };
    
    await setDoc(doc(cyclesRef, cycleId), cycleDoc);
    createdCycles.push(cycleId);
    
    console.log(`✅ Created: ${cycleId} (${cycleType}) - Cycle ${cycleNumber}/4, Month ${i+1}/3`);
  }
  
  return createdCycles;
};

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

const getAllManagers = async () => {
  const usersRef = collection(db, 'users');
  
  const managersQuery = query(usersRef, where('layer', 'in', ['ISE', 'ISL']));
  const managersSnapshot = await getDocs(managersQuery);
  
  const supervisorsQuery = query(usersRef, where('flags.isSupervisor', '==', true));
  const supervisorsSnapshot = await getDocs(supervisorsQuery);
  
  const managers = [];
  
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
      const userData = userDoc.data();
      reports.push({
        uid: userDoc.id,
        userId: userId,
        displayName: userData.displayName || userData.name || 'Unknown',
        layer: userData.layer || 'ISF'
      });
    }
  }
  
  return reports;
};

// ═══════════════════════════════════════════════════════════════
// 📝 ASSESSMENT CREATION WITH FIXED 360 PAIR LINKING
// ═══════════════════════════════════════════════════════════════

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
    
    console.log(`📝 Creating assessments with FIXED 360 linking for ${getMonthName(monthNum)} ${yearNum} (${cycleType})...`);
    
    let batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 450;
    
    if (is360Month) {
      // ═══════════════════════════════════════════════════════════
      // 360 MONTH: Self + Bidirectional + P2P WITH FIXED PAIR LINKING
      // ═══════════════════════════════════════════════════════════
      
      // 🗂️ Track self-assessment IDs for linking
      const selfAssessmentMap = new Map();
      
      // STEP 1: Self-assessments for managers
      for (const manager of managers) {
        const selfAssessmentId = `${manager.userId}-self-${cycleId}`;
        selfAssessmentMap.set(manager.userId, selfAssessmentId);
        
        const selfAssessmentRef = doc(db, 'assessments', selfAssessmentId);
        
        batch.set(selfAssessmentRef, {
          cycleId,
          cycleName: `${getMonthName(monthNum)} ${yearNum}`,
          cycleMonth: monthNum,
          cycleYear: yearNum,
          cycleType: '360',
          assessmentType: 'self',
          
          giver: {
            uid: manager.uid,
            userId: manager.userId,
            displayName: manager.displayName,
            role: 'assessor',
            layer: manager.role,
            viewTab: 'give'
          },
          
          receiver: {
            uid: manager.uid,
            userId: manager.userId,
            displayName: manager.displayName,
            role: 'subject',
            layer: manager.role,
            viewTab: 'receive'
          },
          
          impact: {
            affectsMSH: manager.uid,
            mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
            mshId: null,
            weight: 1.0,
            isSelfAssessment: true
          },
          
          // ✨ 360 PAIR LINKING - will be populated after other assessments created
          '360Pairs': [],
          
          assessorId: manager.uid,
          assessorName: manager.displayName,
          subjectId: manager.uid,
          subjectName: manager.displayName,
          
          status: 'pending',
          composite: null,
          scores: {},
          notes: {},
          
          createdAt: serverTimestamp(),
          dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
        });
        
        batchCount++;
        totalCount++;
        
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      // STEP 2: Self-assessments for direct reports
      for (const manager of managers) {
        const directReports = await getDirectReports(manager.uid, manager.directReportIds);
        
        for (const report of directReports) {
          if (selfAssessmentMap.has(report.userId)) continue; // Skip duplicates
          
          const selfAssessmentId = `${report.userId}-self-${cycleId}`;
          selfAssessmentMap.set(report.userId, selfAssessmentId);
          
          const selfAssessmentRef = doc(db, 'assessments', selfAssessmentId);
          
          batch.set(selfAssessmentRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'self',
            
            giver: {
              uid: report.uid,
              userId: report.userId,
              displayName: report.displayName,
              role: 'assessor',
              layer: report.layer,
              viewTab: 'give'
            },
            
            receiver: {
              uid: report.uid,
              userId: report.userId,
              displayName: report.displayName,
              role: 'subject',
              layer: report.layer,
              viewTab: 'receive'
            },
            
            impact: {
              affectsMSH: report.uid,
              mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
              mshId: null,
              weight: 1.0,
              isSelfAssessment: true
            },
            
            '360Pairs': [],
            
            assessorId: report.uid,
            assessorName: report.displayName,
            subjectId: report.uid,
            subjectName: report.displayName,
            
            status: 'pending',
            composite: null,
            scores: {},
            notes: {},
            
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      // Commit self-assessments
      if (batchCount > 0) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
      
      // STEP 3: Bidirectional manager ↔ direct report WITH CONSISTENT PAIR IDs
      for (const manager of managers) {
        const directReports = await getDirectReports(manager.uid, manager.directReportIds);
        
        for (const report of directReports) {
          // ✨ CONSISTENT PAIR ID - sorted to ensure same ID regardless of direction
          const [userA, userB] = [manager.userId, report.userId].sort();
          const pairId = `360-pair-${cycleId}-${userA}-${userB}`;
          
          // ═══════════════════════════════════════════════════════════
          // Manager → DR Assessment (about DR)
          // ═══════════════════════════════════════════════════════════
          
          const downwardId = `${manager.userId}-assesses-${report.userId}-${cycleId}`;
          const downwardRef = doc(db, 'assessments', downwardId);
          
          batch.set(downwardRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'manager-down',
            
            // ✨ FIXED PAIR LINKING
            pairId: pairId,
            pairRole: 'other',
            pairSubject: report.userId,
            linkedSelfAssessmentId: selfAssessmentMap.get(report.userId),
            
            giver: {
              uid: manager.uid,
              userId: manager.userId,
              displayName: manager.displayName,
              role: 'assessor',
              layer: manager.role,
              viewTab: 'give'
            },
            
            receiver: {
              uid: report.uid,
              userId: report.userId,
              displayName: report.displayName,
              role: 'subject',
              layer: report.layer,
              viewTab: 'receive'
            },
            
            impact: {
              affectsMSH: report.uid,
              mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
              mshId: null,
              weight: 1.0,
              isSelfAssessment: false
            },
            
            assessorId: manager.uid,
            assessorName: manager.displayName,
            subjectId: report.uid,
            subjectName: report.displayName,
            
            status: 'pending',
            composite: null,
            scores: {},
            notes: {},
            
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          // ═══════════════════════════════════════════════════════════
          // DR → Manager Assessment (about Manager)
          // ═══════════════════════════════════════════════════════════
          
          const upwardId = `${report.userId}-assesses-${manager.userId}-${cycleId}`;
          const upwardRef = doc(db, 'assessments', upwardId);
          
          batch.set(upwardRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'manager-up',
            
            // ✨ SAME PAIR ID - this is the key!
            pairId: pairId,
            pairRole: 'other',
            pairSubject: manager.userId,
            linkedSelfAssessmentId: selfAssessmentMap.get(manager.userId),
            
            giver: {
              uid: report.uid,
              userId: report.userId,
              displayName: report.displayName,
              role: 'assessor',
              layer: report.layer,
              viewTab: 'give'
            },
            
            receiver: {
              uid: manager.uid,
              userId: manager.userId,
              displayName: manager.displayName,
              role: 'subject',
              layer: manager.role,
              viewTab: 'receive'
            },
            
            impact: {
              affectsMSH: manager.uid,
              mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
              mshId: null,
              weight: 1.0,
              isSelfAssessment: false
            },
            
            assessorId: report.uid,
            assessorName: report.displayName,
            subjectId: manager.uid,
            subjectName: manager.displayName,
            
            status: 'pending',
            composite: null,
            scores: {},
            notes: {},
            
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          // ✨ Link BOTH self-assessments to this pair
          const drSelfRef = doc(db, 'assessments', selfAssessmentMap.get(report.userId));
          const managerSelfRef = doc(db, 'assessments', selfAssessmentMap.get(manager.userId));
          
          batch.update(drSelfRef, {
            '360Pairs': arrayUnion(pairId)
          });
          
          batch.update(managerSelfRef, {
            '360Pairs': arrayUnion(pairId)
          });
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      // STEP 4: Peer-to-peer (ISL only) WITH CONSISTENT PAIR IDs
      const islManagers = managers.filter(m => m.role === 'ISL');
      
      for (const islAssessor of islManagers) {
        for (const islSubject of islManagers) {
          if (islAssessor.uid === islSubject.uid) continue;
          
          // ✨ CONSISTENT P2P PAIR ID - sorted users
          const [userA, userB] = [islAssessor.userId, islSubject.userId].sort();
          const pairId = `360-pair-p2p-${cycleId}-${userA}-${userB}`;
          
          const p2pId = `${islAssessor.userId}-p2p-${islSubject.userId}-${cycleId}`;
          const p2pRef = doc(db, 'assessments', p2pId);
          
          batch.set(p2pRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'peer',
            
            // ✨ FIXED PAIR LINKING
            pairId: pairId,
            pairRole: 'other',
            pairSubject: islSubject.userId,
            linkedSelfAssessmentId: selfAssessmentMap.get(islSubject.userId),
            
            giver: {
              uid: islAssessor.uid,
              userId: islAssessor.userId,
              displayName: islAssessor.displayName,
              role: 'assessor',
              layer: 'ISL',
              viewTab: 'give'
            },
            
            receiver: {
              uid: islSubject.uid,
              userId: islSubject.userId,
              displayName: islSubject.displayName,
              role: 'subject',
              layer: 'ISL',
              viewTab: 'receive'
            },
            
            impact: {
              affectsMSH: islSubject.uid,
              mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
              mshId: null,
              weight: 1.0,
              isSelfAssessment: false
            },
            
            assessorId: islAssessor.uid,
            assessorName: islAssessor.displayName,
            subjectId: islSubject.uid,
            subjectName: islSubject.displayName,
            
            status: 'pending',
            composite: null,
            scores: {},
            notes: {},
            
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          // ✨ Link subject's self to this P2P pair
          const subjectSelfRef = doc(db, 'assessments', selfAssessmentMap.get(islSubject.userId));
          batch.update(subjectSelfRef, {
            '360Pairs': arrayUnion(pairId)
          });
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Created ${totalCount} assessments with FIXED 360 pair linking`);
      
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
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '1x1',
            assessmentType: 'one-on-one',
            
            giver: {
              uid: manager.uid,
              userId: manager.userId,
              displayName: manager.displayName,
              role: 'assessor',
              layer: manager.role,
              viewTab: 'give'
            },
            
            receiver: {
              uid: report.uid,
              userId: report.userId,
              displayName: report.displayName,
              role: 'subject',
              layer: report.layer,
              viewTab: 'receive'
            },
            
            impact: {
              affectsMSH: report.uid,
              mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
              mshId: null,
              weight: 1.0,
              isSelfAssessment: false
            },
            
            assessorId: manager.uid,
            assessorName: manager.displayName,
            subjectId: report.uid,
            subjectName: report.displayName,
            
            status: 'pending',
            composite: null,
            scores: {},
            notes: {},
            
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
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

export const getLastCycle = async () => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const q = query(cyclesRef, orderBy('year', 'desc'), orderBy('month', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};

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

export const getCycleById = async (cycleId) => {
  const cycleDoc = await getDoc(doc(db, 'assessmentCycles', cycleId));
  if (cycleDoc.exists()) {
    return { id: cycleDoc.id, ...cycleDoc.data() };
  }
  return null;
};

export const cyclesExistForYear = async (year) => {
  const cyclesRef = collection(db, 'assessmentCycles');
  const q = query(cyclesRef, where('year', '==', year), limit(1));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

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

export const getTotalMshPublished = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'mshScores'));
    return snapshot.size;
  } catch (error) {
    console.error('Error getting total MSH count:', error);
    return 0;
  }
};

export const getAssessmentCountPreview = async () => {
  try {
    console.log('📊 Calculating assessment count preview...');
    const managers = await getAllManagers();
    const managerDetails = [];
    
    let totalDirectReports = 0;
    let iseCount = 0, iseDirectReports = 0;
    let islCount = 0, islDirectReports = 0;
    let isfSupervisorCount = 0, isfSupervisorDirectReports = 0;
    
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
    
    const assessments1x1PerMonth = totalDirectReports;
    const assessments1x1Total = assessments1x1PerMonth * 2;
    
    const uniqueParticipants = new Set();
    for (const manager of managers) {
      uniqueParticipants.add(manager.uid);
    }
    for (const manager of managers) {
      const directReports = await getDirectReports(manager.uid, manager.directReportIds);
      for (const report of directReports) {
        uniqueParticipants.add(report.uid);
      }
    }
    
    const selfAssessments360 = uniqueParticipants.size;
    const managerDRPairs360 = totalDirectReports * 2;
    const p2pAssessments360 = islCount * (islCount - 1);
    const total360Assessments = selfAssessments360 + managerDRPairs360 + p2pAssessments360;
    
    const msh1x1Expected = 48;
    const msh360Expected = 34;
    const mshTotalExpected = msh1x1Expected + msh360Expected;
    const grandTotalPerCycle = assessments1x1Total + total360Assessments;
    
    const counts = {
      totalManagers: managers.length,
      totalDirectReports,
      iseCount, iseDirectReports,
      islCount, islDirectReports,
      isfSupervisorCount, isfSupervisorDirectReports,
      assessments1x1PerMonth,
      assessments1x1Total,
      selfAssessments360,
      managerDRPairs360,
      p2pAssessments360,
      total360Assessments,
      msh1x1Expected,
      msh360Expected,
      mshTotalExpected,
      grandTotalPerCycle,
      managers: managerDetails
    };
    
    console.log('✅ Assessment count preview calculated:', counts);
    return { success: true, counts };
    
  } catch (error) {
    console.error('❌ Error calculating assessment preview:', error);
    return { success: false, error: error.message };
  }
};

export const getCycleValidationStats = async () => {
  try {
    console.log('🔍 Getting cycle validation stats...');
    const cyclesRef = collection(db, 'assessmentCycles');
    const cyclesSnapshot = await getDocs(cyclesRef);
    
    const cycles = [];
    let totalAssessments = 0;
    let assessments1x1 = 0;
    let assessments360 = 0;
    let totalMshPublished = 0;
    
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      calibrated: 0
    };

    for (const cycleDoc of cyclesSnapshot.docs) {
      const cycleData = cycleDoc.data();
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('cycleId', '==', cycleData.cycleId)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessmentCount = assessmentsSnapshot.size;
      
      assessmentsSnapshot.forEach(assessmentDoc => {
        const status = assessmentDoc.data().status || 'pending';
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        }
      });
      
      const mshPublishedCount = await getMshPublishedCount(cycleData.cycleId);
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

    cycles.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const allCyclesValid = cycles.every(cycle => {
      const assessmentMatch = cycle.cycleType === '1x1' 
        ? cycle.assessmentCount === 24 
        : cycle.assessmentCount === 93;
      const mshMatch = cycle.cycleType === '1x1'
        ? cycle.mshPublishedCount === 24
        : cycle.mshPublishedCount === 34;
      return assessmentMatch && mshMatch;
    });

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
        statusCounts: { pending: 0, in_progress: 0, completed: 0, calibrated: 0 },
        cycles: [],
        allCyclesValid: false
      }
    };
  }
};

export const closeCycle = async (cycleId) => {
  const cycleRef = doc(db, 'assessmentCycles', cycleId);
  await updateDoc(cycleRef, {
    status: 'closed',
    closedAt: serverTimestamp()
  });
  console.log(`✅ Cycle ${cycleId} closed`);
};

export const deleteCycle = async (cycleId) => {
  await deleteDoc(doc(db, 'assessmentCycles', cycleId));
  console.log(`✅ Cycle ${cycleId} deleted`);
};

// ═══════════════════════════════════════════════════════════════
// 🧮 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}

function getCycleNumber(startMonth) {
  if (startMonth >= 10 && startMonth <= 12) return 1;
  if (startMonth >= 1 && startMonth <= 3) return 2;
  if (startMonth >= 4 && startMonth <= 6) return 3;
  if (startMonth >= 7 && startMonth <= 9) return 4;
  return 1;
}

function getLastDayOfMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

// ═══════════════════════════════════════════════════════════════
// 🔧 ADMIN HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const getLastestCycle = async () => {
  return await getLastCycle();
};

export const getActiveCycle2 = async () => {
  return await getActiveCycle();
};

export const createNextCycleFunction = async (startYear = null, startMonth = null) => {
  return await createNextCycle(startYear, startMonth);
};

export const Card = null;
export const Badge = null;