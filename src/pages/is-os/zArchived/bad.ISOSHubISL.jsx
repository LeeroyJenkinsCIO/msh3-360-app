// 📁 COMPLETE FIX FOR: src/pages/is-os/ISOSHubISL.jsx
// Step 1: Add helper function AFTER imports, BEFORE the component function

/**
 * Detect relationship type from pairing assessments
 * @param {Array} assessments - All assessments in the pairing
 * @returns {string} 'peer' or 'manager'
 */
const detectRelationshipType = (assessments) => {
  const bilateralAssessment = assessments.find(a => {
    const giverUid = a.giver?.uid || a.assessorId;
    const receiverUid = a.receiver?.uid || a.subjectId;
    return giverUid !== receiverUid;
  });
  
  if (!bilateralAssessment) return 'manager';
  
  if (bilateralAssessment.assessmentType === 'peer') {
    return 'peer';
  }
  
  if (bilateralAssessment.assessmentType === 'manager-down' || 
      bilateralAssessment.assessmentType === 'manager-up') {
    return 'manager';
  }
  
  const giverLayer = bilateralAssessment.giver?.layer;
  const receiverLayer = bilateralAssessment.receiver?.layer;
  
  if (giverLayer === 'ISL' && receiverLayer === 'ISL') {
    return 'peer';
  }
  
  return 'manager';
};

// Step 2: FIND this section (around line 436-468) and REPLACE:

// OLD CODE (FIND THIS):
/*
        const my360Pairings = Array.from(pairingMap.values())
          .filter(pairing => {
            const involvesMe = pairing.personA?.uid === user.uid || 
                              pairing.personB?.uid === user.uid;
            return involvesMe;
          })
          .map(pairing => {
            // ... existing code ...
            
            return {
              ...pairing,
              status: combinedStatuses,
              overallStatus: allComplete ? 'all_complete' : 
                           partialComplete ? 'partially_complete' : 
                           'not_started',
              personA: pairing.personA ? {
                ...pairing.personA,
                ...userMap[pairing.personA.uid]
              } : null,
              personB: pairing.personB ? {
                ...pairing.personB,
                ...userMap[pairing.personB.uid]
              } : null
            };
          });
*/

// NEW CODE (REPLACE WITH THIS):
const my360Pairings = Array.from(pairingMap.values())
  .filter(pairing => {
    const involvesMe = pairing.personA?.uid === user.uid || 
                      pairing.personB?.uid === user.uid;
    return involvesMe;
  })
  .map(pairing => {
    const personAUid = pairing.personA?.uid;
    const personBUid = pairing.personB?.uid;
    
    const personA_self = selfAssessmentMap.get(personAUid) || 'pending';
    const personB_self = selfAssessmentMap.get(personBUid) || 'pending';
    
    const assessmentStatuses = pairing.assessments.reduce((acc, a) => {
      const giverUid = a.giver?.uid || a.assessorId;
      const receiverUid = a.receiver?.uid || a.subjectId;
      const isSelf = giverUid === receiverUid;
      
      if (isSelf) return acc;
      
      if (giverUid === personAUid && receiverUid === personBUid) {
        acc.personA_to_B = a.status;
        acc.assessmentIds = acc.assessmentIds || {};
        acc.assessmentIds.personA_to_B = a.id;
      } else if (giverUid === personBUid && receiverUid === personAUid) {
        acc.personB_to_A = a.status;
        acc.assessmentIds = acc.assessmentIds || {};
        acc.assessmentIds.personB_to_A = a.id;
      }
      
      return acc;
    }, {
      personA_to_B: 'pending',
      personB_to_A: 'pending',
      assessmentIds: {}
    });

    const combinedStatuses = {
      personA_self,
      personA_to_B: assessmentStatuses.personA_to_B,
      personB_self,
      personB_to_A: assessmentStatuses.personB_to_A
    };

    const allComplete = Object.values(combinedStatuses).every(
      status => status === 'completed' || status === 'calibrated'
    );
    
    const partialComplete = Object.values(combinedStatuses).some(
      status => status === 'completed' || status === 'calibrated'
    );

    // 🎯 DETECT RELATIONSHIP TYPE
    const relationshipType = detectRelationshipType(pairing.assessments);
    
    // 🎯 DETERMINE MANAGER ID
    let managerId = null;
    if (relationshipType === 'manager') {
      const personALayer = pairing.personA?.layer;
      const personBLayer = pairing.personB?.layer;
      
      const layerHierarchy = { 'ISE': 3, 'ISL': 2, 'ISF': 1, 'ISF Supervisor': 2 };
      const personALevel = layerHierarchy[personALayer] || 0;
      const personBLevel = layerHierarchy[personBLayer] || 0;
      
      managerId = personALevel > personBLevel ? personAUid : personBUid;
    }
    
    console.log(`🔗 Pairing ${pairing.personA?.name} ↔ ${pairing.personB?.name}:`, {
      relationshipType,
      personALayer: pairing.personA?.layer,
      personBLayer: pairing.personB?.layer,
      managerId: managerId ? 'Set' : 'N/A (P2P)'
    });

    return {
      ...pairing,
      relationshipType,  // ✅ ADD THIS
      managerId,         // ✅ ADD THIS
      status: combinedStatuses,
      assessmentIds: assessmentStatuses.assessmentIds, // ✅ ADD THIS
      overallStatus: allComplete ? 'all_complete' : 
                   partialComplete ? 'partially_complete' : 
                   'not_started',
      personA: pairing.personA ? {
        ...pairing.personA,
        displayName: pairing.personA.name, // ✅ ADD THIS
        ...(userMap[pairing.personA.uid] || {})
      } : null,
      personB: pairing.personB ? {
        ...pairing.personB,
        displayName: pairing.personB.name, // ✅ ADD THIS
        ...(userMap[pairing.personB.uid] || {})
      } : null
    };
  });