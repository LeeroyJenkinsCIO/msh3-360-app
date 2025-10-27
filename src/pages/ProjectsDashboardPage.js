import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FolderKanban, TrendingUp, Users, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

const ProjectsDashboardPage = () => {
  const { user, permissions } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    loadProjectMetrics();
  }, []);

  const loadProjectMetrics = async () => {
    try {
      setLoading(true);

      // Load all published assessments from assessmentHistory
      const historyRef = collection(db, 'assessmentHistory');
      const historyQuery = query(historyRef, orderBy('publishedAt', 'desc'));
      const snapshot = await getDocs(historyQuery);

      let allAssessments = [];
      snapshot.forEach(doc => {
        allAssessments.push({ id: doc.id, ...doc.data() });
      });

      // Filter assessments based on user role
      const filteredAssessments = filterAssessmentsByRole(allAssessments);

      // Group assessments by project
      const projectMap = {};

      filteredAssessments.forEach(assessment => {
        const projectKey = assessment.projectName || assessment.mshDescription || 'Unknown Project';
        
        if (!projectMap[projectKey]) {
          projectMap[projectKey] = {
            name: projectKey,
            type: assessment.mshType || 'Project',
            assessments: [],
            totalCount: 0,
            alignedCount: 0,
            discrepanciesCount: 0,
            compositeScores: [],
            monthlyData: {}
          };
        }

        // Add to project
        projectMap[projectKey].assessments.push(assessment);
        projectMap[projectKey].totalCount++;

        // Count alignment status
        if (assessment.alignmentStatus === 'aligned') {
          projectMap[projectKey].alignedCount++;
        } else {
          projectMap[projectKey].discrepanciesCount++;
        }

        // Collect composite scores for averaging
        if (assessment.participants) {
          assessment.participants.forEach(p => {
            if (p.composite !== undefined) {
              projectMap[projectKey].compositeScores.push(p.composite);
            }
          });
        }

        // Group by month for trending
        const publishDate = new Date(assessment.publishedAt);
        const monthKey = `${publishDate.getFullYear()}-${String(publishDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!projectMap[projectKey].monthlyData[monthKey]) {
          projectMap[projectKey].monthlyData[monthKey] = {
            month: monthKey,
            count: 0,
            composites: []
          };
        }
        
        projectMap[projectKey].monthlyData[monthKey].count++;
        if (assessment.participants) {
          assessment.participants.forEach(p => {
            if (p.composite !== undefined) {
              projectMap[projectKey].monthlyData[monthKey].composites.push(p.composite);
            }
          });
        }
      });

      // Calculate averages and format data
      const projectsArray = Object.values(projectMap).map(project => {
        // Calculate average composite
        if (project.compositeScores.length > 0) {
          const sum = project.compositeScores.reduce((a, b) => a + b, 0);
          project.avgComposite = (sum / project.compositeScores.length).toFixed(2);
        } else {
          project.avgComposite = null;
        }

        // Calculate alignment percentage
        project.alignmentRate = project.totalCount > 0
          ? ((project.alignedCount / project.totalCount) * 100).toFixed(0)
          : 0;

        // Calculate monthly averages
        project.monthlyMetrics = Object.values(project.monthlyData).map(month => ({
          month: month.month,
          count: month.count,
          avgComposite: month.composites.length > 0
            ? (month.composites.reduce((a, b) => a + b, 0) / month.composites.length).toFixed(2)
            : null
        })).sort((a, b) => a.month.localeCompare(b.month));

        return project;
      });

      // Sort by total assessments descending
      projectsArray.sort((a, b) => b.totalCount - a.totalCount);

      setProjects(projectsArray);
      setLoading(false);
    } catch (error) {
      console.error('Error loading project metrics:', error);
      setLoading(false);
    }
  };

  // Filter assessments based on user role
  const filterAssessmentsByRole = (assessments) => {
    if (!user) return [];

    const userRole = user.role?.toLowerCase();

    // Admin and ISE: View ALL project assessments
    if (userRole === 'admin' || userRole === 'ise') {
      return assessments;
    }

    // ISL: View own pillar projects + participated projects
    if (userRole === 'isl') {
      return assessments.filter(assessment => {
        // Check if assessment is in user's pillar
        if (assessment.pillar === user.pillar) return true;
        
        // Check if user is a participant
        const isParticipant = assessment.participants?.some(
          p => p.email === user.email || p.uid === user.uid
        );
        return isParticipant;
      });
    }

    // ISF: View ONLY projects where they are a participant
    if (userRole === 'isf') {
      return assessments.filter(assessment => {
        return assessment.participants?.some(
          p => p.email === user.email || p.uid === user.uid
        );
      });
    }

    // Project Lead: View project assessments they published or project-type
    if (userRole === 'projectlead') {
      return assessments.filter(assessment => {
        if (assessment.publishedBy === user.uid) return true;
        if (assessment.mshType?.toLowerCase().includes('project')) return true;
        return false;
      });
    }

    // Default: No access
    return [];
  };

  const getCompositeColor = (score) => {
    if (!score) return 'text-gray-400';
    const num = parseFloat(score);
    if (num >= 0 && num <= 4) return 'text-red-600';
    if (num >= 5 && num <= 8) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCompositeDescription = (score) => {
    if (!score) return 'No Data';
    const num = parseFloat(score);
    if (num >= 0 && num <= 4) return 'Critical';
    if (num >= 5 && num <= 8) return 'Developing';
    return 'Strong';
  };

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleViewAssessment = (sessionId) => {
    // Navigate to comparison page with sessionId
    navigate('/comparison', { state: { sessionId } });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-center">
        <p className="text-gray-600">Loading project metrics...</p>
      </div>
    );
  }

  // If a project is selected, show detailed view
  if (selectedProject) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <button
          onClick={() => setSelectedProject(null)}
          className="mb-6 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
        >
          ← Back to All Projects
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedProject.name}</h1>
              <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-semibold">
                {selectedProject.type}
              </span>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">{selectedProject.avgComposite}/12</div>
              <div className="text-sm text-gray-600">Average Composite</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-semibold">Total Assessments</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{selectedProject.totalCount}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Alignment Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{selectedProject.alignmentRate}%</div>
              <div className="text-xs text-green-700 mt-1">
                {selectedProject.alignedCount} aligned, {selectedProject.discrepanciesCount} with discrepancies
              </div>
            </div>

            <div className={`bg-${getCompositeColor(selectedProject.avgComposite).includes('red') ? 'red' : getCompositeColor(selectedProject.avgComposite).includes('yellow') ? 'yellow' : 'green'}-50 rounded-lg p-4`}>
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-semibold">Performance</span>
              </div>
              <div className="text-2xl font-bold">{getCompositeDescription(selectedProject.avgComposite)}</div>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        {selectedProject.monthlyMetrics.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Monthly Trends
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Month</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Assessments</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Avg Composite</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedProject.monthlyMetrics.map(month => (
                    <tr key={month.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatMonthLabel(month.month)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">
                        {month.count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${getCompositeColor(month.avgComposite)}`}>
                          {month.avgComposite || '-'}/12
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className={`px-3 py-1 rounded-full font-medium ${
                          !month.avgComposite ? 'bg-gray-100 text-gray-700' :
                          parseFloat(month.avgComposite) >= 9 ? 'bg-green-100 text-green-800' :
                          parseFloat(month.avgComposite) >= 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getCompositeDescription(month.avgComposite)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Assessments */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Assessments</h2>
          <div className="space-y-3">
            {selectedProject.assessments.slice(0, 10).map(assessment => (
              <div key={assessment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-blue-700">{assessment.mshId}</div>
                    <div className="text-sm text-gray-600">
                      {assessment.participants?.map(p => p.name).join(' & ')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(assessment.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {assessment.alignmentStatus === 'aligned' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <button
                        onClick={() => handleViewAssessment(assessment.sessionId)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Projects Overview
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <FolderKanban className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Projects Dashboard</h1>
        </div>
        <p className="text-gray-600">
          Project-level performance metrics and trends
          {user?.role === 'isf' && ' (showing only projects you\'re assigned to)'}
          {user?.role === 'isl' && ' (showing your pillar projects)'}
          {(user?.role === 'admin' || user?.role === 'ise') && ' (showing all projects)'}
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Available</h3>
          <p className="text-gray-600">
            {user?.role === 'isf' 
              ? "You don't have any project assignments yet. Projects you're assigned to will appear here."
              : user?.role === 'isl'
              ? "No projects found for your pillar yet. Published project assessments will appear here."
              : "Published assessments with project assignments will appear here"
            }
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div
              key={project.name}
              onClick={() => setSelectedProject(project)}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6"
            >
              {/* Project Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                    {project.type}
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3">
                {/* Composite Score */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Avg Composite</span>
                  <span className={`text-2xl font-bold ${getCompositeColor(project.avgComposite)}`}>
                    {project.avgComposite || '-'}/12
                  </span>
                </div>

                {/* Assessment Count */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Assessments
                  </span>
                  <span className="text-lg font-semibold text-gray-900">{project.totalCount}</span>
                </div>

                {/* Alignment Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Aligned
                  </span>
                  <span className="text-lg font-semibold text-green-600">{project.alignmentRate}%</span>
                </div>

                {/* Performance Badge */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <span className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${
                    !project.avgComposite ? 'bg-gray-100 text-gray-700' :
                    parseFloat(project.avgComposite) >= 9 ? 'bg-green-100 text-green-800' :
                    parseFloat(project.avgComposite) >= 5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getCompositeDescription(project.avgComposite)} Performance
                  </span>
                </div>
              </div>

              {/* Click hint */}
              <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                <span className="text-xs text-blue-600 font-medium">Click to view details →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {projects.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-900">
              Total Projects: {projects.length}
            </span>
            <span className="text-sm text-blue-700">
              Total Assessments: {projects.reduce((sum, p) => sum + p.totalCount, 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsDashboardPage;