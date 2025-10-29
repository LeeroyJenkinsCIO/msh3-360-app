// 📁 SAVE TO: src/pages/is-os/ISOSHubHRP.jsx
// HRP Hub - Human Resources Partner View
// ✅ FIXED: Correct HRP workflow - HRP reviews PUBLISHED MSH scores, not unpublished
// ✅ FIXED: Pending = hrpRequested + published + NOT reviewed (no hrpReviewedAt)
// ✅ FIXED: Completed = hrpRequested + published + reviewed (has hrpReviewedAt)
// ✅ FIXED: Field name is 'hrpRequested' not 'hrpReviewRequested'
// ✅ STEP 5: Updated routing - 360 pair assessments now use dedicated 360PairAssessment component
// ✅ STEP 6: Fixed MSH query to get ALL scores from 'mshs' collection (not date-filtered)
// ✅ STEP 7: Added dual-key userMap mapping (Firebase UID + userId string)
// ✅ STEP 8: HRP-specific - reviews published MSH scores (no "My Compass" metric)
// ✅ STEP 9: Fixed Assessment Progress count (was hardcoded to 0/0) + Check MSH docs for hrpRequested
// 🎨 COLORS: RED theme

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Compass, Award, Building2, User, Calendar, BarChart3, TrendingUp, 
  AlertCircle, CheckCircle, Clock, FileText, UserCheck 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HubHeroBanner from '../../components/hubs/HubHeroBanner';
import KPIStatCard from '../../components/hubs/KPIStatCard';
import HubTabs from '../../components/hubs/HubTabs';
import HubMetricsBar from '../../components/hubs/HubMetricsBar';
import PublishedMSHScoresGrid from '../../components/hubs/PublishedMSHScoresGrid';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

