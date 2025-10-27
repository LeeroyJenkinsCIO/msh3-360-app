import React, { useState } from 'react';
import { Users, ZoomIn, ZoomOut, TrendingUp, Award, Target } from 'lucide-react';

// Sample MSH KPI data (0-2 scale, composite 0-12)
const employeeKPIs = {
  "Robert Paddock": { composite: 12, nineBox: "High/High" },
  "Justin Ainsworth": { composite: 11, nineBox: "High/High" },
  "Avery Cloutier": { composite: 11, nineBox: "High/High" },
  "Jeremy Kolko": { composite: 11, nineBox: "High/High" },
  "David Bynum": { composite: 10, nineBox: "High/High" },
  "Paul Gill": { composite: 10, nineBox: "High/High" },
  "Ricky Martinez": { composite: 9, nineBox: "High/Mid" },
  "Chris Jones": { composite: 9, nineBox: "High/Mid" },
  "Jonathan Swisher": { composite: 9, nineBox: "High/Mid" },
  "Dan Bridgman": { composite: 8, nineBox: "High/Mid" },
  "Doug Carrol": { composite: 8, nineBox: "High/Mid" },
  "Juliana Guidi": { composite: 8, nineBox: "High/Mid" },
  "Kristen Mohrhoff": { composite: 8, nineBox: "High/Mid" },
  "Ron Mayfield": { composite: 8, nineBox: "High/Mid" },
  "Brandon Shelton": { composite: 7, nineBox: "Mid/Mid" },
  "Drew Ratliff": { composite: 7, nineBox: "Mid/Mid" },
  "Daniel Luger": { composite: 7, nineBox: "Mid/Mid" },
  "Stephen Ellington": { composite: 7, nineBox: "Mid/Mid" },
  "Jim Harrison": { composite: 6, nineBox: "Mid/Mid" },
  "Justin Dohrman": { composite: 6, nineBox: "Mid/Mid" },
  "Mike Reed": { composite: 6, nineBox: "Mid/Mid" },
  "Brendan Schuler": { composite: 6, nineBox: "Mid/Mid" },
  "Tony Newman": { composite: 5, nineBox: "Mid/Low" },
  "Shane Gillgan": { composite: 5, nineBox: "Mid/Low" },
  "Stephany Rojas": { composite: 5, nineBox: "Mid/Low" }
};

// Org structure for permission logic
const orgStructure = {
  "Robert Paddock": { role: "ISE", manages: ["Justin Ainsworth", "Avery Cloutier", "Jeremy Kolko", "David Bynum", "Paul Gill"] },
  "Justin Ainsworth": { role: "ISL", pillar: "Risk & Governance", manages: [] },
  "Avery Cloutier": { role: "ISL", pillar: "Data Services", manages: ["Ricky Martinez", "Jonathan Swisher", "Dan Bridgman", "Doug Carrol", "Juliana Guidi", "Kristen Mohrhoff", "Ron Mayfield"] },
  "Jeremy Kolko": { role: "ISL", pillar: "Systems Infrastructure", manages: ["Brandon Shelton", "Drew Ratliff", "Daniel Luger", "Stephen Ellington", "Jim Harrison", "Justin Dohrman", "Mike Reed"] },
  "David Bynum": { role: "ISL", pillar: "Service & Support", manages: ["Brendan Schuler", "Tony Newman", "Shane Gillgan"] },
  "Paul Gill": { role: "ISL", pillar: "PMO/CI", manages: ["Stephany Rojas"] },
  "Ricky Martinez": { role: "ISF_Supervisor", pillar: "Data Services", manages: ["Chris Jones"] },
  "Chris Jones": { role: "ISF", pillar: "Data Services", manages: [] },
  "Jonathan Swisher": { role: "ISF", pillar: "Data Services", manages: [] },
  "Dan Bridgman": { role: "ISF", pillar: "Data Services", manages: [] },
  "Doug Carrol": { role: "ISF", pillar: "Data Services", manages: [] },
  "Juliana Guidi": { role: "ISF", pillar: "Data Services", manages: [] },
  "Kristen Mohrhoff": { role: "ISF", pillar: "Data Services", manages: [] },
  "Ron Mayfield": { role: "ISF", pillar: "Data Services", manages: [] },
  "Brandon Shelton": { role: "ISF", pillar: "Systems Infrastructure", manages: [] },
  "Drew Ratliff": { role: "ISF", pillar: "Systems Infrastructure", manages: [] },
  "Daniel Luger": { role: "ISF", pillar: "Systems Infrastructure", manages: [] },
  "Stephen Ellington": { role: "ISF", pillar: "Systems Infrastructure", manages: [] },
  "Jim Harrison": { role: "ISF", pillar: "Systems Infrastructure", manages: [] },
  "Justin Dohrman": { role: "ISF", pillar: "Systems Infrastructure", manages: [] },
  "Mike Reed": { role: "ISF", pillar: "Systems Infrastructure", manages: [] },
  "Brendan Schuler": { role: "ISF", pillar: "Service & Support", manages: [] },
  "Tony Newman": { role: "ISF", pillar: "Service & Support", manages: [] },
  "Shane Gillgan": { role: "ISF", pillar: "Service & Support", manages: [] },
  "Stephany Rojas": { role: "ISF", pillar: "PMO/CI", manages: [] }
};

