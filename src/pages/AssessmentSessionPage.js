import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import { Users, Calendar, Plus, ArrowRight } from 'lucide-react';

const AssessmentSessionPage = ({ currentUserId, currentUser, onNavigate, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const loadData = async () => {
    await Promise.all([
      loadSessions(),
      loadTeamMembers()
    ]);
    setLoading(false);
  };

  const loadSessions = async () => {
    try {
      const sessionsRef = collection(db, 'assessmentSessions');
      const q1 = query(sessionsRef, where('participantA', '==', currentUserId));
      const q2 = query(sessionsRef, where('participantB', '==', currentUserId));
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      const allSessions = [
        ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];

      allSessions.sort((a, b) => {
        const dateA = a.sessionDate?.toDate?.() || new Date(a.sessionDate);
        const dateB = b.sessionDate?.toDate?.() || new Date(b.sessionDate);
        return dateB - dateA;
      });

      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const members = allUsers.filter(user => user.id !== currentUserId);
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const createSession = async () => {
    if (!selectedMember) {
      alert('Please select a team member');
      return;
    }

    try {
      const newSession = {
        sessionDate: new Date().toISOString(),
        participantA: selectedMember,
        participantB: currentUserId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'assessmentSessions'), newSession);
      
      setIsCreating(false);
      setSelectedMember('');
      loadSessions();
      alert('Assessment session created!');
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session. Please try again.');
    }
  };

  const getSessionStatus = (status) => {
    const statuses = {
      'pending': { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      'both_submitted': { text: 'Ready for Discussion', color: 'bg-blue-100 text-blue-800' },
      'published': { text: 'Published', color: 'bg-green-100 text-green-800' }
    };
    return statuses[status] || statuses['pending'];
  };

  const getUserName = (userId) => {
    const user = teamMembers.find(u => u.id === userId);
    return user?.displayName || 'Unknown User';
  };

  const startAssessment = (sessionId) => {
    window.location.href = `/assess/${sessionId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser} 
        activePage="sessions"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">360 Assessment Sessions</h2>
              <p className="text-gray-600">Monthly 1-on-1 assessment sessions for coaching and alignment</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Session
            </button>
          </div>
        </div>

        {isCreating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Assessment Session</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Team Member
              </label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a team member...</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.displayName} - {member.role}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createSession}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Session
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setSelectedMember('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessment Sessions</h3>
              <p className="text-gray-600 mb-4">Create your first 360 assessment session to get started.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Session
              </button>
            </div>
          ) : (
            sessions.map(session => {
              const status = getSessionStatus(session.status);
              const isParticipantA = session.participantA === currentUserId;
              const otherParticipant = isParticipantA ? session.participantB : session.participantA;
              const sessionDate = session.sessionDate?.toDate?.() || new Date(session.sessionDate);

              return (
                <div key={session.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          1-on-1 with {getUserName(otherParticipant)}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={() => startAssessment(session.id)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {session.status === 'pending' ? 'Start Assessment' : 'View Results'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSessionPage;