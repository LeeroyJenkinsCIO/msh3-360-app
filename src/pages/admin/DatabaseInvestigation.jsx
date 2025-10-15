// src/pages/admin/DatabaseInvestigation.jsx
import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function DatabaseInvestigation() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const runInvestigation = async () => {
    setRunning(true);
    setResults(null);

    try {
      const data = {
        assessments: {},
        users: {},
        pillars: {},
        issues: []
      };

      // ============================================
      // ASSESSMENTS
      // ============================================
      const assessmentsRef = collection(db, 'assessments');
      const assessmentsSnap = await getDocs(assessmentsRef);
      
      const alignmentStatusCounts = {};
      const pillarCounts = {};
      const subPillarCounts = {};
      const typeCounts = {};
      let missingAlignment = 0;
      let missingPillar = 0;
      let missingSubPillar = 0;
      
      const samples = [];
      
      assessmentsSnap.forEach(doc => {
        const d = doc.data();
        
        if (d.alignmentStatus) {
          alignmentStatusCounts[d.alignmentStatus] = (alignmentStatusCounts[d.alignmentStatus] || 0) + 1;
        } else {
          missingAlignment++;
        }
        
        if (d.assesseePillar) {
          pillarCounts[d.assesseePillar] = (pillarCounts[d.assesseePillar] || 0) + 1;
        } else {
          missingPillar++;
        }
        
        const sub = d.assesseeSubPillar || d.subPillar;
        if (sub) {
          subPillarCounts[sub] = (subPillarCounts[sub] || 0) + 1;
        } else {
          missingSubPillar++;
        }
        
        const type = d.type || d.assessmentType;
        if (type) {
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        }
        
        if (samples.length < 5) {
          samples.push({
            mshId: d.mshId,
            alignmentStatus: d.alignmentStatus || 'MISSING',
            pillar: d.assesseePillar || 'MISSING',
            subPillar: d.assesseeSubPillar || d.subPillar || 'MISSING',
            type: d.type || d.assessmentType || 'MISSING'
          });
        }
      });
      
      data.assessments = {
        total: assessmentsSnap.size,
        alignmentStatus: alignmentStatusCounts,
        pillars: pillarCounts,
        subPillars: subPillarCounts,
        types: typeCounts,
        missing: {
          alignmentStatus: missingAlignment,
          pillar: missingPillar,
          subPillar: missingSubPillar
        },
        samples
      };

      // ============================================
      // USERS
      // ============================================
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      const userPillarCounts = {};
      const userSubPillarCounts = {};
      let usersWithoutPillar = 0;
      let usersWithoutSubPillar = 0;
      
      const userSamples = [];
      
      usersSnap.forEach(doc => {
        const d = doc.data();
        
        if (d.pillar) {
          userPillarCounts[d.pillar] = (userPillarCounts[d.pillar] || 0) + 1;
        } else {
          usersWithoutPillar++;
        }
        
        if (d.subPillar) {
          userSubPillarCounts[d.subPillar] = (userSubPillarCounts[d.subPillar] || 0) + 1;
        } else {
          usersWithoutSubPillar++;
        }
        
        if (userSamples.length < 5) {
          userSamples.push({
            name: d.displayName || d.name,
            pillar: d.pillar || 'MISSING',
            subPillar: d.subPillar || 'MISSING',
            layer: d.layer || 'MISSING'
          });
        }
      });
      
      data.users = {
        total: usersSnap.size,
        pillars: userPillarCounts,
        subPillars: userSubPillarCounts,
        withoutPillar: usersWithoutPillar,
        withoutSubPillar: usersWithoutSubPillar,
        samples: userSamples
      };

      // ============================================
      // PILLARS COLLECTION
      // ============================================
      const pillarsRef = collection(db, 'pillars');
      const pillarsSnap = await getDocs(pillarsRef);
      
      const pillarStructure = [];
      pillarsSnap.forEach(doc => {
        const d = doc.data();
        pillarStructure.push({
          id: doc.id,
          name: d.name,
          displayName: d.displayName,
          subPillars: d.subPillars || []
        });
      });
      
      data.pillars = {
        total: pillarsSnap.size,
        structure: pillarStructure
      };

      // ============================================
      // IDENTIFY ISSUES
      // ============================================
      if (missingAlignment > 0) {
        data.issues.push({
          severity: 'error',
          message: `${missingAlignment} assessments missing alignmentStatus`,
          fix: 'Set default to "not-aligned" or run migration'
        });
      }
      
      if (alignmentStatusCounts['status-quo']) {
        data.issues.push({
          severity: 'error',
          message: `${alignmentStatusCounts['status-quo']} assessments have invalid "status-quo" value`,
          fix: 'Change to "not-aligned"'
        });
      }
      
      const hasUnderscoredPillars = Object.keys(pillarCounts).some(p => p?.includes('_'));
      if (hasUnderscoredPillars) {
        data.issues.push({
          severity: 'warning',
          message: 'Pillars use underscores (e.g., "service_support")',
          fix: 'Add display name mapping in UI'
        });
      }
      
      if (missingSubPillar > 0) {
        data.issues.push({
          severity: 'warning',
          message: `${missingSubPillar} assessments missing sub pillar`,
          fix: 'Populate from users collection'
        });
      }

      setResults(data);
      
    } catch (error) {
      console.error('Investigation error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <Card className="mb-6 bg-blue-50">
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Database Investigation</h2>
        </div>
        <p className="text-gray-600">Analyze data quality and identify issues in the database</p>
      </Card>

      <Card className="mb-6">
        <Button
          onClick={runInvestigation}
          disabled={running}
          variant="primary"
          className="w-full"
        >
          <Search className="w-5 h-5 mr-2" />
          {running ? 'Running Investigation...' : 'Run Investigation'}
        </Button>
      </Card>

      {results && (
        <div className="space-y-6">
          
          {results.issues.length > 0 && (
            <Card className="border-l-4 border-l-red-500">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ Issues Found</h2>
              <div className="space-y-3">
                {results.issues.map((issue, i) => (
                  <div key={i} className={`p-3 rounded ${issue.severity === 'error' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-5 h-5 mt-0.5 ${issue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{issue.message}</div>
                        <div className="text-sm text-gray-600 mt-1">Fix: {issue.fix}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Assessments ({results.assessments.total})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Alignment Status</h3>
                <div className="text-sm space-y-1">
                  {Object.entries(results.assessments.alignmentStatus).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>"{key}":</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-red-600">
                    <span>Missing:</span>
                    <span className="font-semibold">{results.assessments.missing.alignmentStatus}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Pillars</h3>
                <div className="text-sm space-y-1">
                  {Object.entries(results.assessments.pillars).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>"{key}":</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-red-600">
                    <span>Missing:</span>
                    <span className="font-semibold">{results.assessments.missing.pillar}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Sub Pillars</h3>
                <div className="text-sm space-y-1">
                  {Object.keys(results.assessments.subPillars).length > 0 ? (
                    Object.entries(results.assessments.subPillars).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span>"{key}":</span>
                        <span className="font-semibold">{val}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 italic">None found</div>
                  )}
                  <div className="flex justify-between text-red-600">
                    <span>Missing:</span>
                    <span className="font-semibold">{results.assessments.missing.subPillar}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Types</h3>
                <div className="text-sm space-y-1">
                  {Object.entries(results.assessments.types).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>"{key}":</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold text-gray-700 mb-3">Sample Assessments</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">MSH ID</th>
                      <th className="px-3 py-2 text-left">Alignment</th>
                      <th className="px-3 py-2 text-left">Pillar</th>
                      <th className="px-3 py-2 text-left">Sub Pillar</th>
                      <th className="px-3 py-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.assessments.samples.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{s.mshId}</td>
                        <td className="px-3 py-2">{s.alignmentStatus}</td>
                        <td className="px-3 py-2">{s.pillar}</td>
                        <td className="px-3 py-2">{s.subPillar}</td>
                        <td className="px-3 py-2">{s.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">👥 Users ({results.users.total})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Pillars</h3>
                <div className="text-sm space-y-1">
                  {Object.entries(results.users.pillars).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>"{key}":</span>
                      <span className="font-semibold">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-red-600">
                    <span>Without:</span>
                    <span className="font-semibold">{results.users.withoutPillar}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Sub Pillars</h3>
                <div className="text-sm space-y-1">
                  {Object.keys(results.users.subPillars).length > 0 ? (
                    Object.entries(results.users.subPillars).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span>"{key}":</span>
                        <span className="font-semibold">{val}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 italic">None found</div>
                  )}
                  <div className="flex justify-between text-red-600">
                    <span>Without:</span>
                    <span className="font-semibold">{results.users.withoutSubPillar}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold text-gray-700 mb-3">Sample Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Pillar</th>
                      <th className="px-3 py-2 text-left">Sub Pillar</th>
                      <th className="px-3 py-2 text-left">Layer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.users.samples.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2">{s.pillar}</td>
                        <td className="px-3 py-2">{s.subPillar}</td>
                        <td className="px-3 py-2">{s.layer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏛️ Pillars Collection ({results.pillars.total})</h2>
            
            <div className="space-y-4">
              {results.pillars.structure.map((pillar, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-gray-900">{pillar.name || pillar.id}</div>
                  <div className="text-sm text-gray-600 mt-1">Display: {pillar.displayName}</div>
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Sub Pillars ({pillar.subPillars.length}):</span>
                    {pillar.subPillars.length > 0 ? (
                      <div className="ml-4 mt-1">
                        {pillar.subPillars.map((sub, j) => (
                          <div key={j}>• {sub}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="ml-2 text-gray-500 italic">none</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      )}

    </div>
  );
}