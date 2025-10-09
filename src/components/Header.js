import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { PERMISSIONS } from '../utils/permissions';

export default function Header() {
  const { user, permissions, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Get role badge color - matches login button colors
  const getRoleBadgeColor = () => {
    const role = user?.role?.toLowerCase();
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white'; // Red like Admin Login
      case 'ise':
        return 'bg-blue-500 text-white'; // Blue like ISE Login
      case 'isl':
        return 'bg-orange-500 text-white'; // Orange like ISL Login
      case 'isf':
        return 'bg-green-500 text-white'; // Green like ISF Login
      case 'projectlead':
        return 'bg-yellow-500 text-white'; // Yellow/Orange like Project Lead Login
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Navigation items based on permissions
  const getNavItems = () => {
    const items = [
      { path: '/dashboard', label: 'Dashboard', show: true },
      { path: '/assessment', label: 'Quick Align', show: true },
      { path: '/assessment-history', label: 'History', show: true },
      { 
        path: '/projects', 
        label: 'Projects', 
        show: permissions?.[PERMISSIONS.VIEW_PROJECT_ASSESSMENTS]
      },
      { path: '/is-os', label: 'IS-OS', show: true },
      { 
        path: '/admin', 
        label: 'Admin', 
        show: permissions?.[PERMISSIONS.ACCESS_ADMIN_PANEL]
      },
    ];

    return items.filter(item => item.show);
  };

  const navItems = getNavItems();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center flex-shrink-0">
            <Logo size="small" />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2 flex-grow justify-center">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Role Badge */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${getRoleBadgeColor()}`}>
              {user?.role?.toUpperCase()}
            </div>
            
            {/* User Name */}
            <div className="text-sm font-medium text-gray-700">
              {user?.name || user?.displayName || user?.email}
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}