// 📁 SAVE TO: src/pages/is-os/ISOSHubHRP.jsx
// REFACTORED - Now uses AssessmentCycleGrid for consistency

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Users, ArrowRight, AlertCircle, CheckCircle, 
  Building2, FileText, UserCheck, TrendingUp, Search
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import AssessmentCycleGrid from '../../components/hubs/AssessmentCycleGrid';

function ISOSHubHRP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ==================== STATE ====================
  const [gridMembers, setGridMembers] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [metrics, setMetrics] = useState({
    totalHrpRequests: 0,
    pendingReview: 0,
    reviewedThisMonth: 0
  });

  // ==================== HELPER FUNCTIONS ====================
  const getFilteredMembers = () => {
    let filtered = [...gridMembers];
    
    // Filter by tab
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(m => 
          m.currentAssessment?.hrpRequested && !m.currentAssessment?.hrpReviewedAt
        );
        break;
      case 'completed':
        filtered = filtered.filter(m => 
          m.currentAssessment?.hrpRequested && m.currentAssessment?.hrpReviewedAt
        );
        break;
      case 'all':
        // Show all HRP assessments
        filtered = filtered.filter(m => m.currentAssessment?.hrpRequested);
        break;
      default:
        filtered = filtered.filter(m => 
          m.currentAssessment?.hrpRequested && !m.currentAssessment?.hrpReviewedAt
        );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.pillarId.toLowerCase().includes(term) ||
        m.assessorName.toLowerCase().includes(term) ||
        (m.currentAssessment?.mshId && m.currentAssessment.mshId.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    const fetchHRPData = async () => {
      try {
        setLoading(true);
        
        // Get all pillars for context
        const pillarsRef = collection(db, 'pillars');
        const pillarsSnapshot = await getDocs(pillarsRef);
        const pillarsData = pillarsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPillars(pillarsData);

        // Get all users and build lookup map
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        console.log('👥 Total users in database:', usersSnapshot.size);
        
        const usersByAuthUid = {};
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          usersByAuthUid[doc.id] = {
            id: doc.id,
            ...userData
          };
        });
        
        console.log('👥 Users indexed by auth UID:', Object.keys(usersByAuthUid).length);

        // Get all assessments with hrpRequested flag
        const assessmentsRef = collection(db, 'assessments');
        const allAssessmentsQuery = query(assessmentsRef);
        const allAssessmentsSnapshot = await getDocs(allAssessmentsQuery);
        
        console.log('📊 Total assessments in database:', allAssessmentsSnapshot.size);
        
        const hrpAssessmentsList = [];
        allAssessmentsSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Only include assessments where hrpRequested is true
          if (data.hrpRequested !== true) {
            return;
          }
          
          console.log('✅ Found HRP assessment:', {
            id: doc.id,
            subjectId: data.subjectId,
            assessorId: data.assessorId,
            hrpRequested: data.hrpRequested,
            hrpReviewedAt: data.hrpReviewedAt
          });
          
          hrpAssessmentsList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null,
            hrpReviewedAt: data.hrpReviewedAt?.toDate?.() || null
          });
        });
        
        console.log('📋 Total HRP assessments found:', hrpAssessmentsList.length);

        setAllAssessments(hrpAssessmentsList);

        // Transform assessments into grid member format
        const membersForGrid = hrpAssessmentsList.map(assessment => {
          // ✅ FIX: Use subjectId (person being assessed) not assesseeId
          const assesseeData = usersByAuthUid[assessment.subjectId] || {};
          const assessorData = usersByAuthUid[assessment.assessorId] || {};
          
          console.log('🔍 Mapping assessment:', {
            assessmentId: assessment.id,
            subjectId: assessment.subjectId,
            assessorId: assessment.assessorId,
            assesseeData: assesseeData.displayName,
            assessorData: assessorData.displayName
          });
          
          return {
            id: assessment.subjectId || assessment.id, // Use subjectId as member ID
            name: assesseeData.displayName || 'Unknown',
            email: assesseeData.email || 'unknown@example.com',
            layer: assesseeData.layer || 'Unknown',
            pillarId: assesseeData.pillar || 'unassigned',
            subPillar: assesseeData.subPillar || null,
            isSupervisor: assesseeData.isSupervisor || false,
            assessorName: assessorData.displayName || 'Unknown',
            isDirectReport: false, // HRP reviews all
            currentAssessment: {
              id: assessment.id,
              status: assessment.status || 'completed',
              composite: assessment.composite,
              nineBoxPosition: assessment.nineBoxPosition,
              alignmentStatus: assessment.alignmentStatus,
              hrpRequested: assessment.hrpRequested,
              hrpReviewedAt: assessment.hrpReviewedAt,
              hrpReviewStatus: assessment.hrpReviewStatus,
              mshId: assessment.mshId,
              completedAt: assessment.completedAt
            }
          };
        });

        // Sort by completedAt descending (most recent first)
        membersForGrid.sort((a, b) => {
          const aTime = a.currentAssessment?.completedAt || new Date(0);
          const bTime = b.currentAssessment?.completedAt || new Date(0);
          return bTime - aTime;
        });

        setGridMembers(membersForGrid);

        // Calculate metrics
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const totalHrpRequests = hrpAssessmentsList.length;
        const pendingCount = hrpAssessmentsList.filter(a => !a.hrpReviewedAt).length;

        // Reviewed this month
        const reviewedThisMonth = hrpAssessmentsList.filter(a => {
          const reviewDate = a.hrpReviewedAt;
          return reviewDate &&
                 reviewDate.getMonth() === currentMonth &&
                 reviewDate.getFullYear() === currentYear;
        }).length;

        setMetrics({
          totalHrpRequests,
          pendingReview: pendingCount,
          reviewedThisMonth
        });

      } catch (error) {
        console.error('Error fetching HRP data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHRPData();
  }, [user.uid]);

  // ==================== EVENT HANDLERS ====================
  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/hrp-review/${assessmentId}`);
  };

  const handleViewAllAssessments = () => {
    navigate('/is-os/assessments/history');
  };

  // ==================== RENDER ====================
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

  const filteredMembers = getFilteredMembers();

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ==================== HERO BANNER ==================== */}
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ==================== METRICS ==================== */}
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
                <div className="text-xs text-gray-600 text-center">
                  Awaiting HRP review
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

            {/* Total HRP Requests */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Total Requests</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.totalHrpRequests}
                    </span>
                  </div>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200">
                <div className="text-xs text-gray-600 text-center">
                  All-time HRP flagged assessments
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

        {/* ==================== TABS AND SEARCH ==================== */}
        <div className="mb-6">
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

          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
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
        </div>

        {/* ==================== ASSESSMENT GRID ==================== */}
        <div className="mb-8">
          <AssessmentCycleGrid
            members={filteredMembers}
            assessmentType="HRP Reviews"
            currentMonthName={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            onViewAssessment={handleViewAssessment}
            showStartButton={false}
            emptyStateMessage={
              searchTerm 
                ? 'No assessments match your search'
                : activeTab === 'pending'
                ? 'No pending HRP reviews'
                : activeTab === 'completed'
                ? 'No completed HRP reviews'
                : 'No HRP assessments found'
            }
            showPillarColumn={true}
            showSubPillarColumn={true}
            showTeamSizeColumn={true}
            showAssessorColumn={true}
            showHRPColumn={true}
            viewButtonLabel="Review"
          />
        </div>

        {/* ==================== QUICK ACTIONS ==================== */}
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