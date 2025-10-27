// 📁 SAVE TO: src/components/MainLayout.js
// Main application layout with navigation and authentication
// ✅ UPDATED: Added clickable logo with role-based smart navigation

import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Badge from './ui/Badge';

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // ✅ NEW: Smart logo navigation based on user role
  const handleLogoClick = () => {
    if (isAdmin) {
      navigate('/admin');
    } else if (isHRP) {
      navigate('/isos-org');
    } else {
      navigate('/is-os');  // Default to ISOS Hub
    }
  };

  const pillarDisplayNames = {
    'executive': 'Executive',
    'risk_governance': 'Risk & Governance',
    'data_services': 'Data Services',
    'infrastructure': 'Systems & Infrastructure',
    'service_support': 'Service & Support',
    'pmo_ci': 'PMO/CI',
    'admin': 'Admin'
  };

  // Check if user is admin
  const isAdmin = user?.flags?.isAdmin || user?.role === 'admin';
  
  // Check if user is HRP
  const isHRP = user?.role?.toLowerCase() === 'hrp' || user?.flags?.isHRP || user?.layer?.toLowerCase() === 'hrp';

  // Define navigation items
  const navItems = [
    {
      name: 'MSH Wiki',
      path: '/wiki',
      showForAll: true,
      hideForAdmin: true,
      showForHRP: true
    },
    {
      name: 'Quick Align',
      path: '/quick-align',
      showForAll: true,
      hideForAdmin: true,
      showForHRP: false
    },
    {
      name: 'ISOS Hub',
      path: '/is-os',
      showForAll: true,
      hideForAdmin: true,
      showForHRP: true
    },
    {
      name: 'ISOS Org',
      path: '/isos-org',
      showForAll: true,
      hideForAdmin: true,
      showForHRP: true
    },
    {
      name: 'Projects',
      path: '/projects',
      showForAll: true,
      hideForAdmin: true,
      showForHRP: false
    },
    {
      name: 'Assessment History',
      path: '/is-os/assessments/history',
      showForAll: true,
      hideForAdmin: true,
      showForHRP: false
    },
    {
      name: 'Admin',
      path: '/admin',
      showForAll: false,
      requireAdmin: true,
      showForHRP: false
    }
  ];

  // Filter navigation items based on user role
  const accessibleNavItems = navItems.filter(item => {
    // Admin-only items
    if (item.requireAdmin) {
      return isAdmin;
    }
    
    // Items hidden from admin
    if (item.hideForAdmin && isAdmin) {
      return false;
    }
    
    // HRP-specific filtering
    if (isHRP) {
      return item.showForHRP === true;
    }
    
    // Show all other items marked showForAll
    if (item.showForAll) return true;
    
    return false;
  });

  // COLOR SCHEME FOR ROLE BADGES (Consistent across entire app)
  // ================================================================
  // 🔴 ADMIN      → Red       (variant: 'danger')
  // ⚪ ISE        → Gray      (variant: 'secondary')
  // 🟣 ISL        → Purple    (variant: 'purple')
  // 🟡 SUPERVISOR → Yellow    (variant: 'warning')
  // 🟢 ISF        → Green     (variant: 'success')
  // 🟠 HRP        → Orange    (variant: 'info')
  // ================================================================
  // PRIORITY: Supervisor flag > Admin flag > HRP > Layer
  const getBadgeVariant = (userRole) => {
    // Check supervisor flag first (overrides layer)
    if (user?.flags?.isSupervisor) {
      return 'warning';  // 🟡 Yellow
    }
    
    // Check admin
    if (user?.flags?.isAdmin || userRole?.toLowerCase() === 'admin') {
      return 'danger';   // 🔴 Red
    }
    
    // Check HRP
    if (userRole?.toLowerCase() === 'hrp' || user?.flags?.isHRP) {
      return 'info';     // 🟠 Orange
    }
    
    // Then check layer
    switch(userRole?.toLowerCase()) {
      case 'ise':
        return 'secondary';   // ⚪ Gray
      case 'isl':
        return 'purple';      // 🟣 Purple
      case 'isf':
        return 'success';     // 🟢 Green
      default:
        return 'secondary';
    }
  };

  // Get display text for badge
  const getBadgeText = () => {
    if (user?.flags?.isSupervisor) return 'SUPERVISOR';
    if (user?.flags?.isAdmin) return 'ADMIN';
    if (user?.flags?.isHRP || user?.layer === 'HRP') return 'HRP';
    return (user?.layer || user?.role || 'USER').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* ✅ UPDATED: Clickable logo with smart navigation */}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLogoClick}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-msh-blue focus:ring-offset-2 rounded-lg p-1"
                aria-label="Navigate to home"
              >
                <svg className="w-8 h-8 text-msh-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <h1 className="text-xl font-bold text-neutral-dark">
                    MSH<sup className="text-sm">3</sup>
                  </h1>
                  <p className="text-xs text-neutral leading-none">
                    Mindset | Skillset | Habits
                  </p>
                </div>
              </button>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              {accessibleNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-msh-blue text-white'
                        : 'text-neutral-dark hover:bg-gray-100'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Badge 
                variant={getBadgeVariant(user?.layer || user?.role)}
                className="hidden sm:block uppercase text-xs"
              >
                {getBadgeText()}
              </Badge>

              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-neutral-dark">
                  {user?.displayName || user?.name || user?.email}
                </div>
                {user?.pillar && user?.pillar !== 'admin' && !isAdmin && (
                  <div className="text-xs text-neutral">
                    {pillarDisplayNames[user.pillar] || user.pillar}
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden pb-3 flex gap-2 overflow-x-auto">
            {accessibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-msh-blue text-white'
                      : 'text-neutral-dark hover:bg-gray-100'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-neutral">
              <span className="font-semibold text-neutral-dark">
                Sierra Nevada Brewing Co.
              </span>
              {' • '}
              Information Systems
            </div>
            <div className="text-xs text-neutral">
              © {new Date().getFullYear()} Sierra Nevada Brewing Co. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;