// Function to check if current user can see KPI for target employee
const canSeeKPI = (currentUser, targetEmployee) => {
  const currentUserData = orgStructure[currentUser];
  
  // ISE sees everyone
  if (currentUserData.role === "ISE") return true;
  
  // Can always see own KPI
  if (currentUser === targetEmployee) return true;
  
  // ISL sees everyone in their pillar
  if (currentUserData.role === "ISL") {
    const targetData = orgStructure[targetEmployee];
    return targetData.pillar === currentUserData.pillar;
  }
  
  // ISF Supervisor sees direct reports only
  if (currentUserData.role === "ISF_Supervisor") {
    return currentUserData.manages.includes(targetEmployee);
  }
  
  // Regular ISF sees only themselves
  return false;
};

const MiniCard = ({ name, title, kpi, status, isPending = false, canViewKPI = true }) => {
  const getCompositeColor = (score) => {
    if (score >= 10) return 'bg-green-500';
    if (score >= 7) return 'bg-blue-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getBorderStyle = (status) => {
    if (status === 'pending') return 'border-red-400 border-2 bg-red-50';
    if (status === 'change') return 'border-purple-400 border-2 bg-purple-50';
    if (status === 'prospecting') return 'border-blue-300 border-2 border-dashed bg-blue-50';
    return 'border-slate-300 bg-white';
  };

  if (isPending) {
    return (
      <div className={`rounded p-2 shadow-sm border ${getBorderStyle(status)} w-28 text-center`}>
        <div className="font-medium text-xs text-slate-600 truncate">{name}</div>
        <div className="text-[10px] text-slate-400 truncate">{title}</div>
        <div className="text-[9px] text-slate-400 mt-1">{status === 'pending' ? 'Pending' : 'Prospect'}</div>
      </div>
    );
  }

  return (
    <div className={`rounded p-2 shadow-sm border ${getBorderStyle(status)} w-28 hover:shadow-md transition-shadow cursor-pointer`}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-slate-800 truncate leading-tight">{name}</div>
          <div className="text-[10px] text-slate-600 truncate">{title}</div>
        </div>
        {kpi && canViewKPI && (
          <div className={`${getCompositeColor(kpi.composite)} text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] flex-shrink-0`}>
            {kpi.composite}
          </div>
        )}
        {kpi && !canViewKPI && (
          <div className="bg-slate-200 text-slate-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
            -
          </div>
        )}
      </div>
      {kpi && canViewKPI && (
        <div className="text-[9px] text-slate-500 mt-1 text-center">
          {kpi.nineBox}
        </div>
      )}
      {kpi && !canViewKPI && (
        <div className="text-[9px] text-slate-400 mt-1 text-center">
          Hidden
        </div>
      )}
    </div>
  );
};

