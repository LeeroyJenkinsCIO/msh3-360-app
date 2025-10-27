// 📁 SAVE TO: src/utils/360Pairing.js
// Complete helper functions for 360 assessment pairings

/**
 * Detects if a 360 pairing exists between two users for a given cycle
 */
export const detect360Pairing = (assessments, mrId, drId, cycleMonth, cycleYear) => {
  const pairingAssessments = assessments.filter(a => {
    const matchesCycle = a.cycleMonth === cycleMonth && a.cycleYear === cycleYear;
    if (!matchesCycle) return false;
    
    if (a.assessmentType === 'self') {
      return a.subjectId === mrId || a.subjectId === drId;
    }
    
    return (a.subjectId === mrId && a.assessorId === drId) ||
           (a.subjectId === drId && a.assessorId === mrId);
  });

  if (pairingAssessments.length === 0) return null;

  const cycleMonthPadded = String(cycleMonth).padStart(2, '0');
  const cycleId = `cycle-${cycleYear}-${cycleMonthPadded}`;
  const [userA, userB] = [mrId, drId].sort();
  const expectedPairId = `360-pair-${cycleId}-${userA}-${userB}`;

  const assessmentsWithPairId = pairingAssessments.filter(a => a.pairId === expectedPairId);
  
  const drSelfAssessment = pairingAssessments.find(a => 
    a.assessmentType === 'self' && a.subjectId === drId
  );
  
  const mrSelfAssessment = pairingAssessments.find(a => 
    a.assessmentType === 'self' && a.subjectId === mrId
  );

  const pairA = {
    type: 'pair-a',
    label: 'MR → DR Assessment',
    selfAssessment: drSelfAssessment,
    bilateralAssessment: assessmentsWithPairId.find(a => 
      a.assessmentType === 'manager-down' && 
      a.subjectId === drId && 
      a.assessorId === mrId
    )
  };

  const pairB = {
    type: 'pair-b',
    label: 'DR → MR Assessment',
    selfAssessment: mrSelfAssessment,
    bilateralAssessment: assessmentsWithPairId.find(a => 
      a.assessmentType === 'manager-up' && 
      a.subjectId === mrId && 
      a.assessorId === drId
    )
  };

  return {
    pairingId: expectedPairId,
    mrId,
    drId,
    cycleMonth,
    cycleYear,
    pairA,
    pairB,
    allAssessments: pairingAssessments
  };
};

/**
 * Checks if Pair A (MR→DR) is complete and ready for comparative view
 */
export const isPairAComplete = (pairing) => {
  if (!pairing?.pairA) return false;
  const { selfAssessment, bilateralAssessment } = pairing.pairA;
  
  return (
    selfAssessment?.status === 'completed' &&
    bilateralAssessment?.status === 'completed'
  );
};

/**
 * Checks if Pair B (DR→MR) is complete and ready for comparative view
 */
export const isPairBComplete = (pairing) => {
  if (!pairing?.pairB) return false;
  const { selfAssessment, bilateralAssessment } = pairing.pairB;
  
  return (
    selfAssessment?.status === 'completed' &&
    bilateralAssessment?.status === 'completed'
  );
};

/**
 * Checks if MR can launch Pair A comparative assessment
 */
export const canMRLaunchPairA = (pairing, currentUserId) => {
  return (
    currentUserId === pairing.mrId &&
    isPairAComplete(pairing) &&
    !pairing.pairA.bilateralAssessment?.mshPublished
  );
};

/**
 * Checks if MR can launch Pair B comparative assessment
 */
export const canMRLaunchPairB = (pairing, currentUserId) => {
  return (
    currentUserId === pairing.mrId &&
    isPairBComplete(pairing) &&
    !pairing.pairB.bilateralAssessment?.mshPublished
  );
};

/**
 * Gets appropriate status badge for a pairing
 */
