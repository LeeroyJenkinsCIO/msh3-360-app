// src/pages/admin/CreateUserModal.jsx
import React, { useState, useEffect } from 'react';
import { X, UserPlus, User, Shield, UserCheck } from 'lucide-react';
import { getAllPillars, getSubPillarsForPillar, getAvailableRoles } from '../../utils/firebaseConfig';

function CreateUserModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    layer: '',
    pillar: '',
    subPillar: '',
    pillarRole: '',
    isSupervisor: false,
    isAdmin: false
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Dynamic data from Firebase
  const [pillars, setPillars] = useState([]);
  const [subPillars, setSubPillars] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load configuration data on mount
  useEffect(() => {
    loadConfigData();
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Load sub-pillars when pillar changes
  useEffect(() => {
    if (formData.pillar) {
      loadSubPillars(formData.pillar);
    } else {
      setSubPillars([]);
    }
  }, [formData.pillar]);

  const loadConfigData = async () => {
    try {
      setLoadingConfig(true);
      const [pillarsData, rolesData] = await Promise.all([
        getAllPillars(),
        Promise.resolve(getAvailableRoles())
      ]);
      setPillars(pillarsData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadSubPillars = async (pillarId) => {
    try {
      const subPillarsData = await getSubPillarsForPillar(pillarId);
      setSubPillars(subPillarsData);
    } catch (error) {
      console.error('Error loading sub-pillars:', error);
      setSubPillars([]);
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: '',
      email: '',
      layer: '',
      pillar: '',
      subPillar: '',
      pillarRole: '',
      isSupervisor: false,
      isAdmin: false
    });
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.layer) {
      newErrors.layer = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      setErrors({ submit: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear sub-pillar if pillar changes
      if (field === 'pillar' && value !== prev.pillar) {
        newData.subPillar = '';
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.displayName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John Doe"
                    disabled={saving}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="john.doe@sierranevada.com"
                    disabled={saving}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Email will be used as the unique user ID
                  </p>
                </div>
              </div>
            </div>

            {/* Role and Pillar */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role and Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Layer (Role) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.layer}
                    onChange={(e) => handleChange('layer', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.layer ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving || loadingConfig}
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.displayName}
                      </option>
                    ))}
                  </select>
                  {errors.layer && (
                    <p className="mt-1 text-sm text-red-600">{errors.layer}</p>
                  )}
                </div>

                {/* Pillar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pillar {['ADMIN', 'HRP', 'ISE'].includes(formData.layer) && <span className="text-gray-500 font-normal">(Optional)</span>}
                  </label>
                  <select
                    value={formData.pillar}
                    onChange={(e) => handleChange('pillar', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={saving || loadingConfig}
                  >
                    <option value="">
                      {['ADMIN', 'HRP', 'ISE'].includes(formData.layer) 
                        ? 'No Pillar (Valid for this role)' 
                        : 'Select Pillar'}
                    </option>
                    {pillars.map(pillar => (
                      <option key={pillar.id} value={pillar.id}>
                        {pillar.pillarName}
                      </option>
                    ))}
                  </select>
                  {['ADMIN', 'HRP', 'ISE'].includes(formData.layer) && !formData.pillar && (
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.layer} users typically don't belong to operational pillars
                    </p>
                  )}
                </div>

                {/* Sub-Pillar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-Pillar
                  </label>
                  <select
                    value={formData.subPillar}
                    onChange={(e) => handleChange('subPillar', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={saving || loadingConfig || !formData.pillar || subPillars.length === 0}
                  >
                    <option value="">
                      {!formData.pillar 
                        ? 'Select a pillar first'
                        : subPillars.length === 0
                        ? 'This pillar has no sub-pillars'
                        : 'Select Sub-Pillar (Optional)'
                      }
                    </option>
                    {subPillars.map(subPillar => (
                      <option key={subPillar.id} value={subPillar.id}>
                        {subPillar.name}
                      </option>
                    ))}
                  </select>
                  {formData.pillar && subPillars.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      This pillar has no sub-pillar structure
                    </p>
                  )}
                </div>

                {/* Job Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.pillarRole}
                    onChange={(e) => handleChange('pillarRole', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., HR Partner, Senior Developer, etc."
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
              <div className="space-y-3">
                {/* Supervisor Status */}
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isSupervisor}
                    onChange={(e) => handleChange('isSupervisor', e.target.checked)}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    disabled={saving}
                  />
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Supervisor</div>
                    <div className="text-sm text-gray-600">
                      Can manage direct reports and view their assessments
                    </div>
                  </div>
                </label>

                {/* Admin Status */}
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={(e) => handleChange('isAdmin', e.target.checked)}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    disabled={saving}
                  />
                  <Shield className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">System Administrator</div>
                    <div className="text-sm text-gray-600">
                      Full system access including user management and configuration
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create User
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateUserModal;