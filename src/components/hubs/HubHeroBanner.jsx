// src/components/hub/HubHeroBanner.jsx
import React from 'react';
import { Sparkles } from 'lucide-react';

const HubHeroBanner = ({ 
  gradient = 'blue',
  title = 'ISOS Hub',
  subtitle = 'Performance Assessment',
  icon: CustomIcon = null,
  showSparkles = true
}) => {
  // Gradient configurations for each hub type
  const gradients = {
    red: 'from-red-600 via-rose-600 to-pink-600',           // Admin Panel
    orange: 'from-orange-500 via-amber-500 to-yellow-500',  // HRP Hub
    silver: 'from-gray-500 via-slate-500 to-zinc-500',      // ISE Hub
    indigo: 'from-indigo-600 via-purple-600 to-blue-600',   // ISL Hub
    yellow: 'from-yellow-500 via-amber-500 to-orange-500',  // ISF Supervisor Hub
    green: 'from-green-600 via-emerald-600 to-teal-600',    // ISF Hub
    
    // Legacy/additional options
    purple: 'from-purple-600 via-violet-600 to-fuchsia-600',
    blue: 'from-blue-600 via-sky-600 to-cyan-600'
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