// 📁 SAVE TO: src/pages/is-os/AssessmentHistory.jsx
// ✅ NEW: Two-tab architecture - Assessments vs Published MSH Scores
// ✅ FIXED: Separate data sources and viewing logic

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ArrowLeft, Eye, CheckCircle, AlertCircle, User, Shield, Award, FileText
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

function AssessmentHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('msh'); // 'msh' or 'assessments'
  
  // Data states
  const [assessments, setAssessments] = useState([]);
  const [mshScores, setMshScores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states - Assessments Tab
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState('all');
  const [assesseeFilter, setAssesseeFilter] = useState('all');
  const [assessorFilter, setAssessorFilter] = useState('all');
  const [showSelfAssessments, setShowSelfAssessments] = useState(false);
  
  // Filter states - MSH Tab
  const [mshTypeFilter, setMshTypeFilter] = useState('all');
  const [mshSubjectFilter, setMshSubjectFilter] = useState('all');
  const [alignmentFilter, setAlignmentFilter] = useState('all');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch assessments
      const assessmentsRef = collection(db, 'assessments');
      const assessmentsQuery = query(assessmentsRef, orderBy('completedAt', 'desc'));
      const assessmentsSnap = await getDocs(assessmentsQuery);
      
      // Fetch MSH scores
      const mshRef = collection(db, 'mshScores');
      const mshQuery = query(mshRef, orderBy('publishedAt', 'desc'));
      const mshSnap = await getDocs(mshQuery);
      
      // Fetch users for name mapping
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const usersMap = {};
      usersSnap.docs.forEach(doc => {
        const userData = doc.data();
        usersMap[userData.userId] = userData;
        usersMap[userData.uid] = userData;
      });
      
      // Process assessments
      const assessmentsList = assessmentsSnap.docs.map(doc => {
        const data = doc.data();
        const subjectData = usersMap[data.subjectId] || {};
        const assessorData = usersMap[data.assessorId] || {};
        
        return {
          id: doc.id,
          ...data,
          completedAt: data.completedAt?.toDate?.() || null,
          subjectName: data.subjectName || subjectData.displayName || 'Unknown',
          assessorName: data.assessorName || assessorData.displayName || 'Unknown',
          isSelf: data.assessmentType === 'self' || data.isSelfAssessment || data.assessorId === data.subjectId
        };
      });
      
      // Process MSH scores
      const mshList = mshSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          publishedAt: data.publishedAt?.toDate?.() || null
        };
      });
      
      setAssessments(assessmentsList);
      setMshScores(mshList);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Assessment tab filters
  const uniqueAssessees = useMemo(() => {
    const filtered = showSelfAssessments ? assessments : assessments.filter(a => !a.isSelf);
    return [...new Set(filtered.map(a => a.subjectName))].sort();
  }, [assessments, showSelfAssessments]);

  const uniqueAssessors = useMemo(() => {
    const filtered = showSelfAssessments ? assessments : assessments.filter(a => !a.isSelf);
    return [...new Set(filtered.map(a => a.assessorName))].sort();
  }, [assessments, showSelfAssessments]);

  // MSH tab filters
  const uniqueMshSubjects = useMemo(() => {
    return [...new Set(mshScores.map(m => m.subjectName))].sort();
  }, [mshScores]);

  // Filtered assessments
  const filteredAssessments = useMemo(() => {
    let filtered = showSelfAssessments ? assessments : assessments.filter(a => !a.isSelf);

    if (assessmentTypeFilter !== 'all') {
      if (assessmentTypeFilter === 'self') {
        filtered = filtered.filter(a => a.isSelf);
      } else if (assessmentTypeFilter === '1x1') {
        filtered = filtered.filter(a => !a.isSelf && a.cycleType !== '360');
      } else if (assessmentTypeFilter === '360') {
        filtered = filtered.filter(a => !a.isSelf && a.cycleType === '360');
      }
    }

    if (assesseeFilter !== 'all') {
      filtered = filtered.filter(a => a.subjectName === assesseeFilter);
    }

    if (assessorFilter !== 'all') {
      filtered = filtered.filter(a => a.assessorName === assessorFilter);
    }

    return filtered;
  }, [assessments, showSelfAssessments, assessmentTypeFilter, assesseeFilter, assessorFilter]);

  // Filtered MSH scores
  const filteredMshScores = useMemo(() => {
    let filtered = [...mshScores];

    if (mshTypeFilter !== 'all') {
      filtered = filtered.filter(m => m.mshType === mshTypeFilter);
    }

    if (mshSubjectFilter !== 'all') {
      filtered = filtered.filter(m => m.subjectName === mshSubjectFilter);
    }

    if (alignmentFilter !== 'all') {
      filtered = filtered.filter(m => m.alignment === alignmentFilter);
    }

    return filtered;
  }, [mshScores, mshTypeFilter, mshSubjectFilter, alignmentFilter]);

  const handleViewAssessment = (assessment) => {
    // Navigate to assessment detail view (read-only)
    navigate(`/is-os/assessments/view/${assessment.id}`);
  };

  const handleViewMsh = (msh) => {
    // Navigate to MSH detail view
    navigate(`/is-os/msh/${msh.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

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
            View assessments and published MSH scores
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('msh')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'msh'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span>Published MSH Scores</span>
                <Badge variant="secondary" className="ml-2">{mshScores.length}</Badge>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'assessments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>All Assessments</span>
                <Badge variant="secondary" className="ml-2">{assessments.length}</Badge>
              </div>
            </button>
          </div>
        </div>

        {/* MSH Scores Tab */}
        {activeTab === 'msh' && (
          <>
            {/* MSH Filters */}
            <Card className="mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    MSH Type
                  </label>
                  <select
                    value={mshTypeFilter}
                    onChange={(e) => setMshTypeFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Types</option>
                    <option value="1x1">1x1 Only</option>
                    <option value="360">360° Only</option>
                  </select>
                </div>

                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Subject
                  </label>
                  <select
                    value={mshSubjectFilter}
                    onChange={(e) => setMshSubjectFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Subjects</option>
                    {uniqueMshSubjects.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Alignment
                  </label>
                  <select
                    value={alignmentFilter}
                    onChange={(e) => setAlignmentFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Alignments</option>
                    <option value="aligned">Aligned</option>
                    <option value="not-aligned">Not Aligned</option>
                  </select>
                </div>
              </div>
            </Card>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Showing {filteredMshScores.length} of {mshScores.length} MSH scores
              </p>
            </div>

            {/* MSH Table */}
            {filteredMshScores.length === 0 ? (
              <Card className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No MSH Scores Found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </Card>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MSH ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Subject</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Composite</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Nine-Box</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Alignment</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cycle</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Published</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMshScores.map((msh) => (
                        <tr key={msh.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 text-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleViewMsh(msh)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono font-semibold text-indigo-600">
                              {msh.mshId}
                            </span>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge variant="secondary" className="text-xs">
                              {msh.mshType === '360' ? '360°' : '1x1'}
                            </Badge>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{msh.subjectName}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="text-lg font-bold text-blue-600">
                              {msh.composite || 0}
                            </span>
                            <span className="text-xs text-gray-500">/12</span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            {msh.nineBoxPosition ? (
                              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                {msh.nineBoxPosition}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            {msh.alignment === 'aligned' ? (
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

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{msh.cycleName || 'N/A'}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {msh.publishedAt?.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              }) || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Assessments Tab */}
        {activeTab === 'assessments' && (
          <>
            {/* Assessment Filters */}
            <Card className="mb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-xs">
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        Assessment Type
                      </label>
                      <select
                        value={assessmentTypeFilter}
                        onChange={(e) => setAssessmentTypeFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="all">All Types</option>
                        <option value="1x1">1x1 Only</option>
                        <option value="360">360° Only</option>
                        <option value="self">Self Only</option>
                      </select>
                    </div>

                    <div className="flex-1 max-w-xs">
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        Assessee
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
                        Assessor
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

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={showSelfAssessments}
                      onChange={(e) => setShowSelfAssessments(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <User className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Show Self-Assessments</span>
                  </label>
                </div>
              </div>
            </Card>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Showing {filteredAssessments.length} of {assessments.length} assessments
              </p>
            </div>

            {/* Assessments Table */}
            {filteredAssessments.length === 0 ? (
              <Card className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assessments Found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </Card>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assessment ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assessee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assessor</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MSH ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAssessments.map((assessment) => (
                        <tr 
                          key={assessment.id} 
                          className={`hover:bg-gray-50 transition-colors ${assessment.isSelf ? 'bg-purple-50/30' : ''}`}
                        >
                          <td className="px-4 py-4 text-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleViewAssessment(assessment)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono text-gray-600">{assessment.id}</span>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {assessment.isSelf ? (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                <User className="w-3 h-3 mr-1" />
                                SELF
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {assessment.cycleType === '360' ? '360°' : '1x1'}
                              </Badge>
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{assessment.subjectName}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{assessment.assessorName}</div>
                          </td>

                          <td className="px-4 py-4 text-center">
                            {assessment.status === 'completed' || assessment.alignmentStatus === 'aligned' ? (
                              <Badge variant="success" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            ) : assessment.status === 'draft' ? (
                              <Badge variant="secondary" className="text-xs">
                                Draft
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="text-xs">
                                Pending
                              </Badge>
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {assessment.isSelf ? (
                              <div className="flex items-center gap-1 text-xs text-purple-600">
                                <Shield className="w-3 h-3" />
                                <span className="font-medium">Supporting</span>
                              </div>
                            ) : assessment.impact?.mshId ? (
                              <span className="text-sm font-mono font-semibold text-indigo-600">
                                {assessment.impact.mshId}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {assessment.completedAt?.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              }) || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default AssessmentHistory;