// 📁 COMPLETE UPDATES FOR: src/pages/is-os/ISOSHubISL.jsx
// Add these changes to your existing ISOSHubISL.jsx file

// ═══════════════════════════════════════════════════════════════
// STEP 1: Add this handler function (around line 650, after handleViewScore)
// ═══════════════════════════════════════════════════════════════

const handleView360Pair = (pairingId, pairType) => {
  // Navigate to comparative assessment page
  navigate(`/is-os/360-comparative/${pairType}/${pairingId}`);
};

// ═══════════════════════════════════════════════════════════════
// STEP 2: Update the GIVE TAB UnifiedAssessmentGrid call
// Find the existing call (around line 680) and replace with this:
// ═══════════════════════════════════════════════════════════════

{activeTab === 'give' && (
  <UnifiedAssessmentGrid
    assessments={assessmentsIGive}
    onStartAssessment={handleStartAssessment}
    onViewAssessment={handleViewAssessment}
    onView360Pair={handleView360Pair}  // ✨ ADD THIS LINE
    viewMode="give"
    currentUserId={user.uid}
    emptyStateMessage="No assessments to complete this cycle"
  />
)}

// ═══════════════════════════════════════════════════════════════
// STEP 3: Update the RECEIVE TAB UnifiedAssessmentGrid call
// Find the existing call (around line 700) and replace with this:
// ═══════════════════════════════════════════════════════════════

{activeTab === 'receive' && (
  <div className="space-y-8">
    {assessmentsIReceive.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assessments About Me
        </h3>
        <UnifiedAssessmentGrid
          assessments={assessmentsIReceive}
          onStartAssessment={handleStartAssessment}
          onViewAssessment={handleViewAssessment}
          onView360Pair={handleView360Pair}  // ✨ ADD THIS LINE
          viewMode="receive"
          currentUserId={user.uid}
          emptyStateMessage="No assessments about you this cycle"
        />
      </div>
    )}

    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        My Published MSH Scores
      </h3>
      <PublishedMSHScoresGrid
        mshScores={mshScoresIReceive}
        onViewScore={handleViewScore}
        emptyStateMessage="No published MSH scores yet"
      />
    </div>
  </div>
)}

// ═══════════════════════════════════════════════════════════════
// ✅ THAT'S IT! Three simple changes to enable 360 pairing support
// ═══════════════════════════════════════════════════════════════// 📁 UPDATE in src/pages/is-os/ISOSHubISL.jsx
// Add this handler function after handleViewAssessment and handleViewScore

const handleView360Pair = (pairingId, pairType) => {
  // Navigate to comparative assessment page
  navigate(`/is-os/360-comparative/${pairType}/${pairingId}`);
};

// Then update the UnifiedAssessmentGrid component calls to include the new handler:

// IN THE GIVE TAB:
{activeTab === 'give' && (
  <UnifiedAssessmentGrid
    assessments={assessmentsIGive}
    onStartAssessment={handleStartAssessment}
    onViewAssessment={handleViewAssessment}
    onView360Pair={handleView360Pair}  // ✨ ADD THIS LINE
    viewMode="give"
    currentUserId={user.uid}
    emptyStateMessage="No assessments to complete this cycle"
  />
)}

// IN THE RECEIVE TAB:
{activeTab === 'receive' && (
  <div className="space-y-8">
    {assessmentsIReceive.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assessments About Me
        </h3>
        <UnifiedAssessmentGrid
          assessments={assessmentsIReceive}
          onStartAssessment={handleStartAssessment}
          onViewAssessment={handleViewAssessment}
          onView360Pair={handleView360Pair}  // ✨ ADD THIS LINE (optional for receive view)
          viewMode="receive"
          currentUserId={user.uid}
          emptyStateMessage="No assessments about you this cycle"
        />
      </div>
    )}

    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        My Published MSH Scores
      </h3>
      <PublishedMSHScoresGrid
        mshScores={mshScoresIReceive}
        onViewScore={handleViewScore}
        emptyStateMessage="No published MSH scores yet"
      />
    </div>
  </div>
)}