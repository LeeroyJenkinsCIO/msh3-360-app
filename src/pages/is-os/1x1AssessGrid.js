// 📁 SAVE TO: src/pages/is-os/1x1AssessGrid.js
// ✅ DUAL PURPOSE: 1x1 Assessment Publishing + 360° Assessment Completion
// 🎯 Uses AssessmentGrid component with MSH³ Compass
// 🔧 FIXED: No publisher notes, proper state management

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  runTransaction
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import AssessmentGrid from '../../components/AssessmentGrid';

function AssessmentGrid1x1() {
  console.log('🎬 Component mounting/rendering...');
  
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  
  console.log('📋 All URL params:', params);
  console.log('📋 User:', user?.uid, user?.email);
  
  // Try multiple param names since the route might be configured differently
  const assessmentId = params.assessmentId || params.id || params.pairId;
  
  console.log('🎯 Extracted assessmentId:', assessmentId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [assessment, setAssessment] = useState(null);
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [assessorInfo, setAssessorInfo] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // ✅ CRITICAL: Proper state initialization with default structure
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
  
  // Publisher notes state (for MSH publishing)
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedAlignment, setSelectedAlignment] = useState(null); // true = aligned, false = not aligned
  const [publisherNotes, setPublisherNotes] = useState('');

  useEffect(() => {
    console.log('🔄 useEffect triggered with assessmentId:', assessmentId);
    if (assessmentId) {
      console.log('✅ assessmentId exists, calling loadAssessment...');
      loadAssessment();
    } else {
      console.error('❌ No assessmentId found in URL params!');
      setLoading(false);
    }
  }, [assessmentId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Step 1: Starting load with assessmentId:', assessmentId);
      
      // Try querying by pairId first
      console.log('🔍 Step 2: Querying by pairId...');
      const pairIdQuery = query(
        collection(db, 'assessments'),
        where('pairId', '==', assessmentId)
      );
      
      let assessmentsSnapshot;
      try {
        assessmentsSnapshot = await getDocs(pairIdQuery);
        console.log('✅ Step 2 complete: Query returned', assessmentsSnapshot.size, 'documents');
      } catch (queryError) {
        console.error('❌ Query by pairId failed:', queryError);
        throw queryError;
      }
      
      // If no results, try direct document lookup as fallback
      if (assessmentsSnapshot.empty) {
        console.log('⚠️ No results from pairId query, trying direct document lookup...');
        try {
          const directDoc = await getDoc(doc(db, 'assessments', assessmentId));
          if (directDoc.exists()) {
            console.log('✅ Found by direct document ID');
            const assessmentData = { id: directDoc.id, ...directDoc.data() };
            setAssessment(assessmentData);
            
            // Continue loading user info
            const subjectId = assessmentData.subjectId || assessmentData.receiver?.uid;
            const assessorId = assessmentData.assessorId || assessmentData.giver?.uid;
            
            console.log('🔍 Step 3: Loading users - Subject:', subjectId, 'Assessor:', assessorId);
            
            const [subjectDoc, assessorDoc] = await Promise.all([
              getDoc(doc(db, 'users', subjectId)),
              getDoc(doc(db, 'users', assessorId))
            ]);
            
            setSubjectInfo({ uid: subjectId, ...subjectDoc.data() });
            setAssessorInfo({ uid: assessorId, ...assessorDoc.data() });
            
            // ✅ Load existing data with safe defaults
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
            if (assessmentData.notes) setNotes(assessmentData.notes);
            if (assessmentData.hrpRequested) setHrpRequested(assessmentData.hrpRequested);
            
            const isPublished = assessmentData.status === 'published' || 
                               assessmentData.status === 'calibrated' ||
                               assessmentData.mshPublished;
            const isCompleted = assessmentData.status === 'completed';
            const isNotAssessor = user?.uid !== assessorId;
            
            setIsReadOnly(isPublished || isCompleted || isNotAssessor);
            setLoading(false);
            return;
          }
        } catch (directError) {
          console.error('❌ Direct document lookup also failed:', directError);
        }
        
        console.error('❌ Assessment not found with pairId or direct ID:', assessmentId);
        alert('Assessment not found with ID: ' + assessmentId);
        navigate(-1);
        return;
      }
      
      // Get the first matching assessment from pairId query
      console.log('🔍 Step 3: Processing query results...');
      const assessmentDoc = assessmentsSnapshot.docs[0];
      const assessmentData = { id: assessmentDoc.id, ...assessmentDoc.data() };
      
      console.log('✅ Found assessment:', {
        id: assessmentData.id,
        pairId: assessmentData.pairId,
        status: assessmentData.status,
        type: assessmentData.assessmentType
      });
      setAssessment(assessmentData);
      
      // Load subject and assessor info
      const subjectId = assessmentData.subjectId || assessmentData.receiver?.uid;
      const assessorId = assessmentData.assessorId || assessmentData.giver?.uid;
      
      console.log('👤 Loading users - Subject:', subjectId, 'Assessor:', assessorId);
      
      const [subjectDoc, assessorDoc] = await Promise.all([
        getDoc(doc(db, 'users', subjectId)),
        getDoc(doc(db, 'users', assessorId))
      ]);
      
      setSubjectInfo({ uid: subjectId, ...subjectDoc.data() });
      setAssessorInfo({ uid: assessorId, ...assessorDoc.data() });
      
      // ✅ Load existing scores with safe defaults
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
      
      // ✅ Load existing notes if present
      if (assessmentData.notes) {
        setNotes(assessmentData.notes);
      }
      
      if (assessmentData.hrpRequested !== undefined) {
        setHrpRequested(assessmentData.hrpRequested);
      }
      
      // Check if read-only
      const isPublished = assessmentData.status === 'published' || 
                         assessmentData.status === 'calibrated' ||
                         assessmentData.mshPublished;
      const isCompleted = assessmentData.status === 'completed';
      const isNotAssessor = user?.uid !== assessorId;
      
      setIsReadOnly(isPublished || isCompleted || isNotAssessor);
      
      console.log('✅ Assessment loaded successfully');
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Error loading assessment:', error);
      alert('Failed to load assessment: ' + error.message);
      setLoading(false);
    }
  };

  const handleScoreChange = (dimension, type, value) => {
    setScores(prev => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [type]: parseInt(value)
      }
    }));
  };

  const handleNoteChange = (field, value) => {
    setNotes(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'assessments', assessment.id), {
        scores,
        notes,
        hrpRequested,
        status: 'in-progress',
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

  const handleCompleteAssessment = async () => {
    if (!window.confirm('Submit this 360° assessment? It will be marked as complete and ready for MSH publishing.')) {
      return;
    }

    try {
      setSubmitting(true);
      await updateDoc(doc(db, 'assessments', assessment.id), {
        scores,
        notes,
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('Assessment submitted successfully! Ready for alignment and MSH publishing.');
      navigate(-1);
    } catch (error) {
      console.error('Error completing assessment:', error);
      alert('Failed to submit assessment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open publish dialog with selected alignment
  const openPublishDialog = (isAligned) => {
    setSelectedAlignment(isAligned);
    setShowPublishDialog(true);
  };

  // Close publish dialog and reset
  const closePublishDialog = () => {
    setShowPublishDialog(false);
    setSelectedAlignment(null);
    setPublisherNotes('');
  };

  // Confirm and execute publish
  const confirmPublish = async () => {
    await handlePublish(selectedAlignment);
    closePublishDialog();
  };

  const handlePublish = async (isAligned) => {
    // Validation: Require publisher notes for Not Aligned
    if (!isAligned && !publisherNotes.trim()) {
      alert('Publisher notes are required when marking as Not Aligned. Please explain the alignment decision.');
      return;
    }

    try {
      setPublishing(true);

      // Calculate composite score (sum of all 6 values: 0-12 scale)
      const compositeScore = 
        scores.culture.contribution + scores.culture.growth +
        scores.competencies.contribution + scores.competencies.growth +
        scores.execution.contribution + scores.execution.growth;

      // Determine nine-box placement
      let nineBoxPlacement = 'Low';
      if (compositeScore >= 5) nineBoxPlacement = 'High';
      else if (compositeScore >= 3) nineBoxPlacement = 'Mid';

      // Create MSH record - only include defined fields
      const mshData = {
        assessmentId: assessment.id,
        mshType: '1x1',
        assessmentType: '1x1',
        
        scores,
        notes,
        publisherNotes: publisherNotes || '',  // Manager's alignment reasoning
        hrpRequested: hrpRequested || false,
        hrpReviewRequested: hrpRequested || false,  // For History page compatibility
        
        compositeScore,
        nineBoxPlacement,
        isAligned,
        
        status: 'published',
        publishedAt: serverTimestamp(),
        publishedBy: user.uid,
        createdAt: serverTimestamp()
      };

      // Add optional fields only if they exist
      const subjectId = assessment.subjectId || assessment.receiver?.uid;
      const assessorId = assessment.assessorId || assessment.giver?.uid;
      const subjectName = assessment.subjectName || assessment.receiver?.displayName;
      const assessorName = assessment.assessorName || assessment.giver?.displayName;
      
      if (subjectId) {
        mshData.subjectId = subjectId;
        console.log('📝 Adding subjectId to MSH:', subjectId);
      } else {
        console.warn('⚠️ No subjectId found in assessment!');
      }
      
      if (assessorId) {
        mshData.assessorId = assessorId;
        console.log('📝 Adding assessorId to MSH:', assessorId);
      } else {
        console.warn('⚠️ No assessorId found in assessment!');
      }
      
      if (subjectName) {
        mshData.subjectName = subjectName;
      }
      
      if (assessorName) {
        mshData.assessorName = assessorName;
      }
      
      if (assessment.pairId) {
        mshData.pairId = assessment.pairId;
        console.log('📝 Adding pairId to MSH:', assessment.pairId);
      }
      
      if (assessment.cycleId) {
        mshData.cycleId = assessment.cycleId;
        console.log('📝 Adding cycleId to MSH:', assessment.cycleId);
      }
      
      if (assessment.cycleMonth) {
        mshData.cycleMonth = assessment.cycleMonth;
        console.log('📝 Adding cycleMonth to MSH:', assessment.cycleMonth);
      }
      
      if (assessment.cycleYear) {
        mshData.cycleYear = assessment.cycleYear;
        console.log('📝 Adding cycleYear to MSH:', assessment.cycleYear);
      }
      
      if (assessment.cycleName) {
        mshData.cycleName = assessment.cycleName;
        console.log('📝 Adding cycleName to MSH:', assessment.cycleName);
      }

      console.log('📝 Publishing MSH with data:', mshData);

      // Generate formatted MSH ID using atomic counter (prevents race conditions)
      const counterRef = doc(db, 'counters', 'msh');
      
      const formattedMshId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let newCount;
        if (!counterDoc.exists()) {
          // Initialize counter if it doesn't exist
          newCount = 1;
          transaction.set(counterRef, {
            current: newCount,
            lastUpdated: serverTimestamp()
          });
        } else {
          // Increment existing counter
          newCount = (counterDoc.data().current || 0) + 1;
          transaction.update(counterRef, {
            current: newCount,
            lastUpdated: serverTimestamp()
          });
        }
        
        return `MSH-${String(newCount).padStart(3, '0')}`;
      });
      
      console.log('📝 Generated MSH ID:', formattedMshId);

      // Add formatted ID to mshData
      mshData.mshId = formattedMshId;

      const mshDocRef = await addDoc(collection(db, 'mshs'), mshData);
      
      console.log('✅ MSH document created successfully!');
      console.log('✅ MSH ID:', formattedMshId);
      console.log('✅ Firebase doc ID:', mshDocRef.id);


      console.log('📝 About to update assessment document...');
      console.log('📝 Assessment ID:', assessment.id);
      console.log('📝 Assessment object:', assessment);
      console.log('📝 Update data:', {
        status: 'published',
        mshPublished: true,
        mshId: formattedMshId,
        compositeScore,
        nineBoxPlacement,
        isAligned,
        scores,
        notes,
        hrpRequested
      });

      try {
        // Update assessment with BOTH old and new field names for backwards compatibility
        await updateDoc(doc(db, 'assessments', assessment.id), {
          scores,
          notes,
          publisherNotes: publisherNotes || '',  // CRITICAL FIX: Hub Grid needs this!
          hrpRequested: hrpRequested || false,
          status: 'published',
          mshPublished: true,
          
          // NEW field names (current)
          mshId: formattedMshId,
          compositeScore,
          nineBoxPlacement,
          isAligned,
          
          // OLD field names (for AssessmentOrchestrator compatibility)
          composite: compositeScore,
          alignmentStatus: isAligned ? 'aligned' : 'not-aligned',
          'impact.mshId': formattedMshId,  // Nested field path notation
          'impact.mshDocId': mshDocRef.id,  // ✅ FIX: Firestore doc ID for navigation
          
          mshPublishedAt: serverTimestamp(),
          mshPublishedBy: user.uid,
          updatedAt: serverTimestamp()
        });

        console.log('✅ Assessment document updated successfully!');
        console.log('✅ Updated assessment ID:', assessment.id);
        console.log('✅ Dual-write complete: NEW fields (compositeScore, isAligned, mshId) + OLD fields (composite, alignmentStatus, impact.mshId)');
        
        // Verify the update by reading back
        const verifyDoc = await getDoc(doc(db, 'assessments', assessment.id));
        if (verifyDoc.exists()) {
          console.log('✅ VERIFICATION: Assessment document after update:', verifyDoc.data());
        } else {
          console.error('❌ VERIFICATION FAILED: Document not found after update!');
        }
      } catch (updateError) {
        console.error('❌ ERROR updating assessment document:', updateError);
        console.error('❌ Error details:', updateError.message);
        console.error('❌ Error code:', updateError.code);
        throw updateError;
      }

      alert(`MSH published successfully as ${isAligned ? 'ALIGNED' : 'NOT ALIGNED'}!\n\nMSH ID: ${formattedMshId}\nComposite Score: ${compositeScore}/12\nNine-Box: ${nineBoxPlacement}`);
      navigate(-1);
      
    } catch (error) {
      console.error('Error publishing MSH:', error);
      alert('Failed to publish MSH: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

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
        <Card className="max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Assessment Not Found</h2>
          <p className="text-gray-600 text-center mb-4">
            Could not load the assessment with ID: {assessmentId}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </Card>
      </div>
    );
  }

  // Determine if this is a 360° or 1x1 assessment
  const is360 = assessment.assessmentType === '360' || assessment.assessmentType === 'peer';
  const isPublished = assessment.status === 'published' || assessment.status === 'calibrated' || assessment.mshPublished;
  const isCompleted = assessment.status === 'completed';
  
  console.log('🎨 Rendering header with:', {
    subjectName: subjectInfo?.displayName,
    assessorName: assessorInfo?.displayName,
    subjectInfo,
    assessorInfo,
    status: isPublished ? 'published' : isCompleted ? 'completed' : 'in-progress'
  });

  return (
    <div className={`min-h-screen ${is360 ? 'bg-teal-50' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header Component */}
        <PageHeader
          mode={assessment?.assessmentType || '1x1'}
          title="1x1 Assessment"
          subtitle={`Assessing ${subjectInfo?.displayName || 'Subject'}`}
          subjectName={subjectInfo?.displayName || 'Loading...'}
          assessorName={assessorInfo?.displayName || 'You'}
          subject={subjectInfo}
          assessor={assessorInfo}
          status={isPublished ? 'published' : isCompleted ? 'completed' : 'in-progress'}
          onBack={() => navigate(-1)}
          showBackButton={true}
        />

        {/* Main Content Area */}
        <div className="px-6 py-6">

        {/* Assessment Grid Component with MSH³ Compass */}
        <AssessmentGrid 
          scores={scores} 
          onScoreChange={handleScoreChange}
          readOnly={isReadOnly}
        />

        {/* Assessment Notes */}
        <Card className="mb-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Assessment Notes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-purple-600 mb-2">Culture Notes</label>
              <textarea
                value={notes.culture}
                onChange={(e) => handleNoteChange('culture', e.target.value)}
                disabled={isReadOnly}
                placeholder="How they show up and engage with others..."
                rows="4"
                className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-orange-600 mb-2">Competencies Notes</label>
              <textarea
                value={notes.competencies}
                onChange={(e) => handleNoteChange('competencies', e.target.value)}
                disabled={isReadOnly}
                placeholder="What they know and can do effectively..."
                rows="4"
                className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm disabled:bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-blue-600 mb-2">Execution Notes</label>
              <textarea
                value={notes.execution}
                onChange={(e) => handleNoteChange('execution', e.target.value)}
                disabled={isReadOnly}
                placeholder="How they deliver results and drive impact..."
                rows="4"
                className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm disabled:bg-gray-100"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">General Notes / Overall Comments</label>
            <textarea
              value={notes.general}
              onChange={(e) => handleNoteChange('general', e.target.value)}
              disabled={isReadOnly}
              placeholder="Overall observations, development areas, strengths, recommendations..."
              rows="4"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm disabled:bg-gray-100"
            />
          </div>
        </Card>

        {/* HRP Flag - 1x1 ONLY (MSH Publishing feature) */}
        {!is360 && !isReadOnly && !isPublished && (
          <Card className="mb-6 bg-yellow-50 border-2 border-yellow-300">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="hrpRequested"
                checked={hrpRequested}
                onChange={(e) => setHrpRequested(e.target.checked)}
                className="mt-1 h-5 w-5 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
              />
              <div>
                <label htmlFor="hrpRequested" className="font-bold text-yellow-900 cursor-pointer">
                  🚩 Request HRP Review
                </label>
                <p className="text-sm text-yellow-800 mt-1">
                  Check this box if this MSH requires Human Resources Partner review or intervention
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {!isReadOnly && !isPublished && !isCompleted && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            
            {/* 360° Assessments - Just Submit */}
            {is360 && (
              <button
                onClick={handleCompleteAssessment}
                disabled={submitting}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 flex items-center gap-2 font-bold"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            )}
            
            {/* 1x1 Assessments - Publish MSH */}
            {!is360 && (
              <>
                <button
                  onClick={() => openPublishDialog(true)}
                  disabled={publishing}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2 font-bold"
                >
                  <CheckCircle className="w-5 h-5" />
                  {publishing ? 'Publishing...' : 'Publish Aligned'}
                </button>
                
                <button
                  onClick={() => openPublishDialog(false)}
                  disabled={publishing}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center gap-2 font-bold"
                >
                  <AlertCircle className="w-5 h-5" />
                  {publishing ? 'Publishing...' : 'Publish Not Aligned'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Completed State - 360° */}
        {is360 && isCompleted && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-900 mb-2">Assessment Completed</h3>
            <p className="text-green-700">This assessment is ready for alignment and MSH publishing in the 360° Comparison View.</p>
          </div>
        )}

        {/* Published State - 1x1 */}
        {!is360 && isPublished && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-900 mb-2">MSH Published</h3>
            <p className="text-green-700">This assessment and MSH have been published and can no longer be edited.</p>
          </div>
        )}
        </div>
      </div>

      {/* Publisher Notes Dialog */}
      {showPublishDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {selectedAlignment ? 'Publish MSH as Aligned' : 'Publish MSH as Not Aligned'}
              </h2>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  {selectedAlignment 
                    ? 'You are publishing this MSH as ALIGNED. Add notes to explain the alignment decision (optional).'
                    : 'You are publishing this MSH as NOT ALIGNED. Please explain why the assessment does not align (required).'
                  }
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Publisher Notes {!selectedAlignment && <span className="text-red-600">*</span>}
                </label>
                <textarea
                  value={publisherNotes}
                  onChange={(e) => setPublisherNotes(e.target.value)}
                  placeholder={selectedAlignment 
                    ? "Optional: Add context about alignment decision, performance observations, or development notes..."
                    : "Required: Explain why this MSH is not aligned. Include specific examples, gaps, or concerns..."
                  }
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {!selectedAlignment && !publisherNotes.trim() && (
                  <p className="text-sm text-red-600 mt-1">Publisher notes are required for Not Aligned MSH</p>
                )}
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={closePublishDialog}
                  disabled={publishing}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPublish}
                  disabled={publishing || (!selectedAlignment && !publisherNotes.trim())}
                  className={`px-6 py-3 text-white rounded-lg font-bold flex items-center gap-2 ${
                    selectedAlignment 
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  {publishing ? 'Publishing...' : `Publish ${selectedAlignment ? 'Aligned' : 'Not Aligned'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssessmentGrid1x1;