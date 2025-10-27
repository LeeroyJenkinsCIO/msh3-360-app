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
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    if (assessmentId && user) {
      loadAssessment();
    }
  }, [assessmentId, user]);

  const loadAssessment = async () => {
    try {
      setLoading(true);

      const assessmentRef = doc(db, 'assessments', assessmentId);
      const assessmentSnap = await getDoc(assessmentRef);

      if (!assessmentSnap.exists()) {
        console.error('Assessment not found:', assessmentId);
        alert('Assessment not found');
        navigate(-1);
        return;
      }

      const assessmentData = { id: assessmentSnap.id, ...assessmentSnap.data() };
      setAssessment(assessmentData);

      // Verify user is the assessor
      if (assessmentData.assessorUid !== user.uid) {
        console.error('User is not the assessor');
        alert('You do not have permission to complete this assessment');
        navigate(-1);
        return;
      }

      // Load subject info
      if (assessmentData.subjectUid) {
        const subjectRef = doc(db, 'users', assessmentData.subjectUid);
        const subjectSnap = await getDoc(subjectRef);
        if (subjectSnap.exists()) {
          setSubjectInfo({ id: subjectSnap.id, ...subjectSnap.data() });
        }
      }

      // Load assessor info
      if (assessmentData.assessorUid) {
        const assessorRef = doc(db, 'users', assessmentData.assessorUid);
        const assessorSnap = await getDoc(assessorRef);
        if (assessorSnap.exists()) {
          setAssessorInfo({ id: assessorSnap.id, ...assessorSnap.data() });
        }
      }

      // Load existing scores and notes if available
      if (assessmentData.scores) {
        setScores(assessmentData.scores);
      }

      if (assessmentData.notes) {
        setNotes(assessmentData.notes);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading assessment:', err);
      alert('Error loading assessment: ' + err.message);
      setLoading(false);
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
    const hasAllScores = DOMAINS.every(domain =>
      domain.dimensions.every(dim => scores[domain.id]?.[dim.id] !== undefined)
    );

    if (!hasAllScores) {
      alert('Please complete all scores before submitting');
      return;
    }

    if (!notes.general.trim()) {
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