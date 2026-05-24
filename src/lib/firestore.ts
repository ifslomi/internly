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
    runTransaction,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { User, DailyLog, WeeklyReport, Notification, Supervisor, Competency } from './types';
import { compareStudentsBySurnameFirst } from './student-display';
import { v4 as uuidv4 } from 'uuid';

// ─── Helper: resolve current UID ────────────────────────
function resolveUid(fallback?: string): string {
    return fallback || auth.currentUser?.uid || '';
}

function isPermissionDeniedError(err: unknown): boolean {
    const code = (err as { code?: string } | null)?.code || '';
    const message = ((err as { message?: string } | null)?.message || '').toLowerCase();

    return (
        code === 'permission-denied' ||
        code === 'firestore/permission-denied' ||
        message.includes('missing or insufficient permissions')
    );
}

function stripUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => stripUndefinedDeep(item)) as T;
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, nestedValue]) => nestedValue !== undefined)
            .map(([key, nestedValue]) => [key, stripUndefinedDeep(nestedValue)]);
        return Object.fromEntries(entries) as T;
    }

    return value;
}

function getCurrentLocalDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeDateKey(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        role: user.role || 'intern',
        id: uid,
        name: user.name,
        fullName: user.fullName || null,
        classNumber: user.classNumber || null,
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
        id: snap.id,
        name: data.name || '',
        role: data.role || 'intern',
        fullName: data.fullName || undefined,
        classNumber: data.classNumber || undefined,
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
        totalRequiredHours: data.totalRequiredHours || 486,
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
        id: snap.docs[0].id,
        name: data.name || '',
        role: data.role || 'intern',
        fullName: data.fullName || undefined,
        classNumber: data.classNumber || undefined,
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
        totalRequiredHours: data.totalRequiredHours || 486,
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

/** Update a competency in Firestore */
export async function updateCompetencyInFirestore(
    id: string,
    updates: Partial<Pick<Competency, 'date' | 'activity' | 'areaCovered' | 'outcome' | 'evidenceType' | 'evidenceUrl' | 'evidenceLabel'>>,
    userId?: string
): Promise<void> {
    const uid = resolveUid(userId);
    await updateDoc(doc(db, 'users', uid, 'competencies', id), {
        ...updates,
        updatedAt: new Date().toISOString(),
        _updatedAt: serverTimestamp(),
    });
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
    const [subcollectionSnap, legacySnap] = await Promise.all([
        getDocs(weeklyReportsCol(uid)),
        getDocs(query(collection(db, 'weeklyReports'), where('userId', '==', uid))),
    ]);

    const reports = [...subcollectionSnap.docs, ...legacySnap.docs].map((d) => {
        const data = d.data();
        return {
            id: d.id,
            userId: data.userId || uid,
            weekNumber: data.weekNumber || 0,
            weekStart: data.weekStart,
            weekEnd: data.weekEnd,
            deadline: data.deadline || data.weekEnd || '',
            hoursRendered: data.hoursRendered || 0,
            fileUrl: data.fileUrl || data.importedPdfUrl || '',
            fileName: data.fileName || data.importedPdfName || '',
            filePublicId: data.filePublicId || data.importedPdfPublicId || undefined,
            submittedAt: data.submittedAt || data.importedPdfUploadedAt || data.createdAt || '',
            status: data.status || 'submitted',
            reflection: data.reflection || '',
            logs: data.logs || [],
            importedPdfUrl: data.importedPdfUrl || data.fileUrl || undefined,
            importedPdfName: data.importedPdfName || data.fileName || undefined,
            importedPdfUploadedAt: data.importedPdfUploadedAt || data.submittedAt || undefined,
            importedPdfPublicId: data.importedPdfPublicId || data.filePublicId || undefined,
            importedPdfResourceType: data.importedPdfResourceType || 'raw',
            createdAt: data.createdAt || '',
        } as WeeklyReport;
    });

    return reports.sort((a, b) => {
        const aDate = a.submittedAt || a.createdAt || '';
        const bDate = b.submittedAt || b.createdAt || '';

        if (aDate !== bDate) {
            return bDate.localeCompare(aDate);
        }

        return b.weekNumber - a.weekNumber;
    });
}

/** Save or update a weekly report in Firestore */
export async function saveWeeklyReportToFirestore(
    report: Omit<WeeklyReport, 'id' | 'createdAt'>
): Promise<WeeklyReport> {
    const uid = resolveUid(report.userId);
    const weekNumber = report.weekNumber;
    const id = `week-${String(weekNumber).padStart(2, '0')}`;
    const reportRef = doc(db, 'users', uid, 'weeklyReports', id);
    const existing = await getDoc(reportRef);

    if (existing.exists()) {
        throw new Error(`Weekly report for Week ${weekNumber} has already been submitted.`);
    }

    const createdAt = report.submittedAt || new Date().toISOString();
    const normalizedReport = stripUndefinedDeep({
        ...report,
        userId: uid,
        id,
        createdAt,
        submittedAt: report.submittedAt || createdAt,
        status: 'submitted' as const,
        importedPdfUrl: report.importedPdfUrl || report.fileUrl,
        importedPdfName: report.importedPdfName || report.fileName,
        importedPdfUploadedAt: report.importedPdfUploadedAt || report.submittedAt || createdAt,
        importedPdfPublicId: report.importedPdfPublicId || report.filePublicId,
        importedPdfResourceType: report.importedPdfResourceType || 'raw',
        _createdAt: serverTimestamp(),
        _updatedAt: serverTimestamp(),
    });

    await setDoc(reportRef, normalizedReport);

    return normalizedReport;
}

export async function updateWeeklyReportInFirestore(
    userId: string,
    reportId: string,
    updates: Partial<Pick<WeeklyReport, 'hoursRendered'>>
): Promise<WeeklyReport> {
    const uid = resolveUid(userId);
    const reportRef = doc(db, 'users', uid, 'weeklyReports', reportId);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
        throw new Error('Weekly report not found.');
    }

    const payload = stripUndefinedDeep({
        ...updates,
        _updatedAt: serverTimestamp(),
    });

    await updateDoc(reportRef, payload);

    const refreshed = await getDoc(reportRef);
    const data = refreshed.data() || {};

    return {
        id: refreshed.id,
        userId: data.userId || uid,
        weekNumber: data.weekNumber || 0,
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        deadline: data.deadline || data.weekEnd || '',
        hoursRendered: data.hoursRendered || 0,
        fileUrl: data.fileUrl || data.importedPdfUrl || '',
        fileName: data.fileName || data.importedPdfName || '',
        filePublicId: data.filePublicId || data.importedPdfPublicId || undefined,
        submittedAt: data.submittedAt || data.importedPdfUploadedAt || data.createdAt || '',
        status: data.status || 'submitted',
        reflection: data.reflection || '',
        logs: data.logs || [],
        importedPdfUrl: data.importedPdfUrl || data.fileUrl || undefined,
        importedPdfName: data.importedPdfName || data.fileName || undefined,
        importedPdfUploadedAt: data.importedPdfUploadedAt || data.submittedAt || undefined,
        importedPdfPublicId: data.importedPdfPublicId || data.filePublicId || undefined,
        importedPdfResourceType: data.importedPdfResourceType || 'raw',
        createdAt: data.createdAt || '',
    } as WeeklyReport;
}

