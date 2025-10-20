// 📁 SAVE TO: src/components/hubs/HubMetricsBar.jsx
// Reusable Metrics Bar showing GLOBAL ISOS cycle progress
// ✅ Dynamic gradient support to match hub colors

import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * HubMetricsBar - Shows GLOBAL assessment cycle info and MSH³ progress
 * Universal across all hubs - tracks entire ISOS organization progress
 * 
 * @param {number} cycleNumber - Current cycle (1-4)
 * @param {string} cycleType - '1x1' or '360'
 * @param {string} currentMonth - Month name (e.g., 'OCTOBER 2025')
 * @param {number} completedCount - Number of assessments completed (for display only)
 * @param {number} totalCount - Total number of assessments in cycle (for display only)
 * @param {number} currentMonthMSH - MSH³ published in current month
 * @param {number} currentMonthMSHExpected - Expected MSH³ for current month (24 for 1x1, 34 for 360)
 * @param {number} cycleMSH - Total MSH³ published in full cycle
 * @param {number} cycleMSHExpected - Expected MSH³ for full cycle (82)
 * @param {string} gradient - Color gradient: "red", "purple", "blue", "silverblue", "indigo", "yellow", "green"
 */
function HubMetricsBar({
  cycleNumber = 1,
  cycleType = '1x1',
  currentMonth = 'OCTOBER 2025',
  completedCount = 0,
  totalCount = 0,
  currentMonthMSH = 0,
  currentMonthMSHExpected = 24,
  cycleMSH = 0,
  cycleMSHExpected = 82,
  gradient = 'indigo'
}) {
  
  // Gradient configurations matching HubHeroBanner
  const gradients = {
    red: 'from-red-600 via-rose-600 to-pink-600',
    purple: 'from-purple-600 via-violet-600 to-fuchsia-600',
    blue: 'from-blue-600 via-sky-600 to-cyan-600',
    silverblue: 'from-slate-600 via-gray-700 to-blue-800',
    indigo: 'from-indigo-600 via-purple-600 to-blue-600',
    yellow: 'from-yellow-500 via-amber-500 to-orange-500',
    green: 'from-green-600 via-emerald-600 to-teal-600'
  };

  const selectedGradient = gradients[gradient] || gradients.indigo;
  
  const cyclePercentComplete = cycleMSHExpected > 0 
    ? Math.round((cycleMSH / cycleMSHExpected) * 100)
    : 0;

  return (
    <div className={`bg-gradient-to-r ${selectedGradient} text-white py-6 shadow-lg`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left: Assessment Cycle */}
          <div>
            <h3 className="text-sm font-medium text-blue-100 mb-2">Assessment Cycle</h3>
            <div className="text-3xl font-bold mb-1">Cycle {cycleNumber} of 4</div>
            <div className="text-sm text-blue-100">Type: {cycleType}</div>
          </div>

          {/* Center: Current Open Month MSH */}
          <div className="text-center">
            <h3 className="text-sm font-medium text-blue-100 mb-2">Current Open Month</h3>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="w-8 h-8" />
              <span className="text-3xl font-bold">{currentMonth}</span>
            </div>
            <div className="text-sm text-blue-100">
              {currentMonthMSH}/{currentMonthMSHExpected} MSH³ scores published
            </div>
          </div>

          {/* Right: ISOS Progress (Full Cycle) */}
          <div className="text-right">
            <h3 className="text-sm font-medium text-blue-100 mb-2">ISOS Progress</h3>
            <div className="text-3xl font-bold mb-1">
              {cycleMSH}/{cycleMSHExpected} completed ({cyclePercentComplete}%)
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