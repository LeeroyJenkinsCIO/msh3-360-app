// 📁 SAVE TO: src/pages/is-os/ThreeSixtyComparisonView.jsx
// 360° MSH Publishing View - Compare Self + Bilateral Assessments and Publish MSH³
// Scoring: 0-2 scale per dimension (0=Not Met, 1=Partially Met, 2=Fully Met)
// Composite: Sum of all 6 dimensions (0-12 range)
// Nine-Box: Low 0-2, Mid 3-4, High 5-6

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Scale, CheckCircle2, Save, AlertCircle, Flag, Lock } from 'lucide-react';

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

function ThreeSixtyComparisonView() {
  const { pairId } = useParams();
  const [searchParams] = useSearchParams();
  const selectedPair = searchParams.get('pair') || 'A';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [pairing, setPairing] = useState(null);
  const [selfAssessment, setSelfAssessment] = useState(null);
  const [bilateralAssessment, setBilateralAssessment] = useState(null);
  const [alignedScores, setAlignedScores] = useState({});
  const [publisherNotes, setPublisherNotes] = useState({
    culture: '',
    competencies: '',
    execution: '',
    general: ''
  });
  const [hrpRequested, setHrpRequested] = useState(false);
  const [error, setError] = useState(null);
  const [publishedMshId, setPublishedMshId] = useState(null);
  const [isPublished, setIsPublished] = useState(false);

  // Reconstruct Firestore document ID
  const firestoreDocId = useMemo(() => {
    if (!pairId) return null;
    
    // If pairId already has the prefix, use it as-is
    if (pairId.startsWith('360-pair-cycle-')) {
      return pairId;
    }
    
    // Otherwise, add the prefix
    return `360-pair-cycle-${pairId}`;
  }, [pairId]);

  console.log('🎬 ThreeSixtyComparisonView mounted');
  console.log('📋 URL pairId:', pairId);
  console.log('📋 Reconstructed Firestore ID:', firestoreDocId);
  console.log('📋 Selected pair:', selectedPair);

  // Load pairing and assessments
  useEffect(() => {
    if (!firestoreDocId || !user) {
      console.error('❌ Missing required data:', { firestoreDocId, user: user?.uid });
      return;
    }
    
    loadPairingData();
  }, [firestoreDocId, selectedPair, user]);

  const loadPairingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading pairing:', firestoreDocId);

      // Load pairing document
      const pairingRef = doc(db, 'assessment360Pairings', firestoreDocId);
      const pairingSnap = await getDoc(pairingRef);

      if (!pairingSnap.exists()) {
        console.error('❌ Pairing not found:', firestoreDocId);
        setError('Pairing not found');
        setLoading(false);
        return;
      }

      const pairingData = { id: pairingSnap.id, ...pairingSnap.data() };
      console.log('✅ Pairing loaded:', pairingData);
      setPairing(pairingData);

      // Determine which person we're publishing for
      const personA = pairingData.personA;
      const personB = pairingData.personB;
      const subjectPerson = selectedPair === 'A' ? personB : personA; // Person whose MSH is being created
      const assessorPerson = selectedPair === 'A' ? personA : personB; // Person doing the assessing

      console.log('👤 Subject (MSH recipient):', subjectPerson?.displayName);
      console.log('👤 Assessor (giving feedback):', assessorPerson?.displayName);

      // Check publisher permissions
      const isPeerPairing = pairingData.relationshipType === 'P2P';
      const canPublish = checkPublisherPermissions(user.uid, subjectPerson, assessorPerson, pairingData.assessmentType, isPeerPairing);
      
      if (!canPublish) {
        console.error('❌ User does not have permission to publish this MSH');
        setError('You do not have permission to publish this assessment');
        setLoading(false);
        return;
      }

      // Check if already published
      const mshQuery = query(
        collection(db, 'mshs'),
        where('pairingId', '==', firestoreDocId),
        where('pairType', '==', selectedPair),
        where('subjectId', '==', subjectPerson?.uid || subjectPerson?.subjectId)
      );
      
      const mshSnap = await getDocs(mshQuery);
      if (!mshSnap.empty) {
        const mshDoc = mshSnap.docs[0];
        console.log('✅ MSH already published:', mshDoc.id);
        setPublishedMshId(mshDoc.id);
        setIsPublished(true);
        
        // Load published data for read-only viewing
        const mshData = mshDoc.data();
        setAlignedScores(mshData.scores || {});
        setPublisherNotes(mshData.publisherNotes || {});
        setHrpRequested(mshData.hrpRequested || false);
      }

      // Load assessments from pairing
      const assessments = pairingData.assessments || [];
      console.log('📊 Assessments in pairing:', assessments.length);

      if (assessments.length < 2) {
        console.error('❌ Not enough assessments in pairing');
        setError('Both assessments must be completed before publishing');
        setLoading(false);
        return;
      }

      // Extract UIDs from both enriched and raw assessment formats
      const subjectUid = subjectPerson?.uid || subjectPerson?.subjectId;
      
      // Find self-assessment
      const self = assessments.find(a => {
        const giverUid = a.assessorUid || a.giver?.uid || a.assessorId;
        const receiverUid = a.subjectUid || a.receiver?.uid || a.subjectId;
        const isSelf = a.isSelfAssessment || a.assessmentType === 'self' || giverUid === receiverUid;
        const matchesSubject = receiverUid === subjectUid;
        return isSelf && matchesSubject;
      });

      // Find bilateral assessment
      const bilateral = assessments.find(a => {
        const giverUid = a.assessorUid || a.giver?.uid || a.assessorId;
        const receiverUid = a.subjectUid || a.receiver?.uid || a.subjectId;
        const isSelf = a.isSelfAssessment || a.assessmentType === 'self' || giverUid === receiverUid;
        const matchesSubject = receiverUid === subjectUid;
        const matchesAssessor = giverUid === (assessorPerson?.uid || assessorPerson?.subjectId);
        return !isSelf && matchesSubject && matchesAssessor;
      });

      console.log('🔍 Self assessment:', self ? self.id : 'NOT FOUND');
      console.log('🔍 Bilateral assessment:', bilateral ? bilateral.id : 'NOT FOUND');

      if (!self || !bilateral) {
        console.error('❌ Assessment matching failed');
        setError('Could not find required assessments');
        setLoading(false);
        return;
      }

      setSelfAssessment(self);
      setBilateralAssessment(bilateral);

      // Initialize aligned scores if not already published
      if (!isPublished) {
        initializeAlignedScores(self, bilateral);
      }

      setLoading(false);
      console.log('✅ All data loaded successfully');

    } catch (err) {
      console.error('❌ Error loading pairing data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const checkPublisherPermissions = (currentUserId, subjectPerson, assessorPerson, assessmentType, isPeerPairing) => {
    // For P2P: subject publishes their own MSH
    if (isPeerPairing) {
      return currentUserId === (subjectPerson?.uid || subjectPerson?.subjectId);
    }
    
    // For MR/DR: assessor (manager) publishes the subject's (direct report) MSH
    return currentUserId === (assessorPerson?.uid || assessorPerson?.subjectId);
  };

  const initializeAlignedScores = (self, bilateral) => {
    const initialized = {};
    
    DOMAINS.forEach(domain => {
      initialized[domain.id] = {};
      domain.dimensions.forEach(dim => {
        // Start with bilateral assessment score as the aligned score
        initialized[domain.id][dim.id] = bilateral.scores?.[domain.id]?.[dim.id] || 1;
      });
    });

    setAlignedScores(initialized);
  };

  const handleScoreChange = (domainId, dimensionId, value) => {
    if (isPublished) return; // Prevent changes if already published
    
    setAlignedScores(prev => ({
      ...prev,
      [domainId]: {
        ...prev[domainId],
        [dimensionId]: parseInt(value)
      }
    }));
  };

  const calculateComposite = (scores) => {
    let total = 0;
    DOMAINS.forEach(domain => {
      domain.dimensions.forEach(dim => {
        total += scores?.[domain.id]?.[dim.id] || 0;
      });
    });
    return total;
  };

  const getNineBoxPlacement = (contribution, growth) => {
    // Low: 0-2, Mid: 3-4, High: 5-6
    if (contribution >= 5 && growth >= 5) return 'Rising Star';
    if (contribution >= 5 && growth >= 3) return 'High Performer';
    if (contribution >= 5) return 'Developing Driver';
    if (growth >= 5 && contribution >= 3) return 'Proven Contributor';
    if (contribution >= 3 && growth >= 3) return 'Core Contributor';
    if (growth >= 5) return 'Solid Contributor';
    if (contribution >= 3) return 'Growth Driver';
    if (growth >= 3) return 'Untapped Potential';
    return 'Emerging Performer';
  };

  const handlePublish = async (isAligned) => {
    if (publishing || isPublished) return;

    // Validate publisher notes for Not Aligned
    if (!isAligned && !publisherNotes.general.trim()) {
      alert('Publisher notes are required when publishing as NOT ALIGNED');
      return;
    }

    setPublishing(true);

    try {
      const compositeScore = calculateComposite(alignedScores);
      
      // Calculate contribution and growth totals
      const contributionTotal = DOMAINS.reduce((sum, domain) => 
        sum + (alignedScores[domain.id]?.contribution || 0), 0);
      const growthTotal = DOMAINS.reduce((sum, domain) => 
        sum + (alignedScores[domain.id]?.growth || 0), 0);
      
      const nineBoxPlacement = getNineBoxPlacement(contributionTotal, growthTotal);

      const subjectPerson = selectedPair === 'A' ? pairing.personB : pairing.personA;
      const assessorPerson = selectedPair === 'A' ? pairing.personA : pairing.personB;

      // Generate MSH ID using atomic counter
      const mshId = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'mshCounter');
        const counterDoc = await transaction.get(counterRef);
        
        let nextNum = 1;
        if (counterDoc.exists()) {
          nextNum = (counterDoc.data().currentNumber || 0) + 1;
          transaction.update(counterRef, { currentNumber: nextNum });
        } else {
          transaction.set(counterRef, { currentNumber: nextNum });
        }
        
        return `MSH-${String(nextNum).padStart(3, '0')}`;
      });

      // Create MSH document
      const mshData = {
        mshId: mshId,
        pairingId: firestoreDocId,
        pairType: selectedPair,
        mshType: '360',
        subjectId: subjectPerson?.uid || subjectPerson?.subjectId,
        subjectName: subjectPerson?.displayName || subjectPerson?.name,
        assessorId: assessorPerson?.uid || assessorPerson?.subjectId,
        assessorName: assessorPerson?.displayName || assessorPerson?.name,
        publisherId: user.uid,
        publisherName: user.displayName || user.email,
        scores: alignedScores,
        compositeScore: compositeScore,
        contributionScore: contributionTotal,
        growthScore: growthTotal,
        nineBoxPlacement: nineBoxPlacement,
        isAligned: isAligned,
        publisherNotes: publisherNotes,
        hrpRequested: hrpRequested,
        cycleMonth: pairing.cycleMonth,
        cycleYear: pairing.cycleYear,
        cycleName: pairing.cycleName || `${pairing.cycleMonth} ${pairing.cycleYear}`,
        sourceAssessmentIds: [selfAssessment.id, bilateralAssessment.id],
        publishedAt: Timestamp.now(),
        createdAt: Timestamp.now()
      };

      console.log('📝 Creating MSH:', mshData);

      const mshDocRef = await addDoc(collection(db, 'mshs'), mshData);
      console.log('✅ MSH created:', mshDocRef.id);

      // Update both source assessments
      await updateDoc(doc(db, 'assessments', selfAssessment.id), {
        status: 'published',
        publishedAt: Timestamp.now(),
        mshId: mshId,
        mshDocId: mshDocRef.id
      });

      await updateDoc(doc(db, 'assessments', bilateralAssessment.id), {
        status: 'published',
        publishedAt: Timestamp.now(),
        mshId: mshId,
        mshDocId: mshDocRef.id
      });

      console.log('✅ Source assessments updated');

      setPublishedMshId(mshDocRef.id);
      setIsPublished(true);
      setPublishing(false);

      alert(`MSH published successfully as ${isAligned ? 'ALIGNED' : 'NOT ALIGNED'}!\n\nMSH ID: ${mshId}\nComposite Score: ${compositeScore}/12\nNine-Box: ${nineBoxPlacement}`);

    } catch (err) {
      console.error('❌ Error publishing MSH:', err);
      alert('Error publishing MSH: ' + err.message);
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
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

  const compositeScore = calculateComposite(alignedScores);
  const contributionTotal = DOMAINS.reduce((sum, domain) => sum + (alignedScores[domain.id]?.contribution || 0), 0);
  const growthTotal = DOMAINS.reduce((sum, domain) => sum + (alignedScores[domain.id]?.growth || 0), 0);
  const nineBoxPlacement = getNineBoxPlacement(contributionTotal, growthTotal);

  const subjectPerson = selectedPair === 'A' ? pairing.personB : pairing.personA;
  const assessorPerson = selectedPair === 'A' ? pairing.personA : pairing.personB;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">360° MSH Publishing - Pair {selectedPair}</h1>
                <p className="text-teal-100 text-sm mt-1">
                  Publishing MSH for {subjectPerson?.displayName || subjectPerson?.name}
                </p>
              </div>
            </div>
            {isPublished && (
              <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg">
                <Lock className="w-5 h-5" />
                <span className="font-semibold">PUBLISHED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Published Banner */}
      {isPublished && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">
                  This MSH has been published and is now locked.
                </p>
                <p className="text-sm text-green-700 mt-1">
                  MSH ID: {publishedMshId} • No further edits can be made.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        {/* Comparison Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            MSH³ Assessment Comparison
          </h2>

          <div className="grid grid-cols-4 gap-4">
            {/* Header Row */}
            <div className="font-semibold text-gray-700">Domain / Dimension</div>
            <div className="font-semibold text-center text-purple-700">Self</div>
            <div className="font-semibold text-center text-blue-700">Assessor</div>
            <div className="font-semibold text-center text-green-700">Aligned</div>

            {/* Data Rows */}
            {DOMAINS.map(domain => (
              <React.Fragment key={domain.id}>
                {domain.dimensions.map((dim, idx) => (
                  <React.Fragment key={dim.id}>
                    <div className={`${idx === 0 ? 'font-semibold' : 'pl-4'} text-gray-800`}>
                      {idx === 0 && `${domain.label} - `}{dim.label}
                    </div>
                    <div className="text-center text-purple-600 font-medium bg-purple-50 rounded py-2">
                      {selfAssessment?.scores?.[domain.id]?.[dim.id] || 0}
                    </div>
                    <div className="text-center text-blue-600 font-medium bg-blue-50 rounded py-2">
                      {bilateralAssessment?.scores?.[domain.id]?.[dim.id] || 0}
                    </div>
                    <div className="text-center">
                      <select
                        value={alignedScores[domain.id]?.[dim.id] || 1}
                        onChange={(e) => handleScoreChange(domain.id, dim.id, e.target.value)}
                        disabled={isPublished}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="0">0 - Not Met</option>
                        <option value="1">1 - Partially Met</option>
                        <option value="2">2 - Fully Met</option>
                      </select>
                    </div>
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}

            {/* Totals Row */}
            <div className="font-bold text-gray-900 pt-4 border-t-2">Composite Score</div>
            <div className="text-center font-bold text-purple-700 pt-4 border-t-2">
              {calculateComposite(selfAssessment?.scores || {})}/12
            </div>
            <div className="text-center font-bold text-blue-700 pt-4 border-t-2">
              {calculateComposite(bilateralAssessment?.scores || {})}/12
            </div>
            <div className="text-center font-bold text-green-700 pt-4 border-t-2">
              {compositeScore}/12
            </div>
          </div>
        </div>

        {/* Publisher Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Publisher Alignment Notes</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">Culture Notes</label>
              <textarea
                value={publisherNotes.culture}
                onChange={(e) => setPublisherNotes({...publisherNotes, culture: e.target.value})}
                disabled={isPublished}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                placeholder="Publisher notes on culture alignment..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-700 mb-2">Competencies Notes</label>
              <textarea
                value={publisherNotes.competencies}
                onChange={(e) => setPublisherNotes({...publisherNotes, competencies: e.target.value})}
                disabled={isPublished}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                placeholder="Publisher notes on competencies alignment..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-2">Execution Notes</label>
              <textarea
                value={publisherNotes.execution}
                onChange={(e) => setPublisherNotes({...publisherNotes, execution: e.target.value})}
                disabled={isPublished}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Publisher notes on execution alignment..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">General Publisher Notes</label>
            <textarea
              value={publisherNotes.general}
              onChange={(e) => setPublisherNotes({...publisherNotes, general: e.target.value})}
              disabled={isPublished}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100"
              placeholder="Overall alignment notes, decision rationale, and next steps..."
            />
          </div>
        </div>

        {/* Nine-Box Compass */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">MSH³ 9-Box Compass</h2>
          
          <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
            {[
              { label: 'Rising Star', contrib: 'High', growth: 'High', placement: 'Rising Star' },
              { label: 'High Performer', contrib: 'High', growth: 'Mid', placement: 'High Performer' },
              { label: 'Developing Driver', contrib: 'High', growth: 'Low', placement: 'Developing Driver' },
              { label: 'Proven Contributor', contrib: 'Mid', growth: 'High', placement: 'Proven Contributor' },
              { label: 'Core Contributor', contrib: 'Mid', growth: 'Mid', placement: 'Core Contributor' },
              { label: 'Growth Driver', contrib: 'Mid', growth: 'Low', placement: 'Growth Driver' },
              { label: 'Solid Contributor', contrib: 'Low', growth: 'High', placement: 'Solid Contributor' },
              { label: 'Untapped Potential', contrib: 'Low', growth: 'Mid', placement: 'Untapped Potential' },
              { label: 'Emerging Performer', contrib: 'Low', growth: 'Low', placement: 'Emerging Performer' }
            ].map((box) => (
              <div
                key={box.label}
                className={`p-4 rounded-lg border-2 transition-all ${
                  nineBoxPlacement === box.placement
                    ? 'bg-green-100 border-green-500 shadow-lg scale-105'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-bold text-sm text-gray-900">{box.label}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    C: {box.contrib} • G: {box.growth}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Contribution Total</p>
              <p className="text-2xl font-bold text-blue-600">{contributionTotal}/6</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Growth Total</p>
              <p className="text-2xl font-bold text-green-600">{growthTotal}/6</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Composite Score</p>
              <p className="text-2xl font-bold text-purple-600">{compositeScore}/12</p>
            </div>
          </div>
        </div>

        {/* HRP Request */}
        {!isPublished && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hrpRequested}
                onChange={(e) => setHrpRequested(e.target.checked)}
                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">Request HRP Review</span>
                <p className="text-xs text-gray-600">
                  Flag this assessment for Human Resources Partner review
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        {!isPublished && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => handlePublish(true)}
              disabled={publishing}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Publish Aligned
                </>
              )}
            </button>
            <button
              onClick={() => handlePublish(false)}
              disabled={publishing}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Publish Not Aligned
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreeSixtyComparisonView;