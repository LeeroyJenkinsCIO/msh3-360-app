// src/pages/is-os/ISOSHubHRP.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Users, ArrowRight, AlertCircle, Eye, 
  CheckCircle, User, Building2, FileText, UserCheck, 
  Clock, TrendingUp, Search
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

function ISOSHubHRP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [pendingReviews, setPendingReviews] = useState([]);
  const [completedReviews, setCompletedReviews] = useState([]);
  const [allHrpAssessments, setAllHrpAssessments] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [metrics, setMetrics] = useState({
    totalHrpRequests: 0,
    pendingReview: 0,
    reviewedThisMonth: 0,
    avgReviewTime: 0, // days
    criticalCases: 0 // assessments older than 5 days without review
  });

  useEffect(() => {
    const fetchHRPData = async () => {
      try {
        setLoading(true);
        
        console.log('🔍 HRP Loading assessment data');
        
        // Get all pillars for context
        const pillarsRef = collection(db, 'pillars');
        const pillarsSnapshot = await getDocs(pillarsRef);
        const pillarsData = pillarsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPillars(pillarsData);

        // Get all users for name lookup
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersMap = {};
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          usersMap[userData.userId] = userData;
        });

        // Get all assessments (we'll filter for HRP in memory to avoid index issues)
        const assessmentsRef = collection(db, 'assessments');
        const allAssessmentsQuery = query(assessmentsRef);
        const allAssessmentsSnapshot = await getDocs(allAssessmentsQuery);
        
        console.log(`📊 Total assessments in database: ${allAssessmentsSnapshot.docs.length}`);
        
        const hrpAssessmentsList = [];
        allAssessmentsSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Only include assessments where hrpRequested is true
          if (data.hrpRequested !== true) {
            return;
          }
          
          const assesseeData = usersMap[data.assesseeId] || {};
          const assessorData = usersMap[data.assessorId] || {};
          
          hrpAssessmentsList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null,
            hrpReviewedAt: data.hrpReviewedAt?.toDate?.() || null,
            assesseeName: assesseeData.displayName || 'Unknown',
            assesseePillar: assesseeData.pillar || 'Unassigned',
            assesseeLayer: assesseeData.layer || 'Unknown',
            assessorName: assessorData.displayName || 'Unknown',
            pillarInfo: pillarsData.find(p => p.pillarId === assesseeData.pillar)
          });
        });

        console.log(`🔍 HRP requested assessments found: ${hrpAssessmentsList.length}`);

        // Sort by completedAt descending (most recent first)
        hrpAssessmentsList.sort((a, b) => {
          const aTime = a.completedAt || a.createdAt || new Date(0);
          const bTime = b.completedAt || b.createdAt || new Date(0);
          return bTime - aTime;
        });

        setAllHrpAssessments(hrpAssessmentsList);

        // Separate into pending and completed
        const pending = hrpAssessmentsList.filter(a => !a.hrpReviewedAt);
        const completed = hrpAssessmentsList.filter(a => a.hrpReviewedAt);

        console.log(`📊 Breakdown - Pending: ${pending.length}, Completed: ${completed.length}`);
        if (pending.length > 0) {
          console.log('📋 Sample pending assessment:', pending[0]);
        }

        setPendingReviews(pending);
        setCompletedReviews(completed);

        // ========================================
        // CALCULATE HRP-SPECIFIC METRICS
        // ========================================

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Total HRP requests
        const totalHrpRequests = hrpAssessmentsList.length;

        // Pending review count
        const pendingCount = pending.length;

        // Reviewed this month
        const reviewedThisMonth = completed.filter(a => {
          const reviewDate = a.hrpReviewedAt;
          return reviewDate &&
                 reviewDate.getMonth() === currentMonth &&
                 reviewDate.getFullYear() === currentYear;
        }).length;

        // Calculate average review time (for completed reviews)
        let totalReviewDays = 0;
        let reviewTimeCount = 0;
        completed.forEach(a => {
          if (a.completedAt && a.hrpReviewedAt) {
            const daysDiff = Math.floor((a.hrpReviewedAt - a.completedAt) / (1000 * 60 * 60 * 24));
            totalReviewDays += daysDiff;
            reviewTimeCount++;
          }
        });
        const avgReviewTime = reviewTimeCount > 0 ? Math.round(totalReviewDays / reviewTimeCount) : 0;

        // Critical cases (pending > 5 days)
        const criticalCases = pending.filter(a => {
          if (!a.completedAt) return false;
          const daysSinceCompleted = Math.floor((now - a.completedAt) / (1000 * 60 * 60 * 24));
          return daysSinceCompleted > 5;
        }).length;

        setMetrics({
          totalHrpRequests,
          pendingReview: pendingCount,
          reviewedThisMonth,
          avgReviewTime,
          criticalCases
        });

        console.log(`✅ Loaded ${totalHrpRequests} HRP requested assessments`);
        console.log(`📊 Metrics - Pending: ${pendingCount}, Reviewed this month: ${reviewedThisMonth}, Critical: ${criticalCases}, Avg review time: ${avgReviewTime}d`);
      } catch (error) {
        console.error('❌ Error fetching HRP data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHRPData();
  }, [user.uid]);

  const handleViewAssessment = (assessmentId) => {
    // Navigate to HRP review page instead of regular view
    navigate(`/is-os/assessments/hrp-review/${assessmentId}`);
  };

  const handleViewAllAssessments = () => {
    navigate('/is-os/assessments/history');
  };

  const getTimeSinceAssessment = (date) => {
    if (!date) return 'No date';
    const now = new Date();
    const assessmentDate = new Date(date);
    
    // Reset time to midnight for accurate day comparison
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const assessmentMidnight = new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate());
    
    const daysDiff = Math.floor((nowMidnight - assessmentMidnight) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 30) return `${daysDiff} days ago`;
    if (daysDiff < 60) return '1 month ago';
    return `${Math.floor(daysDiff / 30)} months ago`;
  };

  const getDaysSinceCompleted = (completedDate) => {
    if (!completedDate) return 0;
    const now = new Date();
    const assessmentMidnight = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((nowMidnight - assessmentMidnight) / (1000 * 60 * 60 * 24));
  };

  const getPriorityBadge = (assessment) => {
    if (!assessment.completedAt) return null;
    
    const daysSince = getDaysSinceCompleted(assessment.completedAt);
    
    if (daysSince > 5) {
      return <Badge className="bg-red-100 text-red-800 border border-red-300">Critical - {daysSince}d</Badge>;
    }
    if (daysSince > 3) {
      return <Badge className="bg-orange-100 text-orange-800 border border-orange-300">High - {daysSince}d</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">Normal - {daysSince}d</Badge>;
  };

  const getFilteredAssessments = () => {
    let assessments = [];
    
    switch (activeTab) {
      case 'pending':
        assessments = pendingReviews;
        break;
      case 'completed':
        assessments = completedReviews;
        break;
      case 'all':
        assessments = allHrpAssessments;
        break;
      default:
        assessments = pendingReviews;
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      assessments = assessments.filter(a => 
        a.assesseeName.toLowerCase().includes(term) ||
        a.assessorName.toLowerCase().includes(term) ||
        a.assesseePillar.toLowerCase().includes(term) ||
        (a.mshId && a.mshId.toLowerCase().includes(term))
      );
    }

    return assessments;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading HR Partner data...</p>
        </div>
      </div>
    );
  }

  const filteredAssessments = getFilteredAssessments();

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-3">
            <UserCheck className="w-10 h-10" />
            <div>
              <h1 className="text-5xl font-bold">HRP Hub</h1>
              <p className="text-pink-100 text-xl mt-2">
                HR Partner Assessment Review & Support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* HRP Metrics - Focus on Review Queue */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Review Queue Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Pending Reviews */}
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Pending Reviews</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.pendingReview}
                    </span>
                  </div>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-orange-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Critical Cases</span>
                  <span className="font-bold text-red-600">{metrics.criticalCases}</span>
                </div>
              </div>
            </Card>

            {/* Completed This Month */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Reviewed This Month</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.reviewedThisMonth}
                    </span>
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-green-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total HRP Requests</span>
                  <span className="font-semibold text-gray-900">{metrics.totalHrpRequests}</span>
                </div>
              </div>
            </Card>

            {/* Average Review Time */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Review Time</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.avgReviewTime}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      days
                    </div>
                  </div>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200">
                <div className="text-xs text-gray-600 text-center">
                  Time from completion to HRP review
                </div>
              </div>
            </Card>

            {/* Active Pillars */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Active Pillars</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {pillars.length}
                    </span>
                  </div>
                </div>
                <Building2 className="w-8 h-8 text-purple-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200">
                <div className="flex flex-wrap gap-1">
                  {pillars.map(pillar => (
                    <Badge key={pillar.id} variant="secondary" className="text-xs">
                      {pillar.pillarId.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Assessment Review Queue */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Assessment Review Queue</h2>
              <p className="text-gray-600 mt-1">
                Manage and review HRP-requested assessments
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleViewAllAssessments}
            >
              View All Assessments
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Tabs and Search */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between gap-4">
              {/* Tab Navigation */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Pending ({metrics.pendingReview})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Completed
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    All ({metrics.totalHrpRequests})
                  </div>
                </button>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, pillar, or MSH ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Assessment List */}
          {filteredAssessments.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {activeTab === 'pending' ? 'No Pending Reviews' : 'No Assessments Found'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : activeTab === 'pending' 
                    ? 'All HRP requests have been reviewed'
                    : 'No assessments match the current filter'
                }
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAssessments.map((assessment) => {
                const isPending = !assessment.hrpReviewedAt;
                const daysSinceCompleted = getDaysSinceCompleted(assessment.completedAt);

                return (
                  <Card 
                    key={assessment.id}
                    className={`hover:shadow-lg transition-shadow ${
                      isPending && daysSinceCompleted > 5 
                        ? 'bg-red-50 border-l-4 border-red-500' 
                        : isPending && daysSinceCompleted > 3
                          ? 'bg-orange-50 border-l-4 border-orange-500'
                          : isPending 
                            ? 'bg-yellow-50 border-l-4 border-yellow-500' 
                            : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Assessment Info */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-lg ${
                          isPending ? 'bg-purple-100' : 'bg-green-100'
                        }`}>
                          <User className={`w-6 h-6 ${
                            isPending ? 'text-purple-600' : 'text-green-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {assessment.assesseeName}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <Badge variant="secondary">{assessment.assesseeLayer}</Badge>
                            <Badge 
                              variant="secondary"
                              style={{ 
                                backgroundColor: `${assessment.pillarInfo?.color}20`,
                                color: assessment.pillarInfo?.color || '#6B7280'
                              }}
                            >
                              {assessment.assesseePillar}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              By: {assessment.assessorName}
                            </span>
                            {assessment.mshId && (
                              <Badge variant="primary" className="text-xs">
                                {assessment.mshId}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="hidden md:flex items-center gap-6 px-6">
                        {assessment.composite !== undefined ? (
                          <>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900">
                                {assessment.composite}
                              </div>
                              <div className="text-xs text-gray-600">Composite</div>
                            </div>
                            <div className="text-center min-w-[120px]">
                              <div className="text-sm font-semibold text-gray-900">
                                {assessment.nineBoxPosition || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600">9-Box</div>
                            </div>
                          </>
                        ) : (
                          <Badge variant="secondary">No Score</Badge>
                        )}
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          {isPending && getPriorityBadge(assessment)}
                          {!isPending && (
                            <Badge variant="success" className="mb-2">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Reviewed
                            </Badge>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {isPending 
                              ? assessment.completedAt 
                                ? `Completed ${getTimeSinceAssessment(assessment.completedAt)}`
                                : 'Not completed'
                              : `Reviewed ${getTimeSinceAssessment(assessment.hrpReviewedAt)}`
                            }
                          </div>
                        </div>
                        
                        <Button
                          variant={isPending ? 'primary' : 'secondary'}
                          onClick={() => handleViewAssessment(assessment.id)}
                          className={isPending && daysSinceCompleted > 5 ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {isPending ? 'Review' : 'View'}
                        </Button>
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
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">All Assessments</h3>
                <p className="text-sm text-gray-600">
                  Browse complete assessment history
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={handleViewAllAssessments}
            >
              View History
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Reports & Analytics</h3>
                <p className="text-sm text-gray-600">
                  Organization-wide performance insights
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => navigate('/is-os/reports')}
            >
              View Reports
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">User Management</h3>
                <p className="text-sm text-gray-600">
                  Manage users and organizational structure
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => navigate('/admin/users')}
            >
              Manage Users
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default ISOSHubHRP;