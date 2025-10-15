// src/pages/is-os/ISOSHubISFSupervisor.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Zap, Users, ArrowRight, 
  TrendingUp, Award, User, Target, CheckCircle, Eye, Edit, AlertTriangle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

function ISOSHubISFSupervisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Cycle start date: October 1, 2025
  const CYCLE_START_DATE = new Date(2025, 9, 1);
  
  // State
  const [directReports, setDirectReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    // Cycle Info
    cycleNumber: 1,
    cycleInYear: 1,
    cycleMonth: 1,
    assessmentType: '1x1',
    currentMonthName: 'October 2025',
    deadline: null,
    isPastDeadline: false,
    totalAssessmentsNeeded: 0,
    completedAssessments: 0,
    
    // My Performance (from ISL/manager)
    myLastAssessment: null,
    myComposite: null,
    myLastAssessed: null,
    myPosition: 'Not Assessed',
    
    // Team Health
    teamAvgComposite: 0,
    teamSize: 0,
    teamZones: { below: 0, baseline: 0, above: 0, exceptional: 0 },
    teamBucketLabel: 'Below Baseline',
    teamBucketClassName: 'bg-red-100 text-red-800 border-red-300',
    
    // Monthly Progress
    assessedThisMonth: 0,
    alignmentRate: 0
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

  // Helper function to categorize composite scores into 4 zones
  const getCompositeZone = (score) => {
    if (score >= 0 && score <= 4) return 'below';
    if (score >= 5 && score <= 6) return 'baseline';
    if (score >= 7 && score <= 10) return 'above';
    if (score >= 11 && score <= 12) return 'exceptional';
    return 'baseline';
  };

  // Helper function to calculate zone distribution
  const calculateZoneDistribution = (scores) => {
    const zones = { below: 0, baseline: 0, above: 0, exceptional: 0 };
    scores.forEach(score => {
      const zone = getCompositeZone(score);
      zones[zone]++;
    });
    return zones;
  };

  // Helper to calculate percentage
  const getPercentage = (count, total) => {
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  // Helper function to get zone name from composite score
  const getCompositeZoneName = (score) => {
    if (score >= 11 && score <= 12) return 'Exceptional';
    if (score >= 7 && score <= 10) return 'Above Baseline';
    if (score >= 5 && score <= 6) return 'Baseline';
    if (score >= 0 && score <= 4) return 'Below Baseline';
    return 'Not Assessed';
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
    const fetchSupervisorData = async () => {
      try {
        setLoading(true);
        
        console.log('🔍 Supervisor Loading data for:', user.displayName);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const cycleInfo = getCurrentCycleInfo(now);
        
        console.log(`📅 Current Cycle: Cycle ${cycleInfo.cycleInYear} of 4 • ${cycleInfo.assessmentType}`);
        console.log(`📅 Deadline: ${cycleInfo.deadline.toLocaleDateString()}`);
        console.log(`⚠️ Past Deadline: ${cycleInfo.isPastDeadline}`);
        
        // Fetch direct reports (ISF members reporting to this supervisor)
        const usersRef = collection(db, 'users');
        const directReportsQuery = query(
          usersRef,
          where('managerId', '==', user.userId)
        );
        
        const directReportsSnapshot = await getDocs(directReportsQuery);
        console.log('📊 Found', directReportsSnapshot.docs.length, 'direct reports');
        
        const reportsData = await Promise.all(
          directReportsSnapshot.docs.map(async (doc) => {
            const memberData = doc.data();
            
            // Get this member's assessments from supervisor
            const assessmentsRef = collection(db, 'assessments');
            const memberAssessmentsQuery = query(
              assessmentsRef,
              where('assesseeId', '==', memberData.userId),
              where('assessorId', '==', user.userId)
            );
            
            const memberAssessmentsSnapshot = await getDocs(memberAssessmentsQuery);
            
            // Sort in memory
            const sortedAssessments = memberAssessmentsSnapshot.docs.sort((a, b) => {
              const aTime = a.data().createdAt?.toDate?.() || new Date(0);
              const bTime = b.data().createdAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            });
            
            const latestAssessment = sortedAssessments.length > 0
              ? {
                  ...sortedAssessments[0].data(),
                  id: sortedAssessments[0].id,
                  completedAt: sortedAssessments[0].data().completedAt?.toDate?.() || null,
                  createdAt: sortedAssessments[0].data().createdAt?.toDate?.() || null
                }
              : null;

            return {
              id: memberData.userId,
              name: memberData.displayName || 'Unknown',
              email: memberData.email || '',
              pillarRole: memberData.pillarRole || 'Team Member',
              subPillar: memberData.subPillar || 'Unassigned',
              lastAssessment: latestAssessment
            };
          })
        );
        
        setDirectReports(reportsData);
        console.log(`👥 Loaded ${reportsData.length} direct reports`);
        
        // ========================================
        // GET SUPERVISOR'S OWN ASSESSMENT (from ISL/manager)
        // ========================================
        
        let myLastAssessment = null;
        let myComposite = null;
        let myLastAssessed = null;
        let myPosition = 'Not Assessed';
        
        console.log('👤 Fetching supervisor own assessment...');
        
        const myAssessmentsQuery = query(
          collection(db, 'assessments'),
          where('assesseeId', '==', user.userId)
        );
        const myAssessmentSnapshot = await getDocs(myAssessmentsQuery);
        
        console.log(`  Found ${myAssessmentSnapshot.docs.length} assessments for supervisor`);
        
        if (!myAssessmentSnapshot.empty) {
          const sortedMyAssessments = myAssessmentSnapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt?.toDate?.() || new Date(0);
            const bTime = b.data().createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          
          for (const doc of sortedMyAssessments) {
            const data = doc.data();
            console.log(`  Assessment status: ${data.status}, composite: ${data.composite}`);
            
            if (data.composite && (data.status === 'completed' || data.status === 'not-aligned')) {
              myLastAssessment = {
                ...data,
                id: doc.id,
                completedAt: data.completedAt?.toDate?.() || null
              };
              myComposite = data.composite;
              myPosition = data.nineBoxPosition || 'Not Assessed';
              if (myLastAssessment.completedAt) {
                const date = myLastAssessment.completedAt;
                myLastAssessed = `${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
              }
              console.log(`  ✅ Supervisor Assessment found: ${myComposite} (${myLastAssessed})`);
              break;
            }
          }
        }
        
        if (!myLastAssessed) {
          console.log('  ⚠️ No published supervisor assessment found');
        }

        // ========================================
        // CALCULATE METRICS
        // ========================================

        // Team Health (direct reports only)
        const publishedAssessments = reportsData.filter(m => 
          m.lastAssessment?.composite !== undefined && 
          (m.lastAssessment.status === 'completed' || m.lastAssessment.status === 'not-aligned')
        );
        
        const teamScores = publishedAssessments.map(m => m.lastAssessment.composite);
        const teamAvgComposite = teamScores.length > 0
          ? (teamScores.reduce((sum, score) => sum + score, 0) / teamScores.length)
          : 0;

        const teamZones = calculateZoneDistribution(teamScores);

        // Get bucket badge for team average
        const teamBucketInfo = getBucketBadgeStyle(teamAvgComposite);

        // Monthly Progress
        const assessedThisMonth = reportsData.filter(m => {
          if (!m.lastAssessment?.completedAt) return false;
          const assessmentDate = m.lastAssessment.completedAt;
          return assessmentDate.getMonth() === currentMonth && 
                 assessmentDate.getFullYear() === currentYear &&
                 (m.lastAssessment.status === 'completed' || m.lastAssessment.status === 'not-aligned');
        }).length;

        // Alignment rate
        const alignedMembers = publishedAssessments.filter(m => 
          m.lastAssessment.alignmentStatus === 'aligned'
        ).length;
        const alignmentRate = publishedAssessments.length > 0
          ? Math.round((alignedMembers / publishedAssessments.length) * 100)
          : 0;

        const totalAssessmentsNeeded = reportsData.length;
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
          myPosition,
          
          teamAvgComposite: teamAvgComposite.toFixed(1),
          teamSize: reportsData.length,
          teamZones,
          teamBucketLabel: teamBucketInfo.label,
          teamBucketClassName: teamBucketInfo.className,
          
          assessedThisMonth,
          alignmentRate
        });

        console.log(`✅ Metrics calculated:`);
        console.log(`  Team: ${reportsData.length} members, avg ${teamAvgComposite.toFixed(1)} (${teamBucketInfo.label})`);
        console.log(`  Progress: ${completedAssessments}/${totalAssessmentsNeeded} this month`);
        console.log(`  Supervisor: ${myComposite || 'Not assessed'}`);
        
      } catch (error) {
        console.error('❌ Error fetching supervisor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorData();
  }, [user.userId]);

  const handleStartAssessment = (member) => {
    navigate(`/is-os/assessments/1x1/new?assessee=${member.id}`);
  };

  const handleContinueDraft = (assessmentId) => {
    navigate(`/is-os/assessments/1x1/edit/${assessmentId}`);
  };

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

  const isPublished = (assessment) => {
    return assessment?.status === 'completed' || assessment?.status === 'not-aligned';
  };

  const hasDraft = (member) => {
    return member.lastAssessment?.status === 'draft';
  };

  const needsAssessment = (member) => {
    if (!member.lastAssessment) return true;
    if (!isPublished(member.lastAssessment)) return true;
    
    const now = new Date();
    const lastAssessmentDate = member.lastAssessment.completedAt;
    
    if (!lastAssessmentDate) return true;
    
    return now.getMonth() !== lastAssessmentDate.getMonth() || 
           now.getFullYear() !== lastAssessmentDate.getFullYear();
  };

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
      
      {/* Enhanced Banner - Matching ISL/ISE Style */}
      <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-10 h-10" />
            <div>
              <h1 className="text-5xl font-bold">IS OS Hub</h1>
              <p className="text-orange-100 text-lg">
                Supervisor View - Team Leadership & Development
              </p>
            </div>
          </div>
          
          {/* Cycle Info Bar */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Left: Cycle Info */}
              <div>
                <div className="text-orange-200 text-sm mb-1">Assessment Cycle</div>
                <div className="text-white text-lg font-semibold">
                  Cycle {metrics.cycleInYear} of 4
                </div>
                <div className="text-orange-200 text-sm mt-1">
                  Type: {metrics.assessmentType}
                </div>
              </div>
              
              {/* Center: Current Month (PROMINENT) */}
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
              
              {/* Right: Progress & Deadline */}
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Top Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. My Performance (from ISL/manager) */}
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
                    {metrics.myPosition}
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

            {/* 2. Team Health - WITH BUCKET BADGE */}
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Team Performance</h3>
                    <Badge className={`border ${metrics.teamBucketClassName} font-semibold text-xs`}>
                      {metrics.teamBucketLabel}
                    </Badge>
                  </div>
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
              
              {/* Zone Distribution */}
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Alignment Rate</span>
                    <span className="font-semibold text-gray-900">{metrics.alignmentRate}%</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. Monthly Progress */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Monthly Progress</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.assessedThisMonth}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      / {metrics.teamSize}
                    </div>
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {getPercentage(metrics.assessedThisMonth, metrics.teamSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-semibold text-gray-900">{metrics.teamSize - metrics.assessedThisMonth}</span>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Team Members Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Team</h2>
              <p className="text-gray-600 mt-1">Your direct reports • Monthly 1x1 assessments</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/is-os/assessments/history')}
            >
              View Assessment History
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {directReports.length === 0 ? (
            <Card className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Team Members</h3>
              <p className="text-gray-600">No direct reports found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {directReports.map((member) => {
                const hasPublishedAssessment = member.lastAssessment && isPublished(member.lastAssessment);
                const isDraft = hasDraft(member);
                const needsNewAssessment = needsAssessment(member);

                return (
                  <Card 
                    key={member.id}
                    className={`hover:shadow-lg transition-shadow ${
                      isDraft ? 'bg-purple-50 border-l-4 border-purple-500' : 
                      needsNewAssessment ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Member Info */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <User className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{member.name}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary">{member.pillarRole}</Badge>
                            <Badge variant="secondary">{member.subPillar}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Assessment Info */}
                      <div className="hidden md:flex items-center gap-6 px-6">
                        {isDraft ? (
                          <div className="text-center">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">Draft in Progress</Badge>
                          </div>
                        ) : hasPublishedAssessment ? (
                          <>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900">
                                {member.lastAssessment.composite}
                              </div>
                              <div className="text-xs text-gray-600">Composite</div>
                            </div>
                            <div className="text-center min-w-[120px]">
                              <div className="text-sm font-semibold text-gray-900">
                                {member.lastAssessment.nineBoxPosition}
                              </div>
                              <div className="text-xs text-gray-600">Position</div>
                            </div>
                            <div className="text-center">
                              {member.lastAssessment.alignmentStatus === 'aligned' ? (
                                <Badge variant="success">Aligned</Badge>
                              ) : (
                                <Badge variant="warning">Needs Alignment</Badge>
                              )}
                            </div>
                            <div className="text-center min-w-[60px]">
                              {member.lastAssessment.hrpRequested && (
                                <Badge className="bg-red-100 text-red-800 border border-red-300">
                                  HRP
                                </Badge>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <Badge variant="secondary">No Assessment</Badge>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          <div className="text-xs text-gray-600">
                            {isDraft ? 'Draft Started' : 'Last Assessed'}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {getTimeSinceAssessment(member.lastAssessment?.createdAt)}
                          </div>
                        </div>
                        
                        {isDraft ? (
                          <button
                            onClick={() => handleContinueDraft(member.lastAssessment.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Continue Draft
                          </button>
                        ) : hasPublishedAssessment && !needsNewAssessment ? (
                          <button
                            onClick={() => handleViewAssessment(member.lastAssessment.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            {member.lastAssessment.mshId || 'View'}
                          </button>
                        ) : (
                          <Button
                            variant={needsNewAssessment ? 'primary' : 'secondary'}
                            onClick={() => handleStartAssessment(member)}
                            className={needsNewAssessment ? 'bg-orange-600 hover:bg-orange-700' : ''}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Assess
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
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