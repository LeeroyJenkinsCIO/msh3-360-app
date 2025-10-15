// Update Script: Set HRP User Fields for Dashboard Access
// Run this to configure HRP user with correct layer and permissions

import { db } from './src/firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

async function updateHRPUserFields() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MSH³ 360 - HRP User Configuration Update');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const authUID = '9zyGiiP5fRXBacLiyImR1Yh8zpF2';
  
  try {
    console.log('🔍 Looking for HRP user...\n');
    
    // Get the HRP user document
    const userRef = doc(db, 'users', authUID);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error('❌ HRP user document not found!');
      console.log(`   Expected UID: ${authUID}\n`);
      return;
    }
    
    const userData = userSnap.data();
    console.log('✅ Found HRP user');
    console.log('📋 Current Data:');
    console.log(`   Name: ${userData.displayName}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Current Layer: ${userData.layer}`);
    console.log(`   Pillar: ${userData.pillar || 'None'}\n`);
    
    // Update fields for HRP dashboard access
    console.log('📝 Updating user fields...\n');
    
    await updateDoc(userRef, {
      layer: 'HRP',
      pillar: 'HR Partner',
      flags: {
        isAdmin: false,
        isExecutive: false,
        isPillarLeader: false,
        isSupervisor: false,
        canInitiateAssessments: true,  // HRP can start assessments
        isHRP: true  // Special flag for HRP users
      },
      updatedAt: new Date()
    });
    
    console.log('✅ User fields updated successfully!\n');
    
    // Verify update
    const verifySnap = await getDoc(userRef);
    const verifiedData = verifySnap.data();
    
    console.log('✅ Verification - New Data:');
    console.log(`   Layer: ${verifiedData.layer}`);
    console.log(`   Pillar: ${verifiedData.pillar}`);
    console.log(`   Can Initiate: ${verifiedData.flags?.canInitiateAssessments}`);
    console.log(`   Is HRP: ${verifiedData.flags?.isHRP}\n`);
    
    console.log('🎉 Configuration Complete!');
    console.log('\n📌 Next Steps:');
    console.log('   1. Add HRP dashboard routing to your app');
    console.log('   2. Create HRPDashboard component');
    console.log('   3. HRP user can now access their dashboard\n');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    console.error('Error details:', error.message);
  }
}

updateHRPUserFields();