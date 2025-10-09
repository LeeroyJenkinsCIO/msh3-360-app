import React from 'react';

function UnderConstruction() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '200px',
        height: '200px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse'
      }}></div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '60px 40px',
        maxWidth: '600px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        zIndex: 1,
        animation: 'pulse 3s ease-in-out infinite'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🚧</div>
        <h1 style={{ 
          fontSize: '48px', 
          marginBottom: '20px', 
          fontWeight: 'bold',
          letterSpacing: '-1px'
        }}>
          Under Construction
        </h1>
        <p style={{ 
          fontSize: '24px', 
          marginBottom: '30px', 
          opacity: 0.95,
          fontWeight: '600'
        }}>
          MSH³ 360 Assessment Tool
        </p>
        <div style={{
          width: '60px',
          height: '4px',
          background: 'white',
          margin: '0 auto 30px',
          opacity: 0.5
        }}></div>
        <p style={{ 
          fontSize: '16px', 
          opacity: 0.85, 
          lineHeight: '1.8',
          marginBottom: '20px'
        }}>
          We're building something great! This application is currently in development and will be available soon.
        </p>
        <p style={{ 
          fontSize: '14px', 
          opacity: 0.7,
          fontStyle: 'italic'
        }}>
          Mindset. Skillset. Habits. — at the Speed of Scale.
        </p>
        <div style={{ 
          marginTop: '50px', 
          paddingTop: '30px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          fontSize: '14px', 
          opacity: 0.7 
        }}>
          <div style={{ marginBottom: '5px', fontWeight: '600' }}>
            Sierra Nevada Brewing Co.
          </div>
          <div>Information Systems</div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        fontSize: '12px',
        opacity: 0.5
      }}>
        © 2025 Sierra Nevada Brewing Co. All rights reserved.
      </div>
    </div>
  );
}

export default UnderConstruction;