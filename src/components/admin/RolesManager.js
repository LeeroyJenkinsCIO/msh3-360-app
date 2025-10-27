import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

const RolesManager = () => {
  const [roles, setRoles] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const rolesSnapshot = await getDocs(collection(db, 'roles'));
      const rolesList = rolesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoles(rolesList);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.name.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      await addDoc(collection(db, 'roles'), newRole);
      setIsAdding(false);
      setNewRole({ name: '', description: '' });
      loadRoles();
    } catch (error) {
      console.error('Error adding role:', error);
      alert('Error adding role. Please try again.');
    }
  };

  const handleUpdateRole = async (roleId) => {
    try {
      const roleToUpdate = roles.find(r => r.id === roleId);
      const { id, ...roleData } = roleToUpdate;
      await updateDoc(doc(db, 'roles', roleId), roleData);
      setEditingRole(null);
      loadRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error updating role. Please try again.');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('Are you sure you want to delete this role? Users with this role will need to be updated.')) {
      try {
        await deleteDoc(doc(db, 'roles', roleId));
        loadRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
        alert('Error deleting role. Please try again.');
      }
    }
  };

  const updateRoleField = (roleId, field, value) => {
    setRoles(roles.map(role => 
      role.id === roleId ? { ...role, [field]: value } : role
    ));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Manage Roles</h3>
          <p className="text-sm text-gray-600">Define user roles and permissions</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Role
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-3">Add New Role</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Senior Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Description of the role"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddRole}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Role
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewRole({ name: '', description: '' });
              }}
              className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="text-left py-3 px-4 font-semibold">Role Name</th>
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-right py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center py-8 text-gray-500">
                  No roles found. Click "Add Role" to create your first role.
                </td>
              </tr>
            ) : (
              roles.map(role => (
                <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {editingRole === role.id ? (
                      <input
                        type="text"
                        value={role.name}
                        onChange={(e) => updateRoleField(role.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{role.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingRole === role.id ? (
                      <input
                        type="text"
                        value={role.description || ''}
                        onChange={(e) => updateRoleField(role.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="text-gray-600">{role.description}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editingRole === role.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdateRole(role.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingRole(null);
                            loadRoles();
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingRole(role.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RolesManager;