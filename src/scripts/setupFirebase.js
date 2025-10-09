// src/scripts/setupFirebase.js - FINAL CORRECT VERSION
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ============================================
// THE 5 IS ORGANIZATIONAL PILLARS WITH SUB-PILLARS
// ============================================
const pillars = [
  {
    pillarId: 'pillar_riskgov',
    pillarName: 'Risk & Governance',
    pillarLeadId: 'justin_ainsworth',
    pillarLeadName: 'Justin Ainsworth',
    subPillars: [],
    teamMemberIds: []
  },
  {
    pillarId: 'pillar_dataservices',
    pillarName: 'Data Services',
    pillarLeadId: 'avery_cloutier',
    pillarLeadName: 'Avery Cloutier',
    subPillars: [
      {
        subPillarId: 'bi_insights',
        subPillarName: 'BI & I',
        supervisorId: 'ricky_martinez',
        supervisorName: 'Ricky Martinez',
        teamMemberIds: ['chris_jones']
      },
      {
        subPillarId: 'devops',
        subPillarName: 'DevOps',
        supervisorId: null,
        supervisorName: null,
        teamMemberIds: ['jonathan_swisher', 'dan_bridgman', 'doug_carrol']
      },
      {
        subPillarId: 'system_analysts',
        subPillarName: 'System Analysts',
        supervisorId: null,
        supervisorName: null,
        teamMemberIds: ['juliana_guidi', 'kristen_mohrhoff', 'ron_mayfield']
      }
    ],
    teamMemberIds: ['ricky_martinez', 'chris_jones', 'jonathan_swisher', 'dan_bridgman', 'doug_carrol', 'juliana_guidi', 'kristen_mohrhoff', 'ron_mayfield']
  },
  {
    pillarId: 'pillar_sysinfra',
    pillarName: 'Systems & Infrastructure',
    pillarLeadId: 'jeremy_kolko',
    pillarLeadName: 'Jeremy Kolko',
    subPillars: [
      {
        subPillarId: 'network',
        subPillarName: 'Network',
        supervisorId: null,
        supervisorName: null,
        teamMemberIds: ['brandon_shelton', 'drew_ratlif', 'daniel_luger', 'stephen_ellington']
      },
      {
        subPillarId: 'server',
        subPillarName: 'Server',
        supervisorId: null,
        supervisorName: null,
        teamMemberIds: ['jim_harrelson', 'justin_dohrman', 'mike_reed']
      }
    ],
    teamMemberIds: ['brandon_shelton', 'drew_ratlif', 'daniel_luger', 'stephen_ellington', 'jim_harrelson', 'justin_dohrman', 'mike_reed']
  },
  {
    pillarId: 'pillar_servicesupport',
    pillarName: 'Service & Support',
    pillarLeadId: 'david_bynum',
    pillarLeadName: 'David Bynum',
    subPillars: [
      {
        subPillarId: 'service_desk',
        subPillarName: 'Service Desk',
        supervisorId: null,
        supervisorName: null,
        teamMemberIds: ['brendan_schuler', 'tony_newman', 'shane_gilligan']
      }
    ],
    teamMemberIds: ['brendan_schuler', 'tony_newman', 'shane_gilligan']
  },
  {
    pillarId: 'pillar_pmoci',
    pillarName: 'PMO/CI',
    pillarLeadId: 'paul_gill',
    pillarLeadName: 'Paul Gill',
    subPillars: [],
    teamMemberIds: ['stephany_rojas']
  }
];