export const getPairingBadge = (pairing, userRole, pairType = 'pair-a') => {
  const pair = pairType === 'pair-a' ? pairing.pairA : pairing.pairB;
  if (!pair) return { label: 'Not Started', color: 'gray', emoji: '⚪' };

  const selfComplete = pair.selfAssessment?.status === 'completed';
  const bilateralComplete = pair.bilateralAssessment?.status === 'completed';
  const mshPublished = pair.bilateralAssessment?.mshPublished;

  if (mshPublished) {
    return { label: 'MSH Published', color: 'green', emoji: '✅' };
  }

  if (selfComplete && bilateralComplete) {
    return { label: '360 Ready', color: 'blue', emoji: '🟢' };
  }

  if (userRole === 'mr') {
    if (!selfComplete && bilateralComplete) {
      return { label: 'Awaiting DR Self', color: 'yellow', emoji: '🟡' };
    }
    if (selfComplete && !bilateralComplete) {
      return { label: 'Action Required', color: 'red', emoji: '🔴' };
    }
    if (!selfComplete && !bilateralComplete) {
      return { label: 'Both Pending', color: 'yellow', emoji: '🟡' };
    }
  } else {
    if (selfComplete && !bilateralComplete) {
      return { label: 'Awaiting MR', color: 'yellow', emoji: '🟡' };
    }
    if (!selfComplete && bilateralComplete) {
      return { label: 'Action Required', color: 'red', emoji: '🔴' };
    }
    if (!selfComplete && !bilateralComplete) {
      return { label: 'Both Pending', color: 'yellow', emoji: '🟡' };
    }
  }

  return { label: 'In Progress', color: 'yellow', emoji: '🟡' };
};

/**
 * Gets user-friendly names for subjects in pairing
 */
export const getPairingNames = (pairing, userProfiles) => {
  const mrProfile = userProfiles?.find(u => u.id === pairing.mrId);
  const drProfile = userProfiles?.find(u => u.id === pairing.drId);

  return {
    mrName: mrProfile?.displayName || 'Manager',
    drName: drProfile?.displayName || 'Direct Report'
  };
};

/**
 * Generates route for comparative assessment page
 */
export const getComparativeAssessmentRoute = (pairingId, pairType) => {
  return `/is-os/360-comparative/${pairType}/${pairingId}`;
};

/**
 * Determines if user is MR in this pairing
 */
export const isUserMR = (pairing, currentUserId) => {
  return pairing.mrId === currentUserId;
};

/**
 * Gets all pending actions for a user in a pairing
 */
export const getPendingActions = (pairing, currentUserId) => {
  const actions = [];
  const isMR = isUserMR(pairing, currentUserId);

  if (pairing.pairA) {
    const { selfAssessment, bilateralAssessment } = pairing.pairA;
    
    if (isMR) {
      if (bilateralAssessment?.status !== 'completed') {
        actions.push({
          pair: 'pair-a',
          type: 'bilateral',
          label: 'Complete assessment of DR',
          assessmentId: bilateralAssessment?.id
        });
      }
    } else {
      if (selfAssessment?.status !== 'completed') {
        actions.push({
          pair: 'pair-a',
          type: 'self',
          label: 'Complete self-assessment',
          assessmentId: selfAssessment?.id
        });
      }
    }
  }

  if (pairing.pairB) {
    const { selfAssessment, bilateralAssessment } = pairing.pairB;
    
    if (isMR) {
      if (selfAssessment?.status !== 'completed') {
        actions.push({
          pair: 'pair-b',
          type: 'self',
          label: 'Complete self-assessment',
          assessmentId: selfAssessment?.id
        });
      }
    } else {
      if (bilateralAssessment?.status !== 'completed') {
        actions.push({
          pair: 'pair-b',
          type: 'bilateral',
          label: 'Complete assessment of MR',
          assessmentId: bilateralAssessment?.id
        });
      }
    }
  }

  return actions;
};