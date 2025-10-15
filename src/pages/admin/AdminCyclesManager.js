// src/pages/admin/AdminCyclesManager.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  createNextCycle,
  getLastCycle,
  getAllCycles,
  getActiveCycle 
} from '../../utils/CreateAssessmentCycles';

/**
 * Admin Cycles Manager
 * Interface to create and manage assessment cycles using the Ringleader
 */
function AdminCyclesManager() {
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [lastCycle, setLastCycle] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'success', 'error', 'info'
  
  // First cycle controls (only shown if no cycles exist)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStartMonth, setSelectedStartMonth] = useState(10); // October default

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadCycles(),
        loadLastCycle(),
        loadActiveCycle()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadCycles = async () => {
    try {
      const allCycles = await getAllCycles();
      setCycles(allCycles);
    } catch (error) {
      console.error('Error loading cycles:', error);
    }
  };

  const loadLastCycle = async () => {
    try {
      const last = await getLastCycle();
      setLastCycle(last);
    } catch (error) {
      console.error('Error loading last cycle:', error);
    }
  };

  const loadActiveCycle = async () => {
    const active = await getActiveCycle();
    setActiveCycle(active);
  };

  const handleCreateCycle = async () => {
    setLoading(true);
    setMessage('');

    try {
      let result;
      
      if (!lastCycle) {
        // FIRST CYCLE - Need year and month
        console.log(`Creating first cycle starting ${selectedStartMonth}/${selectedYear}`);
        result = await createNextCycle(selectedYear, selectedStartMonth);
      } else {
        // SUBSEQUENT CYCLES - Auto-detect next months
        console.log('Creating next cycle (auto-detected)');
        result = await createNextCycle();
      }

      if (result.success) {
        setMessageType('success');
        setMessage(
          `✅ Success! Created Cycle ${result.cycleNumber} of 4\n` +
          `Months: ${result.cyclesCreated.join(', ')}\n` +
          `Total Assessments: ${result.totalAssessments}\n` +
          `Managers: ${result.managersProcessed}`
        );
        
        // Reload data
        await loadData();
      }
    } catch (error) {
      console.error('Error creating cycle:', error);
      setMessageType('error');
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      return `Will create Cycle 1 starting ${months.find(m => m.value === selectedStartMonth)?.label} ${selectedYear}`;
    }
    
    const nextMonth = lastCycle.month + 1;
    const nextStartMonth = nextMonth > 12 ? 1 : nextMonth;
    const nextYear = nextMonth > 12 ? lastCycle.year + 1 : lastCycle.year;
    
    // Calculate which cycle number
    let cycleNum = 1;
    if (nextStartMonth >= 10) cycleNum = 1;
    else if (nextStartMonth >= 7) cycleNum = 4;
    else if (nextStartMonth >= 4) cycleNum = 3;
    else if (nextStartMonth >= 1) cycleNum = 2;
    
    return `Will create Cycle ${cycleNum} of 4 starting ${months.find(m => m.value === nextStartMonth)?.label} ${nextYear}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🎪 Assessment Cycles Manager</h1>

        {/* Active Cycle Display */}
        {activeCycle && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm text-gray-600">Active Cycle</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAssessmentTypeBadge(activeCycle.assessmentType)}`}>
                    {activeCycle.assessmentType?.toUpperCase() || '1X1'}
                  </span>
                  <span className="text-sm font-semibold text-purple-700">
                    Cycle {activeCycle.cycleNumber} of 4
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{activeCycle.monthName} {activeCycle.year}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>Month {activeCycle.metadata?.monthInCycle} of 3 in this cycle</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${getStatusBadge(activeCycle.status)}`}>
                <span className="text-sm font-semibold uppercase">{activeCycle.status}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Last Cycle Info */}
        {lastCycle && (
          <Card className="mb-6 bg-gray-50">
            <div className="text-sm text-gray-600">
              <strong>Last Cycle Created:</strong> {lastCycle.monthName} {lastCycle.year} 
              {' '}({lastCycle.assessmentType?.toUpperCase()})
              {' '}- Cycle {lastCycle.cycleNumber} of 4
            </div>
          </Card>
        )}

        {/* Create Cycle Section */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {!lastCycle ? '🎬 Create First Cycle' : '➕ Create Next Cycle'}
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-900">
              <strong>The Ringleader System:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Creates ONE cycle = 3 consecutive months</li>
                <li>Automatically creates ALL pending assessments (no MSH IDs yet)</li>
                <li>MSH IDs generated only when assessments are published</li>
                <li>Users can only access current month's assessments</li>
                <li>Every 3rd month (Mar, Jun, Sep, Dec) includes 360 + self-assessments</li>
              </ul>
            </div>
          </div>

          {/* First Cycle Form (only if no cycles exist) */}
          {!lastCycle && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Select Start Date (First Cycle Only)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting Month
                  </label>
                  <select
                    value={selectedStartMonth}
                    onChange={(e) => setSelectedStartMonth(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    min="2024"
                    max="2030"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-900">
              <strong>Preview:</strong> {getNextCyclePreview()}
            </p>
          </div>

          {/* Create Button */}
          <Button
            onClick={handleCreateCycle}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Cycle...
              </>
            ) : (
              <>
                🎪 {!lastCycle ? 'Create First Cycle' : 'Create Next Cycle'}
              </>
            )}
          </Button>

          {/* Result Message */}
          {message && (
            <div className={`mt-4 p-4 rounded-lg whitespace-pre-line ${
              messageType === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : messageType === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              {message}
            </div>
          )}
        </Card>

        {/* Existing Cycles List */}
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
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Month in Cycle</th>
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
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAssessmentTypeBadge(cycle.assessmentType)}`}>
                          {cycle.assessmentType?.toUpperCase() || '1X1'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-purple-700">
                          {cycle.cycleNumber} of 4
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">
                          Month {cycle.metadata?.monthInCycle} of 3
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
    </div>
  );
}

export default AdminCyclesManager;