export async function deleteWeeklyReportFromFirestore(userId: string, reportId: string): Promise<void> {
    const uid = resolveUid(userId);
    await deleteDoc(doc(db, 'users', uid, 'weeklyReports', reportId));
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

// ═══════════════════════════════════════════════════════
// ─── Dean Functions ──────────────────────────────────
// ═══════════════════════════════════════════════════════

import type { Sanction, DutySlot, SanctionRender, DeanNotification } from './types';

/** Get all students (interns) from Firestore */
export async function getAllStudentsFromFirestore(): Promise<User[]> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'intern'));
        const snap = await getDocs(q);
        console.log('[Firestore] getAllStudentsFromFirestore - Found', snap.docs.length, 'interns with role=intern');

        const interns = snap.docs.map((doc) => {
            const data = doc.data();
            console.log('[Firestore] Student:', { name: data.name, email: data.email, role: data.role || 'not-set' });
            return {
                id: doc.id,
                name: data.name || '',
                fullName: data.fullName,
                classNumber: data.classNumber,
                email: data.email || '',
                password: '',
                role: data.role || 'intern',
                address: data.address,
                phoneNumber: data.phoneNumber,
                contact: data.contact,
                guardianEmail: data.guardianEmail,
                guardianPhone: data.guardianPhone,
                guardian: data.guardian,
                course: data.course,
                department: data.department,
                companyName: data.companyName,
                companyAddress: data.companyAddress,
                companyContactNumber: data.companyContactNumber,
                companyEmail: data.companyEmail,
                company: data.company,
                totalRequiredHours: data.totalRequiredHours || 0,
                startDate: data.startDate || new Date().toISOString(),
                endDate: data.endDate,
                createdAt: data.createdAt || new Date().toISOString(),
                supervisors: data.supervisors || [],
                reminderEnabled: data.reminderEnabled ?? true,
                profileImage: data.profileImage,
            };
        });

        interns.sort(compareStudentsBySurnameFirst);

        console.log('[Firestore] Returning', interns.length, 'interns after filtering');
        return interns;
    } catch (err) {
        console.error('[Firestore] Error fetching students from Firestore:', err);
        return [];
    }
}

