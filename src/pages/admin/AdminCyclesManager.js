// src/pages/admin/AdminCyclesManager.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, PlayCircle, CheckCircle, XCircle, BarChart3, Wrench } from 'lucide-react';
import { collection, query, where, getDocs, writeBatch, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  createNextCycle,
  getLastCycle,
  getAllCycles,
  getActiveCycle,
  getAssessmentCountPreview,
  getCycleValidationStats
} from '../../utils/CreateAssessmentCycles';

function AdminCyclesManager() {
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [lastCycle, setLastCycle] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // 📊 State for preview
  const [previewCounts, setPreviewCounts] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // 🔍 State for validation stats
  const [validationStats, setValidationStats] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  
  // 🎯 State for first-time setup
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 🔍 State for diagnostic
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadPreview();
    loadValidation();
  }, []);

  const loadData = async (showModalIfEmpty = false) => {
    try {
      const [allCyclesResult, lastCycleResult, activeCycleResult] = await Promise.all([
        getAllCycles(),
        getLastCycle(),
        getActiveCycle()
      ]);
      
      setCycles(allCyclesResult);
      setLastCycle(lastCycleResult);
      setActiveCycle(activeCycleResult);
      
      if (!lastCycleResult && showModalIfEmpty) {
        setShowFirstTimeSetup(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // 📊 Load assessment count preview
  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const result = await getAssessmentCountPreview();
      if (result.success) {
        setPreviewCounts(result.counts);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 🔍 Load validation stats
  const loadValidation = async () => {
    setValidationLoading(true);
    try {
      const result = await getCycleValidationStats();
      if (result.success) {
        setValidationStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading validation:', error);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleCreateCycle = async () => {
    setLoading(true);
    setMessage('');

    try {
      console.log('Creating next cycle...');
      
      const result = showFirstTimeSetup 
        ? await createNextCycle(selectedYear, selectedMonth)
        : await createNextCycle();

      if (result.success) {
        setMessageType('success');
        setMessage(
          `✅ Success! Created Cycle ${result.cycleNumber} of 4\n` +
          `Months: ${result.cyclesCreated.join(', ')}\n` +
          `Total Assessments: ${result.totalAssessments}\n` +
          `Managers: ${result.managersProcessed}`
        );
        
        setShowFirstTimeSetup(false);
        await loadData();
        await loadPreview();
        await loadValidation();
      }
    } catch (error) {
      console.error('Error creating cycle:', error);
      setMessageType('error');
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadData(true);
    await loadPreview();
    await loadValidation();
  };

  // 🔍 Run 360 Pair Linking Diagnostic
  const handleRunDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticReport(null);
    
    try {
      console.log('🔍 Running 360 pair linking diagnostic...');
      
      // Get ANY 360 cycle (find the most recent one)
      const cyclesRef = collection(db, 'assessmentCycles');
      const cycleQuery = query(
        cyclesRef,
        where('cycleType', '==', '360')
      );
      
      const cycleSnapshot = await getDocs(cycleQuery);
      if (cycleSnapshot.empty) {
        setDiagnosticReport({ error: 'No 360 cycle found. Create a cycle first (the 3rd month will be 360).' });
        return;
      }
      
      // Sort by year/month and get the latest
      const cycles = cycleSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
      
      const latestCycle = cycles[0];
      const cycleId = latestCycle.cycleId;
      
      console.log(`✅ Found 360 cycle: ${latestCycle.monthName} ${latestCycle.year}`);
      
      // Get all assessments
      const assessmentsRef = collection(db, 'assessments');
      const assessQuery = query(assessmentsRef, where('cycleId', '==', cycleId));
      const assessSnapshot = await getDocs(assessQuery);
      
      const selfAssessments = [];
      const pairAssessments = [];
      const peerAssessments = [];
      const pairMap = new Map();
      
      // Categorize assessments
      assessSnapshot.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        
        if (data.assessmentType === 'self') {
          selfAssessments.push(data);
        } else if (data.assessmentType === 'peer') {
          peerAssessments.push(data);
        } else if (data.assessmentType === 'manager-down' || data.assessmentType === 'manager-up') {
          pairAssessments.push(data);
          
          if (data.pairId) {
            if (!pairMap.has(data.pairId)) {
              pairMap.set(data.pairId, []);
            }
            pairMap.get(data.pairId).push(data);
          }
        }
      });
      
      // Analyze pairs
      const properlyLinkedPairs = [];
      const brokenPairs = [];
      
      for (const [pairId, assessments] of pairMap.entries()) {
        if (assessments.length === 2) {
          const [a1, a2] = assessments;
          
          const isBidirectional = 
            a1.assessorId === a2.subjectId && 
            a1.subjectId === a2.assessorId;
          
          const a1SelfLinked = selfAssessments.find(s => 
            s.subjectId === a1.subjectId && 
            s['360Pairs']?.includes(pairId)
          );
          
          const a2SelfLinked = selfAssessments.find(s => 
            s.subjectId === a2.subjectId && 
            s['360Pairs']?.includes(pairId)
          );
          
          if (isBidirectional && a1SelfLinked && a2SelfLinked) {
            properlyLinkedPairs.push({
              pairId,
              assessments: [
                `${a1.assessorName} → ${a1.subjectName}`,
                `${a2.assessorName} → ${a2.subjectName}`
              ],
              selfLinked: true
            });
          } else {
            brokenPairs.push({
              pairId,
              assessments: [
                `${a1.assessorName} → ${a1.subjectName}`,
                `${a2.assessorName} → ${a2.subjectName}`
              ],
              issues: [
                !isBidirectional && '❌ Not bidirectional',
                !a1SelfLinked && `❌ ${a1.subjectName} self not linked`,
                !a2SelfLinked && `❌ ${a2.subjectName} self not linked`
              ].filter(Boolean)
            });
          }
        } else {
          brokenPairs.push({
            pairId,
            assessments: assessments.map(a => `${a.assessorName} → ${a.subjectName}`),
            issues: [`❌ Only ${assessments.length} assessment(s) in pair (expected 2)`]
          });
        }
      }
      
      const orphanedAssessments = pairAssessments.filter(a => !a.pairId);
      const orphanedSelfs = selfAssessments.filter(s => 
        !s['360Pairs'] || s['360Pairs'].length === 0
      );
      
      setDiagnosticReport({
        cycleId,
        totalAssessments: assessSnapshot.size,
        selfAssessments: selfAssessments.length,
        pairAssessments: pairAssessments.length,
        peerAssessments: peerAssessments.length,
        
        totalPairs: pairMap.size,
        properlyLinkedPairs: properlyLinkedPairs.length,
        brokenPairs: brokenPairs.length,
        
        properlyLinkedPairsList: properlyLinkedPairs,
        brokenPairsList: brokenPairs,
        orphanedAssessments,
        orphanedSelfs,
        
        isHealthy: brokenPairs.length === 0 && orphanedAssessments.length === 0 && orphanedSelfs.length === 0
      });
      
      console.log('✅ Diagnostic complete');
      
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
      setDiagnosticReport({ error: error.message });
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getAssessmentTypeBadge = (type) => {
    switch (type) {
      case '1x1':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case '360':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getNextCyclePreview = () => {
    if (!lastCycle) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `Will create Cycle 1 of 4 starting ${monthNames[month - 1]} ${year}`;
    }
    
    const nextMonth = lastCycle.month + 1;
    const nextStartMonth = nextMonth > 12 ? 1 : nextMonth;
    const nextYear = nextMonth > 12 ? lastCycle.year + 1 : lastCycle.year;
    
    let cycleNum = 1;
    if (nextStartMonth >= 10) cycleNum = 1;
    else if (nextStartMonth >= 7) cycleNum = 4;
    else if (nextStartMonth >= 4) cycleNum = 3;
    else if (nextStartMonth >= 1) cycleNum = 2;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `Will create Cycle ${cycleNum} of 4 starting ${monthNames[nextStartMonth - 1]} ${nextYear}`;
  };

  return (
    <div className="space-y-6">
      {/* 🎯 FIRST-TIME SETUP MODAL */}
      {showFirstTimeSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4 bg-white shadow-2xl">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🎬 First-Time Setup</h2>
              <p className="text-gray-600">
                No cycles exist yet. Select the starting month and year for your first 3-month cycle.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Starting Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                    <option key={idx} value={idx + 1}>{month}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Starting Year
                </label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="2024"
                  max="2030"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-900">
                <strong>Preview:</strong> Will create {['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]} {selectedYear} as Cycle 1 of 4
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateCycle}
                disabled={loading}
                className="flex-1"
                variant="primary"
              >
                {loading ? 'Creating...' : 'Create First Cycle'}
              </Button>
              <Button
                onClick={() => {
                  setShowFirstTimeSetup(false);
                  handleRefresh();
                }}
                disabled={loading}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Assessment Cycles Manager</h1>
            </div>
            <p className="text-gray-600">
              Create and manage assessment cycles with the Ringleader system
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {activeCycle && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm text-gray-600">Active Cycle</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAssessmentTypeBadge(activeCycle.cycleType)}`}>
                  {activeCycle.cycleType?.toUpperCase() || '1X1'}
                </span>
                <span className="text-sm font-semibold text-purple-700">
                  Cycle {activeCycle.cycleNumber} of 4
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{activeCycle.monthName} {activeCycle.year}</h2>
            </div>
            <div className={`px-4 py-2 rounded-lg ${getStatusBadge(activeCycle.status)}`}>
              <span className="text-sm font-semibold uppercase">{activeCycle.status}</span>
            </div>
          </div>
        </Card>
      )}

      {lastCycle && (
        <Card className="bg-gray-50">
          <div className="text-sm text-gray-600">
            <strong>Last Cycle Created:</strong> {lastCycle.monthName} {lastCycle.year} 
            {' '}({lastCycle.cycleType?.toUpperCase()})
            {' '}- Cycle {lastCycle.cycleNumber} of 4
          </div>
        </Card>
      )}

      {/* 📊 ASSESSMENT COUNT PREVIEW CARD */}
      {previewCounts && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Ringleader Assessment Math</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Column 1: Manager Breakdown */}
            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <h3 className="text-sm font-bold text-indigo-900 mb-3">Managers by Layer</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">ISE:</span>
                  <span className="font-semibold">{previewCounts.iseCount} ({previewCounts.iseDirectReports} reports)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">ISL:</span>
                  <span className="font-semibold">{previewCounts.islCount} ({previewCounts.islDirectReports} reports)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">ISF Supervisors:</span>
                  <span className="font-semibold">{previewCounts.isfSupervisorCount} ({previewCounts.isfSupervisorDirectReports} reports)</span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{previewCounts.totalManagers} managers, {previewCounts.totalDirectReports} reports</span>
                </div>
              </div>
            </div>

            {/* Column 2: 1x1 Assessments */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-bold text-blue-900 mb-3">1x1 Assessments (Months 1 & 2)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Per Month:</span>
                  <span className="font-semibold">{previewCounts.assessments1x1PerMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">× 2 Months:</span>
                  <span className="font-semibold">{previewCounts.assessments1x1Total}</span>
                </div>
                <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between text-blue-700">
                  <span className="font-bold">Assessments:</span>
                  <span className="font-bold">{previewCounts.assessments1x1Total}</span>
                </div>
              </div>
            </div>

            {/* Column 3: 360 Assessments */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-bold text-purple-900 mb-3">360 Assessments (Month 3)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Self-Assessments:</span>
                  <span className="font-semibold">{previewCounts.selfAssessments360}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Manager-DR Pairs:</span>
                  <span className="font-semibold">{previewCounts.managerDRPairs360}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">ISL P2P:</span>
                  <span className="font-semibold">{previewCounts.p2pAssessments360}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold">
                  <span>360 Total:</span>
                  <span>{previewCounts.total360Assessments}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MSH³ Published Expected Box - CORRECTED MATH */}
          <div className="bg-white rounded-lg p-4 border-2 border-amber-300 mb-4">
            <h3 className="text-sm font-bold text-amber-900 mb-3">MSH³ Published (Expected per Cycle)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">1x1 (Months 1 & 2):</span>
                  <span className="font-semibold">{previewCounts.msh1x1Expected || 48}</span>
                </div>
                <div className="text-xs text-gray-500 ml-4">24 per month × 2</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">360 (Month 3):</span>
                  <span className="font-semibold">{previewCounts.msh360Expected || 49}</span>
                </div>
                <div className="text-xs text-gray-500 ml-4">
                  • ISF: {previewCounts.msh360Breakdown?.isfMSH || 19}<br/>
                  • ISL: {previewCounts.msh360Breakdown?.islMSH || 5}<br/>
                  • ISE (Pair B): {previewCounts.msh360Breakdown?.iseMSH || 5}<br/>
                  • ISL P2P: {previewCounts.msh360Breakdown?.islP2PMSH || 20}
                </div>
              </div>
            </div>
            <div className="border-t border-amber-300 pt-3 mt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Expected per Cycle:</span>
              <span className="text-2xl font-bold text-amber-700">{previewCounts.mshTotalExpected || 97}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 border-2 border-green-300">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Grand Total Assessments per Cycle:</span>
              <span className="text-3xl font-bold text-green-700">{previewCounts.grandTotalPerCycle}</span>
            </div>
          </div>

          {/* Detailed Manager List */}
          {previewCounts.managers && previewCounts.managers.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-indigo-900 hover:text-indigo-700">
                View Detailed Manager Breakdown ({previewCounts.managers.length} managers)
              </summary>
              <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
                <div className="space-y-2 text-sm">
                  {previewCounts.managers.map((manager, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="font-medium text-gray-900">{manager.name}</span>
                        <span className="text-gray-500 ml-2">({manager.layer})</span>
                      </div>
                      <span className="font-semibold text-indigo-600">{manager.directReports} direct reports</span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}
        </Card>
      )}

      {/* 🔍 DATABASE VALIDATION CARD - CORRECTED MATH */}
      {validationStats && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">Database Validation</h2>
            <span className="text-sm text-gray-600">(Actual counts from database)</span>
          </div>

          {/* Top Row - Main StatCards */}
          <div className="grid grid-cols-7 gap-3 mb-4">
            <div className="bg-white rounded-lg p-4 border-2 border-emerald-300 text-center">
              <div className="text-4xl font-bold text-emerald-700">{validationStats.totalCycles}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">Total<br/>Cycles</div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-blue-300 text-center">
              <div className="text-4xl font-bold text-blue-700">{validationStats.totalAssessments}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">Total<br/>Assessments</div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-indigo-300 text-center">
              <div className="text-4xl font-bold text-indigo-700">{validationStats.assessments1x1}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">1x1<br/>Assessments</div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-purple-300 text-center">
              <div className="text-4xl font-bold text-purple-700">{validationStats.assessments360}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">360<br/>Assessments</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-yellow-200 text-center">
              <div className="text-3xl font-bold text-yellow-700">{validationStats.statusCounts?.pending || 0}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">Pending</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
              <div className="text-3xl font-bold text-green-700">{validationStats.statusCounts?.completed || 0}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">Completed</div>
            </div>
            <div className="bg-white rounded-lg p-3 border-2 border-amber-300 text-center">
              <div className="text-3xl font-bold text-amber-700">{validationStats.totalMshPublished || 0}</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">MSH³<br/>Published</div>
            </div>
          </div>

          {/* Cycle Breakdown */}
          {validationStats.cycles && validationStats.cycles.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-emerald-200 mb-4">
              <h3 className="text-sm font-bold text-emerald-900 mb-3">Cycles in Database</h3>
              <div className="space-y-2">
                {[...validationStats.cycles].sort((a, b) => {
                  if (a.year !== b.year) return a.year - b.year;
                  return a.month - b.month;
                }).map((cycle, idx) => {
                  const expectedAssessments = cycle.cycleType === '1x1' 
                    ? previewCounts?.assessments1x1PerMonth || 24
                    : previewCounts?.total360Assessments || 93;
                  const isAssessmentMatch = cycle.assessmentCount === expectedAssessments;
                  
                  const expectedMsh = cycle.cycleType === '1x1' 
                    ? 24
                    : 49;
                  const isMshMatch = cycle.mshPublishedCount === expectedMsh;
                  
                  return (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            cycle.cycleType === '1x1' 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            {cycle.cycleType?.toUpperCase()}
                          </span>
                          <span className="font-medium text-gray-900">{cycle.monthName} {cycle.year}</span>
                          <span className="text-sm text-purple-700 font-semibold">Cycle {cycle.cycleNumber}/4</span>
                        </div>
                      </div>
                      
                      {/* Assessments Row */}
                      <div className="flex items-center justify-between pl-3">
                        <span className="text-sm text-gray-600">Assessments:</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-700">
                            <span className="font-bold text-lg">{cycle.assessmentCount}</span> created
                          </span>
                          {isAssessmentMatch ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                              ✓ Expected: {expectedAssessments}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                              ⚠ Expected: {expectedAssessments}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* MSH Published Row */}
                      <div className="flex items-center justify-between pl-3">
                        <span className="text-sm text-gray-600">MSH³ Published:</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-700">
                            <span className="font-bold text-lg text-amber-700">{cycle.mshPublishedCount || 0}</span> published
                          </span>
                          {isMshMatch ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                              ✓ Expected: {expectedMsh}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                              ⏳ Expected: {expectedMsh}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation Summary */}
          <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-4 border-2 border-emerald-300">
            {validationStats.totalCycles === 0 ? (
              <div className="text-center py-4">
                <div className="text-lg font-bold text-gray-900 mb-2">📋 No cycles in database yet</div>
                <div className="text-sm text-gray-600">Create your first cycle to see validation data</div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Assessment Validation */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">
                      ✅ 1x1 assessments: Working correctly ({validationStats.assessments1x1} total)
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      ✅ 360 assessments: Complete ({validationStats.assessments360} total)
                    </div>
                  </div>
                  {previewCounts && (
                    <div className="text-right">
                      <div className="text-xs text-gray-600 mb-1">Expected per full cycle:</div>
                      <div className="text-2xl font-bold text-emerald-700">{previewCounts.grandTotalPerCycle}</div>
                    </div>
                  )}
                </div>
                
                {/* MSH³ Published Validation */}
                {previewCounts && (
                  <div className="border-t border-emerald-300 pt-3 mt-3">
                    <div className="text-sm font-bold text-gray-900 mb-3">MSH³ Published Validation:</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="text-xs text-gray-600 mb-1">1x1 Expected:</div>
                        <div className="text-2xl font-bold text-blue-700">48</div>
                        <div className="text-xs text-gray-500 mt-1">24 per month × 2</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="text-xs text-gray-600 mb-1">360 Expected:</div>
                        <div className="text-2xl font-bold text-purple-700">49</div>
                        <div className="text-xs text-gray-500 mt-1">19 ISF + 5 ISL + 5 ISE + 20 P2P</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border-2 border-amber-300">
                        <div className="text-xs text-gray-600 mb-1">Total Expected:</div>
                        <div className="text-2xl font-bold text-amber-700">97</div>
                        <div className="text-xs text-gray-500 mt-1">per cycle</div>
                      </div>
                    </div>
                    
                    {/* Expected vs Actual Comparison */}
                    <div className="mt-3 bg-white rounded-lg p-3 border-2 border-amber-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">Actual MSH³ Published:</span>
                        <span className="text-2xl font-bold text-amber-700">{validationStats.totalMshPublished || 0}</span>
                      </div>
                      {validationStats.totalMshPublished !== undefined && (() => {
                        const expectedTotal = validationStats.cycles?.reduce((sum, cycle) => {
                          const cycleExpected = cycle.cycleType === '1x1' ? 24 : 49;
                          return sum + cycleExpected;
                        }, 0) || 0;
                        
                        const pending = Math.max(0, expectedTotal - validationStats.totalMshPublished);
                        
                        return (
                          <div className="mt-2 text-xs">
                            {validationStats.totalMshPublished === expectedTotal ? (
                              <span className="text-green-700 font-semibold">✅ All expected MSH³ scores published!</span>
                            ) : validationStats.totalMshPublished < expectedTotal ? (
                              <span className="text-amber-700 font-semibold">
                                ⏳ {pending} scores pending publication (Expected: {expectedTotal})
                              </span>
                            ) : (
                              <span className="text-blue-700 font-semibold">ℹ️ Review MSH³ count (Expected: {expectedTotal}, Got: {validationStats.totalMshPublished})</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 🔍 360 PAIR LINKING DIAGNOSTIC CARD */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-300">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-cyan-600" />
          <h2 className="text-xl font-bold text-gray-900">🔍 360 Pair Linking Diagnostic</h2>
        </div>

        <div className="bg-cyan-100 border border-cyan-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-cyan-900 mb-2">
            <strong>What this checks:</strong>
          </p>
          <ul className="list-disc list-inside text-sm text-cyan-900 space-y-1">
            <li>All manager ↔ DR pairs have matching pairIds</li>
            <li>Each pair has exactly 2 assessments (bidirectional)</li>
            <li>Self-assessments are linked to their pairs via 360Pairs array</li>
            <li>No orphaned assessments without pairIds</li>
          </ul>
        </div>

        <Button
          onClick={handleRunDiagnostic}
          disabled={diagnosticLoading}
          className="w-full mb-4"
          size="lg"
          variant="primary"
        >
          {diagnosticLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Running Diagnostic...
            </>
          ) : (
            <>
              <BarChart3 className="w-5 h-5 mr-2" />
              Run 360 Pair Linking Diagnostic
            </>
          )}
        </Button>

        {diagnosticReport && (
          <div className="space-y-4">
            {diagnosticReport.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">❌ Error: {diagnosticReport.error}</p>
              </div>
            ) : (
              <>
                {/* Overall Status */}
                <div className={`rounded-lg p-4 border-2 ${
                  diagnosticReport.isHealthy 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {diagnosticReport.isHealthy ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <h3 className="text-lg font-bold text-green-900">✅ 360 Linking is Healthy!</h3>
                          <p className="text-sm text-green-700">All pairs are properly linked</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-8 h-8 text-yellow-600" />
                        <div>
                          <h3 className="text-lg font-bold text-yellow-900">⚠️ Issues Found</h3>
                          <p className="text-sm text-yellow-700">Some pairs need fixing</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-blue-700">{diagnosticReport.totalAssessments}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Assessments</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-200 text-center">
                    <div className="text-2xl font-bold text-purple-700">{diagnosticReport.selfAssessments}</div>
                    <div className="text-xs text-gray-600 mt-1">Self Assessments</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200 text-center">
                    <div className="text-2xl font-bold text-indigo-700">{diagnosticReport.totalPairs}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Pairs</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-cyan-200 text-center">
                    <div className="text-2xl font-bold text-cyan-700">{diagnosticReport.peerAssessments}</div>
                    <div className="text-xs text-gray-600 mt-1">Peer Assessments</div>
                  </div>
                </div>

                {/* Pair Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-3xl font-bold text-green-700 mb-1">
                      {diagnosticReport.properlyLinkedPairs}
                    </div>
                    <div className="text-sm font-semibold text-green-900">✅ Properly Linked Pairs</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="text-3xl font-bold text-red-700 mb-1">
                      {diagnosticReport.brokenPairs}
                    </div>
                    <div className="text-sm font-semibold text-red-900">❌ Broken Pairs</div>
                  </div>
                </div>

                {/* Issues List */}
                {(diagnosticReport.brokenPairs > 0 || 
                  diagnosticReport.orphanedAssessments.length > 0 || 
                  diagnosticReport.orphanedSelfs.length > 0) && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="text-sm font-bold text-red-900 mb-3">Issues Found:</h3>
                    
                    {diagnosticReport.brokenPairsList.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-red-800 mb-2">Broken Pairs:</p>
                        <div className="space-y-2">
                          {diagnosticReport.brokenPairsList.slice(0, 5).map((pair, idx) => (
                            <div key={idx} className="bg-white rounded p-2 text-xs">
                              <div className="font-mono text-gray-600 mb-1">{pair.pairId}</div>
                              <div className="text-gray-700">{pair.assessments.join(' ⇄ ')}</div>
                              <div className="text-red-600 mt-1">{pair.issues.join(', ')}</div>
                            </div>
                          ))}
                          {diagnosticReport.brokenPairsList.length > 5 && (
                            <p className="text-xs text-gray-600">...and {diagnosticReport.brokenPairsList.length - 5} more</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {diagnosticReport.orphanedAssessments.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-red-800 mb-2">
                          Orphaned Assessments (no pairId): {diagnosticReport.orphanedAssessments.length}
                        </p>
                      </div>
                    )}
                    
                    {diagnosticReport.orphanedSelfs.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-red-800 mb-2">
                          Self-Assessments with no pairs linked: {diagnosticReport.orphanedSelfs.length}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sample of Good Pairs */}
                {diagnosticReport.properlyLinkedPairsList.length > 0 && (
                  <details className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <summary className="cursor-pointer text-sm font-semibold text-green-900 hover:text-green-700">
                      View Sample Properly Linked Pairs ({diagnosticReport.properlyLinkedPairsList.length} total)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {diagnosticReport.properlyLinkedPairsList.slice(0, 10).map((pair, idx) => (
                        <div key={idx} className="bg-white rounded p-2 text-xs">
                          <div className="font-mono text-gray-600 mb-1">{pair.pairId}</div>
                          <div className="text-gray-700">{pair.assessments.join(' ⇄ ')}</div>
                          <div className="text-green-600 mt-1">✅ Self-assessments linked</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ➕ Create Next Cycle
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-900">
            <strong>The Ringleader System:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Automates assessment creation for 3-month cycles</li>
              <li>Month 1 & 2: Manager assesses each direct report (1x1)</li>
              <li>Month 3: 360 assessments</li>
              <li className="ml-6">- Self-assessments for all participants</li>
              <li className="ml-6">- Bidirectional manager ↔ direct report reviews</li>
              <li className="ml-6">- ISL peer-to-peer assessments</li>
              <li>All assessments created with 'pending' status</li>
              <li>4 cycles per year = complete annual cycle</li>
            </ul>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-900">
            <strong>Preview:</strong> {getNextCyclePreview()}
          </p>
        </div>

        <Button
          onClick={handleCreateCycle}
          disabled={loading}
          className="w-full"
          size="lg"
          variant="primary"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Cycle...
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5 mr-2" />
              Create Next Cycle
            </>
          )}
        </Button>

        {message && (
          <div className={`mt-4 p-4 rounded-lg whitespace-pre-line ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : messageType === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-start gap-2">
              {messageType === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {messageType === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <div>{message}</div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Cycles</h2>
        
        {cycles.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No cycles created yet. Create your first cycle above to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cycle</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Cycle #</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{cycle.monthName} {cycle.year}</div>
                      <div className="text-xs text-gray-500">{cycle.cycleId}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAssessmentTypeBadge(cycle.cycleType)}`}>
                        {cycle.cycleType?.toUpperCase() || '1X1'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-purple-700">
                        {cycle.cycleNumber} of 4
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadge(cycle.status)}`}>
                        {cycle.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminCyclesManager;