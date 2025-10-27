// 📁 SAVE TO: src/pages/is-os/AssessmentDetailView.js
// ✅ READ-ONLY view of a completed assessment
// ✅ FIXED: Composite score calculated from scores (not from database field)
// ✅ FIXED: Smart back button (goes to hub or history based on navigation state)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, Calendar, User, Award, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import AssessmentGrid from '../../components/AssessmentGrid';

function AssessmentDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Determine where we came from (hub or history)
  const cameFromHistory = location.state?.from === 'history';

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      
      const assessmentRef = doc(db, 'assessments', id);
      const assessmentSnap = await getDoc(assessmentRef);
      
      if (!assessmentSnap.exists()) {
        alert('Assessment not found');
        handleBack();
        return;
      }
      
      const data = assessmentSnap.data();
      setAssessment({
        id: assessmentSnap.id,
        ...data,
        completedAt: data.completedAt?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || null
      });
    } catch (error) {
      console.error('Error fetching assessment:', error);
      alert('Error loading assessment: ' + error.message);
      handleBack();
    } finally {
      setLoading(false);
    }
  };
  
  // ✅ Smart back navigation
  const handleBack = () => {
    if (cameFromHistory) {
      navigate('/is-os/assessments/history');
    } else {
      navigate('/is-os');
    }
  };

  // ✅ Calculate composite from scores (don't use database field)
  const calculateComposite = () => {
    if (!assessment?.scores) return 0;
    
    const scores = assessment.scores;
    return (
      (scores.culture?.contribution || 0) + (scores.culture?.growth || 0) +
      (scores.competencies?.contribution || 0) + (scores.competencies?.growth || 0) +
      (scores.execution?.contribution || 0) + (scores.execution?.growth || 0)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">Assessment not found</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isSelfAssessment = assessment.assessmentType === 'self' || assessment.isSelfAssessment;
  const is360Assessment = assessment.cycleType === '360';
  const compositeScore = calculateComposite();

  // ✅ Helper function to navigate to MSH
  const handleViewMSH = async () => {
    console.log('🔍 Attempting to view MSH. Impact object:', assessment.impact);
    
    // Try using doc ID first
    if (assessment.impact?.mshDocId) {
      console.log('✅ Using mshDocId:', assessment.impact.mshDocId);
      navigate(`/is-os/msh/${assessment.impact.mshDocId}`);
    } else if (assessment.impact?.mshId) {
      console.log('⚠️ No mshDocId found, searching by mshId:', assessment.impact.mshId);
      // Fallback: Search for MSH by formatted ID (for older records)
      try {
        const mshQuery = query(
          collection(db, 'mshs'),
          where('mshId', '==', assessment.impact.mshId)
        );
        const mshSnapshot = await getDocs(mshQuery);
        if (!mshSnapshot.empty) {
          console.log('✅ Found MSH document:', mshSnapshot.docs[0].id);
          navigate(`/is-os/msh/${mshSnapshot.docs[0].id}`);
        } else {
          console.error('❌ MSH not found with mshId:', assessment.impact.mshId);
          alert(`MSH not found with ID: ${assessment.impact.mshId}`);
        }
      } catch (error) {
        console.error('❌ Error finding MSH:', error);
        alert('Error finding MSH: ' + error.message);
      }
    } else {
      console.error('❌ No MSH ID found in impact object');
    }
  };

  // ✅ FIX: Ensure scores are properly extracted as numbers
  const normalizedScores = {
    culture: { 
      contribution: Number(assessment.scores?.culture?.contribution || 0), 
      growth: Number(assessment.scores?.culture?.growth || 0) 
    },
    competencies: { 
      contribution: Number(assessment.scores?.competencies?.contribution || 0), 
      growth: Number(assessment.scores?.competencies?.growth || 0) 
    },
    execution: { 
      contribution: Number(assessment.scores?.execution?.contribution || 0), 
      growth: Number(assessment.scores?.execution?.growth || 0) 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ✅ FIXED: Header with smart back button */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {cameFromHistory ? 'Back to History' : 'Back to Hub'}
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {isSelfAssessment ? 'Self Assessment' : `Assessment: ${assessment.subjectName || 'Unknown'}`}
              </h1>
              <p className="text-blue-100">
                {assessment.cycleName || 'Assessment'} • 
                {assessment.completedAt?.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            
            {/* ✅ FIXED: Composite score calculated from scores */}
            <div className="text-right">
              <div className="text-6xl font-bold mb-1">{compositeScore}</div>
              <div className="text-blue-100 text-sm">Composite Score / 12</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <Card>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Nine-Box Position</div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {assessment.nineBoxPosition || 'Status Quo'}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Alignment Status</div>
              {assessment.alignmentStatus === 'aligned' || assessment.status === 'completed' ? (
                <Badge variant="success" className="text-lg px-4 py-2">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Aligned
                </Badge>
              ) : (
                <Badge variant="warning" className="text-lg px-4 py-2">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Not Aligned
                </Badge>
              )}
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Assessment Type</div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {isSelfAssessment ? 'Self Assessment' : is360Assessment ? '360°' : '1x1'}
              </Badge>
            </div>
          </Card>

        </div>

        {/* Assessment Grid - Read Only */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Assessment Scores</h2>
          <AssessmentGrid 
            scores={normalizedScores}
            onScoreChange={() => {}} // Read-only, no changes allowed
            readOnly={true}
          />
        </Card>

        {/* Assessment Notes */}
        {assessment.notes && (
          <Card className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Assessment Notes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              
              <div>
                <label className="block text-sm font-bold mb-2 text-purple-700">
                  Culture Notes
                </label>
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 text-sm text-gray-700 min-h-[100px]">
                  {assessment.notes.culture || 'No notes provided'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-orange-700">
                  Competencies Notes
                </label>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 text-sm text-gray-700 min-h-[100px]">
                  {assessment.notes.competencies || 'No notes provided'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-green-700">
                  Execution Notes
                </label>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-sm text-gray-700 min-h-[100px]">
                  {assessment.notes.execution || 'No notes provided'}
                </div>
              </div>

            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                General Notes / Overall Comments
              </label>
              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3 text-sm text-gray-700 min-h-[100px]">
                {assessment.notes.general || 'No general notes provided'}
              </div>
            </div>
          </Card>
        )}

        {/* Assessment Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assessment Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Assessee</span>
                <span className="font-semibold text-gray-900">{assessment.subjectName || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assessor</span>
                <span className="font-semibold text-gray-900">{assessment.assessorName || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <Badge variant="secondary">
                  {isSelfAssessment ? 'Self' : is360Assessment ? '360°' : '1x1'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cycle</span>
                <span className="font-semibold text-gray-900">{assessment.cycleName || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* ✅ FIXED: Scores Summary with calculated composite */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Scores Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Contribution</span>
                <span className="text-2xl font-bold text-orange-600">
                  {normalizedScores.culture.contribution + 
                   normalizedScores.competencies.contribution + 
                   normalizedScores.execution.contribution}/6
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Growth</span>
                <span className="text-2xl font-bold text-green-600">
                  {normalizedScores.culture.growth + 
                   normalizedScores.competencies.growth + 
                   normalizedScores.execution.growth}/6
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Composite</span>
                <span className="text-2xl font-bold text-blue-600">
                  {compositeScore}/12
                </span>
              </div>
            </div>
          </Card>

        </div>

        {/* MSH Info if available */}
        {(assessment.impact?.mshId || assessment.impact?.mshDocId) && (
          <Card className="mt-6 bg-indigo-50 border-2 border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-indigo-600" />
                <div>
                  <p className="font-semibold text-indigo-900">Published MSH Score</p>
                  <p className="text-sm text-indigo-700">
                    {assessment.impact.mshId ? (
                      <>MSH ID: <span className="font-mono font-bold">{assessment.impact.mshId}</span></>
                    ) : (
                      <span className="text-indigo-600">MSH available - click to view</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleViewMSH}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View MSH
              </button>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

export default AssessmentDetailView;