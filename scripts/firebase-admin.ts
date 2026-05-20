import fs from 'fs';
import path from 'path';
import { cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccountJson = ServiceAccount & { project_id?: string };

export function createAdminFirestore() {
    const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error('Missing service-account.json in the project root. Place your Firebase service account JSON there.');
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccountJson;
    const projectId = serviceAccount.project_id || serviceAccount.projectId;

    if (!projectId) {
        throw new Error('Service account is missing project_id/projectId.');
    }

    const app = initializeApp({
        credential: cert(serviceAccount),
        projectId,
    });

    return {
        app,
        db: getFirestore(app),
        projectId,
    };
}
