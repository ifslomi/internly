/**
 * Quick verification: list all users and their subcollection doc counts.
 * Usage: npx tsx scripts/verify-subcollections.ts
 */
import { createAdminFirestore } from './firebase-admin';

const { db } = createAdminFirestore();

async function verify() {
    console.log('\n🔍 Verifying subcollection structure...\n');

    // List all user docs
    const usersSnap = await db.collection('users').get();
    console.log(`Found ${usersSnap.size} user(s):\n`);

    for (const userDoc of usersSnap.docs) {
        if (userDoc.id === '_schema_') continue;
        const data = userDoc.data();
        console.log(`  👤 ${data.name || data.email || userDoc.id} (${userDoc.id})`);

        const logs = await db.collection(`users/${userDoc.id}/dailyLogs`).get();
        const reports = await db.collection(`users/${userDoc.id}/weeklyReports`).get();
        const notifs = await db.collection(`users/${userDoc.id}/notifications`).get();

        console.log(`     ├─ dailyLogs:      ${logs.size} doc(s)`);
        console.log(`     ├─ weeklyReports:  ${reports.size} doc(s)`);
        console.log(`     └─ notifications:  ${notifs.size} doc(s)\n`);
    }

    // Show old flat collection counts for comparison
    console.log('  📊 Old flat collections (for comparison):');
    const oldLogs = await db.collection('dailyLogs').get();
    const oldReports = await db.collection('weeklyReports').get();
    const oldNotifs = await db.collection('notifications').get();
    console.log(`     ├─ dailyLogs:      ${oldLogs.size} doc(s) (includes _schema_)`);
    console.log(`     ├─ weeklyReports:  ${oldReports.size} doc(s) (includes _schema_)`);
    console.log(`     └─ notifications:  ${oldNotifs.size} doc(s) (includes _schema_)\n`);
}

verify().catch(console.error);
