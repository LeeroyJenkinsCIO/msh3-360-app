// seedDatabase.js - MSH³ Production Seed Script (for firebase-seed folder)
const admin = require('firebase-admin');

// Initialize Firebase Admin - serviceAccountKey.json is in same folder
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

// ============================================
// USERS - 24 Active IS Members + 1 Admin
// ============================================

const users = [
  // ========== ADMIN USER ==========
  {
    userId: 'admin',
    displayName: 'Admin User',
    email: 'admin@sierranevada.com',
    title: 'System Administrator',
    layer: 'ADMIN',
    pillar: 'admin',
    pillarRole: 'admin',
    managerId: null,
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: true
    }
  },

  // ========== ISE Layer ==========
  {
    userId: 'robert_paddock',
    displayName: 'Robert Paddock',
    email: 'robert.paddock@sierranevada.com',
    title: 'CIO',
    layer: 'ISE',
    pillar: 'executive',
    pillarRole: 'leader',
    managerId: null,
    directReportIds: ['justin_ainsworth', 'avery_cloutier', 'jeremy_kolko', 'david_bynum', 'paul_gill'],
    status: 'active',
    flags: {
      isExecutive: true,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: true,
      isAdmin: false
    }
  },

  // ========== ISL Layer (Pillar Leaders) ==========
  
  // Risk & Governance
  {
    userId: 'justin_ainsworth',
    displayName: 'Justin Ainsworth',
    email: 'justin@sierranevada.com', // EXCEPTION: no .lastname
    title: 'IS Principal / Systems Architect',
    layer: 'ISL',
    pillar: 'risk_governance',
    pillarRole: 'leader',
    managerId: 'robert_paddock',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: true,
      isSupervisor: false,
      canInitiateAssessments: true,
      isAdmin: false
    }
  },

  // Data Services
  {
    userId: 'avery_cloutier',
    displayName: 'Avery Cloutier',
    email: 'avery.cloutier@sierranevada.com',
    title: 'Data Services Lead',
    layer: 'ISL',
    pillar: 'data_services',
    pillarRole: 'leader',
    managerId: 'robert_paddock',
    directReportIds: [
      'ricky_martinez',
      'jonathan_swisher',
      'dan_bridgman',
      'doug_carrol',
      'juliana_guidi',
      'kristen_mohnhoff',
      'ron_mayfield'
    ],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: true,
      isSupervisor: false,
      canInitiateAssessments: true,
      isAdmin: false
    }
  },

  // Systems & Infrastructure
  {
    userId: 'jeremy_kolko',
    displayName: 'Jeremy Kolko',
    email: 'jeremy.kolko@sierranevada.com',
    title: 'Systems & Infrastructure Lead',
    layer: 'ISL',
    pillar: 'infrastructure',
    pillarRole: 'leader',
    managerId: 'robert_paddock',
    directReportIds: [
      'brandon_shelton',
      'drew_ratliff',
      'daniel_luger',
      'stephen_ellington',
      'jim_harrelson',
      'justin_dohrman',
      'mike_reed'
    ],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: true,
      isSupervisor: false,
      canInitiateAssessments: true,
      isAdmin: false
    }
  },

  // Service & Support
  {
    userId: 'david_bynum',
    displayName: 'David Bynum',
    email: 'david.bynum@sierranevada.com',
    title: 'Service & Support Lead',
    layer: 'ISL',
    pillar: 'service_support',
    pillarRole: 'leader',
    managerId: 'robert_paddock',
    directReportIds: ['brendan_schuler', 'tony_newman', 'shane_gilligan'],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: true,
      isSupervisor: false,
      canInitiateAssessments: true,
      isAdmin: false
    }
  },

  // PMO/CI
  {
    userId: 'paul_gill',
    displayName: 'Paul Gill',
    email: 'paul.gill@sierranevada.com',
    title: 'PMO/CI Lead',
    layer: 'ISL',
    pillar: 'pmo_ci',
    pillarRole: 'leader',
    managerId: 'robert_paddock',
    directReportIds: ['stephany_rojas'],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: true,
      isSupervisor: false,
      canInitiateAssessments: true,
      isAdmin: false
    }
  },

  // ========== ISF Layer (Functional) ==========

  // --- Data Services: BI & I (Supervisor: Ricky) ---
  {
    userId: 'ricky_martinez',
    displayName: 'Ricky Martinez',
    email: 'ricky.martinez@sierranevada.com',
    title: 'Supervisor DS',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'supervisor',
    managerId: 'avery_cloutier',
    directReportIds: ['chris_jones'],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: true,
      canInitiateAssessments: true,
      isAdmin: false
    }
  },
  {
    userId: 'chris_jones',
    displayName: 'Chris Jones',
    email: 'chris.jones@sierranevada.com',
    title: 'BA-PPA',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'member',
    managerId: 'ricky_martinez',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },

  // --- Data Services: DevOps ---
  {
    userId: 'jonathan_swisher',
    displayName: 'Jonathan Swisher',
    email: 'jonathan.swisher@sierranevada.com',
    title: 'Dev',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'member',
    managerId: 'avery_cloutier',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'dan_bridgman',
    displayName: 'Dan Bridgman',
    email: 'dan.bridgman@sierranevada.com',
    title: 'Dev',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'member',
    managerId: 'avery_cloutier',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'doug_carrol',
    displayName: 'Doug Carrol',
    email: 'doug.carrol@sierranevada.com',
    title: 'DE',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'member',
    managerId: 'avery_cloutier',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },

  // --- Data Services: System Analysts ---
  {
    userId: 'juliana_guidi',
    displayName: 'Juliana Guidi',
    email: 'juliana.guidi@sierranevada.com',
    title: 'SA',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'member',
    managerId: 'avery_cloutier',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'kristen_mohnhoff',
    displayName: 'Kristen Mohnhoff',
    email: 'kristen.mohnhoff@sierranevada.com',
    title: 'SA',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'member',
    managerId: 'avery_cloutier',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'ron_mayfield',
    displayName: 'Ron Mayfield',
    email: 'ron.mayfield@sierranevada.com',
    title: 'Dev/SA',
    layer: 'ISF',
    pillar: 'data_services',
    pillarRole: 'member',
    managerId: 'avery_cloutier',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },

  // --- Infrastructure: Network ---
  {
    userId: 'brandon_shelton',
    displayName: 'Brandon Shelton',
    email: 'brandon.shelton@sierranevada.com',
    title: 'NE',
    layer: 'ISF',
    pillar: 'infrastructure',
    pillarRole: 'member',
    managerId: 'jeremy_kolko',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'drew_ratliff',
    displayName: 'Drew Ratliff',
    email: 'drew.ratliff@sierranevada.com',
    title: 'NE',
    layer: 'ISF',
    pillar: 'infrastructure',
    pillarRole: 'member',
    managerId: 'jeremy_kolko',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'daniel_luger',
    displayName: 'Daniel Luger',
    email: 'daniel.luger@sierranevada.com',
    title: 'NE',
    layer: 'ISF',
    pillar: 'infrastructure',
    pillarRole: 'member',
    managerId: 'jeremy_kolko',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'stephen_ellington',
    displayName: 'Stephen Ellington',
    email: 'stephen.ellington@sierranevada.com',
    title: 'NE',
    layer: 'ISF',
    pillar: 'infrastructure',
    pillarRole: 'member',
    managerId: 'jeremy_kolko',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },

  // --- Infrastructure: Server ---
  {
    userId: 'jim_harrelson',
    displayName: 'Jim Harrelson',
    email: 'jim.harrelson@sierranevada.com',
    title: 'SE',
    layer: 'ISF',
    pillar: 'infrastructure',
    pillarRole: 'member',
    managerId: 'jeremy_kolko',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'justin_dohrman',
    displayName: 'Justin Dohrman',
    email: 'justin.dohrman@sierranevada.com',
    title: 'SE',
    layer: 'ISF',
    pillar: 'infrastructure',
    pillarRole: 'member',
    managerId: 'jeremy_kolko',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'mike_reed',
    displayName: 'Mike Reed',
    email: 'mike.reed@sierranevada.com',
    title: 'SE',
    layer: 'ISF',
    pillar: 'infrastructure',
    pillarRole: 'member',
    managerId: 'jeremy_kolko',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },

  // --- Service & Support: Service Desk ---
  {
    userId: 'brendan_schuler',
    displayName: 'Brendan Schuler',
    email: 'brendan.schuler@sierranevada.com',
    title: 'SD',
    layer: 'ISF',
    pillar: 'service_support',
    pillarRole: 'member',
    managerId: 'david_bynum',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'tony_newman',
    displayName: 'Tony Newman',
    email: 'tony.newman@sierranevada.com',
    title: 'SD',
    layer: 'ISF',
    pillar: 'service_support',
    pillarRole: 'member',
    managerId: 'david_bynum',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },
  {
    userId: 'shane_gilligan',
    displayName: 'Shane Gilligan',
    email: 'shane.gilligan@sierranevada.com',
    title: 'SD',
    layer: 'ISF',
    pillar: 'service_support',
    pillarRole: 'member',
    managerId: 'david_bynum',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  },

  // --- PMO/CI ---
  {
    userId: 'stephany_rojas',
    displayName: 'Stephany Rojas',
    email: 'stephany.rojas@sierranevada.com',
    title: 'PC',
    layer: 'ISF',
    pillar: 'pmo_ci',
    pillarRole: 'member',
    managerId: 'paul_gill',
    directReportIds: [],
    status: 'active',
    flags: {
      isExecutive: false,
      isPillarLeader: false,
      isSupervisor: false,
      canInitiateAssessments: false,
      isAdmin: false
    }
  }
];

