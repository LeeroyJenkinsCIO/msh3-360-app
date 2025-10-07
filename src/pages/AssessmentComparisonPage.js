import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import { Users, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';

const AssessmentComparisonPage = ({ sessionId, currentUserId, currentUser, onNavigate, onLogout }) => {
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState({ A: null, B: null });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadComparisonData();
  }, [sessionId]);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load session
      const sessionDoc = await getDoc(doc(db, 'assessmentSessions', sessionId));
      if (!sessionDoc.exists()) {
        setError('Session not found');
        return;
      }

      const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
      setSession(sessionData);

      // Load participant user data
      const userADoc = await getDoc(doc(db, 'users', sessionData.participantA));
      const userBDoc = await getDoc(doc(db, 'users', sessionData.participantB));

      const participantsData = {
        A: userADoc.exists() ? { id: userADoc.id, ...userADoc.data() } : null,
        B: userBDoc.exists() ? { id: userBDoc.id, ...userBDoc.data() } : null
      };
      setParticipants(participantsData);

      // Load all 4 assessments
      const scoresData = {};
      const assessmentKeys = [
        { key: 'selfA', id: sessionData.assessmentSelfA },
        { key: 'otherA', id: sessionData.assessmentOtherA },
        { key: 'selfB', id: sessionData.assessmentSelfB },
        { key: 'otherB', id: sessionData.assessmentOtherB }
      ];

      for (const { key, id } of assessmentKeys) {
        if (id) {
          const assessmentDoc = await getDoc(doc(db, 'assessments', id));
          if (assessmentDoc.exists()) {
            const data = assessmentDoc.data();
            scoresData[key] = {
              id: assessmentDoc.id,
              culture_c: data.scores?.culture?.contribution ?? 1,
              culture_g: data.scores?.culture?.growth ?? 1,
              competencies_c: data.scores?.competencies?.contribution ?? 1,
              competencies_g: data.scores?.competencies?.growth ?? 1,
              execution_c: data.scores?.execution?.contribution ?? 1,
              execution_g: data.scores?.execution?.growth ?? 1
            };
          }
        }
      }

      setScores(scoresData);

    } catch (err) {
      console.error('Error loading comparison data:', err);
      setError('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (assessmentKey, field, value) => {
    const numValue = Math.max(0, Math.min(2, parseInt(value) || 0));
    setScores(prev => ({
      ...prev,
      [assessmentKey]: {
        ...prev[assessmentKey],
        [field]: numValue
      }
    }));
  };

  const handleCellClick = (assessmentKey, field) => {
    if (session?.status !== 'published') {
      setEditingCell(`${assessmentKey}-${field}`);
    }
  };

  const handleCellBlur = async (assessmentKey, field) => {
    setEditingCell(null);
    
    // Save to Firebase
    const scoreData = scores[assessmentKey];
    if (scoreData && scoreData.id) {
      try {
        await updateDoc(doc(db, 'assessments', scoreData.id), {
          [`scores.${field.split('_')[0]}.${field.includes('_c') ? 'contribution' : 'growth'}`]: scoreData[field],
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error saving cell edit:', err);
      }
    }
  };

  const calculateComposite = (scoreData) => {
    if (!scoreData) return 0;
    return scoreData.culture_c + scoreData.culture_g +
           scoreData.competencies_c + scoreData.competencies_g +
           scoreData.execution_c + scoreData.execution_g;
  };

  const calculateNineBoxPosition = (scoreData) => {
    if (!scoreData) return 'Unknown';
    
    const totalContribution = scoreData.culture_c + scoreData.competencies_c + scoreData.execution_c;
    const totalGrowth = scoreData.culture_g + scoreData.competencies_g + scoreData.execution_g;
    
    // Thresholds: Low 0-2, Mid 3-4, High 5-6
    const contributionLevel = totalContribution <= 2 ? 'low' : totalContribution <= 4 ? 'mid' : 'high';
    const growthLevel = totalGrowth <= 2 ? 'low' : totalGrowth <= 4 ? 'mid' : 'high';
    
    const positions = {
      'low-low': 'Critical Risk',
      'low-mid': 'Inconsistent',
      'low-high': 'Untapped Potential',
      'mid-low': 'Narrow Contributor',
      'mid-mid': 'Status Quo',
      'mid-high': 'Developing Driver',
      'high-low': 'Raw Talent',
      'high-mid': 'High Impact',
      'high-high': 'Transformative Outcomes'
    };
    
    return positions[`${contributionLevel}-${growthLevel}`] || 'Unknown';
  };

  const handlePublish = async (alignmentStatus) => {
    if (!window.confirm(`Publish this assessment as "${alignmentStatus === 'aligned' ? 'Aligned' : 'With Discrepancies'}"? This cannot be undone.`)) {
      return;
    }

    try {
      setPublishing(true);

      // Get next MSH ID from counter
      const counterRef = doc(db, 'counters', 'assessmentNumber');
      const counterDoc = await getDoc(counterRef);
      
      let nextNumber = 1;
      if (counterDoc.exists()) {
        nextNumber = (counterDoc.data().value || 0) + 1;
      }

      const mshId = `MSH${nextNumber}`;

      // Calculate final composite scores
      const compositeA = calculateComposite(scores.selfA);
      const compositeB = calculateComposite(scores.selfB);
      const positionA = calculateNineBoxPosition(scores.selfA);
      const positionB = calculateNineBoxPosition(scores.selfB);

      // Create assessment history record
      const historyData = {
        assessmentNumber: nextNumber,
        mshId: mshId,
        sessionId: sessionId,
        projectName: session.projectName || 'Unknown',
        mshDescription: session.mshDescription || 'IS OS',
        mshType: session.mshType || 'Project',
        sessionType: session.sessionType || 'adhoc',
        alignmentStatus: alignmentStatus,
        participants: [
          {
            userId: participants.A.id,
            name: participants.A.displayName,
            composite: compositeA,
            position: positionA
          },
          {
            userId: participants.B.id,
            name: participants.B.displayName,
            composite: compositeB,
            position: positionB
          }
        ],
        publishedAt: new Date().toISOString(),
        publishedBy: currentUserId,
        status: 'published',
        trackPurpose: session.trackPurpose || false
      };

      // Use batch write to ensure atomicity
      const batch = writeBatch(db);

      // Update session
      batch.update(doc(db, 'assessmentSessions', sessionId), {
        status: 'published',
        alignmentStatus: alignmentStatus,
        publishedAt: new Date().toISOString(),
        publishedBy: currentUserId,
        assessmentNumber: nextNumber,
        mshId: mshId
      });

      // Create history record in assessmentHistory collection
      batch.set(doc(db, 'assessmentHistory', mshId), historyData);

      // Create or update counter
      if (!counterDoc.exists()) {
        batch.set(counterRef, { value: 1 });
      } else {
        batch.update(counterRef, { value: increment(1) });
      }

      await batch.commit();

      alert(`Assessment published successfully as ${mshId}!`);
      await loadComparisonData(); // Reload to show published status

    } catch (err) {
      console.error('Error publishing assessment:', err);
      alert('Failed to publish assessment. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const renderEditableCell = (assessmentKey, field, label) => {
    const cellId = `${assessmentKey}-${field}`;
    const value = scores[assessmentKey]?.[field] ?? 1;
    const isEditing = editingCell === cellId;
    const isPublished = session?.status === 'published';

    return (
      <td className="px-4 py-3 text-center border-r border-gray-200">
        {isEditing ? (
          <input
            type="number"
            min="0"
            max="2"
            value={value}
            autoFocus
            onChange={(e) => handleCellEdit(assessmentKey, field, e.target.value)}
            onBlur={() => handleCellBlur(assessmentKey, field)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellBlur(assessmentKey, field);
            }}
            className="w-12 px-2 py-1 border border-blue-500 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div
            onClick={() => handleCellClick(assessmentKey, field)}
            className={`font-semibold text-lg ${
              isPublished 
                ? 'text-gray-700 cursor-default' 
                : 'text-blue-600 cursor-pointer hover:bg-blue-50 rounded px-2 py-1'
            }`}
          >
            {value}
          </div>
        )}
      </td>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          currentUser={currentUser}
          activePage="adhoc"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">Loading assessment data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          currentUser={currentUser}
          activePage="adhoc"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => onNavigate('adhoc')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSessionCreator = session && currentUserId === session.participantA;
  const isPublished = session?.status === 'published';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser}
        activePage="adhoc"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Comparison</h1>
          <div className="flex items-center gap-4">
            <p className="text-gray-600">Project: {session?.projectName || 'Unknown'}</p>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isPublished ? `Published - ${session?.mshId}` : 'Pending'}
            </span>
            {isPublished && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                session.alignmentStatus === 'aligned' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {session.alignmentStatus === 'aligned' ? '✓ Aligned' : '⚠ With Discrepancies'}
              </span>
            )}
          </div>
        </div>

        {/* Inline Edit Instructions */}
        {!isPublished && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Edit3 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-semibold">Click any score to edit inline</p>
              <p className="text-xs text-blue-700 mt-1">Changes save automatically when you click away or press Enter</p>
            </div>
          </div>
        )}

        {/* Permission Note */}
        {!isPublished && !isSessionCreator && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only {participants.A?.displayName || 'the session creator'} can publish this assessment.
            </p>
          </div>
        )}

        {/* Spreadsheet Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-300">Domain</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-300">Metric</th>
                  <th className="px-4 py-3 text-center font-semibold text-indigo-700 border-r border-gray-300 bg-indigo-50">
                    {participants.A?.displayName} (Self)
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-purple-700 border-r border-gray-300 bg-purple-50">
                    {participants.B?.displayName}'s view of {participants.A?.displayName?.split(' ')[0]}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-purple-700 border-r border-gray-300 bg-purple-50">
                    {participants.A?.displayName}'s view of {participants.B?.displayName?.split(' ')[0]}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-indigo-700 bg-indigo-50">
                    {participants.B?.displayName} (Self)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Culture */}
                <tr className="border-b border-gray-200 bg-purple-50">
                  <td rowSpan="2" className="px-4 py-3 font-semibold text-purple-700 border-r border-gray-300">
                    Culture
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">Contribution</td>
                  {renderEditableCell('selfA', 'culture_c')}
                  {renderEditableCell('otherA', 'culture_c')}
                  {renderEditableCell('otherB', 'culture_c')}
                  {renderEditableCell('selfB', 'culture_c')}
                </tr>
                <tr className="border-b border-gray-300 bg-purple-50">
                  <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">Growth</td>
                  {renderEditableCell('selfA', 'culture_g')}
                  {renderEditableCell('otherA', 'culture_g')}
                  {renderEditableCell('otherB', 'culture_g')}
                  {renderEditableCell('selfB', 'culture_g')}
                </tr>

                {/* Competencies */}
                <tr className="border-b border-gray-200 bg-orange-50">
                  <td rowSpan="2" className="px-4 py-3 font-semibold text-orange-700 border-r border-gray-300">
                    Competencies
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">Contribution</td>
                  {renderEditableCell('selfA', 'competencies_c')}
                  {renderEditableCell('otherA', 'competencies_c')}
                  {renderEditableCell('otherB', 'competencies_c')}
                  {renderEditableCell('selfB', 'competencies_c')}
                </tr>
                <tr className="border-b border-gray-300 bg-orange-50">
                  <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">Growth</td>
                  {renderEditableCell('selfA', 'competencies_g')}
                  {renderEditableCell('otherA', 'competencies_g')}
                  {renderEditableCell('otherB', 'competencies_g')}
                  {renderEditableCell('selfB', 'competencies_g')}
                </tr>

                {/* Execution */}
                <tr className="border-b border-gray-200 bg-green-50">
                  <td rowSpan="2" className="px-4 py-3 font-semibold text-green-700 border-r border-gray-300">
                    Execution
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">Contribution</td>
                  {renderEditableCell('selfA', 'execution_c')}
                  {renderEditableCell('otherA', 'execution_c')}
                  {renderEditableCell('otherB', 'execution_c')}
                  {renderEditableCell('selfB', 'execution_c')}
                </tr>
                <tr className="border-b border-gray-300 bg-green-50">
                  <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">Growth</td>
                  {renderEditableCell('selfA', 'execution_g')}
                  {renderEditableCell('otherA', 'execution_g')}
                  {renderEditableCell('otherB', 'execution_g')}
                  {renderEditableCell('selfB', 'execution_g')}
                </tr>

                {/* Totals */}
                <tr className="bg-gray-100 border-t-2 border-gray-400">
                  <td colSpan="2" className="px-4 py-3 font-bold text-gray-900 border-r border-gray-300">
                    Composite Score
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-xl text-indigo-700 border-r border-gray-300">
                    {calculateComposite(scores.selfA)}/12
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-xl text-purple-700 border-r border-gray-300">
                    {calculateComposite(scores.otherA)}/12
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-xl text-purple-700 border-r border-gray-300">
                    {calculateComposite(scores.otherB)}/12
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-xl text-indigo-700">
                    {calculateComposite(scores.selfB)}/12
                  </td>
                </tr>

                {/* Nine-Box Position */}
                <tr className="bg-blue-50">
                  <td colSpan="2" className="px-4 py-3 font-bold text-gray-900 border-r border-gray-300">
                    Nine-Box Position
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-indigo-900 border-r border-gray-300">
                    {calculateNineBoxPosition(scores.selfA)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-purple-900 border-r border-gray-300">
                    {calculateNineBoxPosition(scores.otherA)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-purple-900 border-r border-gray-300">
                    {calculateNineBoxPosition(scores.otherB)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-indigo-900">
                    {calculateNineBoxPosition(scores.selfB)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Publish Buttons */}
        {!isPublished && isSessionCreator && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Publish?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose the appropriate status for this assessment. This will create an MSH ID and add it to Assessment History.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handlePublish('aligned')}
                disabled={publishing}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Publish as ALIGNED
              </button>
              <button
                onClick={() => handlePublish('with-discrepancies')}
                disabled={publishing}
                className="flex-1 px-6 py-3 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Publish with DISCREPANCIES
              </button>
            </div>
          </div>
        )}

        {/* Published Status */}
        {isPublished && (
          <div className={`rounded-lg p-6 border-2 mb-6 ${
            session.alignmentStatus === 'aligned' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              {session.alignmentStatus === 'aligned' ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  Assessment Published - {session.mshId}
                </h3>
                <p className="text-sm">
                  Status: {session.alignmentStatus === 'aligned' ? 'Aligned' : 'With Discrepancies'} • 
                  Published on {new Date(session.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => onNavigate('adhoc')}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
          >
            ← Back to Sessions
          </button>
          {isPublished && (
            <button
              onClick={() => onNavigate('history')}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              View Assessment History →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentComparisonPage;