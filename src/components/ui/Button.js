import React from 'react';

/**
 * Button Component
 * Consistent button styling across the app
 * 
 * Props:
 * - children: Button text/content
 * - variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'admin' | 'isl' | 'isf'
 * - size: 'sm' | 'md' | 'lg'
 * - icon: Optional icon component
 * - onClick: Click handler
 * - disabled: Disabled state
 * - className: Additional classes
 */

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon = null,
  onClick,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-msh-blue text-white hover:bg-msh-blue/90',
    secondary: 'bg-neutral-light text-neutral-dark hover:bg-neutral-light/80',
    danger: 'bg-danger text-white hover:bg-danger-dark',
    ghost: 'bg-transparent text-neutral-dark hover:bg-neutral-light',
    
    // Role-specific variants
    admin: 'bg-admin text-white hover:bg-admin-dark',
    isl: 'bg-isl text-white hover:bg-isl-dark',
    isf: 'bg-isf text-white hover:bg-isf-dark',
    
    // Domain variants
    culture: 'bg-culture text-white hover:bg-culture-dark',
    competencies: 'bg-competencies text-white hover:bg-competencies-dark',
    execution: 'bg-execution text-white hover:bg-execution-dark',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;
  const iconGap = icon ? 'gap-2' : '';
  
  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${iconGap} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;