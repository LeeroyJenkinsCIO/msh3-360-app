// src/pages/admin/DatabaseManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Database, Trash2, RefreshCw, AlertTriangle, 
  FileText, Archive, Filter
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  getDatabaseStats,
  deleteAllAssessments,
  deleteAllCycles,
  completeTransactionalReset,
  getFilteredAssessments,
  getFilteredCycles,
  deleteSelectedAssessments,
  deleteSelectedCycles
} from '../../utils/firebaseAdmin';

function DatabaseManagement() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Selective Assessments
  const [assessmentFilters, setAssessmentFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: [],
    evaluator: '',
    cycle: ''
  });
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState([]);

  // Selective Cycles
  const [cycleFilters, setCycleFilters] = useState({
    year: [],
    type: [],
    status: []
  });
  const [filteredCycles, setFilteredCycles] = useState([]);
  const [selectedCycles, setSelectedCycles] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getDatabaseStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      alert(`Error loading stats: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Selective Assessment Operations
  const handleFilterAssessments = async () => {
    try {
      setProcessing(true);
      const results = await getFilteredAssessments(assessmentFilters);
      setFilteredAssessments(results);
      setSelectedAssessments([]);
    } catch (error) {
      console.error('Error filtering assessments:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAllAssessments = (checked) => {
    if (checked) {
      setSelectedAssessments(filteredAssessments.map(a => a.id));
    } else {
      setSelectedAssessments([]);
    }
  };

  const handleDeleteSelectedAssessments = async () => {
    if (selectedAssessments.length === 0) {
      alert('No assessments selected');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedAssessments.length} selected assessments?\n\n` +
      'MSH counter will remain unchanged.\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      await deleteSelectedAssessments(selectedAssessments);
      alert(`✅ Deleted ${selectedAssessments.length} assessments`);
      setSelectedAssessments([]);
      await handleFilterAssessments();
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Selective Cycle Operations
  const handleFilterCycles = async () => {
    try {
      setProcessing(true);
      const results = await getFilteredCycles(cycleFilters);
      setFilteredCycles(results);
      setSelectedCycles([]);
    } catch (error) {
      console.error('Error filtering cycles:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAllCycles = (checked) => {
    if (checked) {
      setSelectedCycles(filteredCycles.map(c => c.id));
    } else {
      setSelectedCycles([]);
    }
  };

  const handleDeleteSelectedCycles = async () => {
    if (selectedCycles.length === 0) {
      alert('No cycles selected');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedCycles.length} selected cycles?\n\n` +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      await deleteSelectedCycles(selectedCycles);
      alert(`✅ Deleted ${selectedCycles.length} cycles`);
      setSelectedCycles([]);
      await handleFilterCycles();
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Transactional Operations
  const handleDeleteAllAssessments = async () => {
    const confirmed = window.confirm(
      `⚠️ Delete ALL ${stats?.totalAssessments || 0} assessments?\n\n` +
      'This will:\n' +
      `• Delete all ${stats?.totalAssessments || 0} assessments\n` +
      '• Reset MSH counter to 0\n' +
      '• Keep all cycles intact\n\n' +
      'This action CANNOT be undone!'
    );

    if (!confirmed) return;

    const confirmText = window.prompt('Type "DELETE" to confirm:');
    if (confirmText !== 'DELETE') {
      alert('Cancelled - confirmation text did not match');
      return;
    }

    try {
      setProcessing(true);
      const result = await deleteAllAssessments();
      alert(`✅ Deleted ${result.deletedCount} assessments and reset MSH counter to 0`);
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAllCycles = async () => {
    const confirmed = window.confirm(
      `⚠️ Delete ALL ${stats?.totalCycles || 0} cycles?\n\n` +
      'This will:\n' +
      `• Delete all ${stats?.totalCycles || 0} cycles\n` +
      '• Keep all assessments intact\n\n' +
      'This action CANNOT be undone!'
    );

    if (!confirmed) return;

    const confirmText = window.prompt('Type "DELETE" to confirm:');
    if (confirmText !== 'DELETE') {
      alert('Cancelled - confirmation text did not match');
      return;
    }

    try {
      setProcessing(true);
      const result = await deleteAllCycles();
      alert(`✅ Deleted ${result.deletedCount} cycles`);
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * ⚡ BULLETPROOF COMPLETE RESET HANDLER ⚡
   * 
   * This handler:
   * 1. Gets user confirmation
   * 2. Calls completeTransactionalReset() (DESTRUCTION ONLY)
   * 3. Reloads stats to show 0 assessments, 0 cycles
   * 4. NEVER creates any data
   * 5. Console logging for debugging
   */
  const handleCompleteReset = async () => {
    // Step 1: First confirmation
    const confirmed = window.confirm(
      '⚠️ COMPLETE TRANSACTIONAL RESET\n\n' +
      'This will DELETE ALL DATA:\n' +
      `• ${stats?.totalAssessments || 0} assessments\n` +
      `• ${stats?.totalCycles || 0} cycles\n` +
      '• Reset MSH counter to 0\n\n' +
      'Users and organizational structure will be preserved.\n\n' +
      'This action CANNOT be undone!'
    );

    if (!confirmed) {
      console.log('❌ Reset cancelled by user (first prompt)');
      return;
    }

    // Step 2: Text confirmation
    const confirmText = window.prompt('Type "RESET" to confirm:');
    if (confirmText !== 'RESET') {
      alert('Reset cancelled - confirmation text did not match');
      console.log('❌ Reset cancelled - user typed:', confirmText);
      return;
    }

    try {
      setProcessing(true);
      
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('🚀 BULLETPROOF TRANSACTIONAL RESET INITIATED');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      
      // Execute the DESTRUCTION-ONLY reset
      const result = await completeTransactionalReset();
      
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ RESET FUNCTION RETURNED SUCCESSFULLY');
      console.log('═══════════════════════════════════════════════════');
      console.log('Result:', result);
      console.log('');
      
      // Show success message
      alert(
        '✅ TRANSACTIONAL RESET COMPLETE!\n\n' +
        `• Deleted ${result.deletedAssessments} assessments\n` +
        `• Deleted ${result.deletedCycles} cycles\n` +
        `• Reset MSH counter to 0\n\n` +
        '🎯 Database is clean. Ready to create new assessment packages.'
      );
      
      console.log('📊 Reloading stats...');
      
      // Reload stats to verify 0 assessments, 0 cycles
      await loadStats();
      
      console.log('✅ Stats reloaded successfully');
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('🎉 BULLETPROOF RESET SEQUENCE COMPLETE');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      console.log('⚠️  DO NOT NAVIGATE TO OTHER PAGES YET');
      console.log('⚠️  Check Firebase Console now to verify 0 assessments');
      console.log('');
      
    } catch (error) {
      console.error('');
      console.error('═══════════════════════════════════════════════════');
      console.error('❌ ERROR DURING RESET');
      console.error('═══════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('');
      
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
      console.log('🏁 Processing flag cleared');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading database statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold text-gray-900">Database Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-orange-700 font-medium">
                Admin only • Destructive operations
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadStats}
            disabled={processing}
          >
            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Section 1: Database Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalAssessments || 0}</div>
              <div className="text-sm text-gray-600">Assessments</div>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalCycles || 0}</div>
              <div className="text-sm text-gray-600">Cycles</div>
            </div>
            <Archive className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats?.lastPostedMSH ? `MSH${stats.lastPostedMSH}` : '—'}
              </div>
              <div className="text-sm text-gray-600">Last Posted</div>
            </div>
            <Database className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                MSH{(stats?.currentMSHNumber || 0) + 1}
              </div>
              <div className="text-sm text-gray-600">Next Assign</div>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* MSH Gap Warning */}
      {stats?.mshGaps && stats.mshGaps.length > 0 && (
        <Card className="bg-yellow-50 border-2 border-yellow-400">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-900 mb-1">
                ⚠️ {stats.mshGaps.length} gap{stats.mshGaps.length !== 1 ? 's' : ''} detected in sequence
              </div>
              <div className="text-sm text-yellow-800">
                Missing: {stats.mshGaps.slice(0, 10).map(n => `MSH${n}`).join(', ')}
                {stats.mshGaps.length > 10 && ` ... and ${stats.mshGaps.length - 10} more`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Section 2: Selective Operations */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Selective Operations</h2>
        <p className="text-sm text-gray-600 mb-6">
          Filter and delete specific records. MSH counter remains unchanged (surgical removal).
        </p>

        {/* Assessment Filters */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Assessments
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <input
              type="date"
              placeholder="Date From"
              value={assessmentFilters.dateFrom}
              onChange={(e) => setAssessmentFilters({...assessmentFilters, dateFrom: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              placeholder="Date To"
              value={assessmentFilters.dateTo}
              onChange={(e) => setAssessmentFilters({...assessmentFilters, dateTo: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Evaluator"
              value={assessmentFilters.evaluator}
              onChange={(e) => setAssessmentFilters({...assessmentFilters, evaluator: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Cycle"
              value={assessmentFilters.cycle}
              onChange={(e) => setAssessmentFilters({...assessmentFilters, cycle: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <Button onClick={handleFilterAssessments} disabled={processing} className="w-full">
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>

          {filteredAssessments.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {filteredAssessments.length} assessments found
                </span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAssessments.length === filteredAssessments.length}
                    onChange={(e) => handleSelectAllAssessments(e.target.checked)}
                    className="rounded"
                  />
                  Select All
                </label>
              </div>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                {filteredAssessments.map((assessment) => (
                  <label key={assessment.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedAssessments.includes(assessment.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssessments([...selectedAssessments, assessment.id]);
                        } else {
                          setSelectedAssessments(selectedAssessments.filter(id => id !== assessment.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900">{assessment.mshId || assessment.id}</span>
                  </label>
                ))}
              </div>
              <Button
                variant="warning"
                onClick={handleDeleteSelectedAssessments}
                disabled={processing || selectedAssessments.length === 0}
                className="w-full mt-3"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedAssessments.length})
              </Button>
            </div>
          )}
        </div>

        {/* Cycle Filters */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Cycles
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Year (e.g., 2025)"
              value={cycleFilters.year.join(',')}
              onChange={(e) => setCycleFilters({...cycleFilters, year: e.target.value.split(',').filter(Boolean)})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={cycleFilters.type.join(',')}
              onChange={(e) => setCycleFilters({...cycleFilters, type: e.target.value ? [e.target.value] : []})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Types</option>
              <option value="1x1">1x1</option>
              <option value="360">360</option>
            </select>
            <input
              type="text"
              placeholder="Status"
              value={cycleFilters.status.join(',')}
              onChange={(e) => setCycleFilters({...cycleFilters, status: e.target.value.split(',').filter(Boolean)})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <Button onClick={handleFilterCycles} disabled={processing} className="w-full">
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>

          {filteredCycles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {filteredCycles.length} cycles found
                </span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCycles.length === filteredCycles.length}
                    onChange={(e) => handleSelectAllCycles(e.target.checked)}
                    className="rounded"
                  />
                  Select All
                </label>
              </div>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                {filteredCycles.map((cycle) => (
                  <label key={cycle.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedCycles.includes(cycle.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCycles([...selectedCycles, cycle.id]);
                        } else {
                          setSelectedCycles(selectedCycles.filter(id => id !== cycle.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900">{cycle.cycleName || cycle.cycleId}</span>
                  </label>
                ))}
              </div>
              <Button
                variant="warning"
                onClick={handleDeleteSelectedCycles}
                disabled={processing || selectedCycles.length === 0}
                className="w-full mt-3"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedCycles.length})
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Section 3: Transactional Delete */}
      <Card className="border-2 border-red-200 bg-red-50">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Transactional Delete</h2>
          </div>
          <p className="text-red-700 text-sm">
            Delete all data and reset counters. These operations cannot be undone.
          </p>
        </div>

        <div className="space-y-4">
          {/* Delete All Assessments */}
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-2">Delete All Assessments</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats?.totalAssessments || 0} assessments and resets MSH counter to 0. Cycles are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllAssessments}
              disabled={processing || stats?.totalAssessments === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Assessments
            </Button>
          </div>

          {/* Delete All Cycles */}
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-2">Delete All Cycles</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats?.totalCycles || 0} assessment cycles. Assessments are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllCycles}
              disabled={processing || stats?.totalCycles === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Cycles
            </Button>
          </div>

          {/* Complete Reset - BULLETPROOF VERSION */}
          <div className="bg-red-100 rounded-lg p-4 border-2 border-red-300">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              ⚡ Complete Transactional Reset (BULLETPROOF)
            </h3>
            <p className="text-sm text-red-800 mb-4">
              Deletes ALL DATA: {stats?.totalAssessments || 0} assessments, {stats?.totalCycles || 0} cycles, 
              and resets MSH counter to 0. Users and organizational structure are preserved.
              <br /><br />
              <strong>BULLETPROOF:</strong> This function ONLY DELETES. It will NEVER create any assessments or cycles.
            </p>
            <Button
              variant="danger"
              onClick={handleCompleteReset}
              disabled={processing}
              className="w-full justify-center bg-red-700 hover:bg-red-800"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Reset...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Complete Transactional Reset
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Warning Footer */}
      <Card className="bg-yellow-50 border border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong className="font-semibold">Warning:</strong> All operations on this page are 
            <strong> irreversible</strong>. Users and organizational structure are preserved, but assessments 
            and cycles will be permanently deleted. After a reset, use the Cycles tab to create new assessment packages.
          </div>
        </div>
      </Card>

    </div>
  );
}

export default DatabaseManagement;