// ============================================
// PILLARS - 5 IS Pillars with Sub-Pillar Structure
// ============================================

const pillars = [
  {
    pillarId: 'risk_governance',
    pillarName: 'Risk & Governance',
    pillarDescription: 'Security, compliance, and IT governance',
    pillarLeaderId: 'justin_ainsworth',
    color: '#EF4444',
    subPillars: {
      risk_governance_main: {
        name: 'Risk & Governance',
        supervisorId: null,
        memberIds: ['justin_ainsworth']
      }
    },
    order: 1
  },
  {
    pillarId: 'data_services',
    pillarName: 'Data Services',
    pillarDescription: 'Analytics, reporting, and data infrastructure',
    pillarLeaderId: 'avery_cloutier',
    color: '#3B82F6',
    subPillars: {
      bi_and_i: {
        name: 'BI & I',
        supervisorId: 'ricky_martinez',
        memberIds: ['ricky_martinez', 'chris_jones']
      },
      devops: {
        name: 'DevOps',
        supervisorId: null,
        memberIds: ['jonathan_swisher', 'dan_bridgman', 'doug_carrol']
      },
      system_analysts: {
        name: 'System Analysts',
        supervisorId: null,
        memberIds: ['juliana_guidi', 'kristen_mohnhoff', 'ron_mayfield']
      }
    },
    order: 2
  },
  {
    pillarId: 'infrastructure',
    pillarName: 'Systems & Infrastructure',
    pillarDescription: 'Network and server infrastructure',
    pillarLeaderId: 'jeremy_kolko',
    color: '#10B981',
    subPillars: {
      network: {
        name: 'Network',
        supervisorId: null,
        memberIds: ['brandon_shelton', 'drew_ratliff', 'daniel_luger', 'stephen_ellington']
      },
      server: {
        name: 'Server',
        supervisorId: null,
        memberIds: ['jim_harrelson', 'justin_dohrman', 'mike_reed']
      }
    },
    order: 3
  },
  {
    pillarId: 'service_support',
    pillarName: 'Service & Support',
    pillarDescription: 'End-user support and service desk',
    pillarLeaderId: 'david_bynum',
    color: '#F59E0B',
    subPillars: {
      service_desk: {
        name: 'Service Desk',
        supervisorId: null,
        memberIds: ['brendan_schuler', 'tony_newman', 'shane_gilligan']
      }
    },
    order: 4
  },
  {
    pillarId: 'pmo_ci',
    pillarName: 'PMO/CI',
    pillarDescription: 'Project management and continuous improvement',
    pillarLeaderId: 'paul_gill',
    color: '#8B5CF6',
    subPillars: {
      pmo_ci_main: {
        name: 'PMO/CI',
        supervisorId: null,
        memberIds: ['stephany_rojas']
      }
    },
    order: 5
  }
];

