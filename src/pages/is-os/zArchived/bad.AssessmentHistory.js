// src/pages/is-os/AssessmentHistory.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ArrowLeft, Eye, CheckCircle, AlertCircle, Search, Filter
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { getPillarDisplayName, getSubPillarDisplayName, getTruncatedPillarName } from '../../utils/pillarHelpers';

function AssessmentHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'aligned', 'not-aligned', 'draft'
  const [hrpFilter, setHrpFilter] = useState('all'); // 'all', 'reviewed', 'requested', 'none'

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        
        // Get all assessments (we'll filter in memory)
        const assessmentsRef = collection(db, 'assessments');
        const assessmentsQuery = query(
          assessmentsRef,
          orderBy('completedAt', 'desc')
        );
        
        const snapshot = await getDocs(assessmentsQuery);
        
        // Get all users for name lookup
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersMap = {};
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          usersMap[userData.userId] = userData;
        });
        
        const assessmentsList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const assesseeData = usersMap[data.assesseeId] || {};
          const assessorData = usersMap[data.assessorId] || {};
          
          assessmentsList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null,
            hrpReviewedAt: data.hrpReviewedAt?.toDate?.() || null,
            assesseeName: assesseeData.displayName || 'Unknown',
            assesseePillar: assesseeData.pillar || 'Unassigned',
            assesseeSubPillar: assesseeData.subPillar || data.assesseeSubPillar || '',
            assesseeLayer: assesseeData.layer || 'Unknown',
            assessorName: assessorData.displayName || 'Unknown'
          });
        });
        
        setAssessments(assessmentsList);
      } catch (error) {
        console.error('Error fetching assessments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  const handleViewAssessment = (assessment) => {
    // Route to HRP review page if:
    // 1. Assessment has been HRP reviewed (shows HRP notes), OR
    // 2. User is HRP and assessment has hrpRequested flag (for pending reviews)
    if (assessment.hrpReviewedAt || (user?.role === 'hrp' && assessment.hrpRequested)) {
      navigate(`/is-os/assessments/hrp-review/${assessment.id}`);
    } else {
      // Regular view for standard assessments without HRP involvement
      navigate(`/is-os/assessments/view/${assessment.id}`);
    }
  };

  // Calculate filter counts with consistent logic
  const filterCounts = useMemo(() => {
    const counts = {
      all: assessments.length,
      aligned: 0,
      notAligned: 0,
      draft: 0,
      hrpAll: assessments.length,
      hrpReviewed: 0,
      hrpRequested: 0,
      hrpNone: 0
    };

    assessments.forEach(a => {
      // Alignment status counts (match filter logic exactly)
      // Check both alignmentStatus and status fields for backward compatibility
      const isAligned = a.alignmentStatus === 'aligned' || a.status === 'aligned';
      const isNotAligned = a.alignmentStatus === 'not-aligned' || 
                           a.status === 'not-aligned' ||
                           a.status === 'status-quo' ||
                           a.alignmentStatus === 'status-quo' ||
                           (!a.alignmentStatus && a.status !== 'aligned' && a.status !== 'draft');
      
      if (isAligned) {
        counts.aligned++;
      } else if (isNotAligned) {
        counts.notAligned++;
      }
      
      if (a.status === 'draft') {
        counts.draft++;
      }

      // HRP status counts
      if (a.hrpReviewedAt) {
        counts.hrpReviewed++;
      } else if (a.hrpRequested && !a.hrpReviewedAt) {
        counts.hrpRequested++;
      } else if (!a.hrpRequested && !a.hrpReviewedAt) {
        counts.hrpNone++;
      }
    });

    return counts;
  }, [assessments]);

  const getFilteredAssessments = () => {
    let filtered = assessments;

    // Apply status filter (alignment status)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => {
        if (statusFilter === 'aligned') {
          return a.alignmentStatus === 'aligned' || a.status === 'aligned';
        }
        if (statusFilter === 'not-aligned') {
          // "Not Aligned" includes: explicit not-aligned, status quo, or missing alignment (but not draft)
          return a.alignmentStatus === 'not-aligned' || 
                 a.status === 'not-aligned' ||
                 a.status === 'status-quo' ||
                 a.alignmentStatus === 'status-quo' ||
                 (!a.alignmentStatus && a.status !== 'aligned' && a.status !== 'draft');
        }
        if (statusFilter === 'draft') return a.status === 'draft';
        return true;
      });
    }

    // Apply HRP filter
    if (hrpFilter !== 'all') {
      filtered = filtered.filter(a => {
        if (hrpFilter === 'reviewed') return a.hrpReviewedAt;
        if (hrpFilter === 'requested') return a.hrpRequested && !a.hrpReviewedAt;
        if (hrpFilter === 'none') return !a.hrpRequested && !a.hrpReviewedAt;
        return true;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.assesseeName.toLowerCase().includes(term) ||
        a.assessorName.toLowerCase().includes(term) ||
        getPillarDisplayName(a.assesseePillar).toLowerCase().includes(term) ||
        (a.mshId && a.mshId.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  // Calculate contribution and growth totals
  const calculateTotals = (scores) => {
    if (!scores) return { totalContribution: 0, totalGrowth: 0 };
    const contribution = (scores.culture || 0) + (scores.competencies || 0) + (scores.execution || 0);
    const growth = (scores.mindset || 0) + (scores.skillset || 0) + (scores.habits || 0);
    return { totalContribution: contribution, totalGrowth: growth };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  const filteredAssessments = getFilteredAssessments();

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/is-os')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to ISOS Hub
          </button>
          
          <h1 className="text-3xl font-bold mb-2">Assessment History</h1>
          <p className="text-blue-100">
            View and manage completed performance assessments
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Filters and Search */}
        <Card className="mb-6">
          <div className="space-y-4">
            
            {/* Alignment Status Filter Tabs */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">Alignment Status</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({filterCounts.all})
                </button>
                <button
                  onClick={() => setStatusFilter('aligned')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'aligned'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Aligned ({filterCounts.aligned})
                </button>
                <button
                  onClick={() => setStatusFilter('not-aligned')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'not-aligned'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Not Aligned ({filterCounts.notAligned})
                </button>
              </div>
            </div>

            {/* HRP Status Filter Tabs */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">HRP Status</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setHrpFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    hrpFilter === 'all'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({filterCounts.hrpAll})
                </button>
                <button
                  onClick={() => setHrpFilter('reviewed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    hrpFilter === 'reviewed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Reviewed ({filterCounts.hrpReviewed})
                </button>
                <button
                  onClick={() => setHrpFilter('requested')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    hrpFilter === 'requested'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Requested ({filterCounts.hrpRequested})
                </button>
                <button
                  onClick={() => setHrpFilter('none')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    hrpFilter === 'none'
                      ? 'bg-gray-300 text-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  None ({filterCounts.hrpNone})
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, pillar, or MSH ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredAssessments.length} of {assessments.length} assessments
            {(statusFilter !== 'all' || hrpFilter !== 'all' || searchTerm) && (
              <span className="text-blue-600 ml-1">
                (filtered)
              </span>
            )}
          </p>
        </div>

        {/* Assessments Table */}
        {filteredAssessments.length === 0 ? (
          <Card className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assessments Found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || hrpFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No assessments have been completed yet'}
            </p>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Wrapper for horizontal scroll with sticky backdrop */}
            <div className="overflow-x-auto relative">
              {/* Solid backdrop behind ALL sticky columns - prevents bleed-through */}
              <div 
                className="absolute left-0 top-0 bottom-0 pointer-events-none" 
                style={{ 
                  width: '670px',
                  backgroundColor: '#ffffff',
                  zIndex: 15,
                  borderRight: '2px solid #93c5fd'
                }}
              />
              
              <table className="w-full relative" style={{ minWidth: '1400px' }}>
                <thead className="bg-gray-50 border-b border-gray-200 relative">
                  {/* Gray backdrop for header sticky columns */}
                  <tr className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ width: '670px', backgroundColor: '#f9fafb', zIndex: 15, borderRight: '2px solid #93c5fd' }} />
                  
                  <tr className="relative">
                    {/* FROZEN COLUMNS - Sticky on left */}
                    <th className="sticky left-0 z-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ backgroundColor: '#f9fafb', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                      Action
                    </th>
                    <th className="sticky left-[110px] z-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ backgroundColor: '#f9fafb', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                      MSH ID
                    </th>
                    <th className="sticky left-[210px] z-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ backgroundColor: '#f9fafb', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                      Assessee
                    </th>
                    <th className="sticky left-[390px] z-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ backgroundColor: '#f9fafb', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                      Assessor
                    </th>
                    <th className="sticky left-[530px] z-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-blue-300" style={{ backgroundColor: '#f9fafb', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.2)' }}>
                      Type
                    </th>

                    {/* SCROLLABLE COLUMNS */}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Nine-Box
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      HRP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Pillar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Sub Pillar
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Composite
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Contrib
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Growth
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssessments.map((assessment) => {
                    const totals = calculateTotals(assessment.scores);
                    
                    return (
                      <tr key={assessment.id} className="hover:bg-gray-50 group relative">
                        
                        {/* FROZEN COLUMNS - Sticky on left */}
                        
                        {/* Action - FIRST COLUMN */}
                        <td className="sticky left-0 z-30 px-4 py-4 text-center border-r border-gray-200 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewAssessment(assessment)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </td>

                        {/* MSH ID */}
                        <td className="sticky left-[110px] z-30 px-4 py-4 whitespace-nowrap border-r border-gray-200 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                          <Badge variant="primary" className="text-xs font-mono">
                            {assessment.mshId || 'N/A'}
                          </Badge>
                        </td>

                        {/* Assessee */}
                        <td className="sticky left-[210px] z-30 px-4 py-4 whitespace-nowrap border-r border-gray-200 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                          <div className="text-sm font-medium text-gray-900">{assessment.assesseeName}</div>
                          <div className="text-xs text-gray-500">
                            {assessment.assesseeLayer}
                          </div>
                        </td>

                        {/* Assessor */}
                        <td className="sticky left-[390px] z-30 px-4 py-4 whitespace-nowrap border-r border-gray-200 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                          <div className="text-sm text-gray-900">{assessment.assessorName}</div>
                        </td>

                        {/* Type - Show "1x1" or "360" */}
                        <td className="sticky left-[530px] z-30 px-4 py-4 whitespace-nowrap border-r-2 border-blue-300 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                          <Badge variant="secondary" className="text-xs">
                            {assessment.assessmentType === '360' || assessment.type === '360' ? '360' : '1x1'}
                          </Badge>
                        </td>

                        {/* SCROLLABLE COLUMNS */}

                        {/* Nine-Box */}
                        <td className="px-4 py-4 text-center">
                          {assessment.nineBoxPosition ? (
                            <Badge 
                              variant={
                                assessment.nineBoxPosition.includes('High') ? 'success' : 
                                assessment.nineBoxPosition.includes('Mid') ? 'warning' : 
                                'secondary'
                              }
                              className="text-xs whitespace-nowrap"
                            >
                              {assessment.nineBoxPosition.replace(' Performance / ', ' / ')}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-center">
                          {assessment.alignmentStatus === 'aligned' ? (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Aligned
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Not Aligned
                            </Badge>
                          )}
                        </td>

                        {/* HRP */}
                        <td className="px-4 py-4 text-center">
                          {assessment.hrpReviewedAt ? (
                            <Badge variant="success" className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Reviewed
                            </Badge>
                          ) : assessment.hrpRequested ? (
                            <Badge variant="warning" className="bg-red-100 text-red-800 text-xs">
                              Requested
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Pillar - TRUNCATED with tooltip */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div 
                            className="text-sm text-gray-900 font-mono font-semibold cursor-help" 
                            title={getPillarDisplayName(assessment.assesseePillar)}
                          >
                            {getTruncatedPillarName(assessment.assesseePillar)}
                          </div>
                        </td>

                        {/* Sub Pillar - UPDATED */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {getSubPillarDisplayName(assessment.assesseeSubPillar || assessment.subPillar)}
                          </div>
                        </td>

                        {/* Composite */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className="text-lg font-bold text-blue-600">
                            {assessment.composite || 0}
                          </span>
                          <span className="text-xs text-gray-500">/12</span>
                        </td>

                        {/* Contribution */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-orange-600">
                            {totals.totalContribution}
                          </span>
                          <span className="text-xs text-gray-500">/6</span>
                        </td>

                        {/* Growth */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-green-600">
                            {totals.totalGrowth}
                          </span>
                          <span className="text-xs text-gray-500">/6</span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {assessment.completedAt?.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AssessmentHistory;