/**
 * MSH³ 360 Assessment - Permission System
 * 
 * User Roles & Permissions:
 * - Admin: Full access to everything
 * - ISE (Individual Senior Executive): View all pillars, request any assessment, create projects
 * - ISL (Individual Senior Leader): Own pillar + aggregates, request about direct reports + peers, create projects
 * - ISF (Individual Senior Fellow): Own data only, cannot request assessments
 * - Project Lead: Can publish project assessments (any layer)
 */

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  ISE: 'ise',
  ISL: 'isl',
  ISF: 'isf',
  PROJECT_LEAD: 'projectlead'
};

// Permission definitions
export const PERMISSIONS = {
  // Admin Panel
  ACCESS_ADMIN_PANEL: 'canAccessAdminPanel',
  MANAGE_USERS: 'canManageUsers',
  MANAGE_SYSTEM: 'canManageSystem',
  
  // Data Access
  VIEW_ALL_PILLARS: 'canViewAllPillars',
  VIEW_OWN_PILLAR: 'canViewOwnPillar',
  VIEW_AGGREGATES: 'canViewAggregates',
  VIEW_OWN_DATA_ONLY: 'canViewOwnDataOnly',
  
  // Assessment Actions
  REQUEST_ANY_ASSESSMENT: 'canRequestAnyAssessment',
  REQUEST_DIRECT_REPORT_ASSESSMENT: 'canRequestDirectReportAssessment',
  REQUEST_PEER_ASSESSMENT: 'canRequestPeerAssessment',
  
  // Project Actions
  CREATE_PROJECTS: 'canCreateProjects',
  PUBLISH_PROJECT_ASSESSMENTS: 'canPublishProjectAssessments',
  VIEW_PROJECT_ASSESSMENTS: 'canViewProjectAssessments',
  
  // General
  SUBMIT_SELF_ASSESSMENT: 'canSubmitSelfAssessment',
  VIEW_REPORTS: 'canViewReports'
};

/**
 * Get permissions for a user based on their role
 * @param {Object} user - User object with role property
 * @returns {Object} - Object with permission flags
 */
