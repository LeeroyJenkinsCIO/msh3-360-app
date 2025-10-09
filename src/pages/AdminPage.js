import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UsersManager from '../components/admin/UsersManager';
import ProjectsManager from '../components/admin/ProjectsManager';

const AdminPage = () => {
  const { user, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Users' },
    { id: 'roles', label: 'Roles' },
    { id: 'pillars', label: 'Pillars' },
    { id: 'projects', label: 'Projects' }
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage users, roles, pillars, and projects</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'users' && <UsersManager />}
        
        {activeTab === 'roles' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Roles Management</h2>
            <p className="text-gray-600">Roles management coming soon...</p>
          </div>
        )}
        
        {activeTab === 'pillars' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pillars Management</h2>
            <p className="text-gray-600">Pillars management coming soon...</p>
          </div>
        )}
        
        {activeTab === 'projects' && <ProjectsManager />}
      </div>
    </div>
  );
};

export default AdminPage;