import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentGrid from '../../components/AssessmentGrid';
import { Card } from '../../components/ui';

export default function OneOnOneAssessGrid() {
  const { user } = useAuth();
  const params = useParams();
  const assessmentId = params.id || params.assessmentId;
  const navigate = useNavigate();
  
  const [assessments, setAssessments] = useState([]);
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

  useEffect(() => {
    if (user?.uid) {
      if (assessmentId) {
        loadSpecificAssessment(assessmentId);
      } else {
        loadPendingAssessments();
      }
    }
  }, [user, assessmentId]);

  const loadSpecificAssessment = async (id) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const assessmentsRef = collection(db, 'assessments');
      const allPendingQuery = query(
        assessmentsRef,
        where('status', '==', 'pending'),
        where('assessmentType', '==', '1x1'),
        where('cycleMonth', '==', currentMonth),
        where('cycleYear', '==', currentYear)
      );
      
      const allSnapshot = await getDocs(allPendingQuery);
      const allAssessments = [];
      
      for (const docSnap of allSnapshot.docs) {
        const data = docSnap.data();
        
        if (!data.assessorId || data.assessorId === user.uid) {
          let assesseeName = data.assesseeName;
          
          if (!assesseeName) {
            const parts = docSnap.id.split('-');
            if (parts.length >= 2) {
              const namePart = parts[1];
              assesseeName = namePart
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
          }
          
          if (!assesseeName) {
            assesseeName = 'Unknown User';
          }
          
          allAssessments.push({
            id: docSnap.id,
            ...data,
            assesseeName: assesseeName
          });
        }
      }
      
      setAssessments(allAssessments);
      
      const assessmentRef = doc(db, 'assessments', id);
      const assessmentSnap = await getDoc(assessmentRef);
      
      if (!assessmentSnap.exists()) {
        alert('Assessment not found');
        setLoading(false);
        return;
      }
      
      const assessmentData = {
        id: assessmentSnap.id,
        ...assessmentSnap.data()
      };
      
      if (!assessmentData.assesseeName) {
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
      
      if (assessmentData.status === 'pending' && !assessmentData.assessorId) {
        await updateDoc(assessmentRef, {
          assessorId: user.uid
        });
        assessmentData.assessorId = user.uid;
      }
      
      if (assessmentData.scores) {
        setScores(assessmentData.scores);
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
      setLoading(false);
    }
  };

  const loadPendingAssessments = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const assessmentsRef = collection(db, 'assessments');
      const q = query(
        assessmentsRef,
        where('status', '==', 'pending'),
        where('assessmentType', '==', '1x1'),
        where('cycleMonth', '==', currentMonth),
        where('cycleYear', '==', currentYear)
      );

      const snapshot = await getDocs(q);
      const assessmentsList = [];
      const usersRef = collection(db, 'users');
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        if (!data.assessorId || data.assessorId === user.uid) {
          let assesseeName = data.assesseeName;
          
          if (!assesseeName) {
            const parts = docSnap.id.split('-');
            if (parts.length >= 2) {
              const namePart = parts[1];
              assesseeName = namePart
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
          }
          
          if (!assesseeName && data.subjectId) {
            const userQuery = query(usersRef, where('userId', '==', data.subjectId));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              assesseeName = userData.displayName || userData.name || userData.email;
            }
          }
          
          if (!assesseeName) {
            assesseeName = 'Unknown User';
          }
          
          assessmentsList.push({
            id: docSnap.id,
            ...data,
            assesseeName: assesseeName
          });
        }
      }
      
      setAssessments(assessmentsList);
      
      if (!assessmentId && assessmentsList.length > 0) {
        handleAssessmentSelect(assessmentsList[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      setLoading(false);
    }
  };

  const handleAssessmentSelect = async (assessment) => {
    if (assessment.status === 'pending' && !assessment.assessorId) {
      try {
        const assessmentRef = doc(db, 'assessments', assessment.id);
        await updateDoc(assessmentRef, {
          assessorId: user.uid
        });
        assessment.assessorId = user.uid;
      } catch (error) {
        console.error('Error claiming assessment:', error);
      }
    }
    
    setSelectedAssessment(assessment);
    
    setScores(assessment.scores || {
      culture: { contribution: 1, growth: 1 },
      competencies: { contribution: 1, growth: 1 },
      execution: { contribution: 1, growth: 1 }
    });
    
    setNotes(assessment.notes || {
      culture: '',
      competencies: '',
      execution: '',
      general: ''
    });
    
    setHrpRequested(assessment.hrpRequested || false);
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

  const calculateComposite = () => {
    const totalContribution = scores.culture.contribution + 
                             scores.competencies.contribution + 
                             scores.execution.contribution;
    const totalGrowth = scores.culture.growth + 
                       scores.competencies.growth + 
                       scores.execution.growth;
    return totalContribution + totalGrowth;
  };

  const calculateNineBoxPosition = () => {
    const totalContribution = scores.culture.contribution + 
                             scores.competencies.contribution + 
                             scores.execution.contribution;
    const totalGrowth = scores.culture.growth + 
                       scores.competencies.growth + 
                       scores.execution.growth;
    const composite = totalContribution + totalGrowth;

    let growthLevel, contribLevel;
    
    if (totalContribution <= 2) contribLevel = 'low';
    else if (totalContribution <= 4) contribLevel = 'mid';
    else contribLevel = 'high';
    
    if (totalGrowth <= 2) growthLevel = 'low';
    else if (totalGrowth <= 4) growthLevel = 'mid';
    else growthLevel = 'high';

    if (composite >= 11 && growthLevel === 'high' && contribLevel === 'high') return 'Transformative Outcomes';
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
  };

  const generateMSHId = async () => {
    try {
      const counterRef = doc(db, 'counters', 'mshCounter');
      const counterSnap = await getDoc(counterRef);
      
      let nextMSH = 1;
      if (counterSnap.exists()) {
        nextMSH = (counterSnap.data().currentMSH || 0) + 1;
      }
      
      await setDoc(counterRef, {
        currentMSH: nextMSH,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      return `MSH${nextMSH}`;
    } catch (error) {
      console.error('Error generating MSH ID:', error);
      throw error;
    }
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

    setSaving(true);
    try {
      const composite = calculateComposite();
      const nineBoxPosition = calculateNineBoxPosition();
      const assessmentRef = doc(db, 'assessments', selectedAssessment.id);
      
      const mshId = await generateMSHId();

      const updateData = {
        scores,
        notes,
        composite,
        nineBoxPosition,
        status: alignmentStatus === 'aligned' ? 'completed' : 'not-aligned',
        alignmentStatus,
        hrpRequested,
        mshId,
        assessorId: user.uid,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(assessmentRef, updateData);
      
      await loadPendingAssessments();
      
      if (assessments.length > 1) {
        alert(`Assessment published successfully! MSH ID: ${mshId}\n\nSelect another assessment from the sidebar to continue.`);
        
        setSelectedAssessment(null);
        setScores({
          culture: { contribution: 1, growth: 1 },
          competencies: { contribution: 1, growth: 1 },
          execution: { contribution: 1, growth: 1 }
        });
        setNotes({
          culture: '',
          competencies: '',
          execution: '',
          general: ''
        });
        setHrpRequested(false);
      } else {
        alert(`Assessment published successfully! MSH ID: ${mshId}\n\nAll assessments complete! Returning to hub.`);
        navigate('/is-os');
      }
    } catch (error) {
      console.error('Error publishing assessment:', error);
      alert('Failed to publish assessment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pending 1x1 Assessments</h2>
        
        {assessments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-sm mb-4">No pending assessments</p>
            <button
              onClick={() => navigate('/is-os')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Return to Hub
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {assessments.map(assessment => (
              <div
                key={assessment.id}
                onClick={() => handleAssessmentSelect(assessment)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedAssessment?.id === assessment.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                }`}
              >
                <h3 className="font-semibold text-gray-900">
                  {assessment.assesseeName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {assessment.cycleMonth}/{assessment.cycleYear} - {assessment.assessmentType}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: {assessment.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedAssessment ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 text-lg mb-4">
                {assessments.length > 0 
                  ? 'Select an assessment from the sidebar to begin'
                  : 'No pending assessments available'}
              </p>
              {assessments.length === 0 && (
                <button
                  onClick={() => navigate('/is-os')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Return to Hub
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-8">
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              <div className="h-2 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600"></div>
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  1x1 Assessment: {selectedAssessment.assesseeName}
                </h1>
                <p className="text-gray-600 text-sm">
                  {selectedAssessment.cycleMonth}/{selectedAssessment.cycleYear} - Monthly 1x1 Assessment
                </p>
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
        )}
      </div>
    </div>
  );
}