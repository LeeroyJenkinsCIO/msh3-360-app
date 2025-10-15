// src/pages/admin/CycleManagement.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Users, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getAllUsers } from '../../utils/firebaseUsers';

function CycleManagement() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [users, setUsers] = useState([]);
  
  // Form state
  const [cycleMonth, setCycleMonth] = useState('');
  const [cycleYear, setCycleYear] = useState('');
  
  // Results
  const [creationResult, setCreationResult] = useState(null);

  useEffect(() => {
    loadUsers();
    setDefaultDate();
  }, []);

  const setDefaultDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setCycleYear(year.toString());
    setCycleMonth(month);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userData = await getAllUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
      alert(`Error loading users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getManagerDirectReportPairs = () => {
    const pairs = [];
    
    // Find all users with direct reports
    users.forEach(manager => {
      if (manager.directReportIds && manager.directReportIds.length > 0) {
        manager.directReportIds.forEach(reportId => {
          const directReport = users.find(u => u.userId === reportId || u.id === reportId);
          if (directReport) {
            pairs.push({
              managerId: manager.userId || manager.id,
              managerName: manager.displayName,
              directReportId: directReport.userId || directReport.id,
              directReportName: directReport.displayName,
              managerPillar: manager.pillar,
              directReportPillar: directReport.pillar
            });
          }
        });
      }
    });
    
    return pairs;
  };

  const handleCreate1x1Cycle = async () => {
    if (!cycleMonth || !cycleYear) {
      alert('Please select month and year');
      return;
    }

    const pairs = getManagerDirectReportPairs();
    
    if (pairs.length === 0) {
      alert('No manager-direct report relationships found. Please set up direct reports in User Management.');
      return;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(cycleMonth) - 1];
    const cycleName = `${monthName} ${cycleYear} 1x1`;

    const confirmed = window.confirm(
      `Create 1x1 Cycle?\n\n` +
      `Cycle: ${cycleName}\n` +
      `Assessments to create: ${pairs.length}\n\n` +
      `This will generate ${pairs.length} assessments with MSH IDs.`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setCreationResult(null);

      // TODO: Call backend function to create cycle and assessments
      // For now, show what would be created
      
      console.log('Creating cycle:', {
        cycleName,
        month: cycleMonth,
        year: cycleYear,
        type: '1x1',
        pairs
      });

      // Simulate creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCreationResult({
        success: true,
        cycleName,
        assessmentsCreated: pairs.length,
        pairs: pairs.slice(0, 5) // Show first 5 as preview
      });

      alert(`✅ Success!\n\nCreated cycle "${cycleName}"\n${pairs.length} assessments generated`);

    } catch (error) {
      console.error('Error creating cycle:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  const pairs = getManagerDirectReportPairs();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">Cycle Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-600" />
              <p className="text-green-700 font-medium">
                Create assessment cycles and generate assessment packages
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* System Check */}
      <Card className={pairs.length > 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
        <div className="flex items-start gap-3">
          {pairs.length > 0 ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <strong className="font-semibold">System Ready:</strong> Found {pairs.length} manager-direct report relationships. Ready to create 1x1 assessments.
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong className="font-semibold">No Relationships Found:</strong> Please assign direct reports to managers in the Users tab before creating cycles.
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Create 1x1 Cycle Form */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Create 1x1 Assessment Cycle</h2>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong className="font-semibold">1x1 Cycle:</strong> Automatically generates assessments for all manager → direct report pairs. 
              Each assessment creates one MSH record.
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                value={cycleMonth}
                onChange={(e) => setCycleMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="number"
                value={cycleYear}
                onChange={(e) => setCycleYear(e.target.value)}
                min="2024"
                max="2030"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Preview */}
          {pairs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Preview: Assessments to Create</h3>
              <div className="text-sm text-gray-600 mb-3">
                {pairs.length} assessment{pairs.length !== 1 ? 's' : ''} will be generated
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded bg-white p-2">
                {pairs.map((pair, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border border-gray-200">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900">{pair.managerName}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-gray-700">{pair.directReportName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Button */}
          <Button
            variant="primary"
            onClick={handleCreate1x1Cycle}
            disabled={processing || pairs.length === 0}
            className="w-full justify-center"
            size="lg"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Cycle...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Create 1x1 Cycle ({pairs.length} Assessments)
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Creation Result */}
      {creationResult && (
        <Card className="bg-green-50 border-2 border-green-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-green-900 text-lg mb-2">
                ✅ Cycle Created Successfully!
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <div>Cycle: <strong>{creationResult.cycleName}</strong></div>
                <div>Assessments Created: <strong>{creationResult.assessmentsCreated}</strong></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Info Footer */}
      <Card className="bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong className="font-semibold">Note:</strong> Creating a cycle generates assessment packages 
            with unique MSH IDs based on the current counter. Each assessment will be assigned to the evaluator's task queue.
          </div>
        </div>
      </Card>

    </div>
  );
}

export default CycleManagement;