export async function getSanctionsForStudent(studentId: string, studentEmail?: string): Promise<Sanction[]> {
    try {
        const sanctionsRef = collection(db, 'sanctions');
        const queries = [query(sanctionsRef, where('userId', '==', studentId))];

        if (studentEmail) {
            queries.push(query(sanctionsRef, where('userEmail', '==', studentEmail)));
        }

        const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
        const seenIds = new Set<string>();
        const sanctions = snapshots.flatMap((snap) =>
            snap.docs
                .filter((doc) => {
                    if (seenIds.has(doc.id)) return false;
                    seenIds.add(doc.id);
                    return true;
                })
                .map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        userId: data.userId,
                        userEmail: data.userEmail,
                        deanId: data.deanId,
                        days: data.days || (data.type ? 1 : 0),
                        reason: data.reason,
                        description: data.description,
                        issuedDate: data.issuedDate,
                        status: data.status || 'active',
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt,
                    };
                })
        );

        return sanctions.sort((a, b) => {
            const left = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt || a.issuedDate || 0).getTime();
            const right = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt || b.issuedDate || 0).getTime();
            return right - left;
        });
    } catch (err) {
        if (isPermissionDeniedError(err)) {
            return [];
        }
        console.error('Error fetching sanctions:', err);
        return [];
    }
}

/** Save a new sanction */
export async function saveSanctionToFirestore(sanction: Omit<Sanction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const sanctionsRef = collection(db, 'sanctions');
        const newId = uuidv4();
        const docRef = doc(sanctionsRef, newId);
        
        await setDoc(docRef, {
            ...sanction,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        return newId;
    } catch (err) {
        console.error('Error saving sanction:', err);
        throw err;
    }
}

/** Update sanction days by reducing them */
export async function updateSanctionDaysInFirestore(sanctionId: string, newDays: number): Promise<void> {
    try {
        const sanctionRef = doc(db, 'sanctions', sanctionId);
        await updateDoc(sanctionRef, {
            days: newDays,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Error updating sanction days:', err);
        throw err;
    }
}

/** Update sanction fields (for dean corrections) */
export async function updateSanctionInFirestore(
    sanctionId: string,
    updates: Partial<Pick<Sanction, 'days' | 'reason' | 'description' | 'status'>>
): Promise<void> {
    try {
        const sanctionRef = doc(db, 'sanctions', sanctionId);
        await updateDoc(sanctionRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Error updating sanction:', err);
        throw err;
    }
}

/** Get all duty slots */
export async function getDutySlotsFromFirestore(): Promise<DutySlot[]> {
    try {
        const slotsRef = collection(db, 'dutySlots');
        const q = query(slotsRef, orderBy('date', 'asc'));
        const snap = await getDocs(q);
        
        return snap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                deanId: data.deanId,
                title: data.title,
                description: data.description,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                location: data.location,
                capacity: data.capacity,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            };
        });
    } catch (err) {
        if (isPermissionDeniedError(err)) {
            return [];
        }
        console.error('Error fetching duty slots:', err);
        return [];
    }
}

/** Create a new duty slot */
export async function createDutySlotInFirestore(dutySlot: Omit<DutySlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const dutySlotDateKey = normalizeDateKey(dutySlot.date || '');
        const todayDateKey = getCurrentLocalDateKey();
        if (!dutySlotDateKey || dutySlotDateKey < todayDateKey) {
            throw { code: 'sanction/past-duty-slot', message: 'Past dates are not allowed for duty slots.' };
        }

        const slotsRef = collection(db, 'dutySlots');
        const newId = uuidv4();
        const docRef = doc(slotsRef, newId);
        
        await setDoc(docRef, {
            ...dutySlot,
            date: dutySlotDateKey,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        return newId;
    } catch (err) {
        console.error('Error creating duty slot:', err);
        throw err;
    }
}

/** Get sanction renders for a duty slot or user */
export async function getSanctionRendersFromFirestore(filters?: { dutySlotId?: string; userId?: string }): Promise<SanctionRender[]> {
    try {
        const rendersRef = collection(db, 'sanctionRenders');
        let q: any = rendersRef;
        
        const whereConditions: any[] = [];
        if (filters?.dutySlotId) {
            whereConditions.push(where('dutySlotId', '==', filters.dutySlotId));
        }
        if (filters?.userId) {
            whereConditions.push(where('userId', '==', filters.userId));
        }
        
        if (whereConditions.length > 0) {
            q = query(rendersRef, ...whereConditions, orderBy('createdAt', 'desc'));
        } else {
            q = query(rendersRef, orderBy('createdAt', 'desc'));
        }
        
        const snap = await getDocs(q);
        
        return snap.docs.map((doc) => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                sanctionId: data.sanctionId,
                userId: data.userId,
                dutySlotId: data.dutySlotId,
                status: data.status || 'available',
                attendanceDate: data.attendanceDate,
                hoursCompleted: data.hoursCompleted,
                notes: data.notes,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            };
        });
    } catch (err) {
        console.error('Error fetching sanction renders:', err);
        return [];
    }
}

