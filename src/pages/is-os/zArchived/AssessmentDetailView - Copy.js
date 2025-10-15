import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

/**
 * Assessment Detail View
 * 
 * Read-only view of a completed assessment
 */
function AssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load assessment
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        setLoading(true);
        setError(null);

        const assessmentRef = doc(db, 'assessments', id);
        const assessmentDoc = await getDoc(assessmentRef);

        if (!assessmentDoc.exists()) {
          setError('Assessment not found');
          return;
        }

        setAssessment({ id: assessmentDoc.id, ...assessmentDoc.data() });
      } catch (err) {
        console.error('Error loading assessment:', err);
        setError('Failed to load assessment');
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [id]);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get display status
  const getDisplayStatus = () => {
    if (!assessment) return 'Draft';
    if (assessment.status === 'draft') return 'Draft';
    if (assessment.alignmentStatus === 'aligned' || assessment.status === 'completed') return 'Aligned';
    if (assessment.alignmentStatus === 'needs-alignment' || assessment.status === 'not-aligned') return 'Not Aligned';
    return 'Draft';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading assessment...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/is-os/assessments/history')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessment History
          </Button>
          
          <Card className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The assessment you are looking for does not exist.'}</p>
            <Button onClick={() => navigate('/is-os/assessments/history')}>
              Return to Assessment History
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const displayStatus = getDisplayStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/is-os/assessments/history')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessment History
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Details</h1>
              <p className="text-gray-600">MSH ID: <span className="font-semibold text-blue-600">{assessment.mshId}</span></p>
            </div>
            
            {/* Status Badge */}
            <div>
              {displayStatus === 'Aligned' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Aligned</span>
                </div>
              )}
              {displayStatus === 'Not Aligned' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-lg border border-orange-200">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Not Aligned</span>
                </div>
              )}
              {displayStatus === 'Draft' && (
                <div className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg border border-gray-200">
                  <span className="font-semibold">Draft</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assessee & Assessor Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Assessee Card */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessee</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {assessment.assesseeName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-xl">{assessment.assesseeName}</div>
                <div className="text-sm text-gray-600">{assessment.assesseeLayer}</div>
                <div className="text-sm text-gray-600">{assessment.assesseePillar}</div>
              </div>
            </div>
          </Card>

          {/* Assessor Card */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessor</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {assessment.assessorName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-xl">{assessment.assessorName}</div>
                <div className="text-sm text-gray-600">{assessment.assessorLayer}</div>
                <div className="text-sm text-gray-600">{formatDate(assessment.createdAt)}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Score Summary */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Summary</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-4xl font-bold text-orange-600">{assessment.totalContribution ?? 0}</div>
              <div className="text-sm text-gray-600">Contribution</div>
              <div className="text-xs text-gray-500">0-6 scale</div>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-4xl font-bold text-green-600">{assessment.totalGrowth ?? 0}</div>
              <div className="text-sm text-gray-600">Growth</div>
              <div className="text-xs text-gray-500">0-6 scale</div>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-5xl font-bold text-blue-600">{assessment.composite ?? 0}</div>
              <div className="text-sm text-gray-600">Composite</div>
              <div className="text-xs text-gray-500">0-12 scale</div>
            </div>
          </div>

          {assessment.nineBoxPosition && (
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-2">Nine-Box Position</div>
              <div className="text-xl font-bold text-gray-900">{assessment.nineBoxPosition}</div>
            </div>
          )}
        </Card>

        {/* Detailed Scores Grid */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Scores</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Domain</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Contribution</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Growth</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Culture</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-800 rounded-lg font-bold">
                      {assessment.scores?.culture ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-800 rounded-lg font-bold">
                      {assessment.scores?.mindset ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {(assessment.scores?.culture ?? 0) + (assessment.scores?.mindset ?? 0)}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Competencies</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-800 rounded-lg font-bold">
                      {assessment.scores?.competencies ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-800 rounded-lg font-bold">
                      {assessment.scores?.skillset ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {(assessment.scores?.competencies ?? 0) + (assessment.scores?.skillset ?? 0)}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Execution</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-800 rounded-lg font-bold">
                      {assessment.scores?.execution ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-800 rounded-lg font-bold">
                      {assessment.scores?.habits ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {(assessment.scores?.execution ?? 0) + (assessment.scores?.habits ?? 0)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Assessment Notes - 6-Box Layout */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Notes</h3>
          
          {/* Domain-Specific Notes (Top Row) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Culture Notes</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap">
                {assessment.notes?.culture || 'No notes provided'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competencies Notes</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap">
                {assessment.notes?.competencies || 'No notes provided'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Execution Notes</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap">
                {assessment.notes?.execution || 'No notes provided'}
              </div>
            </div>
          </div>

          {/* Development Framework (Bottom Row) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Strengths</label>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap">
                {assessment.notes?.strengths || 'No notes provided'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Development Areas</label>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap">
                {assessment.notes?.developmentAreas || 'No notes provided'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Items</label>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 min-h-[100px] text-sm text-gray-700 whitespace-pre-wrap">
                {assessment.notes?.actionItems || 'No notes provided'}
              </div>
            </div>
          </div>
        </Card>

        {/* Alignment Status */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alignment Status</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-gray-700">Status:</div>
              <div>
                {displayStatus === 'Aligned' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold">Aligned - Mutual agreement reached</span>
                  </div>
                )}
                {displayStatus === 'Not Aligned' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg border border-orange-200">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold">Not Aligned - Requires further discussion</span>
                  </div>
                )}
                {displayStatus === 'Draft' && (
                  <div className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg border border-gray-200">
                    <span className="font-semibold">Draft - Assessment not completed</span>
                  </div>
                )}
              </div>
            </div>

            {assessment.hrpRequested && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">HRP Involvement Requested</div>
                    <p className="text-sm text-gray-600 mt-1">
                      This assessment has been flagged for Human Resources Partner follow-up.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}

export default AssessmentDetail;