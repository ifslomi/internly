import fs from 'fs';
import path from 'path';
import { cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function createAdminFirestore() {
    const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error('Missing service-account.json in the project root. Place your Firebase service account JSON there.');
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccount;
    const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });

    return {
        app,
        db: getFirestore(app),
        projectId: serviceAccount.project_id,
    };
}