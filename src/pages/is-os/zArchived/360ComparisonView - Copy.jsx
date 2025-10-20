// 📁 SAVE TO: src/pages/is-os/360ComparisonView.jsx
// Complete 360 Comparison View Component - Updated with Pairing Helpers

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  doc, 
  getDoc, 
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  addDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import { detect360Pairing, getPairingNames } from '../../utils/360Pairing';

export default function ComparisonView360() {
  const { user } = useAuth();
  const { pairType, pairingId } = useParams(); // pairType = 'pair-a' or 'pair-b'
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  
  // Pairing data
  const [pairing, setPairing] = useState(null);
  const [userProfiles, setUserProfiles] = useState([]);
  const [currentPair, setCurrentPair] = useState(null);
  
  // Aligned scores (editable by MR)
  const [alignedScores, setAlignedScores] = useState({
    culture: { contribution: 1, growth: 1 },
    competencies: { contribution: 1, growth: 1 },
    execution: { contribution: 1, growth: 1 }
  });
  
  const [alignmentNotes, setAlignmentNotes] = useState('');

  useEffect(() => {
    if (pairingId && pairType) {
      loadComparisonData();
    }
  }, [pairingId, pairType]);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading pairing:', pairingId, 'type:', pairType);
      
      // Load all assessments with this pairId
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('pairId', '==', pairingId)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      
      if (assessmentsSnapshot.empty) {
        alert('No assessments found for this pairing');
        navigate(-1);
        return;
      }
      
      const assessments = assessmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Found assessments:', assessments);
      
      // Extract MR/DR IDs from pairingId format: 360-pair-cycle-YYYY-MM-userA-userB
      const parts = pairingId.split('-');
      const userA = parts[parts.length - 2];
      const userB = parts[parts.length - 1];
      
      // Load user profiles
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const profiles = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserProfiles(profiles);
      
      // Determine MR/DR (assuming first assessment has correct manager structure)
      const sampleAssessment = assessments[0];
      const mrId = sampleAssessment.assessmentType === 'manager-down' 
        ? sampleAssessment.assessorId 
        : sampleAssessment.subjectId;
      const drId = sampleAssessment.assessmentType === 'manager-down'
        ? sampleAssessment.subjectId
        : sampleAssessment.assessorId;
      
      // Use helper to detect pairing
      const cycleMonth = sampleAssessment.cycleMonth;
      const cycleYear = sampleAssessment.cycleYear;
      const detectedPairing = detect360Pairing(assessments, mrId, drId, cycleMonth, cycleYear);
      
      if (!detectedPairing) {
        alert('Could not detect valid 360 pairing');
        navigate(-1);
        return;
      }
      
      console.log('✅ Detected pairing:', detectedPairing);
      setPairing(detectedPairing);
      
      // Set current pair based on pairType
      const pair = pairType === 'pair-a' ? detectedPairing.pairA : detectedPairing.pairB;
      setCurrentPair(pair);
      
      // Load existing aligned scores if available
      if (pair.bilateralAssessment?.alignedScores) {
        setAlignedScores(pair.bilateralAssessment.alignedScores);
      } else if (pair.bilateralAssessment?.scores) {
        setAlignedScores({
          culture: {
            contribution: pair.bilateralAssessment.scores.culture?.contribution ?? 1,
            growth: pair.bilateralAssessment.scores.culture?.growth ?? 1
          },
          competencies: {
            contribution: pair.bilateralAssessment.scores.competencies?.contribution ?? 1,
            growth: pair.bilateralAssessment.scores.competencies?.growth ?? 1
          },
          execution: {
            contribution: pair.bilateralAssessment.scores.execution?.contribution ?? 1,
            growth: pair.bilateralAssessment.scores.execution?.growth ?? 1
          }
        });
      }
      
      if (pair.bilateralAssessment?.alignmentNotes) {
        setAlignmentNotes(pair.bilateralAssessment.alignmentNotes);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading comparison data:', error);
      alert('Error loading 360 review: ' + error.message);
      navigate(-1);
    }
  };

  const handleAlignedScoreChange = (domain, dimension, value) => {
    setAlignedScores(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [dimension]: parseInt(value)
      }
    }));
  };

  const calculateComposite = (scores) => {
    if (!scores) return 0;
    const totalContribution = (scores.culture?.contribution || 0) + 
                             (scores.competencies?.contribution || 0) + 
                             (scores.execution?.contribution || 0);
    const totalGrowth = (scores.culture?.growth || 0) + 
                       (scores.competencies?.growth || 0) + 
                       (scores.execution?.growth || 0);
    return totalContribution + totalGrowth;
  };

  const calculateNineBoxPosition = (scores) => {
    const totalContribution = (scores.culture?.contribution || 0) + 
                             (scores.competencies?.contribution || 0) + 
                             (scores.execution?.contribution || 0);
    const totalGrowth = (scores.culture?.growth || 0) + 
                       (scores.competencies?.growth || 0) + 
                       (scores.execution?.growth || 0);
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
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const assessmentRef = doc(db, 'assessments', currentPair.bilateralAssessment.id);
      await updateDoc(assessmentRef, {
        alignedScores: alignedScores,
        alignmentNotes: alignmentNotes,
        updatedAt: serverTimestamp()
      });
      
      alert('Aligned scores saved!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishMSH = async () => {
    setShowPublishConfirm(false);
    setPublishing(true);
    
    try {
      const composite = calculateComposite(alignedScores);
      const nineBoxPosition = calculateNineBoxPosition(alignedScores);
      
      const mshId = await getNextMshId();
      
      const subjectId = currentPair.bilateralAssessment.subjectId;
      const subjectName = currentPair.bilateralAssessment.subjectName;
      
      await addDoc(collection(db, 'mshScores'), {
        mshId: mshId,
        mshType: '360',
        
        subjectId: subjectId,
        subjectName: subjectName,
        
        composite: composite,
        scores: {
          culture: alignedScores.culture.contribution,
          mindset: alignedScores.culture.growth,
          competencies: alignedScores.competencies.contribution,
          skillset: alignedScores.competencies.growth,
          execution: alignedScores.execution.contribution,
          habits: alignedScores.execution.growth
        },
        
        nineBoxPosition: nineBoxPosition,
        
        sourceAssessments: {
          self: currentPair.selfAssessment?.id,
          bilateral: currentPair.bilateralAssessment.id,
          pairType: pairType
        },
        
        cycleId: currentPair.bilateralAssessment.cycleId,
        cycleName: currentPair.bilateralAssessment.cycleName,
        cycleMonth: pairing.cycleMonth,
        cycleYear: pairing.cycleYear,
        
        publishedBy: user.uid,
        publishedAt: serverTimestamp()
      });
      
      // Lock bilateral assessment
      await updateDoc(doc(db, 'assessments', currentPair.bilateralAssessment.id), {
        locked: true,
        mshPublished: true,
        'impact.mshId': mshId,
        alignedScores: alignedScores,
        alignmentNotes: alignmentNotes,
        status: 'calibrated',
        publishedAt: serverTimestamp()
      });
      
      // Lock self-assessment
      if (currentPair.selfAssessment) {
        await updateDoc(doc(db, 'assessments', currentPair.selfAssessment.id), {
          locked: true,
          mshPublished: true
        });
      }
      
      alert(`✅ 360 MSH Published!\n\nMSH ID: ${mshId}\nComposite: ${composite}/12\nNine-Box: ${nineBoxPosition}\n\nReturning to hub.`);
      navigate('/is-os');
      
    } catch (error) {
      console.error('Error publishing MSH:', error);
      alert('Failed to publish MSH: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  const getNextMshId = async () => {
    try {
      const counterRef = doc(db, 'counters', 'msh');
      const counterSnap = await getDoc(counterRef);
      
      let nextNumber = 1;
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data().current || 0) + 1;
      }
      
      await setDoc(counterRef, { 
        current: nextNumber,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      return `MSH-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating MSH ID:', error);
      throw new Error('Failed to generate MSH ID');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading 360 review...</p>
        </div>
      </div>
    );
  }

  if (!pairing || !currentPair) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">360 Review not found</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const names = getPairingNames(pairing, userProfiles);
  const subjectName = pairType === 'pair-a' ? names.drName : names.mrName;
  const canEdit = user?.uid === pairing.mrId;
  const isPublished = currentPair.bilateralAssessment?.mshPublished;

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Confirm Publish</h3>
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-700 mb-6">
              Publish 360 MSH for <strong>{subjectName}</strong>?
              <br/><br/>
              This will:
              <br/>• Lock all related assessments
              <br/>• Create the final MSH record
              <br/>• Cannot be undone
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishMSH}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Publish MSH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Hub
          </button>
          
          <h1 className="text-3xl font-bold mb-2">360 Review: {subjectName}</h1>
          <p className="text-blue-100">
            {currentPair.bilateralAssessment?.cycleName} • {currentPair.label}
          </p>
          
          {isPublished && (
            <div className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">MSH Published - Read Only</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Comparison Grid */}
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">360 Comparison Grid</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border">Domain</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-purple-700 border bg-purple-50">Self</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-blue-700 border bg-blue-50">Other</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-orange-700 border bg-orange-50">Aligned</th>
                </tr>
              </thead>
              <tbody>
                {/* Culture - Contribution */}
                <tr>
                  <td className="px-4 py-3 font-semibold text-purple-600 border">Culture - Contribution</td>
                  <td className="px-4 py-3 text-center border">{currentPair.selfAssessment?.scores?.culture?.contribution || '—'}</td>
                  <td className="px-4 py-3 text-center border">{currentPair.bilateralAssessment?.scores?.culture?.contribution || '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {canEdit && !isPublished ? (
                      <select
                        value={alignedScores.culture.contribution}
                        onChange={(e) => handleAlignedScoreChange('culture', 'contribution', e.target.value)}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-orange-700">{alignedScores.culture.contribution}</span>
                    )}
                  </td>
                </tr>

                {/* Culture - Growth */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-purple-600 border">Culture - Growth</td>
                  <td className="px-4 py-3 text-center border">{currentPair.selfAssessment?.scores?.culture?.growth || '—'}</td>
                  <td className="px-4 py-3 text-center border">{currentPair.bilateralAssessment?.scores?.culture?.growth || '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {canEdit && !isPublished ? (
                      <select
                        value={alignedScores.culture.growth}
                        onChange={(e) => handleAlignedScoreChange('culture', 'growth', e.target.value)}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-orange-700">{alignedScores.culture.growth}</span>
                    )}
                  </td>
                </tr>

                {/* Competencies - Contribution */}
                <tr>
                  <td className="px-4 py-3 font-semibold text-orange-600 border">Competencies - Contribution</td>
                  <td className="px-4 py-3 text-center border">{currentPair.selfAssessment?.scores?.competencies?.contribution || '—'}</td>
                  <td className="px-4 py-3 text-center border">{currentPair.bilateralAssessment?.scores?.competencies?.contribution || '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {canEdit && !isPublished ? (
                      <select
                        value={alignedScores.competencies.contribution}
                        onChange={(e) => handleAlignedScoreChange('competencies', 'contribution', e.target.value)}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-orange-700">{alignedScores.competencies.contribution}</span>
                    )}
                  </td>
                </tr>

                {/* Competencies - Growth */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-orange-600 border">Competencies - Growth</td>
                  <td className="px-4 py-3 text-center border">{currentPair.selfAssessment?.scores?.competencies?.growth || '—'}</td>
                  <td className="px-4 py-3 text-center border">{currentPair.bilateralAssessment?.scores?.competencies?.growth || '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {canEdit && !isPublished ? (
                      <select
                        value={alignedScores.competencies.growth}
                        onChange={(e) => handleAlignedScoreChange('competencies', 'growth', e.target.value)}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-orange-700">{alignedScores.competencies.growth}</span>
                    )}
                  </td>
                </tr>

                {/* Execution - Contribution */}
                <tr>
                  <td className="px-4 py-3 font-semibold text-green-600 border">Execution - Contribution</td>
                  <td className="px-4 py-3 text-center border">{currentPair.selfAssessment?.scores?.execution?.contribution || '—'}</td>
                  <td className="px-4 py-3 text-center border">{currentPair.bilateralAssessment?.scores?.execution?.contribution || '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {canEdit && !isPublished ? (
                      <select
                        value={alignedScores.execution.contribution}
                        onChange={(e) => handleAlignedScoreChange('execution', 'contribution', e.target.value)}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-orange-700">{alignedScores.execution.contribution}</span>
                    )}
                  </td>
                </tr>

                {/* Execution - Growth */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-green-600 border">Execution - Growth</td>
                  <td className="px-4 py-3 text-center border">{currentPair.selfAssessment?.scores?.execution?.growth || '—'}</td>
                  <td className="px-4 py-3 text-center border">{currentPair.bilateralAssessment?.scores?.execution?.growth || '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {canEdit && !isPublished ? (
                      <select
                        value={alignedScores.execution.growth}
                        onChange={(e) => handleAlignedScoreChange('execution', 'growth', e.target.value)}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-orange-700">{alignedScores.execution.growth}</span>
                    )}
                  </td>
                </tr>

                {/* Composite Row */}
                <tr className="bg-gray-200 font-bold">
                  <td className="px-4 py-3 border">COMPOSITE</td>
                  <td className="px-4 py-3 text-center border">{calculateComposite(currentPair.selfAssessment?.scores)}/12</td>
                  <td className="px-4 py-3 text-center border">{calculateComposite(currentPair.bilateralAssessment?.scores)}/12</td>
                  <td className="px-4 py-3 text-center border bg-orange-100 text-orange-700">
                    {calculateComposite(alignedScores)}/12
                  </td>
                </tr>

                {/* Nine-Box Row */}
                <tr className="bg-gray-100">
                  <td className="px-4 py-3 border font-semibold">NINE-BOX</td>
                  <td className="px-4 py-3 text-center border text-sm">{calculateNineBoxPosition(currentPair.selfAssessment?.scores)}</td>
                  <td className="px-4 py-3 text-center border text-sm">{calculateNineBoxPosition(currentPair.bilateralAssessment?.scores)}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50 text-sm font-semibold text-orange-700">
                    {calculateNineBoxPosition(alignedScores)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Alignment Notes */}
        <Card className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Alignment Notes</h3>
          <textarea
            value={alignmentNotes}
            onChange={(e) => setAlignmentNotes(e.target.value)}
            disabled={!canEdit || isPublished}
            placeholder="Document the alignment discussion and any key points..."
            rows="6"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm disabled:bg-gray-100"
          />
        </Card>

        {/* Action Buttons */}
        {canEdit && !isPublished && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  disabled={saving || publishing}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || publishing}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Aligned Scores'}
                </button>
              </div>

              <button
                onClick={() => setShowPublishConfirm(true)}
                disabled={saving || publishing}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                {publishing ? 'Publishing...' : 'Publish 360 MSH'}
              </button>
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              ℹ️ Publishing will create the MSH record and lock all related assessments
            </div>
          </div>
        )}

        {isPublished && (
          <Card className="bg-green-50 border-2 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">360 MSH Published</p>
                <p className="text-sm text-green-700">
                  MSH ID: {currentPair.bilateralAssessment.impact?.mshId} • Published: {currentPair.bilateralAssessment.publishedAt?.toDate?.().toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}