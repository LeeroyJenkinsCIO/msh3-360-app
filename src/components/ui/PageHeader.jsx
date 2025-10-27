// 📁 SAVE TO: src/components/ui/PageHeader.jsx
// Reusable Page Header Component for Assessment Pages

import React from 'react';
import { ArrowLeft, User, Users, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PageHeader({ 
  mode = '1x1', // '1x1', '360', 'self'
  title,
  subtitle,
  subjectName,
  assessorName,
  status, // 'draft', 'completed', 'published'
  backgroundColor = 'bg-blue-600',
  onBack,
  showBackButton = true,
  additionalInfo
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-100 rounded-full text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Published
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-100 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Completed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-500/20 text-gray-100 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Draft
          </span>
        );
      default:
        return null;
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case '360':
        return <Users className="w-6 h-6" />;
      case 'self':
        return <User className="w-6 h-6" />;
      default:
        return <Users className="w-6 h-6" />;
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case '360':
        return 'bg-gradient-to-r from-teal-600 to-cyan-600';
      case 'self':
        return 'bg-gradient-to-r from-purple-600 to-pink-600';
      default:
        return backgroundColor;
    }
  };

  return (
    <div className={`${getModeColor()} text-white shadow-lg`}>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors mt-1"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getModeIcon()}
                <h1 className="text-2xl font-bold">
                  {title || `${mode.toUpperCase()} Assessment`}
                </h1>
                {status && getStatusBadge()}
              </div>

              {subtitle && (
                <p className="text-sm text-white/90 mb-3">{subtitle}</p>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                {subjectName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white/70" />
                    <span className="text-white/70">Subject:</span>
                    <span className="font-medium">{subjectName}</span>
                  </div>
                )}

                {assessorName && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white/70" />
                    <span className="text-white/70">Assessor:</span>
                    <span className="font-medium">{assessorName}</span>
                  </div>
                )}

                {additionalInfo && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/70" />
                    <span className="font-medium">{additionalInfo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageHeader;