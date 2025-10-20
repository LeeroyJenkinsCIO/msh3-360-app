// src/pages/admin/AdminPage.jsx
import React, { useState } from 'react';
import { Database, Users, Shield, Search, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import DatabaseManagement from './DatabaseManagement';
import UserManagement from './UserManagement';
import DatabaseInvestigation from './DatabaseInvestigation';
import AdminCyclesManager from './AdminCyclesManager';

/**
 * Unified Admin Page with Tabs
 * Default: Users tab
 * Tab Order: Users, Database, Cycles, Investigation
 */
function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    {
      id: 'users',
      name: 'Users',
      icon: Users,
      component: UserManagement
    },
    {
      id: 'database',
      name: 'Database',
      icon: Database,
      component: DatabaseManagement
    },
    {
      id: 'cycles',
      name: 'Cycles',
      icon: Calendar,
      component: AdminCyclesManager
    },
    {
      id: 'investigation',
      name: 'Investigation',
      icon: Search,
      component: DatabaseInvestigation
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Admin Header */}
        <Card className="mb-6 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-red-600" />
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              </div>
              <p className="text-gray-600">
                System administration and management
              </p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <Card className="mb-6 p-0">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Tab Content */}
        <div className="transition-opacity duration-200">
          {ActiveComponent && <ActiveComponent />}
        </div>

      </div>
    </div>
  );
}

export default AdminPage;