import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Calendar, Zap, Users, ArrowRight, 
  TrendingUp, Award, User, Building2, Eye, AlertTriangle, RefreshCw
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { getPillarDisplayName } from '../../utils/pillarHelpers';

function ISOSHubISE() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Cycle start date: October 1, 2025
  const CYCLE_START_DATE = new Date(2025, 9, 1);
  
  // State
  const [islMembers, setIslMembers] = useState([]);
  const [isfMembers, setIsfMembers] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [pillarComposites, setPillarComposites] = useState({});
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

  // Helper function to calculate 5 business days from start of month
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

  // Helper function to get current cycle info
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
      isPastDeadline,
      label: `Cycle ${cycleNumber} • Month ${cycleMonth} (${assessmentType})`
    };
  };

  // Helper function to categorize composite scores into 4 zones
  const getCompositeZone = (score) => {
    if (score >= 0 && score <= 4) return 'below';
    if (score >= 5 && score <= 6) return 'baseline';
    if (score >= 7 && score <= 10) return 'above';
    if (score >= 11 && score <= 12) return 'exceptional';
    return 'baseline';
  };

  // Helper function to calculate zone distribution
  const calculateZoneDistribution = (scores) => {
    const zones = { below: 0, baseline: 0, above: 0, exceptional: 0 };
    scores.forEach(score => {
      const zone = getCompositeZone(score);
      zones[zone]++;
    });
    return zones;
  };

  // Fetch org data
  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        setLoading(true);
        
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const cycleInfo = getCurrentCycleInfo(now);
        
        // Get all pillars
        const pillarsRef = collection(db, 'pillars');
        const pillarsSnapshot = await getDocs(pillarsRef);
        const pillarsData = pillarsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPillars(pillarsData);

        // Get ISL members
        const directReportIds = user.directReportIds || [];
        
        if (directReportIds.length === 0) {
          setLoading(false);
          return;
        }

        const usersRef = collection(db, 'users');
        const assessmentsRef = collection(db, 'assessments');
        const members = [];
        
        for (const islId of directReportIds) {
          const userQuery = query(usersRef, where('userId', '==', islId));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const islData = userSnapshot.docs[0].data();
            const pillar = pillarsData.find(p => p.pillarLeaderId === islId);
            
            let teamSize = 0;
            if (pillar) {
              const pillarMembersQuery = query(usersRef, where('pillar', '==', pillar.pillarId));
              const pillarMembersSnapshot = await getDocs(pillarMembersQuery);
              teamSize = pillarMembersSnapshot.docs.filter(doc => doc.data().userId !== islId).length;
            }
            
            // Check for pending assessment
            const pendingQuery = query(
              assessmentsRef,
              where('assesseeId', '==', islId),
              where('status', '==', 'pending'),
              where('cycleMonth', '==', currentMonth),
              where('cycleYear', '==', currentYear)
            );
            const pendingSnapshot = await getDocs(pendingQuery);
            
            let currentAssessment = null;
            
            if (!pendingSnapshot.empty) {
              const pendingDoc = pendingSnapshot.docs[0];
              currentAssessment = {
                ...pendingDoc.data(),
                id: pendingDoc.id,
                status: 'pending',
                createdAt: pendingDoc.data().createdAt?.toDate?.() || null,
                completedAt: null
              };
            } else {
              // Check for completed assessment this month
              const completedQuery = query(
                assessmentsRef,
                where('assesseeId', '==', islId),
                where('assessorId', '==', user.uid)
              );
              const completedSnapshot = await getDocs(completedQuery);
              
              const sortedAssessments = completedSnapshot.docs
                .map(doc => ({
                  ...doc.data(),
                  id: doc.id,
                  completedAt: doc.data().completedAt?.toDate?.() || null,
                  createdAt: doc.data().createdAt?.toDate?.() || null
                }))
                .filter(a => a.completedAt)
                .sort((a, b) => b.completedAt - a.completedAt);
              
              if (sortedAssessments.length > 0) {
                const latestCompleted = sortedAssessments[0];
                const completedMonth = latestCompleted.completedAt.getMonth() + 1;
                const completedYear = latestCompleted.completedAt.getFullYear();
                
                if (completedMonth === currentMonth && completedYear === currentYear) {
                  currentAssessment = latestCompleted;
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
        }

        setIslMembers(members);

        // Get all ISF members
        const isfQuery = query(usersRef, where('layer', '==', 'ISF'));
        const isfSnapshot = await getDocs(isfQuery);
        
        const isfMembersList = isfSnapshot.docs.map(doc => ({
          id: doc.id,
          userId: doc.data().userId,
          name: doc.data().displayName,
          pillar: doc.data().pillar,
          subPillar: doc.data().subPillar,
          teamSize: doc.data().teamSize || 0
        }));
        
        setIsfMembers(isfMembersList);

        // Get ISE assessment
        let iseAssessment = null;
        let iseLastAssessed = null;
        let iseComposite = null;
        
        const iseAssessmentsQuery = query(
          collection(db, 'assessments'),
          where('assesseeId', '==', user.uid)
        );
        const iseAssessmentsSnapshot = await getDocs(iseAssessmentsQuery);
        
        if (!iseAssessmentsSnapshot.empty) {
          const sortedIseAssessments = iseAssessmentsSnapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt?.toDate?.() || new Date(0);
            const bTime = b.data().createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          
          for (const doc of sortedIseAssessments) {
            const data = doc.data();
            if (data.composite && (data.status === 'completed' || data.status === 'not-aligned')) {
              iseAssessment = {
                composite: data.composite,
                completedAt: data.completedAt?.toDate?.() || null
              };
              iseComposite = data.composite;
              if (iseAssessment.completedAt) {
                const date = iseAssessment.completedAt;
                iseLastAssessed = `${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
              }
              break;
            }
          }
        }

        // Calculate metrics - FIXED: Use consistent month format (1-12)
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
        
        // FIXED: ISE assessment check with consistent month format
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
        
        // ISF metrics
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
        
        for (const isf of isfMembersList) {
          const isfId = isf.userId;
          const isfAssessmentQuery = query(assessmentsRef, where('assesseeId', '==', isfId));
          const isfAssessmentSnapshot = await getDocs(isfAssessmentQuery);
          
          const sortedAssessments = isfAssessmentSnapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt?.toDate?.() || new Date(0);
            const bTime = b.data().createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          
          for (const assessmentDoc of sortedAssessments) {
            const assessmentData = assessmentDoc.data();
            const completedAt = assessmentData.completedAt?.toDate?.();
            
            // FIXED: ISF assessment check with consistent month format
            if (assessmentData.composite && 
                (assessmentData.status === 'completed' || assessmentData.status === 'not-aligned') &&
                completedAt) {
              const isfMonth = completedAt.getMonth() + 1;
              const isfYear = completedAt.getFullYear();
              if (isfMonth === currentMonth && isfYear === currentYear) {
                isfScoresThisMonth.push(assessmentData.composite);
                break;
              }
            }
          }
        }
        
        const pillarAvgHealth = isfScoresThisMonth.length > 0
          ? (isfScoresThisMonth.reduce((a, b) => a + b, 0) / isfScoresThisMonth.length)
          : 0;
        
        const pillarZones = calculateZoneDistribution(isfScoresThisMonth);
        
        // ISL/ISF running totals for Gold Standard
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
        for (const isf of isfMembersList) {
          const isfId = isf.userId;
          const isfAssessmentQuery = query(assessmentsRef, where('assesseeId', '==', isfId));
          const isfAssessmentSnapshot = await getDocs(isfAssessmentQuery);
          
          const sortedAssessments = isfAssessmentSnapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt?.toDate?.() || new Date(0);
            const bTime = b.data().createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          
          for (const assessmentDoc of sortedAssessments) {
            const assessmentData = assessmentDoc.data();
            if (assessmentData.composite && 
                (assessmentData.status === 'completed' || assessmentData.status === 'not-aligned')) {
              isfLatestScores.push(assessmentData.composite);
              break;
            }
          }
        }
        
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
          
          for (const memberId of memberIds) {
            const memberAssessmentQuery = query(assessmentsRef, where('assesseeId', '==', memberId));
            const memberAssessmentSnapshot = await getDocs(memberAssessmentQuery);
            
            if (!memberAssessmentSnapshot.empty) {
              const sortedAssessments = memberAssessmentSnapshot.docs.sort((a, b) => {
                const aTime = a.data().createdAt?.toDate?.() || new Date(0);
                const bTime = b.data().createdAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });
              
              for (const doc of sortedAssessments) {
                const data = doc.data();
                if (data.composite && (data.status === 'completed' || data.status === 'not-aligned')) {
                  pillarComposites.push(data.composite);
                  break;
                }
              }
            }
          }
          
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

  const handleViewAssessment = (assessmentId) => {
    navigate(`/is-os/assessments/view/${assessmentId}`);
  };

  const handleViewPillar = (pillarId) => {
    alert(`Pillar metrics view coming soon! Pillar: ${pillarId}`);
  };

  const handleStartAssessments = () => {
    const firstPending = islMembers.find(m => m.currentAssessment?.status === 'pending');
    
    if (firstPending && firstPending.currentAssessment) {
      navigate(`/is-os/assessments/${metrics.assessmentType}/edit/${firstPending.currentAssessment.id}`);
    } else {
      navigate(`/is-os/assessments/${metrics.assessmentType}/edit`);
    }
  };

  const getPillarMemberCount = (pillar) => {
    return isfMembers.filter(member => member.pillar === pillar.pillarId).length;
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
      
      {/* Banner */}
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
        
        {/* Stat Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Executive Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* IS Gold Standard */}
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

            {/* ISL Leadership */}
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

            {/* Composite Pillar Health */}
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
        
        {/* Pillar Overview */}
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

        {/* My Team Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Team</h2>
              <p className="text-gray-600 mt-1">
                {metrics.currentMonthName} • {metrics.assessmentType === '1x1' ? '1x1 Assessments' : '360 Assessments'}
              </p>
            </div>
            
            <Button
              onClick={handleStartAssessments}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Start {metrics.assessmentType === '1x1' ? '1x1' : '360'} Assessments
            </Button>
          </div>

          {islMembers.length === 0 ? (
            <Card className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Team Members</h3>
              <p className="text-gray-600">No direct reports found</p>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Layer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pillar</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Team Size</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Position</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {islMembers.map((member) => {
                      const assessment = member.currentAssessment;
                      const isPublished = assessment && (assessment.status === 'completed' || assessment.status === 'not-aligned');
                      
                      let statusBadge = null;
                      if (!assessment) {
                        statusBadge = <Badge variant="secondary">No Assessment</Badge>;
                      } else if (assessment.status === 'pending') {
                        statusBadge = <Badge variant="warning" className="bg-orange-100 text-orange-800">Pending</Badge>;
                      } else if (assessment.status === 'draft') {
                        statusBadge = <Badge variant="secondary" className="bg-gray-100 text-gray-800">Draft</Badge>;
                      } else if (assessment.status === 'completed') {
                        statusBadge = <Badge variant="success">Aligned</Badge>;
                      } else if (assessment.status === 'not-aligned') {
                        statusBadge = <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Not Aligned</Badge>;
                      }

                      return (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-100 p-2 rounded-lg">
                                <User className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{member.name}</div>
                                <div className="text-xs text-gray-500">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="primary" className="text-xs">{member.layer}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="text-xs">{getPillarDisplayName(member.pillarId)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-gray-700">{member.teamSize}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {statusBadge}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPublished ? (
                              <div className="text-lg font-bold text-gray-900">{assessment.composite}</div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPublished ? (
                              <div className="text-sm font-semibold text-gray-900">{assessment.nineBoxPosition}</div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPublished && assessment.hrpRequested && (
                              <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs">HRP</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPublished ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleViewAssessment(assessment.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                {assessment.mshId || 'View'}
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Bottom Cards */}
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