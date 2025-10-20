// 📁 SAVE TO: src/components/hubs/UnifiedAssessmentGrid.jsx
// ✅ 360° pairings show as 2 separate cards: Pair A and Pair B
// ✅ P2P vs MR/DR visual distinction and correct publishing logic

import React from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, Users, ArrowRight, User, ArrowDown, ArrowUp, Eye, GitCompare } from 'lucide-react';
import { getSubPillarDisplayName, getPillarAbbreviation } from '../../utils/pillarHelpers';
import { getHRPBadgeConfig } from '../../utils/hrpBadgeUtils';

function UnifiedAssessmentGrid({ 
  assessments = [], 
  pairings = [],
  onStartAssessment,
  onViewAssessment,
  onView360Pair,
  viewMode = 'give',
  currentUserId,
  userRole,
  pillarISFUsers = [],
  emptyStateMessage = 'No items to display'
}) {
  
  // Determine if we're showing pairings or assessments
  const showPairings = viewMode === '360-pairings' && pairings.length > 0;

  const getTypeBadge = (assessment) => {
    // Determine assessment type
    const isSelf = assessment.isSelfAssessment || 
                   assessment.assessmentType === 'self' ||
                   assessment.assessorUid === assessment.subjectUid;
    
    const cycleType = assessment.cycleType;
    const assessmentType = assessment.assessmentType;
    
    // Self-assessment
    if (isSelf) {
      return {
        icon: User,
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        label: 'Self'
      };
    }
    
    // 1x1 assessment
    if (cycleType === '1x1') {
      return {
        icon: FileText,
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
        label: '1x1'
      };
    }
    
    // 360° assessments - determine MR/DR/Peer
    if (cycleType === '360') {
      // Manager → Direct Report (360-MR)
      if (assessmentType === 'manager-down') {
        return {
          icon: ArrowDown,
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          border: 'border-purple-300',
          label: '360-MR'
        };
      }
      
      // Direct Report → Manager (360-DR)
      if (assessmentType === 'manager-up') {
        return {
          icon: ArrowUp,
          bg: 'bg-indigo-100',
          text: 'text-indigo-800',
          border: 'border-indigo-300',
          label: '360-DR'
        };
      }
      
      // Peer to Peer (360-Peer)
      if (assessmentType === 'peer') {
        return {
          icon: Users,
          bg: 'bg-violet-100',
          text: 'text-violet-800',
          border: 'border-violet-300',
          label: '360-Peer'
        };
      }
      
      // Default 360
      return {
        icon: Users,
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-300',
        label: '360'
      };
    }
    
    // Fallback
    return {
      icon: FileText,
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300',
      label: '1x1'
    };
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': {
        icon: Clock,
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        label: 'Pending'
      },
      'in-progress': {
        icon: Clock,
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        label: 'In Progress'
      },
      'completed': {
        icon: CheckCircle,
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        label: 'Complete'
      },
      'not-aligned': {
        icon: CheckCircle,
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        label: 'Complete.NA'
      },
      'calibrated': {
        icon: CheckCircle,
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        label: 'Published'
      }
    };

    const config = badges[status] || badges['pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const getAlignmentBadge = (assessment) => {
    if (!assessment || assessment.status === 'pending') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (assessment.alignmentStatus === 'aligned' || assessment.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          Aligned
        </span>
      );
    }

    if (assessment.alignmentStatus === 'not-aligned' || assessment.status === 'not-aligned') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
          Not Aligned
        </span>
      );
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
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeConfig.className}`}>
        <BadgeIcon className="w-3 h-3" />
        {badgeConfig.text}
      </span>
    );
  };

  const hasNotes = (assessment) => {
    if (!assessment || !assessment.notes) return false;
    const noteValues = Object.values(assessment.notes);
    return noteValues.some(note => note && note.trim().length > 0);
  };

  const getNotesIndicator = (assessment) => {
    if (!assessment || assessment.status === 'pending') {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    if (hasNotes(assessment)) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          ✓ Yes
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-300">
        No
      </span>
    );
  };

  const groupAssessmentsByMonth = (assessments) => {
    const grouped = assessments.reduce((acc, assessment) => {
      const monthKey = `${assessment.cycleMonth}-${assessment.cycleYear}`;
      const monthName = new Date(assessment.cycleYear, assessment.cycleMonth - 1).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          monthName,
          cycleMonth: assessment.cycleMonth,
          cycleYear: assessment.cycleYear,
          cycleType: assessment.cycleType,
          assessments: []
        };
      }
      
      acc[monthKey].assessments.push(assessment);
      return acc;
    }, {});

    // Sort months: EARLIEST to LATEST
    return Object.values(grouped).sort((a, b) => {
      if (a.cycleYear !== b.cycleYear) return a.cycleYear - b.cycleYear;
      return a.cycleMonth - b.cycleMonth;
    });
  };

  // Render a single 360° Pair Card
  const renderPairCard = (pairing, pairType, subjectPerson, assessorPerson, selfStatus, assessmentStatus, assessmentId) => {
    const pairComplete = (selfStatus === 'completed' || selfStatus === 'calibrated') &&
                        (assessmentStatus === 'completed' || assessmentStatus === 'calibrated');
    
    const isPeerPairing = pairing.relationshipType === 'peer';
    const pairLabel = pairType === 'A' ? 'Pair A' : 'Pair B';
    
    // P2P Publishing Logic: Subject publishes their own MSH
    const canCurrentUserPublish = isPeerPairing 
      ? currentUserId === subjectPerson?.uid  // P2P: Assessee publishes
      : currentUserId === pairing.managerId;  // MR/DR: Manager publishes
    
    return (
      <div className="bg-white rounded-lg border-2 border-indigo-200 p-4 hover:border-indigo-400 transition-colors">
        {/* Pair Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isPeerPairing 
                ? 'bg-violet-100' 
                : pairType === 'A' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <span className={`text-xs font-bold ${
                isPeerPairing 
                  ? 'text-violet-700' 
                  : pairType === 'A' ? 'text-blue-700' : 'text-green-700'
              }`}>
                {isPeerPairing ? 'P2P' : pairLabel}
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">
                {isPeerPairing 
                  ? `${subjectPerson?.displayName || subjectPerson?.name} (Publishes Own MSH)`
                  : `${assessorPerson?.displayName || assessorPerson?.name} → ${subjectPerson?.displayName || subjectPerson?.name}`
                }
              </div>
              <div className="text-xs text-gray-600">
                {isPeerPairing
                  ? `Peer Review • ${subjectPerson?.displayName || 'Peer'} aligns with ${assessorPerson?.displayName || 'peer'} and publishes`
                  : `${assessorPerson?.displayName || 'Manager'} publishes ${subjectPerson?.displayName || 'subject'}'s MSH`
                }
              </div>
            </div>
          </div>
          {pairComplete && canCurrentUserPublish ? (
            <button
              onClick={() => onView360Pair({ ...pairing, selectedPair: pairType, assessmentId })}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" />
              Align & Publish
            </button>
          ) : pairComplete && !canCurrentUserPublish ? (
            <button
              onClick={() => onView360Pair({ ...pairing, selectedPair: pairType, assessmentId })}
              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View (Read-Only)
            </button>
          ) : (
            <button
              onClick={() => onView360Pair({ ...pairing, selectedPair: pairType, assessmentId })}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Monitor
            </button>
          )}
        </div>

        {/* 2 Assessment Boxes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Box 1: Subject Self */}
          <div className={`p-3 rounded-lg border-2 ${
            selfStatus === 'completed' || selfStatus === 'calibrated'
              ? 'bg-green-50 border-green-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="text-xs font-semibold text-gray-600 mb-1">
              {isPeerPairing ? 'Peer Self' : pairType === 'A' ? 'Subject Self (DR)' : 'Subject Self (MR)'}
            </div>
            <div className="text-sm font-bold text-gray-900 mb-2">
              {subjectPerson?.displayName || subjectPerson?.name}
            </div>
            {getStatusBadge(selfStatus)}
          </div>

          {/* Box 2: Assessor → Subject */}
          <div className={`p-3 rounded-lg border-2 ${
            assessmentStatus === 'completed' || assessmentStatus === 'calibrated'
              ? 'bg-blue-50 border-blue-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="text-xs font-semibold text-gray-600 mb-1">
              {isPeerPairing ? 'Peer → Peer' : pairType === 'A' ? 'Manager → DR' : 'DR → Manager'}
            </div>
            <div className="text-sm font-bold text-gray-900 mb-2">
              {assessorPerson?.displayName || assessorPerson?.name} → {subjectPerson?.displayName || subjectPerson?.name}
            </div>
            {getStatusBadge(assessmentStatus)}
          </div>
        </div>
      </div>
    );
  };

  // Render 360° Pairings View
  const render360Pairings = () => {
    if (pairings.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{emptyStateMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {pairings.map((pairing) => {
          const iAmPersonA = pairing.personA?.uid === currentUserId;
          const personA = pairing.personA;
          const personB = pairing.personB;

          // Pair A: Person A assesses Person B (Person B is subject)
          const pairA_subjectSelf = pairing.status.personB_self;
          const pairA_assessment = pairing.status.personA_to_B;

          // Pair B: Person B assesses Person A (Person A is subject)
          const pairB_subjectSelf = pairing.status.personA_self;
          const pairB_assessment = pairing.status.personB_to_A;

          return (
            <div key={pairing.pairId} className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
              {/* Pairing Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  pairing.relationshipType === 'peer' 
                    ? 'bg-violet-100' 
                    : 'bg-indigo-100'
                }`}>
                  <Users className={`w-5 h-5 ${
                    pairing.relationshipType === 'peer' 
                      ? 'text-violet-600' 
                      : 'text-indigo-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {personA?.displayName || personA?.name} ↔ {personB?.displayName || personB?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {pairing.relationshipType === 'peer' ? (
                      <>360° Peer-to-Peer • Each peer publishes their own MSH</>
                    ) : (
                      <>360° Manager/Direct Report • Manager publishes both MSHs</>
                    )}
                  </p>
                </div>
              </div>

              {/* Pair A and Pair B side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Pair A Card */}
                {renderPairCard(
                  pairing,
                  'A',
                  personB, // Subject (being assessed)
                  personA, // Assessor (publisher)
                  pairA_subjectSelf,
                  pairA_assessment,
                  pairing.assessmentIds?.personA_to_B // Pass assessment ID for navigation
                )}

                {/* Pair B Card */}
                {renderPairCard(
                  pairing,
                  'B',
                  personA, // Subject (being assessed)
                  personB, // Assessor (publisher)
                  pairB_subjectSelf,
                  pairB_assessment,
                  pairing.assessmentIds?.personB_to_A // Pass assessment ID for navigation
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Individual Assessments View
  const renderAssessments = () => {
    if (assessments.length === 0) {
      return (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{emptyStateMessage}</p>
        </div>
      );
    }

    const groupedAssessments = groupAssessmentsByMonth(assessments);

    return (
      <div className="space-y-6">
        {groupedAssessments.map((group) => (
          <div key={`${group.cycleMonth}-${group.cycleYear}`} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{group.monthName}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  group.cycleType === '1x1' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {group.cycleType === '1x1' ? '1x1 Assessments' : '360° Assessments'} • {group.assessments.length} shown
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {viewMode === 'give' ? 'Subject' : 'Assessor'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Layer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pillar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sub-Pillar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Composite
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HRP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MSH ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.assessments
                    .sort((a, b) => {
                      const aIsSelf = a.isSelfAssessment || a.assessorUid === a.subjectUid;
                      const bIsSelf = b.isSelfAssessment || b.assessorUid === b.subjectUid;
                      
                      if (aIsSelf && !bIsSelf) return -1;
                      if (!aIsSelf && bIsSelf) return 1;
                      
                      if (a.pairId && b.pairId) {
                        if (a.pairId === b.pairId) {
                          return (a.assessorName || '').localeCompare(b.assessorName || '');
                        }
                        return a.pairId.localeCompare(b.pairId);
                      }
                      
                      if (a.pairId && !b.pairId) return -1;
                      if (!a.pairId && b.pairId) return 1;
                      
                      const nameA = viewMode === 'give' ? a.subjectName : a.assessorName;
                      const nameB = viewMode === 'give' ? b.subjectName : b.assessorName;
                      return (nameA || '').localeCompare(nameB || '');
                    })
                    .map((assessment, index, array) => {
                      const isMyAssessment = assessment.assessorUid === currentUserId;
                      const canEdit = assessment.viewAccess === 'edit' && 
                                     (assessment.status === 'pending' || assessment.status === 'in-progress');
                      const isSelf = assessment.isSelfAssessment || assessment.assessorUid === assessment.subjectUid;
                      const typeBadge = getTypeBadge(assessment);
                      const TypeIcon = typeBadge.icon;
                      
                      const hasPair = assessment.pairId && !isSelf;
                      const prevAssessment = index > 0 ? array[index - 1] : null;
                      const nextAssessment = index < array.length - 1 ? array[index + 1] : null;
                      const isFirstInPair = hasPair && (!prevAssessment || prevAssessment.pairId !== assessment.pairId);
                      const isLastInPair = hasPair && (!nextAssessment || nextAssessment.pairId !== assessment.pairId);

                      return (
                        <tr key={assessment.id} className={`hover:bg-gray-50 ${isSelf ? 'bg-orange-50/30' : hasPair ? 'bg-indigo-50/20' : ''} ${isFirstInPair ? 'border-t-2 border-indigo-300' : ''} ${isLastInPair ? 'border-b-2 border-indigo-300' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {hasPair && (
                                <div className="flex-shrink-0">
                                  <Users className="w-4 h-4 text-indigo-600" />
                                </div>
                              )}
                              {canEdit ? (
                                <button
                                  onClick={() => onStartAssessment(assessment)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                  <FileText className="w-4 h-4" />
                                  Assess
                                </button>
                              ) : assessment.viewAccess === 'read-only' && assessment.isPillarVisibility ? (
                                <button
                                  onClick={() => onViewAssessment(assessment.id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800"
                                >
                                  <Eye className="w-4 h-4" />
                                  Monitor
                                </button>
                              ) : (
                                <button
                                  onClick={() => onViewAssessment(assessment.id)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {viewMode === 'give' ? assessment.subjectName : assessment.assessorName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {viewMode === 'give' 
                                ? assessment.subjectEmail 
                                : (assessment.assessorLayer || '')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {viewMode === 'give' ? assessment.subjectLayer : assessment.assessorLayer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {assessment.subjectPillar ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {getPillarAbbreviation(assessment.subjectPillar)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {assessment.subjectSubPillar ? getSubPillarDisplayName(assessment.subjectSubPillar) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(assessment.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {assessment.composite !== null && assessment.composite !== undefined 
                              ? assessment.composite 
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getAlignmentBadge(assessment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getHRPIndicator(assessment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getNotesIndicator(assessment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
        ))}
      </div>
    );
  };

  return showPairings ? render360Pairings() : renderAssessments();
}

export default UnifiedAssessmentGrid;