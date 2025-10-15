// 📁 SAVE TO: src/components/hubs/AssessmentCycleGrid.js
// UPDATED - Added viewMode support while keeping original grid style

import React, { useState, useMemo } from 'react';
import { Calendar, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getPillarDisplayName, getSubPillarDisplayName } from '../../utils/pillarHelpers';
import { getHRPBadgeConfig } from '../../utils/hrpBadgeUtils';

function AssessmentCycleGrid({
  assessments = [],
  currentUser,
  onCompleteAssessment,
  onViewAssessment,
  onExport,
  viewMode = 'team', // 'team' or 'personal'
  assessmentType = '1x1',
  currentMonthName = '',
  showStartButton = true,
  emptyStateMessage = 'No team members found',
  showPillarColumn = false,
  showSubPillarColumn = false,
  showTeamSizeColumn = false,
  showAssessorColumn = false,
  showHRPColumn = true,
  viewButtonLabel = 'View'
}) {

  // Filter assessments based on viewMode
  const viewFilteredAssessments = useMemo(() => {
    const userId = currentUser?.uid || currentUser?.id;
    
    if (!userId) {
      console.warn('No user ID found in currentUser:', currentUser);
      return [];
    }
    
    if (viewMode === 'personal') {
      // Show assessments where current user is the subject/employee
      const filtered = assessments.filter(a => a.employeeId === userId);
      console.log('Personal mode - Filtered assessments:', filtered.length, 'User ID:', userId);
      return filtered;
    } else {
      // Show assessments where current user is the manager
      const filtered = assessments.filter(a => a.managerId === userId);
      console.log('Team mode - Filtered assessments:', filtered.length, 'User ID:', userId);
      return filtered;
    }
  }, [assessments, currentUser, viewMode]);

  // Transform assessments into member-like structure for compatibility
  const members = useMemo(() => {
    return viewFilteredAssessments.map(assessment => ({
      id: assessment.employeeId,
      name: assessment.employeeName,
      email: assessment.employeeEmail || '',
      layer: assessment.employeeLayer || 'Unknown',
      pillar: assessment.pillar || assessment.employeePillar,
      pillarId: assessment.pillarId,
      subPillar: assessment.subPillar,
      teamSize: assessment.teamSize || 0,
      isSupervisor: assessment.isSupervisor || false,
      assessorName: assessment.managerName,
      isDirectReport: true,
      currentAssessment: {
        id: assessment.id,
        status: assessment.status,
        composite: assessment.compositeScore,
        alignmentStatus: assessment.status === 'not-aligned' ? 'not-aligned' : 'aligned',
        nineBoxPosition: assessment.nineBoxPosition,
        mshId: assessment.mshId || assessment.id.slice(0, 8),
        hrpRequested: assessment.hrpRequested,
        hrpReviewedAt: assessment.hrpReviewedAt
      }
    }));
  }, [viewFilteredAssessments]);

  const getStatusBadge = (member) => {
    const assessment = member.currentAssessment;
    
    if (!assessment) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Not Started</Badge>;
    }

    if (assessment.status === 'pending') {
      return <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }

    if (assessment.status === 'draft') {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Draft</Badge>;
    }

    if (assessment.status === 'completed') {
      return <Badge variant="success" className="bg-green-100 text-green-800">Completed</Badge>;
    }

    if (assessment.status === 'not-aligned') {
      return <Badge variant="warning" className="bg-orange-100 text-orange-800">Not Aligned</Badge>;
    }

    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getActionButton = (member) => {
    const assessment = member.currentAssessment;
    const isPending = !assessment || assessment.status === 'pending';

    // If member is assessed by someone else (indirect report), only show View
    if (member.assessorName && member.assessorName !== 'Unknown' && !member.isDirectReport) {
      if (assessment && (assessment.status === 'completed' || assessment.status === 'not-aligned')) {
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
      return <span className="text-xs text-gray-500">—</span>;
    }

    if (isPending) {
      return (
        <button 
          onClick={() => onCompleteAssessment?.(assessment)}
          className="text-green-600 hover:text-green-900 flex items-center font-semibold"
        >
          <Calendar className="w-4 h-4 mr-1" />
          {viewMode === 'personal' ? 'Self-Assess' : 'Assess'}
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
  };

  const getAlignmentBadge = (assessment) => {
    if (!assessment || assessment.status === 'pending' || assessment.status === 'draft') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (assessment.alignmentStatus === 'aligned') {
      return <Badge variant="success" className="bg-green-100 text-green-800">Aligned</Badge>;
    }

    return <Badge variant="warning" className="bg-orange-100 text-orange-800">Not Aligned</Badge>;
  };

  const getHRPIndicator = (assessment) => {
    if (!assessment || assessment.status === 'pending' || assessment.status === 'draft') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    // Use the utility function to get badge config
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

  // Dynamic header text based on viewMode
  const headerText = viewMode === 'personal' ? 'My Assessments' : 'Assessment Cycle Grid';

  if (members.length === 0) {
    return (
      <Card className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Team Members</h3>
        <p className="text-gray-600">
          {viewMode === 'personal' 
            ? 'No assessments have been assigned to you yet' 
            : emptyStateMessage
          }
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-6 pt-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{headerText}</h2>
          <p className="text-gray-600 mt-1">
            {currentMonthName} • {assessmentType === '360' ? '360 Assessments' : '1x1 Assessments'}
          </p>
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
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Layer
                </th>
                {showSubPillarColumn && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sub-Pillar
                  </th>
                )}
                {showPillarColumn && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pillar
                  </th>
                )}
                {showTeamSizeColumn && (
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Team
                  </th>
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
                {showHRPColumn && (
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    HRP
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  9-Box
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  MSH ID
                </th>
                {showAssessorColumn && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Assessed By
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => {
                const assessment = member.currentAssessment;
                
                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap text-center border-r border-gray-200" style={{minWidth: '100px'}}>
                      {getActionButton(member)}
                    </td>
                    <td className="sticky left-[100px] z-10 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200" style={{minWidth: '240px'}}>
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {member.layer}
                        </Badge>
                        {member.isSupervisor && (
                          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs font-semibold">
                            SUP
                          </Badge>
                        )}
                      </div>
                    </td>
                    {showSubPillarColumn && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {member.subPillar ? getSubPillarDisplayName(member.subPillar) : '—'}
                        </span>
                      </td>
                    )}
                    {showPillarColumn && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-medium">
                          {getPillarDisplayName(member.pillarId)}
                        </span>
                      </td>
                    )}
                    {showTeamSizeColumn && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-gray-900">
                          {member.teamSize || 0}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(member)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {assessment?.composite !== undefined ? (
                        <span className="text-lg font-bold text-gray-900">{assessment.composite}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getAlignmentBadge(assessment)}
                    </td>
                    {showHRPColumn && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getHRPIndicator(assessment)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {assessment?.nineBoxPosition ? (
                        <span className="text-sm font-semibold text-gray-900">
                          {assessment.nineBoxPosition}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-mono font-semibold text-indigo-600">
                        {assessment?.mshId || '—'}
                      </span>
                    </td>
                    {showAssessorColumn && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {member.assessorName || '—'}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

export default AssessmentCycleGrid;