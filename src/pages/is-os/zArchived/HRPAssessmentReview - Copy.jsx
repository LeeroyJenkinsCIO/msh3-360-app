// src/pages/is-os/HRPAssessmentReview.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ArrowLeft, Save, CheckCircle, Edit3, AlertCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

/**
 * HRP Assessment Review Component
 * 
 * Allows HR Partners to review, edit, and publish assessments.
 * Preserves MSH ID and all original assessment data.
 * 
 * MSH³ Score Structure (as stored in Firebase):
 * - culture = Culture Contribution (0-2)
 * - competencies = Competencies Contribution (0-2)
 * - execution = Execution Contribution (0-2)
 * - mindset = Culture Growth (0-2)
 * - skillset = Competencies Growth (0-2)
 * - habits = Execution Growth (0-2)
 * 
 * Composite = sum of all 6 scores (0-12 range)
 */

function HRPAssessmentReview() {
  const { assessmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState(null);
  const [assesseeData, setAssesseeData] = useState(null);
  const [assessorData, setAssessorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Review/Edit state
  const [hrpReviewNotes, setHrpReviewNotes] = useState('');
  const [editedScores, setEditedScores] = useState({
    culture: 0,
    competencies: 0,
    execution: 0,
    mindset: 0,
    skillset: 0,
    habits: 0
  });
  const [editedComposite, setEditedComposite] = useState(0);
  
  // Original values for comparison
  const [originalValues, setOriginalValues] = useState(null);

  // Domain structure for display
  const domainStructure = {
    'Culture': {
      contribution: 'culture',
      growth: 'mindset'
    },
    'Competencies': {
      contribution: 'competencies',
      growth: 'skillset'
    },
    'Execution': {
      contribution: 'execution',
      growth: 'habits'
    }
  };

  // Score field labels for editing
  const scoreLabels = {
    culture: 'Culture (Contribution)',
    competencies: 'Competencies (Contribution)',
    execution: 'Execution (Contribution)',
    mindset: 'Mindset (Growth)',
    skillset: 'Skillset (Growth)',
    habits: 'Habits (Growth)'
  };

  useEffect(() => {
    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
        
        // Get assessment
        const assessmentDoc = await getDoc(doc(db, 'assessments', assessmentId));
        if (!assessmentDoc.exists()) {
          console.error('Assessment not found');
          return;
        }
        
        const assessmentData = {
          id: assessmentDoc.id,
          ...assessmentDoc.data(),
          createdAt: assessmentDoc.data().createdAt?.toDate?.() || null,
          completedAt: assessmentDoc.data().completedAt?.toDate?.() || null,
          hrpReviewedAt: assessmentDoc.data().hrpReviewedAt?.toDate?.() || null
        };
        
        console.log('📊 Loaded assessment data:', assessmentData);
        console.log('📊 Scores:', assessmentData.scores);
        console.log('📊 Composite:', assessmentData.composite);
        
        setAssessment(assessmentData);
        setHrpReviewNotes(assessmentData.hrpReviewNotes || '');
        
        // Set initial scores for editing
        if (assessmentData.scores) {
          setEditedScores(assessmentData.scores);
        }
        setEditedComposite(assessmentData.composite || 0);
        
        // Get assessee data
        const assesseeDoc = await getDoc(doc(db, 'users', assessmentData.assesseeId));
        if (assesseeDoc.exists()) {
          setAssesseeData(assesseeDoc.data());
        }
        
        // Get assessor data
        const assessorDoc = await getDoc(doc(db, 'users', assessmentData.assessorId));
        if (assessorDoc.exists()) {
          setAssessorData(assessorDoc.data());
        }
        
      } catch (error) {
        console.error('Error fetching assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId]);

  // Calculate domain scores from individual scores
  const calculateDomainScores = (scores) => {
    if (!scores) return {};
    
    const results = {};
    
    Object.entries(domainStructure).forEach(([domain, fields]) => {
      results[domain] = {
        contribution: scores[fields.contribution] || 0,
        growth: scores[fields.growth] || 0,
        total: (scores[fields.contribution] || 0) + (scores[fields.growth] || 0)
      };
    });
    
    return results;
  };

  // Calculate totals
  const calculateTotals = (scores) => {
    if (!scores) return { totalContribution: 0, totalGrowth: 0, composite: 0 };
    
    const contribution = (scores.culture || 0) + (scores.competencies || 0) + (scores.execution || 0);
    const growth = (scores.mindset || 0) + (scores.skillset || 0) + (scores.habits || 0);
    
    return {
      totalContribution: contribution,
      totalGrowth: growth,
      composite: contribution + growth
    };
  };

  const calculateComposite = (scores) => {
    return Object.values(scores).reduce((sum, val) => sum + (val || 0), 0);
  };

  const handleScoreChange = (field, value) => {
    const numValue = parseInt(value);
    if (numValue < 0 || numValue > 2) return;
    
    const newScores = {
      ...editedScores,
      [field]: numValue
    };
    
    setEditedScores(newScores);
    setEditedComposite(calculateComposite(newScores));
  };

  const handlePublishAsIs = async () => {
    try {
      setSaving(true);
      
      console.log('📤 Publishing as-is, preserving all original data');
      
      // Only update HRP review fields, preserve everything else
      await updateDoc(doc(db, 'assessments', assessmentId), {
        hrpReviewedAt: serverTimestamp(),
        hrpReviewedBy: user.uid,
        hrpReviewStatus: 'reviewed',
        hrpReviewNotes: hrpReviewNotes || null
      });
      
      console.log('✅ Published successfully, all original data preserved');
      alert('Assessment published as-is successfully!');
      navigate('/is-os');
    } catch (error) {
      console.error('Error publishing assessment:', error);
      alert('Error publishing assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnterEditMode = () => {
    // Store original values
    setOriginalValues({
      scores: { ...assessment.scores },
      composite: assessment.composite,
      nineBoxPosition: assessment.nineBoxPosition
    });
    
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    // Restore original values
    if (originalValues) {
      setEditedScores(originalValues.scores);
      setEditedComposite(originalValues.composite);
    }
    setIsEditMode(false);
    setOriginalValues(null);
  };

  const calculateNineBoxPosition = (composite, potential) => {
    // Performance axis (composite score) - Nine-box thresholds
    let performance = 'Low';
    if (composite >= 3 && composite <= 4) performance = 'Mid';
    else if (composite >= 5) performance = 'High';
    
    return `${performance} Performance / ${potential} Potential`;
  };

  const handleSaveWithChanges = async () => {
    try {
      setSaving(true);
      
      console.log('📤 Saving with changes');
      console.log('Original scores:', originalValues.scores);
      console.log('New scores:', editedScores);
      
      // Calculate new nine-box position based on edited composite
      const newNineBoxPosition = calculateNineBoxPosition(
        editedComposite, 
        assessment.potentialRating || 'Mid'
      );
      
      // Build update object - only include what's changing
      const updateData = {
        scores: editedScores,
        composite: editedComposite,
        nineBoxPosition: newNineBoxPosition,
        hrpOriginalValues: originalValues,
        hrpReviewedAt: serverTimestamp(),
        hrpReviewedBy: user.uid,
        hrpReviewStatus: 'reviewed',
        hrpReviewNotes: hrpReviewNotes || null,
        lastModifiedAt: serverTimestamp()
      };
      
      console.log('📊 Update data:', updateData);
      
      await updateDoc(doc(db, 'assessments', assessmentId), updateData);
      
      console.log('✅ Updated successfully');
      alert('Assessment updated and published successfully!');
      navigate('/is-os');
    } catch (error) {
      console.error('Error updating assessment:', error);
      alert('Error updating assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getScoreLabel = (score) => {
    if (score === 0) return 'Below Standard';
    if (score === 1) return 'Meets Standard';
    if (score === 2) return 'Exceeds Standard';
    return 'Not Rated';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
          <Button onClick={() => navigate('/is-os')}>Return to HRP Hub</Button>
        </div>
      </div>
    );
  }

  const domainScores = calculateDomainScores(isEditMode ? editedScores : assessment.scores);
  const totals = calculateTotals(isEditMode ? editedScores : assessment.scores);
  const displayComposite = isEditMode ? editedComposite : (assessment.composite || totals.composite);

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/is-os')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to HRP Hub
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">HRP Assessment Review</h1>
              <p className="text-purple-100">
                {isEditMode ? 'Edit and publish assessment' : assessment.hrpReviewedAt ? 'View reviewed assessment' : 'Review and publish assessment'}
              </p>
            </div>
            {assessment.hrpReviewedAt && (
              <Badge variant="success" className="text-lg px-4 py-2 bg-green-500">
                <CheckCircle className="w-5 h-5 mr-2" />
                Reviewed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Assessment Details Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assessment Details</h2>
            <p className="text-sm text-gray-600">MSH ID: <span className="text-blue-600 font-semibold">{assessment.mshId || 'N/A'}</span></p>
          </div>
          {assessment.alignmentStatus === 'aligned' ? (
            <Badge variant="success" className="text-lg px-4 py-2">
              <CheckCircle className="w-5 h-5 mr-2" />
              Aligned
            </Badge>
          ) : (
            <Badge variant="warning" className="text-lg px-4 py-2">
              Not Aligned
            </Badge>
          )}
        </div>

        {/* Assessee and Assessor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Assessee */}
          <Card>
            <div className="text-sm text-gray-600 mb-3">Assessee</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                {assesseeData?.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">{assesseeData?.displayName || 'Unknown'}</div>
                <div className="text-sm text-gray-600">{assesseeData?.layer || 'Unknown Layer'}</div>
                <div className="text-sm text-gray-500">{assesseeData?.pillar || 'No pillar'}</div>
              </div>
            </div>
          </Card>

          {/* Assessor */}
          <Card>
            <div className="text-sm text-gray-600 mb-3">Assessor</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white text-xl font-bold">
                {assessorData?.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">{assessorData?.displayName || 'Unknown'}</div>
                <div className="text-sm text-gray-600">{assessorData?.layer || 'Unknown Layer'}</div>
                <div className="text-sm text-gray-500">
                  {assessment.completedAt?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Score Summary */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Summary</h3>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-orange-500">{totals.totalContribution}</div>
              <div className="text-sm text-gray-600 mt-1">Contribution</div>
              <div className="text-xs text-gray-500">0-6 scale</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-500">{totals.totalGrowth}</div>
              <div className="text-sm text-gray-600 mt-1">Growth</div>
              <div className="text-xs text-gray-500">0-6 scale</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-500">{displayComposite}</div>
              <div className="text-sm text-gray-600 mt-1">Composite</div>
              <div className="text-xs text-gray-500">0-12 scale</div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-600 mb-1">Nine-Box Position</div>
            <div className="text-xl font-semibold text-gray-900">{assessment.nineBoxPosition || 'Not calculated'}</div>
          </div>
        </Card>

        {/* Detailed Scores with Edit Mode */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Scores</h3>
            {!isEditMode && user?.role === 'hrp' && (
              <Button
                variant="secondary"
                onClick={handleEnterEditMode}
                size="sm"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {assessment.hrpReviewedAt ? 'Edit Scores Again' : 'Edit Scores'}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Domain</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Contribution</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Growth</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(domainScores).map(([domain, scores]) => (
                  <tr key={domain} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">{domain}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded bg-orange-100 text-orange-800 font-bold">
                          {scores.contribution}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded bg-green-100 text-green-800 font-bold">
                          {scores.growth}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-900">{scores.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Individual Score Editing in Edit Mode */}
          {isEditMode && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Edit Individual Scores</h4>
              <div className="space-y-4">
                {Object.entries(editedScores).map(([field, value]) => (
                  <div key={field} className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{scoreLabels[field]}</div>
                    <div className="flex items-center gap-4">
                      {originalValues && originalValues.scores[field] !== value && (
                        <Badge variant="warning" className="text-xs">
                          Changed from {originalValues.scores[field]}
                        </Badge>
                      )}
                      <select
                        value={value}
                        onChange={(e) => handleScoreChange(field, e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="0">0 - Below Standard</option>
                        <option value="1">1 - Meets Standard</option>
                        <option value="2">2 - Exceeds Standard</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Assessment Notes */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Culture Notes</h4>
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                {assessment.comments?.leadershipCapability || 
                 assessment.comments?.strategicThinking || 
                 assessment.notes?.culture ||
                 'No notes provided'}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Competencies Notes</h4>
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                {assessment.comments?.outcomeDelivery || 
                 assessment.comments?.teamDevelopment || 
                 assessment.notes?.competencies ||
                 'No notes provided'}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Execution Notes</h4>
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                {assessment.comments?.collaboration || 
                 assessment.comments?.innovation || 
                 assessment.notes?.execution ||
                 'No notes provided'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Key Strengths</h4>
              <div className="p-3 bg-green-50 rounded text-sm text-gray-700">
                {assessment.keyStrengths || 
                 assessment.notes?.strengths || 
                 'No notes provided'}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Development Areas</h4>
              <div className="p-3 bg-orange-50 rounded text-sm text-gray-700">
                {assessment.developmentAreas || 
                 assessment.notes?.developmentAreas || 
                 'No notes provided'}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Action Items</h4>
              <div className="p-3 bg-blue-50 rounded text-sm text-gray-700">
                {assessment.actionItems || 
                 assessment.notes?.actionItems || 
                 'No notes provided'}
              </div>
            </div>
          </div>
        </Card>

        {/* Alignment Status */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Alignment Status</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            {assessment.alignmentStatus === 'aligned' ? (
              <Badge variant="success">
                <CheckCircle className="w-4 h-4 mr-1" />
                Aligned - Mutual agreement reached
              </Badge>
            ) : (
              <Badge variant="warning">
                Not Aligned
              </Badge>
            )}
          </div>
        </Card>

        {/* HRP Review Notes */}
        <Card className={`mb-6 ${assessment.hrpReviewedAt && !isEditMode ? 'bg-green-50 border-2 border-green-300' : 'bg-purple-50 border-2 border-purple-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {assessment.hrpReviewedAt && !isEditMode ? '✓ HRP Review Completed' : 'HRP Review Notes'}
            </h3>
            {assessment.hrpReviewedAt && !isEditMode && (
              <Badge variant="success" className="text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                Published
              </Badge>
            )}
          </div>
          
          {assessment.hrpReviewedAt && !isEditMode ? (
            // Read-only view of HRP notes after review
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Review Notes:</div>
                <div className="text-gray-900 whitespace-pre-wrap">
                  {hrpReviewNotes || 'No notes provided during review.'}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Reviewed by {assessment.hrpReviewedBy}</span>
                </div>
                <div>
                  {assessment.hrpReviewedAt?.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
              {assessment.hrpOriginalValues && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Scores Modified by HRP</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Original composite: {assessment.hrpOriginalValues.composite} → Current: {assessment.composite}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Editable textarea for HRP review in progress
            <textarea
              value={hrpReviewNotes}
              onChange={(e) => setHrpReviewNotes(e.target.value)}
              placeholder="Document the discussion and any agreements made during the review meeting..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 min-h-[120px]"
            />
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {isEditMode ? (
            <>
              <Button
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel Edit
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveWithChanges}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Changes & Publish'}
              </Button>
            </>
          ) : !assessment.hrpReviewedAt ? (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate('/is-os')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handlePublishAsIs}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {saving ? 'Publishing...' : 'Publish As-Is'}
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => navigate('/is-os')}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to HRP Hub
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}

export default HRPAssessmentReview;