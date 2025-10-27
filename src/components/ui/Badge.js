// 📁 SAVE TO: src/components/ui/Badge.js
// Badge component with role-based color variants

import React from 'react';

const Badge = ({ children, variant = 'default', className = '' }) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variantStyles = {
    // Role-specific colors (MSH³ Color Scheme)
    danger: 'bg-red-100 text-red-800 border border-red-200',           // 🔴 Admin - RED
    secondary: 'bg-gray-100 text-gray-800 border border-gray-200',     // ⚪ ISE - GRAY
    purple: 'bg-purple-100 text-purple-800 border border-purple-200',  // 🟣 ISL - PURPLE
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200', // 🟡 Supervisor - YELLOW
    success: 'bg-green-100 text-green-800 border border-green-200',    // 🟢 ISF - GREEN
    info: 'bg-orange-100 text-orange-800 border border-orange-200',    // 🟠 HRP - ORANGE
    
    // Additional variants for other uses
    default: 'bg-gray-100 text-gray-800 border border-gray-200',
    primary: 'bg-blue-100 text-blue-800 border border-blue-200',       // Generic blue
    admin: 'bg-red-100 text-red-800 border border-red-200',            // Alias for danger
  };

  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span className={`${baseStyles} ${styles} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;