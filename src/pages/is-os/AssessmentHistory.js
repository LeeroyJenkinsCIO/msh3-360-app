// 📁 SAVE TO: src/pages/is-os/AssessmentHistory.jsx
// ✅ MSH Tab: Shows hrpReviewRequested + publisherNotes (manager's alignment reasoning)
// ✅ Assessments Tab: Shows hrpRequested + notes (assessor's feedback)
// 📝 Publisher notes explain WHY the MSH is aligned or not aligned

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
  
  // Modal state for viewing publisher notes
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedMshForNotes, setSelectedMshForNotes] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Helper function to check if assessment has notes
  const hasNotes = (item) => {
    if (!item || !item.notes) return false;
    const noteValues = Object.values(item.notes);
    return noteValues.some(note => note && note.trim().length > 0);
  };

  // Helper function to check if MSH has publisher notes
  const hasPublisherNotes = (msh) => {
    // MSH records have publisherNotes field (manager's alignment reasoning)
    if (!msh || !msh.publisherNotes) return false;
    
    // Handle object format (new MSH³ structure with culture, competencies, execution, general)
    if (typeof msh.publisherNotes === 'object') {
      const noteValues = Object.values(msh.publisherNotes);
      return noteValues.some(note => note && typeof note === 'string' && note.trim().length > 0);
    }
    
    // Handle string format (legacy)
    if (typeof msh.publisherNotes === 'string') {
      return msh.publisherNotes.trim().length > 0;
    }
    
    return false;
  };

  // Helper function for notes indicator (MSH tab - clickable to view publisher notes)
  const getNotesIndicator = (msh) => {
    const hasNotes = hasPublisherNotes(msh);
    
    if (hasNotes) {
      return (
        <button
          onClick={() => {
            setSelectedMshForNotes(msh);
            setShowNotesModal(true);
          }}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 transition-colors cursor-pointer"
        >
          ✓ View
        </button>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-300">
        None
      </span>
    );
  };

  // Helper function for assessment notes indicator (Assessments tab - non-clickable)
  const getAssessmentNotesIndicator = (hasNotesValue) => {
    if (hasNotesValue) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          ✓ Yes
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-300">
        No
      </span>
    );
  };

  // Helper function for HRP Status indicator for MSH Scores
  const getHRPStatusIndicator = (item) => {
    // MSH scores only have hrpReviewRequested (boolean), not hrpReviewStatus
    if (!item.hrpReviewRequested) {
      return <span className="text-gray-400">—</span>;
    }
    
    // If HRP was requested, show the HRP badge (we don't track reviewed status at MSH level)
    return (
      <Badge variant="warning" className="text-xs">
        <AlertCircle className="w-3 h-3 mr-1" />
        HRP
      </Badge>
    );
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL assessments (use createdAt to include published MSHs)
      const assessmentsRef = collection(db, 'assessments');
      const assessmentsQuery = query(assessmentsRef, orderBy('createdAt', 'desc'));
      const assessmentsSnap = await getDocs(assessmentsQuery);
      
      // Fetch MSH scores
      const mshRef = collection(db, 'mshs');
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
          mshPublishedAt: data.mshPublishedAt?.toDate?.() || null,
          createdAt: data.createdAt?.toDate?.() || null,
          subjectName: data.subjectName || subjectData.displayName || 'Unknown',
          assessorName: data.assessorName || assessorData.displayName || 'Unknown',
          isSelf: data.assessmentType === 'self' || data.isSelfAssessment || data.assessorId === data.subjectId
        };
      }).filter(assessment => {
        // Only show SUBMITTED assessments (exclude pending and in-progress)
        const submittedStatuses = ['completed', 'published', 'calibrated'];
        return submittedStatuses.includes(assessment.status);
      });
      
      // Process MSH scores
      const mshList = mshSnap.docs.map(doc => {
        const data = doc.data();
        
        // Look up publisher name from publishedBy uid
        const publisherData = usersMap[data.publishedBy] || {};
        const publishedByName = publisherData.displayName || 'Unknown';
        
        // Determine assessor display
        let assessorDisplay;
        if (data.assessmentType === '360') {
          assessorDisplay = 'Multiple';
        } else {
          assessorDisplay = data.assessorName || 'Unknown';
        }
        return {
          id: doc.id,
          ...data,
          publishedAt: data.publishedAt?.toDate?.() || null,
          publishedByName,
          assessorDisplay
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
      } else {
        filtered = filtered.filter(a => a.cycleType === assessmentTypeFilter);
      }
    }

    if (assesseeFilter !== 'all') {
      filtered = filtered.filter(a => a.subjectName === assesseeFilter);
    }

    if (assessorFilter !== 'all') {
      filtered = filtered.filter(a => a.assessorName === assessorFilter);
    }

    return filtered;
  }, [assessments, assessmentTypeFilter, assesseeFilter, assessorFilter, showSelfAssessments]);

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
      if (alignmentFilter === 'aligned') {
        filtered = filtered.filter(m => m.isAligned);
      } else {
        filtered = filtered.filter(m => !m.isAligned);
      }
    }

    return filtered;
  }, [mshScores, mshTypeFilter, mshSubjectFilter, alignmentFilter]);

  const handleViewAssessment = (assessment) => {
    // Navigate to assessment detail view (read-only) with history state
    navigate(`/is-os/assessments/view/${assessment.id}`, {
      state: { from: 'history' }
    });
  };

  const handleViewMsh = (msh) => {
    // Navigate to MSH detail view with history state
    navigate(`/is-os/msh/${msh.id}`, {
      state: { from: 'history' }
    });
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assessor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Published By</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Composite</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Nine-Box</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Alignment</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">HRP Status</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                          Publisher Notes
                        </th>
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

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{msh.assessorDisplay}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{msh.publishedByName}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="text-lg font-bold text-blue-600">
                              {msh.compositeScore || 0}
                            </span>
                            <span className="text-xs text-gray-500">/12</span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            {msh.nineBoxPlacement ? (
                              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                {msh.nineBoxPlacement}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            {msh.isAligned ? (
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

                          <td className="px-4 py-4 text-center">
                            {getHRPStatusIndicator(msh)}
                          </td>

                          <td className="px-4 py-4 text-center">
                            {getNotesIndicator(msh)}
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assessee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assessor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cycle</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Composite</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Notes</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MSH ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Submitted</th>
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

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{assessment.cycleName || 'N/A'}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {assessment.compositeScore || assessment.composite ? (
                              <>
                                <span className="text-lg font-bold text-blue-600">
                                  {assessment.compositeScore || assessment.composite || 0}
                                </span>
                                <span className="text-xs text-gray-500">/12</span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>


                          <td className="px-4 py-4 text-center">
                            {getAssessmentNotesIndicator(hasNotes(assessment))}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {assessment.isSelf ? (
                              <div className="flex items-center gap-1 text-xs text-purple-600">
                                <Shield className="w-3 h-3" />
                                <span className="font-medium">Supporting</span>
                              </div>
                            ) : (assessment.mshId || assessment.impact?.mshId) ? (
                              <span className="text-sm font-mono font-semibold text-indigo-600">
                                {assessment.mshId || assessment.impact.mshId}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {(assessment.completedAt || assessment.mshPublishedAt || assessment.createdAt)?.toLocaleDateString('en-US', { 
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

      {/* Publisher Notes Modal */}
      {showNotesModal && selectedMshForNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Publisher Notes</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    MSH ID: <span className="font-mono font-semibold text-indigo-600">{selectedMshForNotes.mshId}</span> | 
                    Subject: <span className="font-semibold">{selectedMshForNotes.subjectName}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedMshForNotes(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Alignment Status */}
              <div className="mb-4">
                <span className="text-sm font-semibold text-gray-700">Alignment Status: </span>
                {selectedMshForNotes.isAligned ? (
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
              </div>

              {/* Publisher Notes Content */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Manager's Alignment Reasoning:</h3>
                <div className="text-gray-800">
                  {(() => {
                    const notes = selectedMshForNotes.publisherNotes;
                    
                    // Handle object format (MSH³ structure)
                    if (notes && typeof notes === 'object') {
                      const domains = ['culture', 'competencies', 'execution', 'general'];
                      const hasAnyNotes = domains.some(d => notes[d] && notes[d].trim().length > 0);
                      
                      if (!hasAnyNotes) {
                        return <em className="text-gray-500">No publisher notes provided</em>;
                      }
                      
                      return (
                        <div className="space-y-3">
                          {domains.map(domain => {
                            if (!notes[domain] || notes[domain].trim().length === 0) return null;
                            return (
                              <div key={domain}>
                                <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                                  {domain === 'general' ? '📋 General' : domain}
                                </div>
                                <div className="text-sm text-gray-800 whitespace-pre-wrap pl-2">
                                  {notes[domain]}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    
                    // Handle string format (legacy)
                    if (notes && typeof notes === 'string') {
                      return <div className="whitespace-pre-wrap">{notes}</div>;
                    }
                    
                    return <em className="text-gray-500">No publisher notes provided</em>;
                  })()}
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Published By:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedMshForNotes.publisherName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Published:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedMshForNotes.publishedAt?.toDate?.()?.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Composite Score:</span>
                    <span className="ml-2 font-bold text-blue-600">{selectedMshForNotes.compositeScore}/12</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Nine-Box:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedMshForNotes.nineBoxPlacement || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedMshForNotes(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssessmentHistory;