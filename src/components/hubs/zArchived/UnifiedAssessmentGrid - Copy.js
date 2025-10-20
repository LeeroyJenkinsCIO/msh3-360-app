// 📁 SAVE TO: src/components/hubs/UnifiedAssessmentGrid.jsx
// UPDATED - Added 360 Pair Comparison Link

import React from 'react';
import { Calendar, Eye, AlertCircle, CheckCircle, User, ArrowDown, ArrowUp, Users, Clock, TrendingUp, GitCompare } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { getSubPillarDisplayName, getPillarAbbreviation } from '../../utils/pillarHelpers';
import { getHRPBadgeConfig } from '../../utils/hrpBadgeUtils';

function UnifiedAssessmentGrid({
  assessments = [],
  onStartAssessment,
  onViewAssessment,
  onView360Pair,  // ✨ NEW: Handler for 360 pair comparison
  viewMode = 'give',  // 'give' or 'receive'
  emptyStateMessage = 'No assessments found',
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
        label: 'Manager ↓',
        icon: ArrowDown,
        className: 'bg-blue-100 text-blue-800 border border-blue-300'
      },
      'manager-up': {
        label: 'Manager ↑',
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

    if (assessment.status === 'in_progress') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
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
          <CheckCircle className="w-3 h-3 mr-1" />
          Complete.NA
        </Badge>
      );
    }

    if (assessment.status === 'calibrated') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Published
        </Badge>
      );
    }

    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getActionButton = (assessment) => {
    const isPending = !assessment || assessment.status === 'pending';
    const isCompleted = assessment.status === 'completed' || assessment.status === 'not-aligned' || assessment.status === 'calibrated';
    
    // ✨ Check if this is a 360 assessment with a pair (not self-assessment)
    const is360Pair = assessment.cycleType === '360' && 
                      assessment.pairId && 
                      assessment.assessmentType !== 'self';

    // GIVE MODE: I'm the giver/assessor
    if (viewMode === 'give') {
      if (isPending) {
        return (
          <button 
            onClick={() => onStartAssessment?.(assessment)}
            className="text-green-600 hover:text-green-900 flex items-center font-semibold transition-colors"
          >
            <Calendar className="w-4 h-4 mr-1" />
            Assess
          </button>
        );
      }

      return (
        <button 
          onClick={() => onViewAssessment?.(assessment.id)}
          className="text-blue-600 hover:text-blue-900 flex items-center font-medium transition-colors"
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </button>
      );
    }

    // RECEIVE MODE: I'm the receiver/subject
    if (viewMode === 'receive') {
      // Self-assessment: Can complete it in Give tab
      if (assessment.isSelfAssessment && isPending) {
        return (
          <button 
            onClick={() => onStartAssessment?.(assessment)}
            className="text-purple-600 hover:text-purple-900 flex items-center font-semibold transition-colors"
          >
            <User className="w-4 h-4 mr-1" />
            Complete Self
          </button>
        );
      }

      // ✨ NEW: 360 Pair Comparison Button
      if (isCompleted && is360Pair) {
        return (
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => onViewAssessment?.(assessment.id)}
              className="text-blue-600 hover:text-blue-900 flex items-center font-medium transition-colors text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </button>
            <button 
              onClick={() => onView360Pair?.(assessment.pairId)}
              className="text-purple-600 hover:text-purple-900 flex items-center font-semibold transition-colors text-xs"
            >
              <GitCompare className="w-3 h-3 mr-1" />
              360 Pair
            </button>
          </div>
        );
      }

      // Completed assessment: Can view it
      if (isCompleted) {
        return (
          <button 
            onClick={() => onViewAssessment?.(assessment.id)}
            className="text-blue-600 hover:text-blue-900 flex items-center font-medium transition-colors"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </button>
        );
      }

      // Pending (someone else needs to complete)
      return (
        <span className="text-gray-400 text-sm flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Awaiting
        </span>
      );
    }

    return <span className="text-gray-400 text-sm">—</span>;
  };

  const getPersonName = (assessment) => {
    if (viewMode === 'give') {
      return {
        name: assessment.subjectName || assessment.receiver?.displayName || 'Unknown',
        email: assessment.subjectEmail || '',
        layer: assessment.subjectLayer || assessment.receiver?.layer || 'ISF',
        pillar: assessment.subjectPillar,
        subPillar: assessment.subjectSubPillar
      };
    } else {
      return {
        name: assessment.assessorName || assessment.giver?.displayName || 'Unknown',
        email: '',
        layer: assessment.assessorLayer || assessment.giver?.layer || 'Unknown'
      };
    }
  };

  const getAlignmentBadge = (assessment) => {
    if (!assessment || assessment.status === 'pending') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (assessment.alignmentStatus === 'aligned' || assessment.status === 'completed') {
      return <Badge variant="success" className="bg-green-100 text-green-800">Aligned</Badge>;
    }

    if (assessment.alignmentStatus === 'not-aligned' || assessment.status === 'not-aligned') {
      return <Badge variant="warning" className="bg-orange-100 text-orange-800">Not Aligned</Badge>;
    }

    return <span className="text-gray-400 text-sm">—</span>;
  };

  const getHRPIndicator = (assessment) => {
    if (!assessment || assessment.status === 'pending') {
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
      {cycleGroups.map((group) => {
        return (
          <Card key={group.cycleKey} className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{group.cycleName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {group.cycleType === '360' ? '360 Assessments' : '1x1 Assessments'} • {group.assessments.length} {viewMode === 'give' ? 'to complete' : 'about you'}
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
                      {/* Action Column (sticky left) */}
                      <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '120px'}}>
                        Action
                      </th>

                      {/* Type Column (sticky left after action) */}
                      <th className="sticky left-[120px] z-20 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '140px'}}>
                        Type
                      </th>

                      {/* Name/From Column (sticky left) */}
                      <th className="sticky left-[260px] z-20 bg-gray-50 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '200px'}}>
                        {viewMode === 'give' ? 'Subject' : 'From'}
                      </th>

                      {/* Conditional Columns for GIVE mode */}
                      {viewMode === 'give' && (
                        <>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Layer
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Pillar
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Sub-Pillar
                          </th>
                        </>
                      )}

                      {/* Status */}
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>

                      {/* Composite */}
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Composite
                      </th>

                      {/* Alignment */}
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Alignment
                      </th>

                      {/* HRP */}
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        HRP
                      </th>

                      {/* MSH ID */}
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        MSH ID
                      </th>

                      {/* ✨ Pair ID Column - Always show */}
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {group.cycleType === '360' ? '360 Pair ID' : 'Pair ID'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.assessments.map((assessment) => {
                      const personInfo = getPersonName(assessment);
                      
                      return (
                        <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                          {/* Action */}
                          <td className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 hover:bg-gray-50" style={{minWidth: '120px'}}>
                            {getActionButton(assessment)}
                          </td>

                          {/* Type Badge */}
                          <td className="sticky left-[120px] z-10 bg-white px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 hover:bg-gray-50" style={{minWidth: '140px'}}>
                            {getAssessmentTypeBadge(assessment)}
                          </td>

                          {/* Name/From */}
                          <td className="sticky left-[260px] z-10 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200 hover:bg-gray-50" style={{minWidth: '200px'}}>
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {personInfo.name}
                                  {assessment.isSelfAssessment && (
                                    <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">
                                      Self
                                    </Badge>
                                  )}
                                </div>
                                {personInfo.email && (
                                  <div className="text-xs text-gray-500">{personInfo.email}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Conditional Columns for GIVE mode */}
                          {viewMode === 'give' && (
                            <>
                              {/* Layer */}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <Badge variant="secondary" className="text-xs">
                                  {personInfo.layer}
                                </Badge>
                              </td>

                              {/* Pillar */}
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                {personInfo.pillar ? (
                                  <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-bold">
                                    {getPillarAbbreviation(personInfo.pillar)}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm">—</span>
                                )}
                              </td>

                              {/* Sub-Pillar */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-700">
                                  {personInfo.subPillar ? getSubPillarDisplayName(personInfo.subPillar) : '—'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {getStatusBadge(assessment)}
                          </td>

                          {/* Composite */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {assessment.composite !== undefined && assessment.composite !== null ? (
                              <span className="text-lg font-bold text-gray-900">{assessment.composite}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>

                          {/* Alignment */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {getAlignmentBadge(assessment)}
                          </td>

                          {/* HRP */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {getHRPIndicator(assessment)}
                          </td>

                          {/* MSH ID */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {assessment.impact?.mshId ? (
                              <span className="text-sm font-mono font-semibold text-indigo-600">
                                MSH-{assessment.impact.mshId.split('-').pop()}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>

                          {/* ✨ Pair ID - Always show */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {assessment.pairId ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-mono font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                                  {assessment.pairId.split('-').slice(-2).join('-')}
                                </span>
                                {assessment.assessmentType !== 'self' && onView360Pair && group.cycleType === '360' && (
                                  <button
                                    onClick={() => onView360Pair(assessment.pairId)}
                                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                                  >
                                    <GitCompare className="w-3 h-3" />
                                    View Pair
                                  </button>
                                )}
                              </div>
                            ) : assessment.assessmentType === 'self' ? (
                              <span className="text-xs text-gray-500">
                                {assessment['360Pairs']?.length > 0 
                                  ? `${assessment['360Pairs'].length} pairs` 
                                  : 'Self'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default UnifiedAssessmentGrid;