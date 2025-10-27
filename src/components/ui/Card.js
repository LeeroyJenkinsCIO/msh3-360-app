import React from 'react';

/**
 * Card Component
 * Reusable card with consistent styling across the app
 * 
 * Props:
 * - children: Content inside the card
 * - borderColor: 'culture' | 'competencies' | 'execution' | 'admin' | 'isl' | 'isf' | 'msh-blue' | 'msh-purple' | 'msh-indigo'
 * - className: Additional classes
 * - noPadding: Remove default padding
 * - onClick: Make card clickable
 */

const Card = ({ 
  children, 
  borderColor = null, 
  className = '', 
  noPadding = false,
  onClick = null 
}) => {
  const borderColors = {
    // Domain colors (MSH³ Framework)
    culture: 'border-t-culture',
    competencies: 'border-t-competencies',
    execution: 'border-t-execution',
    
    // Role colors
    admin: 'border-t-admin',
    isl: 'border-t-isl',
    isf: 'border-t-isf',
    
    // Brand colors
    'msh-blue': 'border-t-msh-blue',
    'msh-purple': 'border-t-msh-purple',
    'msh-indigo': 'border-t-msh-indigo',
  };

  const borderClass = borderColor ? `border-t-card-top ${borderColors[borderColor]}` : '';
  const paddingClass = noPadding ? '' : 'p-card';
  const clickableClass = onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : '';

  return (
    <div 
      className={`bg-white rounded-card shadow-card ${borderClass} ${paddingClass} ${clickableClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;