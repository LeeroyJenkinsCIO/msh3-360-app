// 📁 SAVE TO: src/pages/is-os/1x1AssessGrid.js
// ✅ FIXED: Block 360 assessments from creating MSH (only 360ComparisonView should create 360 MSH)
// 1x1AssessGrid.js - Complete with Sequential MSH ID Counter

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentGrid from '../../components/AssessmentGrid';
import { Card } from '../../components/ui';

export default function OneOnOneAssessGrid() {
  const { user } = useAuth();
  const params = useParams();
  const assessmentId = params.id || params.assessmentId;
  const navigate = useNavigate();
  
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
  
  const [hrpRequested, setHrpRequested] = useState(false);

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
        navigate('/is-os');
        return;
      }
      
      const assessmentData = {
        id: assessmentSnap.id,
        ...assessmentSnap.data()
      };
      
      console.log('✅ Loaded assessment:', assessmentData);
      
      // Parse name from ID if not in data
      if (!assessmentData.assesseeName && !assessmentData.receiver?.displayName) {
        const parts = assessmentData.id.split('-');
        if (parts.length >= 2) {
          const namePart = parts[1];
          const formattedName = namePart
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          assessmentData.assesseeName = formattedName;
        }
      }
      
      if (!assessmentData.assesseeName && assessmentData.receiver?.displayName) {
        assessmentData.assesseeName = assessmentData.receiver.displayName;
      }
      
      if (assessmentData.status === 'pending' && !assessmentData.assessorId) {
        await updateDoc(assessmentRef, {
          assessorId: user.uid
        });
        assessmentData.assessorId = user.uid;
      }
      
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
      
      if (assessmentData.notes) {
        setNotes(assessmentData.notes);
      }
      
      if (assessmentData.hrpRequested) {
        setHrpRequested(assessmentData.hrpRequested);
      }
      
      setSelectedAssessment(assessmentData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading assessment:', error);
      alert('Error loading assessment: ' + error.message);
      navigate('/is-os');
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
        hrpRequested,
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

  const handleCancel = () => {
    navigate('/is-os');
  };

  const handlePublish = async (alignmentStatus) => {
    if (!selectedAssessment) return;

    console.log('🔍 Publishing with alignment status:', alignmentStatus);

    setSaving(true);
    try {
      const composite = calculateComposite();
      const nineBoxPosition = calculateNineBoxPosition();
      const assessmentRef = doc(db, 'assessments', selectedAssessment.id);
      
      const isSelfAssessment = selectedAssessment.assessmentType === 'self' 
        || selectedAssessment.isSelfAssessment;
      
      // ✅ NEW: Check if this is a 360 assessment
      const is360Assessment = selectedAssessment.cycleType === '360';

      const updateData = {
        scores,
        notes,
        composite,
        nineBoxPosition,
        status: alignmentStatus === 'aligned' ? 'completed' : 'not-aligned',
        alignmentStatus: alignmentStatus,
        hrpRequested,
        assessorId: user.uid,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('🔍 Updating assessment with data:', updateData);

      await updateDoc(assessmentRef, updateData);
      
      console.log('✅ Assessment updated in Firestore with alignmentStatus:', alignmentStatus);
      
      // ✅ CRITICAL FIX: Only create MSH for 1x1 assessments, NOT for 360 assessments
      if (!isSelfAssessment && !is360Assessment && selectedAssessment.impact?.affectsMSH) {
        console.log('📊 Publishing MSH for 1x1 Manager→DR assessment...');
        const mshId = await publishMshScore(selectedAssessment, composite, nineBoxPosition, alignmentStatus);
        
        console.log('✅ MSH created:', mshId, 'with alignment:', alignmentStatus);
        
        // Update assessment with MSH ID in the correct path
        await updateDoc(assessmentRef, {
          'impact.mshId': mshId
        });
        
        alert(`Assessment published successfully! MSH ID: ${mshId}\nAlignment: ${alignmentStatus}\n\nReturning to hub.`);
      } else if (isSelfAssessment) {
        console.log('🚫 Self-assessment: MSH NOT published (used for 360 calculations only)');
        alert('Self-assessment completed successfully!\n\nReturning to hub.');
      } else if (is360Assessment) {
        console.log('🚫 360° assessment: MSH NOT published here (will be published from 360ComparisonView)');
        alert(`360° assessment completed successfully!\nAlignment: ${alignmentStatus}\n\nMSH will be published after alignment review.\n\nReturning to hub.`);
      } else {
        alert(`Assessment published successfully!\nAlignment: ${alignmentStatus}\n\nReturning to hub.`);
      }
      
      navigate('/is-os');
    } catch (error) {
      console.error('Error publishing assessment:', error);
      alert('Failed to publish assessment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ✨ NEW: Get next sequential MSH ID from counter
  const getNextMshId = async () => {
    try {
      const counterRef = doc(db, 'counters', 'msh');
      const counterSnap = await getDoc(counterRef);
      
      let nextNumber = 1;
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data().current || 0) + 1;
      }
      
      // Update counter atomically
      await setDoc(counterRef, { 
        current: nextNumber,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      // Return formatted ID: MSH-001, MSH-002, etc.
      const mshId = `MSH-${String(nextNumber).padStart(3, '0')}`;
      console.log('✅ Generated sequential MSH ID:', mshId);
      return mshId;
    } catch (error) {
      console.error('Error generating MSH ID:', error);
      throw new Error('Failed to generate MSH ID');
    }
  };

  // 📊 Publish MSH Score (only for 1x1 non-self assessments)
  const publishMshScore = async (assessment, composite, nineBoxPosition, alignmentStatus) => {
    try {
      console.log('🔍 publishMshScore called with alignmentStatus:', alignmentStatus);
      
      const affectsMSH = assessment?.impact?.affectsMSH;
      const cycleId = assessment?.cycleId;
      
      if (!affectsMSH || !cycleId) {
        console.warn('⚠️ Missing required data for MSH publishing:', { affectsMSH, cycleId });
        throw new Error('Missing required data for MSH publishing');
      }
      
      // ✨ Use sequential MSH ID from counter
      const mshId = await getNextMshId();
      
      // Check if MSH already exists for this cycle/subject combo
      const mshQuery = query(
        collection(db, 'mshScores'),
        where('cycleId', '==', cycleId),
        where('subjectId', '==', affectsMSH)
      );
      const existingMsh = await getDocs(mshQuery);

      if (!existingMsh.empty) {
        console.log(`⚠️ MSH already exists for this subject in this cycle`);
        // Return the existing MSH ID
        return existingMsh.docs[0].data().mshId;
      }

      const mshData = {
        mshId: mshId,
        mshType: '1x1',
        
        subjectId: affectsMSH,
        subjectName: assessment?.receiver?.displayName || assessment?.subjectName || assessment?.assesseeName || 'Unknown',
        
        assessorId: user.uid,
        assessorName: user.displayName || user.email,
        
        composite: composite,
        scores: {
          culture: scores.culture.contribution,
          mindset: scores.culture.growth,
          competencies: scores.competencies.contribution,
          skillset: scores.competencies.growth,
          execution: scores.execution.contribution,
          habits: scores.execution.growth
        },
        
        nineBoxPosition: nineBoxPosition,
        
        sourceAssessmentIds: [assessment.id],
        
        cycleId: cycleId,
        cycleMonth: assessment?.cycleMonth || 0,
        cycleYear: assessment?.cycleYear || new Date().getFullYear(),
        cycleName: assessment?.cycleName || 'Unknown Cycle',
        
        alignment: alignmentStatus,
        hrpReviewRequested: hrpRequested,
        
        publishedBy: user.uid,
        publishedAt: serverTimestamp()
      };

      console.log('🔍 Creating MSH with data:', mshData);

      await addDoc(collection(db, 'mshScores'), mshData);

      console.log(`✅ MSH Published: ${mshId} with alignment: ${alignmentStatus}`);
      return mshId;
    } catch (error) {
      console.error('Error publishing MSH:', error);
      throw error;
    }
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

  if (!selectedAssessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Assessment not found</p>
          <button
            onClick={() => navigate('/is-os')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  const isSelfAssessment = selectedAssessment.assessmentType === 'self' 
    || selectedAssessment.isSelfAssessment;
  
  const is360Assessment = selectedAssessment.cycleType === '360';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="h-2 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600"></div>
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {isSelfAssessment ? 'Self Assessment' : `1x1 Assessment: ${selectedAssessment.assesseeName}`}
            </h1>
            <p className="text-gray-600 text-sm">
              {selectedAssessment.cycleName || `${selectedAssessment.cycleMonth}/${selectedAssessment.cycleYear}`} - {isSelfAssessment ? 'Self Assessment' : is360Assessment ? '360° Assessment' : 'Monthly 1x1 Assessment'}
            </p>
            {isSelfAssessment && (
              <p className="text-xs text-purple-600 mt-2">
                ℹ️ Self-assessments are used for 360 cycle calculations. MSH scores are published from manager and peer assessments.
              </p>
            )}
            {is360Assessment && !isSelfAssessment && (
              <p className="text-xs text-blue-600 mt-2">
                ℹ️ 360° assessments will be aligned and published from the 360° Comparison View.
              </p>
            )}
          </div>
        </div>

        <AssessmentGrid 
          scores={scores}
          onScoreChange={handleScoreChange}
        />

        <Card borderColor="neutral" className="mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Assessment Notes</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#8b5cf6' }}>
                Culture Notes
              </label>
              <textarea
                value={notes.culture}
                onChange={(e) => handleNoteChange('culture', e.target.value)}
                placeholder="How they show up and engage with others..."
                rows="4"
                style={{ 
                  borderColor: '#8b5cf6',
                  borderWidth: '2px'
                }}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#f97316' }}>
                Competencies Notes
              </label>
              <textarea
                value={notes.competencies}
                onChange={(e) => handleNoteChange('competencies', e.target.value)}
                placeholder="What they know and can do effectively..."
                rows="4"
                style={{ 
                  borderColor: '#f97316',
                  borderWidth: '2px'
                }}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#10b981' }}>
                Execution Notes
              </label>
              <textarea
                value={notes.execution}
                onChange={(e) => handleNoteChange('execution', e.target.value)}
                placeholder="How they deliver results and drive impact..."
                rows="4"
                style={{ 
                  borderColor: '#10b981',
                  borderWidth: '2px'
                }}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              General Notes / Overall Comments
            </label>
            <textarea
              value={notes.general}
              onChange={(e) => handleNoteChange('general', e.target.value)}
              placeholder="Overall observations, development areas, strengths, recommendations..."
              rows="6"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
        </Card>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePublish('aligned')}
                disabled={saving}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Publishing...' : 'Publish Aligned'}
              </button>

              <button
                onClick={() => handlePublish('not-aligned')}
                disabled={saving}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Publishing...' : 'Publish Not Aligned'}
              </button>
              
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={hrpRequested}
                  onChange={(e) => setHrpRequested(e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="whitespace-nowrap">Request HRP Review</span>
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}