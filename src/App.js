// App.js - Complete with Construction Page Check + ALL role-based hub routing
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
import HRPAssessmentReview from './pages/is-os/HRPAssessmentReview';

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
  // CONSTRUCTION PAGE CHECK - Must be at the very top
  if (process.env.REACT_APP_UNDER_CONSTRUCTION === 'true') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          <div className="mb-8">
            <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
              <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Under Construction
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              MSH³ 360 Assessment Platform
            </p>
            <p className="text-gray-500">
              We're working hard to bring you something amazing.
            </p>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              Check back soon or contact your administrator for access.
            </p>
          </div>
        </div>
      </div>
    );
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