// 📁 SAVE TO: src/components/hubs/PublishConfirmationModal.jsx
// Modal to confirm who you're publishing an assessment for

import React from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

function PublishConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  assesseeName,
  assesseeLayer,
  assesseeSubPillar,
  composite,
  nineBoxPosition,
  alignmentStatus 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Confirm Publication</h3>
              <p className="text-sm text-gray-500">Review before publishing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            You are about to publish the assessment for:
          </p>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {assesseeName?.split(' ').map(n => n[0]).join('') || '?'}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900 mb-1">
                  {assesseeName || 'Unknown'}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {assesseeLayer || 'N/A'}
                  </Badge>
                  {assesseeSubPillar && (
                    <span className="text-sm text-gray-600">
                      {assesseeSubPillar}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Composite Score</span>
              <span className="text-xl font-bold text-blue-600">
                {composite !== null && composite !== undefined ? `${composite}/12` : '—'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">9-Box Position</span>
              <span className="text-sm font-semibold text-gray-900">
                {nineBoxPosition || 'Not Set'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-600">Alignment Status</span>
              {alignmentStatus === 'aligned' ? (
                <Badge variant="success" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Aligned
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Not Aligned
                </Badge>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Once published, this assessment will be visible to the assessee and cannot be unpublished.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 rounded-b-lg">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Publish Assessment
          </Button>
        </div>

      </div>
    </div>
  );
}

export default PublishConfirmationModal;