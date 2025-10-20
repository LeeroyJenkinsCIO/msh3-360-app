// 📁 SAVE TO: src/components/hubs/HubHeroBanner.jsx
// Reusable Hero Banner for all ISOS Hubs
// ✅ Silver-blue gradient added for ISE

import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * HubHeroBanner - Reusable hero banner for all ISOS hubs
 * 
 * @param {string} gradient - Color gradient: "red", "purple", "blue", "silverblue", "indigo", "yellow", "green"
 * @param {string} title - Main title (e.g., "ISOS Hub")
 * @param {string} subtitle - Subtitle text (e.g., "ISE Executive View")
 * @param {React.Component} icon - Lucide icon component to display
 * @param {boolean} showSparkles - Show sparkles icon if no custom icon provided
 */
const HubHeroBanner = ({ 
  gradient = 'blue',
  title = 'ISOS Hub',
  subtitle = 'Performance Assessment',
  icon: CustomIcon = null,
  showSparkles = true
}) => {
  // Gradient configurations for each hub type
  const gradients = {
    red: 'from-red-600 via-rose-600 to-pink-600',
    purple: 'from-purple-600 via-violet-600 to-fuchsia-600',
    blue: 'from-blue-600 via-sky-600 to-cyan-600',
    silverblue: 'from-slate-600 via-gray-700 to-blue-800',
    indigo: 'from-indigo-600 via-purple-600 to-blue-600',
    yellow: 'from-yellow-500 via-amber-500 to-orange-500',
    green: 'from-green-600 via-emerald-600 to-teal-600'
  };

  const selectedGradient = gradients[gradient] || gradients.blue;

  return (
    <div className={`relative bg-gradient-to-r ${selectedGradient} text-white overflow-hidden`}>
      {/* Static background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Content */}
      <div className="relative px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {CustomIcon ? (
              <CustomIcon className="w-12 h-12" />
            ) : showSparkles ? (
              <Sparkles className="w-12 h-12" />
            ) : null}
            
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-1">
                {title}
              </h1>
              <p className="text-lg text-white/90">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
};

export default HubHeroBanner;