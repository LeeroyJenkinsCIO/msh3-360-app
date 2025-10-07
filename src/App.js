import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import AdHocAssessmentsPage from './pages/AdHocAssessmentsPage';
import AssessmentEntryPage from './pages/AssessmentEntryPage';
import AssessmentComparisonPage from './pages/AssessmentComparisonPage';
import AssessmentHistoryPage from './pages/AssessmentHistoryPage';
import ProjectsDashboardPage from './pages/ProjectsDashboardPage';
import AdminPage from './pages/AdminPage';
import './App.css';

function App() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('adhoc');
  const [sessionId, setSessionId] = useState(null);

  const handleLogin = (userId, userData) => {
    console.log('Login:', userId, userData);
    setCurrentUserId(userId);
    setCurrentUser(userData);
    setCurrentPage('adhoc');
    setSessionId(null);
  };

  const handleLogout = () => {
    console.log('Logout');
    setCurrentUserId(null);
    setCurrentUser(null);
    setCurrentPage('adhoc');
    setSessionId(null);
  };

  const handleNavigate = (page, data = null) => {
    console.log('Navigate to:', page, 'with data:', data);
    setCurrentPage(page);
    
    // Handle sessionId from data
    if (data && data.sessionId) {
      console.log('Setting sessionId:', data.sessionId);
      setSessionId(data.sessionId);
    } else if (page !== 'assess' && page !== 'assessment-entry' && page !== 'comparison') {
      // Clear sessionId when navigating away from assessment pages
      setSessionId(null);
    }
  };

  // Show login page if no user is logged in
  if (!currentUserId) {
    return (
      <div className="App">
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  // Log current state for debugging
  console.log('Current page:', currentPage, 'SessionData:', sessionId);

  // Show Ad Hoc Assessments page
  if (currentPage === 'adhoc') {
    return (
      <div className="App">
        <AdHocAssessmentsPage 
          currentUserId={currentUserId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Show Assessment Entry page (handles both 'assess' and 'assessment-entry')
  if ((currentPage === 'assess' || currentPage === 'assessment-entry') && sessionId) {
    return (
      <div className="App">
        <AssessmentEntryPage 
          sessionId={sessionId}
          currentUserId={currentUserId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Show Assessment Comparison page
  if (currentPage === 'comparison' && sessionId) {
    return (
      <div className="App">
        <AssessmentComparisonPage 
          sessionId={sessionId}
          currentUserId={currentUserId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Show Assessment History page
  if (currentPage === 'history') {
    return (
      <div className="App">
        <AssessmentHistoryPage 
          currentUserId={currentUserId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Show Projects Dashboard page
  if (currentPage === 'projects') {
    return (
      <div className="App">
        <ProjectsDashboardPage 
          currentUserId={currentUserId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Show Admin page
  if (currentPage === 'admin') {
    return (
      <div className="App">
        <AdminPage 
          currentUserId={currentUserId}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Default fallback to Ad Hoc Assessments
  return (
    <div className="App">
      <AdHocAssessmentsPage 
        currentUserId={currentUserId}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;