// ============================================
// USERS - Dev accounts + Real employees from org chart
// ============================================
const users = [
  // Dev Accounts (for quick login)
  { 
    uid: 'dev-admin', 
    employeeId: 'dev-admin',
    displayName: 'Dev Admin', 
    email: 'admin@sierranevada.com', 
    role: 'admin', 
    title: 'Admin',
    department: 'Administration', 
    pillar: null,
    subPillar: null,
    managerId: null,
    isDevAccount: true
  },
  { 
    uid: 'dev-supervisor', 
    employeeId: 'dev-supervisor',
    displayName: 'Dev Supervisor', 
    email: 'supervisor@sierranevada.com', 
    role: 'supervisor', 
    title: 'Supervisor',
    department: 'Administration', 
    pillar: null,
    subPillar: null,
    managerId: null,
    isDevAccount: true
  },
  { 
    uid: 'dev-ise', 
    employeeId: 'dev-ise',
    displayName: 'Dev ISE', 
    email: 'ise@sierranevada.com', 
    role: 'ise', 
    title: 'ISE',
    department: 'Information Services', 
    pillar: null,
    subPillar: null,
    managerId: null,
    isDevAccount: true
  },
  { 
    uid: 'dev-isl', 
    employeeId: 'dev-isl',
    displayName: 'Dev ISL', 
    email: 'isl@sierranevada.com', 
    role: 'isl', 
    title: 'ISL',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: null,
    managerId: 'dev-ise',
    isDevAccount: true
  },
  { 
    uid: 'dev-isf', 
    employeeId: 'dev-isf',
    displayName: 'Dev ISF', 
    email: 'isf@sierranevada.com', 
    role: 'isf', 
    title: 'ISF',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'DevOps',
    managerId: 'dev-isl',
    isDevAccount: true
  },
  { 
    uid: 'dev-projectlead', 
    employeeId: 'dev-projectlead',
    displayName: 'Dev Project Lead', 
    email: 'projectlead@sierranevada.com', 
    role: 'isf', 
    title: 'Project Lead',
    department: 'Information Services', 
    pillar: 'PMO/CI',
    subPillar: null,
    managerId: 'dev-isl',
    isDevAccount: true
  },
  
  // Real Employees
  // CIO (ISE - Executive Layer)
  { 
    uid: 'robert_paddock', 
    employeeId: 'robert_paddock',
    displayName: 'Robert Paddock', 
    email: 'robert.paddock@snb.com', 
    role: 'ise', 
    title: 'CIO',
    department: 'Information Services', 
    pillar: null,
    subPillar: null,
    managerId: null 
  },

  // ISL Leaders (Leadership Layer)
  { 
    uid: 'justin_ainsworth', 
    employeeId: 'justin_ainsworth',
    displayName: 'Justin Ainsworth', 
    email: 'justin.ainsworth@snb.com', 
    role: 'isl', 
    title: 'IS Principal - Systems Architect - Risk & Governance',
    department: 'Information Services', 
    pillar: 'Risk & Governance',
    subPillar: null,
    managerId: 'robert_paddock' 
  },
  { 
    uid: 'avery_cloutier', 
    employeeId: 'avery_cloutier',
    displayName: 'Avery Cloutier', 
    email: 'avery.cloutier@snb.com', 
    role: 'isl', 
    title: 'Data Services Lead',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: null,
    managerId: 'robert_paddock' 
  },
  { 
    uid: 'jeremy_kolko', 
    employeeId: 'jeremy_kolko',
    displayName: 'Jeremy Kolko', 
    email: 'jeremy.kolko@snb.com', 
    role: 'isl', 
    title: 'Systems & Infrastructure Lead',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: null,
    managerId: 'robert_paddock' 
  },
  { 
    uid: 'david_bynum', 
    employeeId: 'david_bynum',
    displayName: 'David Bynum', 
    email: 'david.bynum@snb.com', 
    role: 'isl', 
    title: 'Service & Support Lead',
    department: 'Information Services', 
    pillar: 'Service & Support',
    subPillar: null,
    managerId: 'robert_paddock' 
  },
  { 
    uid: 'paul_gill', 
    employeeId: 'paul_gill',
    displayName: 'Paul Gill', 
    email: 'paul.gill@snb.com', 
    role: 'isl', 
    title: 'PMO/CI Lead',
    department: 'Information Services', 
    pillar: 'PMO/CI',
    subPillar: null,
    managerId: 'robert_paddock' 
  },

  // Data Services Team
  // BI & I Sub-Pillar (with Supervisor)
  { 
    uid: 'ricky_martinez', 
    employeeId: 'ricky_martinez',
    displayName: 'Ricky Martinez', 
    email: 'ricky.martinez@snb.com', 
    role: 'isf', 
    title: 'Supervisor InTR',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'BI & I',
    managerId: 'avery_cloutier'
  },
  { 
    uid: 'chris_jones', 
    employeeId: 'chris_jones',
    displayName: 'Chris Jones', 
    email: 'chris.jones@snb.com', 
    role: 'isf', 
    title: 'BA-PPA',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'BI & I',
    managerId: 'ricky_martinez'
  },
  
  // DevOps Sub-Pillar (no supervisor)
  { 
    uid: 'jonathan_swisher', 
    employeeId: 'jonathan_swisher',
    displayName: 'Jonathan Swisher', 
    email: 'jonathan.swisher@snb.com', 
    role: 'isf', 
    title: 'Dev',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'DevOps',
    managerId: 'avery_cloutier'
  },
  { 
    uid: 'dan_bridgman', 
    employeeId: 'dan_bridgman',
    displayName: 'Dan Bridgman', 
    email: 'dan.bridgman@snb.com', 
    role: 'isf', 
    title: 'Dev',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'DevOps',
    managerId: 'avery_cloutier'
  },
  { 
    uid: 'doug_carrol', 
    employeeId: 'doug_carrol',
    displayName: 'Doug Carrol', 
    email: 'doug.carrol@snb.com', 
    role: 'isf', 
    title: 'DE',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'DevOps',
    managerId: 'avery_cloutier'
  },
  
  // System Analysts Sub-Pillar (no supervisor)
  { 
    uid: 'juliana_guidi', 
    employeeId: 'juliana_guidi',
    displayName: 'Juliana Guidi', 
    email: 'juliana.guidi@snb.com', 
    role: 'isf', 
    title: 'SA',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'System Analysts',
    managerId: 'avery_cloutier'
  },
  { 
    uid: 'kristen_mohrhoff', 
    employeeId: 'kristen_mohrhoff',
    displayName: 'Kristen Mohrhoff', 
    email: 'kristen.mohrhoff@snb.com', 
    role: 'isf', 
    title: 'SA',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'System Analysts',
    managerId: 'avery_cloutier'
  },
  { 
    uid: 'ron_mayfield', 
    employeeId: 'ron_mayfield',
    displayName: 'Ron Mayfield', 
    email: 'ron.mayfield@snb.com', 
    role: 'isf', 
    title: 'Dev/SA',
    department: 'Information Services', 
    pillar: 'Data Services',
    subPillar: 'System Analysts',
    managerId: 'avery_cloutier'
  },

  // Systems & Infrastructure Team
  // Network Sub-Pillar
  { 
    uid: 'brandon_shelton', 
    employeeId: 'brandon_shelton',
    displayName: 'Brandon Shelton', 
    email: 'brandon.shelton@snb.com', 
    role: 'isf', 
    title: 'Network',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: 'Network',
    managerId: 'jeremy_kolko'
  },
  { 
    uid: 'drew_ratlif', 
    employeeId: 'drew_ratlif',
    displayName: 'Drew Ratlif', 
    email: 'drew.ratlif@snb.com', 
    role: 'isf', 
    title: 'Network',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: 'Network',
    managerId: 'jeremy_kolko'
  },
  { 
    uid: 'daniel_luger', 
    employeeId: 'daniel_luger',
    displayName: 'Daniel Luger', 
    email: 'daniel.luger@snb.com', 
    role: 'isf', 
    title: 'Network',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: 'Network',
    managerId: 'jeremy_kolko'
  },
  { 
    uid: 'stephen_ellington', 
    employeeId: 'stephen_ellington',
    displayName: 'Stephen Ellington', 
    email: 'stephen.ellington@snb.com', 
    role: 'isf', 
    title: 'Network',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: 'Network',
    managerId: 'jeremy_kolko'
  },
  
  // Server Sub-Pillar
  { 
    uid: 'jim_harrelson', 
    employeeId: 'jim_harrelson',
    displayName: 'Jim Harrelson', 
    email: 'jim.harrelson@snb.com', 
    role: 'isf', 
    title: 'Server',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: 'Server',
    managerId: 'jeremy_kolko'
  },
  { 
    uid: 'justin_dohrman', 
    employeeId: 'justin_dohrman',
    displayName: 'Justin Dohrman', 
    email: 'justin.dohrman@snb.com', 
    role: 'isf', 
    title: 'Server',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: 'Server',
    managerId: 'jeremy_kolko'
  },
  { 
    uid: 'mike_reed', 
    employeeId: 'mike_reed',
    displayName: 'Mike Reed', 
    email: 'mike.reed@snb.com', 
    role: 'isf', 
    title: 'Server',
    department: 'Information Services', 
    pillar: 'Systems & Infrastructure',
    subPillar: 'Server',
    managerId: 'jeremy_kolko'
  },

  // Service & Support Team
  { 
    uid: 'brendan_schuler', 
    employeeId: 'brendan_schuler',
    displayName: 'Brendan Schuler', 
    email: 'brendan.schuler@snb.com', 
    role: 'isf', 
    title: 'SDS.2',
    department: 'Information Services', 
    pillar: 'Service & Support',
    subPillar: 'Service Desk',
    managerId: 'david_bynum'
  },
  { 
    uid: 'tony_newman', 
    employeeId: 'tony_newman',
    displayName: 'Tony Newman', 
    email: 'tony.newman@snb.com', 
    role: 'isf', 
    title: 'Service Desk',
    department: 'Information Services', 
    pillar: 'Service & Support',
    subPillar: 'Service Desk',
    managerId: 'david_bynum'
  },
  { 
    uid: 'shane_gilligan', 
    employeeId: 'shane_gilligan',
    displayName: 'Shane Gilligan', 
    email: 'shane.gilligan@snb.com', 
    role: 'isf', 
    title: 'Service Desk',
    department: 'Information Services', 
    pillar: 'Service & Support',
    subPillar: 'Service Desk',
    managerId: 'david_bynum'
  },

  // PMO/CI Team
  { 
    uid: 'stephany_rojas', 
    employeeId: 'stephany_rojas',
    displayName: 'Stephany Rojas', 
    email: 'stephany.rojas@snb.com', 
    role: 'isf', 
    title: 'PC',
    department: 'Information Services', 
    pillar: 'PMO/CI',
    subPillar: null,
    managerId: 'paul_gill'
  }
];

