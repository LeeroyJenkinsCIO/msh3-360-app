// 📁 SAVE TO: src/pages/is-os/ISOSHubISF.jsx
// ISF Hub - Individual Contributor View
// ✅ STEP 1: Fixed ISGS Compass weighting (60% ISL + 40% Pillars)
// ✅ STEP 2: Fixed ISL Leadership to include ISE and show correct 360 totals (0/30)
// ✅ STEP 3: Fixed Metrics Bar to show correct MSH³ totals (0/49 for Dec, 0/97 for cycle)
// ✅ STEP 4: Organizational context only - ISF doesn't have org-wide completion card
// ✅ STEP 5: Updated routing - 360 pair assessments now use dedicated 360PairAssessment component
// ✅ STEP 6: Fixed MSH query to get ALL scores from 'mshs' collection (not date-filtered)
// ✅ STEP 7: Added dual-key userMap mapping (Firebase UID + userId string)
// ✅ STEP 8: Fixed My Compass for 360 - shows published MSH count/DR count (e.g., 1/5)
// ✅ STEP 9: Fixed Assessment Progress count to include 'published' status (aligns with ISL hub)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Compass, Award, Building2, User, Calendar, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HubHeroBanner from '../../components/hubs/HubHeroBanner';
import KPIStatCard from '../../components/hubs/KPIStatCard';
import HubTabs from '../../components/hubs/HubTabs';
import HubMetricsBar from '../../components/hubs/HubMetricsBar';
import AssessmentOrchestrator from '../../components/hubs/AssessmentOrchestrator';
import PublishedMSHScoresGrid from '../../components/hubs/PublishedMSHScoresGrid';

function ISOSHubISF() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const CYCLE_START_DATE = useMemo(() => new Date(2025, 9, 1), []);
  
  const [activeTab, setActiveTab] = useState('receive');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [assessmentsIReceive, setAssessmentsIReceive] = useState([]);
  const [mshScoresIReceive, setMSHScoresIReceive] = useState([]);
  const [pillarInfo, setPillarInfo] = useState(null);
  const [supervisorInfo, setSupervisorInfo] = useState(null);
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
    myPillarScore: null,
    myPillarCompleted: 0,
    myPillarTotal: 0,
    myPillarCumulativeAvg: null,
    myPillarCumulativeCount: 0,
    myPillarTrend: null,
    myScore: null,
    myCompleted: 0,
    myTotal: 1,
    myCumulativeAvg: null,
    myCumulativeCount: 0,
    myTrend: null,
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

      // Get user's pillar from their profile
      const currentUserData = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(u => u.userId === user.userId);

      const myPillarId = currentUserData?.pillar;

      // Get pillar info
      if (myPillarId) {
        const myPillar = pillarsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .find(p => p.id === myPillarId);
        
        if (myPillar) {
          setPillarInfo({
            id: myPillar.id,
            name: myPillar.pillarName,
            color: myPillar.color
          });
        }
      }

      // Build user map
      const userMap = {};
      const iseUsers = [];
      const islUsers = [];
      const isfUsers = [];
      const myPillarISFUsers = [];
      
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
          
          // Collect users in my pillar
          if (userData.pillar === myPillarId) {
            myPillarISFUsers.push(userData);
          }
        }
        
        // Find my supervisor info
        if (currentUserData?.managerId && userData.userId === currentUserData.managerId) {
          setSupervisorInfo({
            name: userData.displayName,
            email: userData.email,
            layer: userData.layer
          });
        }
      });

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

      // My Pillar MSH
      const myPillarMSH = allMSH.filter(m => myPillarISFUsers.some(u => u.userId === m.subjectId));
      const cumulativeMyPillar = cumulativeMSH.filter(m => myPillarISFUsers.some(u => u.userId === m.subjectId));

      // My MSH (received from supervisor)
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

      const currentMonthMyPillar = currentMonthMSH.filter(m =>
        myPillarISFUsers.some(u => u.userId === m.subjectId)
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

      const prevMonthMyPillar = prevMonthMSH.filter(m =>
        myPillarISFUsers.some(u => u.userId === m.subjectId)
      );
      
      const prevMonthMy = prevMonthMSH.filter(m => 
        m.subjectId === user.uid
      );

      // Calculate completion counts
      const uniqueISLLayerCompleted = new Set(currentMonthISLLayer.map(m => m.subjectId)).size;
      const uniqueAllISFCompleted = new Set(currentMonthAllISF.map(m => m.subjectId)).size;
      const uniqueMyPillarCompleted = new Set(currentMonthMyPillar.map(m => m.subjectId)).size;
      // ✅ STEP 8: My Compass for 360 - shows published MSH count
      const myCompleted = currentMonthMy.length;  // Count of published MSH scores
      const myTotal = 1;  // ISF always expects 1 MSH from supervisor

      // Calculate scores
      const islScore = calcAvg(currentMonthISLLayer.map(m => m.compositeScore));
      const allPillarsScore = calcAvg(currentMonthAllISF.map(m => m.compositeScore));
      const myPillarScore = calcAvg(currentMonthMyPillar.map(m => m.compositeScore));
      const myScore = calcAvg(currentMonthMy.map(m => m.compositeScore));

      const prevIslScore = calcAvg(prevMonthISLLayer.map(m => m.compositeScore));
      const prevAllPillarsScore = calcAvg(prevMonthAllISF.map(m => m.compositeScore));
      const prevMyPillarScore = calcAvg(prevMonthMyPillar.map(m => m.compositeScore));
      const prevMyScore = calcAvg(prevMonthMy.map(m => m.compositeScore));

      // Calculate trends
      const islTrend = (islScore && prevIslScore)
        ? parseFloat((parseFloat(islScore) - parseFloat(prevIslScore)).toFixed(1))
        : "---";
      
      const allPillarsTrend = (allPillarsScore && prevAllPillarsScore)
        ? parseFloat((parseFloat(allPillarsScore) - parseFloat(prevAllPillarsScore)).toFixed(1))
        : "---";

      const myPillarTrend = (myPillarScore && prevMyPillarScore)
        ? parseFloat((parseFloat(myPillarScore) - parseFloat(prevMyPillarScore)).toFixed(1))
        : "---";
      
      const myTrend = (myScore && prevMyScore)
        ? parseFloat((parseFloat(myScore) - parseFloat(prevMyScore)).toFixed(1))
        : "---";

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

      // Assessments
      const allCycleAssessments = assessmentSnapshots.flatMap(snapshot =>
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          completedAt: doc.data().completedAt?.toDate()
        }))
      );

      // Assessments I RECEIVE (from my supervisor)
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

      setAssessmentsIReceive(receiveAssessments);
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
        myPillarScore,
        myPillarCompleted: uniqueMyPillarCompleted,
        myPillarTotal: myPillarISFUsers.length,
        myPillarCumulativeAvg: calcAvg(cumulativeMyPillar.map(m => m.compositeScore)),
        myPillarCumulativeCount: cumulativeMyPillar.length,
        myPillarTrend,
        myScore,
        myCompleted,
        myTotal,
        myCumulativeAvg: calcAvg(cumulativeMy.map(m => m.compositeScore)),
        myCumulativeCount: cumulativeMy.length,
        myTrend,
        completedCount: allCycleAssessments.filter(a => a.status === 'completed' || a.status === 'calibrated' || a.status === 'published').length,
        totalCount: cycleExpectedTotal,
        // ✅ STEP 3: Pass MSH³ metrics to HubMetricsBar
        currentMonthMSH: currentMonthMSH.length,
        currentMonthMSHExpected: cycleInfo.cycleType === '360' ? 49 : 24,
        cycleMSH: cumulativeMSH.length,
        cycleMSHExpected: cycleInfo.cycleMonths.reduce((total, m) => {
          const is360 = [3, 6, 9, 12].includes(m.month);
          return total + (is360 ? 49 : 24);
        }, 0)
      });

    } catch (error) {
      console.error('❌ Error fetching ISF hub data:', error);
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

  const handleMonthSelect = useCallback((month, year) => {
    setSelectedMonth({ month, year });
  }, []);

  const tabs = useMemo(() => {
    return [
      { id: 'receive', label: 'My Assessments', count: assessmentsIReceive.length + mshScoresIReceive.length, subtitle: 'Assessments about me + My MSH scores' }
    ];
  }, [assessmentsIReceive.length, mshScoresIReceive.length]);

  const selectedMonthName = useMemo(() => {
    return selectedMonth 
      ? new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Current';
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HubHeroBanner gradient="green" title="ISOS Hub" subtitle="ISF View - My Performance & Development" icon={Target} />
      <HubMetricsBar 
        gradient="green" 
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
          <div className="bg-green-50 border-2 border-green-300 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-900">
                  Viewing: {selectedMonthName}
                </span>
                <div className="h-4 w-px bg-green-300"></div>
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
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                            : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 hover:border-green-400'
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
        {/* Row 1: Organizational Context */}
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

        {/* Row 2: Personal Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <KPIStatCard 
            title={pillarInfo ? `${pillarInfo.name} Health` : "My Pillar Health"} 
            value={metrics.myPillarScore || "—"} 
            secondaryValue={`${metrics.myPillarCompleted} / ${metrics.myPillarTotal}`} 
            maxValue={12} 
            icon={Building2} 
            gradient="indigo" 
            trend={metrics.myPillarTrend} 
            trendLabel="vs last month" 
            metadata={[
              { label: "Cumulative Avg", value: metrics.myPillarCumulativeAvg || "—" }, 
              { label: "Total MSH", value: metrics.myPillarCumulativeCount }
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

        {/* Team Info Cards */}
        {(pillarInfo || supervisorInfo) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {pillarInfo && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${pillarInfo.color}20` }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: pillarInfo.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">My Pillar</h3>
                    <p className="text-lg font-bold text-gray-900">{pillarInfo.name}</p>
                  </div>
                </div>
              </div>
            )}

            {supervisorInfo && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">My Supervisor</h3>
                    <p className="text-lg font-bold text-gray-900">{supervisorInfo.name}</p>
                    <p className="text-sm text-gray-600">{supervisorInfo.layer}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs and Assessment Grid */}
        <div className="mb-8">
          <HubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
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
        </div>
      </div>
    </div>
  );
}

export default ISOSHubISF;