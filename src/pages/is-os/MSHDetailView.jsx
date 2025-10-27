// 📁 SAVE TO: src/pages/is-os/MSHDetailView.jsx
// MSH³ Detail View - Compact design matching assessment view
// ✅ Compact layout with better space efficiency
// ✅ Uses pillarHelpers for proper display names
// ✅ HRP Review section when applicable
// ✅ Matches assessment view styling

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ArrowLeft, 
  Award, 
  User, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Clock,
  Flag
} from 'lucide-react';
import { getPillarDisplayName, getSubPillarDisplayName } from '../../utils/pillarHelpers';

function MSHDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [msh, setMsh] = useState(null);
  const [error, setError] = useState(null);
  const [subjectUser, setSubjectUser] = useState(null);
  const [publisherUser, setPublisherUser] = useState(null);

  useEffect(() => {
    console.log('🚀 MSHDetailView mounted with id:', id);
    if (id) {
      loadMSHData();
    } else {
      console.error('❌ No ID provided to MSHDetailView');
      setError('No MSH ID provided');
      setLoading(false);
    }
  }, [id]);

  const loadMSHData = async () => {
    try {
      setLoading(true);
      setError(null);
      let mshData = null;

      console.log('🔍 Starting MSH load for id:', id);

      // Try document ID first (1x1 MSH)
      if (id && id.length > 15 && !id.startsWith('MSH-')) {
        console.log('📄 Attempting Firestore document lookup by ID:', id);
        try {
          const mshDocRef = doc(db, 'mshs', id);
          const mshDoc = await getDoc(mshDocRef);
          
          if (mshDoc.exists()) {
            mshData = { id: mshDoc.id, ...mshDoc.data() };
            console.log('✅ SUCCESS: Loaded MSH by document ID');
          }
        } catch (docErr) {
          console.error('💥 ERROR during document lookup:', docErr);
          if (docErr.code === 'permission-denied') {
            console.error('🔒 PERMISSION DENIED - Check Firestore rules!');
          }
        }
      }

      // Try mshId field query
      if (!mshData && id) {
        console.log('🔎 Attempting query by mshId field:', id);
        try {
          const mshQuery = await getDocs(
            query(collection(db, 'mshs'), where('mshId', '==', id))
          );
          
          if (!mshQuery.empty) {
            const doc = mshQuery.docs[0];
            mshData = { id: doc.id, ...doc.data() };
            console.log('✅ SUCCESS: Loaded MSH by mshId query');
          }
        } catch (queryErr) {
          console.error('💥 ERROR during mshId query:', queryErr);
        }
      }

      if (!mshData) {
        console.error('❌ FINAL RESULT: MSH not found');
        setError('MSH not found - check console for details');
        return;
      }

      console.log('✅ FINAL RESULT: MSH loaded successfully!');
      setMsh(mshData);

      // Load user information
      if (mshData.subjectId) {
        try {
          const userQuery = query(
            collection(db, 'users'),
            where('userId', '==', mshData.subjectId)
          );
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            setSubjectUser(userSnapshot.docs[0].data());
          }
        } catch (err) {
          console.error('Error loading subject user:', err);
        }
      }

      if (mshData.publishedBy) {
        try {
          const pubQuery = query(
            collection(db, 'users'),
            where('userId', '==', mshData.publishedBy)
          );
          const pubSnapshot = await getDocs(pubQuery);
          if (!pubSnapshot.empty) {
            setPublisherUser(pubSnapshot.docs[0].data());
          }
        } catch (err) {
          console.error('Error loading publisher user:', err);
        }
      }

    } catch (err) {
      console.error('💥 UNEXPECTED ERROR in loadMSHData:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Calculate composite score (sum of all 6 values)
  const calculateComposite = (scores) => {
    if (!scores) return 0;
    const culture = (scores.culture?.contribution || 0) + (scores.culture?.growth || 0);
    const competencies = (scores.competencies?.contribution || 0) + (scores.competencies?.growth || 0);
    const execution = (scores.execution?.contribution || 0) + (scores.execution?.growth || 0);
    return culture + competencies + execution;
  };

  // Calculate totals for contribution and growth
  const calculateTotals = (scores) => {
    if (!scores) return { contribution: 0, growth: 0 };
    
    const contribution = (scores.culture?.contribution || 0) + 
                        (scores.competencies?.contribution || 0) + 
                        (scores.execution?.contribution || 0);
    
    const growth = (scores.culture?.growth || 0) + 
                  (scores.competencies?.growth || 0) + 
                  (scores.execution?.growth || 0);
    
    return { contribution, growth };
  };

  // Calculate nine-box position
  const calculateNineBox = (scores) => {
    const totals = calculateTotals(scores);
    
    const getLevel = (score) => {
      if (score >= 5) return 'High';
      if (score >= 3) return 'Mid';
      return 'Low';
    };

    const contribLevel = getLevel(totals.contribution);
    const growthLevel = getLevel(totals.growth);

    return {
      contribution: contribLevel,
      contributionScore: totals.contribution,
      growth: growthLevel,
      growthScore: totals.growth,
      position: `${contribLevel}-${growthLevel}`
    };
  };

  const getScoreColor = (score) => {
    if (score === 2) return 'bg-green-100 text-green-800 border-green-300';
    if (score === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  const getMonthName = (cycleId) => {
    if (!cycleId) return 'Unknown';
    const parts = cycleId.split('-');
    if (parts.length !== 3) return cycleId;
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(parts[2]) - 1;
    return `${months[monthIndex]} ${parts[1]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MSH...</p>
        </div>
      </div>
    );
  }

  if (error || !msh) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <XCircle className="w-6 h-6 text-red-600 mb-2" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">MSH Not Found</h3>
            <p className="text-red-700 mb-4">{error || 'MSH could not be loaded'}</p>
            <button
              onClick={() => navigate('/is-os')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Return to Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const composite = calculateComposite(msh.scores);
  const totals = calculateTotals(msh.scores);
  const nineBox = calculateNineBox(msh.scores);
  const is360 = msh.mshType === '360';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {msh.mshId || 'MSH³ Assessment'}
                </h1>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="text-gray-600">
                    {subjectUser?.name || msh.subjectName || msh.subjectId}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{getMonthName(msh.cycleId)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                is360 ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {is360 ? '360°' : '1x1'}
              </span>
              <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                Published
              </span>
              {msh.isAligned === false && (
                <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                  Not Aligned
                </span>
              )}
              {msh.hrpRequested && (
                <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                  🚩 HRP
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        
        {/* Summary Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Contribution */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white text-center">
              <div className="text-sm font-medium mb-2">Contribution</div>
              <div className="text-5xl font-bold mb-1">{totals.contribution}</div>
              <div className="text-sm opacity-90">of 6</div>
            </div>
            
            {/* Growth */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white text-center">
              <div className="text-sm font-medium mb-2">Growth</div>
              <div className="text-5xl font-bold mb-1">{totals.growth}</div>
              <div className="text-sm opacity-90">of 6</div>
            </div>
            
            {/* Composite */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg p-6 text-white text-center">
              <div className="text-sm font-medium mb-2">Composite</div>
              <div className="text-5xl font-bold mb-1">{composite}</div>
              <div className="text-sm opacity-90">of 12</div>
            </div>
          </div>
        </div>

        {/* Assessment Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="text-base font-semibold mb-4">Assessment Notes</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Culture Notes */}
            <div>
              <h4 className="text-sm font-semibold text-purple-900 mb-2">Culture Notes</h4>
              <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded border border-purple-200 min-h-[80px]">
                {msh.notes?.culture || '—'}
              </p>
            </div>
            
            {/* Competencies Notes */}
            <div>
              <h4 className="text-sm font-semibold text-orange-900 mb-2">Competencies Notes</h4>
              <p className="text-sm text-gray-700 bg-orange-50 p-3 rounded border border-orange-200 min-h-[80px]">
                {msh.notes?.competencies || '—'}
              </p>
            </div>
            
            {/* Execution Notes */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-900 mb-2">Execution Notes</h4>
              <p className="text-sm text-gray-700 bg-emerald-50 p-3 rounded border border-emerald-200 min-h-[80px]">
                {msh.notes?.execution || '—'}
              </p>
            </div>
          </div>

          {/* General Notes */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">General Notes / Overall Comments</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
              {msh.notes?.general || '—'}
            </p>
          </div>
        </div>

        {/* Publisher Notes */}
        {(() => {
          const notes = msh.publisherNotes;
          
          // Handle object format (MSH³ structure)
          if (notes && typeof notes === 'object') {
            const domains = ['culture', 'competencies', 'execution', 'general'];
            const hasAnyNotes = domains.some(d => notes[d] && notes[d].trim().length > 0);
            
            if (!hasAnyNotes) return null;
            
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-blue-900">Publisher Notes</h3>
                </div>
                <div className="space-y-3">
                  {domains.map(domain => {
                    if (!notes[domain] || notes[domain].trim().length === 0) return null;
                    return (
                      <div key={domain}>
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          {domain === 'general' ? '📋 General' : domain}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap pl-2">
                          {notes[domain]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          
          // Handle string format (legacy)
          if (notes && typeof notes === 'string' && notes.trim().length > 0) {
            return (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h3 className="text-base font-bold text-orange-900">Publisher Notes</h3>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
              </div>
            );
          }
          
          return null;
        })()}

        {/* MSH³ Scores Grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="text-base font-semibold mb-4">MSH³ Scores</h3>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Culture */}
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <h4 className="text-sm font-bold text-purple-900 mb-3 text-center">Culture</h4>
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Contribution</div>
                  <div className={`text-center py-2 rounded border font-bold text-xl ${getScoreColor(msh.scores?.culture?.contribution)}`}>
                    {msh.scores?.culture?.contribution ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Growth</div>
                  <div className={`text-center py-2 rounded border font-bold text-xl ${getScoreColor(msh.scores?.culture?.growth)}`}>
                    {msh.scores?.culture?.growth ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Competencies */}
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <h4 className="text-sm font-bold text-orange-900 mb-3 text-center">Competencies</h4>
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Contribution</div>
                  <div className={`text-center py-2 rounded border font-bold text-xl ${getScoreColor(msh.scores?.competencies?.contribution)}`}>
                    {msh.scores?.competencies?.contribution ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Growth</div>
                  <div className={`text-center py-2 rounded border font-bold text-xl ${getScoreColor(msh.scores?.competencies?.growth)}`}>
                    {msh.scores?.competencies?.growth ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Execution */}
            <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
              <h4 className="text-sm font-bold text-emerald-900 mb-3 text-center">Execution</h4>
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Contribution</div>
                  <div className={`text-center py-2 rounded border font-bold text-xl ${getScoreColor(msh.scores?.execution?.contribution)}`}>
                    {msh.scores?.execution?.contribution ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Growth</div>
                  <div className={`text-center py-2 rounded border font-bold text-xl ${getScoreColor(msh.scores?.execution?.growth)}`}>
                    {msh.scores?.execution?.growth ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Score Legend */}
          <div className="mt-4 flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
              <span>2 = Exceeds</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
              <span>1 = Meets</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
              <span>0 = Below</span>
            </div>
          </div>
        </div>

        {/* HRP Review Section - Only show if HRP review is requested or has been completed */}
        {(msh.hrpRequested || msh.hrpReviewed || msh.hrpNotes) && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold text-red-900">HRP Review</h3>
              {msh.hrpReviewed && (
                <span className="ml-auto px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" />
                  Reviewed
                </span>
              )}
              {msh.hrpRequested && !msh.hrpReviewed && (
                <span className="ml-auto px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Pending Review
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
                <p className="text-sm text-gray-900">
                  {msh.hrpReviewed 
                    ? `Reviewed on ${formatDate(msh.hrpReviewedAt)}`
                    : 'Pending HRP review'}
                </p>
              </div>
              
              {msh.hrpReviewedBy && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Reviewed By</h4>
                  <p className="text-sm text-gray-900">{msh.hrpReviewedBy}</p>
                </div>
              )}
            </div>

            {msh.hrpNotes && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">HRP Comments</h4>
                <div className="bg-white border border-red-200 rounded p-3">
                  <p className="text-sm text-gray-700">{msh.hrpNotes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assessment Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-base font-semibold mb-4">Assessment Details</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Assessee</div>
              <div className="text-gray-900 font-medium">
                {subjectUser?.name || msh.subjectName || msh.subjectId}
              </div>
            </div>
            
            {subjectUser?.layer && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Layer</div>
                <div className="text-gray-900 font-medium">{subjectUser.layer}</div>
              </div>
            )}
            
            {subjectUser?.pillar && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Pillar</div>
                <div className="text-gray-900 font-medium">
                  {getPillarDisplayName(subjectUser.pillar)}
                </div>
              </div>
            )}
            
            {subjectUser?.subPillar && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Sub-Pillar</div>
                <div className="text-gray-900 font-medium">
                  {getSubPillarDisplayName(subjectUser.subPillar)}
                </div>
              </div>
            )}
            
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Type</div>
              <div className="text-gray-900 font-medium">{is360 ? '360°' : '1x1'}</div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Cycle</div>
              <div className="text-gray-900 font-medium">{getMonthName(msh.cycleId)}</div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Published</div>
              <div className="text-gray-900 font-medium">{formatDate(msh.publishedAt || msh.createdAt)}</div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Published By</div>
              <div className="text-gray-900 font-medium">
                {publisherUser?.name || msh.publishedByName || msh.publishedBy || '—'}
              </div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">9-Box Position</div>
              <div className="text-gray-900 font-medium">{nineBox.position}</div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Alignment</div>
              <div className="font-medium">
                {msh.isAligned === false ? (
                  <span className="text-orange-600">Not Aligned</span>
                ) : (
                  <span className="text-green-600">Aligned</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MSHDetailView;