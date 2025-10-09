import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FileSpreadsheet, Filter, Download, CheckCircle, AlertCircle } from 'lucide-react';

const AssessmentHistoryPage = () => {
  const { user, permissions } = useAuth();
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessmentHistory();
  }, []);

  const loadAssessmentHistory = async () => {
    try {
      setLoading(true);
      
      // Load from assessmentHistory collection
      const historyRef = collection(db, 'assessmentHistory');
      const historyQuery = query(historyRef, orderBy('publishedAt', 'desc'));
      
      const snapshot = await getDocs(historyQuery);
      const allAssessments = [];
      
      snapshot.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        allAssessments.push(data);
      });

      // Filter assessments based on user permissions
      const filteredAssessments = filterAssessmentsByPermission(allAssessments);
      
      setAssessments(filteredAssessments);
      setLoading(false);
    } catch (error) {
      console.error('Error loading assessment history:', error);
      setLoading(false);
    }
  };

  // Filter assessments based on user role and permissions
  const filterAssessmentsByPermission = (assessments) => {
    if (!user) return [];

    const userRole = user.role?.toLowerCase();

    // Admin and ISE: View ALL assessments
    if (userRole === 'admin' || userRole === 'ise') {
      return assessments;
    }

    // ISL: View own pillar + assessments for their team
    if (userRole === 'isl') {
      return assessments.filter(assessment => {
        // Check if assessment is in user's pillar
        if (assessment.pillar === user.pillar) return true;
        
        // Check if user is a participant
        const isParticipant = assessment.participants?.some(
          p => p.email === user.email || p.uid === user.uid
        );
        if (isParticipant) return true;
        
        // Check if any participant is in user's pillar (team member)
        const hasTeamMember = assessment.participants?.some(
          p => p.pillar === user.pillar
        );
        return hasTeamMember;
      });
    }

    // ISF: View ONLY assessments where they are a participant
    if (userRole === 'isf') {
      return assessments.filter(assessment => {
        return assessment.participants?.some(
          p => p.email === user.email || p.uid === user.uid
        );
      });
    }

    // Project Lead: View project assessments
    if (userRole === 'projectlead') {
      return assessments.filter(assessment => {
        // View assessments they published or project-related assessments
        if (assessment.publishedBy === user.uid) return true;
        if (assessment.mshType?.toLowerCase().includes('project')) return true;
        return false;
      });
    }

    // Default: No access
    return [];
  };

  const getCompositeAverage = (participants) => {
    if (!participants || participants.length === 0) return null;
    const total = participants.reduce((sum, p) => sum + (p.composite || 0), 0);
    return (total / participants.length).toFixed(2);
  };

  const getCompositeDescription = (compositeAvg) => {
    if (!compositeAvg) return '-';
    const score = parseFloat(compositeAvg);
    if (score >= 0 && score <= 4) return 'Critical Misalignment';
    if (score >= 5 && score <= 8) return 'Developing Alignment';
    if (score >= 9 && score <= 12) return 'Strong Alignment';
    return '-';
  };

  const getCompositeColor = (compositeAvg) => {
    if (!compositeAvg) return 'bg-gray-100 text-gray-800';
    const score = parseFloat(compositeAvg);
    if (score >= 0 && score <= 4) return 'bg-red-100 text-red-800';
    if (score >= 5 && score <= 8) return 'bg-yellow-100 text-yellow-800';
    if (score >= 9 && score <= 12) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (assessment) => {
    if (assessment.alignmentStatus === 'with-discrepancies') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
          <AlertCircle className="w-3 h-3" />
          With Discrepancies
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
        <CheckCircle className="w-3 h-3" />
        Aligned
      </span>
    );
  };

  const handleExportCSV = () => {
    // CSV Export functionality
    const headers = ['MSH ID', 'Type', 'Description', 'Participants', 'Composite', 'Status', 'Published Date'];
    const rows = assessments.map(a => [
      a.mshId,
      a.mshType || '-',
      a.mshDescription || '-',
      a.participants?.map(p => p.name).join(', ') || '-',
      getCompositeAverage(a.participants) || '-',
      a.alignmentStatus === 'aligned' ? 'Aligned' : 'With Discrepancies',
      new Date(a.publishedAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `msh3-assessment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewAssessment = (sessionId) => {
    // Navigate to comparison page with sessionId
    navigate('/comparison', { state: { sessionId } });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-center">
        <p className="text-gray-600">Loading assessment history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <FileSpreadsheet className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Assessment History</h2>
        </div>
        <p className="text-gray-600">
          Published 360° assessments with MSH IDs
          {user?.role === 'isf' && ' (showing only your assessments)'}
          {user?.role === 'isl' && ' (showing your pillar assessments)'}
          {(user?.role === 'admin' || user?.role === 'ise') && ' (showing all assessments)'}
        </p>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={assessments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Data Table */}
      {assessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessments Available</h3>
          <p className="text-gray-600 mb-6">
            {user?.role === 'isf' 
              ? "You don't have any published assessments yet. Assessments you participate in will appear here."
              : user?.role === 'isl'
              ? "No assessments found for your pillar yet. Published assessments will appear here."
              : "No published assessments yet. Published assessments will appear here with their MSH IDs."
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">MSH ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Participants</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Composite</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Composite Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assessments.map((assessment) => {
                  const compositeAvg = getCompositeAverage(assessment.participants);
                  
                  return (
                    <tr key={assessment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">
                        {assessment.mshId || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {assessment.mshType ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium text-xs">
                            {assessment.mshType}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {assessment.mshDescription || assessment.projectName || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {assessment.participants?.map((p, idx) => (
                          <div key={idx}>
                            {p.name}
                            {idx === 0 && assessment.participants.length > 1 && (
                              <span className="text-gray-400 text-xs ml-1">({p.composite}/12)</span>
                            )}
                          </div>
                        ))}
                        {assessment.participants?.length > 1 && (
                          <div className="text-gray-500 text-xs mt-1">
                            {assessment.participants[1].name}
                            <span className="text-gray-400 ml-1">({assessment.participants[1].composite}/12)</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-base">
                          {compositeAvg || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-3 py-1 rounded-full font-medium ${getCompositeColor(compositeAvg)}`}>
                          {getCompositeDescription(compositeAvg)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(assessment)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => handleViewAssessment(assessment.sessionId)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Technical Details */}
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <details className="cursor-pointer">
              <summary className="text-xs font-semibold text-gray-700 hover:text-gray-900">
                ▶ Technical Details (Session IDs & Dates)
              </summary>
              <div className="mt-3 space-y-2">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="text-xs text-gray-600 flex gap-3 items-center">
                    <span className="font-mono font-semibold text-blue-700">{assessment.mshId}</span>
                    <span className="font-mono text-gray-500">{assessment.sessionId}</span>
                    <span className="text-gray-400">•</span>
                    <span>
                      {new Date(assessment.publishedAt).toLocaleDateString()} {new Date(assessment.publishedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {assessments.length > 0 && (
        <div className="mt-6 text-sm text-gray-600">
          Showing {assessments.length} published tracked assessment{assessments.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default AssessmentHistoryPage;