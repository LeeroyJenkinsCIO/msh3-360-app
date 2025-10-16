// 📍 SAVE TO: src/pages/is-os/ISOSHubISFSupervisor.jsx
// ISF Supervisor Hub - Team supervisor view with direct reports

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Zap, ArrowRight, 
  TrendingUp, Award, User, Users, Target, CheckCircle, AlertTriangle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import AssessmentCycleGrid from '../../components/hubs/AssessmentCycleGrid';

function ISOSHubISFSupervisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ==================== CONSTANTS ====================
  const CYCLE_START_DATE = new Date(2025, 9, 1);
  
  // ==================== STATE ====================
  const [gridMembers, setGridMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    cycleNumber: 1,
    cycleInYear: 1,
    cycleMonth: 1,
    assessmentType: '1x1',
    currentMonthName: 'October 2025',
    deadline: null,
    isPastDeadline: false,
    totalAssessmentsNeeded: 0,
    completedAssessments: 0,
    myLastAssessment: null,
    myComposite: null,
    myLastAssessed: null,
    teamAvgComposite: 0,
    teamTier: 'Low',
    teamTrend: 'stable',
    teamSize: 0,
    teamZones: { below: 0, baseline: 0, above: 0, exceptional: 0 },
    assessedThisMonth: 0,
    alignmentRate: 0
  });

  // ==================== HELPER FUNCTIONS ====================
  const calculateDeadline = (monthStart) => {
    let businessDays = 0;
    let currentDate = new Date(monthStart);
    
    while (businessDays < 5) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    
    return currentDate;
  };

  const getCurrentCycleInfo = (date = new Date()) => {
    const monthsSinceStart = (date.getFullYear() - CYCLE_START_DATE.getFullYear()) * 12 + 
                             (date.getMonth() - CYCLE_START_DATE.getMonth());
    
    const cycleNumber = Math.floor(monthsSinceStart / 3) + 1;
    const cycleMonth = (monthsSinceStart % 3) + 1;
    const assessmentType = cycleMonth === 3 ? '360' : '1x1';
    const cycleInYear = ((cycleNumber - 1) % 4) + 1;
    
    const currentMonthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const deadline = calculateDeadline(monthStart);
    const isPastDeadline = date > deadline;
    
    return {
      cycleNumber,
      cycleInYear,
      cycleMonth,
      assessmentType,
      currentMonthName,
      deadline,
      isPastDeadline
    };
  };

  const getCompositeZone = (score) => {
    if (score >= 0 && score <= 4) return 'below';
    if (score >= 5 && score <= 6) return 'baseline';
    if (score >= 7 && score <= 10) return 'above';
    if (score >= 11 && score <= 12) return 'exceptional';
    return 'baseline';
  };

  const calculateZoneDistribution = (scores) => {
    const zones = { below: 0, baseline: 0, above: 0, exceptional: 0 };
    scores.forEach(score => {
      const zone = getCompositeZone(score);
      zones[zone]++;
    });
    return zones;
  };

  const getPercentage = (count, total) => {
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  const getCompositeZoneName = (score) => {
    if (score >= 11 && score <= 12) return 'Exceptional';
    if (score >= 7 && score <= 10) return 'Above Baseline';
    if (score >= 5 && score <= 6) return 'Baseline';
    if (score >= 0 && score <= 4) return 'Below Baseline';
    return 'Not Assessed';
  };

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    const fetchSupervisorData = async () => {
      try {
        setLoading(true);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const cycleInfo = getCurrentCycleInfo(now);
        
        // Fetch all data in parallel
        const [allUsersSnapshot, allAssessmentsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(
            collection(db, 'assessments'),
            where('cycleMonth', '==', currentMonth + 1),
            where('cycleYear', '==', currentYear)
          ))
        ]);
        
        // Build user maps
        const allUsersMap = {};
        const userIdToAuthUid = {};
        
        allUsersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          allUsersMap[userData.userId] = userData.displayName || 'Unknown';
          if (userData.userId && doc.id) {
            userIdToAuthUid[userData.userId] = doc.id;
          }
        });
        
        // Group assessments by subject
        const assessmentsBySubject = {};
        allAssessmentsSnapshot.docs.forEach(doc => {
          const assessmentData = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
            completedAt: doc.data().completedAt?.toDate?.() || null
          };
          
          const subjectId = assessmentData.subjectId;
          if (!assessmentsBySubject[subjectId]) {
            assessmentsBySubject[subjectId] = [];
          }
          assessmentsBySubject[subjectId].push(assessmentData);
        });
        
        // Get direct reports (ISF members managed by this supervisor)
        const usersRef = collection(db, 'users');
        const directReportsQuery = query(
          usersRef,
          where('managerId', '==', user.userId)
        );
        const membersSnapshot = await getDocs(directReportsQuery);
        
        const allMembers = [];
        
        for (const doc of membersSnapshot.docs) {
          const memberData = doc.data();
          
          // Get member's Firebase auth UID
          const memberAuthUid = userIdToAuthUid[memberData.userId];
          if (!memberAuthUid) continue;
          
          // Get assessments for this member
          const memberAssessments = assessmentsBySubject[memberAuthUid] || [];
          
          let latestAssessment = null;
          
          if (memberAssessments.length > 0) {
            const sortedAssessments = memberAssessments.sort((a, b) => {
              const aTime = a.createdAt || new Date(0);
              const bTime = b.createdAt || new Date(0);
              return bTime - aTime;
            });
            
            // Look for pending assessment first
            const pendingAssessment = sortedAssessments.find(a => a.status === 'pending');
            
            if (pendingAssessment) {
              latestAssessment = pendingAssessment;
            } else {
              // Look for completed assessments by this supervisor
              const completedAssessments = sortedAssessments
                .filter(a => {
                  return a.completedAt && 
                         a.assessorId === user.uid && 
                         (a.status === 'completed' || a.status === 'not-aligned');
                })
                .sort((a, b) => b.completedAt - a.completedAt);
              
              if (completedAssessments.length > 0) {
                latestAssessment = completedAssessments[0];
              }
            }
          }

          const memberInfo = {
            id: memberData.userId,
            name: memberData.displayName || 'Unknown',
            email: memberData.email || '',
            layer: memberData.layer || 'ISF',
            pillarRole: memberData.pillarRole || 'Team Member',
            subPillar: memberData.subPillar || 'Unassigned',
            pillarId: memberData.pillar || null,
            managerId: memberData.managerId,
            assessorName: user.displayName,
            isSupervisor: memberData.flags?.isSupervisor || false,
            isDirectReport: true,
            currentAssessment: latestAssessment,
            teamSize: 0
          };
          
          allMembers.push(memberInfo);
        }
        
        setGridMembers(allMembers);
        
        // Get supervisor's own assessment (from their manager/ISL)
        let myLastAssessment = null;
        let myComposite = null;
        let myLastAssessed = null;
        
        const myAssessments = assessmentsBySubject[user.uid] || [];
        const sortedMyAssessments = myAssessments
          .filter(a => a.composite && (a.status === 'completed' || a.status === 'not-aligned'))
          .sort((a, b) => {
            const aTime = a.createdAt || new Date(0);
            const bTime = b.createdAt || new Date(0);
            return bTime - aTime;
          });
        
        if (sortedMyAssessments.length > 0) {
          const latest = sortedMyAssessments[0];
          myLastAssessment = latest;
          myComposite = latest.composite;
          if (latest.completedAt) {
            myLastAssessed = `${latest.completedAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
          }
        }

        // Calculate team metrics
        const publishedAssessments = allMembers.filter(m => 
          m.currentAssessment?.composite !== undefined && 
          (m.currentAssessment.status === 'completed' || m.currentAssessment.status === 'not-aligned')
        );
        
        const teamScores = publishedAssessments.map(m => m.currentAssessment.composite);
        const teamAvgComposite = teamScores.length > 0
          ? (teamScores.reduce((sum, score) => sum + score, 0) / teamScores.length)
          : 0;

        const teamZones = calculateZoneDistribution(teamScores);

        let teamTier = 'Low';
        if (teamAvgComposite >= 9) teamTier = 'High';
        else if (teamAvgComposite >= 5) teamTier = 'Mid';

        const assessedThisMonth = allMembers.filter(m => {
          if (!m.currentAssessment?.completedAt) return false;
          const assessmentDate = m.currentAssessment.completedAt;
          return assessmentDate.getMonth() === currentMonth && 
                 assessmentDate.getFullYear() === currentYear &&
                 (m.currentAssessment.status === 'completed' || m.currentAssessment.status === 'not-aligned');
        }).length;

        const alignedMembers = publishedAssessments.filter(m => 
          m.currentAssessment.alignmentStatus === 'aligned'
        ).length;
        const alignmentRate = publishedAssessments.length > 0
          ? Math.round((alignedMembers / publishedAssessments.length) * 100)
          : 0;

        const totalAssessmentsNeeded = allMembers.length;
        const completedAssessments = assessedThisMonth;

        setMetrics({
          cycleNumber: cycleInfo.cycleNumber,
          cycleInYear: cycleInfo.cycleInYear,
          cycleMonth: cycleInfo.cycleMonth,
          assessmentType: cycleInfo.assessmentType,
          currentMonthName: cycleInfo.currentMonthName,
          deadline: cycleInfo.deadline,
          isPastDeadline: cycleInfo.isPastDeadline,
          totalAssessmentsNeeded,
          completedAssessments,
          myLastAssessment,
          myComposite,
          myLastAssessed,
          teamAvgComposite: teamAvgComposite.toFixed(1),
          teamTier,
          teamTrend: 'stable',
          teamSize: allMembers.length,
          teamZones,
          assessedThisMonth,
          alignmentRate
        });

      } catch (error) {
        console.error('Error fetching supervisor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorData();
  }, [user.userId]);

  // ==================== EVENT HANDLERS ====================
  const handleStartAssessments = () => {
    const firstPending = gridMembers.find(m => 
      m.currentAssessment?.status === 'pending' || !m.currentAssessment
    );
    
    if (firstPending) {
      if (firstPending.currentAssessment?.id) {
        navigate(`/is-os/assessments/${metrics.assessmentType}/edit/${firstPending.currentAssessment.id}`);
      } else {
        navigate(`/is-os/assessments/${metrics.assessmentType}/edit`);
      }
    } else {
      navigate(`/is-os/assessments/${metrics.assessmentType}/edit`);
    }
  };

  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ==================== HERO BANNER ==================== */}
      <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-10 h-10" />
            <div>
              <h1 className="text-5xl font-bold">IS OS Hub</h1>
              <p className="text-orange-100 text-lg">
                Supervisor View - Team Leadership & Development
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <div className="text-orange-200 text-sm mb-1">Assessment Cycle</div>
                <div className="text-white text-lg font-semibold">
                  Cycle {metrics.cycleInYear} of 4
                </div>
                <div className="text-orange-200 text-sm mt-1">
                  Type: {metrics.assessmentType}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-orange-200 text-sm mb-1">Current Open Month</div>
                <div className="text-white text-3xl font-bold flex items-center justify-center gap-2">
                  <Calendar className="w-8 h-8" />
                  {metrics.currentMonthName}
                </div>
                <div className="text-orange-200 text-sm mt-3">
                  {metrics.completedAssessments}/{metrics.totalAssessmentsNeeded} assessments completed
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-orange-200 text-sm mb-1">Assessment Progress</div>
                <div className="text-white text-lg font-semibold">
                  {metrics.completedAssessments}/{metrics.totalAssessmentsNeeded} completed ({getPercentage(metrics.completedAssessments, metrics.totalAssessmentsNeeded)})
                </div>
                <div className={`text-sm mt-2 flex items-center justify-end gap-1 ${metrics.isPastDeadline ? 'text-yellow-300' : 'text-orange-200'}`}>
                  {metrics.isPastDeadline && <AlertTriangle className="w-4 h-4" />}
                  <span>
                    {metrics.isPastDeadline ? 'Past Deadline: ' : 'Deadline: '}
                    {metrics.deadline?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-orange-200 text-xs mt-1">
                  (5 business days from month start)
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ==================== PERFORMANCE METRICS ==================== */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* My Performance Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">My Performance</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.myComposite || '—'}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <User className="w-8 h-8 text-purple-600" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-purple-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cumulative Zone</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.myComposite ? getCompositeZoneName(metrics.myComposite) : 'Not Assessed'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">9-Box Position</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.myLastAssessment?.nineBoxPosition || 'Not Assessed'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Review</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.myLastAssessed || 'Never'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Team Health Card */}
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Team Health</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.teamAvgComposite}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <Users className="w-8 h-8 text-yellow-600" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-yellow-200">
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Below Baseline (0-4):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.teamZones.below} ({getPercentage(metrics.teamZones.below, metrics.teamSize)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Baseline (5-6):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.teamZones.baseline} ({getPercentage(metrics.teamZones.baseline, metrics.teamSize)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Above Baseline (7-10):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.teamZones.above} ({getPercentage(metrics.teamZones.above, metrics.teamSize)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Exceptional (11-12):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.teamZones.exceptional} ({getPercentage(metrics.teamZones.exceptional, metrics.teamSize)})
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-yellow-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Team Size</span>
                    <span className="font-semibold text-gray-900">{metrics.teamSize}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Monthly Progress Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Monthly Progress</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.assessedThisMonth}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      / {metrics.totalAssessmentsNeeded}
                    </div>
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {getPercentage(metrics.assessedThisMonth, metrics.totalAssessmentsNeeded)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Alignment Rate</span>
                  <span className="font-semibold text-gray-900">{metrics.alignmentRate}%</span>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* ==================== ASSESSMENT CYCLE GRID ==================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Team Assessments</h2>
              <p className="text-gray-600 mt-1">Direct reports • Monthly 1x1 assessments</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/is-os/assessments/history')}
            >
              View Assessment History
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <AssessmentCycleGrid
            members={gridMembers}
            assessmentType={metrics.assessmentType}
            currentMonthName={metrics.currentMonthName}
            onStartAssessments={handleStartAssessments}
            onViewAssessment={handleViewAssessment}
            showStartButton={true}
            emptyStateMessage="No team members found"
            showPillarColumn={false}
            showSubPillarColumn={true}
            showTeamSizeColumn={false}
            showAssessorColumn={false}
            showHRPColumn={true}
          />
        </div>

        {/* ==================== QUICK ACTIONS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Team Dashboard</h3>
                <p className="text-sm text-gray-600">
                  Performance trends and team insights
                </p>
              </div>
              <Users className="w-8 h-8 text-yellow-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Team Dashboard coming soon!')}
            >
              View Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Team Analytics</h3>
                <p className="text-sm text-gray-600">
                  Historical trends and performance patterns
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Team Analytics coming soon!')}
            >
              View Analytics
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Development Plans</h3>
                <p className="text-sm text-gray-600">
                  Track individual growth and career paths
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Development Plans coming soon!')}
            >
              View Plans
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default ISOSHubISFSupervisor;