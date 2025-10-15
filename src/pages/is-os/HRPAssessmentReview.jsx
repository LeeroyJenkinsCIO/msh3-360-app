// 📁 SAVE TO: src/pages/is-os/HRPAssessmentReview.jsx
// COMPLETE VERSION - Shows full original assessment + HRP meeting notes

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ArrowLeft, CheckCircle, AlertCircle, Calendar, User, Info
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

function HRPAssessmentReview() {
  const { assessmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState(null);
  const [assesseeData, setAssesseeData] = useState(null);
  const [assessorData, setAssessorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // HRP Meeting Notes
  const [hrpMeetingNotes, setHrpMeetingNotes] = useState('');

  useEffect(() => {
    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
        
        if (!assessmentId) {
          console.error('No assessment ID provided');
          return;
        }
        
        // Get assessment
        const assessmentDoc = await getDoc(doc(db, 'assessments', assessmentId));
        if (!assessmentDoc.exists()) {
          console.error('Assessment not found');
          return;
        }
        
        const data = assessmentDoc.data();
        const assessmentData = {
          id: assessmentDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null,
          completedAt: data.completedAt?.toDate?.() || null,
          hrpReviewedAt: data.hrpReviewedAt?.toDate?.() || null
        };
        
        console.log('📊 Loaded assessment:', assessmentData);
        console.log('📊 Assessment ID:', assessmentData.id);
        console.log('📊 Subject ID (assessee):', data.subjectId);
        console.log('📊 Assessor ID:', data.assessorId);
        console.log('📊 Raw scores object:', assessmentData.scores);
        console.log('📊 Composite from DB:', assessmentData.composite);
        
        // Log each individual score field
        if (assessmentData.scores) {
          console.log('📊 Culture (contribution):', assessmentData.scores.culture);
          console.log('📊 Mindset (growth):', assessmentData.scores.mindset);
          console.log('📊 Competencies (contribution):', assessmentData.scores.competencies);
          console.log('📊 Skillset (growth):', assessmentData.scores.skillset);
          console.log('📊 Execution (contribution):', assessmentData.scores.execution);
          console.log('📊 Habits (growth):', assessmentData.scores.habits);
        }
        
        setAssessment(assessmentData);
        setHrpMeetingNotes(assessmentData.hrpMeetingNotes || '');
        
        // Get assessee data - use subjectId
        if (data.subjectId) {
          const assesseeDoc = await getDoc(doc(db, 'users', data.subjectId));
          if (assesseeDoc.exists()) {
            setAssesseeData(assesseeDoc.data());
          }
        }
        
        // Get assessor data
        if (data.assessorId) {
          const assessorDoc = await getDoc(doc(db, 'users', data.assessorId));
          if (assessorDoc.exists()) {
            setAssessorData(assessorDoc.data());
          }
        }
        
      } catch (error) {
        console.error('Error fetching assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId]);

  // Safe number getter - handles nested score objects
  const safeGetNumber = (value, fallback = 0) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && !isNaN(value)) return Number(value);
    return fallback;
  };
  
  // Get contribution value from score field
  const getContributionValue = (scoreField) => {
    if (typeof scoreField === 'number') return scoreField;
    if (typeof scoreField === 'object' && scoreField?.contribution !== undefined) {
      return safeGetNumber(scoreField.contribution);
    }
    return 0;
  };
  
  // Get growth value from score field
  const getGrowthValue = (scoreField) => {
    if (typeof scoreField === 'number') return scoreField;
    if (typeof scoreField === 'object' && scoreField?.growth !== undefined) {
      return safeGetNumber(scoreField.growth);
    }
    return 0;
  };

  // Safe string getter
  const safeGetString = (value, fallback = 'No notes provided') => {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return fallback;
  };

  // Calculate domain scores
  const calculateDomainScores = (scores) => {
    if (!scores || typeof scores !== 'object') return {};
    
    const results = {};
    
    // Scores structure: { culture: {contribution: X, growth: Y}, competencies: {...}, execution: {...} }
    const domains = ['Culture', 'Competencies', 'Execution'];
    const scoreKeys = {
      'Culture': 'culture',
      'Competencies': 'competencies',
      'Execution': 'execution'
    };
    
    domains.forEach(domain => {
      const scoreKey = scoreKeys[domain];
      const domainScore = scores[scoreKey];
      
      if (domainScore && typeof domainScore === 'object') {
        const contribution = getContributionValue(domainScore);
        const growth = getGrowthValue(domainScore);
        
        results[domain] = {
          contribution,
          growth,
          total: contribution + growth
        };
      } else {
        results[domain] = {
          contribution: 0,
          growth: 0,
          total: 0
        };
      }
    });
    
    console.log('🔢 Domain scores calculated:', results);
    
    return results;
  };

  // Calculate totals
  const calculateTotals = (scores) => {
    if (!scores || typeof scores !== 'object') {
      console.log('⚠️ No scores object found');
      return { totalContribution: 0, totalGrowth: 0, composite: 0 };
    }
    
    console.log('🔢 Calculating totals from scores:', scores);
    
    // Extract values from nested structure
    // Each domain has {contribution: X, growth: Y}
    const cultureContrib = getContributionValue(scores.culture);
    const cultureGrowth = getGrowthValue(scores.culture);
    
    const compContrib = getContributionValue(scores.competencies);
    const compGrowth = getGrowthValue(scores.competencies);
    
    const execContrib = getContributionValue(scores.execution);
    const execGrowth = getGrowthValue(scores.execution);
    
    const contribution = cultureContrib + compContrib + execContrib;
    const growth = cultureGrowth + compGrowth + execGrowth;
    
    console.log('🔢 Contribution values:', {
      culture: cultureContrib,
      competencies: compContrib,
      execution: execContrib,
      total: contribution
    });
    
    console.log('🔢 Growth values:', {
      culture: cultureGrowth,
      competencies: compGrowth,
      execution: execGrowth,
      total: growth
    });
    
    const result = {
      totalContribution: contribution,
      totalGrowth: growth,
      composite: contribution + growth
    };
    
    console.log('🔢 Final totals:', result);
    
    return result;
  };

  const handleMarkComplete = async () => {
    if (!hrpMeetingNotes.trim()) {
      alert('Please document the HRP meeting discussion before marking as complete.');
      return;
    }

    const confirmMessage = assessment?.hrpReviewedAt 
      ? 'Update HRP review notes and save changes?'
      : 'Mark this HRP review as complete? This will update the assessment status.';

    if (!window.confirm(confirmMessage)) return;

    try {
      setSaving(true);
      
      const updateData = {
        hrpReviewedAt: serverTimestamp(),
        hrpReviewedBy: user.uid,
        hrpReviewerName: user.displayName || 'Unknown HRP',
        hrpReviewStatus: 'complete',
        hrpMeetingNotes: hrpMeetingNotes.trim(),
        lastModifiedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'assessments', assessmentId), updateData);
      
      alert('HRP review marked as complete successfully!');
      navigate('/is-os');
    } catch (error) {
      console.error('Error marking HRP review complete:', error);
      alert('Error completing review. Please try again.');
    } finally {
      setSaving(false);
    }
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

  const domainScores = calculateDomainScores(assessment.scores);
  const totals = calculateTotals(assessment.scores);
  const isReviewComplete = !!assessment.hrpReviewedAt;

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
                {isReviewComplete ? 'Review completed - View documentation' : 'Review original assessment and document HRP meeting'}
              </p>
            </div>
            {isReviewComplete && (
              <Badge variant="success" className="text-lg px-4 py-2 bg-green-500">
                <CheckCircle className="w-5 h-5 mr-2" />
                Review Complete
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        
        {/* ==================== ORIGINAL ASSESSMENT (READ-ONLY) ==================== */}
        <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Original Assessment (Read-Only)</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Below is the complete original assessment as submitted. All data is preserved and cannot be edited during HRP review.
          </p>
        </div>

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
              <AlertCircle className="w-5 h-5 mr-2" />
              Not Aligned
            </Badge>
          )}
        </div>

        {/* Subject and Assessor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Subject (Assessee) */}
          <Card>
            <div className="text-sm text-gray-600 mb-3">Subject</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                {assesseeData?.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">{assesseeData?.displayName || 'Unknown'}</div>
                <div className="text-sm text-gray-600">Type: {assessment.assessmentType || '1x1'}</div>
                <div className="text-sm text-gray-500">{assesseeData?.layer || 'Unknown Layer'}</div>
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
                <div className="text-sm text-gray-600">
                  Completed: {assessment.completedAt?.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
                <div className="text-sm text-gray-500">Type: {assessment.assessmentType || '1x1'}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Score Summary */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Summary</h3>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-orange-500">{safeGetNumber(totals.totalContribution)}</div>
              <div className="text-sm text-gray-600 mt-1">Contribution</div>
              <div className="text-xs text-gray-500">0-6 scale</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-500">{safeGetNumber(totals.totalGrowth)}</div>
              <div className="text-sm text-gray-600 mt-1">Growth</div>
              <div className="text-xs text-gray-500">0-6 scale</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-500">{safeGetNumber(assessment.composite || totals.composite)}</div>
              <div className="text-sm text-gray-600 mt-1">Composite</div>
              <div className="text-xs text-gray-500">0-12 scale</div>
              {assessment.composite !== totals.composite && (
                <div className="text-xs text-red-600 mt-1">
                  ⚠️ Calc: {totals.composite} vs DB: {assessment.composite}
                </div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-600 mb-1">Nine-Box Position</div>
            <div className="text-xl font-semibold text-gray-900">{assessment.nineBoxPosition || 'Inconsistent'}</div>
          </div>
        </Card>

        {/* Detailed Scores */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Scores</h3>
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
                          {safeGetNumber(scores.contribution)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded bg-green-100 text-green-800 font-bold">
                          {safeGetNumber(scores.growth)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-900">{safeGetNumber(scores.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Assessment Notes (Domain-Specific) */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <h4 className="font-semibold text-purple-700 mb-2 text-sm">Culture Notes</h4>
              <div className="p-3 bg-purple-50 rounded text-sm text-gray-700 min-h-[80px]">
                {safeGetString(assessment.cultureNotes)}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-orange-700 mb-2 text-sm">Competencies Notes</h4>
              <div className="p-3 bg-orange-50 rounded text-sm text-gray-700 min-h-[80px]">
                {safeGetString(assessment.competenciesNotes)}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 mb-2 text-sm">Execution Notes</h4>
              <div className="p-3 bg-blue-50 rounded text-sm text-gray-700 min-h-[80px]">
                {safeGetString(assessment.executionNotes)}
              </div>
            </div>
          </div>

          {/* General Notes */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">General Notes / Overall Comments</h4>
            <div className="p-3 bg-gray-50 rounded text-sm text-gray-700 min-h-[80px]">
              {safeGetString(assessment.generalNotes) || safeGetString(assessment.overallComments)}
            </div>
          </div>
        </Card>

        {/* Alignment Status */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Alignment Status</h3>
          <div className="flex items-start gap-3">
            <span className="text-sm text-gray-600">Status:</span>
            {assessment.alignmentStatus === 'aligned' ? (
              <Badge variant="success">
                <CheckCircle className="w-4 h-4 mr-1" />
                Aligned - Mutual agreement reached
              </Badge>
            ) : (
              <Badge variant="warning">
                <AlertCircle className="w-4 h-4 mr-1" />
                Not Aligned - Requires further discussion
              </Badge>
            )}
          </div>
          {assessment.alignmentStatus !== 'aligned' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">HRP Involvement Requested</div>
                  <div className="text-xs text-gray-600 mt-1">
                    This assessment has been flagged for Human Resources Partner follow-up.
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Assessment Metadata */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Assessment ID:</span>
              <span className="ml-2 font-mono text-gray-900">{assessment.id}</span>
            </div>
            <div>
              <span className="text-gray-600">Cycle:</span>
              <span className="ml-2 text-gray-900">{assessment.cycle || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2 text-gray-900">
                {assessment.createdAt?.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Completed:</span>
              <span className="ml-2 text-gray-900">
                {assessment.completedAt?.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
          </div>
        </Card>

        {/* ==================== HRP MEETING DOCUMENTATION ==================== */}
        <Card className={`mb-6 ${isReviewComplete ? 'bg-green-50 border-2 border-green-300' : 'bg-purple-50 border-2 border-purple-300'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isReviewComplete ? '✅ HRP Meeting Documentation' : 'HRP Meeting Documentation'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isReviewComplete 
                  ? 'Review completed - documentation on record'
                  : 'Document the discussion, agreements, and action items from the HRP review meeting'}
              </p>
            </div>
            {isReviewComplete && (
              <Badge variant="success" className="text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Badge>
            )}
          </div>
          
          {isReviewComplete ? (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Meeting Notes:</div>
                <div className="text-gray-900 whitespace-pre-wrap">
                  {hrpMeetingNotes || 'No notes provided during review.'}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-green-200">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span>Reviewed by {assessment.hrpReviewerName || 'Unknown HRP'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
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
            </div>
          ) : (
            <>
              <textarea
                value={hrpMeetingNotes}
                onChange={(e) => setHrpMeetingNotes(e.target.value)}
                placeholder="Example:

Meeting Date: [Date]
Attendees: [Assessee], [Assessor], [HRP Name]

Discussion Summary:
- Key topics discussed
- Concerns raised and addressed
- Agreements reached

Action Items:
1. [Action item with owner]
2. [Action item with owner]

Follow-up:
- Next steps and timeline"
                className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[300px] font-mono text-sm"
                disabled={saving}
              />
              <div className="mt-2 text-xs text-gray-600">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                These notes will be visible to the assessee and assessor after review is marked complete.
              </div>
            </>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/is-os')}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isReviewComplete ? 'Back to Hub' : 'Cancel'}
          </Button>
          
          {!isReviewComplete && (
            <Button
              variant="primary"
              onClick={handleMarkComplete}
              disabled={saving || !hrpMeetingNotes.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Mark Review Complete'}
            </Button>
          )}
        </div>

        {/* Info Box */}
        {!isReviewComplete && (
          <Card className="mt-6 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-1">HRP Review Process:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>This assessment was flagged for HRP review during the assessment process</li>
                  <li>All original assessment data is shown above for your reference</li>
                  <li>Schedule a meeting with the assessee and assessor to discuss concerns</li>
                  <li>Document the meeting discussion, agreements, and action items in the HRP section</li>
                  <li>Click "Mark Review Complete" to finalize the review</li>
                  <li><strong>Note:</strong> Original scores and notes are preserved - no changes will be made</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

export default HRPAssessmentReview;