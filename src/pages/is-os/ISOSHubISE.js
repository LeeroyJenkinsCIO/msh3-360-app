// 📁 SAVE TO: src/pages/is-os/ISOSHubISE.jsx
// ISE Hub - Executive View (CEO/President)
// ✅ STEP 1: Fixed ISGS Compass weighting (60% ISL + 40% Pillars)
// ✅ STEP 2: Fixed ISL Leadership to include ISE and show correct 360 totals (0/30)
// ✅ STEP 3: Fixed Metrics Bar to show correct MSH³ totals (0/49 for Dec, 0/97 for cycle)
// ✅ STEP 4: Fixed Org-Wide Completion to use MSH³ Publication Rate (not people coverage)
// ✅ STEP 5: Updated routing - 360 pair assessments now use dedicated 360PairAssessment component
// ✅ STEP 6: Fixed MSH query to get ALL scores from 'mshs' collection (not date-filtered)
// ✅ STEP 7: Added dual-key userMap mapping (Firebase UID + userId string)
// ✅ STEP 8: Fixed My Compass for 360 - shows published MSH count/DR count (e.g., 1/5)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Compass, Award, Building2, User, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HubHeroBanner from '../../components/hubs/HubHeroBanner';
import KPIStatCard from '../../components/hubs/KPIStatCard';
import HubTabs from '../../components/hubs/HubTabs';
import HubMetricsBar from '../../components/hubs/HubMetricsBar';
import AssessmentOrchestrator from '../../components/hubs/AssessmentOrchestrator';
import PublishedMSHScoresGrid from '../../components/hubs/PublishedMSHScoresGrid';

function ISOSHubISE() {
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

  // ✅ Memoized helper functions
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
    const currentMonth = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    const cycleStartMonthOffset = Math.floor(monthsSinceStart / 3) * 3;
    const cycleStartDate = new Date(CYCLE_START_DATE);
    cycleStartDate.setMonth(CYCLE_START_DATE.getMonth() + cycleStartMonthOffset);
    const cycleMonths = [];
    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(cycleStartDate);
      monthDate.setMonth(cycleStartDate.getMonth() + i);
      cycleMonths.push({ month: monthDate.getMonth() + 1, year: monthDate.getFullYear() });
    }
    return { cycleNumber, cycleMonth, cycleType, currentMonth, cycleMonths, cycleStartDate };
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
      
      // Use display date for cycle info to show correct month in banner
      const displayDate = new Date(displayYear, displayMonth - 1, 1);
      const cycleInfo = getCycleInfo(displayDate);
      const prevMonth = displayMonth === 1 ? 12 : displayMonth - 1;
      const prevYear = displayMonth === 1 ? displayYear - 1 : displayYear;
      
      // ✅ OPTIMIZATION 1: Parallel queries instead of sequential
      const [usersSnapshot, allPillarsSnapshot, mshSnapshot, ...assessmentSnapshots] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'pillars')),
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

      // Process users into maps
      const userMap = {};
      const iseUsers = [];
      const islUsers = [];
      const isfUsers = [];
      
      usersSnapshot.docs.forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        // ✅ FIX: Dual-key mapping - MSH docs use userId strings like "robert_paddock"
        userMap[doc.id] = userData;  // Firebase UID
        if (userData.userId) {
          userMap[userData.userId] = userData;  // userId string
        }
        if (userData.layer === 'ISE') iseUsers.push(userData);
        else if (userData.layer === 'ISL') islUsers.push(userData);
        else if (userData.layer === 'ISF' || userData.layer === 'ISF Supervisor' || userData.flags?.isSupervisor === true) {
          isfUsers.push(userData);
        }
      });

      const allPillars = allPillarsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p && p.pillarName);

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
      
      const allISFMSH = allMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId));
      const myMSH = allMSH.filter(m => m.subjectId === user.userId || m.subjectId === user.uid);

      const cumulativeISLLayer = cumulativeMSH.filter(m => 
        islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
        iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
      );
      const cumulativeAllISF = cumulativeMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId));
      const cumulativeMy = cumulativeMSH.filter(m => m.subjectId === user.userId || m.subjectId === user.userId || m.subjectId === user.uid);

      const currentMonthMSH = allMSH.filter(m => m.cycleMonth === displayMonth && m.cycleYear === displayYear);
      
      const currentMonthISLLayer = currentMonthMSH.filter(m => 
        islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
        iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
      );
      
      const currentMonthAllISF = currentMonthMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId));
      const currentMonthMy = currentMonthMSH.filter(m => m.subjectId === user.userId || m.subjectId === user.uid);

      const prevMonthMSH = allMSH.filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear);
      
      const prevMonthISLLayer = prevMonthMSH.filter(m => 
        islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
        iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
      );
      
      const prevMonthAllISF = prevMonthMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId));
      const prevMonthMy = prevMonthMSH.filter(m => m.subjectId === user.userId || m.subjectId === user.uid);

      // ✅ STEP 2: ISL Leadership count logic
      const islLayerCompleted = cycleInfo.cycleType === '360' 
        ? currentMonthISLLayer.length
        : new Set(currentMonthISLLayer.map(m => m.subjectId)).size;

      const islLayerTotal = cycleInfo.cycleType === '360' 
        ? 30
        : 5;

      const uniqueAllISFCompleted = new Set(currentMonthAllISF.map(m => m.subjectId)).size;
      
      // ✅ FIX: My Compass for 360 cycles
      // For ISE: Count published MSH scores where YOU are the subject (from your DRs assessing you)
      // In 360: Each DR/MR pair produces 1 MSH for you (DR assesses you)
      const myCompleted = currentMonthMy.length;  // Count of published MSH scores
      const myTotal = cycleInfo.cycleType === '360' 
        ? islUsers.length  // In 360: expect 1 MSH from each DR
        : 1;  // In 1x1: expect 1 self-assessment

      const islScore = calcAvg(currentMonthISLLayer.map(m => m.compositeScore));
      const allPillarsScore = calcAvg(currentMonthAllISF.map(m => m.compositeScore));
      const myScore = calcAvg(currentMonthMy.map(m => m.compositeScore));

      const prevIslScore = calcAvg(prevMonthISLLayer.map(m => m.compositeScore));
      const prevAllPillarsScore = calcAvg(prevMonthAllISF.map(m => m.compositeScore));
      const prevMyScore = calcAvg(prevMonthMy.map(m => m.compositeScore));

      const islTrend = (islScore && prevIslScore) ? parseFloat((parseFloat(islScore) - parseFloat(prevIslScore)).toFixed(1)) : "---";
      const allPillarsTrend = (allPillarsScore && prevAllPillarsScore) ? parseFloat((parseFloat(allPillarsScore) - parseFloat(prevAllPillarsScore)).toFixed(1)) : "---";
      const myTrend = (myScore && prevMyScore) ? parseFloat((parseFloat(myScore) - parseFloat(prevMyScore)).toFixed(1)) : "---";

      // Calculate pillar health scores
      const pillarHealthScores = allPillars.map(pillar => {
        const pillarISFUsers = isfUsers.filter(u => u.pillar === pillar.id);
        const pillarMSH = allMSH.filter(m => pillarISFUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId));
        const pillarCumulative = cumulativeMSH.filter(m => pillarISFUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId));
        const currentMonthPillarMSH = pillarMSH.filter(m => m.cycleMonth === displayMonth && m.cycleYear === displayYear);
        const prevMonthPillarMSH = pillarMSH.filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear);
        const uniqueCompleted = new Set(currentMonthPillarMSH.map(m => m.subjectId)).size;
        const pillarCurrentScore = calcAvg(currentMonthPillarMSH.map(m => m.compositeScore));
        const pillarPrevScore = calcAvg(prevMonthPillarMSH.map(m => m.compositeScore));
        const pillarTrend = (pillarCurrentScore && pillarPrevScore) ? parseFloat((parseFloat(pillarCurrentScore) - parseFloat(pillarPrevScore)).toFixed(1)) : "---";
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

      // ✅ STEP 1 FIX: ISGS Compass weighting corrected to 60% ISL + 40% Pillars
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

      // ✅ STEP 4: ISGS Compass counts ALL MSH³ (ISL Layer + All Pillars)
      const isgsCompassCompleted = currentMonthISLLayer.length + currentMonthAllISF.length;
      const isgsCompassTotal = cycleInfo.cycleType === '360' 
        ? 49  // 30 (ISL Layer) + 19 (Pillars)
        : 24; // 5 (ISL Layer) + 19 (Pillars)
      const isgsCompassCumulativeScores = [...cumulativeISLLayer, ...cumulativeAllISF].map(m => m.compositeScore);

      // ✅ STEP 5: Org-Wide Completion = MSH³ Publication Rate
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

      // ✅ OPTIMIZATION 2: Assessments already fetched in parallel above
      const allCycleAssessments = assessmentSnapshots.flatMap(snapshot =>
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          completedAt: doc.data().completedAt?.toDate()
        }))
      );

      const giveAssessments = allCycleAssessments
        .filter(a => (a.giver?.uid || a.assessorId) === user.uid)
        .map(a => {
          const receiverUid = a.receiver?.uid || a.subjectId;
          const receiverData = userMap[a.receiver?.userId || a.subjectId] || Object.values(userMap).find(u => u.uid === receiverUid);
          const isSelfAssessment = (a.giver?.uid || a.assessorId) === receiverUid;
          
          return {
            ...a,
            subjectUid: receiverUid,
            subjectName: a.receiver?.displayName || a.subjectName || receiverData?.displayName || 'Unknown',
            subjectEmail: receiverData?.email || '',
            subjectLayer: a.receiver?.layer || receiverData?.layer || 'ISL',
            subjectPillar: receiverData?.pillar,
            subjectSubPillar: receiverData?.subPillar,
            isSelfAssessment,
            myRole: 'giver',
            viewAccess: 'edit'
          };
        });

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

      const all360Assessments = allCycleAssessments.filter(a => a.cycleType === '360');
      
      const selfAssessmentMap = new Map();
      all360Assessments.forEach(assessment => {
        const giverUid = assessment.giver?.uid || assessment.assessorId;
        const receiverUid = assessment.receiver?.uid || assessment.subjectId;
        const isSelf = giverUid === receiverUid;
        
        if (isSelf && giverUid) {
          selfAssessmentMap.set(giverUid, {
            id: assessment.id,
            status: assessment.status,
            assessment: assessment
          });
        }
      });
      
      console.log('🔍 Self-Assessment Map:', {
        size: selfAssessmentMap.size,
        entries: Array.from(selfAssessmentMap.entries()).map(([uid, data]) => ({
          uid,
          assessmentId: data.id,
          status: data.status
        }))
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
            const giverData = userMap[assessment.giver?.userId || assessment.assessorId] || 
                             Object.values(userMap).find(u => u.uid === giverUid);
            pairing.personA = {
              uid: giverUid,
              name: assessment.giver?.displayName || assessment.assessorName,
              displayName: assessment.giver?.displayName || assessment.assessorName,
              layer: assessment.giver?.layer || giverData?.layer
            };
          }
          
          if (!pairing.personB && receiverUid !== pairing.personA?.uid) {
            const receiverData = userMap[assessment.receiver?.userId || assessment.subjectId] || 
                                Object.values(userMap).find(u => u.uid === receiverUid);
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

      console.log('🔗 Linking self-assessments to pairings...');
      pairingMap.forEach((pairing) => {
        if (pairing.personA?.uid) {
          const selfData = selfAssessmentMap.get(pairing.personA.uid);
          if (selfData) {
            pairing.assessmentIds.personA_self = selfData.id;
            const alreadyInArray = pairing.assessments.some(a => a.id === selfData.id);
            if (!alreadyInArray) {
              pairing.assessments.push(selfData.assessment);
              console.log(`  ✅ Added personA self to pairing ${pairing.pairId}:`, selfData.id);
            }
          } else {
            console.log(`  ⚠️ No self for personA in pairing ${pairing.pairId}`);
          }
        }
        
        if (pairing.personB?.uid) {
          const selfData = selfAssessmentMap.get(pairing.personB.uid);
          if (selfData) {
            pairing.assessmentIds.personB_self = selfData.id;
            const alreadyInArray = pairing.assessments.some(a => a.id === selfData.id);
            if (!alreadyInArray) {
              pairing.assessments.push(selfData.assessment);
              console.log(`  ✅ Added personB self to pairing ${pairing.pairId}:`, selfData.id);
            }
          } else {
            console.log(`  ⚠️ No self for personB in pairing ${pairing.pairId}`);
          }
        }
      });

      pairingMap.forEach((pairing) => {
        const personALayer = pairing.personA?.layer;
        const personBLayer = pairing.personB?.layer;
        
        if (personALayer === personBLayer && personALayer === 'ISL') {
          pairing.relationshipType = 'peer';
        } else {
          pairing.relationshipType = 'manager-report';
          
          if (personALayer === 'ISE' || (personALayer === 'ISL' && personBLayer === 'ISF')) {
            pairing.managerId = pairing.personA.uid;
          } else {
            pairing.managerId = pairing.personB.uid;
            const temp = pairing.personA;
            pairing.personA = pairing.personB;
            pairing.personB = temp;
            const tempId = pairing.assessmentIds.personA_to_B;
            pairing.assessmentIds.personA_to_B = pairing.assessmentIds.personB_to_A;
            pairing.assessmentIds.personB_to_A = tempId;
            const tempSelf = pairing.assessmentIds.personA_self;
            pairing.assessmentIds.personA_self = pairing.assessmentIds.personB_self;
            pairing.assessmentIds.personB_self = tempSelf;
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
            const isSelf = giverUid === receiverUid;
            
            if (isSelf) return acc;
            
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

      // ✅ DEBUG: Log assessment IDs for each pairing
      my360Pairings.forEach(p => {
        console.log(`🎯 Pairing ${p.pairId} assessmentIds:`, p.assessmentIds);
      });

      setAssessmentsIGive(giveAssessments);
      setAssessmentsIReceive(receiveAssessments);
      setPairings360(my360Pairings);
      setMSHScoresIReceive(myMSH.sort((a, b) => b.publishedAt - a.publishedAt));


      // ✅ STEP 3: Calculate correct MSH³ expectations for Metrics Bar
      // Full cycle MSH³ expected (sum of all 3 months)
      const cycleMSHExpected = cycleInfo.cycleMonths.reduce((total, m) => {
        const is360 = [3, 6, 9, 12].includes(m.month);
        return total + (is360 ? 49 : 24);
      }, 0);  // Results in 97 (24 + 24 + 49)
      
      // Assessment counts (for display only, not MSH³)
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
        islCompleted: islLayerCompleted,
        islTotal: islLayerTotal,
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
        cycleMSHExpected
      });
    } catch (error) {
      console.error('❌ Error fetching ISE hub data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Memoized event handlers to prevent re-renders
  const handleStartAssessment = useCallback((assessment) => {
    if (assessment.viewAccess === 'read-only') {
      alert('You have view-only access to this assessment');
      return;
    }
    
    // ✅ Route 1: Self-assessments → dedicated SelfAssessmentPage
    const isSelfAssessment = assessment.assessmentType === 'self' || 
                            assessment.isSelfAssessment === true ||
                            assessment.assessorUid === assessment.subjectUid;
    
    if (isSelfAssessment) {
      navigate(`/is-os/self-assessment/${assessment.id}`);
      return;
    }
    
    // ✅ Route 2: 360° Bilateral Assessments (MR/DR/P2P) → 360PairAssessment
    const is360Bilateral = assessment.cycleType === '360' ||
                          assessment.assessmentType === '360' ||
                          assessment.assessmentType === 'peer' ||
                          assessment.assessmentType === 'manager-up' ||
                          assessment.assessmentType === 'manager-down';
    
    if (is360Bilateral) {
      navigate(`/is-os/360-pair-assessment/${assessment.id}`);
      return;
    }
    
    // ✅ Route 3: Traditional 1x1 assessments → 1x1AssessGrid (with MSH publishing)
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

  // ✅ Memoized computed values
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'give', label: 'Give', count: assessmentsIGive.length, subtitle: 'Assessments I complete' },
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HubHeroBanner gradient="silverblue" title="ISOS Hub" subtitle="ISE Executive View - Organization Leadership" icon={Award} />
      
      {/* ✅ STEP 3 & 5: Pass correct MSH³ and Assessment props to HubMetricsBar */}
      <HubMetricsBar 
        gradient="silverblue" 
        cycleNumber={metrics.cycleNumber} 
        cycleType={metrics.cycleType} 
        currentMonth={metrics.currentMonth} 
        completedCount={metrics.completedCount} 
        totalCount={metrics.totalCount}
        currentMonthMSH={metrics.currentMonthMSH}
        currentMonthMSHExpected={metrics.currentMonthMSHExpected}
        cycleMSH={metrics.cycleMSH}
        cycleMSHExpected={metrics.cycleMSHExpected}
        cycleAssessmentsCompleted={metrics.completedCount}
        cycleAssessmentsTotal={metrics.totalCount}
      />
      
      {metrics.cycleMonths && (
        <div className="max-w-7xl mx-auto px-6 -mt-4 mb-4">
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Viewing: {selectedMonthName}
                </span>
                <div className="h-4 w-px bg-gray-300"></div>
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
                            ? 'bg-gradient-to-r from-gray-600 to-slate-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:border-gray-400'
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

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-600" />
            Individual Pillar Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {metrics.pillarBreakdown.length > 0 ? metrics.pillarBreakdown.map(p => (
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
            )) : Array(5).fill(0).map((_, i) => (
              <KPIStatCard 
                key={i} 
                title={`Pillar ${i + 1}`} 
                value="—" 
                secondaryValue="0 / 0" 
                maxValue={12} 
                icon={Building2} 
                gradient="indigo" 
                trend={null} 
                metadata={[
                  { label: "Cumulative Avg", value: "—" }, 
                  { label: "Total MSH", value: "0" }
                ]} 
              />
            ))}
          </div>
        </div>

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

        <div className="mb-8">
          <HubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          {activeTab === 'give' && (
            <AssessmentOrchestrator assessments={assessmentsIGive} onStartAssessment={handleStartAssessment} onViewAssessment={handleViewAssessment} viewMode="give" currentUserId={user.uid} userRole="ISE" emptyStateMessage="No assessments to complete this cycle" />
          )}
          
          {activeTab === 'receive' && (
            <div className="space-y-8">
              {assessmentsIReceive.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessments About Me</h3>
                  <AssessmentOrchestrator assessments={assessmentsIReceive} onStartAssessment={handleStartAssessment} onViewAssessment={handleViewAssessment} viewMode="receive" currentUserId={user.uid} />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Published MSH Scores</h3>
                <PublishedMSHScoresGrid mshScores={mshScoresIReceive} onViewScore={handleViewScore} />
              </div>
            </div>
          )}

          {activeTab === '360' && (
            <AssessmentOrchestrator assessments={[...assessmentsIGive, ...assessmentsIReceive]} pairings={pairings360} onView360Pair={handleView360Pair} viewMode="360-pairings" currentUserId={user.uid} userRole="ISE" emptyStateMessage="No 360° pairings involving you this cycle" />
          )}

        </div>
      </div>
    </div>
  );
}


export default ISOSHubISE;