// 📁 SAVE TO: src/pages/is-os/360PairAssessment.jsx
// 360° Bilateral Assessment - Assess your pair partner (MR/DR or P2P)
// Used during 360 cycles to assess the other person in a pairing
// Does NOT publish MSH - just completes the assessment
// MSH publishing happens later in ThreeSixtyComparisonView

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Send, ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import AssessmentGrid from '../../components/AssessmentGrid';

// MSH³ Framework: 3 Domains × 2 Dimensions = 6 total
const DOMAINS = [
  {
    id: 'culture',
    label: 'Culture',
    description: 'How we show up',
    color: 'purple',
    dimensions: [
      { id: 'contribution', label: 'Contribution' },
      { id: 'growth', label: 'Growth' }
    ]
  },
  {
    id: 'competencies',
    label: 'Competencies',
    description: 'What we know',
    color: 'orange',
    dimensions: [
      { id: 'contribution', label: 'Contribution' },
      { id: 'growth', label: 'Growth' }
    ]
  },
  {
    id: 'execution',
    label: 'Execution',
    description: 'How we deliver',
    color: 'blue',
    dimensions: [
      { id: 'contribution', label: 'Contribution' },
      { id: 'growth', label: 'Growth' }
    ]
  }
];

function PairAssessment360() {
  const params = useParams();
  const assessmentId = params.assessmentId || params.id; // ✅ Try both parameter names
  const navigate = useNavigate();
  const { user } = useAuth();
  
  console.log('🎬 360PairAssessment component mounted:', {
    urlParams: params,
    assessmentId,
    hasUser: !!user,
    userUid: user?.uid
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [assessorInfo, setAssessorInfo] = useState(null);

  const [scores, setScores] = useState({
    culture: { contribution: 1, growth: 1 },
    competencies: { contribution: 1, growth: 1 },
    execution: { contribution: 1, growth: 1 }
  });

  const [notes, setNotes] = useState({
    culture: '',
    competencies: '',
    execution: '',
    general: ''
  });

  useEffect(() => {
    console.log('🔄 360PairAssessment useEffect triggered:', {
      assessmentId,
      hasUser: !!user,
      userUid: user?.uid
    });
    
    if (assessmentId && user) {
      console.log('✅ Conditions met, loading assessment...');
      loadAssessment();
    } else {
      console.warn('⚠️ Missing requirements:', {
        hasAssessmentId: !!assessmentId,
        hasUser: !!user
      });
    }
    
    // Safety timeout - if still loading after 10 seconds, force stop
    const timeout = setTimeout(() => {
      setLoading(false);
      console.error('❌ Loading timeout - forced stop after 10 seconds');
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [assessmentId, user]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      console.log('🚀 Starting to load assessment:', assessmentId);

      const assessmentRef = doc(db, 'assessments', assessmentId);
      const assessmentSnap = await getDoc(assessmentRef);

      if (!assessmentSnap.exists()) {
        console.error('❌ Assessment not found:', assessmentId);
        alert('Assessment not found');
        setLoading(false);
        navigate(-1);
        return;
      }

      const assessmentData = { id: assessmentSnap.id, ...assessmentSnap.data() };
      
      // ✅ NORMALIZE FIELD NAMES: Handle multiple variations
      const assessorUid = assessmentData.assessorUid || assessmentData.giver?.uid || assessmentData.assessorId;
      const subjectUid = assessmentData.subjectUid || assessmentData.receiver?.uid || assessmentData.subjectId;
      
      console.log('📋 360° Assessment loaded:', {
        id: assessmentData.id,
        assessorUid,
        subjectUid,
        currentUser: user.uid,
        status: assessmentData.status,
        hasScores: !!assessmentData.scores
      });
      
      // Normalize the assessment data with consistent field names
      const normalizedAssessment = {
        ...assessmentData,
        assessorUid,
        subjectUid
      };
      
      setAssessment(normalizedAssessment);

      // Verify user is the assessor
      if (assessorUid !== user.uid) {
        console.error('❌ User is not the assessor', {
          assessorUid,
          currentUser: user.uid
        });
        alert('You do not have permission to complete this assessment');
        setLoading(false);
        navigate(-1);
        return;
      }

      // Load subject info
      if (subjectUid) {
        try {
          const subjectRef = doc(db, 'users', subjectUid);
          const subjectSnap = await getDoc(subjectRef);
          if (subjectSnap.exists()) {
            setSubjectInfo({ id: subjectSnap.id, ...subjectSnap.data() });
            console.log('✅ Subject loaded:', subjectSnap.data().displayName);
          } else {
            console.warn('⚠️ Subject user not found:', subjectUid);
          }
        } catch (subjectErr) {
          console.error('❌ Error loading subject:', subjectErr);
        }
      }

      // Load assessor info
      if (assessorUid) {
        try {
          const assessorRef = doc(db, 'users', assessorUid);
          const assessorSnap = await getDoc(assessorRef);
          if (assessorSnap.exists()) {
            setAssessorInfo({ id: assessorSnap.id, ...assessorSnap.data() });
            console.log('✅ Assessor loaded:', assessorSnap.data().displayName);
          } else {
            console.warn('⚠️ Assessor user not found:', assessorUid);
          }
        } catch (assessorErr) {
          console.error('❌ Error loading assessor:', assessorErr);
        }
      }

      // Load existing scores and notes if available
      if (assessmentData.scores) {
        // ✅ MERGE loaded scores with default structure to ensure all fields exist
        const defaultScores = {
          culture: { contribution: 1, growth: 1 },
          competencies: { contribution: 1, growth: 1 },
          execution: { contribution: 1, growth: 1 }
        };
        
        const mergedScores = {
          culture: {
            contribution: assessmentData.scores.culture?.contribution ?? defaultScores.culture.contribution,
            growth: assessmentData.scores.culture?.growth ?? defaultScores.culture.growth
          },
          competencies: {
            contribution: assessmentData.scores.competencies?.contribution ?? defaultScores.competencies.contribution,
            growth: assessmentData.scores.competencies?.growth ?? defaultScores.competencies.growth
          },
          execution: {
            contribution: assessmentData.scores.execution?.contribution ?? defaultScores.execution.contribution,
            growth: assessmentData.scores.execution?.growth ?? defaultScores.execution.growth
          }
        };
        
        console.log('✅ Scores merged:', {
          loaded: assessmentData.scores,
          merged: mergedScores
        });
        
        setScores(mergedScores);
      } else {
        console.log('✅ Using default scores (no scores in assessment)');
      }

      if (assessmentData.notes) {
        // ✅ MERGE loaded notes with default structure to ensure all fields exist
        const defaultNotes = {
          culture: '',
          competencies: '',
          execution: '',
          general: ''
        };
        
        const mergedNotes = {
          culture: assessmentData.notes.culture ?? defaultNotes.culture,
          competencies: assessmentData.notes.competencies ?? defaultNotes.competencies,
          execution: assessmentData.notes.execution ?? defaultNotes.execution,
          general: assessmentData.notes.general ?? defaultNotes.general
        };
        
        console.log('✅ Notes merged:', {
          loaded: assessmentData.notes,
          merged: mergedNotes
        });
        
        setNotes(mergedNotes);
      } else {
        console.log('✅ Using default notes (no notes in assessment)');
      }

      console.log('✅ Assessment loading complete');
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading assessment:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      alert('Error loading assessment: ' + err.message);
      setLoading(false);
      // Don't navigate away on error - let user see what happened
    }
  };

  const handleScoreChange = (domainId, dimensionId, value) => {
    setScores(prev => ({
      ...prev,
      [domainId]: {
        ...prev[domainId],
        [dimensionId]: parseInt(value)
      }
    }));
  };

  const handleNotesChange = (field, value) => {
    setNotes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateComposite = () => {
    let total = 0;
    DOMAINS.forEach(domain => {
      domain.dimensions.forEach(dim => {
        total += scores[domain.id]?.[dim.id] || 0;
      });
    });
    return total;
  };

  const getNineBoxPlacement = () => {
    const contributionTotal = DOMAINS.reduce((sum, domain) => 
      sum + (scores[domain.id]?.contribution || 0), 0);
    const growthTotal = DOMAINS.reduce((sum, domain) => 
      sum + (scores[domain.id]?.growth || 0), 0);

    // Low: 0-2, Mid: 3-4, High: 5-6
    if (contributionTotal >= 5 && growthTotal >= 5) return 'Rising Star';
    if (contributionTotal >= 5 && growthTotal >= 3) return 'High Performer';
    if (contributionTotal >= 5) return 'Developing Driver';
    if (growthTotal >= 5 && contributionTotal >= 3) return 'Proven Contributor';
    if (contributionTotal >= 3 && growthTotal >= 3) return 'Core Contributor';
    if (growthTotal >= 5) return 'Solid Contributor';
    if (contributionTotal >= 3) return 'Growth Driver';
    if (growthTotal >= 3) return 'Untapped Potential';
    return 'Emerging Performer';
  };

  const handleSaveDraft = async () => {
    if (saving) return;

    try {
      setSaving(true);

      const compositeScore = calculateComposite();
      const nineBoxPlacement = getNineBoxPlacement();

      await updateDoc(doc(db, 'assessments', assessmentId), {
        scores: scores,
        notes: notes,
        compositeScore: compositeScore,
        nineBoxPlacement: nineBoxPlacement,
        lastSavedAt: Timestamp.now()
      });

      setSaving(false);
      alert('Draft saved successfully!');
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Error saving draft: ' + err.message);
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Validation
    console.log('🔍 Validating scores before submit:', scores);
    
    const hasAllScores = DOMAINS.every(domain =>
      domain.dimensions.every(dim => {
        const hasScore = scores[domain.id]?.[dim.id] !== undefined;
        console.log(`  ${domain.id}.${dim.id}: ${scores[domain.id]?.[dim.id]} (${hasScore ? '✅' : '❌'})`);
        return hasScore;
      })
    );

    console.log('📊 Validation result:', {
      hasAllScores,
      currentScores: scores
    });

    if (!hasAllScores) {
      alert('Please complete all scores before submitting');
      return;
    }

    if (!notes.general?.trim()) {
      alert('Please provide general feedback notes before submitting');
      return;
    }

    try {
      setSubmitting(true);

      const compositeScore = calculateComposite();
      const nineBoxPlacement = getNineBoxPlacement();

      await updateDoc(doc(db, 'assessments', assessmentId), {
        scores: scores,
        notes: notes,
        compositeScore: compositeScore,
        nineBoxPlacement: nineBoxPlacement,
        status: 'completed',
        completedAt: Timestamp.now(),
        lastSavedAt: Timestamp.now()
      });

      setSubmitting(false);
      alert('360° bilateral assessment submitted successfully!');
      navigate(-1);
    } catch (err) {
      console.error('Error submitting assessment:', err);
      alert('Error submitting assessment: ' + err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Assessment not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isReadOnly = assessment.status === 'completed' || assessment.status === 'published';

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <PageHeader
        mode="360"
        title="360° Bilateral Assessment"
        subtitle="Assess your pair partner using the MSH³ framework"
        subjectName={subjectInfo?.displayName || 'Loading...'}
        assessorName={assessorInfo?.displayName || 'You'}
        status={assessment.status}
        showBackButton={true}
      />

      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        {/* Assessment Grid */}
        <AssessmentGrid
          scores={scores}
          onScoreChange={handleScoreChange}
          readOnly={isReadOnly}
          showComposite={true}
          compositeScore={calculateComposite()}
        />

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Assessment Notes</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">
                Culture Notes
              </label>
              <textarea
                value={notes.culture}
                onChange={(e) => handleNotesChange('culture', e.target.value)}
                disabled={isReadOnly}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                placeholder="Observations about culture and engagement..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-700 mb-2">
                Competencies Notes
              </label>
              <textarea
                value={notes.competencies}
                onChange={(e) => handleNotesChange('competencies', e.target.value)}
                disabled={isReadOnly}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                placeholder="Observations about skills and knowledge..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-2">
                Execution Notes
              </label>
              <textarea
                value={notes.execution}
                onChange={(e) => handleNotesChange('execution', e.target.value)}
                disabled={isReadOnly}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Observations about delivery and results..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              General Feedback
            </label>
            <textarea
              value={notes.general}
              onChange={(e) => handleNotesChange('general', e.target.value)}
              disabled={isReadOnly}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100"
              placeholder="Overall feedback, strengths, areas for development..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Draft
                </>
              )}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Assessment
                </>
              )}
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              This assessment has been {assessment.status === 'published' ? 'published' : 'completed'}.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Hub
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PairAssessment360;