function ISOSOrgPage() {
  const [zoom, setZoom] = useState(100);
  const [currentUser, setCurrentUser] = useState("Robert Paddock");

  // Calculate org-wide stats
  const totalActive = Object.values(employeeKPIs).length;
  const avgComposite = (Object.values(employeeKPIs).reduce((sum, emp) => sum + emp.composite, 0) / totalActive).toFixed(1);
  const highPerformers = Object.values(employeeKPIs).filter(emp => emp.composite >= 10).length;
  const highMidPerformers = Object.values(employeeKPIs).filter(emp => emp.composite >= 7 && emp.composite < 10).length;
  const midPerformers = Object.values(employeeKPIs).filter(emp => emp.composite >= 5 && emp.composite < 7).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 overflow-auto">
      {/* POC Role Selector */}
      <div className="mb-2 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-2 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-yellow-800">POC Demo - View As:</span>
          <select 
            value={currentUser} 
            onChange={(e) => setCurrentUser(e.target.value)}
            className="text-xs border border-yellow-400 rounded px-2 py-1 bg-white"
          >
            <option value="Robert Paddock">Robert Paddock (ISE - Sees All)</option>
            <option value="Avery Cloutier">Avery Cloutier (ISL - Data Services)</option>
            <option value="Jeremy Kolko">Jeremy Kolko (ISL - Systems Infrastructure)</option>
            <option value="Ricky Martinez">Ricky Martinez (ISF Supervisor)</option>
            <option value="Chris Jones">Chris Jones (ISF Individual)</option>
          </select>
        </div>
      </div>

      {/* Top KPI Stat Boxes */}
      <div className="mb-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <h3 className="font-bold text-sm">ISGS - Org Health</h3>
            </div>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-bold">{avgComposite}</div>
              <div className="text-xs opacity-90 mb-1">Avg Composite</div>
            </div>
            <div className="mt-2 text-xs opacity-90">
              {totalActive} Active • 3 Pending • 2 Prospecting
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5" />
              <h3 className="font-bold text-sm">ISL - Leadership</h3>
            </div>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-bold">10.6</div>
              <div className="text-xs opacity-90 mb-1">Avg Score</div>
            </div>
            <div className="mt-2 text-xs opacity-90">
              5 Leaders • 100% High Performers
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-bold text-sm">Pillars - Performance</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div>
                <div className="font-bold text-lg">{highPerformers}</div>
                <div className="opacity-90">High (10+)</div>
              </div>
              <div>
                <div className="font-bold text-lg">{highMidPerformers}</div>
                <div className="opacity-90">High/Mid</div>
              </div>
              <div>
                <div className="font-bold text-lg">{midPerformers}</div>
                <div className="opacity-90">Mid</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-4 bg-white rounded-lg shadow-md p-3 flex items-center justify-between max-w-7xl mx-auto sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">ISOS Org</h1>
            <p className="text-xs text-slate-600">One Team • Updated: 09/14/2025</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(Math.max(70, zoom - 10))} className="p-1 hover:bg-slate-100 rounded">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(130, zoom + 10))} className="p-1 hover:bg-slate-100 rounded">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="ml-4 flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>10-12</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>7-9</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>5-6</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-200 rounded"></div>
              <span>Hidden</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }} className="transition-transform">
        <div className="max-w-7xl mx-auto">
          {/* Executive & Leadership Layer - Inline */}
          <div className="mb-6">
            <div className="flex justify-center items-center gap-6 mb-3">
              {/* ISE - Executive */}
              <div className="flex flex-col items-center">
                <div className="text-xs font-semibold text-slate-600 bg-slate-200 px-3 py-1 rounded-full mb-2">ISE</div>
                <MiniCard 
                  name="Robert Paddock" 
                  title="CIO" 
                  kpi={employeeKPIs["Robert Paddock"]} 
                  status="active"
                  canViewKPI={canSeeKPI(currentUser, "Robert Paddock")}
                />
              </div>

              {/* Vertical divider */}
              <div className="h-20 w-px bg-slate-400"></div>

              {/* ISL - Leadership */}
              <div className="flex flex-col items-center">
                <div className="text-xs font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded-full mb-2">ISL (5)</div>
                <div className="flex items-start gap-3">
                  <MiniCard 
                    name="Justin Ainsworth" 
                    title="IS Principal" 
                    kpi={employeeKPIs["Justin Ainsworth"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Justin Ainsworth")}
                  />
                  <MiniCard 
                    name="Avery Cloutier" 
                    title="Data Services" 
                    kpi={employeeKPIs["Avery Cloutier"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Avery Cloutier")}
                  />
                  <MiniCard 
                    name="Jeremy Kolko" 
                    title="Systems & Infra" 
                    kpi={employeeKPIs["Jeremy Kolko"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Jeremy Kolko")}
                  />
                  <MiniCard 
                    name="David Bynum" 
                    title="Service & Support" 
                    kpi={employeeKPIs["David Bynum"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "David Bynum")}
                  />
                  <MiniCard 
                    name="Paul Gill" 
                    title="PMO/CI" 
                    kpi={employeeKPIs["Paul Gill"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Paul Gill")}
                  />
                </div>
              </div>
            </div>

            {/* Connection line down to ISF */}
            <div className="flex justify-center">
              <div className="w-px h-8 bg-slate-400"></div>
            </div>
          </div>

          {/* Functional Layer - 2x3 Grid */}
          <div>
            <div className="flex justify-center mb-3">
              <div className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">ISF (19 Active)</div>
            </div>
            
            {/* Top Row - 2 Large Pillars */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Data Services */}
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-300">
                <div className="text-sm font-bold text-center mb-3 pb-2 border-b-2 border-slate-400">Data Services (11)</div>
                <div className="grid grid-cols-3 gap-3">
                  {/* BI & I */}
                  <div>
                    <div className="text-[10px] font-semibold text-blue-700 mb-2 text-center bg-blue-50 py-1 rounded">BI & I</div>
                    <div className="space-y-2 flex flex-col items-center">
                      <MiniCard 
                        name="Ricky Martinez" 
                        title="Supervisor DS" 
                        kpi={employeeKPIs["Ricky Martinez"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Ricky Martinez")}
                      />
                      <MiniCard 
                        name="Chris Jones" 
                        title="BA-PPA" 
                        kpi={employeeKPIs["Chris Jones"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Chris Jones")}
                      />
                      <MiniCard name="Pending DA" title="DA" status="pending" isPending={true} />
                    </div>
                  </div>

                  {/* DevOps */}
                  <div>
                    <div className="text-[10px] font-semibold text-blue-700 mb-2 text-center bg-blue-50 py-1 rounded">DevOps</div>
                    <div className="space-y-2 flex flex-col items-center">
                      <MiniCard 
                        name="Jonathan Swisher" 
                        title="Dev" 
                        kpi={employeeKPIs["Jonathan Swisher"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Jonathan Swisher")}
                      />
                      <MiniCard 
                        name="Dan Bridgman" 
                        title="Dev" 
                        kpi={employeeKPIs["Dan Bridgman"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Dan Bridgman")}
                      />
                      <MiniCard 
                        name="Doug Carrol" 
                        title="DE" 
                        kpi={employeeKPIs["Doug Carrol"]} 
                        status="change"
                        canViewKPI={canSeeKPI(currentUser, "Doug Carrol")}
                      />
                      <MiniCard name="Pending Lead DE" title="DE Lead" status="pending" isPending={true} />
                    </div>
                  </div>

                  {/* System Analysts */}
                  <div>
                    <div className="text-[10px] font-semibold text-blue-700 mb-2 text-center bg-blue-50 py-1 rounded">Sys Analysts</div>
                    <div className="space-y-2 flex flex-col items-center">
                      <MiniCard 
                        name="Juliana Guidi" 
                        title="SA" 
                        kpi={employeeKPIs["Juliana Guidi"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Juliana Guidi")}
                      />
                      <MiniCard 
                        name="Kristen Mohrhoff" 
                        title="SA" 
                        kpi={employeeKPIs["Kristen Mohrhoff"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Kristen Mohrhoff")}
                      />
                      <MiniCard 
                        name="Ron Mayfield" 
                        title="Dev/SA" 
                        kpi={employeeKPIs["Ron Mayfield"]} 
                        status="change"
                        canViewKPI={canSeeKPI(currentUser, "Ron Mayfield")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Systems Infrastructure */}
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-300">
                <div className="text-sm font-bold text-center mb-3 pb-2 border-b-2 border-slate-400">Systems Infrastructure (7)</div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Network */}
                  <div>
                    <div className="text-[10px] font-semibold text-green-700 mb-2 text-center bg-green-50 py-1 rounded">Network</div>
                    <div className="space-y-2 flex flex-col items-center">
                      <MiniCard 
                        name="Brandon Shelton" 
                        title="NE" 
                        kpi={employeeKPIs["Brandon Shelton"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Brandon Shelton")}
                      />
                      <MiniCard 
                        name="Drew Ratliff" 
                        title="NE" 
                        kpi={employeeKPIs["Drew Ratliff"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Drew Ratliff")}
                      />
                      <MiniCard 
                        name="Daniel Luger" 
                        title="NE" 
                        kpi={employeeKPIs["Daniel Luger"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Daniel Luger")}
                      />
                      <MiniCard 
                        name="Stephen Ellington" 
                        title="NE" 
                        kpi={employeeKPIs["Stephen Ellington"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Stephen Ellington")}
                      />
                    </div>
                  </div>

                  {/* Server */}
                  <div>
                    <div className="text-[10px] font-semibold text-green-700 mb-2 text-center bg-green-50 py-1 rounded">Server</div>
                    <div className="space-y-2 flex flex-col items-center">
                      <MiniCard 
                        name="Jim Harrison" 
                        title="SE" 
                        kpi={employeeKPIs["Jim Harrison"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Jim Harrison")}
                      />
                      <MiniCard 
                        name="Justin Dohrman" 
                        title="SE" 
                        kpi={employeeKPIs["Justin Dohrman"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Justin Dohrman")}
                      />
                      <MiniCard 
                        name="Mike Reed" 
                        title="SE" 
                        kpi={employeeKPIs["Mike Reed"]} 
                        status="active"
                        canViewKPI={canSeeKPI(currentUser, "Mike Reed")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row - 3 Smaller Pillars */}
            <div className="grid grid-cols-3 gap-4">
              {/* PMO/CI */}
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-300">
                <div className="text-sm font-bold text-center mb-3 pb-2 border-b-2 border-slate-400">PMO/CI (2)</div>
                <div className="space-y-2 flex flex-col items-center">
                  <MiniCard name="Pending Lead PM" title="Lead PM" status="pending" isPending={true} />
                  <MiniCard 
                    name="Stephany Rojas" 
                    title="PC" 
                    kpi={employeeKPIs["Stephany Rojas"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Stephany Rojas")}
                  />
                </div>
              </div>

              {/* Service & Support */}
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-300">
                <div className="text-sm font-bold text-center mb-3 pb-2 border-b-2 border-slate-400">Service & Support (4)</div>
                <div className="space-y-2 flex flex-col items-center">
                  <div className="text-[10px] font-semibold text-purple-700 mb-1 bg-purple-50 px-2 py-1 rounded">Service Desk</div>
                  <MiniCard 
                    name="Brendan Schuler" 
                    title="SD" 
                    kpi={employeeKPIs["Brendan Schuler"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Brendan Schuler")}
                  />
                  <MiniCard 
                    name="Tony Newman" 
                    title="SD" 
                    kpi={employeeKPIs["Tony Newman"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Tony Newman")}
                  />
                  <MiniCard 
                    name="Shane Gillgan" 
                    title="SD" 
                    kpi={employeeKPIs["Shane Gillgan"]} 
                    status="active"
                    canViewKPI={canSeeKPI(currentUser, "Shane Gillgan")}
                  />
                  <MiniCard name="TBD 2025/26" title="TBD" status="prospecting" isPending={true} />
                </div>
              </div>

              {/* Risk & Governance */}
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-300">
                <div className="text-sm font-bold text-center mb-3 pb-2 border-b-2 border-slate-400">Risk & Governance (1)</div>
                <div className="space-y-2 flex flex-col items-center">
                  <MiniCard name="TBD 2027" title="TBD" status="prospecting" isPending={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ISOSOrgPage;