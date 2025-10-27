// src/pages/admin/EditUserModal.jsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Lock } from 'lucide-react';

export default function EditUserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    pillarRole: '',
    isSupervisor: false,
    isAdmin: false
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        pillarRole: user.pillarRole || user.jobTitle || '',
        isSupervisor: user.isSupervisor || user.flags?.isSupervisor || false,
        isAdmin: user.isAdmin || user.flags?.isAdmin || false
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is required';
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
      // Prepare data for save - preserve existing fields that aren't editable
      const updateData = {
        displayName: formData.displayName,
        email: user.email, // Keep original email
        layer: user.layer, // Keep original layer
        pillar: user.pillar || null, // Keep original pillar
        subPillar: user.subPillar || null, // Keep original subPillar
        pillarRole: formData.pillarRole || null,
        jobTitle: formData.pillarRole || null, // Sync both fields
        directReportIds: user.directReportIds || [],
        isSupervisor: formData.isSupervisor,
        isAdmin: formData.isAdmin
      };

      await onSave(user.id, updateData);
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

        {/* Warning Banner */}
        <div className="mx-6 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-yellow-900 text-sm mb-1">Limited Edit Mode</div>
              <div className="text-xs text-yellow-800">
                Only safe fields can be edited here. Role, Pillar, and Sub-Pillar changes require admin approval 
                to prevent affecting published MSH assessments. Contact system administrator for structural changes.
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Editable Fields */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Editable Information</h3>
              
              <div className="space-y-4">
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
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.pillarRole}
                    onChange={(e) => handleChange('pillarRole', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter job title..."
                    disabled={saving}
                  />
                  <p className="mt-1 text-xs text-gray-500">Professional title or role description</p>
                </div>
              </div>
            </div>

            {/* Permissions */}
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

            {/* Read-Only Fields */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <span>Protected Fields</span>
                <span className="text-xs font-normal text-gray-500">(Read Only)</span>
              </h3>
              
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Email is the user's unique identifier and cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role / Layer
                  </label>
                  <input
                    type="text"
                    value={user.layer || 'Not Set'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Role changes affect assessment eligibility - contact admin
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pillar
                  </label>
                  <input
                    type="text"
                    value={user.pillar || 'Not Assigned'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Pillar assignment affects published MSH assessments - contact admin
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-Pillar
                  </label>
                  <input
                    type="text"
                    value={user.subPillar || user.derivedSubPillar || 'Not Assigned'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Sub-pillar membership managed by pillar leaders
                  </p>
                </div>
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
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}