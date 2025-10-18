// 📁 SAVE TO: src/components/hubs/HubMetricsBar.jsx
// Reusable Metrics Bar showing GLOBAL ISOS cycle progress
// Tracks organization-wide MSH³ published counts

import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * HubMetricsBar - Shows GLOBAL assessment cycle info and MSH³ progress
 * Universal across all hubs - tracks entire ISOS organization progress
 * 
 * @param {number} cycleNumber - Current cycle (1-4)
 * @param {string} cycleType - '1x1' or '360'
 * @param {string} currentMonth - Month name (e.g., 'OCTOBER 2025')
 * @param {number} completedCount - Number of MSH³ scores published
 * @param {number} totalCount - Total number of assessments in cycle
 */
function HubMetricsBar({
  cycleNumber = 1,
  cycleType = '1x1',
  currentMonth = 'OCTOBER 2025',
  completedCount = 0,
  totalCount = 0
}) {
  
  const percentComplete = totalCount > 0 
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white py-6 shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left: Assessment Cycle */}
          <div>
            <h3 className="text-sm font-medium text-blue-100 mb-2">Assessment Cycle</h3>
            <div className="text-3xl font-bold mb-1">Cycle {cycleNumber} of 4</div>
            <div className="text-sm text-blue-100">Type: {cycleType}</div>
          </div>

          {/* Center: Current Open Month */}
          <div className="text-center">
            <h3 className="text-sm font-medium text-blue-100 mb-2">Current Open Month</h3>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="w-8 h-8" />
              <span className="text-3xl font-bold">{currentMonth}</span>
            </div>
            <div className="text-sm text-blue-100">
              {completedCount}/{totalCount} MSH³ scores published
            </div>
          </div>

          {/* Right: ISOS Progress */}
          <div className="text-right">
            <h3 className="text-sm font-medium text-blue-100 mb-2">ISOS Progress</h3>
            <div className="text-3xl font-bold mb-1">
              {completedCount}/{totalCount} completed ({percentComplete}%)
            </div>
            <div className="text-sm text-blue-100">
              Organization-wide MSH³ published
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default HubMetricsBar;