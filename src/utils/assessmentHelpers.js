// src/utils/assessmentHelpers.js

/**
 * Returns the appropriate badge component for HRP status
 * @param {Object} assessment - Assessment object with HRP fields
 * @param {Object} Badge - Badge component from UI library
 * @returns {JSX.Element|null} Badge component or null
 */
export const getHRPStatusBadge = (assessment, Badge) => {
  if (!assessment.hrpRequested) {
    return null;
  }

  if (assessment.hrpReviewStatus === 'reviewed-published') {
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-300">
        HRP Reviewed
      </Badge>
    );
  }

  if (assessment.hrpReviewStatus === 'reviewed-with-changes') {
    return (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
        HRP Edited
      </Badge>
    );
  }

  // Default: HRP Requested but not yet reviewed
  return (
    <Badge className="bg-red-100 text-red-800 border border-red-300">
      HRP Pending
    </Badge>
  );
};

/**
 * Get HRP status text for display
 * @param {Object} assessment - Assessment object
 * @returns {string} Status text
 */
export const getHRPStatusText = (assessment) => {
  if (!assessment.hrpRequested) {
    return 'Not Requested';
  }

  if (assessment.hrpReviewStatus === 'reviewed-published') {
    return 'Reviewed & Published';
  }

  if (assessment.hrpReviewStatus === 'reviewed-with-changes') {
    return 'Reviewed with Changes';
  }

  return 'Pending Review';
};