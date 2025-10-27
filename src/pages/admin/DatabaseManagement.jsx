// src/pages/admin/DatabaseManagement.jsx
// ✅ FIXED: Counter document IDs now match 1x1AssessGrid.js ('msh' instead of 'mshCounter')

import React, { useState, useEffect } from 'react';
import { 
  Database, Trash2, RefreshCw, AlertTriangle, 
  FileText, Award, Calendar, Hash, Layers
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function DatabaseManagement() {
  const [stats, setStats] = useState({
    totalAssessments: 0,
    pendingAssessments: 0,
    completedAssessments: 0,
    totalCycles: 0,
    totalMshScores: 0,
    currentMSH: 0,
    totalTransactionalDocs: 0
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Count assessments by status
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      let totalAssessments = 0;
      let pendingAssessments = 0;
      let completedAssessments = 0;
      
      assessmentsSnapshot.forEach(doc => {
        totalAssessments++;
        const status = doc.data().status;
        if (status === 'pending' || status === 'not-started') {
          pendingAssessments++;
        } else if (status === 'completed' || status === 'published') {
          completedAssessments++;
        }
      });
      
      // Count cycles
      const cyclesSnapshot = await getDocs(collection(db, 'assessmentCycles'));
      const totalCycles = cyclesSnapshot.size;
      
      // Count MSH scores
      const mshScoresSnapshot = await getDocs(collection(db, 'mshs'));
      const totalMshScores = mshScoresSnapshot.size;
      
      // Calculate total transactional documents
      const totalTransactionalDocs = totalAssessments + totalMshScores + totalCycles;
      
      // ✅ FIXED: Read from 'msh' counter (not 'mshCounter')
      const countersSnapshot = await getDocs(collection(db, 'counters'));
      let currentMSH = 0;
      
      countersSnapshot.forEach(doc => {
        if (doc.id === 'msh') {  // ✅ Changed from 'mshCounter'
          currentMSH = doc.data().current || 0;  // ✅ Changed from 'currentMSH'
        }
      });
      
      setStats({
        totalAssessments,
        pendingAssessments,
        completedAssessments,
        totalCycles,
        totalMshScores,
        currentMSH,
        totalTransactionalDocs
      });
      
    } catch (error) {
      console.error('Error loading stats:', error);
      alert(`Error loading stats: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete all assessments only (keeps MSH scores and cycles)
   */
  const handleDeleteAllAssessments = async () => {
    const confirmed = window.confirm(
      `⚠️ Delete ALL ${stats.totalAssessments} assessments?\n\n` +
      'This will:\n' +
      `• Delete all ${stats.totalAssessments} assessment forms\n` +
      '• Reset assessment counter to 0\n' +
      '• Keep MSH scores intact\n' +
      '• Keep cycles intact\n\n' +
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
      console.log('🗑️ Deleting all assessments...');
      
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      let batch = writeBatch(db);
      let count = 0;
      let batchCount = 0;
      
      for (const docSnap of assessmentsSnapshot.docs) {
        batch.delete(doc(db, 'assessments', docSnap.id));
        count++;
        batchCount++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      // Reset assessment counter
      await setDoc(doc(db, 'counters', 'assessmentCounter'), {
        value: 0,
        lastReset: serverTimestamp(),
        resetMethod: 'manual-assessments-only'
      });
      
      console.log(`✅ Deleted ${count} assessments and reset counter`);
      alert(`✅ Successfully deleted ${count} assessments and reset counter`);
      await loadStats();
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Delete all MSH scores only (keeps assessments and cycles)
   */
  const handleDeleteAllMshScores = async () => {
    const confirmed = window.confirm(
      `⚠️ Delete ALL ${stats.totalMshScores} MSH scores?\n\n` +
      'This will:\n' +
      `• Delete all ${stats.totalMshScores} published MSH scores\n` +
      '• Reset MSH counter to 0\n' +
      '• Keep assessment forms intact\n' +
      '• Keep cycles intact\n\n' +
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
      console.log('🗑️ Deleting all MSH scores...');
      
      const mshScoresSnapshot = await getDocs(collection(db, 'mshs'));
      let batch = writeBatch(db);
      let count = 0;
      let batchCount = 0;
      
      for (const docSnap of mshScoresSnapshot.docs) {
        batch.delete(doc(db, 'mshs', docSnap.id));
        count++;
        batchCount++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      // ✅ FIXED: Reset 'msh' counter (not 'mshCounter')
      await setDoc(doc(db, 'counters', 'msh'), {
        current: 0,
        lastUpdated: serverTimestamp()
      });
      
      console.log(`✅ Deleted ${count} MSH scores and reset counter`);
      alert(`✅ Successfully deleted ${count} MSH scores and reset counter`);
      await loadStats();
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Delete all cycles only (keeps assessments and MSH scores)
   */
  const handleDeleteAllCycles = async () => {
    const confirmed = window.confirm(
      `⚠️ Delete ALL ${stats.totalCycles} cycles?\n\n` +
      'This will:\n' +
      `• Delete all ${stats.totalCycles} assessment cycles\n` +
      '• Keep assessments intact\n' +
      '• Keep MSH scores intact\n\n' +
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
      console.log('🗑️ Deleting all cycles...');
      
      const cyclesSnapshot = await getDocs(collection(db, 'assessmentCycles'));
      let batch = writeBatch(db);
      let count = 0;
      let batchCount = 0;
      
      for (const docSnap of cyclesSnapshot.docs) {
        batch.delete(doc(db, 'assessmentCycles', docSnap.id));
        count++;
        batchCount++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Deleted ${count} cycles`);
      alert(`✅ Successfully deleted ${count} cycles`);
      await loadStats();
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * COMPLETE NUCLEAR RESET
   * Deletes: Assessments, MSH Scores, Cycles
   * Resets: ALL counters to 0
   */
  const handleCompleteReset = async () => {
    const confirmed = window.confirm(
      '🚨 COMPLETE NUCLEAR RESET\n\n' +
      'This will DELETE ALL TRANSACTIONAL DATA:\n' +
      `• ${stats.totalAssessments} assessment forms\n` +
      `• ${stats.totalMshScores} MSH scores\n` +
      `• ${stats.totalCycles} cycles\n` +
      `• Total: ${stats.totalTransactionalDocs} documents\n` +
      '• Reset assessment counter to 0\n' +
      '• Reset MSH counter to 0\n\n' +
      'Users and organizational structure will be preserved.\n\n' +
      'This action CANNOT be undone!'
    );

    if (!confirmed) return;

    const confirmText = window.prompt('Type "NUCLEAR" to confirm:');
    if (confirmText !== 'NUCLEAR') {
      alert('Reset cancelled - confirmation text did not match');
      return;
    }

    try {
      setProcessing(true);
      
      console.log('');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('🚀 COMPLETE NUCLEAR RESET INITIATED');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log('');
      
      let totalDeleted = 0;
      
      // Step 1: Delete all assessments
      console.log('🗑️ Step 1/4: Deleting assessments...');
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      let batch = writeBatch(db);
      let batchCount = 0;
      
      for (const docSnap of assessmentsSnapshot.docs) {
        batch.delete(doc(db, 'assessments', docSnap.id));
        batchCount++;
        totalDeleted++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Deleted ${assessmentsSnapshot.size} assessments`);
      
      // Step 2: Delete all MSH scores
      console.log('🗑️ Step 2/4: Deleting MSH scores...');
      const mshScoresSnapshot = await getDocs(collection(db, 'mshs'));
      batch = writeBatch(db);
      batchCount = 0;
      
      for (const docSnap of mshScoresSnapshot.docs) {
        batch.delete(doc(db, 'mshs', docSnap.id));
        batchCount++;
        totalDeleted++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Deleted ${mshScoresSnapshot.size} MSH scores`);
      
      // Step 3: Delete all cycles
      console.log('🗑️ Step 3/4: Deleting cycles...');
      const cyclesSnapshot = await getDocs(collection(db, 'assessmentCycles'));
      batch = writeBatch(db);
      batchCount = 0;
      
      for (const docSnap of cyclesSnapshot.docs) {
        batch.delete(doc(db, 'assessmentCycles', docSnap.id));
        batchCount++;
        totalDeleted++;
        
        if (batchCount >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Deleted ${cyclesSnapshot.size} cycles`);
      
      // Step 4: Reset ALL counters
      console.log('🔄 Step 4/4: Resetting all counters...');
      
      await setDoc(doc(db, 'counters', 'assessmentCounter'), {
        value: 0,
        lastReset: serverTimestamp(),
        resetMethod: 'nuclear'
      });
      
      // ✅ FIXED: Reset 'msh' counter (not 'mshCounter')
      await setDoc(doc(db, 'counters', 'msh'), {
        current: 0,
        lastUpdated: serverTimestamp(),
        resetMethod: 'nuclear'
      });
      
      console.log('✅ All counters reset to 0');
      
      console.log('');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('✅ NUCLEAR RESET COMPLETE');
      console.log(`Total items deleted: ${totalDeleted}`);
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log('');
      
      alert(
        '✅ NUCLEAR RESET SUCCESSFUL!\n\n' +
        `• Deleted ${assessmentsSnapshot.size} assessments\n` +
        `• Deleted ${mshScoresSnapshot.size} MSH scores\n` +
        `• Deleted ${cyclesSnapshot.size} cycles\n` +
        `• Total documents deleted: ${totalDeleted}\n` +
        '• Reset assessment counter to 0\n' +
        '• Reset MSH counter to 0\n\n' +
        'Database is clean. Ready to create new cycles.'
      );
      
      await loadStats();
      
    } catch (error) {
      console.error('');
      console.error('╔═══════════════════════════════════════════════════╗');
      console.error('❌ ERROR DURING NUCLEAR RESET');
      console.error('╚═══════════════════════════════════════════════════╝');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('');
      
      alert(`❌ Error during reset: ${error.message}`);
    } finally {
      setProcessing(false);
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

      {/* Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        
        {/* 1. Total Transactional Documents */}
        <Card className="bg-white border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-blue-600">{stats.totalTransactionalDocs}</div>
              <div className="text-sm text-gray-600 font-semibold">Total Documents</div>
              <div className="text-xs text-gray-500 mt-1">All transactional records</div>
            </div>
            <Layers className="w-12 h-12 text-blue-500" />
          </div>
        </Card>

        {/* 2. Assessment Forms */}
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-indigo-600">{stats.totalAssessments}</div>
              <div className="text-sm text-gray-600 font-medium">Assessment Forms</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.pendingAssessments} pending • {stats.completedAssessments} done
              </div>
            </div>
            <FileText className="w-10 h-10 text-indigo-500" />
          </div>
        </Card>

        {/* 3. MSH Scores */}
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-purple-600">{stats.totalMshScores}</div>
              <div className="text-sm text-gray-600 font-medium">MSH Scores</div>
              <div className="text-xs text-gray-500 mt-1">Published metrics</div>
            </div>
            <Award className="w-10 h-10 text-purple-500" />
          </div>
        </Card>

        {/* 4. Cycles */}
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600">{stats.totalCycles}</div>
              <div className="text-sm text-gray-600 font-medium">Cycles</div>
              <div className="text-xs text-gray-500 mt-1">Assessment periods</div>
            </div>
            <Calendar className="w-10 h-10 text-green-500" />
          </div>
        </Card>

        {/* 5. Current MSH Counter */}
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-orange-600">
                MSH-{String(stats.currentMSH).padStart(3, '0')}
              </div>
              <div className="text-sm text-gray-600 font-medium">Current MSH</div>
              <div className="text-xs text-gray-500 mt-1">Last published</div>
            </div>
            <Hash className="w-10 h-10 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Destructive Operations */}
      <Card className="border-2 border-red-200 bg-red-50">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Destructive Operations</h2>
          </div>
          <p className="text-red-700 text-sm">
            These operations cannot be undone. Use with extreme caution.
          </p>
        </div>

        <div className="space-y-4">
          {/* Delete All Assessments */}
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-2">Delete All Assessment Forms</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats.totalAssessments} assessment forms and resets assessment counter to 0. 
              MSH scores and cycles are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllAssessments}
              disabled={processing || stats.totalAssessments === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {stats.totalAssessments} Assessment Forms
            </Button>
          </div>

          {/* Delete All MSH Scores */}
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-2">Delete All MSH Scores</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats.totalMshScores} published MSH scores and resets MSH counter to 0. 
              Assessment forms and cycles are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllMshScores}
              disabled={processing || stats.totalMshScores === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {stats.totalMshScores} MSH Scores
            </Button>
          </div>

          {/* Delete All Cycles */}
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-2">Delete All Cycles</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats.totalCycles} assessment cycles. Assessment forms and MSH scores are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllCycles}
              disabled={processing || stats.totalCycles === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {stats.totalCycles} Cycles
            </Button>
          </div>

          {/* Complete Nuclear Reset */}
          <div className="bg-red-100 rounded-lg p-4 border-2 border-red-400">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              🚨 Complete Nuclear Reset
            </h3>
            <p className="text-sm text-red-800 mb-4">
              <strong>Deletes ALL transactional data ({stats.totalTransactionalDocs} documents):</strong>
              <br/>• {stats.totalAssessments} assessment forms
              <br/>• {stats.totalMshScores} MSH scores
              <br/>• {stats.totalCycles} cycles
              <br/>• Resets assessment counter to 0
              <br/>• Resets MSH counter to 0
              <br/><br/>
              <strong>Preserved:</strong> Users, organizational structure, pillars
            </p>
            <Button
              variant="danger"
              onClick={handleCompleteReset}
              disabled={processing}
              className="w-full justify-center bg-red-700 hover:bg-red-800"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Processing Nuclear Reset...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Complete Nuclear Reset ({stats.totalTransactionalDocs} docs)
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Footer */}
      <Card className="bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <strong className="font-semibold">Database Validation:</strong> Total Documents shows all transactional records 
            ({stats.totalAssessments} assessments + {stats.totalMshScores} MSH scores + {stats.totalCycles} cycles). 
            Use this to validate that Nuclear Reset clears everything (should show 0 after reset).
          </div>
        </div>
      </Card>

    </div>
  );
}

export default DatabaseManagement;