/** Create a sanction render */
export async function createSanctionRenderInFirestore(render: Omit<SanctionRender, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const dutySlotRef = doc(db, 'dutySlots', render.dutySlotId);
        const dutySlotSnapshot = await getDoc(dutySlotRef);
        if (!dutySlotSnapshot.exists()) {
            throw { code: 'sanction/duty-slot-not-found', message: 'Duty slot not found.' };
        }

        const dutySlotData = dutySlotSnapshot.data() as { date?: string };
        const dutySlotDateKey = normalizeDateKey(dutySlotData?.date || '');
        const todayDateKey = getCurrentLocalDateKey();
        if (!dutySlotDateKey || dutySlotDateKey < todayDateKey) {
            throw { code: 'sanction/past-duty-slot', message: 'Past duty slots are closed.' };
        }

        const rendersRef = collection(db, 'sanctionRenders');
        const existingRenderQuery = query(
            rendersRef,
            where('userId', '==', render.userId),
            where('dutySlotId', '==', render.dutySlotId),
            limit(1)
        );
        const existingRenderSnapshot = await getDocs(existingRenderQuery);
        if (!existingRenderSnapshot.empty) {
            throw { code: 'sanction/already-enrolled', message: 'Student is already enrolled in this duty slot.' };
        }

        const renderDocId = `${render.dutySlotId}_${render.userId}`;
        const docRef = doc(rendersRef, renderDocId);

        await runTransaction(db, async (transaction) => {
            const renderDoc = await transaction.get(docRef);
            if (renderDoc.exists()) {
                throw { code: 'sanction/already-enrolled', message: 'Student is already enrolled in this duty slot.' };
            }

            transaction.set(docRef, {
                ...render,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });

        return renderDocId;
    } catch (err) {
        console.error('Error creating sanction render:', err);
        throw err;
    }
}

/** Update sanction render status */
export async function updateSanctionRenderStatus(renderId: string, status: SanctionRender['status'], updates?: Partial<SanctionRender>): Promise<void> {
    try {
        const renderRef = doc(db, 'sanctionRenders', renderId);
        await updateDoc(renderRef, {
            status,
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Error updating sanction render:', err);
        throw err;
    }
}

/** Create a dean notification for all interns */
export async function createDeanNotificationForAllInterns(notification: Omit<DeanNotification, 'id' | 'createdAt'>): Promise<void> {
    try {
        const students = await getAllStudentsFromFirestore();
        
        for (const student of students) {
            const notifRef = doc(collection(db, 'users', student.id, 'notifications'));
            await setDoc(notifRef, {
                ...notification,
                userId: student.id,
                createdAt: serverTimestamp(),
            });
        }
    } catch (err) {
        console.error('Error creating dean notification:', err);
        throw err;
    }
}