export function getUserPermissions(user) {
  if (!user || !user.role) {
    return {};
  }

  const role = user.role.toLowerCase();

  // Admin: Full access
  if (role === ROLES.ADMIN) {
    return {
      [PERMISSIONS.ACCESS_ADMIN_PANEL]: true,
      [PERMISSIONS.MANAGE_USERS]: true,
      [PERMISSIONS.MANAGE_SYSTEM]: true,
      [PERMISSIONS.VIEW_ALL_PILLARS]: true,
      [PERMISSIONS.VIEW_OWN_PILLAR]: true,
      [PERMISSIONS.VIEW_AGGREGATES]: true,
      [PERMISSIONS.VIEW_OWN_DATA_ONLY]: false,
      [PERMISSIONS.REQUEST_ANY_ASSESSMENT]: true,
      [PERMISSIONS.REQUEST_DIRECT_REPORT_ASSESSMENT]: true,
      [PERMISSIONS.REQUEST_PEER_ASSESSMENT]: true,
      [PERMISSIONS.CREATE_PROJECTS]: true,
      [PERMISSIONS.PUBLISH_PROJECT_ASSESSMENTS]: true,
      [PERMISSIONS.VIEW_PROJECT_ASSESSMENTS]: true,
      [PERMISSIONS.SUBMIT_SELF_ASSESSMENT]: true,
      [PERMISSIONS.VIEW_REPORTS]: true
    };
  }

  // ISE: View all pillars, request any assessment, create projects
  if (role === ROLES.ISE) {
    return {
      [PERMISSIONS.ACCESS_ADMIN_PANEL]: false,
      [PERMISSIONS.MANAGE_USERS]: false,
      [PERMISSIONS.MANAGE_SYSTEM]: false,
      [PERMISSIONS.VIEW_ALL_PILLARS]: true,
      [PERMISSIONS.VIEW_OWN_PILLAR]: true,
      [PERMISSIONS.VIEW_AGGREGATES]: true,
      [PERMISSIONS.VIEW_OWN_DATA_ONLY]: false,
      [PERMISSIONS.REQUEST_ANY_ASSESSMENT]: true,
      [PERMISSIONS.REQUEST_DIRECT_REPORT_ASSESSMENT]: true,
      [PERMISSIONS.REQUEST_PEER_ASSESSMENT]: true,
      [PERMISSIONS.CREATE_PROJECTS]: true,
      [PERMISSIONS.PUBLISH_PROJECT_ASSESSMENTS]: false,
      [PERMISSIONS.VIEW_PROJECT_ASSESSMENTS]: true,
      [PERMISSIONS.SUBMIT_SELF_ASSESSMENT]: true,
      [PERMISSIONS.VIEW_REPORTS]: true
    };
  }

  // ISL: Own pillar + aggregates, request about direct reports + peers, create projects
  // ISL can also publish project assessments (acts as project lead for their team)
  if (role === ROLES.ISL) {
    return {
      [PERMISSIONS.ACCESS_ADMIN_PANEL]: false,
      [PERMISSIONS.MANAGE_USERS]: false,
      [PERMISSIONS.MANAGE_SYSTEM]: false,
      [PERMISSIONS.VIEW_ALL_PILLARS]: false,
      [PERMISSIONS.VIEW_OWN_PILLAR]: true,
      [PERMISSIONS.VIEW_AGGREGATES]: true,
      [PERMISSIONS.VIEW_OWN_DATA_ONLY]: false,
      [PERMISSIONS.REQUEST_ANY_ASSESSMENT]: false,
      [PERMISSIONS.REQUEST_DIRECT_REPORT_ASSESSMENT]: true,
      [PERMISSIONS.REQUEST_PEER_ASSESSMENT]: true,
      [PERMISSIONS.CREATE_PROJECTS]: true,
      [PERMISSIONS.PUBLISH_PROJECT_ASSESSMENTS]: true, // ✅ Added project lead capability
      [PERMISSIONS.VIEW_PROJECT_ASSESSMENTS]: true,
      [PERMISSIONS.SUBMIT_SELF_ASSESSMENT]: true,
      [PERMISSIONS.VIEW_REPORTS]: true
    };
  }

  // ISF: Own data only, cannot request assessments, can view assigned projects
  if (role === ROLES.ISF) {
    return {
      [PERMISSIONS.ACCESS_ADMIN_PANEL]: false,
      [PERMISSIONS.MANAGE_USERS]: false,
      [PERMISSIONS.MANAGE_SYSTEM]: false,
      [PERMISSIONS.VIEW_ALL_PILLARS]: false,
      [PERMISSIONS.VIEW_OWN_PILLAR]: false,
      [PERMISSIONS.VIEW_AGGREGATES]: false,
      [PERMISSIONS.VIEW_OWN_DATA_ONLY]: true,
      [PERMISSIONS.REQUEST_ANY_ASSESSMENT]: false,
      [PERMISSIONS.REQUEST_DIRECT_REPORT_ASSESSMENT]: false,
      [PERMISSIONS.REQUEST_PEER_ASSESSMENT]: false,
      [PERMISSIONS.CREATE_PROJECTS]: false,
      [PERMISSIONS.PUBLISH_PROJECT_ASSESSMENTS]: false,
      [PERMISSIONS.VIEW_PROJECT_ASSESSMENTS]: true, // ✅ Can view assigned projects
      [PERMISSIONS.SUBMIT_SELF_ASSESSMENT]: true,
      [PERMISSIONS.VIEW_REPORTS]: false
    };
  }

  // Project Lead: Can publish project assessments (any layer)
  if (role === ROLES.PROJECT_LEAD) {
    return {
      [PERMISSIONS.ACCESS_ADMIN_PANEL]: false,
      [PERMISSIONS.MANAGE_USERS]: false,
      [PERMISSIONS.MANAGE_SYSTEM]: false,
      [PERMISSIONS.VIEW_ALL_PILLARS]: false,
      [PERMISSIONS.VIEW_OWN_PILLAR]: true,
      [PERMISSIONS.VIEW_AGGREGATES]: false,
      [PERMISSIONS.VIEW_OWN_DATA_ONLY]: false,
      [PERMISSIONS.REQUEST_ANY_ASSESSMENT]: false,
      [PERMISSIONS.REQUEST_DIRECT_REPORT_ASSESSMENT]: false,
      [PERMISSIONS.REQUEST_PEER_ASSESSMENT]: false,
      [PERMISSIONS.CREATE_PROJECTS]: false,
      [PERMISSIONS.PUBLISH_PROJECT_ASSESSMENTS]: true,
      [PERMISSIONS.VIEW_PROJECT_ASSESSMENTS]: true,
      [PERMISSIONS.SUBMIT_SELF_ASSESSMENT]: true,
      [PERMISSIONS.VIEW_REPORTS]: false
    };
  }

  // Default: No permissions
  return {};
}

