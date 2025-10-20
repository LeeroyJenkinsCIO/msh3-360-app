// 📁 SAVE TO: src/pages/is-os/ISOSHubISE.jsx
// ISE Hub - Executive View (CEO/President)
// Based on ISL Hub structure, adapted for executive oversight

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
          else if (userData.layer === 'ISF') isfUsers.push(userData);
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

        const giveAssessments = allCycleAssessments
          .filter(a => (a.giver?.uid || a.assessorId) === user.uid)
          .map(a => {
            const receiverUid = a.receiver?.uid || a.subjectId;
            const receiverData = userMap[a.receiver?.userId || a.subjectId] || Object.values(userMap).find(u => u.uid === receiverUid);
            return {
              ...a,
              subjectUid: receiverUid,
              subjectName: a.receiver?.displayName || a.subjectName || receiverData?.displayName || 'Unknown',
              subjectEmail: receiverData?.email || '',
              subjectLayer: a.receiver?.layer || receiverData?.layer || 'ISL',
              subjectPillar: receiverData?.pillar,
              subjectSubPillar: receiverData?.subPillar,
              isSelfAssessment: (a.giver?.uid || a.assessorId) === (a.receiver?.uid || a.subjectId),
              myRole: 'giver'
            };
          });

        const receiveAssessments = allCycleAssessments
          .filter(a => (a.receiver?.uid || a.subjectId) === user.uid)
          .map(a => {
            const giverUid = a.giver?.uid || a.assessorId;
            const giverData = userMap[a.giver?.userId || a.assessorId] || Object.values(userMap).find(u => u.uid === giverUid);
            return {
              ...a,
              assessorUid: giverUid,
              assessorName: a.giver?.displayName || a.assessorName || giverData?.displayName || 'Unknown',
              assessorLayer: a.giver?.layer || giverData?.layer || 'Unknown',
              isSelfAssessment: (a.giver?.uid || a.assessorId) === (a.receiver?.uid || a.subjectId),
              myRole: 'receiver'
            };
          });

        setAssessmentsIGive(giveAssessments);
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
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.uid, location.key]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <HubHeroBanner gradient="purple" title="ISOS Hub" subtitle="ISE Executive View - Organization Leadership" icon={Award} />
      <HubMetricsBar cycleNumber={metrics.cycleNumber} cycleType={metrics.cycleType} currentMonth={metrics.currentMonth} completedCount={metrics.completedCount} totalCount={metrics.totalCount} />
      
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
          <KPIStatCard title="ISGS Compass" value={metrics.isgsCompassScore || "—"} secondaryValue={`${metrics.isgsCompassCompleted} / ${metrics.isgsCompassTotal}`} maxValue={12} icon={Compass} gradient="blue" trend={metrics.isgsCompassTrend} trendLabel="vs last month" metadata={[{ label: "YTD Avg", value: metrics.isgsCompassYTDAvg || "—" }, { label: "Total MSH", value: metrics.isgsCompassYTDCount }]} />
          <KPIStatCard title="ISL Leadership" value={metrics.islScore || "—"} secondaryValue={`${metrics.islCompleted} / ${metrics.islTotal}`} maxValue={12} icon={Award} gradient="purple" trend={metrics.islTrend} trendLabel="vs last month" metadata={[{ label: "YTD Avg", value: metrics.islYTDAvg || "—" }, { label: "Total MSH", value: metrics.islYTDCount }]} />
          <KPIStatCard title="All Pillars Aggregate" value={metrics.allPillarsScore || "—"} secondaryValue={`${metrics.allPillarsCompleted} / ${metrics.allPillarsTotal}`} maxValue={12} icon={TrendingUp} gradient="emerald" trend={metrics.allPillarsTrend} trendLabel="vs last month" metadata={[{ label: "YTD Avg", value: metrics.allPillarsYTDAvg || "—" }, { label: "Total MSH", value: metrics.allPillarsYTDCount }]} />
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-purple-600" />Individual Pillar Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {metrics.pillarBreakdown.length > 0 ? metrics.pillarBreakdown.map(p => (
              <KPIStatCard key={p.id} title={p.name} value={p.score || "—"} secondaryValue={`${p.completed} / ${p.total}`} maxValue={12} icon={Building2} gradient="indigo" trend={p.trend} trendLabel="vs last month" metadata={[{ label: "YTD Avg", value: p.ytdAvg || "—" }, { label: "Total MSH", value: p.ytdCount }]} />
            )) : Array(5).fill(0).map((_, i) => (
              <KPIStatCard key={i} title={`Pillar ${i + 1}`} value="—" secondaryValue="0 / 0" maxValue={12} icon={Building2} gradient="indigo" trend={null} metadata={[{ label: "YTD Avg", value: "—" }, { label: "Total MSH", value: "0" }]} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <KPIStatCard title="Org-Wide Completion" value={metrics.orgScore ? `${metrics.orgScore}%` : "—"} secondaryValue={`${metrics.orgCompleted} / ${metrics.orgTotal}`} maxValue={null} icon={BarChart3} gradient="cyan" trend={metrics.orgTrend} trendLabel="% vs last month" metadata={[{ label: "YTD Avg", value: `${metrics.orgYTDAvg}%` }, { label: "Total MSH", value: metrics.orgYTDCount }]} />
          <KPIStatCard title="My Compass" value={metrics.myScore || "—"} secondaryValue={`${metrics.myCompleted} / ${metrics.myTotal}`} maxValue={12} icon={User} gradient="orange" trend={metrics.myTrend} trendLabel="vs last month" metadata={[{ label: "YTD Avg", value: metrics.myYTDAvg || "—" }, { label: "Total MSH", value: metrics.myYTDCount }]} />
        </div>

        <div className="mb-8">
          <HubTabs tabs={[{ id: 'give', label: 'Give', count: assessmentsIGive.length, subtitle: 'Assessments I complete' }, { id: 'receive', label: 'Receive', count: assessmentsIReceive.length + mshScoresIReceive.length, subtitle: 'Assessments about me + My MSH scores' }]} activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'give' && <UnifiedAssessmentGrid assessments={assessmentsIGive} onStartAssessment={(a) => navigate(`/is-os/assessments/${metrics.cycleType}/edit/${a.id}`)} onViewAssessment={(id) => navigate(`/is-os/assessments/view/${id}`)} viewMode="give" currentUserId={user.uid} emptyStateMessage="No assessments to complete this cycle" />}
          {activeTab === 'receive' && (
            <div className="space-y-8">
              {assessmentsIReceive.length > 0 && <div><h3 className="text-lg font-semibold text-gray-900 mb-4">Assessments About Me</h3><UnifiedAssessmentGrid assessments={assessmentsIReceive} onStartAssessment={(a) => navigate(`/is-os/assessments/${metrics.cycleType}/edit/${a.id}`)} onViewAssessment={(id) => navigate(`/is-os/assessments/view/${id}`)} viewMode="receive" currentUserId={user.uid} /></div>}
              <div><h3 className="text-lg font-semibold text-gray-900 mb-4">My Published MSH Scores</h3><PublishedMSHScoresGrid mshScores={mshScoresIReceive} onViewScore={(id) => navigate(`/is-os/msh/${id}`)} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ISOSHubISE;