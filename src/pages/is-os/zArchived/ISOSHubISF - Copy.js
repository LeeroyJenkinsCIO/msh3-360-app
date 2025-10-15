// src/pages/is-os/ISOSHubISF.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Zap, Users, ArrowRight, 
  TrendingUp, TrendingDown, Minus, Award, User, Building2, Target, CheckCircle, Eye, BarChart3, AlertTriangle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { getPillarDisplayName } from '../../utils/pillarHelpers';

function ISOSHubISF() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Cycle start date: October 1, 2025
  const CYCLE_START_DATE = new Date(2025, 9, 1);
  
  // State
  const [myAssessments, setMyAssessments] = useState([]);
  const [pillarInfo, setPillarInfo] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    // Cycle Info
    cycleNumber: 1,
    cycleInYear: 1,
    cycleMonth: 1,
    assessmentType: '1x1',
    currentMonthName: 'October 2025',
    nextReviewDate: null,
    isPastReviewWindow: false,
    
    // My Performance
    myComposite: 0,
    myPosition: 'Not Assessed',
    myTrend: 'stable',
    myBucketLabel: 'Below Baseline',
    myBucketClassName: 'bg-red-100 text-red-800 border-red-300',
    
    // My Progress
    assessmentsReceived: 0,
    lastAssessmentDate: null,
    
    // Team Context
    teamAvg: 0,
    teamBucketLabel: 'Below Baseline',
    teamBucketClassName: 'bg-red-100 text-red-800 border-red-300',
    myVsTeam: 'At Average'
  });

  // Helper function to calculate 5 business days from start of month
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

  // Helper function to get current cycle info
  const getCurrentCycleInfo = (date = new Date()) => {
    const monthsSinceStart = (date.getFullYear() - CYCLE_START_DATE.getFullYear()) * 12 + 
                             (date.getMonth() - CYCLE_START_DATE.getMonth());
    
    const cycleNumber = Math.floor(monthsSinceStart / 3) + 1;
    const cycleMonth = (monthsSinceStart % 3) + 1;
    const assessmentType = cycleMonth === 3 ? '360' : '1x1';
    const cycleInYear = ((cycleNumber - 1) % 4) + 1;
    
    const currentMonthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const nextReviewDate = calculateDeadline(monthStart);
    const isPastReviewWindow = date > nextReviewDate;
    
    return {
      cycleNumber,
      cycleInYear,
      cycleMonth,
      assessmentType,
      currentMonthName,
      nextReviewDate,
      isPastReviewWindow
    };
  };

  // Helper function to get bucket badge styling
  const getBucketBadgeStyle = (avgComposite) => {
    if (avgComposite >= 11) {
      return {
        label: 'Exceptional',
        className: 'bg-blue-100 text-blue-800 border-blue-300'
      };
    }
    if (avgComposite >= 7) {
      return {
        label: 'Above Baseline',
        className: 'bg-green-100 text-green-800 border-green-300'
      };
    }
    if (avgComposite >= 5) {
      return {
        label: 'Baseline',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      };
    }
    return {
      label: 'Below Baseline',
      className: 'bg-red-100 text-red-800 border-red-300'
    };
  };

  useEffect(() => {
    const fetchMyData = async () => {
      try {
        setLoading(true);
        
        console.log('🔍 ISF Loading my performance data');
        console.log('📋 Current user:', user);
        
        const now = new Date();
        const cycleInfo = getCurrentCycleInfo(now);
        
        console.log(`📅 Current Cycle: Cycle ${cycleInfo.cycleInYear} of 4 • ${cycleInfo.assessmentType}`);
        console.log(`📅 Next Review: ${cycleInfo.nextReviewDate.toLocaleDateString()}`);
        
        // Get my pillar information
        if (user.pillar) {
          const pillarsRef = collection(db, 'pillars');
          const pillarQuery = query(pillarsRef, where('pillarId', '==', user.pillar));
          const pillarSnapshot = await getDocs(pillarQuery);
          
          if (!pillarSnapshot.empty) {
            const pillarData = {
              id: pillarSnapshot.docs[0].id,
              ...pillarSnapshot.docs[0].data()
            };
            setPillarInfo(pillarData);
          }
        }
        
        // Get my assessments (as the assessed person)
        const assessmentsRef = collection(db, 'assessments');
        const myAssessmentsQuery = query(
          assessmentsRef,
          where('assesseeId', '==', user.userId)
        );
        const assessmentsSnapshot = await getDocs(myAssessmentsQuery);
        
        // Sort in memory and filter
        const assessments = assessmentsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            completedAt: doc.data().completedAt?.toDate?.() || null,
            createdAt: doc.data().createdAt?.toDate?.() || null
          }))
          .filter(data => data.status === 'completed' || data.status === 'not-aligned')
          .sort((a, b) => {
            const aTime = a.completedAt || new Date(0);
            const bTime = b.completedAt || new Date(0);
            return bTime - aTime;
          });
        
        setMyAssessments(assessments);
        console.log(`📊 Found ${assessments.length} published assessments`);

        // Calculate metrics
        const latestAssessment = assessments[0] || null;
        
        // Calculate trend (compare latest two assessments)
        let trend = 'stable';
        if (assessments.length >= 2) {
          const scoreDiff = assessments[0].composite - assessments[1].composite;
          if (scoreDiff > 0.5) trend = 'growth';
          else if (scoreDiff < -0.5) trend = 'down';
        }

        // Get my bucket badge
        const myComposite = latestAssessment?.composite || 0;
        const myBucketInfo = getBucketBadgeStyle(myComposite);

        // Get team context (if I have a manager)
        let teamAvg = 0;
        let teamBucketInfo = { label: 'Below Baseline', className: 'bg-red-100 text-red-800 border-red-300' };
        let myVsTeam = 'At Average';
        
        if (user.managerId) {
          // Find my manager
          const usersRef = collection(db, 'users');
          const managerQuery = query(usersRef, where('userId', '==', user.managerId));
          const managerSnapshot = await getDocs(managerQuery);
          
          if (!managerSnapshot.empty) {
            const managerData = managerSnapshot.docs[0].data();
            setTeamInfo({
              supervisorName: managerData.displayName,
              supervisorId: user.managerId
            });
            
            // Get all team members under this manager
            const teamQuery = query(usersRef, where('managerId', '==', user.managerId));
            const teamSnapshot = await getDocs(teamQuery);
            
            console.log(`👥 Found ${teamSnapshot.docs.length} team members`);
            
            if (teamSnapshot.docs.length > 0) {
              let teamScores = [];
              
              for (const teamDoc of teamSnapshot.docs) {
                const teamMemberData = teamDoc.data();
                const memberAssessmentQuery = query(
                  assessmentsRef,
                  where('assesseeId', '==', teamMemberData.userId)
                );
                const memberAssessmentSnapshot = await getDocs(memberAssessmentQuery);
                
                // Get latest published assessment
                const memberAssessments = memberAssessmentSnapshot.docs
                  .map(doc => doc.data())
                  .filter(data => (data.status === 'completed' || data.status === 'not-aligned') && data.composite)
                  .sort((a, b) => {
                    const aTime = a.completedAt?.toDate?.() || new Date(0);
                    const bTime = b.completedAt?.toDate?.() || new Date(0);
                    return bTime - aTime;
                  });
                
                if (memberAssessments.length > 0) {
                  teamScores.push(memberAssessments[0].composite);
                }
              }
              
              if (teamScores.length > 0) {
                teamAvg = teamScores.reduce((a, b) => a + b, 0) / teamScores.length;
                teamBucketInfo = getBucketBadgeStyle(teamAvg);
                
                // Calculate my vs team
                if (myComposite > teamAvg + 0.5) myVsTeam = 'Above Average';
                else if (myComposite < teamAvg - 0.5) myVsTeam = 'Below Average';
                else myVsTeam = 'At Average';
                
                console.log(`📊 Team avg: ${teamAvg.toFixed(1)}, My score: ${myComposite}, Comparison: ${myVsTeam}`);
              }
            }
          }
        }

        setMetrics({
          cycleNumber: cycleInfo.cycleNumber,
          cycleInYear: cycleInfo.cycleInYear,
          cycleMonth: cycleInfo.cycleMonth,
          assessmentType: cycleInfo.assessmentType,
          currentMonthName: cycleInfo.currentMonthName,
          nextReviewDate: cycleInfo.nextReviewDate,
          isPastReviewWindow: cycleInfo.isPastReviewWindow,
          
          myComposite,
          myPosition: latestAssessment?.nineBoxPosition || 'Not Assessed',
          myTrend: trend,
          myBucketLabel: myBucketInfo.label,
          myBucketClassName: myBucketInfo.className,
          
          assessmentsReceived: assessments.length,
          lastAssessmentDate: latestAssessment?.completedAt || null,
          
          teamAvg: teamAvg > 0 ? teamAvg.toFixed(1) : 0,
          teamBucketLabel: teamBucketInfo.label,
          teamBucketClassName: teamBucketInfo.className,
          myVsTeam
        });

        console.log(`✅ Loaded ${assessments.length} assessments for ${user.displayName}`);
      } catch (error) {
        console.error('❌ Error fetching my data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyData();
  }, [user.userId]);

  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  const getTimeSinceAssessment = (date) => {
    if (!date) return 'No assessment';
    const now = new Date();
    const assessmentDate = new Date(date);
    
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const assessmentMidnight = new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate());
    
    const daysDiff = Math.floor((nowMidnight - assessmentMidnight) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 30) return `${daysDiff} days ago`;
    if (daysDiff < 60) return '1 month ago';
    return `${Math.floor(daysDiff / 30)} months ago`;
  };

  const getMonthYear = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Enhanced Banner - Matching ISE/ISL/Supervisor Style */}
      <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-10 h-10" />
            <div>
              <h1 className="text-5xl font-bold">IS OS Hub</h1>
              <p className="text-emerald-100 text-lg">
                My View - Personal Performance & Development
              </p>
            </div>
          </div>
          
          {/* Cycle Info Bar */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Left: Cycle Info */}
              <div>
                <div className="text-emerald-200 text-sm mb-1">Assessment Cycle</div>
                <div className="text-white text-lg font-semibold">
                  Cycle {metrics.cycleInYear} of 4
                </div>
                <div className="text-emerald-200 text-sm mt-1">
                  Type: {metrics.assessmentType}
                </div>
              </div>
              
              {/* Center: Current Month (PROMINENT) */}
              <div className="text-center">
                <div className="text-emerald-200 text-sm mb-1">Current Month</div>
                <div className="text-white text-3xl font-bold flex items-center justify-center gap-2">
                  <Calendar className="w-8 h-8" />
                  {metrics.currentMonthName}
                </div>
                <div className="text-emerald-200 text-sm mt-3">
                  {metrics.assessmentsReceived} {metrics.assessmentsReceived === 1 ? 'review' : 'reviews'} received
                </div>
              </div>
              
              {/* Right: Next Review */}
              <div className="text-right">
                <div className="text-emerald-200 text-sm mb-1">My Next Review</div>
                <div className="text-white text-lg font-semibold">
                  Expected by {metrics.nextReviewDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className={`text-sm mt-2 flex items-center justify-end gap-1 ${metrics.isPastReviewWindow ? 'text-yellow-300' : 'text-emerald-200'}`}>
                  {metrics.isPastReviewWindow && <AlertTriangle className="w-4 h-4" />}
                  <span>
                    {metrics.isPastReviewWindow ? 'Review window passed' : 'Within review window'}
                  </span>
                </div>
                <div className="text-emerald-200 text-xs mt-1">
                  (Reviews due within 5 business days)
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Top Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">My Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* My Current Score - WITH BUCKET BADGE */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Current Score</h3>
                    {metrics.myComposite > 0 && (
                      <Badge className={`border ${metrics.myBucketClassName} font-semibold text-xs`}>
                        {metrics.myBucketLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.myComposite || '—'}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-green-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">9-Box Position</span>
                  <span className="font-semibold text-gray-900">{metrics.myPosition}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Trend</span>
                  <div className="flex items-center gap-1">
                    {metrics.myTrend === 'growth' && (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">Growth</span>
                      </>
                    )}
                    {metrics.myTrend === 'stable' && (
                      <>
                        <Minus className="w-4 h-4 text-gray-600" />
                        <span className="font-semibold text-gray-600">Stable</span>
                      </>
                    )}
                    {metrics.myTrend === 'down' && (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-600">Down</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Assessment History */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Assessment History</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.assessmentsReceived}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      total
                    </div>
                  </div>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Assessment</span>
                  <span className="font-semibold text-gray-900">
                    {getTimeSinceAssessment(metrics.lastAssessmentDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Review Date</span>
                  <span className="font-semibold text-gray-900">
                    {getMonthYear(metrics.lastAssessmentDate)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Team Context - WITH BUCKET BADGE */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Team Context</h3>
                    {metrics.teamAvg > 0 && (
                      <Badge className={`border ${metrics.teamBucketClassName} font-semibold text-xs`}>
                        {metrics.teamBucketLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.teamAvg || '—'}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      team avg
                    </div>
                  </div>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">My vs Team</span>
                  <span className={`font-semibold ${
                    metrics.myVsTeam === 'Above Average' ? 'text-green-600' :
                    metrics.myVsTeam === 'Below Average' ? 'text-red-600' :
                    'text-gray-900'
                  }`}>
                    {metrics.myVsTeam}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Supervisor</span>
                  <span className="font-semibold text-gray-900">
                    {teamInfo?.supervisorName || 'Unassigned'}
                  </span>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Assessment History Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Assessment History</h2>
              <p className="text-gray-600 mt-1">View your performance reviews and progress over time</p>
            </div>
          </div>

          {myAssessments.length === 0 ? (
            <Card className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assessments Yet</h3>
              <p className="text-gray-600">
                Your assessments will appear here once completed by your supervisor
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myAssessments.map((assessment) => (
                <Card 
                  key={assessment.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    {/* Assessment Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {assessment.mshId || `Assessment ${assessment.id.slice(0, 8)}`}
                          </h4>
                          <Badge variant="secondary">
                            {getMonthYear(assessment.completedAt)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">
                            Completed {getTimeSinceAssessment(assessment.completedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="hidden md:flex items-center gap-6 px-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {assessment.composite}
                        </div>
                        <div className="text-xs text-gray-600">Composite</div>
                      </div>
                      <div className="text-center min-w-[120px]">
                        <div className="text-sm font-semibold text-gray-900">
                          {assessment.nineBoxPosition}
                        </div>
                        <div className="text-xs text-gray-600">Position</div>
                      </div>
                      <div className="text-center">
                        {assessment.alignmentStatus === 'aligned' ? (
                          <Badge variant="success">Aligned</Badge>
                        ) : (
                          <Badge variant="warning">Needs Alignment</Badge>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleViewAssessment(assessment.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pillar & Team Info */}
        {pillarInfo && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Team Context</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${pillarInfo.color || '#6366f1'}20` }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: pillarInfo.color || '#6366f1' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">My Pillar</h3>
                    <p className="text-lg font-bold text-gray-900">{getPillarDisplayName(pillarInfo.pillarId)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {user.subPillar || 'General Team'}
                    </p>
                  </div>
                </div>
              </Card>

              {teamInfo && (
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">My Supervisor</h3>
                      <p className="text-lg font-bold text-gray-900">{teamInfo.supervisorName}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Direct supervisor
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">My Dashboard</h3>
                <p className="text-sm text-gray-600">
                  View detailed performance metrics and trends
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Personal Dashboard coming soon!')}
            >
              View Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Progress Tracking</h3>
                <p className="text-sm text-gray-600">
                  Track your development goals and milestones
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Progress Tracking coming soon!')}
            >
              View Progress
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Development Plan</h3>
                <p className="text-sm text-gray-600">
                  Access your career development resources
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Development Plan coming soon!')}
            >
              View Plan
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default ISOSHubISF;