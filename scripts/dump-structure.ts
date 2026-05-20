/**
 * Full database structure dump.
 * Usage: npx tsx scripts/dump-structure.ts
 */
import { createAdminFirestore } from './firebase-admin';

const { db, projectId } = createAdminFirestore();

async function dump() {
    // Known top-level collections
    const topCollections = ['users', 'conversations', 'chatUsers', 'supervisors', 'dailyLogs', 'weeklyReports', 'notifications', 'appMetadata', 'time_logs'];

    console.log('\n════════════════════════════════════════════════════════');
    console.log(`  FULL FIRESTORE DATABASE STRUCTURE — ${projectId}`);
    console.log('════════════════════════════════════════════════════════\n');

    for (const col of topCollections) {
        const snap = await db.collection(col).get();
        if (snap.empty) {
            console.log(`📁 ${col}/ (empty)`);
            continue;
        }

        console.log(`📁 ${col}/ (${snap.size} doc(s))`);
        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const fields = Object.keys(data).sort();
            const preview = fields.slice(0, 6).join(', ') + (fields.length > 6 ? `, ... (+${fields.length - 6})` : '');
            console.log(`   📄 ${docSnap.id}  [${preview}]`);

            // Check subcollections for user docs
            if (col === 'users' && docSnap.id !== '_schema_') {
                const subCols = ['dailyLogs', 'weeklyReports', 'notifications'];
                for (const sub of subCols) {
                    const subSnap = await db.collection(`${col}/${docSnap.id}/${sub}`).get();
                    if (subSnap.size > 0) {
                        console.log(`      📁 ${sub}/ (${subSnap.size} doc(s))`);
                        for (const subDoc of subSnap.docs) {
                            const subData = subDoc.data();
                            const subFields = Object.keys(subData).sort();
                            const subPreview = subFields.slice(0, 5).join(', ') + (subFields.length > 5 ? `, ... (+${subFields.length - 5})` : '');
                            console.log(`         📄 ${subDoc.id}  [${subPreview}]`);
                        }
                    } else {
                        console.log(`      📁 ${sub}/ (empty)`);
                    }
                }
            }

            // Check messages subcollection for conversations
            if (col === 'conversations' && docSnap.id !== '_schema_') {
                const msgsSnap = await db.collection(`${col}/${docSnap.id}/messages`).get();
                console.log(`      📁 messages/ (${msgsSnap.size} doc(s))`);
            }
        }
        console.log('');
    }

    console.log('════════════════════════════════════════════════════════\n');
}

dump().catch(console.error);
