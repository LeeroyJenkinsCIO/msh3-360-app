// 📁 SAVE TO: src/components/hubs/UnifiedAssessmentGrid.jsx
// ENHANCED: Now detects and groups 360 pairings, shows pairing cards

import React, { useMemo } from 'react';
import { Calendar, Eye, AlertCircle, CheckCircle, User, ArrowDown, ArrowUp, Users, Clock, GitCompare } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { getSubPillarDisplayName, getPillarAbbreviation } from '../../utils/pillarHelpers';
import { getHRPBadgeConfig } from '../../utils/hrpBadgeUtils';
import { 
  detect360Pairing, 
  isPairAComplete, 
  isPairBComplete,
  canMRLaunchPairA,
  canMRLaunchPairB,
  getPairingBadge,
  isUserMR
} from '../../utils/360Pairing';

function UnifiedAssessmentGrid({
  assessments = [],
  onStartAssessment,
  onViewAssessment,
  onView360Pair,  // Handler for launching comparative view
  viewMode = 'give',  // 'give' or 'receive'
  emptyStateMessage = 'No assessments found',
  currentUserId = null
}) {

  // Detect pairings where current user is the MR (manager)
  // MOVED OUTSIDE useMemo to fix hoisting issue
  const detectPairingsInCycle = (cycleAssessments, userId) => {
    const pairings = [];
    const processedPairIds = new Set();
    
    cycleAssessments.forEach(assessment => {
      // Only look at assessments where user is the giver/manager
      if (assessment.assessorId !== userId) return;
      
      // Skip if this is a self-assessment
      if (assessment.assessmentType === 'self') return;
      
      // Skip if no pairId
      if (!assessment.pairId) return;
      
      // Skip if already processed
      if (processedPairIds.has(assessment.pairId)) return;
      
      // Try to detect pairing
      const mrId = userId;
      const drId = assessment.subjectId;
      
      const pairing = detect360Pairing(
        cycleAssessments,
        mrId,
        drId,
        assessment.cycleMonth,
        assessment.cycleYear
      );
      
      if (pairing) {
        pairings.push(pairing);
        processedPairIds.add(assessment.pairId);
      }
    });
    
    return pairings;
  };

  // Group assessments by cycle and detect pairings
  const cycleGroups = useMemo(() => {
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
          assessments: [],
          pairings: [],
          regularAssessments: []
        };
      }
      
      groups[cycleKey].assessments.push(assessment);
    });
    
    // Detect 360 pairings in each cycle
    Object.values(groups).forEach(group => {
      if (group.cycleType === '360' && viewMode === 'give') {
        // Detect pairings for GIVE view (where user is the manager/giver)
        const detectedPairs = detectPairingsInCycle(group.assessments, currentUserId);
        group.pairings = detectedPairs;
        
        // Filter out assessments that are part of pairings
        const pairedAssessmentIds = new Set();
        detectedPairs.forEach(pairing => {
          pairing.allAssessments.forEach(a => pairedAssessmentIds.add(a.id));
        });
        
        group.regularAssessments = group.assessments.filter(
          a => !pairedAssessmentIds.has(a.id)
        );
      } else {
        // For 1x1 or RECEIVE view, show all as regular assessments
        group.regularAssessments = group.assessments;
      }
    });
    
    return Object.values(groups).sort((a, b) => {
      if (a.cycleYear !== b.cycleYear) return a.cycleYear - b.cycleYear;
      return a.cycleMonth - b.cycleMonth;
    });
  }, [assessments, currentUserId, viewMode]);

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
      // Self-assessment: Can complete it
      if (assessment.assessmentType === 'self' && isPending) {
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

  // Check if assessment has notes
  const hasNotes = (assessment) => {
    if (!assessment || !assessment.notes) return false;
    
    // Check if notes object has any non-empty values
    const noteValues = Object.values(assessment.notes);
    return noteValues.some(note => note && note.trim().length > 0);
  };

  const getNotesIndicator = (assessment) => {
    if (!assessment || assessment.status === 'pending') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (hasNotes(assessment)) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border border-blue-300 font-semibold">
          ✓ Yes
        </Badge>
      );
    }

    return (
      <Badge className="bg-gray-100 text-gray-500 border border-gray-300">
        No
      </Badge>
    );
  };

  // Render a 360 pairing card
  const renderPairingCard = (pairing) => {
    const isMR = isUserMR(pairing, currentUserId);
    const pairAComplete = isPairAComplete(pairing);
    const pairBComplete = isPairBComplete(pairing);
    const canLaunchA = canMRLaunchPairA(pairing, currentUserId);
    const canLaunchB = canMRLaunchPairB(pairing, currentUserId);
    
    const badgeA = getPairingBadge(pairing, isMR ? 'mr' : 'dr', 'pair-a');
    const badgeB = getPairingBadge(pairing, isMR ? 'mr' : 'dr', 'pair-b');
    
    // Get DR info for display - with safety checks
    const drAssessment = pairing.pairA?.bilateralAssessment || pairing.pairA?.selfAssessment;
    const drInfo = drAssessment ? getPersonName(drAssessment) : { name: 'Unknown', email: '', layer: 'ISF' };

    return (
      <Card key={pairing.pairingId} className="mb-4 border-2 border-purple-200 bg-purple-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <GitCompare className="w-6 h-6 text-purple-600" />
              <div>
                <h4 className="font-bold text-gray-900 text-lg">360 Pairing: {drInfo.name}</h4>
                <p className="text-sm text-gray-600">Mutual manager-report assessment</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border border-purple-300 text-sm px-3 py-1">
              360 Pair
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Pair A: MR → DR */}
            <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-blue-800 flex items-center gap-2">
                  <ArrowDown className="w-4 h-4" />
                  Pair A: You → {drInfo.name}
                </h5>
                <Badge className={`${badgeA.emoji} ${badgeA.color === 'red' ? 'bg-red-100 text-red-800' : badgeA.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : badgeA.color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'} text-xs`}>
                  {badgeA.emoji} {badgeA.label}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Self-assessment ({drInfo.name}):</span>
                  <span className="font-semibold">{getStatusBadge(pairing.pairA.selfAssessment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your assessment:</span>
                  <span className="font-semibold">{getStatusBadge(pairing.pairA.bilateralAssessment)}</span>
                </div>
              </div>

              {canLaunchA && (
                <button
                  onClick={() => onView360Pair?.(pairing.pairingId, 'pair-a')}
                  className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold flex items-center justify-center gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  Launch Alignment
                </button>
              )}
              
              {!canLaunchA && pairAComplete && pairing.pairA?.bilateralAssessment && (
                <button
                  onClick={() => onView360Pair?.(pairing.pairingId, 'pair-a')}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Alignment
                </button>
              )}
            </div>

            {/* Pair B: DR → MR */}
            <div className="bg-white rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-green-800 flex items-center gap-2">
                  <ArrowUp className="w-4 h-4" />
                  Pair B: {drInfo.name} → You
                </h5>
                <Badge className={`${badgeB.emoji} ${badgeB.color === 'red' ? 'bg-red-100 text-red-800' : badgeB.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : badgeB.color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'} text-xs`}>
                  {badgeB.emoji} {badgeB.label}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Your self-assessment:</span>
                  <span className="font-semibold">{getStatusBadge(pairing.pairB.selfAssessment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{drInfo.name}'s assessment:</span>
                  <span className="font-semibold">{getStatusBadge(pairing.pairB.bilateralAssessment)}</span>
                </div>
              </div>

              {canLaunchB && (
                <button
                  onClick={() => onView360Pair?.(pairing.pairingId, 'pair-b')}
                  className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold flex items-center justify-center gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  Launch Alignment
                </button>
              )}
              
              {!canLaunchB && pairBComplete && pairing.pairB?.bilateralAssessment && (
                <button
                  onClick={() => onView360Pair?.(pairing.pairingId, 'pair-b')}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Alignment
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
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

  return (
    <div className="space-y-6">
      {cycleGroups.map((group) => {
        const hasPairings = group.pairings.length > 0;
        
        return (
          <Card key={group.cycleKey} className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{group.cycleName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {group.cycleType === '360' ? '360 Assessments' : '1x1 Assessments'} • {group.assessments.length} total
                    {hasPairings && ` • ${group.pairings.length} pairing(s)`}
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

            <div className="p-6">
              {/* Render 360 pairings first */}
              {hasPairings && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-purple-600" />
                    360 Pairings
                  </h4>
                  {group.pairings.map(pairing => renderPairingCard(pairing))}
                </div>
              )}

              {/* Render regular assessments */}
              {group.regularAssessments.length > 0 && (
                <div>
                  {hasPairings && (
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      Other Assessments
                    </h4>
                  )}
                  
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '120px'}}>
                              Action
                            </th>
                            <th className="sticky left-[120px] z-20 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '140px'}}>
                              Type
                            </th>
                            <th className="sticky left-[260px] z-20 bg-gray-50 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{minWidth: '200px'}}>
                              {viewMode === 'give' ? 'Subject' : 'From'}
                            </th>
                            {viewMode === 'give' && (
                              <>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Layer</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Pillar</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sub-Pillar</th>
                              </>
                            )}
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Composite</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Alignment</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">HRP</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Notes</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">MSH ID</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {group.regularAssessments.map((assessment) => {
                            const personInfo = getPersonName(assessment);
                            
                            return (
                              <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                                <td className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 hover:bg-gray-50" style={{minWidth: '120px'}}>
                                  {getActionButton(assessment)}
                                </td>
                                <td className="sticky left-[120px] z-10 bg-white px-4 py-4 whitespace-nowrap text-center border-r border-gray-200 hover:bg-gray-50" style={{minWidth: '140px'}}>
                                  {getAssessmentTypeBadge(assessment)}
                                </td>
                                <td className="sticky left-[260px] z-10 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200 hover:bg-gray-50" style={{minWidth: '200px'}}>
                                  <div className="flex items-center">
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        {personInfo.name}
                                        {assessment.assessmentType === 'self' && (
                                          <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">Self</Badge>
                                        )}
                                      </div>
                                      {personInfo.email && (
                                        <div className="text-xs text-gray-500">{personInfo.email}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {viewMode === 'give' && (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <Badge variant="secondary" className="text-xs">{personInfo.layer}</Badge>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                      {personInfo.pillar ? (
                                        <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-bold">
                                          {getPillarAbbreviation(personInfo.pillar)}
                                        </Badge>
                                      ) : (
                                        <span className="text-gray-400 text-sm">—</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="text-sm text-gray-700">
                                        {personInfo.subPillar ? getSubPillarDisplayName(personInfo.subPillar) : '—'}
                                      </span>
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
                                  {getNotesIndicator(assessment)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {assessment.impact?.mshId ? (
                                    <span className="text-sm font-mono font-semibold text-indigo-600">
                                      MSH-{assessment.impact.mshId.split('-').pop()}
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
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default UnifiedAssessmentGrid;