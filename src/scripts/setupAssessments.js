// src/scripts/setupAssessments.js - FINAL CORRECT VERSION
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Sample Assessments - Using CORRECT structure: culture, competencies, execution
const sampleAssessments = [
  // ============================================
  // 360 Assessment for Avery Cloutier (ISL)
  // ============================================
  
  // Self-review
  {
    assessmentId: 'assess_001',
    employeeId: 'avery_cloutier',
    assessorId: 'avery_cloutier',
    assessorType: 'self',
    assessmentType: '360',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 2, growth: 2 },
      competencies: { contribution: 2, growth: 1 },
      execution: { contribution: 2, growth: 2 }
    },
    compositeScore: 11,
    comments: 'Strong technical leadership and team development.'
  },
  
  // Manager review (Robert Paddock)
  {
    assessmentId: 'assess_002',
    employeeId: 'avery_cloutier',
    assessorId: 'robert_paddock',
    assessorType: 'manager',
    assessmentType: '360',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 2, growth: 1 },
      competencies: { contribution: 2, growth: 2 },
      execution: { contribution: 2, growth: 1 }
    },
    compositeScore: 10,
    comments: 'Excellent data services leadership and strategic vision.'
  },
  
  // Direct report review (Ricky Martinez)
  {
    assessmentId: 'assess_003',
    employeeId: 'avery_cloutier',
    assessorId: 'ricky_martinez',
    assessorType: 'direct-report',
    assessmentType: '360',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 2, growth: 2 },
      competencies: { contribution: 1, growth: 2 },
      execution: { contribution: 2, growth: 1 }
    },
    compositeScore: 10,
    comments: 'Great technical mentor and clear communicator.'
  },
  
  // Direct report review (Jonathan Swisher)
  {
    assessmentId: 'assess_004',
    employeeId: 'avery_cloutier',
    assessorId: 'jonathan_swisher',
    assessorType: 'direct-report',
    assessmentType: '360',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 2, growth: 1 },
      competencies: { contribution: 2, growth: 2 },
      execution: { contribution: 2, growth: 2 }
    },
    compositeScore: 11,
    comments: 'Provides excellent technical guidance and support.'
  },

  // ============================================
  // 1x1 Assessment: Avery → Ricky
  // ============================================
  {
    assessmentId: 'assess_005',
    employeeId: 'ricky_martinez',
    assessorId: 'avery_cloutier',
    assessorType: 'manager',
    assessmentType: '1x1',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 1, growth: 2 },
      competencies: { contribution: 2, growth: 1 },
      execution: { contribution: 2, growth: 1 }
    },
    compositeScore: 9,
    comments: 'Strong supervisor with excellent technical skills. Continue developing leadership capabilities.'
  },

  // ============================================
  // 360 Assessment for Ricky Martinez (ISF Supervisor)
  // ============================================
  
  // Self-review
  {
    assessmentId: 'assess_006',
    employeeId: 'ricky_martinez',
    assessorId: 'ricky_martinez',
    assessorType: 'self',
    assessmentType: '360',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 1, growth: 1 },
      competencies: { contribution: 2, growth: 1 },
      execution: { contribution: 1, growth: 2 }
    },
    compositeScore: 8,
    comments: 'Working on expanding leadership skills and team development.'
  },
  
  // Manager review (Avery)
  {
    assessmentId: 'assess_007',
    employeeId: 'ricky_martinez',
    assessorId: 'avery_cloutier',
    assessorType: 'manager',
    assessmentType: '360',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 1, growth: 2 },
      competencies: { contribution: 2, growth: 1 },
      execution: { contribution: 2, growth: 1 }
    },
    compositeScore: 9,
    comments: 'Excellent technical supervisor with growth potential.'
  },
  
  // Direct report review (Chris Jones)
  {
    assessmentId: 'assess_008',
    employeeId: 'ricky_martinez',
    assessorId: 'chris_jones',
    assessorType: 'direct-report',
    assessmentType: '360',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 2, growth: 1 },
      competencies: { contribution: 2, growth: 1 },
      execution: { contribution: 1, growth: 2 }
    },
    compositeScore: 9,
    comments: 'Supportive supervisor who provides clear guidance.'
  },

  // ============================================
  // 1x1 Assessment: Ricky → Chris
  // ============================================
  {
    assessmentId: 'assess_009',
    employeeId: 'chris_jones',
    assessorId: 'ricky_martinez',
    assessorType: 'manager',
    assessmentType: '1x1',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 1, growth: 1 },
      competencies: { contribution: 1, growth: 2 },
      execution: { contribution: 2, growth: 1 }
    },
    compositeScore: 8,
    comments: 'Solid performer with strong analytical skills. Focus on expanding business knowledge.'
  },

  // ============================================
  // 1x1 Assessments: Jeremy → ISF team members
  // ============================================
  {
    assessmentId: 'assess_010',
    employeeId: 'brandon_shelton',
    assessorId: 'jeremy_kolko',
    assessorType: 'manager',
    assessmentType: '1x1',
    status: 'submitted',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: admin.firestore.Timestamp.now(),
    scores: {
      culture: { contribution: 2, growth: 1 },
      competencies: { contribution: 2, growth: 2 },
      execution: { contribution: 1, growth: 2 }
    },
    compositeScore: 10,
    comments: 'Strong network specialist with excellent technical depth.'
  },

  // ============================================
  // Draft 1x1 (in progress)
  // ============================================
  {
    assessmentId: 'assess_011',
    employeeId: 'jim_harrelson',
    assessorId: 'jeremy_kolko',
    assessorType: 'manager',
    assessmentType: '1x1',
    status: 'draft',
    createdAt: admin.firestore.Timestamp.now(),
    submittedAt: null,
    scores: {
      culture: { contribution: 1, growth: 0 },
      competencies: { contribution: 0, growth: 0 },
      execution: { contribution: 0, growth: 0 }
    },
    compositeScore: 1,
    comments: ''
  }
];