/**
 * Check if user has a specific permission
 * @param {Object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  const permissions = getUserPermissions(user);
  return permissions[permission] === true;
}

/**
 * Check if user has a specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export function hasRole(user, role) {
  if (!user || !user.role) return false;
  return user.role.toLowerCase() === role.toLowerCase();
}

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean}
 */
export function hasAnyRole(user, roles) {
  if (!user || !user.role) return false;
  return roles.some(role => hasRole(user, role));
}

/**
 * Check if user can view a specific user's data
 * @param {Object} currentUser - Current logged in user
 * @param {string} targetUserId - ID of user whose data is being accessed
 * @returns {boolean}
 */
export function canViewUserData(currentUser, targetUserId) {
  if (!currentUser || !targetUserId) return false;
  
  // User can always view their own data
  if (currentUser.uid === targetUserId) return true;
  
  const permissions = getUserPermissions(currentUser);
  
  // Admin and ISE can view all data
  if (permissions[PERMISSIONS.VIEW_ALL_PILLARS]) return true;
  
  // ISL can view direct reports and peers (would need org chart data)
  // For now, ISL can view users in their pillar
  if (permissions[PERMISSIONS.VIEW_OWN_PILLAR]) {
    // This would check if targetUser is in same pillar or is direct report
    // Implementation depends on your org structure data
    return true; // Placeholder
  }
  
  // ISF can only view own data
  return false;
}

/**
 * Get user's accessible navigation items based on permissions
 * @param {Object} user - User object
 * @returns {Array} - Array of navigation items
 */
export function getAccessibleNavItems(user) {
  const permissions = getUserPermissions(user);
  const navItems = [];

  // Dashboard - available to all authenticated users
  navItems.push({
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard'
  });

  // My Assessments - available to all
  navItems.push({
    id: 'assessments',
    label: 'My Assessments',
    path: '/assessments',
    icon: 'assessment'
  });

  // Request Assessment - based on permissions
  if (permissions[PERMISSIONS.REQUEST_ANY_ASSESSMENT] || 
      permissions[PERMISSIONS.REQUEST_DIRECT_REPORT_ASSESSMENT] ||
      permissions[PERMISSIONS.REQUEST_PEER_ASSESSMENT]) {
    navItems.push({
      id: 'request',
      label: 'Request Assessment',
      path: '/request',
      icon: 'add'
    });
  }

  // Projects - if can create or view
  if (permissions[PERMISSIONS.CREATE_PROJECTS] || 
      permissions[PERMISSIONS.PUBLISH_PROJECT_ASSESSMENTS] ||
      permissions[PERMISSIONS.VIEW_PROJECT_ASSESSMENTS]) {
    navItems.push({
      id: 'projects',
      label: 'Projects',
      path: '/projects',
      icon: 'folder'
    });
  }

  // Reports - if has access
  if (permissions[PERMISSIONS.VIEW_REPORTS]) {
    navItems.push({
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      icon: 'chart'
    });
  }

  // Admin Panel - admin only
  if (permissions[PERMISSIONS.ACCESS_ADMIN_PANEL]) {
    navItems.push({
      id: 'admin',
      label: 'Admin',
      path: '/admin',
      icon: 'settings'
    });
  }

  return navItems;
}

export default {
  ROLES,
  PERMISSIONS,
  getUserPermissions,
  hasPermission,
  hasRole,
  hasAnyRole,
  canViewUserData,
  getAccessibleNavItems
};