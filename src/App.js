// 📁 SAVE TO: src/App.js
// App.js - Complete with MSH Detail Route and Fixed 360 Comparison Import

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UnderConstruction from './components/UnderConstruction';

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
import MSHDetailView from './pages/is-os/MSHDetailView';
import HRPAssessmentReview from './pages/is-os/HRPAssessmentReview';
import SelfAssessmentPage from './pages/is-os/SelfAssessmentPage';
import PairAssessment360 from './pages/is-os/360PairAssessment';
import ThreeSixtyComparisonView from './pages/is-os/ThreeSixtyComparisonView';

// Import ISOS Org Page
import ISOSOrgPage from './pages/isos-org/ISOSOrgPage';

// Hub router - routes users to correct hub based on layer/role
function SimpleHubRouter() {
  const { user } = useAuth();
  
  // 🔒 SECURITY: Removed admin auto-redirect
  // Admins now go to their assigned hub like everyone else
  // They can manually navigate to /admin if needed
  
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
    
    case 'admin':
      // 🔒 SECURITY: Admins get ISE hub by default
      // They must manually navigate to /admin
      return <ISOSHubISE />;
    
    default:
      // Fallback - show ISE Hub for unknown roles
      console.warn('Unknown user layer/role:', userLayer);
      return <ISOSHubISE />;
  }
}

function App() {
  // 🚧 CONSTRUCTION PAGE CHECK - Must be at the very top
  if (process.env.REACT_APP_UNDER_CONSTRUCTION === 'true') {
    return <UnderConstruction />;
  }

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
            
            {/* ISOS Org */}
            <Route path="isos-org" element={
              <ProtectedRoute>
                <ISOSOrgPage />
              </ProtectedRoute>
            } />
            
            {/* Projects */}
            <Route path="projects" element={<ProjectsDashboardPage />} />
            
            {/* Assessment History */}
            <Route path="is-os/assessments/history" element={<AssessmentHistory />} />
            
            {/* Self-Assessment Route */}
            <Route path="is-os/self-assessment/:id" element={<SelfAssessmentPage />} />
            
            {/* 360 Pair Assessment Route (MR/DR/P2P bilateral assessments) */}
            <Route path="is-os/360-pair-assessment/:id" element={<PairAssessment360 />} />
            
            {/* 1x1 Assessment Routes - ID is now OPTIONAL */}
            <Route path="is-os/assessments/1x1/new" element={<OneOnOneAssessGrid />} />
            <Route path="is-os/assessments/1x1/edit/:id?" element={<OneOnOneAssessGrid />} />
            <Route path="is-os/assessments/view/:id" element={<AssessmentDetailView />} />
            
            {/* 360 Assessment Routes - ID is OPTIONAL (for future 360s) */}
            <Route path="is-os/assessments/360/edit/:id?" element={<OneOnOneAssessGrid />} />
            
            {/* 360° Comparison View Route */}
            <Route path="is-os/360-comparative/:pairId" element={<ThreeSixtyComparisonView />} />
            
            {/* ✅ MSH Detail View Route */}
            <Route path="is-os/msh/:id" element={<MSHDetailView />} />
            
            {/* HRP Assessment Review Route */}
            <Route path="is-os/hrp-assessment-review/:assessmentId" element={<HRPAssessmentReview />} />
            
            {/* 🔒 SECURITY: Admin Panel - Strict role check */}
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