import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import AssessmentGrid from '../components/AssessmentGrid';
import { Zap, Users, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const AdHocAssessmentsPage = ({ currentUserId, currentUser, onNavigate, onLogout }) => {
  const [showQuickAlignment, setShowQuickAlignment] = useState(false);
  const [show360View, setShow360View] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [alignmentPurpose, setAlignmentPurpose] = useState('');
  
  const [trackPurpose, setTrackPurpose] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  
  const [quickScores, setQuickScores] = useState({
    culture: { contribution: 1, growth: 1 },
    competencies: { contribution: 1, growth: 1 },
    execution: { contribution: 1, growth: 1 }
  });

  useEffect(() => {
    if (show360View) {
      loadData();
    }
  }, [show360View, currentUserId]);

  useEffect(() => {
    if (showCreateModal) {
      loadProjects();
    }
  }, [showCreateModal]);

  const loadData = async () => {
    await Promise.all([loadSessions(), loadUsers()]);
  };

  const loadProjects = async () => {
    try {
      const projectsSnapshot = await getDocs(
        query(
          collection(db, 'assessmentProjects'),
          where('status', '==', 'active')
        )
      );
      const projectsData = [];
      projectsSnapshot.forEach(doc => {
        projectsData.push({ id: doc.id, ...doc.data() });
      });
      projectsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const sessionsRef = collection(db, 'assessmentSessions');
      const q1 = query(
        sessionsRef,
        where('participantA', '==', currentUserId)
      );
      const q2 = query(
        sessionsRef,
        where('participantB', '==', currentUserId)
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const sessionsData = [];
      snapshot1.forEach(doc => sessionsData.push({ id: doc.id, ...doc.data() }));
      snapshot2.forEach(doc => sessionsData.push({ id: doc.id, ...doc.data() }));

      sessionsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      for (let session of sessionsData) {
        const otherUserId = session.participantA === currentUserId 
          ? session.participantB 
          : session.participantA;
        
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('__name__', '==', otherUserId)
        ));
        
        if (!userDoc.empty) {
          session.otherParticipant = { id: otherUserId, ...userDoc.docs[0].data() };
        }

        if (session.status === 'pending' || session.status === 'both_submitted') {
          const assessmentsQuery = query(
            collection(db, 'assessments'),
            where('sessionId', '==', session.id)
          );
          const assessmentsSnap = await getDocs(assessmentsQuery);
          
          session.currentUserSubmitted = false;
          session.otherUserSubmitted = false;
          
          assessmentsSnap.forEach(doc => {
            const data = doc.data();
            if (data.assessorId === currentUserId) {
              session.currentUserSubmitted = true;
            }
            if (data.assessorId === otherUserId) {
              session.otherUserSubmitted = true;
            }
          });
        }
      }

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = [];
      usersSnapshot.forEach(doc => {
        if (doc.id !== currentUserId) {
          users.push({ id: doc.id, ...doc.data() });
        }
      });
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleQuickSliderChange = (domain, type, value) => {
    setQuickScores(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [type]: parseInt(value)
      }
    }));
  };

  const handleQuickClose = () => {
    setShowQuickAlignment(false);
    setAlignmentPurpose('');
    setQuickScores({
      culture: { contribution: 1, growth: 1 },
      competencies: { contribution: 1, growth: 1 },
      execution: { contribution: 1, growth: 1 }
    });
  };

  const handleCreateSession = async () => {
    if (!selectedUser) {
      alert('Please select a participant');
      return;
    }

    if (trackPurpose && !selectedProject) {
      alert('Please select a project to track this assessment');
      return;
    }

    try {
      let mshType = null;
      let mshDescription = null;
      let mshId = null;

      if (trackPurpose && selectedProject) {
        const projectDoc = await getDoc(doc(db, 'assessmentProjects', selectedProject));
        if (projectDoc.exists()) {
          mshType = 'Project';
          mshDescription = projectDoc.data().name;
          mshId = selectedProject;
        }
      }

      const sessionData = {
        participantA: currentUserId,
        participantB: selectedUser,
        createdAt: new Date().toISOString(),
        status: 'pending',
        sessionType: 'adhoc',
        trackPurpose: trackPurpose,
        mshType: mshType,
        mshDescription: mshDescription,
        mshId: mshId
      };

      const docRef = await addDoc(collection(db, 'assessmentSessions'), sessionData);
      
      setShowCreateModal(false);
      setSelectedUser('');
      setTrackPurpose(false);
      setSelectedProject('');
      
      onNavigate('assessment-entry', { sessionId: docRef.id });
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session. Please try again.');
    }
  };

  const getSessionStatus = (session) => {
    if (session.status === 'published') {
      if (session.alignmentStatus === 'with-discrepancies') {
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
          text: 'Published with Discrepancies',
          color: 'text-yellow-600'
        };
      }
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: 'Published',
        color: 'text-green-600'
      };
    }
    if (session.status === 'both_submitted') {
      return {
        icon: <CheckCircle className="w-5 h-5 text-blue-500" />,
        text: 'Ready to Compare',
        color: 'text-blue-600'
      };
    }
    
    if (session.status === 'pending') {
      const isCreator = session.participantA === currentUserId;
      const otherName = session.otherParticipant?.displayName || 'other participant';
      
      return {
        icon: <Clock className="w-5 h-5 text-orange-500" />,
        text: `Waiting for ${isCreator ? otherName : 'you'}`,
        color: 'text-orange-600'
      };
    }
    
    return {
      icon: <Clock className="w-5 h-5 text-orange-500" />,
      text: 'In Progress',
      color: 'text-orange-600'
    };
  };

  const handleSessionClick = (session) => {
    console.log('=== SESSION CLICK DEBUG ===');
    console.log('Full session object:', session);
    console.log('Session ID:', session.id);
    console.log('Session status:', session.status);
    console.log('Session.id type:', typeof session.id);
    console.log('Session.id is defined?', session.id !== undefined);
    
    if (session.status === 'both_submitted' || session.status === 'published') {
      console.log('Navigating to COMPARISON with sessionId:', session.id);
      console.log('Calling onNavigate with:', { sessionId: session.id });
      onNavigate('comparison', { sessionId: session.id });
    } else {
      console.log('Navigating to ASSESSMENT-ENTRY with sessionId:', session.id);
      onNavigate('assessment-entry', { sessionId: session.id });
    }
  };

  if (!showQuickAlignment && !show360View) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header currentUser={currentUser} activePage="adhoc" onNavigate={onNavigate} onLogout={onLogout} />
        
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ad Hoc Alignments</h2>
            <p className="text-gray-600">Quick check-ins and 360 assessment sessions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg border-t-4 border-green-500 p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => setShowQuickAlignment(true)}>
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Alignment</h3>
                  <p className="text-sm text-gray-600">Single self-assessment for personal reflection</p>
                </div>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">•</span>
                  5 minute assessment
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">•</span>
                  Self-reflection only
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">•</span>
                  Not saved to history
                </li>
              </ul>
              
              <button className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
                Start Quick Alignment
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg border-t-4 border-purple-500 p-6 hover:shadow-xl transition-shadow cursor-pointer"
                 onClick={() => setShow360View(true)}>
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Ad Hoc 360°</h3>
                  <p className="text-sm text-gray-600">One-on-one assessment sessions</p>
                </div>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <span className="text-purple-500 mr-2">•</span>
                  Two-way assessments
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <span className="text-purple-500 mr-2">•</span>
                  Compare perspectives
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <span className="text-purple-500 mr-2">•</span>
                  Saved to history
                </li>
              </ul>
              
              <button className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                Manage 360 Sessions
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showQuickAlignment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header currentUser={currentUser} activePage="adhoc" onNavigate={onNavigate} onLogout={onLogout} />
        
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="mb-6">
            <button
              onClick={handleQuickClose}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              ← Back to Ad Hoc Alignments
            </button>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
            <div className="flex items-center">
              <Zap className="w-6 h-6 text-green-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Quick Alignment</h3>
                <p className="text-sm text-green-700">Personal reflection - not saved to database</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              What are we aligning to?
            </label>
            <input
              type="text"
              value={alignmentPurpose}
              onChange={(e) => setAlignmentPurpose(e.target.value)}
              placeholder="e.g., Q4 Goals, Project Launch, Team Collaboration..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <AssessmentGrid
            scores={quickScores}
            onSliderChange={handleQuickSliderChange}
            titlePrefix="My"
          />

          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Note:</strong> This quick alignment is for personal reflection only and will not be saved to your history.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (show360View) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header currentUser={currentUser} activePage="adhoc" onNavigate={onNavigate} onLogout={onLogout} />
        
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setShow360View(false)}
                  className="px-4 py-2 mb-4 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  ← Back to Ad Hoc Alignments
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ad Hoc 360° Sessions</h2>
                <p className="text-gray-600">Create and manage one-on-one assessment sessions</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>New Session</span>
              </button>
            </div>
          </div>

          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create New 360° Session</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Participant
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Choose a team member...</option>
                      {allUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trackPurpose}
                        onChange={(e) => {
                          setTrackPurpose(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedProject('');
                          }
                        }}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Track purpose for this assessment
                      </span>
                    </label>
                  </div>

                  {trackPurpose && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Select Project *
                      </label>
                      <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                      >
                        <option value="">Choose a project...</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      {projects.length === 0 && (
                        <p className="text-xs text-purple-600 mt-2">
                          No active projects. Create one in Admin → Projects.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleCreateSession}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Session
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedUser('');
                      setTrackPurpose(false);
                      setSelectedProject('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No 360° Sessions Yet</h3>
              <p className="text-gray-600 mb-6">Create your first ad hoc 360° assessment session</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Session</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => {
                const status = getSessionStatus(session);
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Session with {session.otherParticipant?.displayName || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Created {new Date(session.createdAt).toLocaleDateString()} at{' '}
                            {new Date(session.createdAt).toLocaleTimeString()}
                          </p>
                          {session.mshDescription && (
                            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-md p-2">
                              <div className="flex items-center text-xs font-semibold text-purple-700 mb-1">
                                <span className="px-2 py-0.5 bg-purple-200 rounded text-purple-800 mr-2">
                                  {session.mshType}
                                </span>
                                <span>{session.mshDescription}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {status.icon}
                        <span className={`text-sm font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default AdHocAssessmentsPage;