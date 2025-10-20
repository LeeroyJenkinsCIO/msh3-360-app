// 📁 SAVE TO: src/pages/is-os/ISOSHubHRP.jsx
// HRP Hub - Human Resources Partner View
// ✅ OPTIMIZED: Parallel queries, memoized calculations, reduced re-renders
// ✅ Interactive month selector for dynamic stats filtering
// ✅ Shows flagged assessments requiring HRP intervention
// ✅ Uses AssessmentOrchestrator for consistency

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { AlertTriangle, CheckCircle, Clock, Calendar, Users, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HubHeroBanner from '../../components/hubs/HubHeroBanner';
import KPIStatCard from '../../components/hubs/KPIStatCard';
import HubTabs from '../../components/hubs/HubTabs';
import HubMetricsBar from '../../components/hubs/HubMetricsBar';
import AssessmentOrchestrator from '../../components/hubs/AssessmentOrchestrator';

function ISOSHubHRP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const CYCLE_START_DATE = useMemo(() => new Date(2025, 9, 1), []);
  
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [completedReviews, setCompletedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    cycleNumber: 1,
    cycleType: '1x1',
    currentMonth: 'OCTOBER 2025',
    totalFlagged: 0,
    pendingCount: 0,
    completedCount: 0,
    completedCount: 0,
    totalCount: 0
  });

  const getCycleInfo = useCallback((date = new Date()) => {
    const monthsSinceStart = (date.getFullYear() - CYCLE_START_DATE.getFullYear()) * 12 + 
                             (date.getMonth() - CYCLE_START_DATE.getMonth());
    
    const cycleNumber = Math.floor(monthsSinceStart / 3) + 1;
    const cycleMonth = (monthsSinceStart % 3) + 1;
    const cycleType = cycleMonth === 3 ? '360' : '1x1';
    
    const currentMonth = date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    }).toUpperCase();
    
    const cycleStartMonthOffset = Math.floor(monthsSinceStart / 3) * 3;
    const cycleStartDate = new Date(CYCLE_START_DATE);
    cycleStartDate.setMonth(CYCLE_START_DATE.getMonth() + cycleStartMonthOffset);
    
    const cycleMonths = [];
    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(cycleStartDate);
      monthDate.setMonth(cycleStartDate.getMonth() + i);
      cycleMonths.push({
        month: monthDate.getMonth() + 1,
        year: monthDate.getFullYear()
      });
    }
    
    return { 
      cycleNumber, 
      cycleMonth, 
      cycleType, 
      currentMonth,
      cycleMonths,
      cycleStartDate
    };
  }, [CYCLE_START_DATE]);

  useEffect(() => {
    if (user?.uid) {
      fetchData();
    }
  }, [user, location.key, selectedMonth]);

  const fetchData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      const now = new Date();
      const displayMonth = selectedMonth ? selectedMonth.month : now.getMonth() + 1;
      const displayYear = selectedMonth ? selectedMonth.year : now.getFullYear();
      
      const displayDate = new Date(displayYear, displayMonth - 1, 1);
      const cycleInfo = getCycleInfo(displayDate);
      
      // ✅ OPTIMIZATION: Parallel queries
      const [usersSnapshot, ...assessmentSnapshots] = await Promise.all([
        getDocs(collection(db, 'users')),
        ...cycleInfo.cycleMonths.map(cycleMonthInfo =>
          getDocs(query(
            collection(db, 'assessments'),
            where('cycleMonth', '==', cycleMonthInfo.month),
            where('cycleYear', '==', cycleMonthInfo.year)
          ))
        )
      ]);

      // Build user map
      const userMap = {};
      usersSnapshot.docs.forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        userMap[userData.userId] = userData;
      });

      // Collect all assessments
      const allCycleAssessments = assessmentSnapshots.flatMap(snapshot =>
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          completedAt: doc.data().completedAt?.toDate(),
          hrpReviewedAt: doc.data().hrpReviewedAt?.toDate()
        }))
      );

      // Filter for flagged assessments (not-aligned status OR alignmentStatus)
      const flaggedAssessments = allCycleAssessments.filter(a => 
        a.status === 'not-aligned' || a.alignmentStatus === 'not-aligned'
      );

      console.log('🚨 HRP Hub - Flagged assessments:', flaggedAssessments.length);

      // Enrich assessments with user data
      const enrichedAssessments = flaggedAssessments.map(a => {
        const giverUid = a.giver?.uid || a.assessorId;
        const receiverUid = a.receiver?.uid || a.subjectId;
        const giverData = userMap[a.giver?.userId || a.assessorId] || Object.values(userMap).find(u => u.uid === giverUid);
        const receiverData = userMap[a.receiver?.userId || a.subjectId] || Object.values(userMap).find(u => u.uid === receiverUid);
        
        return {
          ...a,
          assessorUid: giverUid,
          assessorId: giverUid,
          assessorName: a.giver?.displayName || a.assessorName || giverData?.displayName || 'Unknown',
          assessorLayer: a.giver?.layer || giverData?.layer || 'Unknown',
          assessorPillar: giverData?.pillar,
          assessorSubPillar: giverData?.subPillar,
          subjectUid: receiverUid,
          subjectId: receiverUid,
          subjectName: a.receiver?.displayName || a.subjectName || receiverData?.displayName || 'Unknown',
          subjectEmail: receiverData?.email || '',
          subjectLayer: a.receiver?.layer || receiverData?.layer || 'Unknown',
          subjectPillar: receiverData?.pillar,
          subjectSubPillar: receiverData?.subPillar,
          myRole: 'hrp',
          viewAccess: 'hrp-review'
        };
      });

      // Split into pending and completed
      const pending = enrichedAssessments.filter(a => 
        !a.hrpReviewedAt && (!a.hrpReviewStatus || a.hrpReviewStatus === 'pending')
      );

      const completed = enrichedAssessments.filter(a => 
        a.hrpReviewedAt || a.hrpReviewStatus === 'complete'
      );

      setPendingReviews(pending);
      setCompletedReviews(completed);

      const cycleExpectedTotal = cycleInfo.cycleMonths.reduce((total, m) => {
        const is360 = [3, 6, 9, 12].includes(m.month);
        return total + (is360 ? 93 : 24);
      }, 0);

      setMetrics({
        cycleNumber: cycleInfo.cycleNumber,
        cycleType: cycleInfo.cycleType,
        currentMonth: cycleInfo.currentMonth,
        cycleMonths: cycleInfo.cycleMonths,
        displayMonth,
        displayYear,
        totalFlagged: flaggedAssessments.length,
        pendingCount: pending.length,
        completedCount: completed.length,
        completedCount: allCycleAssessments.filter(a => a.status === 'completed' || a.status === 'calibrated').length,
        totalCount: cycleExpectedTotal
      });

    } catch (error) {
      console.error('❌ Error fetching HRP hub data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAssessment = useCallback((assessment) => {
    // Navigate to HRP Assessment Review page
    navigate(`/is-os/hrp-assessment-review/${assessment.id}`);
  }, [navigate]);

  const handleViewAssessment = useCallback((assessmentId) => {
    // For completed reviews, also navigate to review page (read-only view)
    navigate(`/is-os/hrp-assessment-review/${assessmentId}`);
  }, [navigate]);

  const handleMonthSelect = useCallback((month, year) => {
    setSelectedMonth({ month, year });
  }, []);

  const tabs = useMemo(() => {
    return [
      { id: 'pending', label: 'Pending Review', count: pendingReviews.length, subtitle: 'Assessments requiring HRP intervention' },
      { id: 'completed', label: 'Completed Reviews', count: completedReviews.length, subtitle: 'Documented HRP interventions' }
    ];
  }, [pendingReviews.length, completedReviews.length]);

  const selectedMonthName = useMemo(() => {
    return selectedMonth 
      ? new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Current';
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading HRP dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HubHeroBanner gradient="red" title="ISOS Hub" subtitle="HRP View - Assessment Intervention & Support" icon={Shield} />
      <HubMetricsBar gradient="red" cycleNumber={metrics.cycleNumber} cycleType={metrics.cycleType} currentMonth={metrics.currentMonth} completedCount={metrics.completedCount} totalCount={metrics.totalCount} />
      
      {metrics.cycleMonths && (
        <div className="max-w-7xl mx-auto px-6 -mt-4 mb-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-900">
                  Viewing: {selectedMonthName}
                </span>
                <div className="h-4 w-px bg-red-300"></div>
                <div className="flex gap-2">
                  {metrics.cycleMonths.map((m, i) => {
                    const monthName = new Date(m.year, m.month - 1).toLocaleDateString('en-US', { month: 'short' });
                    const isSelected = selectedMonth ? (selectedMonth.month === m.month && selectedMonth.year === m.year) : (m.month === new Date().getMonth() + 1 && m.year === new Date().getFullYear());
                    
                    return (
                      <button
                        key={i}
                        onClick={() => handleMonthSelect(m.month, m.year)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md'
                            : 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 hover:border-red-400'
                        }`}
                      >
                        {monthName} {m.year}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPIStatCard 
            title="Total Flagged" 
            value={metrics.totalFlagged} 
            secondaryValue="Not Aligned Assessments" 
            maxValue={null}
            icon={AlertTriangle} 
            gradient="red" 
            metadata={[
              { label: "Pending Review", value: metrics.pendingCount },
              { label: "Completed Review", value: metrics.completedCount }
            ]} 
          />
          <KPIStatCard 
            title="Pending Review" 
            value={metrics.pendingCount} 
            secondaryValue="Require HRP Attention" 
            maxValue={null}
            icon={Clock} 
            gradient="orange" 
            metadata={[
              { label: "% of Flagged", value: metrics.totalFlagged > 0 ? `${((metrics.pendingCount / metrics.totalFlagged) * 100).toFixed(0)}%` : "—" }
            ]} 
          />
          <KPIStatCard 
            title="Completed Reviews" 
            value={metrics.completedCount} 
            secondaryValue="Documented Interventions" 
            maxValue={null}
            icon={CheckCircle} 
            gradient="green" 
            metadata={[
              { label: "% of Flagged", value: metrics.totalFlagged > 0 ? `${((metrics.completedCount / metrics.totalFlagged) * 100).toFixed(0)}%` : "—" }
            ]} 
          />
        </div>

        {/* Info Banner */}
        {metrics.pendingCount > 0 && (
          <div className="mb-8 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {metrics.pendingCount} {metrics.pendingCount === 1 ? 'Assessment' : 'Assessments'} Awaiting HRP Review
                </h3>
                <p className="text-xs text-gray-700">
                  These assessments were flagged as "Not Aligned" during the assessment process and require Human Resources Partner intervention to facilitate resolution.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <HubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          {activeTab === 'pending' && (
            <AssessmentOrchestrator 
              assessments={pendingReviews} 
              onStartAssessment={handleReviewAssessment}
              onViewAssessment={handleReviewAssessment}
              viewMode="hrp-pending" 
              currentUserId={user.uid} 
              userRole="HRP"
              emptyStateMessage="No pending HRP reviews - all flagged assessments have been addressed" 
            />
          )}
          
          {activeTab === 'completed' && (
            <AssessmentOrchestrator 
              assessments={completedReviews} 
              onStartAssessment={handleViewAssessment}
              onViewAssessment={handleViewAssessment}
              viewMode="hrp-completed" 
              currentUserId={user.uid} 
              userRole="HRP"
              emptyStateMessage="No completed HRP reviews yet" 
            />
          )}
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">HRP Review Process</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  <strong>What triggers an HRP review?</strong> When an assessment is completed but the assessor and subject cannot reach alignment on the scores, the assessment is flagged as "Not Aligned" and routed to HRP.
                </p>
                <p>
                  <strong>Your role:</strong> Facilitate a discussion between the assessor and subject to understand concerns, clarify expectations, and help reach resolution. Document the meeting outcome in the HRP notes.
                </p>
                <p>
                  <strong>Process:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Review the original assessment details (scores, notes, alignment status)</li>
                  <li>Schedule and conduct a meeting with both parties</li>
                  <li>Document the discussion, agreements, and action items in the HRP Meeting Notes</li>
                  <li>Mark the review as complete</li>
                  <li>The HRP notes will appear at the bottom of the published MSH score</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ISOSHubHRP;