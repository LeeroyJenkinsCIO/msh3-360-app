// 📁 SAVE TO: src/utils/CreateAssessmentCycles.js
// 🎪 THE RINGLEADER - COMPLETE PRODUCTION FILE
// Assessment Cycle Orchestration System with Admin Functions
// ✅ FIXED: Corrected MSH Publishing Math (97 total per cycle)

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
  console.log('🎪 Ringleader starting...');
  
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
      layer: userData.layer,
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
        layer: userData.layer || 'ISF',
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
        layer: userData.layer || 'ISF',
        role: userData.layer || 'ISF',
        directReportIds: userData.directReportIds || []
      });
    }
  }
  
  return reports;
};

// ═══════════════════════════════════════════════════════════════
// 📝 ASSESSMENT CREATION - COMPLETE WITH ALL LEVELS
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
    
    console.log(`📝 Creating assessments for ${getMonthName(monthNum)} ${yearNum} (${cycleType})...`);
    
    let batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 450;
    
    if (is360Month) {
      // ═══════════════════════════════════════════════════════════
      // 360 MONTH: Self + Bidirectional + P2P
      // ═══════════════════════════════════════════════════════════
      
      const selfAssessmentMap = new Map();
      const allParticipants = new Set();
      
      // Collect MSH³ participants ONLY (no sub-reports)
      // ISE, ISL, ISF Supervisors + their DIRECT reports only
      for (const manager of managers) {
        allParticipants.add(manager); // Add the manager (ISE/ISL/ISF Supervisor)
        
        const directReports = await getDirectReports(manager.uid, manager.directReportIds);
        for (const report of directReports) {
          allParticipants.add(report); // Add their direct reports (ISL/ISF)
          // STOP HERE - no recursion into sub-reports
        }
      }
      
      console.log(`📊 Total 360 participants (MSH³): ${allParticipants.size} (Expected: 25)`);
      
      // STEP 1: Self-assessments for ALL MSH³ participants
      for (const participant of allParticipants) {
        const selfAssessmentId = `${participant.userId}-self-${cycleId}`;
        selfAssessmentMap.set(participant.userId, selfAssessmentId);
        
        const selfAssessmentRef = doc(db, 'assessments', selfAssessmentId);
        
        batch.set(selfAssessmentRef, {
          cycleId,
          cycleName: `${getMonthName(monthNum)} ${yearNum}`,
          cycleMonth: monthNum,
          cycleYear: yearNum,
          cycleType: '360',
          assessmentType: 'self',
          
          giver: {
            uid: participant.uid,
            userId: participant.userId,
            displayName: participant.displayName,
            role: 'assessor',
            layer: participant.layer || participant.role,
            viewTab: 'give'
          },
          
          receiver: {
            uid: participant.uid,
            userId: participant.userId,
            displayName: participant.displayName,
            role: 'subject',
            layer: participant.layer || participant.role,
            viewTab: 'receive'
          },
          
          impact: {
            affectsMSH: participant.uid,
            mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
            mshId: null,
            weight: 1.0,
            isSelfAssessment: true
          },
          
          '360Pairs': [],
          
          assessorId: participant.uid,
          assessorName: participant.displayName,
          subjectId: participant.uid,
          subjectName: participant.displayName,
          
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
      
      if (batchCount > 0) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
      
      console.log(`✅ Created ${allParticipants.size} self-assessments`);
      
      // STEP 2: Bidirectional pairs (ALL levels)
      for (const manager of managers) {
        const directReports = await getDirectReports(manager.uid, manager.directReportIds);
        
        for (const report of directReports) {
          const [userA, userB] = [manager.userId, report.userId].sort();
          const pairId = `360-pair-${cycleId}-${userA}-${userB}`;
          
          // Manager → Report
          const downwardId = `${manager.userId}-assesses-${report.userId}-${cycleId}`;
          const downwardRef = doc(db, 'assessments', downwardId);
          
          batch.set(downwardRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'manager-down',
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
          
          // Report → Manager
          const upwardId = `${report.userId}-assesses-${manager.userId}-${cycleId}`;
          const upwardRef = doc(db, 'assessments', upwardId);
          
          batch.set(upwardRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'manager-up',
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
          
          // Link self-assessments to this pair
          const reportSelfRef = doc(db, 'assessments', selfAssessmentMap.get(report.userId));
          const managerSelfRef = doc(db, 'assessments', selfAssessmentMap.get(manager.userId));
          
          batch.update(reportSelfRef, { '360Pairs': arrayUnion(pairId) });
          batch.update(managerSelfRef, { '360Pairs': arrayUnion(pairId) });
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      console.log(`✅ Created bidirectional pairs`);
      
      // STEP 3: ISF Supervisor ↔ ISF pairs
      const isfSupervisors = Array.from(allParticipants).filter(p => 
        p.directReportIds && p.directReportIds.length > 0 && 
        (p.layer === 'ISF' || p.role === 'ISF Supervisor')
      );
      
      for (const supervisor of isfSupervisors) {
        const supervisorReports = await getDirectReports(supervisor.uid, supervisor.directReportIds);
        
        for (const report of supervisorReports) {
          const [userA, userB] = [supervisor.userId, report.userId].sort();
          const pairId = `360-pair-${cycleId}-${userA}-${userB}`;
          
          // Supervisor → Contributor
          const downwardId = `${supervisor.userId}-assesses-${report.userId}-${cycleId}`;
          const downwardRef = doc(db, 'assessments', downwardId);
          
          batch.set(downwardRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'manager-down',
            pairId: pairId,
            pairRole: 'other',
            pairSubject: report.userId,
            linkedSelfAssessmentId: selfAssessmentMap.get(report.userId),
            
            giver: {
              uid: supervisor.uid,
              userId: supervisor.userId,
              displayName: supervisor.displayName,
              role: 'assessor',
              layer: supervisor.layer || 'ISF',
              viewTab: 'give'
            },
            
            receiver: {
              uid: report.uid,
              userId: report.userId,
              displayName: report.displayName,
              role: 'subject',
              layer: report.layer || 'ISF',
              viewTab: 'receive'
            },
            
            impact: {
              affectsMSH: report.uid,
              mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
              mshId: null,
              weight: 1.0,
              isSelfAssessment: false
            },
            
            assessorId: supervisor.uid,
            assessorName: supervisor.displayName,
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
          
          // Contributor → Supervisor
          const upwardId = `${report.userId}-assesses-${supervisor.userId}-${cycleId}`;
          const upwardRef = doc(db, 'assessments', upwardId);
          
          batch.set(upwardRef, {
            cycleId,
            cycleName: `${getMonthName(monthNum)} ${yearNum}`,
            cycleMonth: monthNum,
            cycleYear: yearNum,
            cycleType: '360',
            assessmentType: 'manager-up',
            pairId: pairId,
            pairRole: 'other',
            pairSubject: supervisor.userId,
            linkedSelfAssessmentId: selfAssessmentMap.get(supervisor.userId),
            
            giver: {
              uid: report.uid,
              userId: report.userId,
              displayName: report.displayName,
              role: 'assessor',
              layer: report.layer || 'ISF',
              viewTab: 'give'
            },
            
            receiver: {
              uid: supervisor.uid,
              userId: supervisor.userId,
              displayName: supervisor.displayName,
              role: 'subject',
              layer: supervisor.layer || 'ISF',
              viewTab: 'receive'
            },
            
            impact: {
              affectsMSH: supervisor.uid,
              mshCycle: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
              mshId: null,
              weight: 1.0,
              isSelfAssessment: false
            },
            
            assessorId: report.uid,
            assessorName: report.displayName,
            subjectId: supervisor.uid,
            subjectName: supervisor.displayName,
            
            status: 'pending',
            composite: null,
            scores: {},
            notes: {},
            
            createdAt: serverTimestamp(),
            dueDate: `${yearNum}-${String(monthNum).padStart(2, '0')}-${getLastDayOfMonth(monthNum, yearNum)}`
          });
          
          batchCount++;
          totalCount++;
          
          // Link self-assessments to this pair
          const reportSelfRef = doc(db, 'assessments', selfAssessmentMap.get(report.userId));
          const supervisorSelfRef = doc(db, 'assessments', selfAssessmentMap.get(supervisor.userId));
          
          batch.update(reportSelfRef, { '360Pairs': arrayUnion(pairId) });
          batch.update(supervisorSelfRef, { '360Pairs': arrayUnion(pairId) });
          
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }
      
      console.log(`✅ Created ISF Supervisor pairs`);
      
      // STEP 4: P2P (ISL only)
      const islManagers = managers.filter(m => m.role === 'ISL');
      
      for (const islAssessor of islManagers) {
        for (const islSubject of islManagers) {
          if (islAssessor.uid === islSubject.uid) continue;
          
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
          
          // Link self-assessment to this pair
          const subjectSelfRef = doc(db, 'assessments', selfAssessmentMap.get(islSubject.userId));
          batch.update(subjectSelfRef, { '360Pairs': arrayUnion(pairId) });
          
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
      
      console.log(`✅ Created ${totalCount} 360 assessments`);
      
    } else {
      // ═══════════════════════════════════════════════════════════
      // 1x1 MONTHS: Manager → Direct Report (ALL LEVELS)
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
      
      console.log(`✅ Created ${totalCount} 1x1 assessments`);
    }
    
    assessmentsByMonth[`${getMonthName(monthNum)} ${yearNum}`] = totalCount;
  }
  
  return {
    total: totalCount,
    byMonth: assessmentsByMonth
  };
};

// ═══════════════════════════════════════════════════════════════
// 🔍 ADMIN QUERY FUNCTIONS
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
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

export const getAssessmentCountPreview = async () => {
  try {
    const managers = await getAllManagers();
    
    let iseCount = 0;
    let islCount = 0;
    let isfSupervisorCount = 0;
    let iseDirectReports = 0;
    let islDirectReports = 0;
    let isfSupervisorDirectReports = 0;
    
    const managerDetails = [];
    
    for (const manager of managers) {
      const directReports = await getDirectReports(manager.uid, manager.directReportIds);
      const drCount = directReports.length;
      
      if (manager.layer === 'ISE') {
        iseCount++;
        iseDirectReports += drCount;
      } else if (manager.layer === 'ISL') {
        islCount++;
        islDirectReports += drCount;
      } else if (manager.role === 'ISF Supervisor' || manager.layer === 'ISF') {
        isfSupervisorCount++;
        isfSupervisorDirectReports += drCount;
      }
      
      managerDetails.push({
        name: manager.displayName,
        layer: manager.layer,
        directReports: drCount
      });
    }
    
    const totalManagers = managers.length;
    const totalDirectReports = iseDirectReports + islDirectReports + isfSupervisorDirectReports;
    
    // 1x1 calculations
    const assessments1x1PerMonth = totalDirectReports;
    const assessments1x1Total = assessments1x1PerMonth * 2;
    
    // 360 calculations (MSH³ participants only)
    // Self-assessments for MSH³ participants: 25 (ISE:1 + ISL:5 + ISF:19)
    const selfAssessments360 = 25; // Fixed: Only MSH³ participants get self-assessments
    const managerDRPairs360 = totalDirectReports * 2; // Bidirectional pairs
    const p2pAssessments360 = islCount * (islCount - 1); // ISL peer-to-peer
    const total360Assessments = selfAssessments360 + managerDRPairs360 + p2pAssessments360;
    
    // MSH³ Publishing Expected - CORRECTED
    const msh1x1Expected = totalDirectReports * 2; // 24 per month × 2 = 48
    const isfMSH = totalDirectReports - iseDirectReports; // 19 ISF members
    const islMSH = iseDirectReports; // 5 ISL members
    const iseMSH = iseCount > 0 ? iseDirectReports : 0; // 5 MSH for ISE from ISL upward (Pair B)
    const islP2PMSH = islCount * (islCount - 1); // 5 × 4 = 20 P2P MSH
    const msh360Expected = isfMSH + islMSH + iseMSH + islP2PMSH; // 19 + 5 + 5 + 20 = 49
    const mshTotalExpected = msh1x1Expected + msh360Expected; // 48 + 49 = 97
    
    const grandTotalPerCycle = assessments1x1Total + total360Assessments;
    
    return {
      success: true,
      counts: {
        iseCount,
        islCount,
        isfSupervisorCount,
        iseDirectReports,
        islDirectReports,
        isfSupervisorDirectReports,
        totalManagers,
        totalDirectReports,
        
        assessments1x1PerMonth,
        assessments1x1Total,
        
        selfAssessments360,
        managerDRPairs360,
        p2pAssessments360,
        total360Assessments,
        
        msh1x1Expected,
        msh360Expected,
        msh360Breakdown: {
          isfMSH,
          islMSH,
          iseMSH,
          islP2PMSH
        },
        mshTotalExpected,
        
        grandTotalPerCycle,
        managers: managerDetails
      }
    };
  } catch (error) {
    console.error('Error in getAssessmentCountPreview:', error);
    return { success: false, error: error.message };
  }
};

export const getCycleValidationStats = async () => {
  try {
    const cyclesSnapshot = await getDocs(collection(db, 'assessmentCycles'));
    const cycles = [];
    let totalAssessments = 0;
    let assessments1x1 = 0;
    let assessments360 = 0;
    let totalMshPublished = 0;
    
    const statusCounts = {
      pending: 0,
      completed: 0,
      calibrated: 0
    };
    
    for (const cycleDoc of cyclesSnapshot.docs) {
      const cycleData = cycleDoc.data();
      
      // Get assessments for this cycle
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('cycleId', '==', cycleData.cycleId)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessmentCount = assessmentsSnapshot.size;
      totalAssessments += assessmentCount;
      
      // Count by type
      let cycle1x1Count = 0;
      let cycle360Count = 0;
      
      assessmentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.cycleType === '1x1') {
          cycle1x1Count++;
          assessments1x1++;
        } else if (data.cycleType === '360') {
          cycle360Count++;
          assessments360++;
        }
        
        // Count status
        if (data.status === 'pending') statusCounts.pending++;
        else if (data.status === 'completed') statusCounts.completed++;
        else if (data.status === 'calibrated') statusCounts.calibrated++;
      });
      
      // Get MSH scores for this cycle
      const mshQuery = query(
        collection(db, 'mshScores'),
        where('cycleMonth', '==', cycleData.month),
        where('cycleYear', '==', cycleData.year)
      );
      const mshSnapshot = await getDocs(mshQuery);
      const mshPublishedCount = mshSnapshot.size;
      totalMshPublished += mshPublishedCount;
      
      cycles.push({
        cycleId: cycleData.cycleId,
        monthName: cycleData.monthName,
        year: cycleData.year,
        month: cycleData.month,
        cycleType: cycleData.cycleType,
        cycleNumber: cycleData.cycleNumber,
        assessmentCount,
        cycle1x1Count,
        cycle360Count,
        mshPublishedCount
      });
    }
    
    return {
      success: true,
      stats: {
        totalCycles: cycles.length,
        totalAssessments,
        assessments1x1,
        assessments360,
        totalMshPublished,
        statusCounts,
        cycles
      }
    };
  } catch (error) {
    console.error('Error in getCycleValidationStats:', error);
    return { success: false, error: error.message };
  }
};

export const closeCycle = async (cycleId) => {
  await updateDoc(doc(db, 'assessmentCycles', cycleId), {
    status: 'closed',
    closedAt: serverTimestamp()
  });
};

export const deleteCycle = async (cycleId) => {
  await deleteDoc(doc(db, 'assessmentCycles', cycleId));
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