import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Activity, Award, Target, Users, TrendingUp, Calendar, 
  Brain, Shield, BarChart3, UserCheck, Settings, ArrowRight,
  AlertCircle, CheckCircle, Clock, Zap, X, User
} from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

// Mock data for quick stats - replace with real data later
const quickStats = {
  overallHealth: 8.2,
  totalTeamMembers: 47,
  completedAssessments: 42,
  pending1x1s: 5,
  averageCulture: 7.8,
  averageCompetencies: 8.0,
  averageExecution: 8.5
};

// Recent activity mock data
const recentActivity = [
  { id: 1, type: 'assessment', message: 'Sarah Chen completed 360 assessment', time: '2 hours ago', icon: CheckCircle, color: 'success' },
  { id: 2, type: 'alert', message: '5 team members need Q4 1x1 scheduling', time: '5 hours ago', icon: AlertCircle, color: 'warning' },
  { id: 3, type: 'update', message: 'SME certifications updated for Data Analytics team', time: '1 day ago', icon: Brain, color: 'info' },
  { id: 4, type: 'complete', message: 'Leadership team pillar assessments completed', time: '2 days ago', icon: CheckCircle, color: 'success' }
];

// Hub navigation modules
const hubModules = [
  {
    id: 'org-overview',
    title: 'Organization Overview',
    description: 'High-level health snapshot and key metrics across the entire IS organization',
    icon: BarChart3,
    theme: 'blue',
    route: '/is-os/overview',
    roles: ['Admin', 'ISL']
  },
  {
    id: '360-assessments',
    title: '360 Assessments',
    description: 'Launch, track, and analyze comprehensive 360-degree performance assessments',
    icon: Users,
    theme: 'indigo',
    route: '/is-os/360',
    roles: ['Admin', 'ISL', 'ISE', 'ISF']
  },
  {
    id: '1x1-hub',
    title: '1x1 Hub',
    description: 'Schedule, track, and document one-on-one meetings with team members',
    icon: Calendar,
    theme: 'purple',
    route: '/is-os/1x1',
    roles: ['Admin', 'ISL', 'ISE', 'ISF']
  },
  {
    id: 'sme-health',
    title: 'SME Health',
    description: 'Subject matter expert capabilities, certifications, and knowledge distribution',
    icon: Brain,
    theme: 'cyan',
    route: '/is-os/sme',
    roles: ['Admin', 'ISL']
  },
  {
    id: 'leaders-health',
    title: 'Leaders Health',
    description: 'Leadership team performance, capacity, and development tracking',
    icon: UserCheck,
    theme: 'amber',
    route: '/is-os/leaders',
    roles: ['Admin']
  },
  {
    id: 'pillar-culture',
    title: 'Culture Health',
    description: 'Deep dive into Mindset, Social, and Habits across teams',
    icon: Activity,
    theme: 'teal',
    route: '/is-os/pillars/culture',
    roles: ['Admin', 'ISL']
  },
  {
    id: 'pillar-competencies',
    title: 'Competencies Health',
    description: 'Skills assessment, gaps analysis, and development planning',
    icon: Award,
    theme: 'orange',
    route: '/is-os/pillars/competencies',
    roles: ['Admin', 'ISL']
  },
  {
    id: 'pillar-execution',
    title: 'Execution Health',
    description: 'Delivery metrics, results tracking, and performance outcomes',
    icon: Target,
    theme: 'green',
    route: '/is-os/pillars/execution',
    roles: ['Admin', 'ISL']
  },
  {
    id: 'is-health',
    title: 'IS Health Dashboard',
    description: 'Comprehensive organizational health metrics and trend analysis',
    icon: TrendingUp,
    theme: 'emerald',
    route: '/is-os/health',
    roles: ['Admin', 'ISL']
  },
  {
    id: 'team-hr',
    title: 'Team & HR Management',
    description: 'Team structure, roles, personnel records, and HR integration',
    icon: Shield,
    theme: 'rose',
    route: '/is-os/team-hr',
    roles: ['Admin']
  },
  {
    id: 'permissions',
    title: 'Admin & Permissions',
    description: 'User access control, role management, and system configuration',
    icon: Settings,
    theme: 'gray',
    route: '/is-os/admin',
    roles: ['Admin']
  }
];

