import React from 'react';

function UnderConstruction() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-msh-indigo to-msh-purple text-white p-5 text-center relative overflow-hidden">
      
      {/* Animated background circles */}
      <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-white/5 rounded-full animate-float"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[200px] h-[200px] bg-white/5 rounded-full animate-float-reverse"></div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 8s ease-in-out infinite;
        }
        .animate-pulse-scale {
          animation: pulse-scale 3s ease-in-out infinite;
        }
      `}</style>

      {/* Main content card */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-10 md:p-16 max-w-2xl shadow-card-hover relative z-10 animate-pulse-scale">
        
        {/* Construction icon */}
        <div className="text-7xl md:text-8xl mb-6">🚧</div>
        
        {/* Main heading */}
        <h1 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">
          Under Construction
        </h1>
        
        {/* App name */}
        <p className="text-xl md:text-2xl mb-8 font-semibold opacity-95">
          MSH³ 360 Assessment Tool
        </p>
        
        {/* Divider */}
        <div className="w-16 h-1 bg-white/50 mx-auto mb-8"></div>
        
        {/* Description */}
        <p className="text-base md:text-lg opacity-85 leading-relaxed mb-6">
          We're building something great! This application is currently in development and will be available soon.
        </p>
        
        {/* Tagline */}
        <p className="text-sm opacity-70 italic mb-0">
          Mindset. Skillset. Habits. — at the Speed of Scale.
        </p>
        
        {/* Company info */}
        <div className="mt-12 pt-8 border-t border-white/20 text-sm opacity-70">
          <div className="mb-2 font-semibold">
            Sierra Nevada Brewing Co.
          </div>
          <div>Information Systems</div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 text-xs opacity-50">
        © 2025 Sierra Nevada Brewing Co. All rights reserved.
      </div>
    </div>
  );
}

export default UnderConstruction;