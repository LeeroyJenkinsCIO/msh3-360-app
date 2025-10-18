// 📁 SAVE TO: src/components/hubs/UnifiedAssessmentGrid.js
// Unified grid with Pillar column - UPDATED

import React from 'react';
import { Calendar, Eye, AlertCircle, CheckCircle, User, ArrowDown, ArrowUp, Users, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getSubPillarDisplayName, getPillarAbbreviation } from '../../utils/pillarHelpers';
import { getHRPBadgeConfig } from '../../utils/hrpBadgeUtils';

function UnifiedAssessmentGrid({
  assessments = [],
  onStartAssessment,
  onViewAssessment,
  showStartButton = true,
  emptyStateMessage = 'No assessments found',
  isMyAssessmentsTab = false,
  currentUserId = null
}) {

  const groupByCycle = (assessments) => {
    const groups = {};
    
    assessments.forEach(assessment => {
      const cycleKey = `${assessment.cycleYear}-${String(assessment.cycleMonth).padStart(2, '0')}`;
      const cycleName = assessment.cycleName || `${getMonthName(assessment.cycleMonth)} ${assessment.cycleYear}`;
      const cycleType = assessment.cycleType || '1x1';
      
      if (!groups[cycleKey]) {
        groups[cycleKey] = {
          cycleKey,
          cycleName,
          cycleType,
          cycleYear: assessment.cycleYear,
          cycleMonth: assessment.cycleMonth,
          assessments: []
        };
      }
      
      groups[cycleKey].assessments.push(assessment);
    });
    
    return Object.values(groups).sort((a, b) => {
      if (a.cycleYear !== b.cycleYear) return a.cycleYear - b.cycleYear;
      return a.cycleMonth - b.cycleMonth;
    });
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || 'Unknown';
  };

  const getAssessmentTypeBadge = (assessment) => {
    const typeConfig = {
      'self': {
        label: 'Self',
        icon: User,
        className: 'bg-purple-100 text-purple-800 border border-purple-300'
      },
      'manager-down': {
        label: 'Manager Down',
        icon: ArrowDown,
        className: 'bg-blue-100 text-blue-800 border border-blue-300'
      },
      'manager-up': {
        label: 'Manager Up',
        icon: ArrowUp,
        className: 'bg-green-100 text-green-800 border border-green-300'
      },
      'peer': {
        label: 'Peer',
        icon: Users,
        className: 'bg-orange-100 text-orange-800 border border-orange-300'
      },
      'one-on-one': {
        label: '1x1',
        icon: Calendar,
        className: 'bg-gray-100 text-gray-800 border border-gray-300'
      }
    };
    
    const type = assessment.assessmentType || 'one-on-one';
    const config = typeConfig[type] || typeConfig['one-on-one'];
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (assessment) => {
    if (!assessment) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Not Started</Badge>;
    }

    if (assessment.status === 'pending') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }

    if (assessment.status === 'draft') {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Draft</Badge>;
    }

    if (assessment.status === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    }

    if (assessment.status === 'not-aligned') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border border-orange-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Not Aligned
        </Badge>
      );
    }

    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getActionButton = (assessment) => {
    const isPending = !assessment || assessment.status === 'pending';

    // For My Assessments tab
    if (isMyAssessmentsTab) {
      if (assessment.assessmentType === 'self' && assessment.status === 'pending') {
        return (
          <button 
            onClick={() => onStartAssessment?.(assessment)}
            className="text-green-600 hover:text-green-900 flex items-center font-semibold"
          >
            <User className="w-4 h-4 mr-1" />
            Complete Now
          </button>
        );
      }
      
      if (assessment.status === 'completed' || assessment.status === 'not-aligned') {
        return (
          <button 
            onClick={() => onViewAssessment?.(assessment.id)}
            className="text-blue-600 hover:text-blue-900 flex items-center font-medium"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </button>
        );
      }
      
      return <span className="text-gray-400 text-sm">—</span>;
    }

    // For My Team tab
    // Check if this is MY assessment (I'm the assessor)
    if (assessment.isMyAssessment) {
      if (isPending) {
        return (
          <button 
            onClick={() => onStartAssessment?.(assessment)}
            className="text-green-600 hover:text-green-900 flex items-center font-semibold"
          >
            <Calendar className="w-4 h-4 mr-1" />
            Assess
          </button>
        );
      }

      return (
        <button 
          onClick={() => onViewAssessment?.(assessment.id)}
          className="text-blue-600 hover:text-blue-900 flex items-center font-medium"
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </button>
      );
    } else {
      // This is someone else's assessment (e.g., ISF Supervisor)
      // Only show View if completed
      if (assessment.status === 'completed' || assessment.status === 'not-aligned') {
        return (
          <button 
            onClick={() => onViewAssessment?.(assessment.id)}
            className="text-blue-600 hover:text-blue-900 flex items-center font-medium"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </button>
        );
      }
      
      // If pending but not my assessment, show read-only indicator
      return <span className="text-gray-400 text-xs">—</span>;
    }
  };

  const getAlignmentBadge = (assessment) => {
    if (!assessment || assessment.status === 'pending' || assessment.status === 'draft') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (assessment.alignmentStatus === 'aligned' || assessment.status === 'completed') {
      return <Badge variant="success" className="bg-green-100 text-green-800">Aligned</Badge>;
    }

    return <Badge variant="warning" className="bg-orange-100 text-orange-800">Not Aligned</Badge>;
  };

  const getHRPIndicator = (assessment) => {
    if (!assessment || assessment.status === 'pending' || assessment.status === 'draft') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    const badgeConfig = getHRPBadgeConfig(assessment);
    
    if (!badgeConfig) {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    const BadgeIcon = badgeConfig.icon;

    return (
      <Badge className={badgeConfig.className}>
        <BadgeIcon className="w-3 h-3 mr-1" />
        {badgeConfig.text}
      </Badge>
    );
  };

  if (assessments.length === 0) {
    return (
      <Card className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assessments</h3>
        <p className="text-gray-600">{emptyStateMessage}</p>
      </Card>
    );
  }

  const cycleGroups = groupByCycle(assessments);

  return (
    <div className="space-y-6">
      {cycleGroups.map((group) => (
        <Card key={group.cycleKey} className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{group.cycleName}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {group.cycleType === '360' ? '360 Assessments' : '1x1 Assessments'} • {group.assessments.length} total
                </p>
              </div>
              <Badge 
                className={group.cycleType === '360' 
                  ? 'bg-purple-100 text-purple-800 border border-purple-300 text-lg px-4 py-2' 
                  : 'bg-blue-100 text-blue-800 border border-blue-300 text-lg px-4 py-2'
                }
              >
                {group.cycleType?.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '100px'}}>
                      Action
                    </th>
                    <th className="sticky left-[100px] z-20 bg-gray-50 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '240px'}}>
                      {isMyAssessmentsTab ? 'Assessment Type' : 'Name'}
                    </th>
                    {isMyAssessmentsTab ? (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        From
                      </th>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Layer
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Pillar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Sub-Pillar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Assessed By
                        </th>
                      </>
                    )}
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Composite
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Alignment
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      HRP
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      9-Box
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      MSH ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.assessments.map((assessment) => (
                    <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 group-hover:bg-gray-50" style={{minWidth: '100px'}}>
                        {getActionButton(assessment)}
                      </td>
                      <td className="sticky left-[100px] z-10 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200 group-hover:bg-gray-50" style={{minWidth: '240px'}}>
                        {isMyAssessmentsTab ? (
                          getAssessmentTypeBadge(assessment)
                        ) : (
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{assessment.name || assessment.subjectName}</div>
                              <div className="text-xs text-gray-500">{assessment.email}</div>
                            </div>
                          </div>
                        )}
                      </td>
                      {isMyAssessmentsTab ? (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {assessment.assessmentType === 'self' ? 'Self' : assessment.assessorName}
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {assessment.layer || 'ISF'}
                              </Badge>
                              {assessment.isSupervisor && (
                                <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs font-semibold">
                                  SUP
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-bold">
                              {getPillarAbbreviation(assessment.pillar)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-700">
                              {assessment.subPillar ? getSubPillarDisplayName(assessment.subPillar) : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {assessment.assessorName || '—'}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(assessment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {assessment.composite !== undefined && assessment.composite !== null ? (
                          <span className="text-lg font-bold text-gray-900">{assessment.composite}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getAlignmentBadge(assessment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getHRPIndicator(assessment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {assessment.nineBoxPosition ? (
                          <span className="text-sm font-semibold text-gray-900">
                            {assessment.nineBoxPosition}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-mono font-semibold text-indigo-600">
                          {assessment.mshId || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default UnifiedAssessmentGrid;