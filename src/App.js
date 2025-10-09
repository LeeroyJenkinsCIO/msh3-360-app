import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UnderConstruction from './components/UnderConstruction';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UnifiedAssessmentPage from './pages/UnifiedAssessmentPage';
import AssessmentHistoryPage from './pages/AssessmentHistoryPage';
import ProjectsDashboardPage from './pages/ProjectsDashboardPage';
import ISOSHub from './pages/is-os/ISOSHub';
import OneOnOneNew from './pages/is-os/OneOnOneNew';
import AssessmentHistory from './pages/is-os/AssessmentHistory';
import AdminPage from './pages/AdminPage';

// Layout
import MainLayout from './components/MainLayout';

function App() {
  // Check environment variable - defaults to false for local development
  // Set REACT_APP_UNDER_CONSTRUCTION=true in Vercel to show maintenance page
  const showUnderConstruction = process.env.REACT_APP_UNDER_CONSTRUCTION === 'true';
  
  // Show under construction page if environment variable is set
  if (showUnderConstruction) {
    return <UnderConstruction />;
  }

  // Normal application below
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes - All wrapped in MainLayout */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Available to all authenticated users */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Assessment - Available to all authenticated users */}
            <Route path="/assessment" element={<UnifiedAssessmentPage />} />

            {/* Assessment History - Available to all authenticated users */}
            <Route path="/assessment-history" element={<AssessmentHistoryPage />} />

            {/* Projects - Available to users who can view or create projects */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute requirePermission="canViewProjectAssessments">
                  <ProjectsDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* IS-OS Hub - Available to all authenticated users */}
            <Route path="/is-os" element={<ISOSHub />} />
            
            {/* IS-OS Sub-routes */}
            <Route path="/is-os/assessments/1x1/new" element={<OneOnOneNew />} />
            <Route path="/is-os/assessments/history" element={<AssessmentHistory />} />

            {/* Admin - Admin only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requirePermission="canAccessAdminPanel">
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;