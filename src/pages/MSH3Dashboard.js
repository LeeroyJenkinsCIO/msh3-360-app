import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';

const MSH3Dashboard = ({ currentUserId, currentUser, onNavigate, onLogout }) => {
  const [dashboardData, setDashboardData] = useState({
    culture: 0,
    competencies: 0,
    execution: 0,
    contribution: 0,
    growth: 0,
    nineBoxPosition: 'Loading...'
  });

  useEffect(() => {
    loadDashboardData();
  }, [currentUserId]);

  const loadDashboardData = async () => {
    try {
      const assessmentsRef = collection(db, 'assessments');
      const q = query(assessmentsRef, where('userId', '==', currentUserId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No assessments found');
        setDashboardData({
          culture: 0,
          competencies: 0,
          execution: 0,
          contribution: 0,
          growth: 0,
          nineBoxPosition: 'No assessments yet'
        });
        return;
      }

      let totalCulture = 0;
      let totalCompetencies = 0;
      let totalExecution = 0;
      let totalContribution = 0;
      let totalGrowth = 0;
      let count = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalCulture += data.cultureScore || 0;
        totalCompetencies += data.competenciesScore || 0;
        totalExecution += data.executionScore || 0;
        totalContribution += data.contributionScore || 0;
        totalGrowth += data.growthScore || 0;
        count++;
      });

      const avgCulture = (totalCulture / count).toFixed(1);
      const avgCompetencies = (totalCompetencies / count).toFixed(1);
      const avgExecution = (totalExecution / count).toFixed(1);
      const avgContribution = (totalContribution / count).toFixed(1);
      const avgGrowth = (totalGrowth / count).toFixed(1);

      const position = calculateNineBoxPosition(parseFloat(avgContribution), parseFloat(avgGrowth));

      setDashboardData({
        culture: avgCulture,
        competencies: avgCompetencies,
        execution: avgExecution,
        contribution: avgContribution,
        growth: avgGrowth,
        nineBoxPosition: position
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const calculateNineBoxPosition = (contribution, growth) => {
    if (contribution >= 1.5 && growth >= 1.5) return 'Transformational';
    if (contribution >= 1.5 && growth >= 0.5) return 'Solid Performer';
    if (contribution >= 1.5) return 'Steady but Limited';
    if (contribution >= 0.5 && growth >= 1.5) return 'Growth Potential';
    if (contribution >= 0.5 && growth >= 0.5) return 'Status Quo';
    if (contribution >= 0.5) return 'Plateaued';
    if (growth >= 1.5) return 'Raw Talent';
    if (growth >= 0.5) return 'Inconsistent';
    return 'Needs Intervention';
  };

  const getNineBoxColor = (position) => {
    const colors = {
      'Transformational': 'bg-green-500',
      'Solid Performer': 'bg-green-400',
      'Steady but Limited': 'bg-yellow-400',
      'Growth Potential': 'bg-blue-400',
      'Status Quo': 'bg-gray-400',
      'Plateaued': 'bg-orange-400',
      'Raw Talent': 'bg-purple-400',
      'Inconsistent': 'bg-red-400',
      'Needs Intervention': 'bg-red-500'
    };
    return colors[position] || 'bg-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser} 
        activePage="dashboard"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Dashboard</h2>
          <p className="text-gray-600">Your MSH³ 360 assessment results and positioning</p>
        </div>

        {/* Domain Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">🎭</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Culture</h3>
                <p className="text-sm text-gray-500">How we show up</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-600">{dashboardData.culture}</div>
            <div className="text-sm text-gray-500 mt-1">Average Score</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Competencies</h3>
                <p className="text-sm text-gray-500">What we know</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600">{dashboardData.competencies}</div>
            <div className="text-sm text-gray-500 mt-1">Average Score</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Execution</h3>
                <p className="text-sm text-gray-500">What we deliver</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{dashboardData.execution}</div>
            <div className="text-sm text-gray-500 mt-1">Average Score</div>
          </div>
        </div>

        {/* Nine-Box Grid */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Nine-Box Position</h3>
          
          <div className="grid grid-cols-3 gap-2 mb-6">
            {/* Row 3 - High Growth */}
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Raw Talent' ? 'border-blue-500 ' + getNineBoxColor('Raw Talent') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Raw Talent</div>
            </div>
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Growth Potential' ? 'border-blue-500 ' + getNineBoxColor('Growth Potential') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Growth Potential</div>
            </div>
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Transformational' ? 'border-blue-500 ' + getNineBoxColor('Transformational') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Transformational</div>
            </div>

            {/* Row 2 - Medium Growth */}
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Inconsistent' ? 'border-blue-500 ' + getNineBoxColor('Inconsistent') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Inconsistent</div>
            </div>
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Status Quo' ? 'border-blue-500 ' + getNineBoxColor('Status Quo') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Status Quo</div>
            </div>
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Solid Performer' ? 'border-blue-500 ' + getNineBoxColor('Solid Performer') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Solid Performer</div>
            </div>

            {/* Row 1 - Low Growth */}
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Needs Intervention' ? 'border-blue-500 ' + getNineBoxColor('Needs Intervention') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Needs Intervention</div>
            </div>
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Plateaued' ? 'border-blue-500 ' + getNineBoxColor('Plateaued') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Plateaued</div>
            </div>
            <div className={`p-4 rounded border-2 text-center ${dashboardData.nineBoxPosition === 'Steady but Limited' ? 'border-blue-500 ' + getNineBoxColor('Steady but Limited') + ' text-white' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-sm font-medium">Steady but Limited</div>
            </div>
          </div>

          <div className="flex justify-between text-sm text-gray-500 mt-4">
            <div>← Lower Contribution</div>
            <div>Higher Contribution →</div>
          </div>
          <div className="text-center text-sm text-gray-500 mt-2">↑ Growth ↑</div>
        </div>

        {/* Contribution & Growth Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contribution Score</h3>
            <div className="text-4xl font-bold text-indigo-600 mb-2">{dashboardData.contribution}</div>
            <div className="text-sm text-gray-500">out of 2.0</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Score</h3>
            <div className="text-4xl font-bold text-green-600 mb-2">{dashboardData.growth}</div>
            <div className="text-sm text-gray-500">out of 2.0</div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => onNavigate('assessment')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Take New Assessment
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default MSH3Dashboard;