function ISOSHubHRP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const CYCLE_START_DATE = useMemo(() => new Date(2025, 9, 1), []);
  
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [assessmentsNeedingReview, setAssessmentsNeedingReview] = useState([]);
  const [assessmentsCompleted, setAssessmentsCompleted] = useState([]);
  const [mshScores, setMSHScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    cycleNumber: 1,
    cycleType: '1x1',
    currentMonth: 'OCTOBER 2025',
    isgsCompassScore: null,
    isgsCompassCompleted: 0,
    isgsCompassTotal: 24,
    isgsCompassCumulativeAvg: null,
    isgsCompassCumulativeCount: 0,
    isgsCompassTrend: null,
    islScore: null,
    islCompleted: 0,
    islTotal: 5,
    islCumulativeAvg: null,
    islCumulativeCount: 0,
    islTrend: null,
    allPillarsScore: null,
    allPillarsCompleted: 0,
    allPillarsTotal: 19,
    allPillarsCumulativeAvg: null,
    allPillarsCumulativeCount: 0,
    allPillarsTrend: null,
    orgScore: null,
    orgCompleted: 0,
    orgTotal: 24,
    orgCumulativeAvg: null,
    orgCumulativeCount: 0,
    orgTrend: null,
    pendingReviews: 0,
    completedReviews: 0,
    avgReviewTime: null,
    thisMonthReviews: 0,
    completedCount: 0,
    totalCount: 0,
    currentMonthMSH: 0,
    currentMonthMSHExpected: 24,
    cycleMSH: 0,
    cycleMSHExpected: 97
  });

  const calcAvg = useCallback((scores) => {
    if (!scores || scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return (sum / scores.length).toFixed(1);
  }, []);

  const getCycleInfo = useCallback(() => {
    const now = selectedMonth ? new Date(selectedMonth) : new Date();
    const cycleStart = CYCLE_START_DATE;
    const monthsSinceStart = (now.getFullYear() - cycleStart.getFullYear()) * 12 + (now.getMonth() - cycleStart.getMonth());
    const cycleNumber = Math.floor(monthsSinceStart / 3) + 1;
    const cycleStartMonth = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + (cycleNumber - 1) * 3, 1);
    
    const cycleMonths = [];
    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(cycleStartMonth.getFullYear(), cycleStartMonth.getMonth() + i, 1);
      cycleMonths.push({
        month: monthDate.getMonth() + 1,
        year: monthDate.getFullYear(),
        name: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }

    const currentCycleMonth = cycleMonths[cycleMonths.length - 1];
    const is360 = [3, 6, 9, 12].includes(currentCycleMonth.month);

    return {
      cycleNumber,
      cycleType: is360 ? '360' : '1x1',
      currentMonth: currentCycleMonth.name.toUpperCase(),
      cycleMonths
    };
  }, [CYCLE_START_DATE, selectedMonth]);

  useEffect(() => {
    const fetchHubData = async () => {
      try {
        setLoading(true);
        const cycleInfo = getCycleInfo();
        
        console.log('═══════════════════════════════════════════════════');
        console.log('🔴 HRP HUB - DIAGNOSTIC MODE');
        console.log('═══════════════════════════════════════════════════');
        console.log('Cycle Info:', cycleInfo);
        
        const displayMonth = selectedMonth 
          ? new Date(selectedMonth).getMonth() + 1
          : new Date().getMonth() + 1;
        const displayYear = selectedMonth
          ? new Date(selectedMonth).getFullYear()
          : new Date().getFullYear();

        const prevMonthDate = new Date(displayYear, displayMonth - 2, 1);
        const prevMonth = prevMonthDate.getMonth() + 1;
        const prevYear = prevMonthDate.getFullYear();

        // ✅ FIX: Fetch base data first
        const [usersSnapshot, pillarsSnapshot, mshSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'pillars')),
          // ✅ FIXED: Get ALL MSH scores for History (not just current cycle)
          getDocs(collection(db, 'mshs'))
        ]);

        // ✅ FIX: Then fetch assessments separately
        const assessmentSnapshots = await Promise.all(
          cycleInfo.cycleMonths.map(cycleMonthInfo =>
            getDocs(query(
              collection(db, 'assessments'),
              where('cycleMonth', '==', cycleMonthInfo.month),
              where('cycleYear', '==', cycleMonthInfo.year)
            ))
          )
        );

        console.log('📊 Database Snapshots:');
        console.log('  Users:', usersSnapshot.docs.length);
        console.log('  Pillars:', pillarsSnapshot.docs.length);
        console.log('  MSH Scores:', mshSnapshot.docs.length);
        console.log('  Assessment Snapshots:', assessmentSnapshots?.length || 0);

        // Build user map
        const userMap = {};
        const iseUsers = [];
        const islUsers = [];
        const isfUsers = [];
        
        usersSnapshot.docs.forEach(doc => {
          const userData = { id: doc.id, ...doc.data() };
          // ✅ FIX: Dual-key mapping - MSH docs use userId strings like "robert_paddock"
          userMap[doc.id] = userData;  // Firebase UID
          if (userData.userId) {
            userMap[userData.userId] = userData;  // userId string
          }
          
          if (userData.layer === 'ISE') {
            iseUsers.push(userData);
          } else if (userData.layer === 'ISL') {
            islUsers.push(userData);
          } else if (
            userData.layer === 'ISF' || 
            userData.layer === 'ISF Supervisor' ||
            userData.flags?.isSupervisor === true
          ) {
            isfUsers.push(userData);
          }
        });

        const allMSH = mshSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          publishedAt: doc.data().publishedAt?.toDate()
        }));

        console.log('🔍 MSH Snapshot:', {
          totalDocs: mshSnapshot.docs.length,
          allMSHLength: allMSH.length,
          sampleMSH: allMSH[0]
        });

        setMSHScores(allMSH);

        // Build pillars map
        const pillarsMap = {};
        pillarsSnapshot.docs.forEach(doc => {
          const pillarData = doc.data();
          pillarsMap[pillarData.name] = {
            id: doc.id,
            ...pillarData
          };
        });

        // Combine all assessments and enrich with MSH data
        const allAssessments = [];
        assessmentSnapshots.forEach((snapshot, index) => {
          console.log(`  Cycle Month ${index + 1} Assessments:`, snapshot.docs.length);
          snapshot.docs.forEach(doc => {
            const assessmentData = {
              id: doc.id,
              ...doc.data(),
              completedAt: doc.data().completedAt?.toDate(),
              hrpReviewedAt: doc.data().hrpReviewedAt?.toDate()
            };
            assessmentData.subjectData = userMap[assessmentData.subjectId] || null;
            assessmentData.assessorData = userMap[assessmentData.assessorId] || null;
            
            // ✅ Enrich with corresponding MSH data (if published)
            const correspondingMSH = allMSH.find(m => 
              m.subjectId === assessmentData.subjectId &&
              m.assessorId === assessmentData.assessorId &&
              m.cycleMonth === assessmentData.cycleMonth &&
              m.cycleYear === assessmentData.cycleYear
            );
            
            if (correspondingMSH) {
              assessmentData.mshData = correspondingMSH;
              assessmentData.compositeScore = correspondingMSH.compositeScore;
              // If hrpRequested is on MSH, copy it to assessment for easier filtering
              if (correspondingMSH.hrpRequested === true) {
                assessmentData.hrpRequested = true;
              }
              // Copy hrpReviewedAt from MSH if it exists there
              if (correspondingMSH.hrpReviewedAt) {
                assessmentData.hrpReviewedAt = correspondingMSH.hrpReviewedAt;
              }
            }
            
            allAssessments.push(assessmentData);
          });
        });

        console.log('\n🔍 ASSESSMENT ANALYSIS:');
        console.log('Total assessments loaded:', allAssessments.length);
        console.log('Total MSH scores:', allMSH.length);
        
        // Check ALL assessments for hrpRequested flag (CORRECT FIELD NAME)
        const assessmentsWithHRP = allAssessments.filter(a => a.hrpRequested === true);
        console.log('\n🚨 Assessments with hrpRequested=true:', assessmentsWithHRP.length);
        
        if (assessmentsWithHRP.length > 0) {
          console.log('Details of HRP-flagged assessments:');
          assessmentsWithHRP.forEach(a => {
            console.log(`  - ID: ${a.id}`);
            console.log(`    Subject: ${a.subjectData?.displayName || 'Unknown'}`);
            console.log(`    Assessor: ${a.assessorData?.displayName || 'Unknown'}`);
            console.log(`    Completed: ${!!a.completedAt}`);
            console.log(`    Cycle: ${a.cycleMonth}/${a.cycleYear}`);
            console.log(`    Composite: ${a.compositeScore || 'N/A'}`);
            console.log(`    hrpRequested: ${a.hrpRequested}`);
          });
        } else {
          console.log('⚠️  NO ASSESSMENTS HAVE hrpRequested=true');
          console.log('📝 Sample of assessment fields (first assessment):');
          if (allAssessments.length > 0) {
            const sample = allAssessments[0];
            console.log('Available fields:', Object.keys(sample));
            console.log('Sample assessment:', sample);
          }
        }

        // ✅ Filter assessments needing HRP review
        // Show assessments that:
        // 1. Have hrpRequested = true (flagged for HRP review) - CHECK BOTH ASSESSMENT AND MSH
        // 2. ARE completed
        // 3. DO have a published MSH score (HRP reviews published scores)
        // 4. Do NOT have hrpReviewedAt (HRP hasn't reviewed yet)
        
        console.log('\n🔍 CHECKING FOR HRP REQUESTS:');
        console.log('Checking MSH documents for hrpRequested flag...');
        
        // Check MSH documents for hrpRequested flag
        const mshWithHRPRequest = allMSH.filter(m => m.hrpRequested === true);
        console.log(`MSH scores with hrpRequested=true: ${mshWithHRPRequest.length}`);
        
        if (mshWithHRPRequest.length > 0) {
          console.log('MSH scores flagged for HRP review:');
          mshWithHRPRequest.forEach(m => {
            console.log(`  - Subject: ${userMap[m.subjectId]?.displayName || m.subjectId}`);
            console.log(`    Assessor: ${userMap[m.assessorId]?.displayName || m.assessorId}`);
            console.log(`    Cycle: ${m.cycleMonth}/${m.cycleYear}`);
            console.log(`    Composite: ${m.compositeScore}`);
            console.log(`    hrpReviewedAt: ${m.hrpReviewedAt || 'NOT REVIEWED'}`);
          });
        }
        
        const needsReview = allAssessments.filter(a => {
          // Check if assessment itself has hrpRequested flag
          if (a.hrpRequested === true) {
            if (!a.completedAt) return false;
            
            // Check if MSH score exists for this assessment
            const hasPublishedMSH = allMSH.some(m => 
              m.subjectId === a.subjectId &&
              m.assessorId === a.assessorId &&
              m.cycleMonth === a.cycleMonth &&
              m.cycleYear === a.cycleYear
            );
            
            // Must be published AND not yet reviewed by HRP
            return hasPublishedMSH && !a.hrpReviewedAt;
          }
          
          // Also check if the corresponding MSH score has hrpRequested flag
          const correspondingMSH = allMSH.find(m => 
            m.subjectId === a.subjectId &&
            m.assessorId === a.assessorId &&
            m.cycleMonth === a.cycleMonth &&
            m.cycleYear === a.cycleYear
          );
          
          if (correspondingMSH && correspondingMSH.hrpRequested === true) {
            // MSH is flagged for review and not yet reviewed
            return !correspondingMSH.hrpReviewedAt;
          }
          
          return false;
        });

        console.log('\n✅ RESULTS:');
        console.log('Assessments needing HRP review (published but not yet reviewed by HRP):', needsReview.length);
        if (needsReview.length > 0) {
          console.log('Pending HRP reviews:', needsReview.map(a => ({
            id: a.id,
            subject: a.subjectData?.displayName,
            assessor: a.assessorData?.displayName,
            composite: a.compositeScore,
            hrpReviewedAt: a.hrpReviewedAt || 'NOT REVIEWED YET'
          })));
        }

        // ✅ Filter completed reviews
        // Show assessments that:
        // 1. Have hrpRequested = true (flagged for HRP review) - CHECK BOTH ASSESSMENT AND MSH
        // 2. Are completed
        // 3. DO have a published MSH score
        // 4. DO have hrpReviewedAt (HRP has completed review)
        const completedReviews = allAssessments.filter(a => {
          // Check if assessment itself has hrpRequested flag
          if (a.hrpRequested === true) {
            if (!a.completedAt) return false;
            if (!a.hrpReviewedAt) return false;
            
            // Check if MSH score exists for this assessment
            const hasPublishedMSH = allMSH.some(m => 
              m.subjectId === a.subjectId &&
              m.assessorId === a.assessorId &&
              m.cycleMonth === a.cycleMonth &&
              m.cycleYear === a.cycleYear
            );
            
            return hasPublishedMSH;
          }
          
          // Also check if the corresponding MSH score has hrpRequested flag
          const correspondingMSH = allMSH.find(m => 
            m.subjectId === a.subjectId &&
            m.assessorId === a.assessorId &&
            m.cycleMonth === a.cycleMonth &&
            m.cycleYear === a.cycleYear
          );
          
          if (correspondingMSH && correspondingMSH.hrpRequested === true) {
            // MSH is flagged for review and has been reviewed
            return !!correspondingMSH.hrpReviewedAt;
          }
          
          return false;
        });

        console.log('Completed HRP reviews (already reviewed by HRP):', completedReviews.length);
        if (completedReviews.length > 0) {
          console.log('Completed reviews:', completedReviews.map(a => ({
            id: a.id,
            subject: a.subjectData?.displayName,
            hrpReviewedAt: a.hrpReviewedAt
          })));
        }
        console.log('═══════════════════════════════════════════════════\n');

        setAssessmentsNeedingReview(needsReview);
        setAssessmentsCompleted(completedReviews);

        // Calculate review metrics
        const completedThisMonth = completedReviews.filter(a => 
          a.hrpReviewedAt && 
          a.hrpReviewedAt.getMonth() === (displayMonth - 1) &&
          a.hrpReviewedAt.getFullYear() === displayYear
        );

        const reviewTimes = completedReviews
          .filter(a => a.completedAt && a.hrpReviewedAt)
          .map(a => (a.hrpReviewedAt - a.completedAt) / (1000 * 60 * 60 * 24));
        
        const avgReviewTime = reviewTimes.length > 0
          ? Math.round(reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length)
          : null;

        // Cumulative MSH
        const cumulativeMSH = allMSH.filter(m => 
          (m.cycleYear < displayYear) || 
          (m.cycleYear === displayYear && m.cycleMonth <= displayMonth)
        );

        const islLayerMSH = allMSH.filter(m => 
          islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
          iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
        );

        const cumulativeISLLayer = cumulativeMSH.filter(m => 
          islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
          iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
        );

        const cumulativeAllISF = cumulativeMSH.filter(m => isfUsers.some(u => u.userId === m.subjectId));

        const currentMonthMSH = allMSH.filter(m => 
          m.cycleMonth === displayMonth && m.cycleYear === displayYear
        );
        
        const currentMonthISLLayer = currentMonthMSH.filter(m => 
          islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
          iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
        );
        
        const currentMonthAllISF = currentMonthMSH.filter(m => 
          isfUsers.some(u => u.userId === m.subjectId)
        );

        const prevMonthMSH = allMSH.filter(m => 
          m.cycleMonth === prevMonth && m.cycleYear === prevYear
        );
        
        const prevMonthISLLayer = prevMonthMSH.filter(m => 
          islUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId) || 
          iseUsers.some(u => u.userId === m.subjectId || u.uid === m.subjectId)
        );
        
        const prevMonthAllISF = prevMonthMSH.filter(m => 
          isfUsers.some(u => u.userId === m.subjectId)
        );

        const uniqueISLLayerCompleted = new Set(currentMonthISLLayer.map(m => m.subjectId)).size;
        const uniqueAllISFCompleted = new Set(currentMonthAllISF.map(m => m.subjectId)).size;

        const islScore = calcAvg(currentMonthISLLayer.map(m => m.compositeScore));
        const allPillarsScore = calcAvg(currentMonthAllISF.map(m => m.compositeScore));

        const prevIslScore = calcAvg(prevMonthISLLayer.map(m => m.compositeScore));
        const prevAllPillarsScore = calcAvg(prevMonthAllISF.map(m => m.compositeScore));

        const islTrend = (islScore && prevIslScore)
          ? parseFloat((parseFloat(islScore) - parseFloat(prevIslScore)).toFixed(1))
          : "---";
        
        const allPillarsTrend = (allPillarsScore && prevAllPillarsScore)
          ? parseFloat((parseFloat(allPillarsScore) - parseFloat(prevAllPillarsScore)).toFixed(1))
          : "---";

        let isgsCompassScore = null;
        let prevIsgsCompassScore = null;
        let isgsCompassTrend = "---";
        
        if (islScore !== null && allPillarsScore !== null) {
          isgsCompassScore = ((parseFloat(islScore) * 0.6) + (parseFloat(allPillarsScore) * 0.4)).toFixed(1);
        }
        
        if (prevIslScore !== null && prevAllPillarsScore !== null) {
          prevIsgsCompassScore = ((parseFloat(prevIslScore) * 0.6) + (parseFloat(prevAllPillarsScore) * 0.4)).toFixed(1);
        }
        
        if (isgsCompassScore && prevIsgsCompassScore) {
          isgsCompassTrend = parseFloat((parseFloat(isgsCompassScore) - parseFloat(prevIsgsCompassScore)).toFixed(1));
        }
        
        const isgsCompassCompleted = currentMonthISLLayer.length + currentMonthAllISF.length;
        const isgsCompassTotal = cycleInfo.cycleType === '360' ? 49 : 24;
        const isgsCompassCumulativeScores = [...cumulativeISLLayer, ...cumulativeAllISF].map(m => m.compositeScore);

        const currentMonthMSHPublished = currentMonthMSH.length;
        const currentMonthMSHExpected = cycleInfo.cycleType === '360' ? 49 : 24;
        const orgCompletionPercent = currentMonthMSHExpected > 0 
          ? Math.round((currentMonthMSHPublished / currentMonthMSHExpected) * 100)
          : 0;

        const prevMonthMSHPublished = prevMonthMSH.length;
        const prevMonthMSHExpected = [3, 6, 9, 12].includes(prevMonth) ? 49 : 24;
        const prevOrgCompletionPercent = prevMonthMSHExpected > 0 
          ? Math.round((prevMonthMSHPublished / prevMonthMSHExpected) * 100)
          : 0;

        const orgTrend = orgCompletionPercent - prevOrgCompletionPercent;

        const orgCumulativeAvg = cumulativeMSH.length > 0 
          ? Math.round((cumulativeMSH.length / usersSnapshot.docs.length) * 100)
          : 0;

        const is360Cycle = cycleInfo.cycleType === '360';
        const islTotal = is360Cycle ? 5 * 6 : 5 * 2;
        const allPillarsTotal = is360Cycle ? 19 * 6 : 19 * 2;
        const orgTotal = is360Cycle ? 24 * 6 : 24 * 2;
        const cycleMSHExpected = orgTotal;
        const cycleMSH = allMSH.filter(m => {
          return cycleInfo.cycleMonths.some(cm => 
            m.cycleMonth === cm.month && m.cycleYear === cm.year
          );
        }).length;

        setMetrics({
          cycleNumber: cycleInfo.cycleNumber,
          cycleType: cycleInfo.cycleType,
          currentMonth: cycleInfo.currentMonth,
          isgsCompassScore,
          isgsCompassCompleted,
          isgsCompassTotal,
          isgsCompassCumulativeAvg: calcAvg(isgsCompassCumulativeScores),
          isgsCompassCumulativeCount: cumulativeISLLayer.length + cumulativeAllISF.length,
          isgsCompassTrend,
          islScore,
          islCompleted: currentMonthISLLayer.length,
          islTotal,
          islCumulativeAvg: calcAvg(cumulativeISLLayer.map(m => m.compositeScore)),
          islCumulativeCount: cumulativeISLLayer.length,
          islTrend,
          allPillarsScore,
          allPillarsCompleted: currentMonthAllISF.length,
          allPillarsTotal,
          allPillarsCumulativeAvg: calcAvg(cumulativeAllISF.map(m => m.compositeScore)),
          allPillarsCumulativeCount: cumulativeAllISF.length,
          allPillarsTrend,
          orgScore: orgCompletionPercent,
          orgCompleted: currentMonthMSHPublished,
          orgTotal: currentMonthMSHExpected,
          orgCumulativeAvg,
          orgCumulativeCount: cumulativeMSH.length,
          orgTrend,
          pendingReviews: needsReview.length,
          completedReviews: completedReviews.length,
          avgReviewTime,
          thisMonthReviews: completedThisMonth.length,
          completedCount: allAssessments.filter(a => a.status === 'completed' || a.status === 'calibrated' || a.status === 'published').length,
          totalCount: cycleInfo.cycleMonths.reduce((total, m) => {
            const is360 = [3, 6, 9, 12].includes(m.month);
            return total + (is360 ? 93 : 24);
          }, 0),
          currentMonthMSH: currentMonthMSHPublished,
          currentMonthMSHExpected,
          cycleMSH,
          cycleMSHExpected
        });
      } catch (error) {
        console.error('❌ Error fetching HRP hub data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHubData();
  }, [getCycleInfo, selectedMonth, calcAvg]);

  const handleReviewClick = useCallback((assessmentId) => {
    navigate(`/is-os/assessment/${assessmentId}`, {
      state: { from: location.pathname }
    });
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-red-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading HRP Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        /* HRP Hub RED Theme Override */
        .hrp-red-theme [class*="bg-gradient"],
        .hrp-red-theme [class*="from-blue"],
        .hrp-red-theme [class*="from-purple"],
        .hrp-red-theme [class*="from-indigo"] {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
        }
        .hrp-red-theme [class*="bg-blue"],
        .hrp-red-theme [class*="bg-purple"],
        .hrp-red-theme [class*="bg-indigo"] {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
        }
      `}</style>
      
      {/* Hero Banner - RED THEME */}
      <div className="hrp-red-theme">
        <HubHeroBanner
          title="HRP Hub"
          subtitle="Human Resources Partner Review Queue"
          description="Review and approve assessments flagged for HRP oversight"
          icon={UserCheck}
          gradientColor="red"
        cycleNumber={metrics.cycleNumber}
        cycleType={metrics.cycleType}
        currentMonth={metrics.currentMonth}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Bar - RED THEME */}
        <div className="hrp-red-theme">
          <HubMetricsBar
            cycleType={metrics.cycleType}
            currentMonthMSH={metrics.currentMonthMSH}
            currentMonthMSHExpected={metrics.currentMonthMSHExpected}
            cycleMSH={metrics.cycleMSH}
            cycleMSHExpected={metrics.cycleMSHExpected}
            gradientColor="red"
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPIStatCard
            title="ISGS Compass"
            value={metrics.isgsCompassScore || 0}
            unit="%"
            subtitle={`${metrics.isgsCompassCompleted}/${metrics.isgsCompassTotal} MSH³`}
            icon={Compass}
            trend={metrics.isgsCompassTrend}
            trendLabel={`Cumulative Avg: ${metrics.isgsCompassCumulativeAvg || 0}% | Total MSH: ${metrics.isgsCompassCumulativeCount || 0}`}
            gradientColor="red"
          />
          
          <KPIStatCard
            title="ISL Leadership"
            value={metrics.islScore || 0}
            unit="%"
            subtitle={`${metrics.islCompleted}/${metrics.islTotal} MSH³`}
            icon={Award}
            trend={metrics.islTrend}
            trendLabel={`Cumulative Avg: ${metrics.islCumulativeAvg || 0}% | Total MSH: ${metrics.islCumulativeCount || 0}`}
            gradientColor="purple"
          />
          
          <KPIStatCard
            title="All Pillars"
            value={metrics.allPillarsScore || 0}
            unit="%"
            subtitle={`${metrics.allPillarsCompleted}/${metrics.allPillarsTotal} MSH³`}
            icon={Building2}
            trend={metrics.allPillarsTrend}
            trendLabel={`Cumulative Avg: ${metrics.allPillarsCumulativeAvg || 0}% | Total MSH: ${metrics.allPillarsCumulativeCount || 0}`}
            gradientColor="blue"
          />
          
          <KPIStatCard
            title="Org-Wide Completion"
            value={metrics.orgScore || 0}
            unit="%"
            subtitle={`${metrics.orgCompleted}/${metrics.orgTotal} MSH³`}
            icon={BarChart3}
            trend={metrics.orgTrend}
            trendLabel={`Cumulative Avg: ${metrics.orgCumulativeAvg || 0}% | Total MSH: ${metrics.orgCumulativeCount || 0}`}
            gradientColor="green"
          />
        </div>

        {/* Review Queue Tabs */}
        <HubTabs
          tabs={[
            { id: 'pending', label: 'Pending Reviews', count: metrics.pendingReviews },
            { id: 'completed', label: 'Completed Reviews', count: metrics.completedReviews },
            { id: 'all-msh', label: 'All MSH³ Scores', count: mshScores.length }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'pending' && (
            <div>
              {assessmentsNeedingReview.length === 0 ? (
                <Card className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Pending Reviews
                  </h3>
                  <p className="text-gray-600 text-sm">
                    All assessments flagged for HRP review have been completed.
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Check browser console (F12) for diagnostic info
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {assessmentsNeedingReview.map((assessment) => (
                    <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {assessment.subjectData?.displayName || 'Unknown Employee'}
                            </h3>
                            <Badge variant="warning">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Needs Review
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-gray-600">Composite Score:</span>
                              <span className="ml-2 font-semibold text-gray-900">
                                {assessment.compositeScore || '---'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Pillar:</span>
                              <span className="ml-2 text-gray-900">
                                {assessment.subjectData?.pillar || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Layer:</span>
                              <span className="ml-2 text-gray-900">
                                {assessment.subjectData?.layer || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Completed:</span>
                              <span className="ml-2 text-gray-900">
                                {assessment.completedAt?.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Assessor:</span> {assessment.assessorData?.displayName || 'Unknown'}
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button
                            variant="primary"
                            onClick={() => handleReviewClick(assessment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div>
              {assessmentsCompleted.length === 0 ? (
                <Card className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Completed Reviews
                  </h3>
                  <p className="text-gray-600 text-sm">
                    No HRP reviews have been completed yet this cycle.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {assessmentsCompleted.map((assessment) => (
                    <Card key={assessment.id} className="bg-green-50 border-green-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {assessment.subjectData?.displayName || 'Unknown Employee'}
                            </h3>
                            <Badge variant="success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Review Complete
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-gray-600">Composite Score:</span>
                              <span className="ml-2 font-semibold text-gray-900">
                                {assessment.compositeScore || '---'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Reviewed By:</span>
                              <span className="ml-2 text-gray-900">
                                {assessment.hrpReviewerName || 'HRP'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Reviewed:</span>
                              <span className="ml-2 text-gray-900">
                                {assessment.hrpReviewedAt?.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Review Time:</span>
                              <span className="ml-2 text-gray-900">
                                {assessment.completedAt && assessment.hrpReviewedAt
                                  ? `${Math.round((assessment.hrpReviewedAt - assessment.completedAt) / (1000 * 60 * 60 * 24))} days`
                                  : 'N/A'
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button
                            variant="secondary"
                            onClick={() => handleReviewClick(assessment.id)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'all-msh' && (
            <PublishedMSHScoresGrid mshScores={mshScores} />
          )}
        </div>
      </div>
    </div>
  );
}

export default ISOSHubHRP;