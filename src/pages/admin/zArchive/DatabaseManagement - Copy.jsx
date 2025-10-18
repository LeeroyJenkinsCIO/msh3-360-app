// src/pages/admin/DatabaseManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Database, Trash2, RefreshCw, AlertTriangle, 
  FileText, Archive, Award
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
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
    totalCycles: 0,
    totalMshScores: 0,
    currentMSH: 0,
    assessmentCounter: 0
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Count assessments
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      const totalAssessments = assessmentsSnapshot.size;
      
      // Count cycles
      const cyclesSnapshot = await getDocs(collection(db, 'assessmentCycles'));
      const totalCycles = cyclesSnapshot.size;
      
      // Count MSH scores
      const mshScoresSnapshot = await getDocs(collection(db, 'mshScores'));
      const totalMshScores = mshScoresSnapshot.size;
      
      // Get MSH counter
      const mshCounterDoc = await getDocs(collection(db, 'counters'));
      let currentMSH = 0;
      mshCounterDoc.forEach(doc => {
        if (doc.id === 'mshCounter') {
          currentMSH = doc.data().currentMSH || 0;
        }
      });
      
      // Get assessment counter
      let assessmentCounter = 0;
      mshCounterDoc.forEach(doc => {
        if (doc.id === 'assessmentCounter') {
          assessmentCounter = doc.data().value || 0;
        }
      });
      
      setStats({
        totalAssessments,
        totalCycles,
        totalMshScores,
        currentMSH,
        assessmentCounter
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
      const batch = writeBatch(db);
      let count = 0;
      
      assessmentsSnapshot.forEach((docSnap) => {
        batch.delete(doc(db, 'assessments', docSnap.id));
        count++;
      });
      
      await batch.commit();
      
      // Reset assessment counter
      await setDoc(doc(db, 'counters', 'assessmentCounter'), {
        value: 0,
        lastReset: serverTimestamp(),
        resetMethod: 'manual'
      });
      
      console.log(`✅ Deleted ${count} assessments and reset counter`);
      alert(`✅ Deleted ${count} assessments`);
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
      
      const mshScoresSnapshot = await getDocs(collection(db, 'mshScores'));
      const batch = writeBatch(db);
      let count = 0;
      
      mshScoresSnapshot.forEach((docSnap) => {
        batch.delete(doc(db, 'mshScores', docSnap.id));
        count++;
      });
      
      await batch.commit();
      
      // Reset MSH counter
      await setDoc(doc(db, 'counters', 'mshCounter'), {
        currentMSH: 0,
        lastUpdated: serverTimestamp()
      });
      
      console.log(`✅ Deleted ${count} MSH scores and reset counter`);
      alert(`✅ Deleted ${count} MSH scores`);
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
      const batch = writeBatch(db);
      let count = 0;
      
      cyclesSnapshot.forEach((docSnap) => {
        batch.delete(doc(db, 'assessmentCycles', docSnap.id));
        count++;
      });
      
      await batch.commit();
      
      console.log(`✅ Deleted ${count} cycles`);
      alert(`✅ Deleted ${count} cycles`);
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
   * Resets: Both counters to 0
   */
  const handleCompleteReset = async () => {
    const confirmed = window.confirm(
      '⚠️ COMPLETE TRANSACTIONAL RESET\n\n' +
      'This will DELETE ALL DATA:\n' +
      `• ${stats.totalAssessments} assessments\n` +
      `• ${stats.totalMshScores} MSH scores\n` +
      `• ${stats.totalCycles} cycles\n` +
      '• Reset both counters to 0\n\n' +
      'Users and organizational structure will be preserved.\n\n' +
      'This action CANNOT be undone!'
    );

    if (!confirmed) return;

    const confirmText = window.prompt('Type "RESET" to confirm:');
    if (confirmText !== 'RESET') {
      alert('Reset cancelled - confirmation text did not match');
      return;
    }

    try {
      setProcessing(true);
      
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('🚀 COMPLETE RESET INITIATED');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      
      let totalDeleted = 0;
      
      // Delete all assessments
      console.log('🗑️ Step 1: Deleting assessments...');
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
      
      // Delete all MSH scores
      console.log('🗑️ Step 2: Deleting MSH scores...');
      const mshScoresSnapshot = await getDocs(collection(db, 'mshScores'));
      batch = writeBatch(db);
      batchCount = 0;
      
      for (const docSnap of mshScoresSnapshot.docs) {
        batch.delete(doc(db, 'mshScores', docSnap.id));
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
      
      // Delete all cycles
      console.log('🗑️ Step 3: Deleting cycles...');
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
      
      // Reset counters
      console.log('🔄 Step 4: Resetting counters...');
      await setDoc(doc(db, 'counters', 'assessmentCounter'), {
        value: 0,
        lastReset: serverTimestamp(),
        resetMethod: 'nuclear'
      });
      
      await setDoc(doc(db, 'counters', 'mshCounter'), {
        currentMSH: 0,
        lastUpdated: serverTimestamp()
      });
      
      console.log('✅ Counters reset to 0');
      
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ COMPLETE RESET FINISHED');
      console.log(`Total items deleted: ${totalDeleted}`);
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      
      alert(
        '✅ COMPLETE RESET SUCCESSFUL!\n\n' +
        `• Deleted ${assessmentsSnapshot.size} assessments\n` +
        `• Deleted ${mshScoresSnapshot.size} MSH scores\n` +
        `• Deleted ${cyclesSnapshot.size} cycles\n` +
        '• Reset both counters to 0\n\n' +
        'Database is clean. Ready to create new cycles.'
      );
      
      await loadStats();
      
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</div>
              <div className="text-sm text-gray-600">Assessments</div>
              <div className="text-xs text-gray-500 mt-1">Forms</div>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalMshScores}</div>
              <div className="text-sm text-gray-600">MSH Scores</div>
              <div className="text-xs text-gray-500 mt-1">Published</div>
            </div>
            <Award className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalCycles}</div>
              <div className="text-sm text-gray-600">Cycles</div>
              <div className="text-xs text-gray-500 mt-1">Months</div>
            </div>
            <Archive className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                MSH{stats.currentMSH}
              </div>
              <div className="text-sm text-gray-600">Current MSH</div>
              <div className="text-xs text-gray-500 mt-1">Last published</div>
            </div>
            <Database className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                MSH{stats.currentMSH + 1}
              </div>
              <div className="text-sm text-gray-600">Next MSH</div>
              <div className="text-xs text-gray-500 mt-1">Will assign</div>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Transactional Operations */}
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
            <h3 className="font-semibold text-gray-900 mb-2">Delete All Assessments</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats.totalAssessments} assessment forms and resets assessment counter. 
              MSH scores and cycles are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllAssessments}
              disabled={processing || stats.totalAssessments === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Delete {stats.totalAssessments} Assessments
            </Button>
          </div>

          {/* Delete All MSH Scores */}
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-2">Delete All MSH Scores</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats.totalMshScores} published MSH scores and resets MSH counter. 
              Assessments and cycles are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllMshScores}
              disabled={processing || stats.totalMshScores === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Delete {stats.totalMshScores} MSH Scores
            </Button>
          </div>

          {/* Delete All Cycles */}
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-2">Delete All Cycles</h3>
            <p className="text-sm text-gray-600 mb-4">
              Removes all {stats.totalCycles} assessment cycles. Assessments and MSH scores are preserved.
            </p>
            <Button
              variant="danger"
              onClick={handleDeleteAllCycles}
              disabled={processing || stats.totalCycles === 0}
              className="w-full justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Delete {stats.totalCycles} Cycles
            </Button>
          </div>

          {/* Complete Reset */}
          <div className="bg-red-100 rounded-lg p-4 border-2 border-red-300">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              ⚡ Complete Nuclear Reset
            </h3>
            <p className="text-sm text-red-800 mb-4">
              <strong>Deletes EVERYTHING:</strong>
              <br/>• {stats.totalAssessments} assessments (forms)
              <br/>• {stats.totalMshScores} MSH scores (published metrics)
              <br/>• {stats.totalCycles} cycles
              <br/>• Resets both counters to 0
              <br/><br/>
              Users and organizational structure are preserved.
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
                  Complete Nuclear Reset
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
            <strong className="font-semibold">Schema Update:</strong> The system now separates 
            <strong> Assessments</strong> (forms) from <strong> MSH Scores</strong> (published metrics). 
            Use "Complete Nuclear Reset" to clear everything and start fresh with the new Ringleader system.
          </div>
        </div>
      </Card>

    </div>
  );
}

export default DatabaseManagement;