// Theme color mapping
const themeColors = {
  blue: { bg: 'bg-msh-blue', hover: 'hover:bg-blue-700', text: 'text-msh-blue', light: 'bg-blue-100', icon: 'text-blue-600' },
  indigo: { bg: 'bg-msh-indigo', hover: 'hover:bg-indigo-700', text: 'text-msh-indigo', light: 'bg-indigo-100', icon: 'text-indigo-600' },
  purple: { bg: 'bg-msh-purple', hover: 'hover:bg-purple-700', text: 'text-msh-purple', light: 'bg-purple-100', icon: 'text-purple-600' },
  teal: { bg: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', light: 'bg-teal-100', icon: 'text-teal-600' },
  orange: { bg: 'bg-orange-600', hover: 'hover:bg-orange-700', text: 'text-orange-600', light: 'bg-orange-100', icon: 'text-orange-600' },
  green: { bg: 'bg-green-600', hover: 'hover:bg-green-700', text: 'text-green-600', light: 'bg-green-100', icon: 'text-green-600' },
  cyan: { bg: 'bg-cyan-600', hover: 'hover:bg-cyan-700', text: 'text-cyan-600', light: 'bg-cyan-100', icon: 'text-cyan-600' },
  amber: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-600', light: 'bg-amber-100', icon: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', light: 'bg-emerald-100', icon: 'text-emerald-600' },
  rose: { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', light: 'bg-rose-100', icon: 'text-rose-600' },
  gray: { bg: 'bg-gray-600', hover: 'hover:bg-gray-700', text: 'text-gray-600', light: 'bg-gray-100', icon: 'text-gray-600' }
};

function ISOSHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show1x1Modal, setShow1x1Modal] = useState(false);
  const [isfTeamMembers, setIsfTeamMembers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Fetch ISF users from Firebase based on reporting structure
  useEffect(() => {
    const fetchISFUsers = async () => {
      try {
        setLoadingUsers(true);
        
        // Determine which users to show based on role
        let teamMemberIds = [];
        
        if (user.role === 'ISL' || user.role === 'ISE') {
          // ISL/ISE: Find their pillar and get team member IDs
          const pillarsRef = collection(db, 'pillars');
          const pillarQuery = query(pillarsRef, where('pillarLeadId', '==', user.uid));
          const pillarSnapshot = await getDocs(pillarQuery);
          
          if (!pillarSnapshot.empty) {
            const pillarData = pillarSnapshot.docs[0].data();
            teamMemberIds = pillarData.teamMemberIds || [];
            console.log(`✅ ISL/ISE viewing their team. Pillar: ${pillarData.pillarName}, Team size: ${teamMemberIds.length}`);
          } else {
            console.log('⚠️ No pillar found for this ISL/ISE');
            setLoadingUsers(false);
            return;
          }
        } else if (user.role === 'Admin') {
          // Admin: Get all ISF users (no filtering by pillar)
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('role', '==', 'isf'));
          const querySnapshot = await getDocs(q);
          
          const users = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.displayName || 'Unknown User',
              role: data.role?.toUpperCase() || 'ISF',
              team: data.pillar || 'Unassigned',
              email: data.email || '',
              lastAssessment: data.lastAssessment || null
            };
          });
          
          console.log('✅ Admin viewing all ISF users:', users.length);
          setIsfTeamMembers(users);
          setLoadingUsers(false);
          return;
        }
        
        // For ISL/ISE: Fetch user details for team members
        if (teamMemberIds.length === 0) {
          console.log('⚠️ No team members found');
          setIsfTeamMembers([]);
          setLoadingUsers(false);
          return;
        }
        
        const usersRef = collection(db, 'users');
        const users = [];
        
        // Fetch each team member's details
        for (const memberId of teamMemberIds) {
          const userDoc = await getDocs(query(usersRef, where('uid', '==', memberId)));
          if (!userDoc.empty) {
            const data = userDoc.docs[0].data();
            users.push({
              id: userDoc.docs[0].id,
              name: data.displayName || 'Unknown User',
              role: data.role?.toUpperCase() || 'ISF',
              team: data.pillar || 'Unassigned',
              email: data.email || '',
              lastAssessment: data.lastAssessment || null
            });
          }
        }
        
        console.log('✅ Fetched team members:', users);
        setIsfTeamMembers(users);
      } catch (error) {
        console.error('❌ Error fetching ISF users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchISFUsers();
  }, [user.role, user.uid]);
  
  // Filter modules based on user role
  const accessibleModules = hubModules.filter(module => 
    module.roles.includes(user.role)
  );

  const handleModuleClick = (route) => {
    navigate(route);
  };

  const handleStart1x1 = () => {
    setShow1x1Modal(true);
  };

  const handleSelectTeamMember = (member) => {
    setShow1x1Modal(false);
    navigate(`/is-os/assessments/1x1/new?assessee=${member.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-msh-blue via-msh-indigo to-msh-purple text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-10 h-10" />
                <h1 className="text-5xl font-bold">IS OS Hub</h1>
              </div>
              <p className="text-blue-100 text-xl max-w-2xl">
                Your command center for organizational health, performance assessment, and team development.
              </p>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-6xl font-bold mb-1">{quickStats.overallHealth}</div>
              <div className="text-blue-200 text-lg">Overall Health Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Quick Stats Using StatCard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <StatCard
            label="Team Members"
            value={quickStats.totalTeamMembers}
            color="blue"
            icon={Users}
          />
          <StatCard
            label="Completed 360s"
            value={quickStats.completedAssessments}
            color="green"
            icon={CheckCircle}
          />
          <StatCard
            label="Pending 1x1s"
            value={quickStats.pending1x1s}
            color="orange"
            icon={AlertCircle}
          />
          <StatCard
            label="Culture"
            value={quickStats.averageCulture}
            color="teal"
            icon={Activity}
          />
          <StatCard
            label="Competencies"
            value={quickStats.averageCompetencies}
            color="orange"
            icon={Award}
          />
          <StatCard
            label="Execution"
            value={quickStats.averageExecution}
            color="green"
            icon={Target}
          />
          <StatCard
            label="Participation"
            value="94%"
            color="blue"
            icon={TrendingUp}
          />
        </div>

        {/* Module Grid Using Card Component */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Navigate IS OS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleModules.map((module) => {
              const IconComponent = module.icon;
              const colors = themeColors[module.theme];
              
              return (
                <Card
                  key={module.id}
                  className="cursor-pointer group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-gray-200"
                  onClick={() => handleModuleClick(module.route)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${colors.light} p-3 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  
                  <h3 className={`text-lg font-semibold text-gray-900 mb-2 group-hover:${colors.text} transition-colors`}>
                    {module.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    {module.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {module.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Activity Using Card */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const IconComponent = activity.icon;
                const iconColor = {
                  success: 'text-green-600',
                  warning: 'text-orange-600',
                  info: 'text-blue-600',
                  error: 'text-red-600'
                }[activity.color];
                
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={iconColor}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">
                        {activity.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Actions Using Card and Button Components */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
            
            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full justify-between group bg-msh-blue hover:bg-blue-700"
                onClick={() => alert('360 Assessment coming soon!')}
              >
                <span>Start 360 Assessment</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="primary" 
                className="w-full justify-between group bg-msh-purple hover:bg-purple-700"
                onClick={handleStart1x1}
              >
                <span>Start 1x1 Assessment</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="primary" 
                className="w-full justify-between group bg-teal-600 hover:bg-teal-700"
                onClick={() => navigate('/is-os/health')}
              >
                <span>View Team Health</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full justify-between group"
                onClick={() => alert('Export feature coming soon!')}
              >
                <span>Export Reports</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Status Indicators */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">System Status</span>
                  <Badge variant="success" className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Sync</span>
                  <span className="text-gray-900 font-medium">2 min ago</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active Users</span>
                  <Badge variant="info">23 online</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Team Member Selection Modal - With Firebase Data */}
      {show1x1Modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Start 1x1 Assessment</h2>
                <p className="text-purple-100">Select an ISF team member to assess</p>
              </div>
              <button 
                onClick={() => setShow1x1Modal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading team members...</p>
                </div>
              ) : isfTeamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No ISF team members found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {isfTeamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectTeamMember(member)}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 group-hover:bg-purple-200 p-3 rounded-lg transition-colors">
                            <User className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{member.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{member.role}</Badge>
                              <span className="text-sm text-gray-500">• {member.team}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {member.lastAssessment ? (
                            <>
                              <div className="text-xs text-gray-500 mb-1">Last Assessment</div>
                              <div className="text-sm font-medium text-gray-700">
                                {new Date(member.lastAssessment).toLocaleDateString()}
                              </div>
                            </>
                          ) : (
                            <Badge variant="warning">No Assessment</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <Button 
                variant="secondary" 
                onClick={() => setShow1x1Modal(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ISOSHub;