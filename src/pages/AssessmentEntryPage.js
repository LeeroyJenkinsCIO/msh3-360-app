import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import AssessmentGrid from '../components/AssessmentGrid';
import { Users, CheckCircle } from 'lucide-react';

const AssessmentEntryPage = ({ sessionId, currentUserId, currentUser, onNavigate, onLogout }) => {
  const [session, setSession] = useState(null);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [assessments, setAssessments] = useState({
    self: { culture: { contribution: 1, growth: 1 }, competencies: { contribution: 1, growth: 1 }, execution: { contribution: 1, growth: 1 } },
    other: { culture: { contribution: 1, growth: 1 }, competencies: { contribution: 1, growth: 1 }, execution: { contribution: 1, growth: 1 } }
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [otherHasSubmitted, setOtherHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();
  }, [sessionId, currentUserId]);

  const loadSessionData = async () => {
    try {
      const sessionDoc = await getDoc(doc(db, 'assessmentSessions', sessionId));
      if (!sessionDoc.exists()) {
        alert('Session not found');
        onNavigate('adhoc');
        return;
      }

      const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
      setSession(sessionData);

      const otherUserId = sessionData.participantA === currentUserId 
        ? sessionData.participantB 
        : sessionData.participantA;

      const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
      if (otherUserDoc.exists()) {
        setOtherParticipant({ id: otherUserId, ...otherUserDoc.data() });
      }

      // Check if current user has submitted - look for self-assessment
      const selfAssessmentQuery = query(
        collection(db, 'assessments'),
        where('sessionId', '==', sessionId),
        where('assessorId', '==', currentUserId),
        where('subjectId', '==', currentUserId)
      );
      const selfSnapshot = await getDocs(selfAssessmentQuery);
      
      if (!selfSnapshot.empty) {
        const selfData = selfSnapshot.docs[0].data();
        
        // Load other assessment too
        const otherAssessmentQuery = query(
          collection(db, 'assessments'),
          where('sessionId', '==', sessionId),
          where('assessorId', '==', currentUserId),
          where('subjectId', '==', otherUserId)
        );
        const otherSnapshot = await getDocs(otherAssessmentQuery);
        
        if (!otherSnapshot.empty) {
          const otherData = otherSnapshot.docs[0].data();
          setAssessments({
            self: selfData.scores,
            other: otherData.scores
          });
          setHasSubmitted(true);
        }
      }

      // Check if other user has submitted
      const otherSelfQuery = query(
        collection(db, 'assessments'),
        where('sessionId', '==', sessionId),
        where('assessorId', '==', otherUserId),
        where('subjectId', '==', otherUserId)
      );
      const otherSelfSnapshot = await getDocs(otherSelfQuery);
      setOtherHasSubmitted(!otherSelfSnapshot.empty);

      setLoading(false);
    } catch (error) {
      console.error('Error loading session:', error);
      setLoading(false);
    }
  };

  const handleSliderChange = (assessmentType, domain, type, value) => {
    setAssessments(prev => ({
      ...prev,
      [assessmentType]: {
        ...prev[assessmentType],
        [domain]: {
          ...prev[assessmentType][domain],
          [type]: parseInt(value)
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!session || !otherParticipant) {
      alert('Session data not loaded');
      return;
    }

    try {
      console.log('Submitting assessments for session:', sessionId);
      
      // Calculate domain scores
      const selfCultureScore = assessments.self.culture.contribution + assessments.self.culture.growth;
      const selfCompetenciesScore = assessments.self.competencies.contribution + assessments.self.competencies.growth;
      const selfExecutionScore = assessments.self.execution.contribution + assessments.self.execution.growth;
      
      const otherCultureScore = assessments.other.culture.contribution + assessments.other.culture.growth;
      const otherCompetenciesScore = assessments.other.competencies.contribution + assessments.other.competencies.growth;
      const otherExecutionScore = assessments.other.execution.contribution + assessments.other.execution.growth;

      // Document 1: Current user assessing themselves
      const selfAssessmentData = {
        sessionId: sessionId,
        assessorId: currentUserId,
        assessorName: currentUser.displayName,
        subjectId: currentUserId,
        subjectName: currentUser.displayName,
        scores: assessments.self,
        cultureScore: selfCultureScore,
        competenciesScore: selfCompetenciesScore,
        executionScore: selfExecutionScore,
        timestamp: new Date().toISOString(),
        status: 'submitted'
      };

      // Document 2: Current user assessing other person
      const otherAssessmentData = {
        sessionId: sessionId,
        assessorId: currentUserId,
        assessorName: currentUser.displayName,
        subjectId: otherParticipant.id,
        subjectName: otherParticipant.displayName,
        scores: assessments.other,
        cultureScore: otherCultureScore,
        competenciesScore: otherCompetenciesScore,
        executionScore: otherExecutionScore,
        timestamp: new Date().toISOString(),
        status: 'submitted'
      };

      // Save or update self-assessment and capture the ID
      let selfAssessmentId;
      const selfQuery = query(
        collection(db, 'assessments'),
        where('sessionId', '==', sessionId),
        where('assessorId', '==', currentUserId),
        where('subjectId', '==', currentUserId)
      );
      const selfSnapshot = await getDocs(selfQuery);
      
      if (selfSnapshot.empty) {
        const selfDocRef = await addDoc(collection(db, 'assessments'), selfAssessmentData);
        selfAssessmentId = selfDocRef.id;
        console.log('Created new self-assessment:', selfAssessmentId);
      } else {
        selfAssessmentId = selfSnapshot.docs[0].id;
        await updateDoc(doc(db, 'assessments', selfAssessmentId), selfAssessmentData);
        console.log('Updated existing self-assessment:', selfAssessmentId);
      }

      // Save or update assessment of other person and capture the ID
      let otherAssessmentId;
      const otherQuery = query(
        collection(db, 'assessments'),
        where('sessionId', '==', sessionId),
        where('assessorId', '==', currentUserId),
        where('subjectId', '==', otherParticipant.id)
      );
      const otherSnapshot = await getDocs(otherQuery);
      
      if (otherSnapshot.empty) {
        const otherDocRef = await addDoc(collection(db, 'assessments'), otherAssessmentData);
        otherAssessmentId = otherDocRef.id;
        console.log('Created new assessment of other person:', otherAssessmentId);
      } else {
        otherAssessmentId = otherSnapshot.docs[0].id;
        await updateDoc(doc(db, 'assessments', otherAssessmentId), otherAssessmentData);
        console.log('Updated existing assessment of other person:', otherAssessmentId);
      }

      // **KEY FIX: Update session with assessment IDs**
      const isParticipantA = session.participantA === currentUserId;
      const sessionUpdateData = {};
      
      if (isParticipantA) {
        // Current user is Participant A
        sessionUpdateData.assessmentSelfA = selfAssessmentId;
        sessionUpdateData.assessmentOtherB = otherAssessmentId; // A assessing B
        console.log('Updating session - Participant A assessments linked');
      } else {
        // Current user is Participant B
        sessionUpdateData.assessmentSelfB = selfAssessmentId;
        sessionUpdateData.assessmentOtherA = otherAssessmentId; // B assessing A
        console.log('Updating session - Participant B assessments linked');
      }

      // Check if all 4 assessments are now complete
      const allAssessmentsQuery = query(
        collection(db, 'assessments'),
        where('sessionId', '==', sessionId)
      );
      const allAssessmentsSnapshot = await getDocs(allAssessmentsQuery);
      const assessmentCount = allAssessmentsSnapshot.size;
      
      console.log('Total assessments for this session:', assessmentCount);

      const bothSubmitted = assessmentCount >= 4;

      if (bothSubmitted) {
        sessionUpdateData.status = 'both_submitted';
        sessionUpdateData.submittedAt = new Date().toISOString();
        console.log('Both participants have submitted - status updated to both_submitted');
      }

      // Apply all session updates at once
      await updateDoc(doc(db, 'assessmentSessions', sessionId), sessionUpdateData);
      console.log('Session updated with assessment IDs:', sessionUpdateData);

      setHasSubmitted(true);
      console.log('Assessment submission complete');

      if (bothSubmitted) {
        setTimeout(() => {
          onNavigate('comparison', { sessionId: sessionId });
        }, 500);
      } else {
        setTimeout(() => {
          onNavigate('adhoc');
        }, 500);
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Error submitting assessment: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header currentUser={currentUser} activePage="adhoc" onLogout={onLogout} onNavigate={onNavigate} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-600">Loading session...</div>
        </div>
      </div>
    );
  }

  if (!session || !otherParticipant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header currentUser={currentUser} activePage="adhoc" onLogout={onLogout} onNavigate={onNavigate} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-red-600">Error loading session data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentUser={currentUser} activePage="adhoc" onLogout={onLogout} onNavigate={onNavigate} />
      
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate('adhoc')}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            ← Back to Ad Hoc Alignments
          </button>
          
          <div className="flex items-center space-x-4">
            {otherHasSubmitted && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">{otherParticipant.displayName} has submitted</span>
              </div>
            )}
            {hasSubmitted && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">You have submitted</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Ad Hoc 360° Assessment</h3>
              <p className="text-sm text-blue-700">
                Session with <span className="font-semibold">{otherParticipant.displayName}</span> • 
                Created {new Date(session.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {hasSubmitted && (
          <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
            <p className="font-semibold">✓ You have already submitted your assessment for this session</p>
            <p className="text-sm mt-1">You can update your scores below and resubmit if needed.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-lg p-6 border-2 border-indigo-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Part 1: Self-Assessment</h2>
              <p className="text-gray-600">Rate yourself on the MSH³ domains</p>
            </div>

            <AssessmentGrid
              scores={assessments.self}
              onSliderChange={(domain, type, value) => handleSliderChange('self', domain, type, value)}
              titlePrefix="My"
            />
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Part 2: Assessment of {otherParticipant.displayName}
              </h2>
              <p className="text-gray-600">Rate {otherParticipant.displayName} on the MSH³ domains</p>
            </div>

            <AssessmentGrid
              scores={assessments.other}
              onSliderChange={(domain, type, value) => handleSliderChange('other', domain, type, value)}
              titlePrefix={otherParticipant.displayName + "'s"}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            {hasSubmitted ? '✓ Update Assessment' : '✓ Submit Both Assessments'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssessmentEntryPage;