/**
 * Firestore persistence layer — User-Centric Subcollection Architecture
 *
 * All user-generated data lives under: users/{userId}/subcollection/{docId}
 *   - users/{userId}/dailyLogs/{logId}
 *   - users/{userId}/weeklyReports/{reportId}
 *   - users/{userId}/notifications/{notifId}
 *
 * Shared/cross-user data stays at the top level:
 *   - supervisors/{supervisorId}
 *   - conversations/{convId}/messages/{msgId}  (handled in chat.ts)
 *
 * This is the source of truth, with localStorage as a fast local cache.
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    updateDoc,
    writeBatch,
    limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { User, DailyLog, WeeklyReport, Notification, Supervisor, Competency } from './types';
import { v4 as uuidv4 } from 'uuid';

// ─── Helper: resolve current UID ────────────────────────
function resolveUid(fallback?: string): string {
    return auth.currentUser?.uid || fallback || '';
}

// ═══════════════════════════════════════════════════════
// ─── User Profile ─────────────────────────────────────
// Path: users/{userId}
// ═══════════════════════════════════════════════════════

/** Save or update a user profile in Firestore */
export async function saveUserToFirestore(user: User): Promise<void> {
    const uid = resolveUid(user.id);
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        id: uid,
        name: user.name,
        fullName: user.fullName || null,
        email: user.email,
        address: user.address || null,
        phoneNumber: user.phoneNumber || user.contact || null,
        contact: user.contact || user.phoneNumber || null,
        guardianEmail: user.guardianEmail || user.guardian?.email || null,
        guardianPhone: user.guardianPhone || user.guardian?.phone || null,
        guardian: user.guardian || null,
        course: user.course || null,
        department: user.department || null,
        companyName: user.companyName || user.company?.name || null,
        companyAddress: user.companyAddress || user.company?.address || null,
        companyContactNumber: user.companyContactNumber || user.company?.contactNumber || null,
        companyEmail: user.companyEmail || user.company?.email || null,
        company: user.company || null,
        totalRequiredHours: user.totalRequiredHours,
        startDate: user.startDate,
        endDate: user.endDate || null,
        createdAt: user.createdAt,
        supervisors: user.supervisors || [],
        reminderEnabled: user.reminderEnabled ?? true,
        profileImage: user.profileImage || null,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

/** Fetch a user profile from Firestore by UID */
export async function getUserFromFirestore(uid: string): Promise<User | null> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        id: data.id || uid,
        name: data.name || '',
        fullName: data.fullName || undefined,
        email: data.email || '',
        password: '', // Never store passwords in Firestore
        address: data.address || undefined,
        phoneNumber: data.phoneNumber || undefined,
        contact: data.contact || data.phoneNumber || undefined,
        guardianEmail: data.guardianEmail || data.guardian?.email || undefined,
        guardianPhone: data.guardianPhone || data.guardian?.phone || undefined,
        guardian: data.guardian || undefined,
        course: data.course || undefined,
        department: data.department || undefined,
        companyName: data.companyName || data.company?.name || undefined,
        companyAddress: data.companyAddress || data.company?.address || undefined,
        companyContactNumber: data.companyContactNumber || data.company?.contactNumber || undefined,
        companyEmail: data.companyEmail || data.company?.email || undefined,
        company: data.company || undefined,
        totalRequiredHours: data.totalRequiredHours || 480,
        startDate: data.startDate || '',
        endDate: data.endDate || undefined,
        createdAt: data.createdAt || '',
        supervisors: data.supervisors || [],
        reminderEnabled: data.reminderEnabled ?? true,
        profileImage: data.profileImage || undefined,
    };
}

/** Update specific fields on the user profile in Firestore */
export async function updateUserInFirestore(uid: string, updates: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, id, ...safeUpdates } = updates as User;
    await updateDoc(userRef, {
        ...safeUpdates,
        updatedAt: serverTimestamp(),
    });
}

/** Find a user by email in Firestore (requires broad read — only use when authenticated) */
export async function findUserByEmailInFirestore(email: string): Promise<User | null> {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
        id: data.id || snap.docs[0].id,
        name: data.name || '',
        fullName: data.fullName || undefined,
        email: data.email || '',
        password: '',
        address: data.address || undefined,
        phoneNumber: data.phoneNumber || undefined,
        contact: data.contact || data.phoneNumber || undefined,
        guardianEmail: data.guardianEmail || data.guardian?.email || undefined,
        guardianPhone: data.guardianPhone || data.guardian?.phone || undefined,
        guardian: data.guardian || undefined,
        course: data.course || undefined,
        department: data.department || undefined,
        companyName: data.companyName || data.company?.name || undefined,
        companyAddress: data.companyAddress || data.company?.address || undefined,
        companyContactNumber: data.companyContactNumber || data.company?.contactNumber || undefined,
        companyEmail: data.companyEmail || data.company?.email || undefined,
        company: data.company || undefined,
        totalRequiredHours: data.totalRequiredHours || 480,
        startDate: data.startDate || '',
        endDate: data.endDate || undefined,
        createdAt: data.createdAt || '',
        supervisors: data.supervisors || [],
        reminderEnabled: data.reminderEnabled ?? true,
        profileImage: data.profileImage || undefined,
    };
}

// ═══════════════════════════════════════════════════════
// ─── Daily Logs (Subcollection) ───────────────────────
// Path: users/{userId}/dailyLogs/{logId}
// ═══════════════════════════════════════════════════════

/** Get the dailyLogs subcollection reference for a user */
function dailyLogsCol(uid: string) {
    return collection(db, 'users', uid, 'dailyLogs');
}

/** Fetch all daily logs for a user from Firestore */
export async function getDailyLogsFromFirestore(userId: string): Promise<DailyLog[]> {
    const uid = resolveUid(userId);
    const q = query(dailyLogsCol(uid), orderBy('entryDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            userId: uid,
            entryDate: data.entryDate,
            activityType: data.activityType || [],
            taskDescription: data.taskDescription || '',
            supervisor: data.supervisor || '',
            dailyHours: data.dailyHours || 0,
            attachments: data.attachments || undefined,
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
        } as DailyLog;
    });
}

/** Add a new daily log to Firestore */
export async function addDailyLogToFirestore(
    log: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DailyLog> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const uid = resolveUid(log.userId);
    const newLog: DailyLog = {
        ...log,
        userId: uid,
        id,
        createdAt: now,
        updatedAt: now,
    };
    const logRef = doc(db, 'users', uid, 'dailyLogs', id);
    await setDoc(logRef, {
        ...newLog,
        _createdAt: serverTimestamp(),
        _updatedAt: serverTimestamp(),
    });

    // Auto-save supervisor to user profile
    if (log.supervisor) {
        try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const supervisors: string[] = userData.supervisors || [];
                if (!supervisors.includes(log.supervisor)) {
                    await updateDoc(doc(db, 'users', uid), {
                        supervisors: [...supervisors, log.supervisor],
                    });
                }
            }
        } catch {
            // Non-critical
        }
    }

    return newLog;
}

/** Update a daily log in Firestore */
export async function updateDailyLogInFirestore(
    id: string,
    updates: Partial<DailyLog>,
    userId?: string
): Promise<DailyLog> {
    const uid = resolveUid(userId);
    const logRef = doc(db, 'users', uid, 'dailyLogs', id);
    const snap = await getDoc(logRef);
    if (!snap.exists()) throw new Error('Log not found');

    const existing = snap.data() as DailyLog;
    const updatedLog = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    await updateDoc(logRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
        _updatedAt: serverTimestamp(),
    });

    return updatedLog;
}

/** Delete a daily log from Firestore */
export async function deleteDailyLogFromFirestore(id: string, userId?: string): Promise<void> {
    const uid = resolveUid(userId);
    await deleteDoc(doc(db, 'users', uid, 'dailyLogs', id));
}

// ═══════════════════════════════════════════════════════
// ─── Competencies (Subcollection) ─────────────────────
// Path: users/{userId}/competencies/{competencyId}
// ═══════════════════════════════════════════════════════

/** Get the competencies subcollection reference for a user */
function competenciesCol(uid: string) {
    return collection(db, 'users', uid, 'competencies');
}

/** Fetch all competencies for a user from Firestore */
export async function getCompetenciesFromFirestore(userId: string): Promise<Competency[]> {
    const uid = resolveUid(userId);
    const q = query(competenciesCol(uid), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            userId: uid,
            date: data.date || '',
            activity: data.activity || '',
            areaCovered: data.areaCovered || '',
            outcome: data.outcome || '',
            evidenceType: data.evidenceType || '',
            evidenceUrl: data.evidenceUrl || '',
            evidenceLabel: data.evidenceLabel || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
        } as Competency;
    });
}

/** Add a competency to Firestore */
export async function addCompetencyToFirestore(
    competency: Omit<Competency, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Competency> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const uid = resolveUid(competency.userId);
    const newCompetency: Competency = {
        ...competency,
        userId: uid,
        id,
        createdAt: now,
        updatedAt: now,
    };
    const competencyRef = doc(db, 'users', uid, 'competencies', id);
    await setDoc(competencyRef, {
        ...newCompetency,
        _createdAt: serverTimestamp(),
        _updatedAt: serverTimestamp(),
    });

    return newCompetency;
}

/** Delete a competency from Firestore */
export async function deleteCompetencyFromFirestore(id: string, userId?: string): Promise<void> {
    const uid = resolveUid(userId);
    await deleteDoc(doc(db, 'users', uid, 'competencies', id));
}

// ═══════════════════════════════════════════════════════
// ─── Weekly Reports (Subcollection) ───────────────────
// Path: users/{userId}/weeklyReports/{reportId}
// ═══════════════════════════════════════════════════════

/** Get the weeklyReports subcollection reference for a user */
function weeklyReportsCol(uid: string) {
    return collection(db, 'users', uid, 'weeklyReports');
}

/** Fetch all weekly reports for a user from Firestore */
export async function getWeeklyReportsFromFirestore(userId: string): Promise<WeeklyReport[]> {
    const uid = resolveUid(userId);
    const q = query(weeklyReportsCol(uid), orderBy('weekStart', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            userId: uid,
            weekStart: data.weekStart,
            weekEnd: data.weekEnd,
            reflection: data.reflection || '',
            logs: data.logs || [],
            importedPdfUrl: data.importedPdfUrl || undefined,
            importedPdfName: data.importedPdfName || undefined,
            importedPdfUploadedAt: data.importedPdfUploadedAt || undefined,
            importedPdfPublicId: data.importedPdfPublicId || undefined,
            importedPdfResourceType: data.importedPdfResourceType || undefined,
            createdAt: data.createdAt || '',
        } as WeeklyReport;
    });
}

/** Save or update a weekly report in Firestore */
export async function saveWeeklyReportToFirestore(
    report: Omit<WeeklyReport, 'id' | 'createdAt'>
): Promise<WeeklyReport> {
    const uid = resolveUid(report.userId);

    // Check if a report already exists for this week
    const q = query(
        weeklyReportsCol(uid),
        where('weekStart', '==', report.weekStart)
    );
    const existing = await getDocs(q);

    let id: string;
    let createdAt: string;

    if (!existing.empty) {
        id = existing.docs[0].id;
        createdAt = existing.docs[0].data().createdAt || new Date().toISOString();
        await updateDoc(doc(db, 'users', uid, 'weeklyReports', id), {
            ...report,
            userId: uid,
            _updatedAt: serverTimestamp(),
        });
    } else {
        id = uuidv4();
        createdAt = new Date().toISOString();
        await setDoc(doc(db, 'users', uid, 'weeklyReports', id), {
            ...report,
            userId: uid,
            id,
            createdAt,
            _createdAt: serverTimestamp(),
            _updatedAt: serverTimestamp(),
        });
    }

    return { ...report, id, createdAt };
}

// ═══════════════════════════════════════════════════════
// ─── Migration: localStorage → Firestore ──────────────
// ═══════════════════════════════════════════════════════

/** Migrate all existing localStorage data to Firestore (subcollection architecture) */
export async function migrateLocalDataToFirestore(
    localUser: User,
    localLogs: DailyLog[],
    localReports: WeeklyReport[]
): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
        const existingUser = await getDoc(doc(db, 'users', uid));
        if (!existingUser.exists()) {
            await saveUserToFirestore({ ...localUser, id: uid });
        }

        // Migrate daily logs into subcollection
        const existingLogs = await getDailyLogsFromFirestore(uid);
        const existingLogDates = new Set(existingLogs.map((l) => l.entryDate));

        const batch = writeBatch(db);
        let batchCount = 0;

        for (const log of localLogs) {
            if (!existingLogDates.has(log.entryDate)) {
                const logRef = doc(db, 'users', uid, 'dailyLogs', log.id);
                batch.set(logRef, {
                    ...log,
                    userId: uid,
                    _createdAt: serverTimestamp(),
                    _updatedAt: serverTimestamp(),
                });
                batchCount++;
            }
            if (batchCount >= 490) break;
        }

        if (batchCount > 0) await batch.commit();

        // Migrate weekly reports into subcollection
        const existingReports = await getWeeklyReportsFromFirestore(uid);
        const existingWeeks = new Set(existingReports.map((r) => r.weekStart));

        const reportBatch = writeBatch(db);
        let reportBatchCount = 0;

        for (const report of localReports) {
            if (!existingWeeks.has(report.weekStart)) {
                const reportRef = doc(db, 'users', uid, 'weeklyReports', report.id);
                reportBatch.set(reportRef, {
                    ...report,
                    userId: uid,
                    _createdAt: serverTimestamp(),
                    _updatedAt: serverTimestamp(),
                });
                reportBatchCount++;
            }
            if (reportBatchCount >= 490) break;
        }

        if (reportBatchCount > 0) await reportBatch.commit();

        console.log(`[Firestore Migration] Migrated ${batchCount} logs, ${reportBatchCount} reports into subcollections`);
    } catch (err) {
        console.error('[Firestore Migration] Error:', err);
    }
}

// ═══════════════════════════════════════════════════════
// ─── Notifications (Subcollection) ────────────────────
// Path: users/{userId}/notifications/{notifId}
// ═══════════════════════════════════════════════════════

function notificationsCol(uid: string) {
    return collection(db, 'users', uid, 'notifications');
}

/** Fetch notifications for the current user */
export async function getNotificationsFromFirestore(
    userId: string,
    maxResults = 50
): Promise<Notification[]> {
    const uid = resolveUid(userId);
    const q = query(
        notificationsCol(uid),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            userId: uid,
            type: data.type,
            title: data.title,
            message: data.message,
            read: data.read ?? false,
            link: data.link || undefined,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt || '',
        } as Notification;
    });
}

/** Create a notification */
export async function createNotification(
    notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<Notification> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const uid = resolveUid(notification.userId);

    const newNotification: Notification = {
        ...notification,
        userId: uid,
        id,
        createdAt: now,
    };

    await setDoc(doc(db, 'users', uid, 'notifications', id), {
        ...newNotification,
        createdAt: serverTimestamp(),
    });

    return newNotification;
}

/** Mark a notification as read */
export async function markNotificationRead(notificationId: string, userId?: string): Promise<void> {
    const uid = resolveUid(userId);
    await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), {
        read: true,
    });
}

/** Mark all notifications as read for a user */
export async function markAllNotificationsRead(userId: string): Promise<void> {
    const uid = resolveUid(userId);
    const q = query(
        notificationsCol(uid),
        where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
    });
    await batch.commit();
}

/** Delete a notification */
export async function deleteNotification(notificationId: string, userId?: string): Promise<void> {
    const uid = resolveUid(userId);
    await deleteDoc(doc(db, 'users', uid, 'notifications', notificationId));
}

// ═══════════════════════════════════════════════════════
// ─── Supervisors (Top-Level — Shared) ─────────────────
// Path: supervisors/{supervisorId}
// ═══════════════════════════════════════════════════════

/** Get all supervisors */
export async function getSupervisorsFromFirestore(): Promise<Supervisor[]> {
    const snap = await getDocs(collection(db, 'supervisors'));
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name,
            email: data.email || undefined,
            department: data.department || undefined,
            addedBy: data.addedBy,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt || '',
        } as Supervisor;
    });
}

/** Add a supervisor */
export async function addSupervisorToFirestore(
    supervisor: Omit<Supervisor, 'id' | 'createdAt'>
): Promise<Supervisor> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const newSupervisor: Supervisor = {
        ...supervisor,
        id,
        createdAt: now,
    };

    await setDoc(doc(db, 'supervisors', id), {
        ...newSupervisor,
        createdAt: serverTimestamp(),
    });

    return newSupervisor;
}

/** Delete a supervisor */
export async function deleteSupervisorFromFirestore(supervisorId: string): Promise<void> {
    await deleteDoc(doc(db, 'supervisors', supervisorId));
}

// ═══════════════════════════════════════════════════════
// ─── One-Time Migration: Flat → Subcollections ────────
// Reads old top-level dailyLogs/weeklyReports/notifications
// and copies them into users/{uid}/... subcollections.
// Safe to call multiple times — skips already-migrated docs.
// ═══════════════════════════════════════════════════════

export async function migrateFromFlatToSubcollections(): Promise<{ logs: number; reports: number; notifs: number }> {
    const uid = auth.currentUser?.uid;
    if (!uid) return { logs: 0, reports: 0, notifs: 0 };

    const result = { logs: 0, reports: 0, notifs: 0 };

    try {
        // ─── Daily Logs ────────────────────────────────
        const oldLogs = await getDocs(
            query(collection(db, 'dailyLogs'), where('userId', '==', uid))
        );
        if (!oldLogs.empty) {
            const existingSubLogs = await getDocs(dailyLogsCol(uid));
            const existingIds = new Set(existingSubLogs.docs.map(d => d.id));

            const batch = writeBatch(db);
            let count = 0;
            for (const d of oldLogs.docs) {
                if (d.id === '_schema_' || existingIds.has(d.id)) continue;
                batch.set(doc(db, 'users', uid, 'dailyLogs', d.id), d.data());
                count++;
                if (count >= 490) break;
            }
            if (count > 0) {
                await batch.commit();
                result.logs = count;
            }
        }

        // ─── Weekly Reports ────────────────────────────
        const oldReports = await getDocs(
            query(collection(db, 'weeklyReports'), where('userId', '==', uid))
        );
        if (!oldReports.empty) {
            const existingSub = await getDocs(weeklyReportsCol(uid));
            const existingIds = new Set(existingSub.docs.map(d => d.id));

            const batch = writeBatch(db);
            let count = 0;
            for (const d of oldReports.docs) {
                if (d.id === '_schema_' || existingIds.has(d.id)) continue;
                batch.set(doc(db, 'users', uid, 'weeklyReports', d.id), d.data());
                count++;
                if (count >= 490) break;
            }
            if (count > 0) {
                await batch.commit();
                result.reports = count;
            }
        }

        // ─── Notifications ─────────────────────────────
        const oldNotifs = await getDocs(
            query(collection(db, 'notifications'), where('userId', '==', uid))
        );
        if (!oldNotifs.empty) {
            const existingSub = await getDocs(notificationsCol(uid));
            const existingIds = new Set(existingSub.docs.map(d => d.id));

            const batch = writeBatch(db);
            let count = 0;
            for (const d of oldNotifs.docs) {
                if (d.id === '_schema_' || existingIds.has(d.id)) continue;
                batch.set(doc(db, 'users', uid, 'notifications', d.id), d.data());
                count++;
                if (count >= 490) break;
            }
            if (count > 0) {
                await batch.commit();
                result.notifs = count;
            }
        }

        if (result.logs > 0 || result.reports > 0 || result.notifs > 0) {
            console.log(`[Migration] Flat→Subcollections: ${result.logs} logs, ${result.reports} reports, ${result.notifs} notifications`);
        }
    } catch (err) {
        console.error('[Migration] Flat→Subcollections error:', err);
    }

    return result;
}
