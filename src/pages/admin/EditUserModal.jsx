// src/pages/admin/EditUserModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { updateUser } from '../../utils/firebaseUsers';
import { getAllPillars, getSubPillarsForPillar } from '../../utils/firebaseConfig';

export default function EditUserModal({ user, onClose, onSave }) {
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

  const [pillars, setPillars] = useState([]);
  const [subPillars, setSubPillars] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load pillars on mount
  useEffect(() => {
    async function loadPillars() {
      try {
        const pillarData = await getAllPillars();
        setPillars(pillarData);
      } catch (error) {
        console.error('Error loading pillars:', error);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadPillars();
  }, []);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        layer: user.layer || '',
        pillar: user.pillar || '',
        subPillar: user.subPillar || '',
        pillarRole: user.pillarRole || '',
        isSupervisor: user.isSupervisor || user.flags?.isSupervisor || false,
        isAdmin: user.isAdmin || user.flags?.isAdmin || false
      });
    }
  }, [user]);

  // Load sub-pillars when pillar changes
  useEffect(() => {
    async function loadSubPillars() {
      if (formData.pillar) {
        try {
          const subPillarData = await getSubPillarsForPillar(formData.pillar);
          setSubPillars(subPillarData);
        } catch (error) {
          console.error('Error loading sub-pillars:', error);
          setSubPillars([]);
        }
      } else {
        setSubPillars([]);
      }
    }
    loadSubPillars();
  }, [formData.pillar]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Clear pillar/subPillar when role changes to ADMIN, HRP, or ISE
    if (field === 'layer' && ['ADMIN', 'HRP', 'ISE'].includes(value)) {
      setFormData(prev => ({ 
        ...prev, 
        layer: value,
        pillar: '', 
        subPillar: '' 
      }));
      // Clear pillar errors for these roles
      setErrors(prev => ({ 
        ...prev, 
        pillar: null,
        subPillar: null 
      }));
    }

    // Clear subPillar when pillar changes
    if (field === 'pillar') {
      setFormData(prev => ({ ...prev, subPillar: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is required';
    }
    
    if (!formData.layer) {
      newErrors.layer = 'Role is required';
    }

    // Pillar validation - only required for ISL and ISF roles
    if (!formData.pillar && ['ISL', 'ISF'].includes(formData.layer)) {
      newErrors.pillar = 'Pillar is required for ISL and ISF roles';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      // Let parent handle the Firebase update
      await onSave(user.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {user?.displayName?.charAt(0) || '?'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.displayName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John Doe"
                    disabled={saving}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed for security reasons</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role and Assignment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.layer}
                    onChange={(e) => handleChange('layer', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.layer ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  >
                    <option value="">Select role...</option>
                    <option value="ADMIN">ADMIN - System Administrator</option>
                    <option value="ISE">ISE - Executive Leadership</option>
                    <option value="ISL">ISL - Leader</option>
                    <option value="ISF">ISF - Individual Contributor</option>
                    <option value="HRP">HRP - HR Partner</option>
                  </select>
                  {errors.layer && (
                    <p className="mt-1 text-sm text-red-600">{errors.layer}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pillar {['ADMIN', 'HRP', 'ISE'].includes(formData.layer) && <span className="text-gray-500 font-normal">(Optional for {formData.layer})</span>}
                  </label>
                  <select
                    value={formData.pillar}
                    onChange={(e) => handleChange('pillar', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.pillar && !['ADMIN', 'HRP', 'ISE'].includes(formData.layer) ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving || loadingConfig}
                  >
                    <option value="">
                      {['ADMIN', 'HRP', 'ISE'].includes(formData.layer) 
                        ? 'No Pillar (Valid for this role)'
                        : 'Select pillar...'}
                    </option>
                    {pillars.map(pillar => (
                      <option key={pillar.id} value={pillar.id}>
                        {pillar.name}
                      </option>
                    ))}
                  </select>
                  {errors.pillar && !['ADMIN', 'HRP', 'ISE'].includes(formData.layer) && (
                    <p className="mt-1 text-sm text-red-600">{errors.pillar}</p>
                  )}
                  {['ADMIN', 'HRP', 'ISE'].includes(formData.layer) && (
                    <p className="mt-1 text-sm text-gray-500">This role does not require pillar assignment</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-Pillar
                  </label>
                  <select
                    value={formData.subPillar}
                    onChange={(e) => handleChange('subPillar', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!formData.pillar || saving || loadingConfig}
                  >
                    <option value="">
                      {!formData.pillar 
                        ? 'Select a pillar first...'
                        : subPillars.length === 0
                        ? 'This pillar has no sub-pillars'
                        : 'Select sub-pillar...'}
                    </option>
                    {subPillars.map(subPillar => (
                      <option key={subPillar.id} value={subPillar.id}>
                        {subPillar.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    {!formData.pillar 
                      ? 'Sub-pillar options will appear after selecting a pillar'
                      : 'This pillar has no sub-pillar structure - this is normal for some organizational units'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.pillarRole || ''}
                    onChange={(e) => handleChange('pillarRole', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter job title..."
                    disabled={saving}
                  />
                  <p className="mt-1 text-sm text-gray-500">Professional title or role in the organization</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isSupervisor}
                    onChange={(e) => handleChange('isSupervisor', e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={saving}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">Supervisor</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Can manage direct reports and view their assessments
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={(e) => handleChange('isAdmin', e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={saving}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">System Administrator</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Full system access including user management and configuration
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving || loadingConfig}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}