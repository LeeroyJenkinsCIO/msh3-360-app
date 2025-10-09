import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, hasRole } from '../utils/permissions';

/**
 * ProtectedRoute Component
 * Guards routes based on authentication and permissions
 * 
 * Usage Examples:
 * 
 * // Require authentication only
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * // Require specific permission
 * <ProtectedRoute requirePermission="canAccessAdminPanel">
 *   <AdminPage />
 * </ProtectedRoute>
 * 
 * // Require specific role
 * <ProtectedRoute requireRole="admin">
 *   <AdminPage />
 * </ProtectedRoute>
 * 
 * // Multiple roles allowed
 * <ProtectedRoute requireRole={['admin', 'ise']}>
 *   <CreateProject />
 * </ProtectedRoute>
 * 
 * // Custom permission check function
 * <ProtectedRoute 
 *   requirePermission={(permissions) => permissions.canCreateProjects}
 * >
 *   <CreateProject />
 * </ProtectedRoute>
 */

const ProtectedRoute = ({ 
  children, 
  requirePermission = null,
  requireRole = null,
  fallbackPath = '/login',
  showAccessDenied = true
}) => {
  const { user, permissions, isAuthenticated } = useAuth();
  const location = useLocation();

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const hasRequiredRole = roles.some(role => hasRole(user, role));
    
    if (!hasRequiredRole) {
      return showAccessDenied ? <AccessDenied /> : <Navigate to="/dashboard" replace />;
    }
  }

  // Check permission requirement
  if (requirePermission) {
    let hasRequiredPermission = false;

    // If permission is a function, call it with permissions object
    if (typeof requirePermission === 'function') {
      hasRequiredPermission = requirePermission(permissions);
    } 
    // If permission is a string, check directly
    else if (typeof requirePermission === 'string') {
      hasRequiredPermission = hasPermission(user, requirePermission);
    }

    if (!hasRequiredPermission) {
      return showAccessDenied ? <AccessDenied /> : <Navigate to="/dashboard" replace />;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
};

/**
 * AccessDenied Component
 * Displayed when user doesn't have required permissions
 */
const AccessDenied = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md border border-neutral-medium p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-8 h-8 text-status-error" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-neutral-dark mb-2">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-neutral mb-6">
            You do not have permission to access this page. If you believe this is an error, please contact your administrator.
          </p>

          {/* User Info */}
          <div className="bg-neutral-light rounded px-4 py-3 mb-6 text-sm">
            <div className="text-neutral-dark">
              <span className="font-medium">Logged in as:</span> {user?.name || user?.email}
            </div>
            <div className="text-neutral-medium mt-1">
              <span className="font-medium">Role:</span> {user?.role?.toUpperCase() || 'Unknown'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-4 py-2 border border-neutral-medium text-neutral-dark rounded hover:bg-neutral-light transition-colors"
            >
              Go Back
            </button>
            <a
              href="/dashboard"
              className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors text-center"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;