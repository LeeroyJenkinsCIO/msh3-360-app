// 📁 SAVE TO: src/pages/is-os/360ComparisonView.jsx
// ✅ CRITICAL FIX: Load self-assessments separately since they may not have pairId
// ✅ P2P: Subject publishes own MSH | MR/DR: Manager publishes both MSHs
// 🛡️ PRODUCTION: Enhanced MSH counter with safety logging

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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';

function ComparisonView360() {
  const { user } = useAuth();
  const { pairId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [pairingData, setPairingData] = useState(null);
  const [selfAssessment, setSelfAssessment] = useState(null);
  const [bilateralAssessment, setBilateralAssessment] = useState(null);
  const [subjectInfo, setSubjectInfo] = useState(null);
  const [assessorInfo, setAssessorInfo] = useState(null);
  const [publisherInfo, setPublisherInfo] = useState(null);
  const [relationshipType, setRelationshipType] = useState(null);
  
  const [alignedScores, setAlignedScores] = useState({
    culture: { contribution: 1, growth: 1 },
    competencies: { contribution: 1, growth: 1 },
    execution: { contribution: 1, growth: 1 }
  });
  
  const [alignmentNotes, setAlignmentNotes] = useState('');
  const [hrpRequested, setHrpRequested] = useState(false);

  useEffect(() => {
    if (pairId) {
      loadComparisonData();
    }
  }, [pairId]);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      
      const selectedPair = searchParams.get('pair') || 'A';
      
      console.log('🎯 Loading 360° comparison for pairId:', pairId, 'pair:', selectedPair);
      
      // ✅ STEP 1: Load bilateral assessments (those WITH pairId)
      const pairIdsToTry = [pairId, `360-pair-cycle-${pairId}`];
      let assessments = [];
      let foundPairId = null;
      
      for (const tryPairId of pairIdsToTry) {
        const assessmentsQuery = query(
          collection(db, 'assessments'),
          where('pairId', '==', tryPairId)
        );
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        
        if (!assessmentsSnapshot.empty) {
          assessments = assessmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          foundPairId = tryPairId;
          console.log('✅ Found', assessments.length, 'bilateral assessments with pairId:', tryPairId);
          break;
        }
      }
      
      if (assessments.length === 0) {
        alert('No assessments found for this pairing');
        navigate(-1);
        return;
      }
      
      console.log('📋 Bilateral assessments loaded:', assessments.map(a => ({
        id: a.id,
        type: a.assessmentType,
        status: a.status,
        giverUid: a.giver?.uid || a.assessorId,
        receiverUid: a.receiver?.uid || a.subjectId
      })));
      
      // Load user data for mapping
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap = {};
      usersSnapshot.docs.forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        userMap[userData.userId] = userData;
        userMap[userData.uid] = userData;
      });
      
      // Build pairing structure from bilateral assessments
      const pairingStructure = {
        pairId: foundPairId,
        personA: null,
        personB: null,
        managerId: null,
        relationshipType: null,
        assessments: assessments
      };
      
      // Identify personA and personB from bilateral assessments
      assessments.forEach(assessment => {
        const giverUid = assessment.giver?.uid || assessment.assessorId;
        const receiverUid = assessment.receiver?.uid || assessment.subjectId;
        const isSelf = giverUid === receiverUid;
        
        if (isSelf) return; // Skip self-assessments in bilateral list
        
        if (!pairingStructure.personA) {
          const giverData = userMap[giverUid] || assessment.giver;
          pairingStructure.personA = {
            uid: giverUid,
            userId: giverData?.userId || giverUid,
            displayName: assessment.giver?.displayName || giverData?.displayName,
            layer: assessment.giver?.layer || giverData?.layer
          };
        }
        
        if (!pairingStructure.personB && receiverUid !== pairingStructure.personA?.uid) {
          const receiverData = userMap[receiverUid] || assessment.receiver;
          pairingStructure.personB = {
            uid: receiverUid,
            userId: receiverData?.userId || receiverUid,
            displayName: assessment.receiver?.displayName || receiverData?.displayName,
            layer: assessment.receiver?.layer || receiverData?.layer
          };
        }
      });
      
      // Determine relationship type and manager
      const personALayer = pairingStructure.personA?.layer;
      const personBLayer = pairingStructure.personB?.layer;
      
      if (personALayer === personBLayer && personALayer === 'ISL') {
        pairingStructure.relationshipType = 'peer';
      } else {
        pairingStructure.relationshipType = 'manager-report';
        
        if (personALayer === 'ISE' || (personALayer === 'ISL' && personBLayer === 'ISF')) {
          pairingStructure.managerId = pairingStructure.personA.uid;
        } else {
          pairingStructure.managerId = pairingStructure.personB.uid;
          // Swap so personA is always the manager
          const temp = pairingStructure.personA;
          pairingStructure.personA = pairingStructure.personB;
          pairingStructure.personB = temp;
        }
      }
      
      setPairingData(pairingStructure);
      setRelationshipType(pairingStructure.relationshipType);
      
      console.log('👥 Pairing Structure:', {
        personA: pairingStructure.personA?.displayName,
        personB: pairingStructure.personB?.displayName,
        relationshipType: pairingStructure.relationshipType,
        managerId: pairingStructure.managerId
      });
      
      // Determine subject and assessor based on selected pair
      let subjectUid, subjectUserId, assessorUid;
      
      if (selectedPair === 'A') {
        // Pair A: PersonA assesses PersonB (PersonB is subject)
        subjectUid = pairingStructure.personB.uid;
        subjectUserId = pairingStructure.personB.userId;
        assessorUid = pairingStructure.personA.uid;
      } else {
        // Pair B: PersonB assesses PersonA (PersonA is subject)
        subjectUid = pairingStructure.personA.uid;
        subjectUserId = pairingStructure.personA.userId;
        assessorUid = pairingStructure.personB.uid;
      }
      
      console.log('🎯 Target Subject:', {
        selectedPair,
        subjectUid,
        subjectUserId,
        assessorUid
      });
      
      // Find bilateral assessment
      const bilateralAssess = assessments.find(a => {
        const giverUid = a.giver?.uid || a.assessorId;
        const receiverUid = a.receiver?.uid || a.subjectId;
        const isBilateral = giverUid === assessorUid && receiverUid === subjectUid;
        return isBilateral;
      });
      
      if (!bilateralAssess) {
        alert('Required bilateral assessment not found');
        navigate(-1);
        return;
      }
      
      console.log('✅ Bilateral assessment found:', bilateralAssess.id);
      
      // Define subject and assessor data
      const subjectData = userMap[subjectUid] || 
                         (selectedPair === 'A' ? pairingStructure.personB : pairingStructure.personA);
      const assessorData = userMap[assessorUid] || 
                          (selectedPair === 'A' ? pairingStructure.personA : pairingStructure.personB);
      
      console.log('👤 Subject Data:', {
        uid: subjectUid,
        userId: subjectUserId,
        displayName: subjectData?.displayName
      });
      
      // ✅ STEP 2: Load self-assessment SEPARATELY by querying for it directly
      console.log('🔍 Searching for self-assessment...');
      
      // Get the cycle info from bilateral assessment for filtering
      const cycleId = bilateralAssess.cycleId;
      const cycleMonth = bilateralAssess.cycleMonth;
      const cycleYear = bilateralAssess.cycleYear;
      
      // Query for self-assessments matching the subject
      const selfAssessQuery = query(
        collection(db, 'assessments'),
        where('cycleId', '==', cycleId),
        where('assessmentType', '==', 'self')
      );
      
      const selfAssessSnapshot = await getDocs(selfAssessQuery);
      
      console.log(`📊 Found ${selfAssessSnapshot.size} self-assessments in cycle ${cycleId}`);
      
      // Filter to find the one matching our subject
      let selfAssess = null;
      
      selfAssessSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const receiverUid = data.receiver?.uid || data.subjectId;
        const receiverUserId = data.receiver?.userId || data.subjectUid;
        
        console.log('  🔎 Checking self-assessment:', {
          id: doc.id,
          receiverUid,
          receiverUserId,
          targetSubjectUid: subjectUid,
          targetSubjectUserId: subjectUserId,
          match: receiverUid === subjectUid || receiverUserId === subjectUserId
        });
        
        // Match by either uid or userId
        if (receiverUid === subjectUid || receiverUserId === subjectUserId) {
          selfAssess = {
            id: doc.id,
            ...data
          };
          console.log('  ✅ MATCH! Found self-assessment:', doc.id);
        }
      });
      
      if (!selfAssess) {
        console.warn('⚠️ Self-assessment not found for subject:', {
          subjectUid,
          subjectUserId,
          subjectName: subjectData?.displayName,
          cycleId
        });
        console.log('  Available self-assessments:', selfAssessSnapshot.docs.map(d => ({
          id: d.id,
          receiverUid: d.data().receiver?.uid,
          receiverName: d.data().receiver?.displayName
        })));
      } else {
        console.log('✅ Self-assessment loaded:', {
          id: selfAssess.id,
          status: selfAssess.status,
          hasScores: !!selfAssess.scores
        });
      }
      
      setSelfAssessment(selfAssess);
      setBilateralAssessment(bilateralAssess);
      setSubjectInfo(subjectData);
      setAssessorInfo(assessorData);
      
      // Determine publisher
      let publisher;
      if (pairingStructure.relationshipType === 'peer') {
        publisher = subjectData;
      } else {
        const managerFromMap = userMap[pairingStructure.managerId];
        publisher = managerFromMap || pairingStructure.personA;
        
        if (publisher && !publisher.uid) {
          publisher.uid = publisher.userId || pairingStructure.managerId;
        }
      }
      setPublisherInfo(publisher);
      
      console.log('📊 Publisher Info:', {
        relationshipType: pairingStructure.relationshipType,
        publisher: publisher?.displayName,
        canEdit: user.uid === publisher?.uid || user.uid === publisher?.userId
      });
      
      // Set aligned scores from bilateral assessment
      if (bilateralAssess.alignedScores) {
        setAlignedScores(bilateralAssess.alignedScores);
      } else if (bilateralAssess.scores) {
        setAlignedScores({
          culture: {
            contribution: bilateralAssess.scores.culture?.contribution ?? 1,
            growth: bilateralAssess.scores.culture?.growth ?? 1
          },
          competencies: {
            contribution: bilateralAssess.scores.competencies?.contribution ?? 1,
            growth: bilateralAssess.scores.competencies?.growth ?? 1
          },
          execution: {
            contribution: bilateralAssess.scores.execution?.contribution ?? 1,
            growth: bilateralAssess.scores.execution?.growth ?? 1
          }
        });
      }
      
      if (bilateralAssess.alignmentNotes) {
        setAlignmentNotes(bilateralAssess.alignmentNotes);
      }
      
      if (bilateralAssess.hrpRequested) {
        setHrpRequested(bilateralAssess.hrpRequested);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading comparison data:', error);
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
      const assessmentRef = doc(db, 'assessments', bilateralAssessment.id);
      await updateDoc(assessmentRef, {
        alignedScores: alignedScores,
        alignmentNotes: alignmentNotes,
        updatedAt: serverTimestamp()
      });
      
      alert('✅ Aligned scores saved!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 🛡️ Get next sequential MSH ID with enhanced safety logging
  const getNextMshId = async () => {
    try {
      console.log('🎫 Generating MSH ID for 360° assessment...');
      const counterRef = doc(db, 'counters', 'msh');
      const counterSnap = await getDoc(counterRef);
      
      let nextNumber = 1;
      if (counterSnap.exists()) {
        const currentCount = counterSnap.data().current || 0;
        nextNumber = currentCount + 1;
        console.log('📈 360° MSH counter:', currentCount, '→', nextNumber);
      } else {
        console.log('🆕 Creating new MSH counter');
      }
      
      await setDoc(counterRef, { 
        current: nextNumber,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      const mshId = `MSH-${String(nextNumber).padStart(3, '0')}`;
      console.log('✅ Generated 360° MSH ID:', mshId);
      return mshId;
    } catch (error) {
      console.error('❌ MSH ID generation failed:', error.message);
      throw new Error('Failed to generate MSH ID: ' + error.message);
    }
  };

  const handlePublishMSH = async (alignmentStatus) => {
    setPublishing(true);
    
    try {
      const composite = calculateComposite(alignedScores);
      const nineBoxPosition = calculateNineBoxPosition(alignedScores);
      
      console.log('📊 Publishing 360° MSH with alignment:', alignmentStatus);
      
      const mshId = await getNextMshId();
      
      const subjectUid = bilateralAssessment.receiver?.uid || bilateralAssessment.subjectId;
      const subjectName = subjectInfo?.displayName || bilateralAssessment.subjectName;
      
      // Create MSH record
      await addDoc(collection(db, 'mshScores'), {
        mshId: mshId,
        mshType: '360',
        subjectId: subjectUid,
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
          self: selfAssessment?.id || null,
          bilateral: bilateralAssessment.id,
          pairId: pairId
        },
        cycleId: bilateralAssessment.cycleId,
        cycleName: bilateralAssessment.cycleName,
        cycleMonth: bilateralAssessment.cycleMonth,
        cycleYear: bilateralAssessment.cycleYear,
        publishedBy: user.uid,
        publishedAt: serverTimestamp(),
        relationshipType: relationshipType,
        alignment: alignmentStatus,
        hrpReviewRequested: hrpRequested
      });
      
      console.log('✅ 360° MSH created:', mshId);
      
      // Lock bilateral assessment
      await updateDoc(doc(db, 'assessments', bilateralAssessment.id), {
        locked: true,
        mshPublished: true,
        'impact.mshId': mshId,
        alignedScores: alignedScores,
        alignmentNotes: alignmentNotes,
        status: 'calibrated',
        alignmentStatus: alignmentStatus,
        hrpRequested: hrpRequested,
        publishedAt: serverTimestamp()
      });
      
      // Lock self-assessment if it exists (but DON'T give it an MSH ID)
      if (selfAssessment) {
        await updateDoc(doc(db, 'assessments', selfAssessment.id), {
          locked: true,
          mshPublished: true
          // ❌ DO NOT add 'impact.mshId' - self-assessments are supporting data only
        });
      }
      
      alert(`✅ 360° MSH Published!\n\nMSH ID: ${mshId}\nComposite: ${composite}/12\nNine-Box: ${nineBoxPosition}\nAlignment: ${alignmentStatus}\n\nReturning to hub.`);
      navigate('/is-os');
      
    } catch (error) {
      console.error('❌ Error publishing 360° MSH:', error.message);
      alert('Failed to publish MSH: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading 360° review...</p>
        </div>
      </div>
    );
  }

  if (!bilateralAssessment || !subjectInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">360° Review not found</p>
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

  const canEdit = publisherInfo && (user?.uid === publisherInfo.uid || user?.uid === publisherInfo.userId);
  const isPublished = bilateralAssessment.mshPublished || bilateralAssessment.status === 'calibrated';
  
  const publisherLabel = relationshipType === 'peer' 
    ? `${subjectInfo.displayName} (Subject publishes own MSH)`
    : `${publisherInfo?.displayName} (Manager publishes both MSHs)`;

  return (
    <div className="min-h-screen bg-gray-50">
      
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
          
          <h1 className="text-3xl font-bold mb-2">360° Review: {subjectInfo.displayName}</h1>
          <p className="text-blue-100">
            {bilateralAssessment.cycleName} • {relationshipType === 'peer' ? 'Peer-to-Peer' : 'Manager/Direct Report'}
          </p>
          
          {!selfAssessment && (
            <div className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">⚠️ Self-assessment not found - MSH will publish without self-scores</span>
            </div>
          )}
          
          {isPublished && (
            <div className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">MSH Published - Read Only</span>
            </div>
          )}
          
          {!isPublished && !canEdit && (
            <div className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
              <span className="font-semibold">View Only - {publisherLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">360° Comparison Grid</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border">Domain</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-purple-700 border bg-purple-50">
                    Self<br/>
                    <span className="text-xs font-normal">{subjectInfo.displayName}</span>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-blue-700 border bg-blue-50">
                    {relationshipType === 'peer' ? 'Peer' : assessorInfo?.layer === 'ISE' || assessorInfo?.layer === 'ISL' ? 'Manager' : 'Direct Report'}<br/>
                    <span className="text-xs font-normal">{assessorInfo?.displayName}</span>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-orange-700 border bg-orange-50">Aligned</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 font-semibold text-purple-600 border">Culture - Contribution</td>
                  <td className="px-4 py-3 text-center border">{selfAssessment?.scores?.culture?.contribution ?? '—'}</td>
                  <td className="px-4 py-3 text-center border">{bilateralAssessment?.scores?.culture?.contribution ?? '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {!isPublished ? (
                      <select
                        value={alignedScores.culture.contribution}
                        onChange={(e) => handleAlignedScoreChange('culture', 'contribution', e.target.value)}
                        disabled={!canEdit}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-purple-600 border">Culture - Growth</td>
                  <td className="px-4 py-3 text-center border">{selfAssessment?.scores?.culture?.growth ?? '—'}</td>
                  <td className="px-4 py-3 text-center border">{bilateralAssessment?.scores?.culture?.growth ?? '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {!isPublished ? (
                      <select
                        value={alignedScores.culture.growth}
                        onChange={(e) => handleAlignedScoreChange('culture', 'growth', e.target.value)}
                        disabled={!canEdit}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                <tr>
                  <td className="px-4 py-3 font-semibold text-orange-600 border">Competencies - Contribution</td>
                  <td className="px-4 py-3 text-center border">{selfAssessment?.scores?.competencies?.contribution ?? '—'}</td>
                  <td className="px-4 py-3 text-center border">{bilateralAssessment?.scores?.competencies?.contribution ?? '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {!isPublished ? (
                      <select
                        value={alignedScores.competencies.contribution}
                        onChange={(e) => handleAlignedScoreChange('competencies', 'contribution', e.target.value)}
                        disabled={!canEdit}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-orange-600 border">Competencies - Growth</td>
                  <td className="px-4 py-3 text-center border">{selfAssessment?.scores?.competencies?.growth ?? '—'}</td>
                  <td className="px-4 py-3 text-center border">{bilateralAssessment?.scores?.competencies?.growth ?? '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {!isPublished ? (
                      <select
                        value={alignedScores.competencies.growth}
                        onChange={(e) => handleAlignedScoreChange('competencies', 'growth', e.target.value)}
                        disabled={!canEdit}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                <tr>
                  <td className="px-4 py-3 font-semibold text-green-600 border">Execution - Contribution</td>
                  <td className="px-4 py-3 text-center border">{selfAssessment?.scores?.execution?.contribution ?? '—'}</td>
                  <td className="px-4 py-3 text-center border">{bilateralAssessment?.scores?.execution?.contribution ?? '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {!isPublished ? (
                      <select
                        value={alignedScores.execution.contribution}
                        onChange={(e) => handleAlignedScoreChange('execution', 'contribution', e.target.value)}
                        disabled={!canEdit}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-green-600 border">Execution - Growth</td>
                  <td className="px-4 py-3 text-center border">{selfAssessment?.scores?.execution?.growth ?? '—'}</td>
                  <td className="px-4 py-3 text-center border">{bilateralAssessment?.scores?.execution?.growth ?? '—'}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50">
                    {!isPublished ? (
                      <select
                        value={alignedScores.execution.growth}
                        onChange={(e) => handleAlignedScoreChange('execution', 'growth', e.target.value)}
                        disabled={!canEdit}
                        className="px-3 py-1 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold text-orange-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                <tr className="bg-gray-200 font-bold">
                  <td className="px-4 py-3 border">COMPOSITE</td>
                  <td className="px-4 py-3 text-center border">{selfAssessment ? `${calculateComposite(selfAssessment.scores)}/12` : '—'}</td>
                  <td className="px-4 py-3 text-center border">{calculateComposite(bilateralAssessment?.scores)}/12</td>
                  <td className="px-4 py-3 text-center border bg-orange-100 text-orange-700">
                    {calculateComposite(alignedScores)}/12
                  </td>
                </tr>

                <tr className="bg-gray-100">
                  <td className="px-4 py-3 border font-semibold">NINE-BOX</td>
                  <td className="px-4 py-3 text-center border text-sm">{selfAssessment ? calculateNineBoxPosition(selfAssessment.scores) : '—'}</td>
                  <td className="px-4 py-3 text-center border text-sm">{calculateNineBoxPosition(bilateralAssessment?.scores)}</td>
                  <td className="px-4 py-3 text-center border bg-orange-50 text-sm font-semibold text-orange-700">
                    {calculateNineBoxPosition(alignedScores)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Assessment Notes Section */}
        <Card className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Assessment Notes</h3>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Self-Assessment Notes */}
            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">S</span>
                Self-Assessment Notes ({subjectInfo.displayName})
              </h4>
              
              {!selfAssessment ? (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-yellow-800">Self-assessment not found</p>
                  <p className="text-xs text-yellow-700 mt-1">MSH will publish without self-scores</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">Culture Notes</label>
                    <div className="bg-white p-2 rounded border border-purple-200 text-sm text-gray-700 min-h-[60px]">
                      {selfAssessment?.notes?.culture || <span className="italic text-gray-400">No notes provided</span>}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">Competencies Notes</label>
                    <div className="bg-white p-2 rounded border border-purple-200 text-sm text-gray-700 min-h-[60px]">
                      {selfAssessment?.notes?.competencies || <span className="italic text-gray-400">No notes provided</span>}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">Execution Notes</label>
                    <div className="bg-white p-2 rounded border border-purple-200 text-sm text-gray-700 min-h-[60px]">
                      {selfAssessment?.notes?.execution || <span className="italic text-gray-400">No notes provided</span>}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">General Notes</label>
                    <div className="bg-white p-2 rounded border border-purple-200 text-sm text-gray-700 min-h-[60px]">
                      {selfAssessment?.notes?.general || <span className="italic text-gray-400">No notes provided</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bilateral Assessment Notes */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                  {relationshipType === 'peer' ? 'P' : 'M'}
                </span>
                {relationshipType === 'peer' ? 'Peer' : 'Manager'} Assessment Notes ({assessorInfo?.displayName})
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">Culture Notes</label>
                  <div className="bg-white p-2 rounded border border-blue-200 text-sm text-gray-700 min-h-[60px]">
                    {bilateralAssessment?.notes?.culture || <span className="italic text-gray-400">No notes provided</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">Competencies Notes</label>
                  <div className="bg-white p-2 rounded border border-blue-200 text-sm text-gray-700 min-h-[60px]">
                    {bilateralAssessment?.notes?.competencies || <span className="italic text-gray-400">No notes provided</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">Execution Notes</label>
                  <div className="bg-white p-2 rounded border border-blue-200 text-sm text-gray-700 min-h-[60px]">
                    {bilateralAssessment?.notes?.execution || <span className="italic text-gray-400">No notes provided</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">General Notes</label>
                  <div className="bg-white p-2 rounded border border-blue-200 text-sm text-gray-700 min-h-[60px]">
                    {bilateralAssessment?.notes?.general || <span className="italic text-gray-400">No notes provided</span>}
                  </div>
                </div>
              </div>
            </div>
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

        {canEdit && !isPublished && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  disabled={saving || publishing}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || publishing}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Aligned Scores'}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handlePublishMSH('aligned')}
                  disabled={saving || publishing}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? 'Publishing...' : 'Publish Aligned'}
                </button>

                <button
                  onClick={() => handlePublishMSH('not-aligned')}
                  disabled={saving || publishing}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? 'Publishing...' : 'Publish Not Aligned'}
                </button>
                
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={hrpRequested}
                    onChange={(e) => setHrpRequested(e.target.checked)}
                    disabled={saving || publishing}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="whitespace-nowrap">Request HRP Review</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {isPublished && (
          <Card className="bg-green-50 border-2 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">360° MSH Published</p>
                <p className="text-sm text-green-700">
                  MSH ID: {bilateralAssessment.impact?.mshId} • Published: {bilateralAssessment.publishedAt?.toDate?.().toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

export default ComparisonView360;