// 📁 SAVE TO: src/components/hubs/AssessmentOrchestrator.js
// ✅ CRITICAL SECURITY FIX: Prevent navigation to comparison view for published MSHs
// ✅ Published MSHs show "Complete" badge only - no editing allowed

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, Users, ArrowRight, User, ArrowDown, ArrowUp, Eye, GitCompare, Calendar } from 'lucide-react';
import { getSubPillarDisplayName, getPillarAbbreviation } from '../../utils/pillarHelpers';
import { getHRPBadgeConfig } from '../../utils/hrpBadgeUtils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

function AssessmentOrchestrator({ 
  assessments = [], 
  pairings = [],
  onStartAssessment,
  onViewAssessment,
  onView360Pair,
  viewMode = 'give',
  currentUserId,
  userRole,
  pillarISFUsers = [],
  emptyStateMessage = 'No items to display'
}) {
  
  // State to track which pairs have published MSHs
  const [publishedMSHs, setPublishedMSHs] = useState({});
  
  // ✅ NEW: Trigger to force refresh of MSH status
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // ✅ CRITICAL: Store all assessments for fallback lookup in 360 pairing
  const allAssessmentsRef = React.useRef(assessments);
  React.useEffect(() => {
    allAssessmentsRef.current = assessments;
    console.log('🔄 AssessmentOrchestrator assessments updated:', {
      viewMode,
      assessmentsCount: assessments.length,
      pairingsCount: pairings.length,
      hasSelfAssessments: assessments.filter(a => a.isSelfAssessment || a.assessmentType === 'self').length
    });
  }, [assessments, viewMode, pairings.length]);
  
  // Load published MSH status for all pairings
  useEffect(() => {
    const loadPublishedMSHs = async () => {
      if (!pairings || pairings.length === 0) return;
      
      console.log('🔍 Starting MSH status check for', pairings.length, 'pairings');
      const mshStatus = {};
      
      for (const pairing of pairings) {
        console.log(`📋 Checking pairing: ${pairing.pairId}`, {
          assessmentIds: pairing.assessmentIds,
          personA: pairing.personA?.name,
          personB: pairing.personB?.name
        });
        
        // Check both Pair A and Pair B
        for (const pairType of ['A', 'B']) {
          // ✅ FIXED: Pair A = personB is subject, Pair B = personA is subject
          const selfId = pairType === 'A' 
            ? pairing.assessmentIds?.personB_self 
            : pairing.assessmentIds?.personA_self;
          const bilateralId = pairType === 'A'
            ? pairing.assessmentIds?.personA_to_B  // personA assesses personB
            : pairing.assessmentIds?.personB_to_A; // personB assesses personA
          
          console.log(`  Pair ${pairType}:`, { selfId, bilateralId });
          
          if (selfId && bilateralId) {
            try {
              // Query for published MSH with these assessment IDs
              const mshQuery = query(
                collection(db, 'mshs'),
                where('selfAssessmentId', '==', selfId),
                where('bilateralAssessmentId', '==', bilateralId)
              );
              
              const mshDocs = await getDocs(mshQuery);
              
              if (!mshDocs.empty) {
                const mshData = mshDocs.docs[0].data();
                const key = `${pairing.pairId}-${pairType}`;
                mshStatus[key] = {
                  published: true,
                  mshId: mshData.mshId,
                  mshDocId: mshDocs.docs[0].id,
                  publishedAt: mshData.publishedAt
                };
                console.log(`  ✅ Found published MSH for Pair ${pairType}:`, mshData.mshId);
              } else {
                console.log(`  ⚠️ No MSH found for Pair ${pairType}`);
              }
            } catch (err) {
              console.error(`  ❌ Error checking MSH for ${pairing.pairId}-${pairType}:`, err);
            }
          } else {
            console.log(`  ⚠️ Missing assessment IDs for Pair ${pairType}`);
          }
        }
      }
      
      console.log('✅ MSH status check complete:', mshStatus);
      setPublishedMSHs(mshStatus);
    };
    
    loadPublishedMSHs();
  }, [pairings, refreshTrigger]);
  
  // ✅ NEW: Reload MSH status when window regains focus (after publishing)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing MSH status');
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
  // Determine if we're showing pairings or assessments
  const showPairings = viewMode === '360-pairings' && pairings.length > 0;

  const getTypeBadge = (assessment) => {
    // Determine assessment type
    const isSelf = assessment.isSelfAssessment || 
                   assessment.assessmentType === 'self' ||
                   assessment.assessorUid === assessment.subjectUid;
    
    const cycleType = assessment.cycleType;
    const assessmentType = assessment.assessmentType;
    
    // Self-assessment
    if (isSelf) {
      return {
        icon: User,
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        label: 'Self'
      };
    }
    
    // 1x1 assessment
    if (cycleType === '1x1') {
      return {
        icon: FileText,
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
        label: '1x1'
      };
    }
    
    // 360° assessments - determine MR/DR/Peer
    if (cycleType === '360') {
      // Manager → Direct Report (360-MR)
      if (assessmentType === 'manager-down') {
        return {
          icon: ArrowDown,
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          border: 'border-purple-300',
          label: '360-MR'
        };
      }
      
      // Direct Report → Manager (360-DR)
      if (assessmentType === 'manager-up') {
        return {
          icon: ArrowUp,
          bg: 'bg-indigo-100',
          text: 'text-indigo-800',
          border: 'border-indigo-300',
          label: '360-DR'
        };
      }
      
      // Peer → Peer (360-P2P)
      if (assessmentType === 'peer') {
        return {
          icon: Users,
          bg: 'bg-cyan-100',
          text: 'text-cyan-800',
          border: 'border-cyan-300',
          label: '360-P2P'
        };
      }
    }
    
    // Fallback
    return {
      icon: FileText,
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300',
      label: 'Assessment'
    };
  };

  // ✅ FIXED: Check if assessment status is considered "complete"
  const isAssessmentComplete = (status) => {
    return status === 'completed' || status === 'not-aligned' || status === 'calibrated' || status === 'published';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': {
        icon: Clock,
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        label: 'Pending'
      },
      'in-progress': {
        icon: Clock,
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'In Progress'
      },
      'completed': {
        icon: CheckCircle,
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        label: 'Completed'
      },
      'not-aligned': {
        icon: AlertCircle,
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        label: 'Not Aligned'
      },
      'published': {
        icon: CheckCircle,
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        label: 'Published'
      }
    };

    const config = badges[status] || badges['pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const getAlignmentBadge = (assessment) => {
    if (!assessment || assessment.status === 'pending' || assessment.status === 'in-progress') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    // Use NEW field name: isAligned (boolean)
    if (assessment.isAligned === true) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          Aligned
        </span>
      );
    }

    if (assessment.isAligned === false) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
          Not Aligned
        </span>
      );
    }

    return <span className="text-gray-400 text-sm">—</span>;
  };

  const getHRPIndicator = (assessment) => {
    if (!assessment || assessment.status === 'pending') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    const badgeConfig = getHRPBadgeConfig(assessment);
    
    if (!badgeConfig) {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    const BadgeIcon = badgeConfig.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeConfig.className}`}>
        <BadgeIcon className="w-3 h-3" />
        {badgeConfig.text}
      </span>
    );
  };

  const hasNotes = (assessment) => {
    if (!assessment || !assessment.notes) return false;
    const noteValues = Object.values(assessment.notes);
    return noteValues.some(note => note && note.trim().length > 0);
  };

  const hasPublisherNotes = (assessment) => {
    return assessment && assessment.publisherNotes && assessment.publisherNotes.trim().length > 0;
  };

  const getNotesIndicator = (assessment) => {
    if (!assessment || assessment.status === 'pending' || assessment.status === 'in-progress') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (hasNotes(assessment)) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          ✓ Yes
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-300">
        No
      </span>
    );
  };

  const getPublisherNotesIndicator = (assessment) => {
    // Only show for published assessments
    if (!assessment || assessment.status !== 'published') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (hasPublisherNotes(assessment)) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          ✓ Yes
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-300">
        No
      </span>
    );
  };

  const groupAssessmentsByMonth = (assessments) => {
    const grouped = assessments.reduce((acc, assessment) => {
      const monthKey = `${assessment.cycleMonth}-${assessment.cycleYear}`;
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: assessment.cycleMonth,
          year: assessment.cycleYear,
          cycleName: assessment.cycleName || `Cycle ${assessment.cycleMonth}/${assessment.cycleYear}`,
          assessments: []
        };
      }
      acc[monthKey].assessments.push(assessment);
      return acc;
    }, {});

    // Sort months: EARLIEST to LATEST (ascending order)
    return Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  };

  const renderPairCard = (pairing, pairType, assessments, personA, personB, isPeerPairing, publisherUid, publisher) => {
    // ✅ COMPLETE FIX: For P2P, each subject publishes their own MSH
    if (isPeerPairing) {
      // Pair A: personB is subject, personA is assessor
      // Pair B: personA is subject, personB is assessor
      const subjectPerson = pairType === 'A' ? personB : personA;
      publisherUid = subjectPerson?.uid;
      publisher = subjectPerson;
    }
    
    // Pair A: personB is subject (assessed by personA)
    // Pair B: personA is subject (assessed by personB)
    const subjectPerson = pairType === 'A' ? personB : personA;
    const assessorPerson = pairType === 'A' ? personA : personB;
    
    // Get status of both assessments in this pair
    // ✅ CRITICAL FIX: pairing.assessments may not include self-assessments
    // Search pairing assessments first, then fallback to ALL assessments from component
    const findInArray = (arr, finder) => arr ? arr.find(finder) : null;
    
    const selfAssessmentFinder = (a) => {
      // Get UIDs from both enriched and raw assessment formats
      const giverUid = a.assessorUid || a.giver?.uid || a.assessorId;
      const receiverUid = a.subjectUid || a.receiver?.uid || a.subjectId;
      const subjectUid = subjectPerson?.uid || subjectPerson?.subjectId;
      
      const isSelf = a.isSelfAssessment || 
                     a.assessmentType === 'self' ||
                     giverUid === receiverUid;
      
      const matchesSubject = receiverUid === subjectUid;
      
      return isSelf && matchesSubject;
    };
    
    const bilateralAssessmentFinder = (a) => {
      // Get UIDs from both enriched and raw assessment formats
      const giverUid = a.assessorUid || a.giver?.uid || a.assessorId;
      const receiverUid = a.subjectUid || a.receiver?.uid || a.subjectId;
      const subjectUid = subjectPerson?.uid || subjectPerson?.subjectId;
      const assessorUid = assessorPerson?.uid || assessorPerson?.subjectId;
      
      const isNotSelf = !a.isSelfAssessment && 
                        a.assessmentType !== 'self' &&
                        giverUid !== receiverUid;
      
      const matchesSubject = receiverUid === subjectUid;
      const matchesAssessor = giverUid === assessorUid;
      
      return isNotSelf && matchesSubject && matchesAssessor;
    };
    
    // Try pairing assessments first
    let selfAssessment = findInArray(assessments, selfAssessmentFinder);
    let bilateralAssessment = findInArray(assessments, bilateralAssessmentFinder);
    
    // ✅ FALLBACK: If self-assessment not found in pairing, search ALL assessments
    if (!selfAssessment) {
      console.log(`⚠️ Pair ${pairType}: Self-assessment not in pairing, searching all assessments for ${subjectPerson?.name}...`);
      selfAssessment = findInArray(allAssessmentsRef.current, selfAssessmentFinder);
      if (selfAssessment) {
        console.log(`✅ Found self-assessment in all assessments:`, selfAssessment.id, selfAssessment.status);
      }
    }
    
    const selfStatus = selfAssessment?.status || 'pending';
    const assessmentStatus = bilateralAssessment?.status || 'pending';
    
    // ✅ DEBUG: Log matching results
    console.log(`🔍 Pair ${pairType} Assessment Matching:`, {
      pairId: pairing.pairId,
      subjectPerson: subjectPerson?.name,
      assessorPerson: assessorPerson?.name,
      selfAssessmentFound: !!selfAssessment,
      selfStatus,
      bilateralAssessmentFound: !!bilateralAssessment,
      assessmentStatus,
      totalAssessments: assessments.length,
      assessmentIds: assessments.map(a => ({ 
        id: a.id, 
        type: a.assessmentType, 
        isSelf: a.isSelfAssessment,
        status: a.status,
        subject: a.subjectName,
        assessor: a.assessorName
      }))
    });
    
    // ✅ FIXED: pairComplete = both assessments are 'completed' OR 'not-aligned'
    const pairComplete = isAssessmentComplete(selfStatus) && isAssessmentComplete(assessmentStatus);
    
    // Check if current user can publish this MSH
    const canCurrentUserPublish = currentUserId === publisherUid;
    
    // ✅ NEW: Check if this pair's MSH is published
    const mshKey = `${pairing.pairId}-${pairType}`;
    const mshInfo = publishedMSHs[mshKey];
    const isPublished = mshInfo?.published || false;
    
    console.log(`🎯 Pair ${pairType} status:`, {
      mshKey,
      isPublished,
      mshInfo,
      pairComplete,
      canCurrentUserPublish,
      selfStatus,
      assessmentStatus
    });
    
    // ✅ CRITICAL FIX: Do NOT allow navigation if published
    const handleNavigation = () => {
      if (isPublished) {
        console.log('🔒 BLOCKED: Cannot navigate to comparison view - MSH already published');
        alert('⚠️ This MSH has already been published and cannot be edited.');
        return;
      }
      
      onView360Pair({ 
        ...pairing, 
        selectedPair: pairType 
      });
    };
    
    return (
      <div key={`${pairing.pairId}-${pairType}`} className="bg-white border-2 border-indigo-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg">
              {pairType}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">
                {subjectPerson?.displayName || subjectPerson?.name}'s MSH
              </div>
              <div className="text-xs text-gray-600">
                {publisher?.displayName || publisher?.name} publishes this MSH
              </div>
            </div>
          </div>
          {/* ✅ CRITICAL FIX: Button Logic */}
          {isPublished ? (
            // ✅ LOCKED: Published MSH - only show view button, NO navigation allowed
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-lg border-2 border-green-300">
                <CheckCircle className="w-4 h-4" />
                Complete
              </div>
              {mshInfo?.mshDocId && (
                <button
                  onClick={() => window.location.href = `/is-os/msh/${mshInfo.mshDocId}`}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  title="View published MSH"
                >
                  <Eye className="w-4 h-4" />
                  View MSH
                </button>
              )}
            </div>
          ) : pairComplete && canCurrentUserPublish ? (
            // ✅ UNPUBLISHED: Allow Align & Publish
            <button
              onClick={handleNavigation}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" />
              Align & Publish
            </button>
          ) : pairComplete && !canCurrentUserPublish ? (
            // Completed but not authorized to publish
            <button
              onClick={handleNavigation}
              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View (Read-Only)
            </button>
          ) : (
            // Incomplete - monitor only
            <button
              onClick={handleNavigation}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Monitor
            </button>
          )}
        </div>

        {/* 2 Assessment Boxes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Box 1: Subject Self */}
          <div className={`p-3 rounded-lg border-2 ${
            isAssessmentComplete(selfStatus)
              ? 'bg-green-50 border-green-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="text-xs font-semibold text-gray-600 mb-1">
              {isPeerPairing ? 'Subject Self' : pairType === 'A' ? 'Subject Self (DR)' : 'Subject Self (MR)'}
            </div>
            <div className="text-sm font-bold text-gray-900 mb-2">
              {subjectPerson?.displayName || subjectPerson?.name}
            </div>
            {getStatusBadge(selfStatus)}
          </div>

          {/* Box 2: Assessor → Subject */}
          <div className={`p-3 rounded-lg border-2 ${
            isAssessmentComplete(assessmentStatus)
              ? 'bg-blue-50 border-blue-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="text-xs font-semibold text-gray-600 mb-1">
              {isPeerPairing ? 'Peer Assessment' : pairType === 'A' ? 'Manager → DR' : 'DR → Manager'}
            </div>
            <div className="text-sm font-bold text-gray-900 mb-2">
              {assessorPerson?.displayName || assessorPerson?.name} → {subjectPerson?.displayName || subjectPerson?.name}
            </div>
            {getStatusBadge(assessmentStatus)}
          </div>
        </div>
      </div>
    );
  };

  // Render 360° Pairings View
  const render360Pairings = () => {
    if (pairings.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{emptyStateMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {pairings.map((pairing) => {
          const personA = pairing.personA;
          const personB = pairing.personB;
          const isPeerPairing = pairing.relationshipType === 'peer';

          // ✅ COMPLETE FIX: Publisher logic
          // MR/DR: Manager publishes BOTH Pair A and Pair B
          // P2P: Each subject publishes their own MSH (determined per card below)
          let publisherUid, publisher;
          
          if (isPeerPairing) {
            // For P2P, publisher is different for each card (the subject)
            // We'll pass null here and determine in renderPairCard
            publisherUid = null;
            publisher = null;
          } else {
            // MR/DR: Find the manager by checking assessment types
            // manager-down: assessor is manager, subject is DR
            // manager-up: subject is manager, assessor is DR
            
            // Get the bilateral assessments from the pairing
            const pairA_assessment = pairing.assessments?.find(a => 
              (a.assessorUid === personA?.uid || a.assessorId === personA?.uid) &&
              (a.subjectUid === personB?.uid || a.subjectId === personB?.uid) &&
              !a.isSelfAssessment
            );
            
            const pairB_assessment = pairing.assessments?.find(a => 
              (a.assessorUid === personB?.uid || a.assessorId === personB?.uid) &&
              (a.subjectUid === personA?.uid || a.subjectId === personA?.uid) &&
              !a.isSelfAssessment
            );
            
            // Determine who is the manager
            if (pairA_assessment?.assessmentType === 'manager-down') {
              // PersonA is manager (assessing PersonB who is DR)
              publisher = personA;
              publisherUid = personA?.uid;
            } else if (pairB_assessment?.assessmentType === 'manager-down') {
              // PersonB is manager (assessing PersonA who is DR)
              publisher = personB;
              publisherUid = personB?.uid;
            } else if (pairA_assessment?.assessmentType === 'manager-up') {
              // PersonB is manager (being assessed by PersonA who is DR)
              publisher = personB;
              publisherUid = personB?.uid;
            } else if (pairB_assessment?.assessmentType === 'manager-up') {
              // PersonA is manager (being assessed by PersonB who is DR)
              publisher = personA;
              publisherUid = personA?.uid;
            } else {
              // Fallback: Try pairing.managerId
              publisherUid = pairing.managerId;
              
              if (personA?.uid === pairing.managerId) {
                publisher = personA;
              } else if (personB?.uid === pairing.managerId) {
                publisher = personB;
              }
            }
          }

          return (
            <div key={pairing.pairId} className="space-y-4">
              {/* Pairing Header */}
              <div className={`${
                isPeerPairing 
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600'
              } text-white px-6 py-4 rounded-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-bold">
                        {personA?.displayName || personA?.name} ↔ {personB?.displayName || personB?.name}
                      </h3>
                      <p className={`text-sm ${isPeerPairing ? 'text-teal-100' : 'text-indigo-100'}`}>
                        {isPeerPairing ? 'Peer-to-Peer (P2P)' : 'Manager / Direct Report (MR/DR)'}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs ${isPeerPairing ? 'text-teal-100' : 'text-indigo-100'}`}>
                    ID: {pairing.pairId}
                  </div>
                </div>
              </div>

              {/* Pair A and Pair B Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderPairCard(pairing, 'A', pairing.assessments, personA, personB, isPeerPairing, publisherUid, publisher)}
                {renderPairCard(pairing, 'B', pairing.assessments, personA, personB, isPeerPairing, publisherUid, publisher)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Assessments View
  const renderAssessments = () => {
    if (assessments.length === 0) {
      return (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{emptyStateMessage}</p>
        </div>
      );
    }

    const groupedAssessments = groupAssessmentsByMonth(assessments);

    return (
      <div className="space-y-8">
        {groupedAssessments.map(group => (
          <div key={`${group.month}-${group.year}`}>
            <div className="bg-gradient-to-r from-gray-700 to-gray-600 text-white px-6 py-3 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                <h3 className="text-lg font-bold">{group.cycleName}</h3>
              </div>
              <div className="text-sm text-gray-200">
                {group.assessments.length} assessment{group.assessments.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="overflow-x-auto bg-white rounded-b-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {viewMode === 'give' ? 'Subject' : 'Assessor'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Layer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pillar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sub-Pillar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Composite
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HRP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Publisher Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MSH ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.assessments
                    .sort((a, b) => {
                      const aIsSelf = a.isSelfAssessment || a.assessorUid === a.subjectUid;
                      const bIsSelf = b.isSelfAssessment || b.assessorUid === b.subjectUid;
                      
                      if (aIsSelf && !bIsSelf) return -1;
                      if (!aIsSelf && bIsSelf) return 1;
                      
                      if (a.pairId && b.pairId) {
                        if (a.pairId === b.pairId) {
                          return (a.assessorName || '').localeCompare(b.assessorName || '');
                        }
                        return a.pairId.localeCompare(b.pairId);
                      }
                      
                      if (a.pairId && !b.pairId) return -1;
                      if (!a.pairId && b.pairId) return 1;
                      
                      const nameA = viewMode === 'give' ? a.subjectName : a.assessorName;
                      const nameB = viewMode === 'give' ? b.subjectName : b.assessorName;
                      return (nameA || '').localeCompare(nameB || '');
                    })
                    .map((assessment, index, array) => {
                      const isMyAssessment = assessment.assessorUid === currentUserId;
                      const canEdit = assessment.viewAccess === 'edit' && 
                                     (assessment.status === 'pending' || assessment.status === 'in-progress');
                      const isSelf = assessment.isSelfAssessment || assessment.assessorUid === assessment.subjectUid;
                      const typeBadge = getTypeBadge(assessment);
                      const TypeIcon = typeBadge.icon;
                      
                      const hasPair = assessment.pairId && !isSelf;
                      const prevAssessment = index > 0 ? array[index - 1] : null;
                      const nextAssessment = index < array.length - 1 ? array[index + 1] : null;
                      const isFirstInPair = hasPair && (!prevAssessment || prevAssessment.pairId !== assessment.pairId);
                      const isLastInPair = hasPair && (!nextAssessment || nextAssessment.pairId !== assessment.pairId);

                      return (
                        <tr key={assessment.id} className={`hover:bg-gray-50 ${isSelf ? 'bg-orange-50/30' : hasPair ? 'bg-indigo-50/20' : ''} ${isFirstInPair ? 'border-t-2 border-indigo-300' : ''} ${isLastInPair ? 'border-b-2 border-indigo-300' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {hasPair && (
                                <div className="flex-shrink-0">
                                  <Users className="w-4 h-4 text-indigo-600" />
                                </div>
                              )}
                              {canEdit ? (
                                <button
                                  onClick={() => onStartAssessment(assessment)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                  <FileText className="w-4 h-4" />
                                  Assess
                                </button>
                              ) : assessment.viewAccess === 'read-only' && assessment.isPillarVisibility ? (
                                <button
                                  onClick={() => onViewAssessment(assessment.id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800"
                                >
                                  <Eye className="w-4 h-4" />
                                  Monitor
                                </button>
                              ) : (
                                <button
                                  onClick={() => onViewAssessment(assessment.id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {viewMode === 'give' ? assessment.subjectName : assessment.assessorName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {viewMode === 'give' 
                                ? assessment.subjectEmail 
                                : (assessment.assessorLayer || '')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {viewMode === 'give' ? assessment.subjectLayer : assessment.assessorLayer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {assessment.subjectPillar ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {getPillarAbbreviation(assessment.subjectPillar)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {assessment.subjectSubPillar ? getSubPillarDisplayName(assessment.subjectSubPillar) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(assessment.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {assessment.compositeScore !== null && assessment.compositeScore !== undefined 
                              ? assessment.compositeScore 
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getAlignmentBadge(assessment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getHRPIndicator(assessment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getNotesIndicator(assessment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPublisherNotesIndicator(assessment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {assessment.mshId ? (
                              <span className="text-sm font-mono font-semibold text-indigo-600">
                                {assessment.mshId}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return showPairings ? render360Pairings() : renderAssessments();
}

export default AssessmentOrchestrator;