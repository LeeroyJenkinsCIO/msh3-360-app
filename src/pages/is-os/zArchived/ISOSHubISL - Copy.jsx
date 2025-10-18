// 📁 SAVE TO: src/pages/is-os/ISOSHubISL.js
// ISL Hub with KPI StatCards - Pillar Performance, Leadership, Personal
// UPDATED: KPI calculation now includes both 'completed' and 'not-aligned' statuses

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Zap, Users, TrendingUp, Target, Award, User
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getPillarDisplayName } from '../../utils/pillarHelpers';
import UnifiedAssessmentGrid from '../../components/hubs/UnifiedAssessmentGrid';
import PublishedMSHScoresGrid from '../../components/hubs/PublishedMSHScoresGrid';

function ISOSHubISL() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState('team');
  const [myTeamAssessments, setMyTeamAssessments] = useState([]);
  const [myAssessments, setMyAssessments] = useState([]);
  const [myMSHScores, setMyMSHScores] = useState([]);
  const [pillarInfo, setPillarInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [kpis, setKpis] = useState({
    pillarComposite: null,
    pillarTrend: null,
    isfMemberCount: 0,
    totalPillarAssessments: 0,
    
    leadershipComposite: null,
    leadershipAssessmentCount: 0,
    
    personalComposite: null,
    personalLatestCycle: null,
    personalTotalScores: 0
  });

  useEffect(() => {
    if (user?.uid && user?.userId) {
      fetchHubData();
    }
  }, [user, location.key]);

  const fetchHubData = async () => {
    try {
      setLoading(true);
      
      // Get pillar info
      const pillarsRef = collection(db, 'pillars');
      const pillarsSnapshot = await getDocs(pillarsRef);
      
      let myPillar = null;
      pillarsSnapshot.docs.forEach(doc => {
        const pillarData = doc.data();
        if (pillarData.pillarLeaderId === user.userId) {
          myPillar = { id: doc.id, ...pillarData };
        }
      });
      
      setPillarInfo(myPillar);
      console.log('✅ My Pillar:', myPillar);
      
      // Get all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersByUserId = {};
      const usersByUid = {};
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        usersByUserId[userData.userId] = { uid: doc.id, ...userData };
        usersByUid[doc.id] = { userId: userData.userId, ...userData };
      });
      
      console.log('✅ Users loaded:', Object.keys(usersByUserId).length);
      
      // Get ALL ISF members in my pillar
      const myTeamList = [];
      if (myPillar) {
        Object.values(usersByUserId).forEach(userData => {
          if (userData.layer === 'ISF' && userData.pillar === myPillar.pillarId) {
            myTeamList.push({
              id: userData.userId,
              uid: userData.uid,
              name: userData.displayName || userData.name || 'Unknown',
              email: userData.email || '',
              layer: 'ISF',
              pillar: userData.pillar,
              subPillar: userData.subPillar || '',
              pillarId: myPillar.pillarId,
              isSupervisor: userData.flags?.isSupervisor || false
            });
          }
        });
      }
      
      console.log('✅ All ISF members in pillar:', myTeamList.length);
      
      // Get ALL assessments
      const assessmentsRef = collection(db, 'assessments');
      const assessmentsSnapshot = await getDocs(assessmentsRef);
      
      console.log('✅ Total Assessments loaded:', assessmentsSnapshot.size);
      
      // Process assessments
      const teamAssessmentsList = [];
      const myAssessmentsList = [];
      
      assessmentsSnapshot.docs.forEach(doc => {
        const assessment = {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          completedAt: doc.data().completedAt?.toDate?.() || null,
          hrpReviewedAt: doc.data().hrpReviewedAt?.toDate?.() || null
        };
        
        // For My Team - show ALL assessments where subject is an ISF in my pillar
        const teamMember = myTeamList.find(m => m.uid === assessment.subjectId);
        if (teamMember) {
          const assessorData = usersByUid[assessment.assessorId] || {};
          const assessorName = assessment.assessorName || assessorData.displayName || 'Unknown';
          
          teamAssessmentsList.push({
            ...assessment,
            name: teamMember.name,
            email: teamMember.email,
            layer: teamMember.layer,
            pillar: teamMember.pillar,
            subPillar: teamMember.subPillar,
            isSupervisor: teamMember.isSupervisor,
            assessorName: assessorName,
            isMyAssessment: assessment.assessorId === user.uid
          });
        }
        
        // For My Assessments: assessments where I'm the subject
        if (assessment.subjectId === user.uid) {
          const assessorData = usersByUid[assessment.assessorId] || {};
          myAssessmentsList.push({
            ...assessment,
            assessorName: assessment.assessorName || assessorData.displayName || 'Unknown'
          });
        }
      });
      
      setMyTeamAssessments(teamAssessmentsList);
      setMyAssessments(myAssessmentsList);
      
      console.log('✅ My Team Assessments:', teamAssessmentsList.length);
      console.log('✅ My Assessments:', myAssessmentsList.length);
      
      // Get MSH Scores for Personal KPI
      const mshScoresRef = collection(db, 'mshScores');
      const myScoresQuery = query(
        mshScoresRef,
        where('subjectId', '==', user.uid)
      );
      const mshScoresSnapshot = await getDocs(myScoresQuery);
      
      const myScoresList = mshScoresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate?.() || null
      })).sort((a, b) => {
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return b.publishedAt - a.publishedAt;
      });
      
      setMyMSHScores(myScoresList);
      console.log('✅ My MSH Scores:', myScoresList.length);
      
      // Calculate KPIs
      calculateKPIs(teamAssessmentsList, myAssessmentsList, myScoresList, myTeamList.length);
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching hub data:', error);
      setLoading(false);
    }
  };

  const calculateKPIs = (teamAssessments, myAssessments, mshScores, teamSize) => {
    // KPI 1: Pillar Performance
    // Both 'completed' and 'not-aligned' are terminal states - assessments are done
    const completedTeamAssessments = teamAssessments.filter(a => 
      (a.status === 'completed' || a.status === 'not-aligned') && 
      a.composite !== null && 
      a.composite !== undefined
    );
    
    const pillarComposite = completedTeamAssessments.length > 0
      ? (completedTeamAssessments.reduce((sum, a) => sum + a.composite, 0) / completedTeamAssessments.length).toFixed(1)
      : null;
    
    // KPI 2: Leadership Composite (placeholder - need manager assessments of ISL)
    const leadershipAssessments = myAssessments.filter(a => 
      a.assessmentType === 'manager-down' && a.status === 'completed'
    );
    
    const leadershipComposite = leadershipAssessments.length > 0
      ? (leadershipAssessments.reduce((sum, a) => sum + (a.composite || 0), 0) / leadershipAssessments.length).toFixed(1)
      : null;
    
    // KPI 3: Personal Performance (from MSH scores)
    const latestScore = mshScores[0];
    const personalComposite = latestScore?.composite || null;
    const personalLatestCycle = latestScore 
      ? `${latestScore.cycleMonth}/${latestScore.cycleYear}`
      : null;
    
    setKpis({
      pillarComposite,
      pillarTrend: null, // Calculate trend later
      isfMemberCount: teamSize,
      totalPillarAssessments: completedTeamAssessments.length,
      
      leadershipComposite,
      leadershipAssessmentCount: leadershipAssessments.length,
      
      personalComposite,
      personalLatestCycle,
      personalTotalScores: mshScores.length
    });
  };

  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  const handleStartAssessment = (assessment) => {
    console.log('🚀 Starting assessment:', assessment);
    
    if (!assessment || !assessment.id) {
      console.error('❌ Invalid assessment');
      return;
    }
    
    if (!assessment.isMyAssessment && activeTab === 'team') {
      if (assessment.id && (assessment.status === 'completed' || assessment.status === 'not-aligned')) {
        handleViewAssessment(assessment.id);
      }
      return;
    }
    
    const assessmentType = assessment.assessmentType || 'one-on-one';
    const cycleType = assessment.cycleType || '1x1';
    
    if (assessmentType === 'self') {
      navigate(`/is-os/assessments/self/edit/${assessment.id}`);
    } else if (assessmentType === 'one-on-one' || cycleType === '1x1') {
      navigate(`/is-os/assessments/1x1/edit/${assessment.id}`);
    } else if (cycleType === '360') {
      navigate(`/is-os/assessments/360/edit/${assessment.id}`);
    } else {
      navigate(`/is-os/assessments/1x1/edit/${assessment.id}`);
    }
  };

  const handleViewScore = (mshId) => {
    navigate(`/is-os/scores/${mshId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ISL Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-10 h-10" />
            <div>
              <h1 className="text-5xl font-bold">IS OS Hub</h1>
              <p className="text-blue-100 text-lg">
                ISL View - {pillarInfo ? getPillarDisplayName(pillarInfo.pillarId) : 'My Pillar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* KPI StatCards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Card 1: Pillar Performance KPI */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Pillar Performance</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">
                    {kpis.pillarComposite || '—'}
                  </span>
                  <span className="text-sm text-gray-500 mb-2">/ 12</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            
            <div className="mt-4 pt-3 border-t border-blue-200">
              <div className="text-sm font-semibold text-gray-900">
                {kpis.isfMemberCount} ISF Members
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {kpis.totalPillarAssessments} completed assessments
              </div>
            </div>
          </Card>

          {/* Card 2: Leadership KPI */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-1">ISL Leadership</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">
                    {kpis.leadershipComposite || '—'}
                  </span>
                  <span className="text-sm text-gray-500 mb-2">/ 12</span>
                </div>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            
            <div className="mt-4 pt-3 border-t border-purple-200">
              <div className="text-sm font-semibold text-gray-900">
                Leadership Performance
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {kpis.leadershipAssessmentCount} assessments
              </div>
            </div>
          </Card>

          {/* Card 3: Personal Performance KPI */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Personal Performance</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">
                    {kpis.personalComposite || '—'}
                  </span>
                  <span className="text-sm text-gray-500 mb-2">/ 12</span>
                </div>
              </div>
              <User className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="mt-4 pt-3 border-t border-green-200">
              <div className="text-sm font-semibold text-gray-900">
                {kpis.personalLatestCycle || 'No scores yet'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {kpis.personalTotalScores} total MSH scores
              </div>
            </div>
          </Card>

        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('team')}
                className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'team'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Team ({myTeamAssessments.length})
              </button>
              <button
                onClick={() => setActiveTab('myassessments')}
                className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'myassessments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Assessments ({myAssessments.length})
              </button>
              <button
                onClick={() => setActiveTab('scores')}
                className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'scores'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Published MSH Scores ({myMSHScores.length})
              </button>
            </nav>
          </div>

          {activeTab === 'team' && (
            <UnifiedAssessmentGrid
              assessments={myTeamAssessments}
              onStartAssessment={handleStartAssessment}
              onViewAssessment={handleViewAssessment}
              showStartButton={true}
              emptyStateMessage="No assessments found for your pillar members"
              isMyAssessmentsTab={false}
              currentUserId={user.uid}
            />
          )}

          {activeTab === 'myassessments' && (
            <UnifiedAssessmentGrid
              assessments={myAssessments}
              onStartAssessment={handleStartAssessment}
              onViewAssessment={handleViewAssessment}
              showStartButton={true}
              emptyStateMessage="No assessments found where you are the subject"
              isMyAssessmentsTab={true}
              currentUserId={user.uid}
            />
          )}

          {activeTab === 'scores' && (
            <PublishedMSHScoresGrid
              mshScores={myMSHScores}
              onViewScore={handleViewScore}
              emptyStateMessage="No published MSH scores found"
            />
          )}
        </div>

      </div>
    </div>
  );
}

export default ISOSHubISL;