// Sample MSH Results (Aggregated 360 data)
const sampleMSHResults = [
  {
    employeeId: 'avery_cloutier',
    assessmentCycle: '2025-Q4',
    lastUpdated: admin.firestore.Timestamp.now(),
    aggregatedScores: {
      culture: {
        contribution: {
          self: 2,
          manager: 2,
          directReports: [2, 2],
          average: 2.0
        },
        growth: {
          self: 2,
          manager: 1,
          directReports: [2, 1],
          average: 1.5
        }
      },
      competencies: {
        contribution: {
          self: 2,
          manager: 2,
          directReports: [1, 2],
          average: 1.75
        },
        growth: {
          self: 1,
          manager: 2,
          directReports: [2, 2],
          average: 1.75
        }
      },
      execution: {
        contribution: {
          self: 2,
          manager: 2,
          directReports: [2, 2],
          average: 2.0
        },
        growth: {
          self: 2,
          manager: 1,
          directReports: [1, 2],
          average: 1.5
        }
      }
    },
    compositeScore: 10.5,
    nineBoxPosition: {
      performance: 'High',
      potential: 'High',
      quadrant: 'High-High'
    },
    assessmentCount: {
      self: 1,
      manager: 1,
      directReports: 2,
      total: 4
    }
  },
  {
    employeeId: 'ricky_martinez',
    assessmentCycle: '2025-Q4',
    lastUpdated: admin.firestore.Timestamp.now(),
    aggregatedScores: {
      culture: {
        contribution: {
          self: 1,
          manager: 1,
          directReports: [2],
          average: 1.33
        },
        growth: {
          self: 1,
          manager: 2,
          directReports: [1],
          average: 1.33
        }
      },
      competencies: {
        contribution: {
          self: 2,
          manager: 2,
          directReports: [2],
          average: 2.0
        },
        growth: {
          self: 1,
          manager: 1,
          directReports: [1],
          average: 1.0
        }
      },
      execution: {
        contribution: {
          self: 1,
          manager: 2,
          directReports: [1],
          average: 1.33
        },
        growth: {
          self: 2,
          manager: 1,
          directReports: [2],
          average: 1.67
        }
      }
    },
    compositeScore: 8.66,
    nineBoxPosition: {
      performance: 'Mid',
      potential: 'High',
      quadrant: 'Mid-High'
    },
    assessmentCount: {
      self: 1,
      manager: 1,
      directReports: 1,
      total: 3
    }
  }
];

async function setupAssessmentData() {
  try {
    console.log('🚀 Starting assessment data setup...\n');

    // Create assessments
    console.log('📝 Creating assessments...');
    for (const assessment of sampleAssessments) {
      await db.collection('assessments').doc(assessment.assessmentId).set(assessment);
      console.log(`  ✅ ${assessment.assessmentId}: ${assessment.assessmentType} - ${assessment.assessorType} for ${assessment.employeeId}`);
    }

    // Create MSH Results
    console.log('\n📊 Creating MSH results...');
    for (const result of sampleMSHResults) {
      await db.collection('mshResults').doc(result.employeeId).set(result);
      console.log(`  ✅ ${result.employeeId}: ${result.nineBoxPosition.quadrant} (composite: ${result.compositeScore})`);
    }

    console.log('\n✅ Assessment setup complete!');
    console.log('\n📊 Summary:');
    console.log(`  • ${sampleAssessments.length} assessments`);
    console.log(`  • ${sampleMSHResults.length} MSH results`);
    console.log('\n🎯 Assessment Types:');
    const oneOnOnes = sampleAssessments.filter(a => a.assessmentType === '1x1').length;
    const threeSixties = sampleAssessments.filter(a => a.assessmentType === '360').length;
    console.log(`  • ${oneOnOnes} 1x1 assessments (manager → direct report)`);
    console.log(`  • ${threeSixties} 360 assessments (self + manager + direct-reports)`);
    console.log('\n✅ Ready to test!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the setup
setupAssessmentData();