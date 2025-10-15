// seedCycles.js - Create 12 months of assessment cycles
const admin = require('firebase-admin');

// Initialize Firebase Admin - serviceAccountKey.json is in same folder
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ============================================
// ASSESSMENT CYCLES - 12 Month Calendar
// ============================================

// Starting from October 2025
const startYear = 2025;
const startMonth = 10; // October

// Assessment type pattern:
// 1x1 Months: 1, 2, 4, 5, 7, 8, 10, 11
// 360 Months: 3, 6, 9, 12 (quarterly)
const cyclePattern = {
  1: '1x1',
  2: '1x1',
  3: '360',
  4: '1x1',
  5: '1x1',
  6: '360',
  7: '1x1',
  8: '1x1',
  9: '360',
  10: '1x1',
  11: '1x1',
  12: '360'
};

function generateCycles() {
  const cycles = [];
  
  for (let i = 0; i < 12; i++) {
    // Calculate year and month
    const monthOffset = startMonth + i - 1; // -1 because months are 0-indexed in calc
    const year = startYear + Math.floor(monthOffset / 12);
    const month = (monthOffset % 12) + 1; // +1 because months are 1-12
    
    // Determine cycle position (1-12 pattern)
    const cyclePosition = ((i % 12) + 1);
    const cycleType = cyclePattern[cyclePosition];
    
    // Create start and end dates
    const startDate = new Date(year, month - 1, 1, 0, 0, 0); // month-1 because Date months are 0-indexed
    const endDate = new Date(year, month, 0, 23, 59, 59); // Day 0 of next month = last day of current month
    
    // Format cycleId as YYYY_MM
    const cycleId = `${year}_${String(month).padStart(2, '0')}`;
    
    // Determine status based on current date
    const now = new Date();
    let status;
    if (endDate < now) {
      status = 'completed';
    } else if (startDate <= now && now <= endDate) {
      status = 'active';
    } else {
      status = 'upcoming';
    }
    
    cycles.push({
      cycleId,
      year,
      month,
      cycleType,
      startDate: admin.firestore.Timestamp.fromDate(startDate),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      status,
      completionStats: {
        total: 0,
        completed: 0,
        pending: 0
      }
    });
  }
  
  return cycles;
}

// ============================================
// SEED FUNCTION
// ============================================

async function seedCycles() {
  console.log('📅 Starting Assessment Cycles Seed...\n');
  console.log(`📆 Creating 12 months of cycles starting ${startMonth}/${startYear}\n`);

  try {
    const cycles = generateCycles();
    
    console.log('🔄 Creating assessment cycles...\n');
    
    let oneOnOneCount = 0;
    let threeSixtyCount = 0;
    
    for (const cycle of cycles) {
      await db.collection('assessmentCycles').doc(cycle.cycleId).set(cycle);
      
      const monthName = new Date(cycle.year, cycle.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const icon = cycle.cycleType === '1x1' ? '👥' : '🔄';
      const statusIcon = cycle.status === 'active' ? '✅' : cycle.status === 'completed' ? '✓' : '○';
      
      console.log(`   ${statusIcon} ${icon} ${cycle.cycleId} - ${monthName} (${cycle.cycleType}) - ${cycle.status}`);
      
      if (cycle.cycleType === '1x1') oneOnOneCount++;
      if (cycle.cycleType === '360') threeSixtyCount++;
    }
    
    console.log('\n✨ Assessment cycles seed complete!\n');
    console.log('📊 Summary:');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   • Total Cycles: ${cycles.length}`);
    console.log(`   • 1x1 Cycles: ${oneOnOneCount} (monthly)`);
    console.log(`   • 360 Cycles: ${threeSixtyCount} (quarterly)`);
    console.log(`   • Start: ${cycles[0].cycleId}`);
    console.log(`   • End: ${cycles[cycles.length - 1].cycleId}`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Assessment calendar ready!');
    console.log('📝 Next: App can now schedule assessments based on cycles.\n');

  } catch (error) {
    console.error('❌ Error during seed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run seed
seedCycles();