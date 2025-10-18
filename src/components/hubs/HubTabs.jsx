// 📁 SAVE TO: src/components/hubs/HubTabs.jsx
// Reusable Tab Navigation for all ISOS Hubs

import React from 'react';

/**
 * HubTabs - Reusable tab navigation for ISOS hubs
 * 
 * @param {Array} tabs - Array of tab objects: [{ id: string, label: string, count: number }]
 * @param {string} activeTab - Currently active tab ID
 * @param {Function} onTabChange - Callback when tab is clicked
 * @param {string} className - Additional CSS classes
 */
function HubTabs({ 
  tabs = [], 
  activeTab = "", 
  onTabChange = () => {},
  className = ""
}) {
  
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={`border-b border-gray-200 mb-6 ${className}`}>
      <nav className="flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count !== null && (
              <span className="ml-1">({tab.count})</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default HubTabs;