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
    setCurrentUserId(userId);
    setCurrentUser(userData);
    setCurrentPage('adhoc');
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setCurrentUser(null);
    setCurrentPage('adhoc');
    setSessionId(null);
  };

  const handleNavigate = (page, data = null) => {
    setCurrentPage(page);
    if (data && data.sessionId) {
      setSessionId(data.sessionId);
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

  // Show Assessment Entry page
  if (currentPage === 'assess' && sessionId) {
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