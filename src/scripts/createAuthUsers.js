// src/scripts/createAuthUsers.js - CORRECTED VERSION
const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse existing initialization)
if (!admin.apps.length) {
  const serviceAccount = require('../../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Default password for all users
const DEFAULT_PASSWORD = 'MSH3secure2025!';
const DEV_PASSWORD = 'password123';

// Dev accounts for quick login (matching setupFirebase.js exactly)
const DEV_ACCOUNTS = [
  {
    email: 'admin@sierranevada.com',
    displayName: 'Dev Admin',
    role: 'admin',
    title: 'Admin',
    department: 'Administration',
    employeeId: 'dev-admin',
    pillar: null,
    subPillar: null,
    managerId: null,
    isDevAccount: true
  },
  {
    email: 'supervisor@sierranevada.com',
    displayName: 'Dev Supervisor',
    role: 'supervisor',
    title: 'Supervisor',
    department: 'Administration',
    employeeId: 'dev-supervisor',
    pillar: null,
    subPillar: null,
    managerId: null,
    isDevAccount: true
  },
  {
    email: 'ise@sierranevada.com',
    displayName: 'Dev ISE',
    role: 'ise',
    title: 'ISE',
    department: 'Information Services',
    employeeId: 'dev-ise',
    pillar: null,
    subPillar: null,
    managerId: null,
    isDevAccount: true
  },
  {
    email: 'isl@sierranevada.com',
    displayName: 'Dev ISL',
    role: 'isl',
    title: 'ISL',
    department: 'Information Services',
    employeeId: 'dev-isl',
    pillar: 'Data Services',
    subPillar: null,
    managerId: 'dev-ise', // Will be updated to UID after Auth creation
    isDevAccount: true
  },
  {
    email: 'isf@sierranevada.com',
    displayName: 'Dev ISF',
    role: 'isf',
    title: 'ISF',
    department: 'Information Services',
    employeeId: 'dev-isf',
    pillar: 'Data Services',
    subPillar: 'DevOps',
    managerId: 'dev-isl', // Will be updated to UID after Auth creation
    isDevAccount: true
  },
  {
    email: 'projectlead@sierranevada.com',
    displayName: 'Dev Project Lead',
    role: 'isf',
    title: 'Project Lead',
    department: 'Information Services',
    employeeId: 'dev-projectlead',
    pillar: 'PMO/CI',
    subPillar: null,
    managerId: 'dev-isl', // Will be updated to UID after Auth creation
    isDevAccount: true
  }
];

// Create Auth users and link to Firestore
async function createAuthUsers() {
  try {
    console.log('🚀 Starting Firebase Auth user creation...\n');
    console.log(`📝 Default password for production users: ${DEFAULT_PASSWORD}`);
    console.log(`🔧 Dev account password: ${DEV_PASSWORD}`);
    console.log('⚠️  Make sure to change passwords after first login!\n');

    const results = {
      created: [],
      updated: [],
      failed: [],
      skipped: [],
      devCreated: []
    };

    // Map to track employeeId -> UID for manager relationship fixes
    const employeeIdToUidMap = {};

    // ============================================
    // PART 1: Process Production Users from Firestore
    // ============================================
    console.log('📊 Processing production users from Firestore...\n');
    
    const usersSnapshot = await db.collection('users').get();
    
    if (!usersSnapshot.empty) {
      console.log(`Found ${usersSnapshot.size} users in Firestore\n`);

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const email = userData.email;
        const displayName = userData.displayName;
        const employeeId = userData.employeeId;
        const isDevAccount = userData.isDevAccount || false;

        // Skip dev accounts in this phase (we'll process them separately)
        if (isDevAccount) {
          console.log(`⏭️  Skipping dev account: ${displayName} (${email}) - will process separately`);
          continue;
        }

        console.log(`\n🔄 Processing: ${displayName} (${email})`);

        try {
          let authUser;
          try {
            authUser = await auth.getUserByEmail(email);
            console.log(`  ℹ️  Auth user already exists (UID: ${authUser.uid})`);
            
            // Update Firestore document ID if needed
            if (userDoc.id !== authUser.uid) {
              // Create new document with Auth UID
              await db.collection('users').doc(authUser.uid).set({
                ...userData,
                uid: authUser.uid
              });
              
              // Delete old document
              await db.collection('users').doc(userDoc.id).delete();
              
              console.log(`  ✅ Updated Firestore document ID to UID: ${authUser.uid}`);
              results.updated.push({ email, displayName, uid: authUser.uid });
            } else {
              console.log(`  ✅ Already linked correctly`);
              results.skipped.push({ email, displayName, uid: authUser.uid });
            }
          } catch (error) {
            if (error.code === 'auth/user-not-found') {
              console.log(`  🆕 Creating new Auth user...`);
              
              authUser = await auth.createUser({
                email: email,
                password: DEFAULT_PASSWORD,
                displayName: displayName,
                emailVerified: true
              });

              console.log(`  ✅ Auth user created (UID: ${authUser.uid})`);

              // Create new document with Auth UID
              await db.collection('users').doc(authUser.uid).set({
                ...userData,
                uid: authUser.uid
              });

              // Delete old document if it had a different ID
              if (userDoc.id !== authUser.uid) {
                await db.collection('users').doc(userDoc.id).delete();
              }

              console.log(`  ✅ Firestore updated with UID`);
              
              results.created.push({
                email,
                displayName,
                uid: authUser.uid,
                password: DEFAULT_PASSWORD
              });
            } else {
              throw error;
            }
          }

          // Track employeeId -> UID mapping
          employeeIdToUidMap[employeeId] = authUser.uid;

        } catch (error) {
          console.log(`  ❌ Failed: ${error.message}`);
          results.failed.push({ email, displayName, error: error.message });
        }
      }
    } else {
      console.log('⚠️  No production users found in Firestore');
    }

    // ============================================
    // PART 2: Create Dev Accounts for Quick Login
    // ============================================
    console.log('\n\n🔧 Creating dev accounts for quick login...\n');

    for (const devAccount of DEV_ACCOUNTS) {
      console.log(`\n🔄 Processing dev account: ${devAccount.displayName} (${devAccount.email})`);

      try {
        let authUser;
        
        // Check if auth user exists
        try {
          authUser = await auth.getUserByEmail(devAccount.email);
          console.log(`  ℹ️  Dev auth user already exists (UID: ${authUser.uid})`);
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            // Create new auth user
            console.log(`  🆕 Creating dev Auth user...`);
            
            authUser = await auth.createUser({
              email: devAccount.email,
              password: DEV_PASSWORD,
              displayName: devAccount.displayName,
              emailVerified: true
            });

            console.log(`  ✅ Dev auth user created (UID: ${authUser.uid})`);
          } else {
            throw error;
          }
        }

        // Track employeeId -> UID mapping for dev accounts
        employeeIdToUidMap[devAccount.employeeId] = authUser.uid;

        // Create Firestore document with Auth UID as document ID
        const userDocData = {
          uid: authUser.uid,
          email: devAccount.email,
          displayName: devAccount.displayName,
          role: devAccount.role,
          title: devAccount.title,
          department: devAccount.department,
          employeeId: devAccount.employeeId,
          pillar: devAccount.pillar,
          subPillar: devAccount.subPillar,
          managerId: devAccount.managerId, // Will be fixed in Part 3
          createdAt: admin.firestore.Timestamp.now(),
          isDevAccount: true
        };

        // Delete old document if it exists with employeeId as ID
        try {
          await db.collection('users').doc(devAccount.employeeId).delete();
          console.log(`  🗑️  Deleted old document with ID: ${devAccount.employeeId}`);
        } catch (e) {
          // Document doesn't exist, that's fine
        }

        // Create new document with UID as ID
        await db.collection('users').doc(authUser.uid).set(userDocData);
        console.log(`  ✅ Firestore document created with UID: ${authUser.uid}`);

        results.devCreated.push({
          email: devAccount.email,
          displayName: devAccount.displayName,
          role: devAccount.role,
          uid: authUser.uid,
          password: DEV_PASSWORD
        });

      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        results.failed.push({ 
          email: devAccount.email, 
          displayName: devAccount.displayName, 
          error: error.message 
        });
      }
    }

    // ============================================
    // PART 3: Fix ManagerId References
    // ============================================
    console.log('\n\n🔗 Fixing managerId references to use UIDs...\n');

    const allUsersSnapshot = await db.collection('users').get();
    let fixedCount = 0;

    for (const userDoc of allUsersSnapshot.docs) {
      const userData = userDoc.data();
      
      if (userData.managerId && employeeIdToUidMap[userData.managerId]) {
        const newManagerUid = employeeIdToUidMap[userData.managerId];
        
        if (userData.managerId !== newManagerUid) {
          await db.collection('users').doc(userDoc.id).update({
            managerId: newManagerUid
          });
          
          console.log(`  ✅ Fixed ${userData.displayName}: managerId ${userData.managerId} → ${newManagerUid}`);
          fixedCount++;
        }
      }
    }

    console.log(`\n  📊 Fixed ${fixedCount} managerId references`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\n📊 ============ SUMMARY ============\n');
    
    if (results.created.length > 0) {
      console.log(`✅ Created ${results.created.length} production Auth users:\n`);
      results.created.forEach(user => {
        console.log(`   ${user.displayName}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🔑 Password: ${user.password}`);
        console.log(`   🆔 UID: ${user.uid}`);
        console.log('');
      });
    }

    if (results.updated.length > 0) {
      console.log(`🔄 Updated ${results.updated.length} existing users`);
    }

    if (results.skipped.length > 0) {
      console.log(`⏭️  Skipped ${results.skipped.length} already-linked users`);
    }

    if (results.devCreated.length > 0) {
      console.log(`\n🔧 Created ${results.devCreated.length} dev accounts:\n`);
      results.devCreated.forEach(user => {
        console.log(`   ${user.displayName} (${user.role.toUpperCase()})`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🔑 Password: ${user.password}`);
        console.log(`   🆔 UID: ${user.uid}`);
        console.log('');
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ Failed ${results.failed.length} users:\n`);
      results.failed.forEach(user => {
        console.log(`   ${user.displayName} (${user.email}): ${user.error}`);
      });
      console.log('');
    }

    console.log('\n🎯 Quick Login Credentials:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 DEV ACCOUNTS (password123):');
    console.log('   Admin:        admin@sierranevada.com');
    console.log('   Supervisor:   supervisor@sierranevada.com');
    console.log('   ISE:          ise@sierranevada.com');
    console.log('   ISL:          isl@sierranevada.com');
    console.log('   ISF:          isf@sierranevada.com');
    console.log('   Project Lead: projectlead@sierranevada.com');
    console.log('');
    console.log('🏢 PRODUCTION ACCOUNTS (MSH3secure2025!):');
    console.log('   CIO:          robert.paddock@snb.com');
    console.log('   ISL Lead:     avery.cloutier@snb.com');
    console.log('   ISF:          ricky.martinez@snb.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Auth setup complete!');
    console.log('🌐 All users can now login to your app!');
    console.log(`📊 Total users with Auth: ${results.created.length + results.updated.length + results.skipped.length + results.devCreated.length}\n`);
    console.log('💡 TIP: Use the dev quick login buttons for fast testing!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating auth users:', error);
    process.exit(1);
  }
}

// Run the setup
createAuthUsers();