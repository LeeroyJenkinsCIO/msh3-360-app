import React from 'react';
import { Route } from 'lucide-react';

function Logo({ 
  size = 'medium', 
  showTagline = true, 
  onClick = null,
  className = ''
}) {
  const sizeConfig = {
    small: {
      iconSize: 28,
      titleSize: '20px',
      taglineSize: '9px',
      gap: '4px',
      taglineMargin: '2px',
      iconStroke: 2.5
    },
    medium: {
      iconSize: 40,
      titleSize: '26px',
      taglineSize: '10.5px',
      gap: '5px',
      taglineMargin: '3px',
      iconStroke: 2.5
    },
    large: {
      iconSize: 52,
      titleSize: '34px',
      taglineSize: '12px',
      gap: '6px',
      taglineMargin: '4px',
      iconStroke: 2.5
    }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: config.gap,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      onClick={onClick}
      className={className}
    >
      <Route 
        size={config.iconSize} 
        color="#3b82f6" 
        strokeWidth={config.iconStroke} 
      />

      <div style={{ 
        lineHeight: '1.1',
        textAlign: 'left'
      }}>
        <h1 style={{
          fontSize: config.titleSize,
          fontWeight: '700',
          color: '#1f2937',
          margin: 0,
          lineHeight: '1',
          letterSpacing: '-0.02em',
          textAlign: 'left'
        }}>
          MSH³
        </h1>

        {showTagline && (
          <div style={{
            fontSize: config.taglineSize,
            color: '#6b7280',
            letterSpacing: '0.3px',
            marginTop: config.taglineMargin,
            fontWeight: '500',
            textAlign: 'left'
          }}>
            <span style={{ fontWeight: '700' }}>M</span>indset | {' '}
            <span style={{ fontWeight: '700' }}>S</span>killset | {' '}
            <span style={{ fontWeight: '700' }}>H</span>abits
          </div>
        )}
      </div>
    </div>
  );
}

export default Logo;