// 📁 SAVE TO: src/pages/is-os/SelfAssessmentPage.jsx
// Dedicated Self-Assessment Page - Different from 1x1 assessments
// ✅ CRITICAL: Self-assessments do NOT create MSH directly
// ✅ Self-assessments are INPUT for 360° pairings
// ✅ One self-assessment is reused across ALL 360 pairs where user is subject
// ✅ MSH is created LATER when publisher combines self + other assessment in pairing
// ✅ Submission: Just save scores/notes, set status='completed' - NO publishing, NO alignment, NO HRP
// ✅ NOTES: 4-box domain-aligned structure (Culture, Competencies, Execution, General) - SAME AS 1x1/360

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentGrid from '../../components/AssessmentGrid';
import { Card } from '../../components/ui';
import { User, Save, Send, ArrowLeft, Home, ChevronRight, FileText } from 'lucide-react';

export default function SelfAssessmentPage() {
  const { user } = useAuth();
  const params = useParams();
  const assessmentId = params.id || params.assessmentId;
  const navigate = useNavigate();
  
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Initialize with default values
  const [scores, setScores] = useState({
    culture: { contribution: 1, growth: 1 },
    competencies: { contribution: 1, growth: 1 },
    execution: { contribution: 1, growth: 1 }
  });
  
  // ✅ Domain-aligned notes structure - SAME AS 1x1/360 assessments
  const [notes, setNotes] = useState({
    culture: '',
    competencies: '',
    execution: '',
    general: ''
  });

  // Safe calculation functions
  const calculateComposite = () => {
    try {
      const totalContribution = (scores?.culture?.contribution || 0) + 
                               (scores?.competencies?.contribution || 0) + 
                               (scores?.execution?.contribution || 0);
      const totalGrowth = (scores?.culture?.growth || 0) + 
                         (scores?.competencies?.growth || 0) + 
                         (scores?.execution?.growth || 0);
      return totalContribution + totalGrowth;
    } catch (error) {
      console.error('Error calculating composite:', error);
      return 0;
    }
  };

  const calculateNineBoxPosition = () => {
    try {
      const totalContribution = (scores?.culture?.contribution || 0) + 
                               (scores?.competencies?.contribution || 0) + 
                               (scores?.execution?.contribution || 0);
      const totalGrowth = (scores?.culture?.growth || 0) + 
                         (scores?.competencies?.growth || 0) + 
                         (scores?.execution?.growth || 0);
      const composite = totalContribution + totalGrowth;

      let growthLevel, contribLevel;
      
      if (totalContribution <= 2) contribLevel = 'low';
      else if (totalContribution <= 4) contribLevel = 'mid';
      else contribLevel = 'high';
      
      if (totalGrowth <= 2) growthLevel = 'low';
      else if (totalGrowth <= 4) growthLevel = 'mid';
      else growthLevel = 'high';

      if (composite >= 11 && growthLevel === 'high' && contribLevel === 'high') return 'Transformative Outcome';
      if (growthLevel === 'high' && contribLevel === 'low') return 'Raw Talent';
      if (growthLevel === 'high' && contribLevel === 'mid') return 'High Impact';
      if (growthLevel === 'high' && contribLevel === 'high') return 'High Impact';
      if (growthLevel === 'mid' && contribLevel === 'low') return 'Narrow Contributor';
      if (growthLevel === 'mid' && contribLevel === 'mid') return 'Status Quo';
      if (growthLevel === 'mid' && contribLevel === 'high') return 'Developing Driver';
      if (growthLevel === 'low' && contribLevel === 'low') return 'Critical Risk';
      if (growthLevel === 'low' && contribLevel === 'mid') return 'Inconsistent';
      if (growthLevel === 'low' && contribLevel === 'high') return 'Untapped Potential';
      
      return 'Status Quo';
    } catch (error) {
      console.error('Error calculating nine-box position:', error);
      return 'Status Quo';
    }
  };

  useEffect(() => {
    if (user?.uid && assessmentId) {
      loadAssessment(assessmentId);
    }
  }, [user, assessmentId]);

  const loadAssessment = async (id) => {
    try {
      const assessmentRef = doc(db, 'assessments', id);
      const assessmentSnap = await getDoc(assessmentRef);
      
      if (!assessmentSnap.exists()) {
        alert('Assessment not found');
        navigate(-1);
        return;
      }
      
      const assessmentData = {
        id: assessmentSnap.id,
        ...assessmentSnap.data()
      };
      
      console.log('✅ Loaded self-assessment:', assessmentData);
      
      // Verify this is actually a self-assessment
      if (assessmentData.assessmentType !== 'self' && !assessmentData.isSelfAssessment) {
        console.warn('⚠️ This is not a self-assessment, redirecting...');
        alert('This is not a self-assessment');
        navigate(-1);
        return;
      }
      
      // Load existing scores
      if (assessmentData.scores) {
        setScores({
          culture: {
            contribution: assessmentData.scores?.culture?.contribution ?? 1,
            growth: assessmentData.scores?.culture?.growth ?? 1
          },
          competencies: {
            contribution: assessmentData.scores?.competencies?.contribution ?? 1,
            growth: assessmentData.scores?.competencies?.growth ?? 1
          },
          execution: {
            contribution: assessmentData.scores?.execution?.contribution ?? 1,
            growth: assessmentData.scores?.execution?.growth ?? 1
          }
        });
      }
      
      // ✅ Load existing notes - domain-aligned structure
      if (assessmentData.notes) {
        setNotes({
          culture: assessmentData.notes?.culture || '',
          competencies: assessmentData.notes?.competencies || '',
          execution: assessmentData.notes?.execution || '',
          general: assessmentData.notes?.general || ''
        });
      }
      
      setSelectedAssessment(assessmentData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading assessment:', error);
      alert('Error loading assessment: ' + error.message);
      navigate(-1);
    }
  };

  const handleScoreChange = (domain, dimension, value) => {
    setScores(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [dimension]: parseInt(value)
      }
    }));
  };

  const handleNoteChange = (field, value) => {
    setNotes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveDraft = async () => {
    if (!selectedAssessment) return;

    setSaving(true);
    try {
      const assessmentRef = doc(db, 'assessments', selectedAssessment.id);

      await updateDoc(assessmentRef, {
        scores,
        notes,
        compositeScore: calculateComposite(),
        nineBoxPosition: calculateNineBoxPosition(),
        status: 'in-progress',
        assessorUid: user.uid,
        updatedAt: serverTimestamp()
      });

      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssessment) return;

    setSaving(true);
    try {
      const composite = calculateComposite();
      const nineBoxPosition = calculateNineBoxPosition();
      const assessmentRef = doc(db, 'assessments', selectedAssessment.id);

      // ✅ CRITICAL FIX: Self-assessments just get COMPLETED
      // NO MSH creation, NO publishing, NO alignment
      // This assessment will be used as INPUT in 360 pairings
      await updateDoc(assessmentRef, {
        scores,
        notes,
        compositeScore: composite,
        nineBoxPosition,
        status: 'completed',
        assessorUid: user.uid,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Self-assessment completed - ready for use in 360 pairings');
      console.log('   No MSH created at this stage');
      console.log('   MSH will be created when publisher combines with other assessment in pairing');
      
      alert('Self-assessment submitted successfully!\n\nYour self-assessment will be used in all 360 pairings where you are being assessed.\n\nReturning to hub.');
      navigate(-1);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Failed to submit assessment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading self-assessment...</p>
        </div>
      </div>
    );
  }

  if (!selectedAssessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Assessment not found</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ Page Header with Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button
              onClick={() => navigate('/')}
              className="hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => navigate('/is-os')}
              className="hover:text-purple-600 transition-colors"
            >
              IS-OS Hub
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Self-Assessment</span>
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Self-Assessment</h1>
              <p className="text-sm text-gray-600 mt-1">
                {selectedAssessment.cycleName || `${selectedAssessment.cycleMonth}/${selectedAssessment.cycleYear}`} • 360° Review Cycle
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-purple-900 mb-1">About Self-Assessments</p>
                <p className="text-purple-800">
                  Your self-assessment is used as input for all 360° pairings where you are being assessed. 
                  Be honest and reflective. This assessment will be combined with feedback from managers and peers 
                  to create your final MSH³ scores during the pairing review process.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Assessment Grid */}
        <AssessmentGrid 
          scores={scores}
          onScoreChange={handleScoreChange}
        />

        {/* ✅ Self-Reflection Notes - 3x1 GRID LAYOUT (matches 1x1/360 structure) */}
        <Card borderColor="neutral" className="mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Self-Reflection Notes
          </h3>
          
          {/* Top Row: 3 boxes side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Box 1: Culture Notes */}
            <div>
              <label className="block text-sm font-bold text-purple-700 mb-2">
                Culture Notes
              </label>
              <p className="text-xs text-gray-600 mb-2 italic">
                How do you show up and engage with others? Team collaboration, relationships, leadership influence, and contribution to culture.
              </p>
              <textarea
                value={notes.culture}
                onChange={(e) => handleNoteChange('culture', e.target.value)}
                placeholder="Reflect on how you show up, collaborate, and contribute to team culture..."
                rows="5"
                className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
              />
            </div>

            {/* Box 2: Competencies Notes */}
            <div>
              <label className="block text-sm font-bold text-orange-700 mb-2">
                Competencies Notes
              </label>
              <p className="text-xs text-gray-600 mb-2 italic">
                What do you know and do well? Technical/functional skills, subject matter expertise, and problem-solving abilities.
              </p>
              <textarea
                value={notes.competencies}
                onChange={(e) => handleNoteChange('competencies', e.target.value)}
                placeholder="Reflect on your skills, expertise, and what you excel at..."
                rows="5"
                className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm"
              />
            </div>

            {/* Box 3: Execution Notes */}
            <div>
              <label className="block text-sm font-bold text-green-700 mb-2">
                Execution Notes
              </label>
              <p className="text-xs text-gray-600 mb-2 italic">
                How effectively do you deliver and drive impact? Quality, timeliness, results, outcomes, accountability, and follow-through.
              </p>
              <textarea
                value={notes.execution}
                onChange={(e) => handleNoteChange('execution', e.target.value)}
                placeholder="Reflect on how you execute, deliver results, and drive impact..."
                rows="5"
                className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Bottom Row: General Notes - Full Width */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              General Notes / Overall Comments
            </label>
            <p className="text-xs text-gray-600 mb-2 italic">
              Career goals, professional development areas, resources or support you need, obstacles you're facing, and any other reflections.
            </p>
            <textarea
              value={notes.general}
              onChange={(e) => handleNoteChange('general', e.target.value)}
              placeholder="Share your goals, development needs, support needed, or any other reflections..."
              rows="5"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none text-sm"
            />
          </div>
        </Card>

        {/* Progress Summary */}
        <Card className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Your Self-Assessment Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Composite Score</p>
              <p className="text-3xl font-bold text-purple-700">
                {calculateComposite()}<span className="text-lg text-gray-500">/12</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Nine-Box Position</p>
              <p className="text-xl font-bold text-indigo-700">
                {calculateNineBoxPosition()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Usage</p>
              <p className="text-sm text-gray-700 mt-2">
                Input for 360° Pairings<br/>
                <span className="text-xs text-purple-600">(MSH³ created in pairing review)</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              <Send className="w-5 h-5" />
              {saving ? 'Submitting...' : 'Submit Self-Assessment'}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600">
            ℹ️ This assessment will be available for all 360° pairings where you are the subject
          </div>
        </div>

      </div>
    </div>
  );
}