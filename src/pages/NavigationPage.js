import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const NavigationPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('brandon_shelton'); // Demo switcher
  const [assessmentStatus, setAssessmentStatus] = useState(null);
  const [teamStatus, setTeamStatus] = useState(null);

  // Load user data from Firebase
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userRole));
        if (userDoc.exists()) {
          setCurrentUser({ id: userDoc.id, ...userDoc.data() });
          
          // Load latest assessment for this user
          const assessmentsRef = collection(db, 'assessments');
          const q = query(
            assessmentsRef, 
            where('userId', '==', userDoc.id),
            where('isFormal', '==', true)
          );
          const assessmentSnap = await getDocs(q);
          
          if (!assessmentSnap.empty) {
            const latest = assessmentSnap.docs[0].data();
            setAssessmentStatus(latest);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    loadUserData();
  }, [userRole]);

  // Build user title display
  const getUserTitle = () => {
    if (!currentUser) return '';
    
    if (currentUser.orgLayer === 'ise') {
      return currentUser.jobTitle;
    } else if (currentUser.orgLayer === 'isl') {
      return `Pillar Leader, ${currentUser.pillarLeadFor?.replace('_', ' & ').replace(/\b\w/g, l => l.toUpperCase())}`;
    } else if (currentUser.orgRole === 'supervisor') {
      return `Supervisor, ${currentUser.pillar?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${currentUser.subPillar?.toUpperCase()}`;
    } else {
      return `SME, ${currentUser.pillar?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${currentUser.subPillar?.replace(/\b\w/g, l => l.toUpperCase())}`;
    }
  };

  const showTeamAccess = currentUser?.orgRole === 'supervisor' || 
                         currentUser?.orgLayer === 'isl' || 
                         currentUser?.orgLayer === 'ise';

  if (!currentUser) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-xl font-bold text-gray-900">MSH³ 360</h1>
                <p className="text-xs text-gray-500">Coach, Grow, Align</p>
              </div>
              <div className="hidden md:flex space-x-4">
                <button className="px-3 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                  Navigation
                </button>
                <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                  Assessment
                </button>
                <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                  History
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{currentUser.displayName}</span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {currentUser.displayName.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {currentUser.displayName.split(' ')[0]}
          </h2>
          <p className="text-gray-600">{getUserTitle()}</p>
        </div>

        {/* Demo Switcher */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-2">🔄 Switch User (Testing Only):</p>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setUserRole('brandon_shelton')}
              className={`px-3 py-1 text-sm rounded ${userRole === 'brandon_shelton' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-800'}`}
            >
              Brandon (SME)
            </button>
            <button 
              onClick={() => setUserRole('ricky_martinez')}
              className={`px-3 py-1 text-sm rounded ${userRole === 'ricky_martinez' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-800'}`}
            >
              Ricky (Supervisor)
            </button>
            <button 
              onClick={() => setUserRole('jeremy_kolko')}
              className={`px-3 py-1 text-sm rounded ${userRole === 'jeremy_kolko' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-800'}`}
            >
              Jeremy (Pillar Leader)
            </button>
            <button 
              onClick={() => setUserRole('robert_paddock')}
              className={`px-3 py-1 text-sm rounded ${userRole === 'robert_paddock' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-800'}`}
            >
              Robert (CIO)
            </button>
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* MY CURRENT STATUS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 My Current Status</h3>
            
            {assessmentStatus ? (
              <>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Current Position</p>
                  <p className="text-xl font-bold text-blue-600">{assessmentStatus.nineBoxCategory}</p>
                  <div className="mt-2 text-sm text-gray-700">
                    Overall: C:{assessmentStatus.overallContribution?.toFixed(1)} / G:{assessmentStatus.overallGrowth?.toFixed(1)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Culture</span>
                    <span className="text-sm font-medium">
                      C:{assessmentStatus.culture?.contribution} / G:{assessmentStatus.culture?.growth}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Competencies</span>
                    <span className="text-sm font-medium">
                      C:{assessmentStatus.competencies?.contribution} / G:{assessmentStatus.competencies?.growth}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Execution</span>
                    <span className="text-sm font-medium">
                      C:{assessmentStatus.execution?.contribution} / G:{assessmentStatus.execution?.growth}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">No assessments yet</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Take First Assessment
                </button>
              </div>
            )}
          </div>

          {/* CURRENT MONTH ASSESSMENT */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Current Month Assessment</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Assessment Period</p>
              <p className="text-xl font-bold text-gray-900">October 2025</p>
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                Baseline Month
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Self-Assessment</span>
                <span className="text-sm font-medium text-yellow-600">⏳ Pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Manager Rating</span>
                <span className="text-sm font-medium text-yellow-600">⏳ Pending</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Due Date: Oct 15</span>
              </div>
            </div>

            <button className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Take Assessment
            </button>
          </div>

          {/* TEAM/ORG ACCESS - Conditional */}
          {showTeamAccess && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                👥 {currentUser.orgLayer === 'ise' ? 'IS Organization' : 
                    currentUser.orgRole === 'supervisor' ? `${currentUser.subPillar?.toUpperCase()} Team` :
                    currentUser.orgLayer === 'isl' ? `${currentUser.pillarLeadFor?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Team` : 'Team'}
              </h3>

              <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">October 2025 Progress</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-purple-600">0/
                    {currentUser.orgLayer === 'ise' ? '25' : 
                     currentUser.orgRole === 'supervisor' ? '2' :
                     currentUser.orgLayer === 'isl' ? '7' : '0'}
                  </p>
                  <p className="text-sm text-gray-600">(0% complete)</p>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              <button className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                View Dashboard
              </button>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Quick Actions</h3>

            <div className="space-y-3">
              <button className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-left text-sm font-medium">
                Take New Assessment →
              </button>
              
              {(currentUser.orgRole === 'supervisor' || currentUser.orgLayer === 'isl') && (
                <button className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-left text-sm font-medium">
                  Rate Team Members →
                </button>
              )}
              
              <button className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-left text-sm font-medium">
                View Assessment History →
              </button>
              
              <button className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-left text-sm font-medium">
                Download My Report →
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NavigationPage;