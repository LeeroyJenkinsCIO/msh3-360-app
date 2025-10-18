// src/pages/admin/SubPillarCleanupTool.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getAllUsers, updateUser, findUsersWithInvalidSubPillars } from '../../utils/firebaseUsers';
import { getAllPillars } from '../../utils/firebaseConfig';

function SubPillarCleanupTool() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [invalidUsers, setInvalidUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [fixedCount, setFixedCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, pillarsData] = await Promise.all([
        getAllUsers(),
        getAllPillars()
      ]);
      setUsers(usersData);
      setPillars(pillarsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeData = async () => {
    try {
      setAnalyzing(true);
      const invalid = await findUsersWithInvalidSubPillars(users, pillars);
      setInvalidUsers(invalid);
    } catch (error) {
      console.error('Error analyzing data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const fixUser = async (userId, newSubPillar) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const userData = {
        displayName: user.displayName,
        email: user.email,
        layer: user.layer,
        pillar: user.pillar,
        subPillar: newSubPillar,
        pillarRole: user.pillarRole,
        isSupervisor: user.isSupervisor || user.flags?.isSupervisor || false,
        isAdmin: user.isAdmin || user.flags?.isAdmin || false
      };

      await updateUser(userId, userData);
      
      // Remove from invalid list
      setInvalidUsers(prev => prev.filter(u => u.userId !== userId));
      setFixedCount(prev => prev + 1);
      
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error fixing user:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const clearSubPillar = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const userData = {
        displayName: user.displayName,
        email: user.email,
        layer: user.layer,
        pillar: user.pillar,
        subPillar: null,
        pillarRole: user.pillarRole,
        isSupervisor: user.isSupervisor || user.flags?.isSupervisor || false,
        isAdmin: user.isAdmin || user.flags?.isAdmin || false
      };

      await updateUser(userId, userData);
      
      // Remove from invalid list
      setInvalidUsers(prev => prev.filter(u => u.userId !== userId));
      setFixedCount(prev => prev + 1);
      
      alert('Sub-pillar cleared successfully!');
    } catch (error) {
      console.error('Error clearing sub-pillar:', error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-8 h-8 text-orange-600" />
              <h1 className="text-3xl font-bold text-gray-900">Sub-Pillar Data Cleanup</h1>
            </div>
            <p className="text-gray-600">
              Identify and fix users with legacy sub-pillar values
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={analyzeData}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Analyze Data
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{users.length}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-orange-600">{invalidUsers.length}</div>
              <div className="text-sm text-gray-600">Users with Invalid Sub-Pillars</div>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-500" />
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600">{fixedCount}</div>
              <div className="text-sm text-gray-600">Fixed This Session</div>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border border-blue-200">
        <div className="space-y-3 text-sm text-blue-900">
          <div className="font-semibold text-lg">What This Tool Checks:</div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg">✓</span>
              <div>
                <strong>Invalid Sub-Pillar Values:</strong> Users who have sub-pillar values that don't exist in Firebase or don't belong to their selected pillar
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">✓</span>
              <div>
                <strong>Legacy Free-Text Values:</strong> Old sub-pillar values like "Cloud Infrastructure" instead of proper IDs like "cloud_infra"
              </div>
            </div>
          </div>
          
          <div className="border-t border-blue-300 pt-3 mt-3">
            <div className="font-semibold mb-2">What This Tool Does NOT Flag:</div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-lg">○</span>
                <div>Users with <strong>no pillar assigned</strong> (valid for ADMIN, HRP, ISE roles)</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">○</span>
                <div>Users with <strong>pillar but no sub-pillar</strong> (valid if pillar has no sub-pillar structure)</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">○</span>
                <div>Empty/null sub-pillar values (this is an acceptable state)</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-blue-300 pt-3 mt-3">
            <div className="font-semibold text-lg">How to use:</div>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Click "Analyze Data" to scan for invalid values</li>
              <li>Review the list of flagged users below</li>
              <li>For each user, select a valid sub-pillar from the dropdown or clear the field</li>
              <li>The fix is applied immediately</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Results */}
      {invalidUsers.length > 0 ? (
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Users with Invalid Sub-Pillars ({invalidUsers.length})
          </h2>
          
          <div className="space-y-4">
            {invalidUsers.map((user) => {
              let issueDescription = '';
              let issueBadgeColor = 'bg-red-100 text-red-800';
              let fixAction = null;
              
              if (user.issue === 'legacy_pillar_value') {
                issueDescription = `Has legacy pillar value "${user.pillar}" which should be null for ${user.layer} users`;
                issueBadgeColor = 'bg-orange-100 text-orange-800';
                fixAction = 'clear_pillar';
              } else if (user.issue === 'invalid_pillar') {
                issueDescription = 'Invalid pillar reference - pillar does not exist in Firebase';
                issueBadgeColor = 'bg-red-100 text-red-800';
                fixAction = 'clear_pillar';
              } else if (user.issue === 'pillar_has_no_subpillars') {
                issueDescription = 'Pillar has no sub-pillar structure, but user has a sub-pillar value';
                issueBadgeColor = 'bg-orange-100 text-orange-800';
                fixAction = 'clear_subpillar';
              } else if (user.issue === 'invalid_subpillar') {
                issueDescription = 'Sub-pillar value does not match any defined sub-pillars for this pillar';
                issueBadgeColor = 'bg-yellow-100 text-yellow-800';
                fixAction = 'fix_subpillar';
              }
              
              return (
                <div key={user.userId} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="font-semibold text-gray-900">{user.displayName}</div>
                        <span className={`text-xs px-2 py-1 rounded ${issueBadgeColor}`}>
                          {user.layer}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Pillar: <span className="font-medium">{user.pillarName}</span>
                      </div>
                      <div className="text-sm mt-2 p-2 bg-white rounded border border-yellow-300">
                        <div className="font-medium text-yellow-900 mb-1">Issue:</div>
                        <div className="text-yellow-800">{issueDescription}</div>
                      </div>
                      <div className="text-sm text-red-600 mt-2">
                        Current value: <span className="font-mono font-semibold bg-red-100 px-2 py-1 rounded">"{user.currentSubPillar}"</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {fixAction === 'clear_pillar' ? (
                        <button
                          onClick={() => {
                            // Clear both pillar and sub-pillar
                            const originalUser = users.find(u => u.id === user.userId);
                            if (!originalUser) return;
                            
                            const userData = {
                              displayName: originalUser.displayName,
                              email: originalUser.email,
                              layer: originalUser.layer,
                              pillar: null,
                              subPillar: null,
                              pillarRole: originalUser.pillarRole,
                              isSupervisor: originalUser.isSupervisor || originalUser.flags?.isSupervisor || false,
                              isAdmin: originalUser.isAdmin || originalUser.flags?.isAdmin || false
                            };
                            
                            updateUser(user.userId, userData).then(() => {
                              setInvalidUsers(prev => prev.filter(u => u.userId !== user.userId));
                              setFixedCount(prev => prev + 1);
                              alert('Pillar cleared successfully!');
                            }).catch(err => {
                              console.error('Error:', err);
                              alert(`Error: ${err.message}`);
                            });
                          }}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
                        >
                          Clear Pillar & Sub-Pillar
                        </button>
                      ) : fixAction === 'clear_subpillar' ? (
                        <button
                          onClick={() => clearSubPillar(user.userId)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                        >
                          Clear Sub-Pillar
                        </button>
                      ) : user.validSubPillars.length > 0 ? (
                        <>
                          <select
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                fixUser(user.userId, e.target.value);
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="">Select valid sub-pillar...</option>
                            {user.validSubPillars.map(sp => (
                              <option key={sp} value={sp}>
                                {sp}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => clearSubPillar(user.userId)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                          >
                            Clear
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => clearSubPillar(user.userId)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                        >
                          Clear Sub-Pillar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        invalidUsers.length === 0 && !analyzing && (
          <Card>
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-600">
                {analyzing ? 'Analyzing...' : 'No users found with invalid sub-pillar values.'}
              </p>
            </div>
          </Card>
        )
      )}
    </div>
  );
}

export default SubPillarCleanupTool;