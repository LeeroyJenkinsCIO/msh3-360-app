import React from 'react';
import Header from '../components/Header';

export default function MSH3Dashboard({ currentUser, currentUserId, currentPage, onNavigate, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        currentUser={currentUser}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      
      <div className="max-w-7xl mx-auto p-8">
        {/* Page Title */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            MSH³ 360 Performance Dashboard
          </h1>
          <p className="text-gray-600">
            Measuring what matters: Culture, Competencies, and Execution
          </p>
        </div>

        {/* Three Pillars Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Culture */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Culture</h2>
            <p className="text-sm text-gray-600 mb-4">
              How we show up. Collaboration, communication, accountability, and alignment with SNB values.
            </p>
            <div className="text-3xl font-bold text-blue-600">--</div>
            <p className="text-xs text-gray-500 mt-1">Composite Score (0-12)</p>
          </div>

          {/* Competencies */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Competencies</h2>
            <p className="text-sm text-gray-600 mb-4">
              What we know. The technical and functional skills that enable reliable, high-quality work.
            </p>
            <div className="text-3xl font-bold text-green-600">--</div>
            <p className="text-xs text-gray-500 mt-1">Composite Score (0-12)</p>
          </div>

          {/* Execution */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Execution</h2>
            <p className="text-sm text-gray-600 mb-4">
              What we deliver. The ability to translate plans into results that move the business forward.
            </p>
            <div className="text-3xl font-bold text-purple-600">--</div>
            <p className="text-xs text-gray-500 mt-1">Composite Score (0-12)</p>
          </div>
        </div>

        {/* IS Overall Score */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">IS Overall Composite</h2>
              <p className="text-indigo-100">
                Aggregate performance across all three pillars
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">--</div>
              <p className="text-sm text-indigo-200 mt-1">Score Range: 0-36</p>
            </div>
          </div>
        </div>

        {/* Nine-Box Grid Placeholder */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Team Performance Distribution
          </h2>
          <div className="aspect-square max-w-2xl mx-auto border-2 border-gray-300 rounded-lg flex items-center justify-center">
            <p className="text-gray-400 text-lg">Nine-Box Grid Visualization</p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Dashboard Under Construction
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                This placeholder reflects MSH³ philosophy. Real-time data aggregation and analytics coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}