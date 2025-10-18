// src/pages/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Search, Shield, User, UserCheck, Edit2, Users as UsersIcon, UserPlus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EditUserModal from './EditUserModal';
import CreateUserModal from './CreateUserModal';
import { useToast } from '../../components/ui/Toast';
import { getAllUsers, createUser, updateUser, getAssessmentCounts, getDirectReportCounts } from '../../utils/firebaseUsers';
import { getAllPillars, formatPillarName, getPillarColor } from '../../utils/firebaseConfig';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [layerFilter, setLayerFilter] = useState('all');
  const [pillarFilter, setPillarFilter] = useState('all');
  
  // Assessment and direct report counts
  const [assessmentCounts, setAssessmentCounts] = useState({});
  const [directReportCounts, setDirectReportCounts] = useState({});
  
  // Pillars from Firebase
  const [pillars, setPillars] = useState([]);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Toast notifications
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, layerFilter, pillarFilter, users]);

  // NEW: Derive sub-pillar membership from pillars collection
  const deriveUserSubPillars = (users, pillars) => {
    const userSubPillarMap = {};
    
    pillars.forEach(pillar => {
      if (pillar.subPillars && typeof pillar.subPillars === 'object') {
        Object.keys(pillar.subPillars).forEach(subPillarKey => {
          const subPillar = pillar.subPillars[subPillarKey];
          const subPillarName = subPillar.name || subPillarKey;
          
          if (subPillar.memberIds && Array.isArray(subPillar.memberIds)) {
            subPillar.memberIds.forEach(memberId => {
              userSubPillarMap[memberId] = subPillarName;
            });
          }
        });
      }
    });
    
    return users.map(user => ({
      ...user,
      derivedSubPillar: userSubPillarMap[user.userId] || user.subPillar || null
    }));
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      
      // Load pillars first
      const pillarsData = await getAllPillars();
      setPillars(pillarsData);
      
      // Derive sub-pillars from pillar membership
      const enrichedUsers = deriveUserSubPillars(data, pillarsData);
      
      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers);
      
      // Load assessment counts
      const assessments = await getAssessmentCounts();
      setAssessmentCounts(assessments);
      
      // Calculate direct report counts (synchronous)
      const directReports = getDirectReportCounts(enrichedUsers);
      setDirectReportCounts(directReports);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast(`Error loading users: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (layerFilter !== 'all') {
      filtered = filtered.filter(user => user.layer === layerFilter);
    }

    if (pillarFilter !== 'all') {
      filtered = filtered.filter(user => user.pillar === pillarFilter);
    }

    setFilteredUsers(filtered);
  };

  const getHubView = (user) => {
    const { layer, flags = {} } = user;

    if (flags.isAdmin) {
      return { name: 'Admin Panel', icon: '🔴', color: 'text-red-700', bgColor: 'bg-red-50' };
    }
    
    if (flags.isSupervisor) {
      return { name: 'ISF Supervisor Hub', icon: '🟡', color: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    }
    
    if (layer === 'HRP' || flags.isHRP) {
      return { name: 'HRP Hub', icon: '🟣', color: 'text-purple-700', bgColor: 'bg-purple-50' };
    }
    
    if (layer === 'ISE' || flags.isExecutive) {
      return { name: 'ISE Hub', icon: '🔵', color: 'text-blue-700', bgColor: 'bg-blue-50' };
    }
    
    if (layer === 'ISL' || flags.isPillarLeader) {
      return { name: 'ISL Hub', icon: '🔷', color: 'text-indigo-700', bgColor: 'bg-indigo-50' };
    }
    
    if (layer === 'ISF') {
      return { name: 'ISF Hub', icon: '🟢', color: 'text-green-700', bgColor: 'bg-green-50' };
    }
    
    return { name: 'Unknown Hub', icon: '⚪', color: 'text-gray-700', bgColor: 'bg-gray-50' };
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleCreateUser = async (userData) => {
    try {
      const userId = await createUser(userData);
      await loadUsers();
      
      showToast(
        `User "${userData.displayName}" created successfully!`,
        'success',
        {
          details: [
            `Email: ${userData.email}`,
            `Role: ${userData.layer}`,
            `User ID: ${userId}`
          ],
          duration: 5000
        }
      );
    } catch (error) {
      console.error('Error creating user:', error);
      showToast(`Failed to create user: ${error.message}`, 'error');
      throw error;
    }
  };

  const getChangedFields = (originalUser, updatedData) => {
    const changes = [];
    
    if (originalUser.displayName !== updatedData.displayName) {
      changes.push(`Name: ${originalUser.displayName} → ${updatedData.displayName}`);
    }
    if (originalUser.layer !== updatedData.layer) {
      changes.push(`Role: ${originalUser.layer} → ${updatedData.layer}`);
    }
    if (originalUser.pillar !== updatedData.pillar) {
      const oldPillar = formatPillarName(originalUser.pillar, pillars) || 'None';
      const newPillar = formatPillarName(updatedData.pillar, pillars) || 'None';
      changes.push(`Pillar: ${oldPillar} → ${newPillar}`);
    }
    if (originalUser.subPillar !== updatedData.subPillar) {
      changes.push(`Sub-Pillar: ${originalUser.subPillar || 'None'} → ${updatedData.subPillar || 'None'}`);
    }
    if ((originalUser.pillarRole || originalUser.jobTitle) !== (updatedData.pillarRole || updatedData.jobTitle)) {
      const oldTitle = originalUser.pillarRole || originalUser.jobTitle || 'None';
      const newTitle = updatedData.pillarRole || updatedData.jobTitle || 'None';
      changes.push(`Job Title: ${oldTitle} → ${newTitle}`);
    }
    
    const oldSupervisor = originalUser.isSupervisor || originalUser.flags?.isSupervisor || false;
    if (oldSupervisor !== updatedData.isSupervisor) {
      changes.push(`Supervisor: ${oldSupervisor ? 'Yes' : 'No'} → ${updatedData.isSupervisor ? 'Yes' : 'No'}`);
    }
    
    const oldAdmin = originalUser.isAdmin || originalUser.flags?.isAdmin || false;
    if (oldAdmin !== updatedData.isAdmin) {
      changes.push(`Admin: ${oldAdmin ? 'Yes' : 'No'} → ${updatedData.isAdmin ? 'Yes' : 'No'}`);
    }
    
    return changes;
  };

  const handleSaveUser = async (userId, userData) => {
    try {
      const originalUser = users.find(u => u.id === userId);
      const changes = getChangedFields(originalUser, userData);
      
      await updateUser(userId, userData);
      await loadUsers();
      
      if (changes.length > 0) {
        showToast(
          `User "${userData.displayName}" updated successfully!`,
          'success',
          {
            details: changes,
            duration: 6000
          }
        );
      } else {
        showToast(`User "${userData.displayName}" saved (no changes detected)`, 'info');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showToast(`Failed to update user: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
  };

  const getLayerBadgeColor = (layer) => {
    switch (layer) {
      case 'ISE':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'ISL':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'ISF':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'HRP':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPillarTextColor = (pillarId) => {
    const color = getPillarColor(pillarId, pillars);
    return 'text-gray-900';
  };

  const getPillarDisplayName = (pillarId) => {
    if (!pillarId) return '—';
    
    const legacyPillarNames = {
      'admin': 'System Admin',
      'executive': 'Executive Leadership',
      'hrp': 'HR Partner'
    };
    
    if (legacyPillarNames[pillarId]) {
      return `⚠️ ${legacyPillarNames[pillarId]}`;
    }
    
    const pillarName = formatPillarName(pillarId, pillars);
    
    if (pillarName && pillarName !== pillarId) {
      return pillarName;
    }
    
    return `⚠️ ${pillarId}`;
  };

  const getPillarsManaged = (userId) => {
    return pillars.filter(p => p.pillarLeaderId === userId);
  };

  const getAssessmentCount = (userId, type) => {
    const counts = assessmentCounts[userId];
    if (!counts) return 0;
    return type === 'assessor' ? counts.asAssessor : counts.asAssessed;
  };

  const getDirectReportCount = (userId) => {
    return directReportCounts[userId] || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const adminUsers = users.filter(u => 
    u.flags?.isAdmin === true || 
    u.isAdmin === true || 
    u.layer === 'ADMIN'
  ).length;
  const iseUsers = users.filter(u => u.layer === 'ISE').length;
  const islUsers = users.filter(u => u.layer === 'ISL').length;
  const isfUsers = users.filter(u => u.layer === 'ISF').length;
  const isfSupervisors = users.filter(u => 
    u.layer === 'ISF' && (
      u.flags?.isSupervisor === true || 
      u.isSupervisor === true ||
      (u.directReportIds && u.directReportIds.length > 0)
    )
  ).length;
  const hrpUsers = users.filter(u => u.layer === 'HRP').length;

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>
            <p className="text-gray-600">
              Manage system users, roles, and permissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setCreateModalOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadUsers}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-600">{iseUsers}</div>
              <div className="text-sm text-gray-600">ISE Users</div>
            </div>
            <User className="w-10 h-10 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-purple-600">{islUsers}</div>
              <div className="text-sm text-gray-600">ISL Users</div>
            </div>
            <User className="w-10 h-10 text-purple-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600">{isfUsers}</div>
              <div className="text-sm text-gray-600">ISF Users</div>
              <div className="text-xs text-indigo-600 font-medium mt-1">
                ({isfSupervisors} of {isfUsers} {isfSupervisors !== 1 ? 'are' : 'is'} Supervisor{isfSupervisors !== 1 ? 's' : ''})
              </div>
            </div>
            <User className="w-10 h-10 text-green-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-red-600">{adminUsers}</div>
              <div className="text-sm text-gray-600">Admin Users</div>
            </div>
            <Shield className="w-10 h-10 text-red-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-orange-600">{hrpUsers}</div>
              <div className="text-sm text-gray-600">HRP Users</div>
            </div>
            <User className="w-10 h-10 text-orange-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Type
            </label>
            <select
              value={layerFilter}
              onChange={(e) => setLayerFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="ISE">ISE</option>
              <option value="ISL">ISL</option>
              <option value="ISF">ISF</option>
              <option value="HRP">HRP</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pillar
            </label>
            <select
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Pillars</option>
              {pillars.map(pillar => (
                <option key={pillar.id} value={pillar.id}>
                  {pillar.pillarName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Users</h2>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No users found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Name</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Role</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Hub View</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Pillar</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Sub-Pillar</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Job Title</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <UsersIcon className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Given</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Rec'd</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap bg-blue-50 sticky right-0">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const directReports = getDirectReportCount(user.id);
                  const assessmentsGiven = getAssessmentCount(user.id, 'assessor');
                  const assessmentsReceived = getAssessmentCount(user.id, 'assessed');
                  const pillarsManaged = getPillarsManaged(user.id);
                  const hubView = getHubView(user);
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 text-sm">{user.displayName}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getLayerBadgeColor(user.layer)}`}>
                          {user.layer}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${hubView.bgColor}`}>
                          <span className="text-base flex-shrink-0">{hubView.icon}</span>
                          <div className="min-w-0">
                            <div className={`text-xs font-medium ${hubView.color} whitespace-nowrap`}>
                              {hubView.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-3 py-3">
                        <div>
                          <span className={`text-sm font-medium ${getPillarTextColor(user.pillar)}`}>
                            {getPillarDisplayName(user.pillar)}
                          </span>
                          {user.layer === 'ISE' && pillarsManaged.length > 0 && (
                            <div className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              <span className="truncate">
                                Leads: {pillarsManaged.map(p => p.pillarName).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-600">
                          {user.derivedSubPillar || user.subPillar || '—'}
                        </span>
                      </td>
                      
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-600">
                          {user.pillarRole || user.jobTitle || '—'}
                        </span>
                      </td>
                      
                      <td className="px-2 py-3 text-center">
                        {directReports > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <UsersIcon className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-semibold text-indigo-600">{directReports}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      
                      <td className="px-2 py-3 text-center">
                        <span className={`text-sm font-semibold ${assessmentsGiven > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {assessmentsGiven}
                        </span>
                      </td>
                      
                      <td className="px-2 py-3 text-center">
                        <span className={`text-sm font-semibold ${assessmentsReceived > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {assessmentsReceived}
                        </span>
                      </td>
                      
                      <td className="px-3 py-3 text-center bg-white sticky right-0 shadow-sm">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors whitespace-nowrap font-medium"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-900 mb-2">Hub View Reference</div>
            <div className="text-sm text-blue-800 grid grid-cols-2 gap-x-6 gap-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🔴</span>
                <span>Admin Panel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🟣</span>
                <span>HRP Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🔵</span>
                <span>ISE Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🔷</span>
                <span>ISL Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🟡</span>
                <span>ISF Supervisor Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🟢</span>
                <span>ISF Hub</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => window.location.href = '/admin/cleanup'}
            className="flex items-start gap-4 p-4 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
          >
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 mb-1">Sub-Pillar Data Cleanup</div>
              <div className="text-sm text-gray-600">
                Identify and fix users with legacy or invalid sub-pillar values
              </div>
            </div>
          </button>

          <div className="flex items-start gap-4 p-4 border border-gray-200 bg-gray-50 rounded-lg opacity-50">
            <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 mb-1">Direct Report Manager</div>
              <div className="text-sm text-gray-600">
                Coming Soon: Assign and manage direct report relationships
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <strong className="font-semibold">Coming Soon:</strong> Bulk import and advanced 
            user management features will be added in future updates.
          </div>
        </div>
      </Card>

      {editModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
        />
      )}

      {createModalOpen && (
        <CreateUserModal
          onClose={() => setCreateModalOpen(false)}
          onSave={handleCreateUser}
        />
      )}

    </div>
  );
}

export default UserManagement;