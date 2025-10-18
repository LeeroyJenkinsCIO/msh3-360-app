// src/utils/pillarHelpers.js

/**
 * Pillar Display Helpers
 * 
 * Utilities for safely displaying pillar names in the UI
 * Handles both legacy string format and new object format from Firebase
 */

/**
 * Format pillar name for display
 * Handles both old string format ("service_support") and new object format
 * 
 * @param {string|object} pillar - Pillar ID string or pillar object
 * @returns {string} - Formatted display name
 */
export const getPillarDisplayName = (pillar) => {
  // Handle null/undefined
  if (!pillar) return '—';
  
  // If it's already an object with displayName, use that
  if (typeof pillar === 'object' && pillar.displayName) {
    return pillar.displayName;
  }
  
  // If it's a string, format it nicely
  if (typeof pillar === 'string') {
    return formatPillarString(pillar);
  }
  
  // Fallback
  return '—';
};

/**
 * Convert pillar_name strings to Display Names
 * 
 * @param {string} pillarId - Pillar ID (e.g., "service_support")
 * @returns {string} - Display name (e.g., "Service & Support")
 */
export const formatPillarString = (pillarId) => {
  if (!pillarId || typeof pillarId !== 'string') return '—';
  
  // Mapping for known pillars
  const pillarMap = {
    'data_services': 'Data Services',
    'infrastructure': 'Systems & Infrastructure',
    'service_support': 'Service & Support',
    'risk_governance': 'Risk & Governance',
    'pmo_ci': 'PMO/CI',
    'hr_partner': 'HR Partner',
    'admin': 'Admin',
    'executive': 'Executive'
  };
  
  // Return mapped name or format the string
  if (pillarMap[pillarId]) {
    return pillarMap[pillarId];
  }
  
  // Format unknown strings: replace underscores with spaces and title case
  return pillarId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get pillar ID from pillar (string or object)
 * 
 * @param {string|object} pillar - Pillar string or object
 * @returns {string} - Pillar ID
 */
export const getPillarId = (pillar) => {
  if (!pillar) return '';
  if (typeof pillar === 'string') return pillar;
  if (typeof pillar === 'object' && pillar.name) return pillar.name;
  return '';
};

/**
 * Format sub pillar name for display
 * 
 * @param {string|object} subPillar - Sub pillar name or object
 * @returns {string} - Formatted display name
 */
export const getSubPillarDisplayName = (subPillar) => {
  if (!subPillar) return '—';
  
  // If it's an object with name property
  if (typeof subPillar === 'object' && subPillar.name) {
    return subPillar.name;
  }
  
  // If it's a string
  if (typeof subPillar === 'string') {
    return subPillar;
  }
  
  return '—';
};

/**
 * Truncate pillar name to abbreviation (first 2 chars of each word, ignore &)
 * Examples:
 * - "Data Services" → "DASE"
 * - "Service & Support" → "SESU"
 * - "PMO/CI" → "PMCI"
 * - "Systems & Infrastructure" → "SYIN"
 * 
 * @param {string|object} pillar - Pillar ID string or pillar object
 * @returns {string} - Truncated abbreviation (4 chars)
 */
export const getTruncatedPillarName = (pillar) => {
  // Get the display name first
  const displayName = getPillarDisplayName(pillar);
  
  if (!displayName || displayName === '—') return '—';
  
  // Remove "&" and split by spaces or "/"
  const words = displayName
    .replace(/&/g, '')  // Remove ampersands
    .split(/[\s\/]+/)   // Split by spaces or slashes
    .filter(word => word.length > 0);  // Remove empty strings
  
  // Take first 2 characters of each word and join
  const abbreviation = words
    .map(word => word.substring(0, 2).toUpperCase())
    .join('');
  
  return abbreviation;
};