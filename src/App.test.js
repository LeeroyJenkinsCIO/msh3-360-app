// App.js - Complete with ALL role-based hub routing + Assessment Routes + HRP Review
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';

// Pages
import AdminPage from './pages/admin/AdminPage';
import UserManagement from './pages/admin/UserManagement';
import ProjectsDashboardPage from './pages/ProjectsDashboardPage';
import WikiPage from './pages/WikiPage';
import UnifiedAssessmentPage from './pages/UnifiedAssessmentPage';

// Import IS-OS Hub views
import ISOSHubISE from './pages/is-os/ISOSHubISE';
import ISOSHubISL from './pages/is-os/ISOSHubISL';
import ISOSHubHRP from './pages/is-os/ISOSHubHRP';
import ISOSHubISF from './pages/is-os/ISOSHubISF';
import ISOSHubISFSupervisor from './pages/is-os/ISOSHubISFSupervisor';
import AssessmentHistory from './pages/is-os/AssessmentHistory';
import OneOnOneAssessGrid from './pages/is-os/1x1AssessGrid';
import AssessmentDetailView from './pages/is-os/AssessmentDetailView';
import HRPAssessmentReview from './pages/is-os/HRPAssessmentReview'; // NEW

// Hub router - routes users to correct hub based on layer/role
function SimpleHubRouter() {
  const { user } = useAuth();
  
  // Admin users - redirect to admin panel
  if (user?.flags?.isAdmin || user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  // Supervisor users - show ISF Supervisor Hub (overrides layer)
  if (user?.flags?.isSupervisor) {
    return <ISOSHubISFSupervisor />;
  }
  
  // Route based on layer (case-insensitive)
  const userLayer = (user?.layer || user?.role || '').toLowerCase();
  
  // Also check flags for HRP
  if (user?.flags?.isHRP) {
    return <ISOSHubHRP />;
  }
  
  switch(userLayer) {
    case 'ise':
      return <ISOSHubISE />;
    
    case 'isl':
      return <ISOSHubISL />;
    
    case 'isf':
      return <ISOSHubISF />;
    
    case 'hrp':
      // In case layer is set to 'hrp' instead of using flags
      return <ISOSHubHRP />;
    
    default:
      // Fallback - show ISE Hub for unknown roles
      console.warn('Unknown user layer/role:', userLayer);
      return <ISOSHubISE />;
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public login page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes with MainLayout */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard - redirect to /is-os */}
            <Route index element={<Navigate to="/is-os" replace />} />
            
            {/* IS-OS Hub - Role-based routing */}
            <Route path="is-os" element={<SimpleHubRouter />} />
            
            {/* Wiki */}
            <Route path="wiki" element={<WikiPage />} />
            
            {/* Quick Align */}
            <Route path="quick-align" element={<UnifiedAssessmentPage />} />
            
            {/* Projects */}
            <Route path="projects" element={<ProjectsDashboardPage />} />
            
            {/* Assessment History */}
            <Route path="is-os/assessments/history" element={<AssessmentHistory />} />
            
            {/* 1x1 Assessment Routes - ID is now OPTIONAL */}
            <Route path="is-os/assessments/1x1/new" element={<OneOnOneAssessGrid />} />
            <Route path="is-os/assessments/1x1/edit/:id?" element={<OneOnOneAssessGrid />} />
            <Route path="is-os/assessments/view/:id" element={<AssessmentDetailView />} />
            
            {/* 360 Assessment Routes - ID is OPTIONAL (for future 360s) */}
            <Route path="is-os/assessments/360/edit/:id?" element={<OneOnOneAssessGrid />} />
            
            {/* HRP Assessment Review Route */}
            <Route path="is-os/assessments/hrp-review/:assessmentId" element={<HRPAssessmentReview />} />
            
            {/* Admin Panel (with tabs for Users and Database) */}
            <Route path="admin" element={
              <ProtectedRoute requireRole="admin">
                <AdminPage />
              </ProtectedRoute>
            } />
            
            {/* Legacy route redirect - in case old links exist */}
            <Route path="admin/users" element={<Navigate to="/admin" replace />} />
            
            {/* 404 - Must be LAST */}
            <Route path="*" element={
              <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
                  <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                  <button
                    onClick={() => window.location.href = '/is-os'}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;