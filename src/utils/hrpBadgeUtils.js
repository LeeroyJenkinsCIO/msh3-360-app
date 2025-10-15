// 📁 SAVE TO: src/utils/hrpBadgeUtils.js
// CREATE NEW FILE - Utility functions for HRP badge display across the app

import { CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Get HRP badge configuration based on assessment state
 * @param {Object} assessment - Assessment object from Firebase
 * @returns {Object|null} Badge config with text, variant, and icon, or null if no HRP badge needed
 */
export const getHRPBadgeConfig = (assessment) => {
  // Only show HRP badge if hrpRequested is true
  if (!assessment?.hrpRequested) {
    return null;
  }
  
  // If HRP review is complete
  if (assessment.hrpReviewedAt) {
    return {
      text: 'Review Complete',
      variant: 'success',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-300'
    };
  }
  
  // If HRP review is pending
  return {
    text: 'HRP',
    variant: 'warning',
    icon: AlertCircle,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };
};

/**
 * Get HRP status text for display
 * @param {Object} assessment - Assessment object from Firebase
 * @returns {string} Human-readable status text
 */
export const getHRPStatusText = (assessment) => {
  if (!assessment?.hrpRequested) {
    return 'No HRP review required';
  }
  
  if (assessment.hrpReviewedAt) {
    return 'HRP review completed';
  }
  
  return 'Awaiting HRP review';
};

/**
 * Check if assessment needs HRP attention
 * @param {Object} assessment - Assessment object from Firebase
 * @returns {boolean} True if HRP action is needed
 */
export const needsHRPAttention = (assessment) => {
  return assessment?.hrpRequested === true && !assessment?.hrpReviewedAt;
};

/**
 * Check if assessment has completed HRP review
 * @param {Object} assessment - Assessment object from Firebase
 * @returns {boolean} True if HRP review is complete
 */
export const isHRPReviewComplete = (assessment) => {
  return assessment?.hrpRequested === true && !!assessment?.hrpReviewedAt;
};

/**
 * Get time since HRP review completed
 * @param {Date} hrpReviewedAt - Date when HRP review was completed
 * @returns {string} Human-readable time string
 */
export const getTimeSinceHRPReview = (hrpReviewedAt) => {
  if (!hrpReviewedAt) return 'Not reviewed';
  
  const now = new Date();
  const reviewDate = hrpReviewedAt instanceof Date ? hrpReviewedAt : new Date(hrpReviewedAt);
  
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reviewMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
  
  const daysDiff = Math.floor((nowMidnight - reviewMidnight) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Yesterday';
  if (daysDiff < 30) return `${daysDiff} days ago`;
  if (daysDiff < 60) return '1 month ago';
  return `${Math.floor(daysDiff / 30)} months ago`;
};

export default {
  getHRPBadgeConfig,
  getHRPStatusText,
  needsHRPAttention,
  isHRPReviewComplete,
  getTimeSinceHRPReview
};