// 📁 SAVE TO: src/pages/is-os/ISOSHubISL.jsx
// ISL Hub - Complete with 4 KPI Cards, Trends, and Assessment Grids
// Updated: Cycle-based rolling averages, month-over-month trends

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Compass, Award, Building2, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HubHeroBanner from '../../components/hubs/HubHeroBanner';
import KPIStatCard from '../../components/hubs/KPIStatCard';
import HubTabs from '../../components/hubs/HubTabs';
import HubMetricsBar from '../../components/hubs/HubMetricsBar';
import UnifiedAssessmentGrid from '../../components/hubs/UnifiedAssessmentGrid';
import PublishedMSHScoresGrid from '../../components/hubs/PublishedMSHScoresGrid';

function ISOSHubISL() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const CYCLE_START_DATE = new Date(2025, 9, 1); // Oct 1, 2025
  
  const [activeTab, setActiveTab] = useState('team');
  const [myTeamAssessments, setMyTeamAssessments] = useState([]);
  const [myAssessments, setMyAssessments] = useState([]);
  const [myMSHScores, setMyMSHScores] = useState([]);
  const [pillarInfo, setPillarInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    // Cycle info
    cycleNumber: 1,
    cycleType: '1x1',
    currentMonth: 'OCTOBER 2025',
    
    // ISOS Compass (org-wide)
    isosCompass: null,
    isosCompassTrend: null,
    isosCompassRolling: null,
    
    // ISL Leadership (ISL layer)
    islLeadership: null,
    islLeadershipTrend: null,
    islLeadershipRolling: null,
    
    // Pillar Health (my ISF team)
    pillarHealth: null,
    pillarHealthTrend: null,
    pillarHealthRolling: null,
    
    // My Compass (personal)
    myCompass: null,
    myCompassTrend: null,
    myCompassRolling: null,
    myLatestCycle: null,
    
    // Progress tracking
    completedCount: 0,
    totalCount: 0
  });

  // Helper: Calculate average
  const calcAvg = (scores) => {
    if (!scores || scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return (sum / scores.length).toFixed(1);
  };

  // Helper: Get current cycle info
  const getCycleInfo = (date = new Date()) => {
    const monthsSinceStart = (date.getFullYear() - CYCLE_START_DATE.getFullYear()) * 12 + 
                             (date.getMonth() - CYCLE_START_DATE.getMonth());
    
    const cycleNumber = Math.floor(monthsSinceStart / 3) + 1;
    const cycleMonth = (monthsSinceStart % 3) + 1;
    const cycleType = cycleMonth === 3 ? '360' : '1x1';
    
    const currentMonth = date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    }).toUpperCase();
    
    return { cycleNumber, cycleMonth, cycleType, currentMonth };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const cycleInfo = getCycleInfo(now);
        
        // Calculate previous month
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Fetch pillar info
        const pillarsSnapshot = await getDocs(collection(db, 'pillars'));
        const userPillar = pillarsSnapshot.docs.find(doc => 
          doc.data().pillarLeaderId === user.uid
        );

        if (!userPillar) {
          setLoading(false);
          return;
        }

        const pillarData = userPillar.data();
        setPillarInfo({
          id: userPillar.id,
          name: pillarData.pillarName,
          color: pillarData.color
        });

        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userMap = {};
        const islUsers = [];
        const isfUsers = [];
        const pillarISFUsers = [];
        
        usersSnapshot.docs.forEach(doc => {
          const userData = { id: doc.id, ...doc.data() };
          userMap[userData.userId] = userData;
          
          if (userData.layer === 'ISL') {
            islUsers.push(userData);
          } else if (userData.layer === 'ISF') {
            isfUsers.push(userData);
            if (userData.pillar === userPillar.id) {
              pillarISFUsers.push(userData);
            }
          }
        });

        // Fetch MSH scores (for rolling averages)
        const mshSnapshot = await getDocs(query(
          collection(db, 'mshScores'),
          where('publishedAt', '>=', Timestamp.fromDate(CYCLE_START_DATE))
        ));

        const allMSH = mshSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          publishedAt: doc.data().publishedAt?.toDate()
        }));

        // Group MSH scores
        const orgMSH = allMSH;
        const islMSH = allMSH.filter(m => islUsers.some(u => u.userId === m.subjectId));
        const pillarMSH = allMSH.filter(m => pillarISFUsers.some(u => u.userId === m.subjectId));
        const myMSH = allMSH.filter(m => m.subjectId === user.uid);

        // Current month scores
        const currentMonthOrg = orgMSH
          .filter(m => m.cycleMonth === currentMonth && m.cycleYear === currentYear)
          .map(m => m.composite);
        
        const currentMonthISL = islMSH
          .filter(m => m.cycleMonth === currentMonth && m.cycleYear === currentYear)
          .map(m => m.composite);
        
        const currentMonthPillar = pillarMSH
          .filter(m => m.cycleMonth === currentMonth && m.cycleYear === currentYear)
          .map(m => m.composite);
        
        const currentMonthMy = myMSH
          .filter(m => m.cycleMonth === currentMonth && m.cycleYear === currentYear)
          .map(m => m.composite);

        // Previous month scores
        const prevMonthOrg = orgMSH
          .filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear)
          .map(m => m.composite);
        
        const prevMonthISL = islMSH
          .filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear)
          .map(m => m.composite);
        
        const prevMonthPillar = pillarMSH
          .filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear)
          .map(m => m.composite);
        
        const prevMonthMy = myMSH
          .filter(m => m.cycleMonth === prevMonth && m.cycleYear === prevYear)
          .map(m => m.composite);

        // Rolling (YTD) scores
        const rollingOrg = orgMSH.map(m => m.composite);
        const rollingISL = islMSH.map(m => m.composite);
        const rollingPillar = pillarMSH.map(m => m.composite);
        const rollingMy = myMSH.map(m => m.composite);

        // Calculate metrics with "---" fallback for trends
        const isosCompass = calcAvg(currentMonthOrg);
        const prevIsosCompass = calcAvg(prevMonthOrg);
        const isosCompassTrend = (isosCompass && prevIsosCompass)
          ? parseFloat((parseFloat(isosCompass) - parseFloat(prevIsosCompass)).toFixed(1))
          : "---";
        const isosCompassRolling = calcAvg(rollingOrg);

        const islLeadership = calcAvg(currentMonthISL);
        const prevIslLeadership = calcAvg(prevMonthISL);
        const islLeadershipTrend = (islLeadership && prevIslLeadership)
          ? parseFloat((parseFloat(islLeadership) - parseFloat(prevIslLeadership)).toFixed(1))
          : "---";
        const islLeadershipRolling = calcAvg(rollingISL);

        const pillarHealth = calcAvg(currentMonthPillar);
        const prevPillarHealth = calcAvg(prevMonthPillar);
        const pillarHealthTrend = (pillarHealth && prevPillarHealth)
          ? parseFloat((parseFloat(pillarHealth) - parseFloat(prevPillarHealth)).toFixed(1))
          : "---";
        const pillarHealthRolling = calcAvg(rollingPillar);

        // My Compass - use latest score if no current month
        const latestScore = myMSH.length > 0 
          ? myMSH.sort((a, b) => b.publishedAt - a.publishedAt)[0]
          : null;
        
        const myCompass = currentMonthMy.length > 0
          ? calcAvg(currentMonthMy)
          : latestScore?.composite?.toString() || null;
        const prevMyComposite = calcAvg(prevMonthMy);
        const myCompassTrend = (myCompass && prevMyComposite)
          ? parseFloat((parseFloat(myCompass) - parseFloat(prevMyComposite)).toFixed(1))
          : "---";
        const myCompassRolling = calcAvg(rollingMy);

        // Log calculated trends
        console.log('📈 Calculated Trends:');
        console.log(`ISOS Compass: ${isosCompass} (trend: ${isosCompassTrend})`);
        console.log(`ISL Leadership: ${islLeadership} (trend: ${islLeadershipTrend})`);
        console.log(`Pillar Health: ${pillarHealth} (trend: ${pillarHealthTrend})`);
        console.log(`My Compass: ${myCompass} (trend: ${myCompassTrend})`);
        
        const myLatestCycle = latestScore 
          ? `${latestScore.cycleMonth}/${latestScore.cycleYear}`
          : null;

        // Fetch current month assessments for grid
        const assessmentsSnapshot = await getDocs(query(
          collection(db, 'assessments'),
          where('cycleMonth', '==', currentMonth),
          where('cycleYear', '==', currentYear)
        ));

        const allAssessments = assessmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          completedAt: doc.data().completedAt?.toDate()
        }));

        // My Team: assessments where I'm the assessor
        const teamAssessments = allAssessments
          .filter(a => a.assessorId === user.uid)
          .map(a => {
            const subject = userMap[a.subjectId];
            return {
              ...a,
              name: subject?.displayName || 'Unknown',
              email: subject?.email || '',
              layer: subject?.layer || 'ISF',
              pillar: subject?.pillar,
              subPillar: subject?.subPillar,
              isMyAssessment: true
            };
          });

        // My Assessments: assessments where I'm the subject
        const personalAssessments = allAssessments
          .filter(a => a.subjectId === user.uid)
          .map(a => {
            const assessor = userMap[a.assessorId];
            return {
              ...a,
              assessorName: assessor?.displayName || 'Unknown',
              assessmentType: a.isSelfAssessment ? 'self' : 'manager-down'
            };
          });

        setMyTeamAssessments(teamAssessments);
        setMyAssessments(personalAssessments);
        setMyMSHScores(myMSH);

        // Count completed MSH scores
        const completedCount = currentMonthOrg.length;
        const totalCount = 24; // Expected per month (adjust based on org size)

        setMetrics({
          cycleNumber: cycleInfo.cycleNumber,
          cycleType: cycleInfo.cycleType,
          currentMonth: cycleInfo.currentMonth,
          
          isosCompass,
          isosCompassTrend,
          isosCompassRolling,
          
          islLeadership,
          islLeadershipTrend,
          islLeadershipRolling,
          
          pillarHealth,
          pillarHealthTrend,
          pillarHealthRolling,
          
          myCompass,
          myCompassTrend,
          myCompassRolling,
          myLatestCycle,
          
          completedCount,
          totalCount
        });

      } catch (error) {
        console.error('Error fetching ISL hub data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.uid, location.key]);

  const handleStartAssessment = (assessment) => {
    navigate(`/is-os/assessments/${metrics.cycleType}/edit/${assessment.id}`);
  };

  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  const handleViewScore = (mshId) => {
    navigate(`/is-os/msh/${mshId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pillar data...</p>
        </div>
      </div>
    );
  }

  if (!pillarInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Pillar Assigned</h2>
          <p className="text-gray-600">
            You don't appear to be assigned as a pillar leader. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <HubHeroBanner
        gradient="indigo"
        title="ISOS Hub"
        subtitle={`ISL View - ${pillarInfo.name} Leadership`}
        icon={Building2}
      />

      {/* Metrics Bar */}
      <HubMetricsBar
        cycleNumber={metrics.cycleNumber}
        cycleType={metrics.cycleType}
        currentMonth={metrics.currentMonth}
        completedCount={metrics.completedCount}
        totalCount={metrics.totalCount}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* 4 KPI Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          {/* ISOS Compass */}
          <KPIStatCard
            title="ISOS Compass"
            value={metrics.isosCompass || "—"}
            maxValue={12}
            icon={Compass}
            gradient="blue"
            trend={metrics.isosCompassTrend}
            trendLabel="vs last month"
            metadata={[
              { label: "YTD Avg", value: metrics.isosCompassRolling || "—" },
              { label: "Org-Wide", value: "All Layers" }
            ]}
          />

          {/* ISL Leadership */}
          <KPIStatCard
            title="ISL Leadership"
            value={metrics.islLeadership || "—"}
            maxValue={12}
            icon={Award}
            gradient="purple"
            trend={metrics.islLeadershipTrend}
            trendLabel="vs last month"
            metadata={[
              { label: "YTD Avg", value: metrics.islLeadershipRolling || "—" },
              { label: "Layer", value: "ISL Health" }
            ]}
          />

          {/* Pillar Health */}
          <KPIStatCard
            title={`${pillarInfo.name} Health`}
            value={metrics.pillarHealth || "—"}
            maxValue={12}
            icon={Building2}
            gradient="green"
            trend={metrics.pillarHealthTrend}
            trendLabel="vs last month"
            metadata={[
              { label: "YTD Avg", value: metrics.pillarHealthRolling || "—" },
              { label: "Pillar", value: pillarInfo.name }
            ]}
          />

          {/* My Compass */}
          <KPIStatCard
            title="My Compass"
            value={metrics.myCompass || "—"}
            maxValue={12}
            icon={User}
            gradient="orange"
            trend={metrics.myCompassTrend}
            trendLabel="vs last month"
            metadata={[
              { label: "YTD Avg", value: metrics.myCompassRolling || "—" },
              { label: "Latest", value: metrics.myLatestCycle || "N/A" }
            ]}
          />

        </div>

        {/* Assessment Grids with Tabs */}
        <div className="mb-8">
          <HubTabs
            tabs={[
              { id: 'team', label: 'My Team', count: myTeamAssessments.length },
              { id: 'myassessments', label: 'My Assessments', count: myAssessments.length },
              { id: 'msh', label: 'My MSH History', count: myMSHScores.length }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {activeTab === 'team' && (
            <UnifiedAssessmentGrid
              assessments={myTeamAssessments}
              onStartAssessment={handleStartAssessment}
              onViewAssessment={handleViewAssessment}
              emptyStateMessage="No team assessments for current cycle"
              isMyAssessmentsTab={false}
              currentUserId={user.uid}
            />
          )}

          {activeTab === 'myassessments' && (
            <UnifiedAssessmentGrid
              assessments={myAssessments}
              onStartAssessment={handleStartAssessment}
              onViewAssessment={handleViewAssessment}
              emptyStateMessage="No assessments assigned to you"
              isMyAssessmentsTab={true}
              currentUserId={user.uid}
            />
          )}

          {activeTab === 'msh' && (
            <PublishedMSHScoresGrid
              mshScores={myMSHScores}
              onViewScore={handleViewScore}
              emptyStateMessage="No published MSH scores yet"
            />
          )}
        </div>

      </div>
    </div>
  );
}

export default ISOSHubISL;