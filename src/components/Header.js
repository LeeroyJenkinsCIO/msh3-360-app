import React from 'react';
import { Route, LogOut } from 'lucide-react';

const Header = ({ currentUser, activePage, onNavigate, onLogout }) => {
  return (
    <div className="bg-white border-b-2 border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <Route className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MSH³ 360</h1>
              <p className="text-xs text-gray-600">Mindset | Skillset | Habits</p>
            </div>
          </div>

          {/* User Profile and Logout */}
          {currentUser && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{currentUser.displayName}</div>
                <div className="text-xs text-gray-600">{currentUser.title || 'Team Member'}</div>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {currentUser.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        {currentUser && (
          <div className="flex gap-2 -mb-0.5">
            <button
              onClick={() => onNavigate('adhoc')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activePage === 'adhoc'
                  ? 'text-white bg-blue-600 rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t-lg'
              }`}
            >
              Ad Hoc Assessments
            </button>
            <button
              onClick={() => onNavigate('history')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activePage === 'history'
                  ? 'text-white bg-blue-600 rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t-lg'
              }`}
            >
              Assessment History
            </button>
            <button
              onClick={() => onNavigate('projects')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activePage === 'projects'
                  ? 'text-white bg-blue-600 rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t-lg'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activePage === 'admin'
                  ? 'text-white bg-blue-600 rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t-lg'
              }`}
            >
              Admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;