// ============================================
// COUNTERS
// ============================================
const counters = [
  { name: 'users', count: users.length },
  { name: 'pillars', count: pillars.length },
  { name: 'assessments', count: 0 }
];

// ============================================
// MAIN SETUP FUNCTION
// ============================================
async function setupFirebase() {
  try {
    console.log('🚀 Starting Firebase setup with CORRECT org structure...\n');

    // Create counters
    console.log('📊 Creating counters...');
    for (const counter of counters) {
      await db.collection('counters').doc(counter.name).set(counter);
      console.log(`  ✅ Counter: ${counter.name} = ${counter.count}`);
    }

    // Create users
    console.log('\n👥 Creating users...');
    for (const user of users) {
      await db.collection('users').doc(user.uid).set({
        ...user,
        createdAt: admin.firestore.Timestamp.now()
      });
      const reportingInfo = user.subPillar ? `${user.pillar} > ${user.subPillar}` : (user.pillar || 'Executive');
      console.log(`  ✅ ${user.displayName} (${user.role.toUpperCase()}) - ${reportingInfo}`);
    }

    // Create pillars
    console.log('\n🎯 Creating IS organizational pillars...');
    for (const pillar of pillars) {
      await db.collection('pillars').doc(pillar.pillarId).set({
        ...pillar,
        createdAt: admin.firestore.Timestamp.now()
      });
      const subPillarCount = pillar.subPillars.length;
      const subPillarInfo = subPillarCount > 0 ? ` (${subPillarCount} sub-pillars)` : '';
      console.log(`  ✅ ${pillar.pillarName}${subPillarInfo} - Lead: ${pillar.pillarLeadName}`);
      
      // Show sub-pillars
      pillar.subPillars.forEach(sub => {
        const supervisorInfo = sub.supervisorName ? ` - Supervisor: ${sub.supervisorName}` : '';
        console.log(`     └─ ${sub.subPillarName}${supervisorInfo}`);
      });
    }

    console.log('\n✅ Firebase setup complete!');
    console.log('\n📊 Summary:');
    console.log(`  • ${users.length} users (1 ISE, 5 ISL, ${users.length - 6} ISF)`);
    console.log(`  • ${pillars.length} organizational pillars`);
    console.log('  • Sub-pillars with supervisors tracked');
    console.log('\n🎯 Ready for authentication!');
    console.log('📝 Next: Run createAuthUsers.js');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the setup
setupFirebase();