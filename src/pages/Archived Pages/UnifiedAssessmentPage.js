import React, { useState } from 'react';
import AssessmentGrid from '../components/AssessmentGrid';

function UnifiedAssessmentPage({ currentUser, onBack }) {
  const [scores, setScores] = useState({
    culture: { contribution: 1, growth: 1 },
    competencies: { contribution: 1, growth: 1 },
    execution: { contribution: 1, growth: 1 }
  });

  const handleScoreChange = (domain, dimension, value) => {
    setScores(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [dimension]: parseInt(value)
      }
    }));
  };

  const totalContribution = scores.culture.contribution + scores.competencies.contribution + scores.execution.contribution;
  const totalGrowth = scores.culture.growth + scores.competencies.growth + scores.execution.growth;
  const composite = totalContribution + totalGrowth;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '4px solid #667eea'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              Quick Align Assessment
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Radically candid alignment on capability and outcomes
            </p>
          </div>

          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
        </div>

        {/* Use the Universal AssessmentGrid Component */}
        <AssessmentGrid 
          scores={scores}
          onScoreChange={handleScoreChange}
        />
      </div>
    </div>
  );
}

export default UnifiedAssessmentPage;