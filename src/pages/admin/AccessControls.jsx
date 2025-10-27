// src/pages/admin/AccessControls.jsx
import React, { useState, useEffect } from 'react';
import { Lock, AlertTriangle, CheckCircle, XCircle, RefreshCw, Shield, Key, Users, Database, Download, Mail, UserX, UserCheck, Wrench } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { getAllUsers, fixMissingUserIds } from '../../utils/firebaseUsers';

function AccessControls() {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  
  // Toast notifications
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    runValidation();
  }, []);

  const runValidation = async () => {
    try {
      setValidating(true);
      
      // Get MSH³ app users from Firestore
      const appUsers = await getAllUsers();
      setAllUsers(appUsers); // Store all users
      
      // Analyze the data
      const results = analyzeUsers(appUsers);
      setValidationResults(results);
      
      showToast('Validation complete', 'success');
      
    } catch (error) {
      console.error('Error running validation:', error);
      showToast(`Validation error: ${error.message}`, 'error');
      
      // Set empty results on error
      setValidationResults({
        total: 0,
        valid: 0,
        withMissingData: [],
        withFlags: [],
        emailDomainIssues: [],
        lastValidated: new Date().toISOString(),
        error: error.message
      });
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  const handleFixMissingUserIds = async () => {
    try {
      setFixing(true);
      
      const fixedCount = await fixMissingUserIds();
      
      if (fixedCount > 0) {
        showToast(
          `Successfully fixed ${fixedCount} user(s) with missing userId`,
          'success',
          {
            details: [`Auto-generated userId from email address`],
            duration: 5000
          }
        );
        
        // Revalidate to show updated results
        await runValidation();
      } else {
        showToast('No users need userId fixes', 'info');
      }
      
    } catch (error) {
      console.error('Error fixing userIds:', error);
      showToast(`Failed to fix userIds: ${error.message}`, 'error');
    } finally {
      setFixing(false);
    }
  };

  const analyzeUsers = (appUsers) => {
    // Safety check for undefined or invalid data
    if (!appUsers || !Array.isArray(appUsers)) {
      console.warn('analyzeUsers received invalid data:', appUsers);
      return {
        total: 0,
        valid: 0,
        withMissingData: [],
        withFlags: [],
        emailDomainIssues: [],
        lastValidated: new Date().toISOString()
      };
    }

    const validUsers = [];
    const usersWithMissingData = [];
    const usersWithFlags = [];
    const emailDomainIssues = [];

    appUsers.forEach(user => {
      // Skip if user is null or undefined
      if (!user) return;

      // Check for missing critical data
      const missingFields = [];
      if (!user.email) missingFields.push('email');
      if (!user.displayName) missingFields.push('displayName');
      if (!user.layer) missingFields.push('layer');
      if (!user.userId) missingFields.push('userId');
      
      if (missingFields.length > 0) {
        usersWithMissingData.push({
          ...user,
          missingFields
        });
      }

      // Check email domain (only if email exists)
      if (user.email && typeof user.email === 'string') {
        if (!user.email.toLowerCase().endsWith('@sierranevada.com')) {
          const emailParts = user.email.split('@');
          emailDomainIssues.push({
            ...user,
            emailDomain: emailParts.length > 1 ? emailParts[1] : 'unknown'
          });
        }
      }

      // Check for permission flags
      const flags = [];
      if (user.flags?.isAdmin || user.isAdmin) flags.push('Admin');
      if (user.flags?.isSupervisor || user.isSupervisor) flags.push('Supervisor');
      if (user.flags?.isExecutive) flags.push('Executive');
      if (user.flags?.isPillarLeader) flags.push('Pillar Leader');
      if (user.flags?.isHRP) flags.push('HRP');
      
      if (flags.length > 0) {
        usersWithFlags.push({
          ...user,
          permissions: flags
        });
      }

      // Valid users have all required fields
      if (missingFields.length === 0) {
        validUsers.push(user);
      }
    });

    return {
      total: appUsers.length,
      valid: validUsers.length,
      withMissingData: usersWithMissingData,
      withFlags: usersWithFlags,
      emailDomainIssues: emailDomainIssues,
      lastValidated: new Date().toISOString()
    };
  };

  const exportAuditReport = () => {
    if (!validationResults) {
      showToast('No validation results to export', 'error');
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const report = {
        reportDate: new Date().toISOString(),
        summary: {
          totalUsers: validationResults.total,
          validUsers: validationResults.valid,
          usersWithMissingData: validationResults.withMissingData.length,
          usersWithFlags: validationResults.withFlags.length,
          emailDomainIssues: validationResults.emailDomainIssues.length
        },
        usersWithMissingData: validationResults.withMissingData,
        usersWithFlags: validationResults.withFlags,
        emailDomainIssues: validationResults.emailDomainIssues,
        allUsers: allUsers
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `msh-user-audit-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Audit report exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Failed to export report', 'error');
    }
  };

  const getLayerBadgeColor = (layer) => {
    switch (layer) {
      case 'ISE':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'ISL':
        return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case 'ISF':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'HRP':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating access controls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header Card */}
      <Card className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Access Controls</h1>
            </div>
            <p className="text-gray-600">
              Validate Firebase Authentication and user permissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={handleFixMissingUserIds}
              disabled={fixing || validating}
            >
              <Wrench className={`w-4 h-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
              {fixing ? 'Fixing...' : 'Fix UserIds'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={exportAuditReport}
              disabled={!validationResults}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={runValidation}
              disabled={validating}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${validating ? 'animate-spin' : ''}`} />
              {validating ? 'Validating...' : 'Revalidate'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Validation Summary */}
      {validationResults && (
        <>
          {/* Error State */}
          {validationResults.error && (
            <Card className="bg-red-50 border border-red-200">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900 mb-1">Validation Error</div>
                  <div className="text-sm text-red-700">{validationResults.error}</div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600">{validationResults.valid}</div>
                  <div className="text-sm text-gray-600">Valid Users</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {validationResults.total > 0 
                      ? `${((validationResults.valid / validationResults.total) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </Card>

            <Card className="bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-yellow-600">
                    {validationResults.withMissingData?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Missing Data</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Incomplete profiles
                  </div>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
              </div>
            </Card>

            <Card className="bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600">
                    {validationResults.withFlags?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Special Permissions</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Admin & supervisor roles
                  </div>
                </div>
                <Shield className="w-10 h-10 text-blue-500" />
              </div>
            </Card>

            <Card className="bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-orange-600">
                    {validationResults.emailDomainIssues?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Email Domain Issues</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Non-standard domains
                  </div>
                </div>
                <Mail className="w-10 h-10 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Firebase Auth Sync - Coming Soon */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Firebase Authentication Sync</h3>
                  <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>
                    Full Firebase Authentication sync requires Admin SDK and cannot run client-side. 
                    This feature will show:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><UserCheck className="w-4 h-4 inline mr-1 text-green-600" />Firebase Auth users WITH MSH³ profiles (matched)</li>
                    <li><UserX className="w-4 h-4 inline mr-1 text-orange-600" />Firebase Auth users WITHOUT MSH³ profiles (orphaned)</li>
                    <li><AlertTriangle className="w-4 h-4 inline mr-1 text-red-600" />MSH³ profiles WITHOUT Firebase Auth (broken)</li>
                  </ul>
                  <div className="mt-3 p-3 bg-white rounded border border-indigo-200">
                    <div className="text-xs font-semibold text-indigo-900 mb-1">Implementation Options:</div>
                    <div className="text-xs text-indigo-700 space-y-1">
                      <div>• <strong>Cloud Function:</strong> Server-side sync using Admin SDK (recommended)</div>
                      <div>• <strong>Manual Export:</strong> Download Firebase Auth users CSV and compare</div>
                      <div>• <strong>Email Verification:</strong> On-demand check if specific emails exist in Auth</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* All Users Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
              </div>
              <div className="text-sm text-gray-600">
                {allUsers.length} total users
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Pillar</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allUsers.map((user) => {
                    const hasIssues = !user.userId || !user.email || !user.displayName || !user.layer;
                    return (
                      <tr key={user.id} className={`hover:bg-gray-50 ${hasIssues ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{user.displayName || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">{user.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-mono text-gray-600">
                            {user.userId || <span className="text-red-600">Missing</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {user.layer ? (
                            <Badge className={getLayerBadgeColor(user.layer)}>
                              {user.layer}
                            </Badge>
                          ) : (
                            <span className="text-red-600 text-xs">No Role</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">{user.pillar || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasIssues ? (
                            <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                              Issues
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 border border-green-300">
                              Valid
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Email Domain Issues */}
          {validationResults.emailDomainIssues && validationResults.emailDomainIssues.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">Email Domain Issues</h2>
              </div>
              
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                <strong>Expected Domain:</strong> @sierranevada.com
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-orange-50 border-b border-orange-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validationResults.emailDomainIssues.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{user.displayName || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-300">
                            @{user.emailDomain}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getLayerBadgeColor(user.layer)}>
                            {user.layer || 'Unknown'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Users with Missing Data */}
          {validationResults.withMissingData && validationResults.withMissingData.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                <h2 className="text-xl font-semibold text-gray-900">Users with Missing Data</h2>
              </div>
              
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-yellow-800">
                    <strong>Auto-Fix Available:</strong> Click "Fix UserIds" button above to automatically generate missing userId fields from email addresses.
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFixMissingUserIds}
                    disabled={fixing}
                  >
                    <Wrench className={`w-4 h-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
                    Fix Now
                  </Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-yellow-50 border-b border-yellow-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Missing Fields</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validationResults.withMissingData.map((user) => {
                      const isCritical = user.missingFields.includes('email') || user.missingFields.includes('userId');
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{user.displayName || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600">{user.email || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getLayerBadgeColor(user.layer)}>
                              {user.layer || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {user.missingFields.map(field => (
                                <Badge 
                                  key={field} 
                                  className={
                                    field === 'email' || field === 'userId'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  }
                                >
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isCritical ? (
                              <Badge className="bg-red-100 text-red-800 border border-red-300">
                                Critical
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                                Warning
                              </Badge>
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

          {/* Users with Special Permissions */}
          {validationResults.withFlags && validationResults.withFlags.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Users with Special Permissions</h2>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>Note:</strong> These users have elevated permissions beyond their standard role assignment.
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-blue-50 border-b border-blue-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Permissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validationResults.withFlags.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{user.displayName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getLayerBadgeColor(user.layer)}>
                            {user.layer}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.permissions.map(perm => (
                              <Badge 
                                key={perm} 
                                className={
                                  perm === 'Admin' 
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                }
                              >
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* All Clear State */}
          {validationResults.withMissingData && 
           validationResults.emailDomainIssues &&
           validationResults.withMissingData.length === 0 && 
           validationResults.emailDomainIssues.length === 0 && (
            <Card className="bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <div className="font-semibold text-green-900 text-lg">All Users Valid</div>
                  <div className="text-sm text-green-700 mt-1">
                    All {validationResults.total} users have complete profiles with valid email domains.
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Validation Info */}
          <Card className="bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-semibold mb-1">Validation Details</div>
                <div className="text-xs space-y-1">
                  <div><strong>Last Validated:</strong> {new Date(validationResults.lastValidated).toLocaleString()}</div>
                  <div><strong>Data Source:</strong> Firestore 'users' collection</div>
                  <div><strong>Total Records:</strong> {validationResults.total}</div>
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    This validation checks MSH³ user records for data completeness and email domain compliance. 
                    Full Firebase Authentication sync requires Admin SDK and will be available in a future update.
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Authentication Tools */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => showToast('Password reset tool coming soon', 'info')}
                className="flex items-start gap-4 p-4 border border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Password Reset Tool</div>
                  <div className="text-sm text-gray-600">
                    Send password reset emails to users
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs mt-2">
                    Coming Soon
                  </Badge>
                </div>
              </button>

              <button
                onClick={() => showToast('Auth sync requires Cloud Function implementation', 'info')}
                className="flex items-start gap-4 p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Sync Auth Users</div>
                  <div className="text-sm text-gray-600">
                    Compare Firebase Auth with MSH³ user records
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs mt-2">
                    Requires Cloud Function
                  </Badge>
                </div>
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default AccessControls;