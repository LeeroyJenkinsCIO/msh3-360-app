// 📁 SAVE TO: src/pages/is-os/ISOSHubISE.js
// ISE Hub - Executive view with Gold Standard metrics

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Zap, Users, ArrowRight, 
  TrendingUp, Award, Building2, AlertTriangle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { getPillarDisplayName } from '../../utils/pillarHelpers';
import AssessmentCycleGrid from '../../components/hubs/AssessmentCycleGrid';

function ISOSHubISE() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // ==================== CONSTANTS ====================
  const CYCLE_START_DATE = new Date(2025, 9, 1);
  
  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState('team'); // 'team' or 'myassessments'
  const [islMembers, setIslMembers] = useState([]);
  const [isfMembers, setIsfMembers] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [pillarComposites, setPillarComposites] = useState({});
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
    totalAssessmentsNeeded: 24,
    completedAssessments: 0,
    goldStandardScore: 0,
    goldStandardTier: 'Low',
    totalOrgMembers: 0,
    goldStandardTrend: 'stable',
    goldStandardZones: { below: 0, baseline: 0, above: 0, exceptional: 0 },
    islHealthForGS: 0,
    isfHealthForGS: 0,
    islAvgComposite: 0,
    islTeamSize: 6,
    islTrend: 'stable',
    islZones: { below: 0, baseline: 0, above: 0, exceptional: 0 },
    islAssessedThisMonth: 0,
    islTotalThisMonth: 5,
    iseLastAssessed: null,
    iseComposite: null,
    pillarAvgHealth: 0,
    activePillars: 0,
    completedISFAssessments: 0,
    totalISFMembers: 0,
    pillarZones: { below: 0, baseline: 0, above: 0, exceptional: 0 }
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
    const fetchOrgData = async () => {
      try {
        setLoading(true);
        
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const cycleInfo = getCurrentCycleInfo(now);
        const directReportIds = user.directReportIds || [];
        
        if (directReportIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch all data in parallel
        const [pillarsSnapshot, allUsersSnapshot, allAssessmentsSnapshot] = await Promise.all([
          getDocs(collection(db, 'pillars')),
          getDocs(collection(db, 'users')),
          getDocs(query(
            collection(db, 'assessments'),
            where('cycleMonth', '==', currentMonth),
            where('cycleYear', '==', currentYear)
          ))
        ]);
        
        // Process pillars
        const pillarsData = pillarsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPillars(pillarsData);
        
        // Build user maps
        const usersByUserId = {};
        const usersByLayer = { ISL: [], ISF: [] };
        const usersByPillar = {};
        
        allUsersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const userId = userData.userId;
          
          usersByUserId[userId] = { id: doc.id, ...userData };
          
          if (userData.layer === 'ISL') {
            usersByLayer.ISL.push({ id: doc.id, ...userData });
          } else if (userData.layer === 'ISF') {
            usersByLayer.ISF.push({ id: doc.id, ...userData });
          }
          
          if (userData.pillar) {
            if (!usersByPillar[userData.pillar]) {
              usersByPillar[userData.pillar] = [];
            }
            usersByPillar[userData.pillar].push({ id: doc.id, ...userData });
          }
        });
        
        // NEW: Process all assessments into standardized format
        const assessmentsArray = [];
        allAssessmentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const employeeData = usersByUserId[data.subjectId];
          const managerData = usersByUserId[data.assessorId];
          
          assessmentsArray.push({
            id: doc.id,
            employeeId: data.subjectId,
            employeeName: employeeData?.displayName || 'Unknown',
            employeeTitle: employeeData?.title || '',
            managerId: data.assessorId,
            managerName: managerData?.displayName || 'Unknown',
            cycleTitle: `${cycleInfo.currentMonthName} - ${cycleInfo.assessmentType}`,
            cycleStartDate: new Date(currentYear, currentMonth - 1, 1),
            cycleEndDate: new Date(currentYear, currentMonth, 0),
            dueDate: cycleInfo.deadline,
            status: data.status || 'pending',
            compositeScore: data.composite || null,
            hrpRequested: data.hrpRequested || false,
            hrpReviewedAt: data.hrpReviewedAt || null,
            isSelfAssessment: data.isSelfAssessment || false,
            createdAt: data.createdAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null
          });
        });
        
        console.log('Total assessments transformed:', assessmentsArray.length);
        console.log('Current user UID:', user.uid);
        console.log('Sample assessment:', assessmentsArray[0]);
        
        setAllAssessments(assessmentsArray);
        
        // Group assessments by subject (keep existing logic for metrics)
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
        
        // Build ISL members list (keep for metrics)
        const members = [];
        for (const islId of directReportIds) {
          const islData = usersByUserId[islId];
          if (!islData) continue;
          
          const pillar = pillarsData.find(p => p.pillarLeaderId === islId);
          let teamSize = 0;
          if (pillar && usersByPillar[pillar.pillarId]) {
            teamSize = usersByPillar[pillar.pillarId].filter(
              member => member.userId !== islId
            ).length;
          }
          
          // Find current assessment
          let currentAssessment = null;
          const islAssessments = assessmentsBySubject[islId] || [];
          
          const pendingAssessment = islAssessments.find(a => a.status === 'pending');
          if (pendingAssessment) {
            currentAssessment = pendingAssessment;
          } else {
            const completedAssessments = islAssessments
              .filter(a => {
                return a.completedAt && 
                       a.assessorId === user.uid && 
                       (a.status === 'completed' || a.status === 'not-aligned');
              })
              .sort((a, b) => b.completedAt - a.completedAt);
            
            if (completedAssessments.length > 0) {
              const latest = completedAssessments[0];
              const completedMonth = latest.completedAt.getMonth() + 1;
              const completedYear = latest.completedAt.getFullYear();
              
              if (completedMonth === currentMonth && completedYear === currentYear) {
                currentAssessment = latest;
              }
            }
          }
          
          members.push({
            id: islId,
            name: islData.displayName || 'Unknown',
            email: islData.email || '',
            layer: islData.layer || 'ISL',
            pillar: pillar?.pillarName || 'Unassigned',
            pillarId: pillar?.pillarId || null,
            teamSize: teamSize,
            currentAssessment: currentAssessment
          });
        }
        
        setIslMembers(members);
        
        // Build ISF members list
        const isfMembersList = usersByLayer.ISF.map(userData => ({
          id: userData.id,
          userId: userData.userId,
          name: userData.displayName,
          pillar: userData.pillar,
          subPillar: userData.subPillar,
          teamSize: userData.teamSize || 0
        }));
        
        setIsfMembers(isfMembersList);
        
        // Calculate ISE assessment
        let iseAssessment = null;
        let iseLastAssessed = null;
        let iseComposite = null;
        
        const iseAssessments = assessmentsBySubject[user.uid] || [];
        const sortedIseAssessments = iseAssessments
          .filter(a => a.composite && (a.status === 'completed' || a.status === 'not-aligned'))
          .sort((a, b) => {
            const aTime = a.createdAt || new Date(0);
            const bTime = b.createdAt || new Date(0);
            return bTime - aTime;
          });
        
        if (sortedIseAssessments.length > 0) {
          const latest = sortedIseAssessments[0];
          iseAssessment = {
            composite: latest.composite,
            completedAt: latest.completedAt
          };
          iseComposite = latest.composite;
          if (latest.completedAt) {
            iseLastAssessed = latest.completedAt.toLocaleDateString('en-US', { 
              month: 'short', 
              year: 'numeric' 
            });
          }
        }
        
        // Calculate ISL metrics
        const islThisMonth = members.filter(m => {
          if (!m.currentAssessment?.completedAt) return false;
          const assessmentMonth = m.currentAssessment.completedAt.getMonth() + 1;
          const assessmentYear = m.currentAssessment.completedAt.getFullYear();
          return (
            assessmentMonth === currentMonth &&
            assessmentYear === currentYear &&
            (m.currentAssessment.status === 'completed' || m.currentAssessment.status === 'not-aligned')
          );
        });
        
        const islScoresThisMonth = islThisMonth.map(m => m.currentAssessment.composite);
        
        // Include ISE score if it's a 360 month and completed this month
        if (cycleInfo.cycleMonth === 3 && iseAssessment && iseAssessment.completedAt) {
          const iseMonth = iseAssessment.completedAt.getMonth() + 1;
          const iseYear = iseAssessment.completedAt.getFullYear();
          if (iseMonth === currentMonth && iseYear === currentYear) {
            islScoresThisMonth.push(iseAssessment.composite);
          }
        }
        
        const islAvgComposite = islScoresThisMonth.length > 0
          ? (islScoresThisMonth.reduce((sum, score) => sum + score, 0) / islScoresThisMonth.length)
          : 0;
        
        const islZones = calculateZoneDistribution(islScoresThisMonth);
        const islTotalThisMonth = cycleInfo.cycleMonth === 3 ? 6 : 5;
        
        // Calculate ISF metrics
        const pillarISFCounts = {};
        isfMembersList.forEach(isf => {
          const pillarId = isf.pillar;
          if (pillarId) {
            pillarISFCounts[pillarId] = (pillarISFCounts[pillarId] || 0) + 1;
          }
        });
        
        const activePillars = Object.keys(pillarISFCounts).length;
        const totalISFMembers = isfMembersList.length;
        
        const isfScoresThisMonth = [];
        isfMembersList.forEach(isf => {
          const isfAssessments = assessmentsBySubject[isf.userId] || [];
          const latestCompleted = isfAssessments
            .filter(a => 
              a.composite && 
              (a.status === 'completed' || a.status === 'not-aligned') &&
              a.completedAt
            )
            .sort((a, b) => b.createdAt - a.createdAt)[0];
          
          if (latestCompleted) {
            const isfMonth = latestCompleted.completedAt.getMonth() + 1;
            const isfYear = latestCompleted.completedAt.getFullYear();
            if (isfMonth === currentMonth && isfYear === currentYear) {
              isfScoresThisMonth.push(latestCompleted.composite);
            }
          }
        });
        
        const pillarAvgHealth = isfScoresThisMonth.length > 0
          ? (isfScoresThisMonth.reduce((a, b) => a + b, 0) / isfScoresThisMonth.length)
          : 0;
        
        const pillarZones = calculateZoneDistribution(isfScoresThisMonth);
        
        // Calculate Gold Standard components
        const islLatestScores = [];
        members.forEach(m => {
          if (m.currentAssessment?.composite && 
              (m.currentAssessment.status === 'completed' || m.currentAssessment.status === 'not-aligned')) {
            islLatestScores.push(m.currentAssessment.composite);
          }
        });
        
        if (iseAssessment) {
          islLatestScores.push(iseAssessment.composite);
        }
        
        const islHealthForGS = islLatestScores.length > 0
          ? (islLatestScores.reduce((a, b) => a + b, 0) / islLatestScores.length)
          : 0;
        
        const isfLatestScores = [];
        isfMembersList.forEach(isf => {
          const isfAssessments = assessmentsBySubject[isf.userId] || [];
          const latestCompleted = isfAssessments
            .filter(a => a.composite && (a.status === 'completed' || a.status === 'not-aligned'))
            .sort((a, b) => {
              const aTime = a.createdAt || new Date(0);
              const bTime = b.createdAt || new Date(0);
              return bTime - aTime;
            })[0];
          
          if (latestCompleted) {
            isfLatestScores.push(latestCompleted.composite);
          }
        });
        
        const isfHealthForGS = isfLatestScores.length > 0
          ? (isfLatestScores.reduce((a, b) => a + b, 0) / isfLatestScores.length)
          : 0;
        
        // Calculate pillar composites
        const pillarScores = {};
        const isfByPillar = {};
        isfMembersList.forEach(isf => {
          const pillarId = isf.pillar;
          if (pillarId) {
            if (!isfByPillar[pillarId]) {
              isfByPillar[pillarId] = [];
            }
            isfByPillar[pillarId].push(isf.userId);
          }
        });
        
        for (const [pillarId, memberIds] of Object.entries(isfByPillar)) {
          const pillarComposites = [];
          
          memberIds.forEach(memberId => {
            const memberAssessments = assessmentsBySubject[memberId] || [];
            const latestCompleted = memberAssessments
              .filter(a => a.composite && (a.status === 'completed' || a.status === 'not-aligned'))
              .sort((a, b) => {
                const aTime = a.createdAt || new Date(0);
                const bTime = b.createdAt || new Date(0);
                return bTime - aTime;
              })[0];
            
            if (latestCompleted) {
              pillarComposites.push(latestCompleted.composite);
            }
          });
          
          const avgComposite = pillarComposites.length > 0
            ? (pillarComposites.reduce((a, b) => a + b, 0) / pillarComposites.length)
            : 0;
          
          pillarScores[pillarId] = {
            avgComposite: avgComposite.toFixed(1),
            memberCount: memberIds.length,
            assessedCount: pillarComposites.length
          };
        }
        
        pillarsData.forEach(pillar => {
          if (!pillarScores[pillar.pillarId]) {
            pillarScores[pillar.pillarId] = {
              avgComposite: 'N/A',
              memberCount: 0,
              assessedCount: 0
            };
          }
        });
        
        setPillarComposites(pillarScores);
        
        // Calculate final Gold Standard
        const goldStandardScore = (islHealthForGS * 0.40) + (isfHealthForGS * 0.60);
        const allLatestScores = [...islLatestScores, ...isfLatestScores];
        const goldStandardZones = calculateZoneDistribution(allLatestScores);
        
        let goldStandardTier = 'Low';
        if (goldStandardScore >= 9) {
          goldStandardTier = 'High';
        } else if (goldStandardScore >= 5) {
          goldStandardTier = 'Med';
        }
        
        const totalOrgMembers = 6 + totalISFMembers;
        const totalAssessmentsNeeded = cycleInfo.cycleMonth === 3 ? (6 + totalISFMembers) : (5 + totalISFMembers);
        const completedAssessments = islScoresThisMonth.length + isfScoresThisMonth.length;

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
          goldStandardScore: goldStandardScore.toFixed(1),
          goldStandardTier,
          totalOrgMembers,
          goldStandardTrend: 'stable',
          goldStandardZones,
          islHealthForGS: islHealthForGS.toFixed(1),
          isfHealthForGS: isfHealthForGS.toFixed(1),
          islAvgComposite: islAvgComposite.toFixed(1),
          islTeamSize: 6,
          islTrend: 'stable',
          islZones,
          islAssessedThisMonth: islScoresThisMonth.length,
          islTotalThisMonth,
          iseLastAssessed,
          iseComposite,
          pillarAvgHealth: pillarAvgHealth.toFixed(1),
          activePillars,
          completedISFAssessments: isfScoresThisMonth.length,
          totalISFMembers,
          pillarZones
        });

      } catch (error) {
        console.error('Error fetching org data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [user.uid, location.key]);

  // ==================== EVENT HANDLERS ====================
  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  const handleStartAssessments = (member) => {
    // member can be either ISL member object or assessment in My Assessments tab
    if (member.currentAssessment && member.currentAssessment.id) {
      navigate(`/is-os/assessments/${metrics.assessmentType}/edit/${member.currentAssessment.id}`);
    } else {
      const firstPending = islMembers.find(m => m.currentAssessment?.status === 'pending');
      
      if (firstPending && firstPending.currentAssessment) {
        navigate(`/is-os/assessments/${metrics.assessmentType}/edit/${firstPending.currentAssessment.id}`);
      } else {
        navigate(`/is-os/assessments/${metrics.assessmentType}/edit`);
      }
    }
  };

  const handleViewPillar = (pillarId) => {
    alert(`Pillar metrics view coming soon! Pillar: ${pillarId}`);
  };

  const handleExport = (assessments) => {
    alert(`Export functionality coming soon! ${assessments.length} assessments to export`);
  };

  const getPillarMemberCount = (pillar) => {
    return isfMembers.filter(member => member.pillar === pillar.pillarId).length;
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizational data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ==================== HERO BANNER ==================== */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-10 h-10" />
            <div>
              <h1 className="text-5xl font-bold">IS OS Hub</h1>
              <p className="text-blue-100 text-lg">
                ISE View - IS Health, Alignment to Outcome and Trending
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-blue-200 text-sm mb-1">Assessment Cycle</div>
                <div className="text-white text-lg font-semibold">
                  Cycle {metrics.cycleInYear} of 4
                </div>
                <div className="text-blue-200 text-sm mt-1">
                  Type: {metrics.assessmentType}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-blue-200 text-sm mb-1">Current Open Month</div>
                <div className="text-white text-3xl font-bold flex items-center justify-center gap-2">
                  <Calendar className="w-8 h-8" />
                  {metrics.currentMonthName}
                </div>
                <div className="text-blue-200 text-sm mt-3">
                  {metrics.completedAssessments}/{metrics.totalAssessmentsNeeded} assessments completed
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-blue-200 text-sm mb-1">Assessment Progress</div>
                <div className="text-white text-lg font-semibold">
                  {metrics.completedAssessments}/{metrics.totalAssessmentsNeeded} completed ({getPercentage(metrics.completedAssessments, metrics.totalAssessmentsNeeded)})
                </div>
                <div className={`text-sm mt-2 flex items-center justify-end gap-1 ${metrics.isPastDeadline ? 'text-yellow-300' : 'text-blue-200'}`}>
                  {metrics.isPastDeadline && <AlertTriangle className="w-4 h-4" />}
                  <span>
                    {metrics.isPastDeadline ? 'Past Deadline: ' : 'Deadline: '}
                    {metrics.deadline?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-blue-200 text-xs mt-1">
                  (5 business days from month start)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ==================== EXECUTIVE METRICS (ROW 1) ==================== */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Executive Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Gold Standard Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">IS Gold Standard</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.goldStandardScore}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-blue-200">
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Below Baseline (0-4):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.goldStandardZones.below} ({getPercentage(metrics.goldStandardZones.below, metrics.totalOrgMembers)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Baseline (5-6):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.goldStandardZones.baseline} ({getPercentage(metrics.goldStandardZones.baseline, metrics.totalOrgMembers)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Above Baseline (7-10):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.goldStandardZones.above} ({getPercentage(metrics.goldStandardZones.above, metrics.totalOrgMembers)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Exceptional (11-12):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.goldStandardZones.exceptional} ({getPercentage(metrics.goldStandardZones.exceptional, metrics.totalOrgMembers)})
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-blue-200 space-y-2">
                  <div className="text-xs text-center mb-2 text-gray-600 font-medium">
                    Weighted Average (40% ISL + 60% ISF)
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">ISL Health:</span>
                    <span className="font-semibold text-gray-900">{metrics.islHealthForGS} (6 leaders)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">ISF Health:</span>
                    <span className="font-semibold text-gray-900">{metrics.isfHealthForGS} ({metrics.totalISFMembers} members)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-blue-200">
                    <span className="text-gray-600">Total Members</span>
                    <span className="font-semibold text-gray-900">{metrics.totalOrgMembers}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* ISL Leadership Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">ISL Leadership</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.islAvgComposite}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-purple-200">
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Below Baseline (0-4):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.islZones.below} ({getPercentage(metrics.islZones.below, metrics.islAssessedThisMonth)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Baseline (5-6):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.islZones.baseline} ({getPercentage(metrics.islZones.baseline, metrics.islAssessedThisMonth)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Above Baseline (7-10):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.islZones.above} ({getPercentage(metrics.islZones.above, metrics.islAssessedThisMonth)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Exceptional (11-12):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.islZones.exceptional} ({getPercentage(metrics.islZones.exceptional, metrics.islAssessedThisMonth)})
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-purple-200 space-y-2">
                  <div className="text-xs text-center mb-2 text-gray-600 font-medium">
                    ISE + 5 ISL Direct Reports
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Assessments</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.islAssessedThisMonth}/{metrics.islTotalThisMonth} completed ({getPercentage(metrics.islAssessedThisMonth, metrics.islTotalThisMonth)})
                    </span>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-purple-200 bg-purple-50 -mx-3 px-3 py-2 rounded-b-lg">
                    <div className="text-xs text-purple-800 font-medium mb-2 text-center">ISE 360 Score</div>
                    {metrics.iseLastAssessed ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">Score:</span>
                          <span className="font-bold text-purple-900">{metrics.iseComposite} ({getCompositeZoneName(metrics.iseComposite)})</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-600">Last 360:</span>
                          <span className="font-semibold text-gray-900">{metrics.iseLastAssessed}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">Score:</span>
                          <span className="font-semibold text-gray-600 italic">Not yet assessed</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-600">Last 360:</span>
                          <span className="font-semibold text-gray-600 italic">No 360 completed</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Composite Pillar Health Card */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Composite Pillar Health</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {metrics.pillarAvgHealth}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      0-12 scale
                    </div>
                  </div>
                </div>
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-green-200">
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Below Baseline (0-4):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.below} ({getPercentage(metrics.pillarZones.below, metrics.completedISFAssessments)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Baseline (5-6):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.baseline} ({getPercentage(metrics.pillarZones.baseline, metrics.completedISFAssessments)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Above Baseline (7-10):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.above} ({getPercentage(metrics.pillarZones.above, metrics.completedISFAssessments)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Exceptional (11-12):</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.pillarZones.exceptional} ({getPercentage(metrics.pillarZones.exceptional, metrics.completedISFAssessments)})
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-green-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active Pillars</span>
                    <span className="font-semibold text-gray-900">{metrics.activePillars}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Assessments</span>
                    <span className="font-semibold text-gray-900">
                      {metrics.completedISFAssessments}/{metrics.totalISFMembers} completed ({getPercentage(metrics.completedISFAssessments, metrics.totalISFMembers)})
                    </span>
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </div>
        
        {/* ==================== PILLAR OVERVIEW (ROW 2) ==================== */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pillar Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {pillars.map((pillar) => {
              const pillarScore = pillarComposites[pillar.pillarId] || { avgComposite: 'N/A', memberCount: 0 };
              const zone = pillarScore.avgComposite !== 'N/A' 
                ? getCompositeZoneName(parseFloat(pillarScore.avgComposite))
                : 'N/A';
              
              return (
                <Card 
                  key={pillar.pillarId}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewPillar(pillar.pillarId)}
                >
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: `${pillar.color}20` }}
                    >
                      <Building2 className="w-6 h-6" style={{ color: pillar.color }} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{pillar.pillarName}</h3>
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {getPillarMemberCount(pillar)} members
                      </Badge>
                      <div className="text-xs text-gray-600 mt-2">
                        Composite: <span className="font-semibold text-gray-900">{pillarScore.avgComposite}</span>
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {zone}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Team
              </button>
              <button
                onClick={() => setActiveTab('myassessments')}
                className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'myassessments'
                    ? 'border-blue-600 text-blue-600'
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
              members={islMembers}
              assessmentType={metrics.assessmentType}
              currentMonthName={metrics.currentMonthName}
              onStartAssessments={handleStartAssessments}
              onViewAssessment={handleViewAssessment}
              showStartButton={true}
              emptyStateMessage="No direct reports found"
              showPillarColumn={true}
              showTeamSizeColumn={true}
              showHRPColumn={true}
            />
          )}

          {activeTab === 'myassessments' && (
            <AssessmentCycleGrid
              members={(() => {
                // Transform assessments where current user is the subject
                const myAssessments = allAssessments.filter(a => a.employeeId === user.uid);
                console.log('My Assessments filtered:', myAssessments.length, 'User UID:', user.uid);
                
                return myAssessments.map(assessment => ({
                  id: assessment.id,
                  name: assessment.isSelfAssessment ? 'Self-Assessment' : 'Manager Assessment',
                  email: user.email || '',
                  layer: 'ISE',
                  pillar: assessment.pillar,
                  pillarId: assessment.pillarId,
                  teamSize: 0,
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
              })()}
              assessmentType={metrics.assessmentType}
              currentMonthName={metrics.currentMonthName}
              onStartAssessments={handleStartAssessments}
              onViewAssessment={handleViewAssessment}
              showStartButton={true}
              emptyStateMessage="No assessments assigned to you yet"
              showPillarColumn={false}
              showTeamSizeColumn={false}
              showHRPColumn={true}
            />
          )}
        </div>

        {/* ==================== QUICK ACTIONS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">IS Gold Standard</h3>
                <p className="text-sm text-gray-600">
                  Organizational health metrics across all pillars
                </p>
              </div>
              <Award className="w-8 h-8 text-blue-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Gold Standard metrics coming soon!')}
            >
              View Metrics
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">ISL Metric</h3>
                <p className="text-sm text-gray-600">
                  Leadership effectiveness and cross-pillar collaboration
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('ISL Metric coming soon!')}
            >
              View Metric
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Org Analytics</h3>
                <p className="text-sm text-gray-600">
                  Trends, insights, and performance patterns
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              onClick={() => alert('Org Analytics coming soon!')}
            >
              View Analytics
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default ISOSHubISE;