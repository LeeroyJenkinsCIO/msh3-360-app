// 📁 SAVE TO: src/pages/is-os/ISOSHubISL.jsx
// ISL Hub - Pillar Leader view with team metrics

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Zap, ArrowRight, 
  TrendingUp, Award, User, Building2, Target, CheckCircle, AlertTriangle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getPillarDisplayName } from '../../utils/pillarHelpers';
import AssessmentCycleGrid from '../../components/hubs/AssessmentCycleGrid';

function ISOSHubISL() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ==================== CONSTANTS ====================
  const CYCLE_START_DATE = new Date(2025, 9, 1);
  
  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState('team'); // 'team' or 'myassessments'
  const [pillarInfo, setPillarInfo] = useState(null);
  const [gridMembers, setGridMembers] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]); // NEW: Store all assessments
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    cycleNumber: 1,
    cycleInYear: 1,
    cycleMonth: 1,
    assessmentType: '1x1',
    currentMonthName: 'October 2025',
    deadline: null,
    isPastDeadline: false,
    totalAssessmentsNeeded: 0,
    completedAssessments: 0,
    myLastAssessment: null,
    myComposite: null,
    myLastAssessed: null,
    pillarAvgComposite: 0,
    pillarTier: 'Low',
    pillarTrend: 'stable',
    teamSize: 0,
    pillarZones: { below: 0, baseline: 0, above: 0, exceptional: 0 },
    assessedThisMonth: 0,
    alignmentRate: 0
  });

  // ==================== HELPER FUNCTIONS ====================
  const calculateDeadline = (monthStart) => {
    let businessDays = 0;
    let currentDate = new Date(monthStart);
    
    while (businessDays < 5) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    
    return currentDate;
  };

  const getCurrentCycleInfo = (date = new Date()) => {
    const monthsSinceStart = (date.getFullYear() - CYCLE_START_DATE.getFullYear()) * 12 + 
                             (date.getMonth() - CYCLE_START_DATE.getMonth());
    
    const cycleNumber = Math.floor(monthsSinceStart / 3) + 1;
    const cycleMonth = (monthsSinceStart % 3) + 1;
    const assessmentType = cycleMonth === 3 ? '360' : '1x1';
    const cycleInYear = ((cycleNumber - 1) % 4) + 1;
    
    const currentMonthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const deadline = calculateDeadline(monthStart);
    const isPastDeadline = date > deadline;
    
    return {
      cycleNumber,
      cycleInYear,
      cycleMonth,
      assessmentType,
      currentMonthName,
      deadline,
      isPastDeadline
    };
  };

  const getCompositeZone = (score) => {
    if (score >= 0 && score <= 4) return 'below';
    if (score >= 5 && score <= 6) return 'baseline';
    if (score >= 7 && score <= 10) return 'above';
    if (score >= 11 && score <= 12) return 'exceptional';
    return 'baseline';
  };

  const calculateZoneDistribution = (scores) => {
    const zones = { below: 0, baseline: 0, above: 0, exceptional: 0 };
    scores.forEach(score => {
      const zone = getCompositeZone(score);
      zones[zone]++;
    });
    return zones;
  };

  const getPercentage = (count, total) => {
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  const getCompositeZoneName = (score) => {
    if (score >= 11 && score <= 12) return 'Exceptional';
    if (score >= 7 && score <= 10) return 'Above Baseline';
    if (score >= 5 && score <= 6) return 'Baseline';
    if (score >= 0 && score <= 4) return 'Below Baseline';
    return 'Not Assessed';
  };

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    const fetchPillarData = async () => {
      try {
        setLoading(true);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const cycleInfo = getCurrentCycleInfo(now);
        
        // Find pillar where user is leader
        const pillarsRef = collection(db, 'pillars');
        const pillarQuery = query(pillarsRef, where('pillarLeaderId', '==', user.userId));
        const pillarSnapshot = await getDocs(pillarQuery);
        
        if (pillarSnapshot.empty) {
          setLoading(false);
          return;
        }
        
        const pillarData = {
          id: pillarSnapshot.docs[0].id,
          ...pillarSnapshot.docs[0].data()
        };
        setPillarInfo(pillarData);
        
        // Fetch all data in parallel
        const [allUsersSnapshot, allAssessmentsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(
            collection(db, 'assessments'),
            where('cycleMonth', '==', currentMonth + 1),
            where('cycleYear', '==', currentYear)
          ))
        ]);
        
        // Build user maps
        const allUsersMap = {};
        const userIdToAuthUid = {};
        const usersByAuthUid = {};
        
        allUsersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          allUsersMap[userData.userId] = userData.displayName || 'Unknown';
          if (userData.userId && doc.id) {
            userIdToAuthUid[userData.userId] = doc.id;
            usersByAuthUid[doc.id] = userData;
          }
        });
        
        // NEW: Process all assessments into standardized format
        const assessmentsArray = [];
        allAssessmentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const employeeData = usersByAuthUid[data.subjectId];
          const managerData = usersByAuthUid[data.assessorId];
          
          assessmentsArray.push({
            id: doc.id,
            employeeId: data.subjectId,
            employeeName: employeeData?.displayName || 'Unknown',
            employeeEmail: employeeData?.email || '',
            employeeLayer: employeeData?.layer || 'Unknown',
            managerId: data.assessorId,
            managerName: managerData?.displayName || 'Unknown',
            cycleTitle: `${cycleInfo.currentMonthName} - ${cycleInfo.assessmentType}`,
            cycleStartDate: new Date(currentYear, currentMonth, 1),
            cycleEndDate: new Date(currentYear, currentMonth + 1, 0),
            dueDate: cycleInfo.deadline,
            status: data.status || 'pending',
            compositeScore: data.composite || null,
            hrpRequested: data.hrpRequested || false,
            hrpReviewedAt: data.hrpReviewedAt || null,
            isSelfAssessment: data.isSelfAssessment || false,
            pillar: employeeData?.pillar,
            pillarId: employeeData?.pillar,
            subPillar: employeeData?.subPillar,
            nineBoxPosition: data.nineBoxPosition || null,
            mshId: data.mshId || doc.id.slice(0, 8),
            createdAt: data.createdAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null
          });
        });
        
        console.log('ISL - Total assessments transformed:', assessmentsArray.length);
        console.log('ISL - Current user UID:', user.uid);
        console.log('ISL - Sample assessment:', assessmentsArray[0]);
        
        setAllAssessments(assessmentsArray);
        
        // Group assessments by subject
        const assessmentsBySubject = {};
        allAssessmentsSnapshot.docs.forEach(doc => {
          const assessmentData = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
            completedAt: doc.data().completedAt?.toDate?.() || null
          };
          
          const subjectId = assessmentData.subjectId;
          if (!assessmentsBySubject[subjectId]) {
            assessmentsBySubject[subjectId] = [];
          }
          assessmentsBySubject[subjectId].push(assessmentData);
        });
        
        // Get pillar members
        const usersRef = collection(db, 'users');
        const pillarMembersQuery = query(
          usersRef,
          where('pillar', '==', pillarData.pillarId)
        );
        const membersSnapshot = await getDocs(pillarMembersQuery);
        
        const allMembers = [];
        
        for (const doc of membersSnapshot.docs) {
          const memberData = doc.data();
          
          // Skip self
          if (memberData.userId === user.userId) continue;
          
          // Get assessor info
          const assessorUserId = memberData.managerId || user.userId;
          const assessorAuthUid = userIdToAuthUid[assessorUserId] || user.uid;
          const assessorName = allUsersMap[assessorUserId] || 'Unknown';
          
          // Get member's Firebase auth UID
          const memberAuthUid = userIdToAuthUid[memberData.userId];
          if (!memberAuthUid) continue;
          
          // Get assessments for this member
          const memberAssessments = assessmentsBySubject[memberAuthUid] || [];
          
          let latestAssessment = null;
          
          if (memberAssessments.length > 0) {
            const sortedAssessments = memberAssessments.sort((a, b) => {
              const aTime = a.createdAt || new Date(0);
              const bTime = b.createdAt || new Date(0);
              return bTime - aTime;
            });
            
            // Look for pending assessment first
            const pendingAssessment = sortedAssessments.find(a => a.status === 'pending');
            
            if (pendingAssessment) {
              latestAssessment = pendingAssessment;
            } else {
              // Look for completed assessments by the correct assessor
              const completedAssessments = sortedAssessments
                .filter(a => {
                  return a.completedAt && 
                         a.assessorId === assessorAuthUid && 
                         (a.status === 'completed' || a.status === 'not-aligned');
                })
                .sort((a, b) => b.completedAt - a.completedAt);
              
              if (completedAssessments.length > 0) {
                latestAssessment = completedAssessments[0];
              }
            }
          }

          // Get sub-pillar
          let memberSubPillar = 'Unassigned';
          if (memberData.subPillar) {
            memberSubPillar = memberData.subPillar;
          } else if (pillarData.subPillars) {
            for (const [subPillarKey, subPillarData] of Object.entries(pillarData.subPillars)) {
              if (subPillarData.memberIds?.includes(memberData.userId)) {
                memberSubPillar = subPillarData.name || subPillarKey;
                break;
              }
            }
          }

          const memberInfo = {
            id: memberData.userId,
            name: memberData.displayName || 'Unknown',
            email: memberData.email || '',
            layer: memberData.layer || 'ISF',
            pillarRole: memberData.pillarRole || 'Team Member',
            subPillar: memberSubPillar,
            pillarId: pillarData.pillarId,
            managerId: memberData.managerId,
            assessorName: assessorName,
            isSupervisor: memberData.flags?.isSupervisor || false,
            isDirectReport: memberData.managerId === user.userId,
            currentAssessment: latestAssessment,
            teamSize: 0
          };
          
          allMembers.push(memberInfo);
        }
        
        setGridMembers(allMembers);
        
        // Get ISL's own assessment
        let myLastAssessment = null;
        let myComposite = null;
        let myLastAssessed = null;
        
        const myAssessments = assessmentsBySubject[user.uid] || [];
        const sortedMyAssessments = myAssessments
          .filter(a => a.composite && (a.status === 'completed' || a.status === 'not-aligned'))
          .sort((a, b) => {
            const aTime = a.createdAt || new Date(0);
            const bTime = b.createdAt || new Date(0);
            return bTime - aTime;
          });
        
        if (sortedMyAssessments.length > 0) {
          const latest = sortedMyAssessments[0];
          myLastAssessment = latest;
          myComposite = latest.composite;
          if (latest.completedAt) {
            myLastAssessed = `${latest.completedAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
          }
        }

        // Calculate pillar metrics
        const publishedAssessments = allMembers.filter(m => 
          m.currentAssessment?.composite !== undefined && 
          (m.currentAssessment.status === 'completed' || m.currentAssessment.status === 'not-aligned')
        );
        
        const pillarScores = publishedAssessments.map(m => m.currentAssessment.composite);
        const pillarAvgComposite = pillarScores.length > 0
          ? (pillarScores.reduce((sum, score) => sum + score, 0) / pillarScores.length)
          : 0;

        const pillarZones = calculateZoneDistribution(pillarScores);

        let pillarTier = 'Low';
        if (pillarAvgComposite >= 9) pillarTier = 'High';
        else if (pillarAvgComposite >= 5) pillarTier = 'Mid';

        const assessedThisMonth = allMembers.filter(m => {
          if (!m.currentAssessment?.completedAt) return false;
          const assessmentDate = m.currentAssessment.completedAt;
          return assessmentDate.getMonth() === currentMonth && 
                 assessmentDate.getFullYear() === currentYear &&
                 (m.currentAssessment.status === 'completed' || m.currentAssessment.status === 'not-aligned');
        }).length;

        const alignedMembers = publishedAssessments.filter(m => 
          m.currentAssessment.alignmentStatus === 'aligned'
        ).length;
        const alignmentRate = publishedAssessments.length > 0
          ? Math.round((alignedMembers / publishedAssessments.length) * 100)
          : 0;

        const totalAssessmentsNeeded = allMembers.length;
        const completedAssessments = assessedThisMonth;

        setMetrics({
          cycleNumber: cycleInfo.cycleNumber,
          cycleInYear: cycleInfo.cycleInYear,
          cycleMonth: cycleInfo.cycleMonth,
          assessmentType: cycleInfo.assessmentType,
          currentMonthName: cycleInfo.currentMonthName,
          deadline: cycleInfo.deadline,
          isPastDeadline: cycleInfo.isPastDeadline,
          totalAssessmentsNeeded,
          completedAssessments,
          myLastAssessment,
          myComposite,
          myLastAssessed,
          pillarAvgComposite: pillarAvgComposite.toFixed(1),
          pillarTier,
          pillarTrend: 'stable',
          teamSize: allMembers.length,
          pillarZones,
          assessedThisMonth,
          alignmentRate
        });

      } catch (error) {
        console.error('Error fetching pillar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPillarData();
  }, [user.userId]);

  // ==================== EVENT HANDLERS ====================
  const handleStartAssessments = (member) => {
    // member can be either pillar member object or assessment in My Assessments tab
    if (member.currentAssessment && member.currentAssessment.id) {
      navigate(`/is-os/assessments/${metrics.assessmentType}/edit/${member.currentAssessment.id}`);
    } else {
      const directReports = gridMembers.filter(m => m.isDirectReport);
      const firstPending = directReports.find(m => 
        m.currentAssessment?.status === 'pending' || !m.currentAssessment
      );
      
      if (firstPending) {
        if (firstPending.currentAssessment?.id) {
          navigate(`/is-os/assessments/${metrics.assessmentType}/edit/${firstPending.currentAssessment.id}`);
        } else {
          navigate(`/is-os/assessments/${metrics.assessmentType}/edit`);
        }
      } else {
        navigate(`/is-os/assessments/${metrics.assessmentType}/edit`);
      }
    }
  };

  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pillar data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ==================== HERO BANNER ==================== */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-10 h-10" />
            <div>
              <h1 className="text-5xl font-bold">IS OS Hub</h1>
              <p className="text-purple-100 text-lg">
                ISL View - {pillarInfo ? getPillarDisplayName(pillarInfo.pillarId) : 'Your Pillar'} Leadership
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <div className="text-purple-200 text-sm mb-1">Assessment Cycle</div>
                <div className="text-white text-lg font-semibold">
                  Cycle {metrics.cycleInYear} of 4
                </div>
                <div className="text-purple-200 text-sm mt-1">
                  Type: {metrics.assessmentType}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-purple-200 text-sm mb-1">Current Open Month</div>
                <div className="text-white text-3xl font-bold flex items-center justify-center gap-2">
                  <Calendar className="w-8 h-8" />
                  {metrics.currentMonthName}
                </div>
                <div className="text-purple-200 text-sm mt-3">
                  {metrics.completedAssessments}/{metrics.totalAssessmentsNeeded} assessments completed
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-purple-200 text-sm mb-1">Assessment Progress</div>
                <div className="text-white text-lg font-semibold">
                  {metrics.completedAssessments}/{metrics.totalAssessmentsNeeded} completed ({getPercentage(metrics.completedAssessments, metrics.totalAssessmentsNeeded)})
                </div>
                <div className={`text-sm mt-2 flex items-center justify-end gap-1 ${metrics.isPastDeadline ? 'text-yellow-300' : 'text-purple-200'}`}>
                  {metrics.isPastDeadline && <AlertTriangle className="w-4 h-4" />}
                  <span>
                    {metrics.isPastDeadline ? 'Past Deadline: ' : 'Deadline: '}
                    {metrics.deadline?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-purple-200 text-xs mt-1">
                  (5 business days from month start)
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ==================== PILLAR METRICS ==================== */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Pillar Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pillar Leadership Health Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Pillar Leadership Health</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.myComposite || '—'}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <User className="w-8 h-8 text-purple-600" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-purple-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cumulative Zone</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.myComposite ? getCompositeZoneName(metrics.myComposite) : 'Not Assessed'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">9-Box Position</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.myLastAssessment?.nineBoxPosition || 'Not Assessed'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Review</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.myLastAssessed || 'Never'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Pillar Health Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Pillar Health</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.pillarAvgComposite}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <Award className="w-8 h-8 text-indigo-600" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-indigo-200">
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Below Baseline (0-4):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.below} ({getPercentage(metrics.pillarZones.below, metrics.teamSize)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Baseline (5-6):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.baseline} ({getPercentage(metrics.pillarZones.baseline, metrics.teamSize)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Above Baseline (7-10):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.above} ({getPercentage(metrics.pillarZones.above, metrics.teamSize)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Exceptional (11-12):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.exceptional} ({getPercentage(metrics.pillarZones.exceptional, metrics.teamSize)})
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Team Size</span>
                    <span className="font-semibold text-gray-900">{metrics.teamSize}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Monthly Progress Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Monthly Progress</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.assessedThisMonth}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      / {metrics.totalAssessmentsNeeded}
                    </div>
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {getPercentage(metrics.assessedThisMonth, metrics.totalAssessmentsNeeded)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Alignment Rate</span>
                  <span className="font-semibold text-gray-900">{metrics.alignmentRate}%</span>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* ==================== NEW: TABBED ASSESSMENT VIEWS ==================== */}
        <div className="mb-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('team')}
                className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'team'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Team
              </button>
              <button
                onClick={() => setActiveTab('myassessments')}
                className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'myassessments'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Assessments
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'team' && (
            <AssessmentCycleGrid
              members={gridMembers}
              assessmentType={metrics.assessmentType}
              currentMonthName={metrics.currentMonthName}
              onStartAssessments={handleStartAssessments}
              onViewAssessment={handleViewAssessment}
              showStartButton={true}
              emptyStateMessage="No team members found"
              showPillarColumn={false}
              showSubPillarColumn={true}
              showTeamSizeColumn={false}
              showAssessorColumn={true}
              showHRPColumn={true}
            />
          )}

          {activeTab === 'myassessments' && (
            <AssessmentCycleGrid
              members={(() => {
                // Transform assessments where current user is the subject
                const myAssessments = allAssessments.filter(a => a.employeeId === user.uid);
                console.log('ISL - My Assessments filtered:', myAssessments.length, 'User UID:', user.uid);
                
                return myAssessments.map(assessment => ({
                  id: assessment.id,
                  name: assessment.isSelfAssessment ? 'Self-Assessment' : 'Manager Assessment',
                  email: user.email || '',
                  layer: 'ISL',
                  pillarRole: 'Pillar Leader',
                  subPillar: assessment.subPillar || 'N/A',
                  pillarId: assessment.pillarId,
                  assessorName: assessment.managerName,
                  isDirectReport: true,
                  currentAssessment: {
                    id: assessment.id,
                    status: assessment.status,
                    composite: assessment.compositeScore,
                    alignmentStatus: assessment.status === 'not-aligned' ? 'not-aligned' : 'aligned',
                    nineBoxPosition: assessment.nineBoxPosition,
                    mshId: assessment.mshId,
                    hrpRequested: assessment.hrpRequested,
                    hrpReviewedAt: assessment.hrpReviewedAt
                  },
                  teamSize: 0
                }));
              })()}
              assessmentType={metrics.assessmentType}
              currentMonthName={metrics.currentMonthName}
              onStartAssessments={handleStartAssessments}
              onViewAssessment={handleViewAssessment}
              showStartButton={true}
              emptyStateMessage="No assessments assigned to you yet"
              showPillarColumn={false}
              showSubPillarColumn={false}
              showTeamSizeColumn={false}
              showAssessorColumn={true}
              showHRPColumn={true}
            />
          )}
        </div>

        {/* ==================== QUICK ACTIONS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Pillar Dashboard</h3>
                <p className="text-sm text-gray-600">
                  Team performance trends and insights
                </p>
              </div>
              <Building2 className="w-8 h-8 text-indigo-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Pillar Dashboard coming soon!')}
            >
              View Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Team Analytics</h3>
                <p className="text-sm text-gray-600">
                  Historical trends and predictive insights
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Team Analytics coming soon!')}
            >
              View Analytics
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Development Plans</h3>
                <p className="text-sm text-gray-600">
                  Track team growth and career development
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Development Plans coming soon!')}
            >
              View Plans
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default ISOSHubISL;