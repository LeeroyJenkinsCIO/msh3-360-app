import React, { useState } from 'react';
import { Settings, Users, Briefcase, List, FolderKanban } from 'lucide-react';
import Header from '../components/Header';
import UsersManager from '../components/admin/UsersManager';
import RolesManager from '../components/admin/RolesManager';
import PillarsManager from '../components/admin/PillarsManager';
import ProjectsManager from '../components/admin/ProjectsManager';

const AdminPage = ({ currentUserId, currentUser, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser} 
        activePage="admin"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <p className="text-gray-600">Manage users, roles, and assessment configuration</p>
        </div>

        {/* Admin Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5 mr-2" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'roles'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Briefcase className="w-5 h-5 mr-2" />
                Roles
              </button>
              <button
                onClick={() => setActiveTab('pillars')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'pillars'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <List className="w-5 h-5 mr-2" />
                Assessment Pillars
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'projects'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FolderKanban className="w-5 h-5 mr-2" />
                Projects
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && <UsersManager />}
            {activeTab === 'roles' && <RolesManager />}
            {activeTab === 'pillars' && <PillarsManager />}
            {activeTab === 'projects' && <ProjectsManager currentUser={currentUser} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;