// ============================================
// COUNTERS
// ============================================

const counters = [
  { id: 'assessmentCounter', value: 0 },          // IS OS assessments
  { id: 'metricCounter', value: 0 },              // IS OS metrics
  { id: 'pairCounter', value: 0 },                // IS OS 360 pairs
  { id: 'projectCounter', value: 0 },             // Projects
  { id: 'projectAssessmentCounter', value: 0 }    // Project assessments
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedFirebase() {
  console.log('🚀 Starting MSH³ Firebase Seed...\n');
  console.log('⚠️  This will seed ONLY base collections and authentication.\n');
  console.log('📝 Note: Assessment cycles and sample data are seeded separately.\n');

  try {
    // Create Firestore Users
    console.log('👥 Creating Firestore user documents...');
    let userCount = 0;
    for (const user of users) {
      await db.collection('users').doc(user.userId).set({
        ...user,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      userCount++;
    }
    console.log(`   ✅ Created ${userCount} user documents\n`);

    // Create Firebase Authentication Users
    console.log('🔐 Creating Firebase Authentication users...');
    let authCount = 0;
    for (const user of users) {
      try {
        await auth.createUser({
          uid: user.userId,
          email: user.email,
          password: 'password',
          displayName: user.displayName,
          emailVerified: true
        });
        authCount++;
        console.log(`   ✅ Created auth user: ${user.email}`);
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`   ⚠️  Auth user already exists: ${user.email}`);
        } else {
          console.error(`   ❌ Error creating auth user ${user.email}:`, error.message);
        }
      }
    }
    console.log(`   ✅ Created ${authCount} authentication users\n`);

    // Create Pillars
    console.log('🏛️  Creating pillars...');
    for (const pillar of pillars) {
      await db.collection('pillars').doc(pillar.pillarId).set(pillar);
    }
    console.log(`   ✅ Created ${pillars.length} pillars\n`);

    // Create Counters
    console.log('🔢 Creating counters...');
    for (const counter of counters) {
      await db.collection('counters').doc(counter.id).set({ value: counter.value });
    }
    console.log(`   ✅ Created ${counters.length} counters\n`);

    // Summary
    console.log('✨ Firebase seed complete!\n');
    console.log('📊 Summary:');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   • Firestore Users: ${userCount}`);
    console.log(`   • Auth Users: ${authCount}`);
    console.log(`   • Admin: 1 (admin@sierranevada.com)`);
    console.log(`   • ISE: 1 (Robert)`);
    console.log(`   • ISL: 5 (Justin, Avery, Jeremy, David, Paul)`);
    console.log(`   • Supervisors: 1 (Ricky)`);
    console.log(`   • IFL: 16`);
    console.log(`   • Pillars: ${pillars.length}`);
    console.log(`   • Counters: ${counters.length} (all at 0)`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Base data seeded successfully!');
    console.log('📝 Next: Run separate scripts for cycles and sample data.\n');

  } catch (error) {
    console.error('❌ Error during seed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run seed
seedFirebase();