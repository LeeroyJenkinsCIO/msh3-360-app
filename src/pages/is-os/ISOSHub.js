// 📁 src/pages/is-os/ISOSHub.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Shield, Users, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ✅ IMPORT ALL REAL HUB COMPONENTS
import ISOSHubISE from './ISOSHubISE';
import ISOSHubISL from './ISOSHubISL';
import ISOSHubISF from './ISOSHubISF';
import ISOSHubISFSupervisor from './ISOSHubISFSupervisor';
import ISOSHubHRP from './ISOSHubHRP';

// ❌ DELETE THE PLACEHOLDER COMPONENTS (lines 13-55 in your current file)
// Remove these:
// const ISOSHubISL = () => (...);
// const ISOSHubISF = () => (...);

/**
 * IS OS Hub Router
 * 
 * Dynamically routes users to the appropriate hub view based on their role:
 * - Admin → Redirect to /admin panel
 * - HRP → HRP view
 * - ISE → Executive view (all ISL reports)
 * - ISL → Pillar leader view (pillar team)
 * - Supervisor → Supervisor view (ISF with direct reports)
 * - ISF → Individual contributor view (personal data only)
 */
function ISOSHub() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect admins to admin panel
  useEffect(() => {
    if (!loading && user?.flags?.isAdmin) {
      console.log('🔐 Admin detected - redirecting to /admin');
      navigate('/admin', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IS OS Hub...</p>
        </div>
      </div>
    );
  }

  // Handle missing user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Authentication Required</h2>
          </div>
          <p className="text-gray-600 mb-4">
            You must be logged in to access the IS OS Hub.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // ROUTING LOGIC (PRIORITY ORDER)
  // ========================================

  console.log('🔍 IS OS Hub - Routing user:', {
    uid: user.uid,
    displayName: user.displayName,
    layer: user.layer,
    role: user.role,
    flags: user.flags
  });

  // 1. ADMIN → Already redirected in useEffect above
  if (user.flags?.isAdmin) {
    return null; // Will redirect via useEffect
  }

  // 2. HRP → HRP View
  if (user.role?.toLowerCase() === 'hrp' || user.flags?.isHRP || user.layer?.toLowerCase() === 'hrp') {
    console.log('✅ Routing to ISOSHubHRP (HRP View)');
    return <ISOSHubHRP />;
  }

  // 3. ISE → Executive View
  if (user.layer === 'ISE') {
    console.log('✅ Routing to ISOSHubISE (Executive View)');
    return <ISOSHubISE />;
  }

  // 4. ISL → Pillar Leader View
  if (user.layer === 'ISL' || user.flags?.isPillarLeader) {
    console.log('✅ Routing to ISOSHubISL (Pillar Leader View)');
    return <ISOSHubISL />;
  }

  // 5. SUPERVISOR → Supervisor View (ISF with direct reports)
  if (user.flags?.isSupervisor) {
    console.log('✅ Routing to ISOSHubISFSupervisor (Supervisor View)');
    return <ISOSHubISFSupervisor />;
  }

  // 6. ISF → Individual Contributor View
  if (user.layer === 'ISF') {
    console.log('✅ Routing to ISOSHubISF (Individual Contributor View)');
    return <ISOSHubISF />;
  }

  // ========================================
  // UNKNOWN ROLE - ERROR STATE
  // ========================================

  console.error('❌ Unknown role/layer:', {
    layer: user.layer,
    role: user.role,
    flags: user.flags
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl">
        {/* Error Header */}
        <div className="flex items-center gap-3 text-orange-600 mb-6">
          <AlertCircle className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold">Unable to Determine Hub View</h2>
            <p className="text-sm text-gray-600">IS OS Hub Access Issue</p>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Your Current Role Information:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">User:</span> {user.displayName || 'Unknown'}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">Layer:</span> {user.layer || 'Not Set'}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">Role:</span> {user.role || 'Not Set'}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-gray-700">
          <p>
            The IS OS Hub could not determine which dashboard view to show based on your current role settings.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What to do:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900">
              <li>Contact your system administrator</li>
              <li>Reference this error and provide your user information above</li>
              <li>They will need to set your <code className="bg-blue-100 px-1 rounded">layer</code> field correctly</li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Expected Role Values:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><code className="bg-gray-200 px-1 rounded">role: "hrp"</code> → HRP Dashboard</li>
              <li><code className="bg-gray-200 px-1 rounded">layer: "ISE"</code> → Executive Dashboard</li>
              <li><code className="bg-gray-200 px-1 rounded">layer: "ISL"</code> → Pillar Leader Dashboard</li>
              <li><code className="bg-gray-200 px-1 rounded">layer: "ISF"</code> + <code className="bg-gray-200 px-1 rounded">flags.isSupervisor: true</code> → Supervisor Dashboard</li>
              <li><code className="bg-gray-200 px-1 rounded">layer: "ISF"</code> → Individual Dashboard</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>

        {/* Support Contact */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Need help? Contact <a href="mailto:admin@sierranevada.com" className="text-blue-600 hover:underline">admin@sierranevada.com</a>
        </div>
      </div>
    </div>
  );
}

export default ISOSHub;