// 📁 SAVE TO: src/pages/is-os/ISOSHubISE.jsx
// ISE Hub - Executive View (CEO/President)
// ✅ Updated to match ISL Hub architecture with 360° support
// ✅ Self-assessment map for accurate pairing status
// ✅ FIXED: Proper MR/DR vs P2P detection based on layer hierarchy
// ✅ FIXED: Person ordering - Manager = personA, Direct Report = personB
// ✅ FIXED: 360° navigation with proper query parameters
// ✅ FIXED: pairId normalization to remove "360-pair-cycle-" prefix

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Compass, Award, Building2, User, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HubHeroBanner from '../../components/hubs/HubHeroBanner';
import KPIStatCard from '../../components/hubs/KPIStatCard';
import HubTabs from '../../components/hubs/HubTabs';
import HubMetricsBar from '../../components/hubs/HubMetricsBar';
import UnifiedAssessmentGrid from '../../components/hubs/UnifiedAssessmentGrid';
import PublishedMSHScoresGrid from '../../components/hubs/PublishedMSHScoresGrid';

function ISOSHubISE() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const CYCLE_START_DATE = new Date(2025, 9, 1);
  
  const [activeTab, setActiveTab] = useState('give');
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
    isgsCompassYTDAvg: null,
    isgsCompassYTDCount: 0,
    isgsCompassTrend: null,
    islScore: null,
    islCompleted: 0,
    islTotal: 5,
    islYTDAvg: null,
    islYTDCount: 0,
    islTrend: null,
    allPillarsScore: null,
    allPillarsCompleted: 0,
    allPillarsTotal: 19,
    allPillarsYTDAvg: null,
    allPillarsYTDCount: 0,
    allPillarsTrend: null,
    myScore: null,
    myCompleted: 0,
    myTotal: 1,
    myYTDAvg: null,
    myYTDCount: 0,
    myTrend: null,
    pillarBreakdown: [],
    orgScore: null,
    orgCompleted: 0,
    orgTotal: 24,
    orgYTDAvg: null,
    orgYTDCount: 0,
    orgTrend: null,
    completedCount: 0,
    totalCount: 0
  });

  const calcAvg = (scores) => {
    if (!scores || scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return (sum / scores.length).toFixed(1);
  };

  const getCycleInfo = (date = new Date()) => {
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
    return { cycleNumber, cycleMonth, cycleType, currentMonth, cycleMonths };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const cycleInfo = getCycleInfo(now);
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userMap = {};
        const iseUsers = [];
        const islUsers = [];
        const isfUsers = [];
        
        usersSnapshot.docs.forEach(doc => {
          const userData = { id: doc.id, ...doc.data() };
          userMap[userData.userId] = userData;
          if (userData.layer === 'ISE') iseUsers.push(userData);
          else if (userData.layer === 'ISL') islUsers.push(userData);
          else if (userData.layer === 'ISF' || userData.layer === 'ISF Supervisor' || userData.flags?.isSupervisor === true) {
            isfUsers.push(userData);
          }
        });

        const allPillarsSnapshot = await getDocs(collection(db, 'pillars'));
        const allPillars = allPillarsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => p && p.pillarName);

        const mshSnapshot = await getDocs(query(
          collection(db, 'mshScores'),
          where('publishedAt', '>=', Timestamp.fromDate(CYCLE_START_DATE))
        ));

        const allMSH = mshSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          publishedAt: doc.data().publishedAt?.toDate()
        }));

        const islMSH = allMSH.filter(m => islUsers.some(u => u.userId === m.subjectId));
        const allISFMSH = allMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId));
        const myMSH = allMSH.filter(m => m.subjectId === user.uid);

        const currentMonthMSH = allMSH.filter(m => m.cycleMonth === currentMonth && m.cycleYear === currentYear);
        const currentMonthISL = currentMonthMSH.filter(m => islUsers.some(u => u.userId === m.subjectId));
        const currentMonthAllISF = currentMonthMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId));
        const currentMonthMy = currentMonthMSH.filter(m => m.subjectId === user.uid);

        const prevMonthMSH = allMSH.filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear);
        const prevMonthISL = prevMonthMSH.filter(m => islUsers.some(u => u.userId === m.subjectId));
        const prevMonthAllISF = prevMonthMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId));
        const prevMonthMy = prevMonthMSH.filter(m => m.subjectId === user.uid);

        const uniqueISLCompleted = new Set(currentMonthISL.map(m => m.subjectId)).size;
        const uniqueAllISFCompleted = new Set(currentMonthAllISF.map(m => m.subjectId)).size;
        const uniqueMyCompleted = currentMonthMy.length > 0 ? 1 : 0;

        const islScore = calcAvg(currentMonthISL.map(m => m.composite));
        const allPillarsScore = calcAvg(currentMonthAllISF.map(m => m.composite));
        const myScore = calcAvg(currentMonthMy.map(m => m.composite));

        const prevIslScore = calcAvg(prevMonthISL.map(m => m.composite));
        const prevAllPillarsScore = calcAvg(prevMonthAllISF.map(m => m.composite));
        const prevMyScore = calcAvg(prevMonthMy.map(m => m.composite));

        const islTrend = (islScore && prevIslScore) ? parseFloat((parseFloat(islScore) - parseFloat(prevIslScore)).toFixed(1)) : "---";
        const allPillarsTrend = (allPillarsScore && prevAllPillarsScore) ? parseFloat((parseFloat(allPillarsScore) - parseFloat(prevAllPillarsScore)).toFixed(1)) : "---";
        const myTrend = (myScore && prevMyScore) ? parseFloat((parseFloat(myScore) - parseFloat(prevMyScore)).toFixed(1)) : "---";

        const pillarHealthScores = allPillars.map(pillar => {
          const pillarISFUsers = isfUsers.filter(u => u.pillar === pillar.id);
          const pillarMSH = allMSH.filter(m => pillarISFUsers.some(u => u.userId === m.subjectId));
          const currentMonthPillarMSH = pillarMSH.filter(m => m.cycleMonth === currentMonth && m.cycleYear === currentYear);
          const prevMonthPillarMSH = pillarMSH.filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear);
          const uniqueCompleted = new Set(currentMonthPillarMSH.map(m => m.subjectId)).size;
          const pillarCurrentScore = calcAvg(currentMonthPillarMSH.map(m => m.composite));
          const pillarPrevScore = calcAvg(prevMonthPillarMSH.map(m => m.composite));
          const pillarTrend = (pillarCurrentScore && pillarPrevScore) ? parseFloat((parseFloat(pillarCurrentScore) - parseFloat(pillarPrevScore)).toFixed(1)) : "---";
          return {
            id: pillar.id,
            name: pillar.pillarName,
            score: pillarCurrentScore,
            completed: uniqueCompleted,
            total: pillarISFUsers.length,
            ytdAvg: calcAvg(pillarMSH.map(m => m.composite)),
            ytdCount: pillarMSH.length,
            trend: pillarTrend
          };
        });

        let isgsCompassScore = null;
        let prevIsgsCompassScore = null;
        let isgsCompassTrend = "---";
        if (islScore !== null && allPillarsScore !== null) {
          isgsCompassScore = ((parseFloat(islScore) * 0.4) + (parseFloat(allPillarsScore) * 0.6)).toFixed(1);
        }
        if (prevIslScore !== null && prevAllPillarsScore !== null) {
          prevIsgsCompassScore = ((parseFloat(prevIslScore) * 0.4) + (parseFloat(prevAllPillarsScore) * 0.6)).toFixed(1);
        }
        if (isgsCompassScore && prevIsgsCompassScore) {
          isgsCompassTrend = parseFloat((parseFloat(isgsCompassScore) - parseFloat(prevIsgsCompassScore)).toFixed(1));
        }

        const isgsCompassCompleted = uniqueISLCompleted + uniqueAllISFCompleted;
        const isgsCompassTotal = islUsers.length + isfUsers.length;
        const isgsCompassYTDScores = [...islMSH, ...allISFMSH].map(m => m.composite);

        const orgCompleted = uniqueISLCompleted + uniqueAllISFCompleted;
        const orgTotal = islUsers.length + isfUsers.length;
        const orgCompletionPercent = orgTotal > 0 ? ((orgCompleted / orgTotal) * 100).toFixed(0) : 0;
        const prevMonthISLCompleted = new Set(prevMonthISL.map(m => m.subjectId)).size;
        const prevMonthAllISFCompleted = new Set(prevMonthAllISF.map(m => m.subjectId)).size;
        const prevOrgCompleted = prevMonthISLCompleted + prevMonthAllISFCompleted;
        const prevOrgCompletionPercent = orgTotal > 0 ? ((prevOrgCompleted / orgTotal) * 100).toFixed(0) : 0;
        const ytdUniqueCompleted = new Set(allMSH.map(m => m.subjectId)).size;
        const ytdCompletionPercent = orgTotal > 0 ? ((ytdUniqueCompleted / orgTotal) * 100).toFixed(0) : 0;
        const orgTrend = (prevOrgCompleted > 0) ? parseFloat(orgCompletionPercent) - parseFloat(prevOrgCompletionPercent) : "---";

        // Fetch assessments for the entire cycle (all 3 months)
        const allCycleAssessments = [];
        for (const cycleMonthInfo of cycleInfo.cycleMonths) {
          const assessmentsForMonth = await getDocs(query(
            collection(db, 'assessments'),
            where('cycleMonth', '==', cycleMonthInfo.month),
            where('cycleYear', '==', cycleMonthInfo.year)
          ));
          allCycleAssessments.push(...assessmentsForMonth.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            completedAt: doc.data().completedAt?.toDate()
          })));
        }

        // GIVE TAB: My assessments (ISE completes assessments)
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

        // RECEIVE TAB: Assessments about me (EXCLUDING self-assessments)
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

        // 360° PAIRINGS: Build self-assessment map first
        const all360Assessments = allCycleAssessments.filter(a => a.cycleType === '360');
        
        console.log('🎯 ISE Hub - Total 360° assessments in cycle:', all360Assessments.length);
        
        const selfAssessmentMap = new Map();
        all360Assessments.forEach(assessment => {
          const giverUid = assessment.giver?.uid || assessment.assessorId;
          const receiverUid = assessment.receiver?.uid || assessment.subjectId;
          const isSelf = giverUid === receiverUid;
          
          if (isSelf && giverUid) {
            selfAssessmentMap.set(giverUid, assessment.status);
            console.log('  ✅ STORED self-assessment:', assessment.giver?.displayName || assessment.assessorName, 'Status:', assessment.status);
          }
        });
        
        console.log('📋 Self-Assessment Map has', selfAssessmentMap.size, 'entries');
        
        // Build 360° pairings from assessments
        const pairingMap = new Map();
        
        all360Assessments.forEach(assessment => {
          const rawPairId = assessment.pairId;
          if (!rawPairId) return;
          
          // ✅ NORMALIZE: Remove "360-pair-cycle-" prefix if present
          // "360-pair-cycle-2025-12-avery_cloutier-robert_paddock" → "2025-12-avery_cloutier-robert_paddock"
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
          
          // Store assessment IDs for navigation
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
            
            // Store assessment ID for navigation
            if (giverUid === pairing.personA?.uid && receiverUid === pairing.personB?.uid) {
              pairing.assessmentIds.personA_to_B = assessment.id;
            } else if (giverUid === pairing.personB?.uid && receiverUid === pairing.personA?.uid) {
              pairing.assessmentIds.personB_to_A = assessment.id;
            }
          }
        });

        // CRITICAL FIX: Determine relationshipType, managerId, AND enforce person ordering
        pairingMap.forEach((pairing, pairId) => {
          let personALayer = pairing.personA?.layer;
          let personBLayer = pairing.personB?.layer;
          
          console.log(`🔍 Analyzing pairing: ${pairing.personA?.displayName} (${personALayer}) ↔ ${pairing.personB?.displayName} (${personBLayer})`);
          
          // P2P: Both people in SAME layer (ISL ↔ ISL only)
          if (personALayer === personBLayer && personALayer === 'ISL') {
            pairing.relationshipType = 'peer';
            console.log('  ✅ P2P detected: Both are ISL managers');
          } 
          // MR/DR: Different layers (ISE ↔ ISL or ISL ↔ ISF)
          else {
            pairing.relationshipType = 'manager-report';
            
            // Determine who is the manager based on layer hierarchy: ISE > ISL > ISF
            let managerUid, directReportUid;
            
            if (personALayer === 'ISE' || (personALayer === 'ISL' && personBLayer === 'ISF')) {
              // PersonA is the manager
              managerUid = pairing.personA.uid;
              directReportUid = pairing.personB.uid;
              console.log(`  ✅ MR/DR detected: ${pairing.personA.displayName} (${personALayer}) is manager`);
            } else {
              // PersonB is the manager
              managerUid = pairing.personB.uid;
              directReportUid = pairing.personA.uid;
              console.log(`  ✅ MR/DR detected: ${pairing.personB.displayName} (${personBLayer}) is manager`);
              
              // SWAP: Ensure personA = Manager, personB = Direct Report
              console.log('  🔄 SWAPPING: Reordering so personA = Manager, personB = Direct Report');
              const temp = pairing.personA;
              pairing.personA = pairing.personB;
              pairing.personB = temp;
              
              // Also swap assessment IDs
              const tempId = pairing.assessmentIds.personA_to_B;
              pairing.assessmentIds.personA_to_B = pairing.assessmentIds.personB_to_A;
              pairing.assessmentIds.personB_to_A = tempId;
              
              console.log(`  ✅ After swap: personA = ${pairing.personA.displayName}, personB = ${pairing.personB.displayName}`);
            }
            
            pairing.managerId = managerUid;
          }
        });

        // Filter pairings to only show where ISE is involved
        const my360Pairings = Array.from(pairingMap.values())
          .filter(pairing => {
            const involvesMe = pairing.personA?.uid === user.uid || 
                              pairing.personB?.uid === user.uid;
            return involvesMe;
          })
          .map(pairing => {
            const personAUid = pairing.personA?.uid;
            const personBUid = pairing.personB?.uid;
            
            // Get self-assessment statuses from the global map
            const personA_self = selfAssessmentMap.get(personAUid) || 'pending';
            const personB_self = selfAssessmentMap.get(personBUid) || 'pending';
            
            // Get bilateral assessment statuses from pairing assessments
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
            }, {
              personA_to_B: 'pending',
              personB_to_A: 'pending'
            });

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

            console.log('📊 ISE Pairing Status for', pairing.personA?.displayName, '↔', pairing.personB?.displayName, ':', combinedStatuses);

            return {
              ...pairing,
              status: combinedStatuses,
              overallStatus: allComplete ? 'all_complete' : 
                           partialComplete ? 'partially_complete' : 
                           'not_started',
              personA: pairing.personA ? {
                ...pairing.personA,
                ...userMap[pairing.personA.uid]
              } : null,
              personB: pairing.personB ? {
                ...pairing.personB,
                ...userMap[pairing.personB.uid]
              } : null
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
          isgsCompassScore,
          isgsCompassCompleted,
          isgsCompassTotal,
          isgsCompassYTDAvg: calcAvg(isgsCompassYTDScores),
          isgsCompassYTDCount: isgsCompassYTDScores.length,
          isgsCompassTrend,
          islScore,
          islCompleted: uniqueISLCompleted,
          islTotal: islUsers.length,
          islYTDAvg: calcAvg(islMSH.map(m => m.composite)),
          islYTDCount: islMSH.length,
          islTrend,
          allPillarsScore,
          allPillarsCompleted: uniqueAllISFCompleted,
          allPillarsTotal: isfUsers.length,
          allPillarsYTDAvg: calcAvg(allISFMSH.map(m => m.composite)),
          allPillarsYTDCount: allISFMSH.length,
          allPillarsTrend,
          myScore,
          myCompleted: uniqueMyCompleted,
          myTotal: 1,
          myYTDAvg: calcAvg(myMSH.map(m => m.composite)),
          myYTDCount: myMSH.length,
          myTrend,
          pillarBreakdown: pillarHealthScores,
          orgScore: orgCompletionPercent,
          orgCompleted,
          orgTotal,
          orgYTDAvg: ytdCompletionPercent,
          orgYTDCount: allMSH.length,
          orgTrend,
          completedCount: allCycleAssessments.filter(a => a.status === 'completed' || a.status === 'calibrated').length,
          totalCount: cycleExpectedTotal
        });
      } catch (error) {
        console.error('❌ Error fetching ISE hub data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.uid, location.key]);

  const handleStartAssessment = (assessment) => {
    if (assessment.viewAccess === 'read-only') {
      alert('You have view-only access to this assessment');
      return;
    }
    navigate(`/is-os/assessments/${metrics.cycleType}/edit/${assessment.id}`);
  };

  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  const handleViewScore = (mshId) => {
    navigate(`/is-os/msh/${mshId}`);
  };

  // ✅ FIXED: 360° Navigation with query parameter + DEBUG
  const handleView360Pair = (pairing) => {
    // The pairing object from UnifiedAssessmentGrid includes selectedPair
    const selectedPair = pairing.selectedPair || 'A';
    
    console.log('🎯 ISE Hub - Navigating to 360° comparison:');
    console.log('  Full pairing object:', pairing);
    console.log('  pairId:', pairing.pairId);
    console.log('  selectedPair:', selectedPair);
    console.log('  URL will be:', `/is-os/360-comparative/${pairing.pairId}?pair=${selectedPair}`);
    
    // Debug: Check if navigate function exists
    if (!navigate) {
      console.error('❌ Navigate function is undefined!');
      return;
    }
    
    const targetUrl = `/is-os/360-comparative/${pairing.pairId}?pair=${selectedPair}`;
    console.log('  Calling navigate() with:', targetUrl);
    
    navigate(targetUrl);
    
    console.log('  ✅ Navigate called successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { 
      id: 'give', 
      label: 'Give', 
      count: assessmentsIGive.length, 
      subtitle: 'Assessments I complete' 
    },
    { 
      id: 'receive', 
      label: 'Receive', 
      count: assessmentsIReceive.length + mshScoresIReceive.length, 
      subtitle: 'Assessments about me + My MSH scores' 
    }
  ];

  const has360Pairings = pairings360.length > 0;
  const is360Month = metrics.cycleType === '360';

  if (has360Pairings || is360Month) {
    tabs.push({
      id: '360',
      label: 'MSH 360',
      count: pairings360.length,
      subtitle: '360° Pairings I\'m involved in'
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HubHeroBanner 
        gradient="purple" 
        title="ISOS Hub" 
        subtitle="ISE Executive View - Organization Leadership" 
        icon={Award} 
      />
      
      <HubMetricsBar 
        cycleNumber={metrics.cycleNumber} 
        cycleType={metrics.cycleType} 
        currentMonth={metrics.currentMonth} 
        completedCount={metrics.completedCount} 
        totalCount={metrics.totalCount} 
      />
      
      {metrics.cycleMonths && (
        <div className="max-w-7xl mx-auto px-6 -mt-4 mb-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Cycle {metrics.cycleNumber}:</span>
                <div className="flex gap-2">
                  {metrics.cycleMonths.map((m, i) => {
                    const name = new Date(m.year, m.month - 1).toLocaleDateString('en-US', { month: 'short' });
                    const curr = m.month === new Date().getMonth() + 1 && m.year === new Date().getFullYear();
                    return <span key={i} className={curr ? 'bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold' : 'bg-purple-100 text-purple-800 border border-purple-300 px-2 py-1 rounded text-xs font-semibold'}>{name} {m.year}</span>;
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
              { label: "YTD Avg", value: metrics.isgsCompassYTDAvg || "—" }, 
              { label: "Total MSH", value: metrics.isgsCompassYTDCount }
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
              { label: "YTD Avg", value: metrics.islYTDAvg || "—" }, 
              { label: "Total MSH", value: metrics.islYTDCount }
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
              { label: "YTD Avg", value: metrics.allPillarsYTDAvg || "—" }, 
              { label: "Total MSH", value: metrics.allPillarsYTDCount }
            ]} 
          />
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
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
                  { label: "YTD Avg", value: p.ytdAvg || "—" }, 
                  { label: "Total MSH", value: p.ytdCount }
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
                  { label: "YTD Avg", value: "—" }, 
                  { label: "Total MSH", value: "0" }
                ]} 
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <KPIStatCard 
            title="Org-Wide Completion" 
            value={metrics.orgScore ? `${metrics.orgScore}%` : "—"} 
            secondaryValue={`${metrics.orgCompleted} / ${metrics.orgTotal}`} 
            maxValue={null} 
            icon={BarChart3} 
            gradient="cyan" 
            trend={metrics.orgTrend} 
            trendLabel="% vs last month" 
            metadata={[
              { label: "YTD Avg", value: `${metrics.orgYTDAvg}%` }, 
              { label: "Total MSH", value: metrics.orgYTDCount }
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
              { label: "YTD Avg", value: metrics.myYTDAvg || "—" }, 
              { label: "Total MSH", value: metrics.myYTDCount }
            ]} 
          />
        </div>

        <div className="mb-8">
          <HubTabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          
          {activeTab === 'give' && (
            <UnifiedAssessmentGrid 
              assessments={assessmentsIGive} 
              onStartAssessment={handleStartAssessment} 
              onViewAssessment={handleViewAssessment} 
              viewMode="give" 
              currentUserId={user.uid} 
              userRole="ISE"
              emptyStateMessage="No assessments to complete this cycle" 
            />
          )}
          
          {activeTab === 'receive' && (
            <div className="space-y-8">
              {assessmentsIReceive.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Assessments About Me
                  </h3>
                  <UnifiedAssessmentGrid 
                    assessments={assessmentsIReceive} 
                    onStartAssessment={handleStartAssessment} 
                    onViewAssessment={handleViewAssessment} 
                    viewMode="receive" 
                    currentUserId={user.uid} 
                  />
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  My Published MSH Scores
                </h3>
                <PublishedMSHScoresGrid 
                  mshScores={mshScoresIReceive} 
                  onViewScore={handleViewScore} 
                />
              </div>
            </div>
          )}

          {activeTab === '360' && (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  🔍 Debug: Passing {pairings360.length} pairings to UnifiedAssessmentGrid
                  {pairings360.length > 0 && ` | First pairId: ${pairings360[0].pairId}`}
                </p>
              </div>
              <UnifiedAssessmentGrid
                pairings={pairings360}
                onView360Pair={handleView360Pair}
                viewMode="360-pairings"
                currentUserId={user.uid}
                userRole="ISE"
                emptyStateMessage="No 360° pairings involving you this cycle"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ISOSHubISE;