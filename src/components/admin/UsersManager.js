import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    role: 'ISF-SME',
    pillar: 'Infrastructure',
    reportsTo: '',
    status: 'active'
  });

  const ROLES = [
    'Admin',
    'ISL-Pillar Leadership',
    'ISL-Principal',
    'ISL-Contributing Executive',
    'ISF-Supervisor',
    'ISF-SME'
  ];

  const PILLARS = [
    'ISE (IS Executive)',
    'Risk & Governance',
    'Data Services',
    'Infrastructure',
    'Service & Support',
    'PMO/CI'
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      usersSnapshot.forEach(docSnap => {
        usersData.push({ id: docSnap.id, ...docSnap.data() });
      });
      usersData.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      role: 'ISF-SME',
      pillar: 'Infrastructure',
      reportsTo: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName || '',
      email: user.email || '',
      role: user.role || 'ISF-SME',
      pillar: user.pillar || 'Infrastructure',
      reportsTo: user.reportsTo || '',
      status: user.status || 'active'
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      role: 'ISF-SME',
      pillar: 'Infrastructure',
      reportsTo: '',
      status: 'active'
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveUser = async () => {
    // Validation
    if (!formData.displayName.trim()) {
      alert('Display Name is required');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      alert('Valid email is required');
      return;
    }

    try {
      const userData = {
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        pillar: formData.pillar,
        reportsTo: formData.reportsTo,
        status: formData.status,
        updatedAt: new Date().toISOString()
      };

      if (editingUser) {
        // Update existing user
        await updateDoc(doc(db, 'users', editingUser.id), userData);
        alert('User updated successfully!');
      } else {
        // Create new user
        // Generate userId from email (remove @ and . for Firebase compatibility)
        const userId = formData.email.split('@')[0].replace(/\./g, '_').toLowerCase();
        
        userData.createdAt = new Date().toISOString();
        
        // Check if userId already exists
        const existingUser = users.find(u => u.id === userId);
        if (existingUser) {
          alert('A user with this email already exists');
          return;
        }

        // Use setDoc to create with specific ID
        await setDoc(doc(db, 'users', userId), userData);
        
        alert('User created successfully! Note: User will need to set up their Firebase authentication separately.');
      }

      handleCloseModal();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + error.message);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${user.displayName}? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'users', user.id));
      alert('User deleted successfully!');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
    }
  };

  const toggleStatus = async (user) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', user.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      loadUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'Admin') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (role?.startsWith('ISL')) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getStatusBadgeColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            <p className="text-sm text-gray-600">Manage users, roles, and organizational hierarchy</p>
          </div>
          <button
            onClick={handleAddUser}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-700 font-medium mb-1">Total Users</div>
            <div className="text-2xl font-bold text-blue-900">{users.length}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="text-sm text-orange-700 font-medium mb-1">ISL Active</div>
            <div className="text-2xl font-bold text-orange-900">
              {users.filter(u => u.role?.startsWith('ISL') && u.status === 'active').length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-700 font-medium mb-1">ISF Active</div>
            <div className="text-2xl font-bold text-green-900">
              {users.filter(u => u.role?.startsWith('ISF') && u.status === 'active').length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-700 font-medium mb-1">Inactive</div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.status === 'inactive').length}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pillar</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reports To</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No users found. Click "Add User" to create the first user.
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const manager = users.find(u => u.id === user.reportsTo);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{user.displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.pillar || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {manager ? manager.displayName : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleStatus(user)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${getStatusBadgeColor(user.status)}`}
                          title="Click to toggle status"
                        >
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleFormChange('displayName', e.target.value)}
                  placeholder="e.g., Robert Johnson"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="e.g., robert.johnson@company.com"
                  disabled={editingUser !== null}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed after user creation</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleFormChange('role', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Pillar */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pillar <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.pillar}
                  onChange={(e) => handleFormChange('pillar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PILLARS.map(pillar => (
                    <option key={pillar} value={pillar}>{pillar}</option>
                  ))}
                </select>
              </div>

              {/* Reports To */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reports To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.reportsTo}
                  onChange={(e) => handleFormChange('reportsTo', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Manager --</option>
                  {users
                    .filter(u => u.id !== editingUser?.id) // Don't show self
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} ({user.role})
                      </option>
                    ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;