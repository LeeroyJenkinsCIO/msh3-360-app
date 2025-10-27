import React from 'react';

/**
 * StatCard Component
 * Displays a KPI/metric with solid colored fill
 * Can use preset colors or custom hex colors
 * 
 * Props:
 * - label: Stat label/description
 * - value: The stat value (number or string)
 * - subtext: Optional subtext below value (e.g., "of 6")
 * - borderColor: Color variant OR 'custom'
 * - customColor: Hex color when borderColor is 'custom'
 * - className: Additional classes
 */

const StatCard = ({ 
  label, 
  value,
  subtext = null,
  borderColor = 'msh-blue',
  customColor = null,
  className = '' 
}) => {
  // Map colors to stronger background fills that match design system
  const getColorClasses = () => {
    // If custom color provided, return empty classes (we'll use inline styles)
    if (borderColor === 'custom' && customColor) {
      return '';
    }
    
    const colorMap = {
      'msh-blue': 'bg-blue-500 text-white border-blue-600',
      'culture': 'bg-teal-500 text-white border-teal-600',
      'competencies': 'bg-orange-500 text-white border-orange-600',
      'execution': 'bg-green-500 text-white border-green-600',
      'msh-indigo': 'bg-indigo-500 text-white border-indigo-600',
      'msh-purple': 'bg-purple-500 text-white border-purple-600',
      'neutral': 'bg-gray-400 text-white border-gray-500',
      'admin': 'bg-red-500 text-white border-red-600',
    };
    
    return colorMap[borderColor] || colorMap['msh-blue'];
  };

  // Get inline styles for custom colors
  const getCustomStyles = () => {
    if (borderColor === 'custom' && customColor) {
      return {
        backgroundColor: customColor,
        borderColor: customColor,
        color: 'white'
      };
    }
    return {};
  };

  return (
    <div 
      className={`rounded-card border-2 ${getColorClasses()} p-4 text-center shadow-sm ${className}`}
      style={getCustomStyles()}
    >
      <div className="text-xs font-medium opacity-90 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {subtext && <div className="text-xs font-medium opacity-90 mt-1">{subtext}</div>}
    </div>
  );
};

export default StatCard;