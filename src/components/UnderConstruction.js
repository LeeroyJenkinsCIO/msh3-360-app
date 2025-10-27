// 📁 SAVE TO: src/components/UnderConstruction.jsx
import React from 'react';

function UnderConstruction() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-12 border border-white/20">
          
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full"></div>
              <div className="relative text-7xl md:text-8xl animate-bounce">
                🚧
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4 tracking-tight">
            Under Construction
          </h1>
          
          {/* Subtitle */}
          <div className="text-center mb-8">
            <p className="text-xl md:text-2xl font-semibold text-white/90 mb-2">
              MSH³ 360 Assessment Tool
            </p>
            <p className="text-sm text-white/60 italic">
              Mindset • Skillset • Habits
            </p>
          </div>
          
          {/* Divider */}
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-white/30 flex-1 max-w-xs"></div>
          </div>
          
          {/* Message */}
          <p className="text-lg text-white/80 text-center leading-relaxed mb-8">
            We're building something amazing. This application is currently in development and will be available soon.
          </p>
          
          {/* Progress Indicator */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-150"></div>
          </div>
          
          {/* Company Info */}
          <div className="text-center pt-8 border-t border-white/20">
            <p className="text-sm font-semibold text-white/70 mb-1">
              Sierra Nevada Brewing Co.
            </p>
            <p className="text-xs text-white/50">
              Information Systems
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-white/40">
            © 2025 Sierra Nevada Brewing Co. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* Background Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.1; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.2; }
        }
        
        .delay-75 {
          animation-delay: 75ms;
        }
        
        .delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
      
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
          style={{ animation: 'float 8s ease-in-out infinite' }}
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          style={{ animation: 'float 10s ease-in-out infinite', animationDelay: '2s' }}
        ></div>
        <div 
          className="absolute top-1/2 right-1/3 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"
          style={{ animation: 'float 12s ease-in-out infinite', animationDelay: '4s' }}
        ></div>
      </div>
    </div>
  );
}

export default UnderConstruction;