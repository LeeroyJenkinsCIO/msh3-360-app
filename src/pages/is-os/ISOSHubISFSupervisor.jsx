// 📁 SAVE TO: src/pages/is-os/ISOSHubISFSupervisor.jsx
// ISF Supervisor Hub - Leader in Training View
// ✅ STEP 1: Fixed ISGS Compass weighting (60% ISL + 40% Pillars)
// ✅ STEP 2: Fixed ISL Leadership to include ISE and show correct 360 totals (0/30)
// ✅ STEP 3: Fixed Metrics Bar to show correct MSH³ totals (0/49 for Dec, 0/97 for cycle)
// ✅ STEP 4: Fixed Org-Wide Completion to use MSH³ Publication Rate (not people coverage)
// ✅ STEP 5: Updated routing - 360 pair assessments now use dedicated 360PairAssessment component
// ✅ STEP 6: Fixed MSH query to get ALL scores from 'mshs' collection (not date-filtered)
// ✅ STEP 7: Added dual-key userMap mapping (Firebase UID + userId string)
// ✅ STEP 8: Fixed My Compass for 360 - shows published MSH count/DR count (e.g., 1/5)
// ✅ STEP 9: Fixed Assessment Progress count to include 'published' status (aligns with ISL hub)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Compass, Award, Building2, User, Calendar, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HubHeroBanner from '../../components/hubs/HubHeroBanner';
import KPIStatCard from '../../components/hubs/KPIStatCard';
import HubTabs from '../../components/hubs/HubTabs';
import HubMetricsBar from '../../components/hubs/HubMetricsBar';
import AssessmentOrchestrator from '../../components/hubs/AssessmentOrchestrator';
import PublishedMSHScoresGrid from '../../components/hubs/PublishedMSHScoresGrid';

function ISOSHubISFSupervisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const CYCLE_START_DATE = useMemo(() => new Date(2025, 9, 1), []);
  
  const [activeTab, setActiveTab] = useState('give');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [assessmentsIGive, setAssessmentsIGive] = useState([]);
  const [assessmentsIReceive, setAssessmentsIReceive] = useState([]);
  const [pairings360, setPairings360] = useState([]);
  const [mshScoresIReceive, setMSHScoresIReceive] = useState([]);
  const [myDirectReports, setMyDirectReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    cycleNumber: 1,
    cycleType: '1x1',
    currentMonth: 'OCTOBER 2025',
    isgsCompassScore: null,
    isgsCompassCompleted: 0,
    isgsCompassTotal: 24,
    isgsCompassCumulativeAvg: null,
    isgsCompassCumulativeCount: 0,
    isgsCompassTrend: null,
    islScore: null,
    islCompleted: 0,
    islTotal: 5,
    islCumulativeAvg: null,
    islCumulativeCount: 0,
    islTrend: null,
    allPillarsScore: null,
    allPillarsCompleted: 0,
    allPillarsTotal: 19,
    allPillarsCumulativeAvg: null,
    allPillarsCumulativeCount: 0,
    allPillarsTrend: null,
    myScore: null,
    myCompleted: 0,
    myTotal: 1,
    myCumulativeAvg: null,
    myCumulativeCount: 0,
    myTrend: null,
    pillarBreakdown: [],
    orgScore: null,
    orgCompleted: 0,
    orgTotal: 24,
    orgCumulativeAvg: null,
    orgCumulativeCount: 0,
    orgTrend: null,
    completedCount: 0,
    totalCount: 0,
    // ✅ STEP 3: New metrics for HubMetricsBar
    currentMonthMSH: 0,
    currentMonthMSHExpected: 24,
    cycleMSH: 0,
    cycleMSHExpected: 97
  });

  const calcAvg = useCallback((scores) => {
    if (!scores || scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return (sum / scores.length).toFixed(1);
  }, []);

  const getCycleInfo = useCallback((date = new Date()) => {
    const monthsSinceStart = (date.getFullYear() - CYCLE_START_DATE.getFullYear()) * 12 + 
                             (date.getMonth() - CYCLE_START_DATE.getMonth());
    
    const cycleNumber = Math.floor(monthsSinceStart / 3) + 1;
    const cycleMonth = (monthsSinceStart % 3) + 1;
    const cycleType = cycleMonth === 3 ? '360' : '1x1';
    
    const currentMonth = date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    }).toUpperCase();
    
    const cycleStartMonthOffset = Math.floor(monthsSinceStart / 3) * 3;
    const cycleStartDate = new Date(CYCLE_START_DATE);
    cycleStartDate.setMonth(CYCLE_START_DATE.getMonth() + cycleStartMonthOffset);
    
    const cycleMonths = [];
    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(cycleStartDate);
      monthDate.setMonth(cycleStartDate.getMonth() + i);
      cycleMonths.push({
        month: monthDate.getMonth() + 1,
        year: monthDate.getFullYear()
      });
    }
    
    return { 
      cycleNumber, 
      cycleMonth, 
      cycleType, 
      currentMonth,
      cycleMonths,
      cycleStartDate
    };
  }, [CYCLE_START_DATE]);

  useEffect(() => {
    if (user?.uid) {
      fetchData();
    }
  }, [user, location.key, selectedMonth]);

  const fetchData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      const now = new Date();
      const displayMonth = selectedMonth ? selectedMonth.month : now.getMonth() + 1;
      const displayYear = selectedMonth ? selectedMonth.year : now.getFullYear();
      
      const displayDate = new Date(displayYear, displayMonth - 1, 1);
      const cycleInfo = getCycleInfo(displayDate);
      
      const prevMonth = displayMonth === 1 ? 12 : displayMonth - 1;
      const prevYear = displayMonth === 1 ? displayYear - 1 : displayYear;
      
      // ✅ OPTIMIZATION: Parallel queries
      const [pillarsSnapshot, usersSnapshot, mshSnapshot, ...assessmentSnapshots] = await Promise.all([
        getDocs(collection(db, 'pillars')),
        getDocs(collection(db, 'users')),
        // ✅ FIXED: Get ALL MSH scores for History (not just current cycle)
        getDocs(collection(db, 'mshs')),
        ...cycleInfo.cycleMonths.map(cycleMonthInfo =>
          getDocs(query(
            collection(db, 'assessments'),
            where('cycleMonth', '==', cycleMonthInfo.month),
            where('cycleYear', '==', cycleMonthInfo.year)
          ))
        )
      ]);

      const allPillars = pillarsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(pillar => pillar && pillar.pillarName);

      // Build user map
      const userMap = {};
      const iseUsers = [];
      const islUsers = [];
      const isfUsers = [];
      const myDirectReportsList = [];
      
      usersSnapshot.docs.forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        // ✅ FIX: Dual-key mapping - MSH docs use userId strings like "robert_paddock"
        userMap[doc.id] = userData;  // Firebase UID
        if (userData.userId) {
          userMap[userData.userId] = userData;  // userId string
        }
        
        if (userData.layer === 'ISE') {
          iseUsers.push(userData);
        } else if (userData.layer === 'ISL') {
          islUsers.push(userData);
        } else if (
          userData.layer === 'ISF' || 
          userData.layer === 'ISF Supervisor' ||
          userData.flags?.isSupervisor === true
        ) {
          isfUsers.push(userData);
        }
        
        // Collect my direct reports
        if (userData.managerId === user.userId) {
          myDirectReportsList.push(userData);
        }
      });

      setMyDirectReports(myDirectReportsList);

      const allMSH = mshSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate()
      }));

      console.log('🔍 MSH Snapshot:', {
        totalDocs: mshSnapshot.docs.length,
        allMSHLength: allMSH.length,
        sampleMSH: allMSH[0]
      });

      // Cumulative MSH (cycle start → selected month)
      const cumulativeMSH = allMSH.filter(m => 
        (m.cycleYear < displayYear) || 
        (m.cycleYear === displayYear && m.cycleMonth <= displayMonth)
      );

      // ✅ STEP 2: ISL Leadership now includes BOTH ISE and ISL
      const islLayerMSH = allMSH.filter(m => 
        islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
        iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
      );
      const cumulativeISLLayer = cumulativeMSH.filter(m => 
        islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
        iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
      );

      // All ISF/ISF Supervisor MSH
      const allISFMSH = allMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId));
      const cumulativeAllISF = cumulativeMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId));

      // My MSH (received from ISL manager)
      const myMSH = allMSH.filter(m => m.subjectId === user.uid);
      const cumulativeMy = cumulativeMSH.filter(m => m.subjectId === user.uid);

      // Current month MSH
      const currentMonthMSH = allMSH.filter(m => 
        m.cycleMonth === displayMonth && m.cycleYear === displayYear
      );
      
      const currentMonthISLLayer = currentMonthMSH.filter(m => 
        islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
        iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
      );
      
      const currentMonthAllISF = currentMonthMSH.filter(m => 
        isfUsers.some(u => u.userId === m.subjectId)
      );
      
      const currentMonthMy = currentMonthMSH.filter(m => 
        m.subjectId === user.uid
      );

      // Previous month MSH
      const prevMonthMSH = allMSH.filter(m => 
        m.cycleMonth === prevMonth && m.cycleYear === prevYear
      );
      
      const prevMonthISLLayer = prevMonthMSH.filter(m => 
        islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
        iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
      );
      
      const prevMonthAllISF = prevMonthMSH.filter(m => 
        isfUsers.some(u => u.userId === m.subjectId)
      );
      
      const prevMonthMy = prevMonthMSH.filter(m => 
        m.subjectId === user.uid
      );

      // Calculate completion counts
      const uniqueISLLayerCompleted = new Set(currentMonthISLLayer.map(m => m.subjectId)).size;
      const uniqueAllISFCompleted = new Set(currentMonthAllISF.map(m => m.subjectId)).size;
      // ✅ STEP 8: My Compass for 360 - shows published MSH count/DR count
      const myCompleted = currentMonthMy.length;  // Count of published MSH scores
      const myTotal = cycleInfo.cycleType === '360' 
        ? myDirectReportsList.length  // In 360: expect 1 MSH from each DR
        : 1;  // In 1x1: expect 1 self-assessment

      // Calculate scores
      const islScore = calcAvg(currentMonthISLLayer.map(m => m.compositeScore));
      const allPillarsScore = calcAvg(currentMonthAllISF.map(m => m.compositeScore));
      const myScore = calcAvg(currentMonthMy.map(m => m.compositeScore));

      const prevIslScore = calcAvg(prevMonthISLLayer.map(m => m.compositeScore));
      const prevAllPillarsScore = calcAvg(prevMonthAllISF.map(m => m.compositeScore));
      const prevMyScore = calcAvg(prevMonthMy.map(m => m.compositeScore));

      // Calculate trends
      const islTrend = (islScore && prevIslScore)
        ? parseFloat((parseFloat(islScore) - parseFloat(prevIslScore)).toFixed(1))
        : "---";
      
      const allPillarsTrend = (allPillarsScore && prevAllPillarsScore)
        ? parseFloat((parseFloat(allPillarsScore) - parseFloat(prevAllPillarsScore)).toFixed(1))
        : "---";
      
      const myTrend = (myScore && prevMyScore)
        ? parseFloat((parseFloat(myScore) - parseFloat(prevMyScore)).toFixed(1))
        : "---";

      // Individual pillar breakdown
      const pillarHealthScores = allPillars.map(pillar => {
        const pillarISFUsers = isfUsers.filter(u => u.pillar === pillar.id);
        const pillarMSH = allMSH.filter(m => pillarISFUsers.some(u => u.userId === m.subjectId));
        const pillarCumulative = cumulativeMSH.filter(m => pillarISFUsers.some(u => u.userId === m.subjectId));
        
        const currentMonthPillarMSH = pillarMSH.filter(m => 
          m.cycleMonth === displayMonth && m.cycleYear === displayYear
        );
        
        const prevMonthPillarMSH = pillarMSH.filter(m => 
          m.cycleMonth === prevMonth && m.cycleYear === prevYear
        );
        
        const uniqueCompleted = new Set(currentMonthPillarMSH.map(m => m.subjectId)).size;
        const pillarCurrentScore = calcAvg(currentMonthPillarMSH.map(m => m.compositeScore));
        const pillarPrevScore = calcAvg(prevMonthPillarMSH.map(m => m.compositeScore));
        
        const pillarTrend = (pillarCurrentScore && pillarPrevScore)
          ? parseFloat((parseFloat(pillarCurrentScore) - parseFloat(pillarPrevScore)).toFixed(1))
          : "---";
        
        return {
          id: pillar.id,
          name: pillar.pillarName,
          score: pillarCurrentScore,
          completed: uniqueCompleted,
          total: pillarISFUsers.length,
          cumulativeAvg: calcAvg(pillarCumulative.map(m => m.compositeScore)),
          cumulativeCount: pillarCumulative.length,
          trend: pillarTrend
        };
      });

      // ✅ STEP 1: ISGS Compass = 60% ISL + 40% All Pillars
      let isgsCompassScore = null;
      let prevIsgsCompassScore = null;
      let isgsCompassTrend = "---";
      
      if (islScore !== null && allPillarsScore !== null) {
        isgsCompassScore = ((parseFloat(islScore) * 0.6) + (parseFloat(allPillarsScore) * 0.4)).toFixed(1);
      }
      
      if (prevIslScore !== null && prevAllPillarsScore !== null) {
        prevIsgsCompassScore = ((parseFloat(prevIslScore) * 0.6) + (parseFloat(prevAllPillarsScore) * 0.4)).toFixed(1);
      }
      
      if (isgsCompassScore && prevIsgsCompassScore) {
        isgsCompassTrend = parseFloat((parseFloat(isgsCompassScore) - parseFloat(prevIsgsCompassScore)).toFixed(1));
      }
      
      const isgsCompassCompleted = currentMonthISLLayer.length + currentMonthAllISF.length;
      const isgsCompassTotal = cycleInfo.cycleType === '360' 
        ? 49  // 30 (ISL Layer) + 19 (Pillars)
        : 24; // 5 (ISL Layer) + 19 (Pillars)
      const isgsCompassCumulativeScores = [...cumulativeISLLayer, ...cumulativeAllISF].map(m => m.compositeScore);

      // ✅ STEP 4: Org-Wide Completion = MSH³ Publication Rate
      const currentMonthMSHPublished = currentMonthMSH.length;
      const currentMonthMSHExpected = cycleInfo.cycleType === '360' ? 49 : 24;
      const orgCompletionPercent = currentMonthMSHExpected > 0 
        ? ((currentMonthMSHPublished / currentMonthMSHExpected) * 100).toFixed(0) 
        : 0;
      
      // Calculate completion rate for each month in the cycle
      const monthlyCompletionRates = cycleInfo.cycleMonths.map(m => {
        const monthMSH = allMSH.filter(msh => 
          msh.cycleMonth === m.month && msh.cycleYear === m.year
        );
        const is360 = [3, 6, 9, 12].includes(m.month);
        const expected = is360 ? 49 : 24;
        const rate = expected > 0 ? (monthMSH.length / expected) * 100 : 0;
        return rate;
      }).filter(rate => rate > 0); // Only include months with data
      
      const cumulativeCompletionPercent = monthlyCompletionRates.length > 0
        ? (monthlyCompletionRates.reduce((sum, rate) => sum + rate, 0) / monthlyCompletionRates.length).toFixed(0)
        : 0;
      
      const prevMonthMSHPublished = prevMonthMSH.length;
      const prevMonthMSHExpected = [3, 6, 9, 12].includes(prevMonth) ? 49 : 24;
      const prevOrgCompletionPercent = prevMonthMSHExpected > 0
        ? ((prevMonthMSHPublished / prevMonthMSHExpected) * 100).toFixed(0)
        : 0;
      
      const orgTrend = prevOrgCompletionPercent > 0 
        ? parseFloat(orgCompletionPercent) - parseFloat(prevOrgCompletionPercent) 
        : "---";

      // Assessments
      const allCycleAssessments = assessmentSnapshots.flatMap(snapshot =>
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          completedAt: doc.data().completedAt?.toDate()
        }))
      );

      const directReportUids = myDirectReportsList.map(r => r.userId);

      // Assessments I GIVE (to my direct reports)
      const giveAssessments = allCycleAssessments
        .filter(a => {
          const giverUid = a.giver?.uid || a.assessorId;
          const receiverUid = a.receiver?.uid || a.subjectId;
          
          // I'm the giver AND receiver is my direct report
          return giverUid === user.uid && directReportUids.includes(receiverUid);
        })
        .map(a => {
          const giverUid = a.giver?.uid || a.assessorId;
          const receiverUid = a.receiver?.uid || a.subjectId;
          const giverData = userMap[a.giver?.userId || a.assessorId] || Object.values(userMap).find(u => u.uid === giverUid);
          const receiverData = userMap[a.receiver?.userId || a.subjectId] || Object.values(userMap).find(u => u.uid === receiverUid);
          const isSelfAssessment = giverUid === receiverUid;
          
          return {
            ...a,
            assessorUid: giverUid,
            assessorId: giverUid,
            assessorName: a.giver?.displayName || a.assessorName || giverData?.displayName || 'Unknown',
            assessorLayer: a.giver?.layer || giverData?.layer || 'ISF Supervisor',
            assessorPillar: giverData?.pillar,
            assessorSubPillar: giverData?.subPillar,
            subjectUid: receiverUid,
            subjectId: receiverUid,
            subjectName: a.receiver?.displayName || a.subjectName || receiverData?.displayName || 'Unknown',
            subjectEmail: receiverData?.email || '',
            subjectLayer: a.receiver?.layer || receiverData?.layer || 'ISF',
            subjectPillar: receiverData?.pillar,
            subjectSubPillar: receiverData?.subPillar,
            isSelfAssessment,
            myRole: 'giver',
            viewAccess: 'edit'
          };
        });

      // Assessments I RECEIVE (from my ISL manager)
      const receiveAssessments = allCycleAssessments
        .filter(a => {
          const receiverUid = a.receiver?.uid || a.subjectId;
          const giverUid = a.giver?.uid || a.assessorId;
          return receiverUid === user.uid && giverUid !== receiverUid;
        })
        .map(a => {
          const giverUid = a.giver?.uid || a.assessorId;
          const giverData = userMap[a.giver?.userId || a.assessorId] || Object.values(userMap).find(u => u.uid === giverUid);
          
          return {
            ...a,
            assessorUid: giverUid,
            assessorName: a.giver?.displayName || a.assessorName || giverData?.displayName || 'Unknown',
            assessorLayer: a.giver?.layer || giverData?.layer || 'Unknown',
            isSelfAssessment: false,
            myRole: 'receiver',
            viewAccess: 'read-only'
          };
        });

      // 360 Pairings
      const all360Assessments = allCycleAssessments.filter(a => a.cycleType === '360');
      
      const selfAssessmentMap = new Map();
      all360Assessments.forEach(assessment => {
        const giverUid = assessment.giver?.uid || assessment.assessorId;
        const receiverUid = assessment.receiver?.uid || assessment.subjectId;
        if (giverUid === receiverUid && giverUid) {
          selfAssessmentMap.set(giverUid, assessment.status);
        }
      });
      
      const pairingMap = new Map();
      
      all360Assessments.forEach(assessment => {
        const rawPairId = assessment.pairId;
        if (!rawPairId) return;
        
        const pairId = rawPairId.replace(/^360-pair-cycle-/, '');
        
        if (!pairingMap.has(pairId)) {
          pairingMap.set(pairId, {
            pairId,
            cycleMonth: assessment.cycleMonth,
            cycleYear: assessment.cycleYear,
            cycleType: '360',
            assessments: [],
            assessmentIds: {},
            personA: null,
            personB: null,
            managerId: null,
            relationshipType: null
          });
        }
        
        const pairing = pairingMap.get(pairId);
        pairing.assessments.push(assessment);
        
        const giverUid = assessment.giver?.uid || assessment.assessorId;
        const receiverUid = assessment.receiver?.uid || assessment.subjectId;
        
        if (giverUid !== receiverUid) {
          if (!pairing.personA) {
            const giverData = userMap[assessment.giver?.userId || assessment.assessorId] || Object.values(userMap).find(u => u.uid === giverUid);
            pairing.personA = {
              uid: giverUid,
              name: assessment.giver?.displayName || assessment.assessorName,
              displayName: assessment.giver?.displayName || assessment.assessorName,
              layer: assessment.giver?.layer || giverData?.layer
            };
          }
          
          if (!pairing.personB && receiverUid !== pairing.personA?.uid) {
            const receiverData = userMap[assessment.receiver?.userId || assessment.subjectId] || Object.values(userMap).find(u => u.uid === receiverUid);
            pairing.personB = {
              uid: receiverUid,
              name: assessment.receiver?.displayName || assessment.subjectName,
              displayName: assessment.receiver?.displayName || assessment.subjectName,
              layer: assessment.receiver?.layer || receiverData?.layer
            };
          }
          
          if (giverUid === pairing.personA?.uid && receiverUid === pairing.personB?.uid) {
            pairing.assessmentIds.personA_to_B = assessment.id;
          } else if (giverUid === pairing.personB?.uid && receiverUid === pairing.personA?.uid) {
            pairing.assessmentIds.personB_to_A = assessment.id;
          }
        }
      });

      // Set relationship type for pairings
      pairingMap.forEach((pairing) => {
        const personALayer = pairing.personA?.layer;
        const personBLayer = pairing.personB?.layer;
        
        if (personALayer === personBLayer && personALayer === 'ISF Supervisor') {
          pairing.relationshipType = 'peer';
        } else if (personALayer === personBLayer && personALayer === 'ISL') {
          pairing.relationshipType = 'peer';
        } else {
          pairing.relationshipType = 'manager-report';
          
          if (personALayer === 'ISE' || (personALayer === 'ISL' && personBLayer === 'ISF Supervisor')) {
            pairing.managerId = pairing.personA.uid;
          } else if (personALayer === 'ISF Supervisor' && personBLayer === 'ISF') {
            pairing.managerId = pairing.personA.uid;
          } else {
            pairing.managerId = pairing.personB.uid;
            const temp = pairing.personA;
            pairing.personA = pairing.personB;
            pairing.personB = temp;
            const tempId = pairing.assessmentIds.personA_to_B;
            pairing.assessmentIds.personA_to_B = pairing.assessmentIds.personB_to_A;
            pairing.assessmentIds.personB_to_A = tempId;
          }
        }
      });

      const my360Pairings = Array.from(pairingMap.values())
        .filter(pairing => pairing.personA?.uid === user.uid || pairing.personB?.uid === user.uid)
        .map(pairing => {
          const personAUid = pairing.personA?.uid;
          const personBUid = pairing.personB?.uid;
          
          const personA_self = selfAssessmentMap.get(personAUid) || 'pending';
          const personB_self = selfAssessmentMap.get(personBUid) || 'pending';
          
          const assessmentStatuses = pairing.assessments.reduce((acc, a) => {
            const giverUid = a.giver?.uid || a.assessorId;
            const receiverUid = a.receiver?.uid || a.subjectId;
            if (giverUid === receiverUid) return acc;
            
            if (giverUid === personAUid && receiverUid === personBUid) {
              acc.personA_to_B = a.status;
            } else if (giverUid === personBUid && receiverUid === personAUid) {
              acc.personB_to_A = a.status;
            }
            return acc;
          }, { personA_to_B: 'pending', personB_to_A: 'pending' });

          const combinedStatuses = {
            personA_self,
            personA_to_B: assessmentStatuses.personA_to_B,
            personB_self,
            personB_to_A: assessmentStatuses.personB_to_A
          };

          const allComplete = Object.values(combinedStatuses).every(
            status => status === 'completed' || status === 'calibrated'
          );
          
          const partialComplete = Object.values(combinedStatuses).some(
            status => status === 'completed' || status === 'calibrated'
          );

          return {
            ...pairing,
            status: combinedStatuses,
            overallStatus: allComplete ? 'all_complete' : partialComplete ? 'partially_complete' : 'not_started',
            personA: pairing.personA ? { ...pairing.personA, ...userMap[pairing.personA.uid] } : null,
            personB: pairing.personB ? { ...pairing.personB, ...userMap[pairing.personB.uid] } : null
          };
        });

      setAssessmentsIGive(giveAssessments);
      setAssessmentsIReceive(receiveAssessments);
      setPairings360(my360Pairings);
      setMSHScoresIReceive(myMSH.sort((a, b) => b.publishedAt - a.publishedAt));

      const cycleExpectedTotal = cycleInfo.cycleMonths.reduce((total, m) => {
        const is360 = [3, 6, 9, 12].includes(m.month);
        return total + (is360 ? 93 : 24);
      }, 0);

      setMetrics({
        cycleNumber: cycleInfo.cycleNumber,
        cycleType: cycleInfo.cycleType,
        currentMonth: cycleInfo.currentMonth,
        cycleMonths: cycleInfo.cycleMonths,
        displayMonth,
        displayYear,
        isgsCompassScore,
        isgsCompassCompleted,
        isgsCompassTotal,
        isgsCompassCumulativeAvg: calcAvg(isgsCompassCumulativeScores),
        isgsCompassCumulativeCount: isgsCompassCumulativeScores.length,
        isgsCompassTrend,
        islScore,
        islCompleted: uniqueISLLayerCompleted,
        islTotal: cycleInfo.cycleType === '360' ? 30 : 5,  // ISE (1) + ISL (4-5) in 1x1, or 6x each in 360
        islCumulativeAvg: calcAvg(cumulativeISLLayer.map(m => m.compositeScore)),
        islCumulativeCount: cumulativeISLLayer.length,
        islTrend,
        allPillarsScore,
        allPillarsCompleted: uniqueAllISFCompleted,
        allPillarsTotal: isfUsers.length,
        allPillarsCumulativeAvg: calcAvg(cumulativeAllISF.map(m => m.compositeScore)),
        allPillarsCumulativeCount: cumulativeAllISF.length,
        allPillarsTrend,
        myScore,
        myCompleted,
        myTotal,
        myCumulativeAvg: calcAvg(cumulativeMy.map(m => m.compositeScore)),
        myCumulativeCount: cumulativeMy.length,
        myTrend,
        pillarBreakdown: pillarHealthScores,
        orgScore: orgCompletionPercent,
        orgCompleted: currentMonthMSHPublished,
        orgTotal: currentMonthMSHExpected,
        orgCumulativeAvg: cumulativeCompletionPercent,
        orgCumulativeCount: cumulativeMSH.length,
        orgTrend,
        completedCount: allCycleAssessments.filter(a => a.status === 'completed' || a.status === 'calibrated' || a.status === 'published').length,
        totalCount: cycleExpectedTotal,
        // ✅ STEP 3: Pass MSH³ metrics to HubMetricsBar
        currentMonthMSH: currentMonthMSH.length,
        currentMonthMSHExpected,
        cycleMSH: cumulativeMSH.length,
        cycleMSHExpected: cycleInfo.cycleMonths.reduce((total, m) => {
          const is360 = [3, 6, 9, 12].includes(m.month);
          return total + (is360 ? 49 : 24);
        }, 0)
      });

    } catch (error) {
      console.error('❌ Error fetching ISF Supervisor hub data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = useCallback((assessment) => {
    if (assessment.viewAccess === 'read-only') {
      alert('You have view-only access to this assessment');
      return;
    }
    navigate(`/is-os/assessments/${metrics.cycleType}/edit/${assessment.id}`);
  }, [navigate, metrics.cycleType]);

  const handleViewAssessment = useCallback((assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  }, [navigate]);

  const handleViewScore = useCallback((mshId) => {
    navigate(`/is-os/msh/${mshId}`);
  }, [navigate]);

  const handleView360Pair = useCallback((pairing) => {
    const selectedPair = pairing.selectedPair || 'A';
    navigate(`/is-os/360-comparative/${pairing.pairId}?pair=${selectedPair}`);
  }, [navigate]);

  const handleMonthSelect = useCallback((month, year) => {
    setSelectedMonth({ month, year });
  }, []);

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'give', label: 'Give', count: assessmentsIGive.length, subtitle: 'Assessments for my team' },
      { id: 'receive', label: 'Receive', count: assessmentsIReceive.length + mshScoresIReceive.length, subtitle: 'Assessments about me + My MSH scores' }
    ];

    const has360Pairings = pairings360.length > 0;
    const is360Month = metrics.cycleType === '360';

    if (has360Pairings || is360Month) {
      baseTabs.push({ id: '360', label: 'MSH 360', count: pairings360.length, subtitle: '360° Pairings I\'m involved in' });
    }

    return baseTabs;
  }, [assessmentsIGive.length, assessmentsIReceive.length, mshScoresIReceive.length, pairings360.length, metrics.cycleType]);

  const selectedMonthName = useMemo(() => {
    return selectedMonth 
      ? new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Current';
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supervisor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HubHeroBanner gradient="yellow" title="ISOS Hub" subtitle="ISF Supervisor View - Leader in Training" icon={Zap} />
      <HubMetricsBar 
        gradient="yellow" 
        cycleNumber={metrics.cycleNumber} 
        cycleType={metrics.cycleType} 
        currentMonth={metrics.currentMonth} 
        currentMonthMSH={metrics.currentMonthMSH}
        currentMonthMSHExpected={metrics.currentMonthMSHExpected}
        cycleMSH={metrics.cycleMSH}
        cycleMSHExpected={metrics.cycleMSHExpected}
        cycleAssessmentsCompleted={metrics.completedCount}
        cycleAssessmentsTotal={metrics.totalCount}
      />
      
      {metrics.cycleMonths && (
        <div className="max-w-7xl mx-auto px-6 -mt-4 mb-4">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-900">
                  Viewing: {selectedMonthName}
                </span>
                <div className="h-4 w-px bg-yellow-300"></div>
                <div className="flex gap-2">
                  {metrics.cycleMonths.map((m, i) => {
                    const monthName = new Date(m.year, m.month - 1).toLocaleDateString('en-US', { month: 'short' });
                    const isSelected = selectedMonth ? (selectedMonth.month === m.month && selectedMonth.year === m.year) : (m.month === new Date().getMonth() + 1 && m.year === new Date().getFullYear());
                    
                    return (
                      <button
                        key={i}
                        onClick={() => handleMonthSelect(m.month, m.year)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-md'
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 hover:border-yellow-400'
                        }`}
                      >
                        {monthName} {m.year}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Row 1: Organizational Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPIStatCard 
            title="ISGS Compass" 
            value={metrics.isgsCompassScore || "—"} 
            secondaryValue={`${metrics.isgsCompassCompleted} / ${metrics.isgsCompassTotal}`} 
            maxValue={12} 
            icon={Compass} 
            gradient="blue" 
            trend={metrics.isgsCompassTrend} 
            trendLabel="vs last month" 
            metadata={[
              { label: "Cumulative Avg", value: metrics.isgsCompassCumulativeAvg || "—" }, 
              { label: "Total MSH", value: metrics.isgsCompassCumulativeCount }
            ]} 
          />
          <KPIStatCard 
            title="ISL Leadership" 
            value={metrics.islScore || "—"} 
            secondaryValue={`${metrics.islCompleted} / ${metrics.islTotal}`} 
            maxValue={12} 
            icon={Award} 
            gradient="purple" 
            trend={metrics.islTrend} 
            trendLabel="vs last month" 
            metadata={[
              { label: "Cumulative Avg", value: metrics.islCumulativeAvg || "—" }, 
              { label: "Total MSH", value: metrics.islCumulativeCount }
            ]} 
          />
          <KPIStatCard 
            title="All Pillars Aggregate" 
            value={metrics.allPillarsScore || "—"} 
            secondaryValue={`${metrics.allPillarsCompleted} / ${metrics.allPillarsTotal}`} 
            maxValue={12} 
            icon={TrendingUp} 
            gradient="emerald" 
            trend={metrics.allPillarsTrend} 
            trendLabel="vs last month" 
            metadata={[
              { label: "Cumulative Avg", value: metrics.allPillarsCumulativeAvg || "—" }, 
              { label: "Total MSH", value: metrics.allPillarsCumulativeCount }
            ]} 
          />
        </div>

        {/* Row 2: Individual Pillar Health */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-yellow-600" />
            Individual Pillar Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {metrics.pillarBreakdown.map(p => (
              <KPIStatCard 
                key={p.id} 
                title={p.name} 
                value={p.score || "—"} 
                secondaryValue={`${p.completed} / ${p.total}`} 
                maxValue={12} 
                icon={Building2} 
                gradient="indigo" 
                trend={p.trend} 
                trendLabel="vs last month" 
                metadata={[
                  { label: "Cumulative Avg", value: p.cumulativeAvg || "—" }, 
                  { label: "Total MSH", value: p.cumulativeCount }
                ]} 
              />
            ))}
          </div>
        </div>

        {/* Row 3: Org-Wide and Personal Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <KPIStatCard 
            title="Org-Wide Completion" 
            value={`${metrics.orgScore}%`} 
            secondaryValue={`${metrics.orgCompleted} / ${metrics.orgTotal}`} 
            maxValue={null} 
            icon={BarChart3} 
            gradient="cyan" 
            trend={metrics.orgTrend} 
            trendLabel="% vs last month" 
            metadata={[
              { label: "Cumulative Avg", value: `${metrics.orgCumulativeAvg}%` }, 
              { label: "Total MSH", value: metrics.orgCumulativeCount }
            ]} 
          />
          <KPIStatCard 
            title="My Compass" 
            value={metrics.myScore || "—"} 
            secondaryValue={`${metrics.myCompleted} / ${metrics.myTotal}`} 
            maxValue={12} 
            icon={User} 
            gradient="orange" 
            trend={metrics.myTrend} 
            trendLabel="vs last month" 
            metadata={[
              { label: "Cumulative Avg", value: metrics.myCumulativeAvg || "—" }, 
              { label: "Total MSH", value: metrics.myCumulativeCount }
            ]} 
          />
        </div>

        {/* Tabs and Assessment Grid */}
        <div className="mb-8">
          <HubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          {activeTab === 'give' && (
            <AssessmentOrchestrator 
              assessments={assessmentsIGive} 
              onStartAssessment={handleStartAssessment} 
              onViewAssessment={handleViewAssessment} 
              viewMode="give" 
              currentUserId={user.uid} 
              userRole="ISF Supervisor" 
              emptyStateMessage="No team assessments to complete this cycle" 
            />
          )}
          
          {activeTab === 'receive' && (
            <div className="space-y-8">
              {assessmentsIReceive.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessments About Me</h3>
                  <AssessmentOrchestrator 
                    assessments={assessmentsIReceive} 
                    onStartAssessment={handleStartAssessment} 
                    onViewAssessment={handleViewAssessment} 
                    viewMode="receive" 
                    currentUserId={user.uid} 
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Published MSH Scores</h3>
                <PublishedMSHScoresGrid mshScores={mshScoresIReceive} onViewScore={handleViewScore} />
              </div>
            </div>
          )}

          {activeTab === '360' && (
            <AssessmentOrchestrator 
              pairings={pairings360} 
              onView360Pair={handleView360Pair} 
              viewMode="360-pairings" 
              currentUserId={user.uid} 
              userRole="ISF Supervisor" 
              emptyStateMessage="No 360° pairings involving you this cycle" 
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ISOSHubISFSupervisor;