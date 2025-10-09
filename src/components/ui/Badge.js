import React from 'react';

/**
 * Badge Component
 * Consistent badge/pill styling for status indicators, roles, etc.
 * 
 * Props:
 * - children: Badge text
 * - color: 'culture' | 'competencies' | 'execution' | 'admin' | 'isl' | 'isf' | 'success' | 'neutral'
 * - size: 'sm' | 'md' | 'lg'
 * - className: Additional classes
 */

const Badge = ({ 
  children, 
  color = 'neutral', 
  size = 'md',
  className = '' 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const colors = {
    // Domain colors (MSH³ Framework)
    culture: 'bg-culture-light text-culture-dark',
    competencies: 'bg-competencies-light text-competencies-dark',
    execution: 'bg-execution-light text-execution-dark',
    
    // Role colors
    admin: 'bg-admin-light text-admin-dark',
    isl: 'bg-isl-light text-isl-dark',
    isf: 'bg-isf-light text-isf-dark',
    
    // Status mappings using theme colors
    success: 'bg-execution-light text-execution-dark',  // Maps to execution (green)
    neutral: 'bg-neutral-light text-neutral-dark',       // Custom neutral from theme
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };
  
  const colorClass = colors[color] || colors.neutral;
  const sizeClass = sizes[size] || sizes.md;
  
  return (
    <span className={`${baseClasses} ${colorClass} ${sizeClass} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;