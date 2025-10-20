// 📁 SAVE TO: src/pages/is-os/SelfAssessmentPage.jsx
// Dedicated Self-Assessment Page - Different from 1x1 assessments

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentGrid from '../../components/AssessmentGrid';
import { Card } from '../../components/ui';
import { User, Save, Send, ArrowLeft } from 'lucide-react';

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
  
  // Self-assessment specific notes structure
  const [notes, setNotes] = useState({
    strengths: '',
    growthAreas: '',
    goals: '',
    support: ''
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
      
      // Load existing notes
      if (assessmentData.notes) {
        setNotes({
          strengths: assessmentData.notes?.strengths || '',
          growthAreas: assessmentData.notes?.growthAreas || '',
          goals: assessmentData.notes?.goals || '',
          support: assessmentData.notes?.support || ''
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
        composite: calculateComposite(),
        nineBoxPosition: calculateNineBoxPosition(),
        status: 'draft',
        assessorId: user.uid,
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

      // ✅ Self-assessments always use 'completed' status (no alignment concept)
      await updateDoc(assessmentRef, {
        scores,
        notes,
        composite,
        nineBoxPosition,
        status: 'completed',
        assessorId: user.uid,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Self-assessment completed (no MSH published)');
      
      alert('Self-assessment completed successfully!\n\nYour responses will be used in the 360 review process.\n\nReturning to hub.');
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
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Self-Assessment</h1>
            </div>
            <p className="text-gray-600 text-sm">
              {selectedAssessment.cycleName || `${selectedAssessment.cycleMonth}/${selectedAssessment.cycleYear}`} • 360 Review Cycle
            </p>
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-900">
                <strong>About Self-Assessments:</strong> Your self-assessment helps provide context for your 360 review. 
                Be honest and reflective. Your responses will be combined with feedback from your manager and peers 
                to create your final MSH³ score.
              </p>
            </div>
          </div>
        </div>

        {/* Assessment Grid */}
        <AssessmentGrid 
          scores={scores}
          onScoreChange={handleScoreChange}
        />

        {/* Self-Reflection Notes */}
        <Card borderColor="neutral" className="mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Self-Reflection Notes
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                💪 Key Strengths
              </label>
              <textarea
                value={notes.strengths}
                onChange={(e) => handleNoteChange('strengths', e.target.value)}
                placeholder="What are your strongest areas? What do you do exceptionally well?"
                rows="4"
                className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🌱 Growth Opportunities
              </label>
              <textarea
                value={notes.growthAreas}
                onChange={(e) => handleNoteChange('growthAreas', e.target.value)}
                placeholder="What areas would you like to develop? Where do you see room for improvement?"
                rows="4"
                className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🎯 Goals & Aspirations
              </label>
              <textarea
                value={notes.goals}
                onChange={(e) => handleNoteChange('goals', e.target.value)}
                placeholder="What are your professional goals? What would you like to achieve in the next quarter?"
                rows="4"
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🤝 Support Needed
              </label>
              <textarea
                value={notes.support}
                onChange={(e) => handleNoteChange('support', e.target.value)}
                placeholder="What support, resources, or guidance would help you succeed? What obstacles are you facing?"
                rows="4"
                className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
              />
            </div>
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
              <p className="text-sm text-gray-600 mb-1">Impact</p>
              <p className="text-sm text-gray-700 mt-2">
                Input for 360 Review<br/>
                <span className="text-xs text-purple-600">(No direct MSH³)</span>
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
              {saving ? 'Submitting...' : 'Complete Self-Assessment'}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600">
            ℹ️ Your self-assessment will be combined with manager and peer feedback in your 360 review
          </div>
        </div>

      </div>
    </div>
  );
}