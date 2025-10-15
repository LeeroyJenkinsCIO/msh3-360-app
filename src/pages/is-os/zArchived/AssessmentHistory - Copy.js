// src/pages/is-os/AssessmentHistory.jsx
// FIXED VERSION - Corrected freeze pane behavior

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ArrowLeft, Eye, CheckCircle, AlertCircle
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
  const [filterType, setFilterType] = useState('all');
  const [assesseeFilter, setAssesseeFilter] = useState('all');
  const [assessorFilter, setAssessorFilter] = useState('all');

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        
        const assessmentsRef = collection(db, 'assessments');
        const assessmentsQuery = query(
          assessmentsRef,
          orderBy('completedAt', 'desc')
        );
        
        const snapshot = await getDocs(assessmentsQuery);
        
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
          const subjectData = usersMap[data.subjectId] || {};
          const assessorData = usersMap[data.assessorId] || {};
          
          assessmentsList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null,
            hrpReviewedAt: data.hrpReviewedAt?.toDate?.() || null,
            subjectName: data.subjectName || subjectData.displayName || 'Unknown',
            subjectPillar: subjectData.pillar || data.subjectPillar || 'Unassigned',
            subjectSubPillar: subjectData.subPillar || data.subjectSubPillar || '',
            subjectLayer: subjectData.layer || data.subjectLayer || 'Unknown',
            assessorName: data.assessorName || assessorData.displayName || 'Unknown'
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
    if (assessment.hrpReviewedAt || (user?.role === 'hrp' && assessment.hrpRequested)) {
      navigate(`/is-os/assessments/hrp-review/${assessment.id}`);
    } else {
      navigate(`/is-os/assessments/view/${assessment.id}`);
    }
  };

  const filterCounts = useMemo(() => {
    const counts = {
      all: assessments.length,
      aligned: 0,
      notAligned: 0,
      hrpRequests: 0
    };

    assessments.forEach(a => {
      const isAligned = a.alignmentStatus === 'aligned' || a.status === 'completed';
      const isNotAligned = a.alignmentStatus === 'not-aligned' || 
                           a.status === 'not-aligned' ||
                           (!a.alignmentStatus && a.status !== 'completed' && a.status !== 'draft');
      
      if (isAligned) counts.aligned++;
      else if (isNotAligned) counts.notAligned++;
      
      if (a.hrpRequested) counts.hrpRequests++;
    });

    return counts;
  }, [assessments]);

  const uniqueAssessees = useMemo(() => {
    const names = [...new Set(assessments.map(a => a.subjectName))].sort();
    return names;
  }, [assessments]);

  const uniqueAssessors = useMemo(() => {
    const names = [...new Set(assessments.map(a => a.assessorName))].sort();
    return names;
  }, [assessments]);

  const getFilteredAssessments = () => {
    let filtered = assessments;

    if (filterType === 'aligned') {
      filtered = filtered.filter(a => a.alignmentStatus === 'aligned' || a.status === 'completed');
    } else if (filterType === 'not-aligned') {
      filtered = filtered.filter(a => 
        a.alignmentStatus === 'not-aligned' || 
        a.status === 'not-aligned' ||
        (!a.alignmentStatus && a.status !== 'completed' && a.status !== 'draft')
      );
    } else if (filterType === 'hrp-requests') {
      filtered = filtered.filter(a => a.hrpRequested);
    }

    if (assesseeFilter !== 'all') {
      filtered = filtered.filter(a => a.subjectName === assesseeFilter);
    }

    if (assessorFilter !== 'all') {
      filtered = filtered.filter(a => a.assessorName === assessorFilter);
    }

    return filtered;
  };

  const calculateTotals = (scores) => {
    if (!scores) return { totalContribution: 0, totalGrowth: 0 };
    
    const contribution = (scores.culture?.contribution || 0) + 
                        (scores.competencies?.contribution || 0) + 
                        (scores.execution?.contribution || 0);
    
    const growth = (scores.culture?.growth || 0) + 
                  (scores.competencies?.growth || 0) + 
                  (scores.execution?.growth || 0);
    
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        <Card className="mb-6">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({filterCounts.all})
                </button>
                <button
                  onClick={() => setFilterType('aligned')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'aligned'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Aligned ({filterCounts.aligned})
                </button>
                <button
                  onClick={() => setFilterType('not-aligned')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'not-aligned'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Not Aligned ({filterCounts.notAligned})
                </button>
                <button
                  onClick={() => setFilterType('hrp-requests')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'hrp-requests'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  HRP Requests ({filterCounts.hrpRequests})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Filter by Assessee
                </label>
                <select
                  value={assesseeFilter}
                  onChange={(e) => setAssesseeFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Assessees</option>
                  {uniqueAssessees.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Filter by Assessor
                </label>
                <select
                  value={assessorFilter}
                  onChange={(e) => setAssessorFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Assessors</option>
                  {uniqueAssessors.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredAssessments.length} of {assessments.length} assessments
            {(filterType !== 'all' || assesseeFilter !== 'all' || assessorFilter !== 'all') && (
              <span className="text-blue-600 ml-1">(filtered)</span>
            )}
          </p>
        </div>

        {filteredAssessments.length === 0 ? (
          <Card className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assessments Found</h3>
            <p className="text-gray-600">
              {filterType !== 'all' || assesseeFilter !== 'all' || assessorFilter !== 'all'
                ? 'Try adjusting your filter criteria'
                : 'No assessments have been completed yet'}
            </p>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto relative">
              <table className="w-full relative" style={{ minWidth: '1400px' }}>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="sticky left-0 z-30 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-r border-gray-200" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                      Action
                    </th>
                    <th className="sticky left-[110px] z-30 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-r border-gray-200" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                      MSH ID
                    </th>
                    <th className="sticky left-[210px] z-30 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-r-4 border-blue-400" style={{ boxShadow: '3px 0 8px -2px rgba(0,0,0,0.15)' }}>
                      Assessee
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Assessor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Type
                    </th>
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
                      <tr key={assessment.id} className="hover:bg-gray-50 group">
                        
                        <td className="sticky left-0 z-20 px-4 py-4 text-center bg-white group-hover:bg-gray-50 border-r border-gray-200" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewAssessment(assessment)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </td>

                        <td className="sticky left-[110px] z-20 px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50 border-r border-gray-200" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                          <Badge variant="primary" className="text-xs font-mono">
                            {assessment.mshId || 'N/A'}
                          </Badge>
                        </td>

                        <td className="sticky left-[210px] z-20 px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50 border-r-4 border-blue-400" style={{ boxShadow: '3px 0 8px -2px rgba(0,0,0,0.15)' }}>
                          <div className="text-sm font-medium text-gray-900">{assessment.subjectName}</div>
                          <div className="text-xs text-gray-500">{assessment.subjectLayer}</div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50">
                          <div className="text-sm text-gray-900">{assessment.assessorName}</div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50">
                          <Badge variant="secondary" className="text-xs">
                            {assessment.assessmentType === '360' || assessment.type === '360' ? '360' : '1x1'}
                          </Badge>
                        </td>

                        <td className="px-4 py-4 text-center bg-white group-hover:bg-gray-50">
                          {assessment.nineBoxPosition ? (
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {assessment.nineBoxPosition}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center bg-white group-hover:bg-gray-50">
                          {assessment.alignmentStatus === 'aligned' || assessment.status === 'completed' ? (
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

                        <td className="px-4 py-4 text-center bg-white group-hover:bg-gray-50">
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

                        <td className="px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50">
                          <div 
                            className="text-sm text-gray-900 font-mono font-semibold cursor-help" 
                            title={getPillarDisplayName(assessment.subjectPillar)}
                          >
                            {getTruncatedPillarName(assessment.subjectPillar)}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50">
                          <div className="text-sm text-gray-500">
                            {getSubPillarDisplayName(assessment.subjectSubPillar || assessment.subPillar)}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center bg-white group-hover:bg-gray-50">
                          <span className="text-lg font-bold text-blue-600">
                            {assessment.composite || 0}
                          </span>
                          <span className="text-xs text-gray-500">/12</span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center bg-white group-hover:bg-gray-50">
                          <span className="text-sm font-semibold text-orange-600">
                            {totals.totalContribution}
                          </span>
                          <span className="text-xs text-gray-500">/6</span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center bg-white group-hover:bg-gray-50">
                          <span className="text-sm font-semibold text-green-600">
                            {totals.totalGrowth}
                          </span>
                          <span className="text-xs text-gray-500">/6</span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50">
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