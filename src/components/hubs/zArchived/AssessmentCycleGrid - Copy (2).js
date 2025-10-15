// 📁 SAVE TO: src/components/hubs/AssessmentCycleGrid.js
// UPDATED VERSION - Added showSubPillarColumn support for ISL view

import React from 'react';
import { Calendar, Eye, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getPillarDisplayName, getSubPillarDisplayName } from '../../utils/pillarHelpers';

function AssessmentCycleGrid({
  members = [],
  assessmentType = '1x1',
  currentMonthName = '',
  onStartAssessments,
  onViewAssessment,
  showStartButton = true,
  emptyStateMessage = 'No team members found',
  showPillarColumn = false,
  showSubPillarColumn = false,
  showTeamSizeColumn = false,
  showAssessorColumn = false,
  showHRPColumn = true
}) {

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
          onClick={() => onStartAssessments?.()}
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

    if (assessment.hrpRequested) {
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-300 font-semibold">
          HRP
        </Badge>
      );
    }

    return <span className="text-gray-400 text-sm">—</span>;
  };

  if (members.length === 0) {
    return (
      <Card className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Team Members</h3>
        <p className="text-gray-600">{emptyStateMessage}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-6 pt-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Cycle Grid</h2>
          <p className="text-gray-600 mt-1">
            {currentMonthName} • {assessmentType === '360' ? '360 Assessments' : '1x1 Assessments'}
          </p>
        </div>
        {showStartButton && (
          <Button variant="primary" onClick={onStartAssessments}>
            <Calendar className="w-5 h-5 mr-2" />
            Start Assessments
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  Name
                </th>
                <th className="sticky left-[200px] z-20 bg-gray-50 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  Layer
                </th>
                {showPillarColumn && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pillar
                  </th>
                )}
                {showSubPillarColumn && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sub-Pillar
                  </th>
                )}
                {showTeamSizeColumn && (
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Team
                  </th>
                )}
                {showAssessorColumn && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Assessed By
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  MSH ID
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Composite
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  9-Box
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
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => {
                const assessment = member.currentAssessment;
                
                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="sticky left-[200px] z-10 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <Badge variant="secondary" className="text-xs">
                        {member.layer}
                      </Badge>
                    </td>
                    {showPillarColumn && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-medium">
                          {getPillarDisplayName(member.pillarId)}
                        </span>
                      </td>
                    )}
                    {showSubPillarColumn && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {member.subPillar ? getSubPillarDisplayName(member.subPillar) : '—'}
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
                    {showAssessorColumn && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {member.assessorName || '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-mono font-semibold text-indigo-600">
                        {assessment?.mshId || '—'}
                      </span>
                    </td>
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
                      {assessment?.nineBoxPosition ? (
                        <span className="text-sm font-semibold text-gray-900">
                          {assessment.nineBoxPosition}
                        </span>
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
                      {getActionButton(member)}
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
}

export default AssessmentCycleGrid;