/**
 * Permission Utility Functions
 * Handles user permissions and role checks for the MSH³ app
 */

/**
 * Check if user has a specific role
 * @param {Object} user - User object from auth context
 * @param {string} role - Role to check (e.g., 'admin', 'ise', 'isl')
 * @returns {boolean}
 */
export function hasRole(user, role) {
  if (!user || !role) return false;
  return user.role?.toLowerCase() === role.toLowerCase();
}

/**
 * Get all permissions for a user based on their role and flags
 * @param {Object} user - User object from Firestore
 * @returns {Object} - Permission object with boolean flags
 */
export function getUserPermissions(user) {
  if (!user) {
    return {
      canAccessAdminPanel: false,
      canViewProjectAssessments: false,
      canCreateProjects: false,
      canInitiateAssessments: false,
      canViewISOS: false,
      canCreate1x1Assessments: false,
      canCreate360Assessments: false,
      canViewMetrics: false
    };
  }

  const permissions = {
    // Admin permissions
    canAccessAdminPanel: user.flags?.isAdmin || false,
    
    // Project permissions
    canViewProjectAssessments: true, // All authenticated users can view
    canCreateProjects: user.flags?.isPillarLeader || user.flags?.isExecutive || user.flags?.isAdmin || false,
    
    // Assessment permissions
    canInitiateAssessments: user.flags?.canInitiateAssessments || false,
    canCreate1x1Assessments: user.flags?.canInitiateAssessments || false,
    canCreate360Assessments: user.flags?.canInitiateAssessments || false,
    
    // IS OS permissions
    canViewISOS: true, // All authenticated users
    canViewMetrics: user.flags?.isPillarLeader || user.flags?.isExecutive || user.flags?.isAdmin || false,
    
    // Specific role checks
    isAdmin: user.flags?.isAdmin || false,
    isExecutive: user.flags?.isExecutive || false,
    isPillarLeader: user.flags?.isPillarLeader || false,
    isSupervisor: user.flags?.isSupervisor || false,
  };

  return permissions;
}

/**
 * Check if user has a specific permission
 * @param {Object} user - User object from auth context
 * @param {string} permission - Permission key to check
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !permission) return false;
  
  const permissions = getUserPermissions(user);
  return permissions[permission] || false;
}

/**
 * Check if user can assess another user
 * Used for 1x1 and 360 assessments
 * @param {Object} assessor - User doing the assessment
 * @param {Object} subject - User being assessed
 * @returns {boolean}
 */
export function canAssessUser(assessor, subject) {
  if (!assessor || !subject) return false;
  
  // Admin can assess anyone
  if (assessor.flags?.isAdmin) return true;
  
  // Check if assessor is subject's manager
  if (subject.managerId === assessor.userId) return true;
  
  // ISE can assess ISL members
  if (assessor.flags?.isExecutive && assessor.directReportIds?.includes(subject.userId)) {
    return true;
  }
  
  // ISL can assess their direct reports
  if (assessor.flags?.isPillarLeader && assessor.directReportIds?.includes(subject.userId)) {
    return true;
  }
  
  // Supervisor can assess their direct reports
  if (assessor.flags?.isSupervisor && assessor.directReportIds?.includes(subject.userId)) {
    return true;
  }
  
  return false;
}

/**
 * Check if user can create a project
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canCreateProject(user) {
  return hasPermission(user, 'canCreateProjects');
}

/**
 * Check if user can be a project lead
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canBeProjectLead(user) {
  if (!user) return false;
  
  // ISL and ISE can be project leads
  return user.flags?.isPillarLeader || user.flags?.isExecutive || user.flags?.isAdmin;
}

/**
 * Get user's display role name
 * @param {Object} user - User object
 * @returns {string}
 */
export function getDisplayRole(user) {
  if (!user) return 'Unknown';
  
  if (user.flags?.isAdmin) return 'Admin';
  if (user.flags?.isExecutive) return 'ISE (Executive)';
  if (user.flags?.isPillarLeader) return 'ISL (Pillar Leader)';
  if (user.flags?.isSupervisor) return 'Supervisor';
  
  return 'IFL (Functional Lead)';
}