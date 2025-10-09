import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AssessmentGrid from '../components/AssessmentGrid';

function UnifiedAssessmentPage() {
  const { user } = useAuth();
  
  const [scores, setScores] = useState({
    culture: { 
      contribution: 1,
      growth: 1
    },
    competencies: { 
      contribution: 1,
      growth: 1
    },
    execution: { 
      contribution: 1,
      growth: 1
    }
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5">
      <div className="max-w-4xl mx-auto">
        
        {/* Page Header Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-5">
          <div className="h-1 bg-indigo-600"></div>
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Quick Align Assessment
            </h1>
            <p className="text-gray-600 text-sm">
              Radically candid alignment
            </p>
          </div>
        </div>

        {/* Assessment Grid Component */}
        <AssessmentGrid 
          scores={scores}
          onScoreChange={handleScoreChange}
        />
        
      </div>
    </div>
  );
}

export default UnifiedAssessmentPage;