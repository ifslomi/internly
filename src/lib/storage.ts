import { User, DailyLog, WeeklyReport, Competency } from './types';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
    USERS: 'internly_users',
    CURRENT_USER: 'internly_current_user',
    DAILY_LOGS: 'internly_daily_logs',
    WEEKLY_REPORTS: 'internly_weekly_reports',
    COMPETENCIES: 'internly_competencies',
    REMEMBER_ME: 'internly_remember_me',
    PENDING_SIGNUP: 'internly_pending_signup',
};

export interface PendingSignup {
    name: string;
    email: string;
    password: string;
    totalRequiredHours: number;
    startDate: string;
    verificationToken: string;
    tokenExpiresAt: number;
    googleUid?: string;
    profileImage?: string;
}

function getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
}

function setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
}

// --- Auth ---
export function signUp(
    name: string,
    email: string,
    password: string,
    totalRequiredHours: number,
    startDate: string
): User {
    const users = getItem<User[]>(KEYS.USERS, []);
    if (users.find((u) => u.email === email)) {
        throw new Error('An account with this email already exists.');
    }
    const user: User = {
        id: uuidv4(),
        name,
        email,
        password,
        totalRequiredHours,
        startDate,
        createdAt: new Date().toISOString(),
        supervisors: [],
        reminderEnabled: true,
    };
    users.push(user);
    setItem(KEYS.USERS, users);
    setItem(KEYS.CURRENT_USER, user);
    return user;
}

export function login(email: string, password: string, rememberMe: boolean): User {
    const users = getItem<User[]>(KEYS.USERS, []);
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    setItem(KEYS.CURRENT_USER, user);
    if (rememberMe) setItem(KEYS.REMEMBER_ME, email);
    else localStorage.removeItem(KEYS.REMEMBER_ME);
    return user;
}

export function logout(): void {
    localStorage.removeItem(KEYS.CURRENT_USER);
}

export function getCurrentUser(): User | null {
    return getItem<User | null>(KEYS.CURRENT_USER, null);
}

export function getRememberedEmail(): string {
    return getItem<string>(KEYS.REMEMBER_ME, '');
}

export function findUserByEmail(email: string): User | null {
    const users = getItem<User[]>(KEYS.USERS, []);
    return users.find((u) => u.email === email) || null;
}

export function storePendingSignup(data: PendingSignup): void {
    setItem(KEYS.PENDING_SIGNUP, data);
}

export function getPendingSignup(): PendingSignup | null {
    return getItem<PendingSignup | null>(KEYS.PENDING_SIGNUP, null);
}

export function clearPendingSignup(): void {
    if (typeof window !== 'undefined') localStorage.removeItem(KEYS.PENDING_SIGNUP);
}

export function completeSignUp(pending: PendingSignup, firebaseUid: string): User {
    const users = getItem<User[]>(KEYS.USERS, []);
    const existing = users.find((u) => u.email === pending.email);
    if (existing) {
        setItem(KEYS.CURRENT_USER, existing);
        return existing;
    }
    const user: User = {
        id: firebaseUid,
        name: pending.name,
        email: pending.email,
        password: pending.password,
        totalRequiredHours: pending.totalRequiredHours,
        startDate: pending.startDate,
        createdAt: new Date().toISOString(),
        supervisors: [],
        reminderEnabled: true,
        profileImage: pending.profileImage,
    };
    users.push(user);
    setItem(KEYS.USERS, users);
    setItem(KEYS.CURRENT_USER, user);
    return user;
}

export function loginByEmail(email: string, rememberMe: boolean): User {
    const users = getItem<User[]>(KEYS.USERS, []);
    const user = users.find((u) => u.email === email);
    if (!user) throw new Error('User not found. Please sign up first.');
    setItem(KEYS.CURRENT_USER, user);
    if (rememberMe) setItem(KEYS.REMEMBER_ME, email);
    else localStorage.removeItem(KEYS.REMEMBER_ME);
    return user;
}

export function googleSignIn(
    name: string,
    email: string,
    profileImage?: string,
    googleId?: string
): User {
    const users = getItem<User[]>(KEYS.USERS, []);
    const existing = users.find((u) => u.email === email);
    if (existing) {
        // Update profile image if provided
        if (profileImage && !existing.profileImage) {
            existing.profileImage = profileImage;
            const idx = users.findIndex((u) => u.id === existing.id);
            users[idx] = existing;
            setItem(KEYS.USERS, users);
        }
        setItem(KEYS.CURRENT_USER, existing);
        return existing;
    }
    // Create new user from Google profile
    const user: User = {
        id: googleId || uuidv4(),
        name,
        email,
        password: '',
        totalRequiredHours: 480,
        startDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        supervisors: [],
        reminderEnabled: true,
        profileImage,
    };
    users.push(user);
    setItem(KEYS.USERS, users);
    setItem(KEYS.CURRENT_USER, user);
    return user;
}

export function updateUser(updates: Partial<User>): User {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const users = getItem<User[]>(KEYS.USERS, []);
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) throw new Error('User not found');
    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    setItem(KEYS.USERS, users);
    setItem(KEYS.CURRENT_USER, updated);
    return updated;
}

// --- Daily Logs ---
export function getDailyLogs(userId: string): DailyLog[] {
    return getItem<DailyLog[]>(KEYS.DAILY_LOGS, []).filter((l) => l.userId === userId);
}

export function addDailyLog(log: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>): DailyLog {
    const logs = getItem<DailyLog[]>(KEYS.DAILY_LOGS, []);
    const newLog: DailyLog = {
        ...log,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    logs.push(newLog);
    setItem(KEYS.DAILY_LOGS, logs);

    // Auto-save supervisor
    if (log.supervisor) {
        const user = getCurrentUser();
        if (user && !user.supervisors.includes(log.supervisor)) {
            updateUser({ supervisors: [...user.supervisors, log.supervisor] });
        }
    }

    return newLog;
}

export function updateDailyLog(id: string, updates: Partial<DailyLog>): DailyLog {
    const logs = getItem<DailyLog[]>(KEYS.DAILY_LOGS, []);
    const idx = logs.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Log not found');
    logs[idx] = { ...logs[idx], ...updates, updatedAt: new Date().toISOString() };
    setItem(KEYS.DAILY_LOGS, logs);
    return logs[idx];
}

export function deleteDailyLog(id: string): void {
    const logs = getItem<DailyLog[]>(KEYS.DAILY_LOGS, []);
    setItem(
        KEYS.DAILY_LOGS,
        logs.filter((l) => l.id !== id)
    );
}

// --- Weekly Reports ---
export function getWeeklyReports(userId: string): WeeklyReport[] {
    return getItem<WeeklyReport[]>(KEYS.WEEKLY_REPORTS, []).filter((r) => r.userId === userId);
}

export function saveWeeklyReport(report: Omit<WeeklyReport, 'id' | 'createdAt'>): WeeklyReport {
    const reports = getItem<WeeklyReport[]>(KEYS.WEEKLY_REPORTS, []);
    // Check if a report already exists for this week
    const existingIdx = reports.findIndex(
        (r) => r.userId === report.userId && r.weekStart === report.weekStart
    );
    const newReport: WeeklyReport = {
        ...report,
        id: existingIdx >= 0 ? reports[existingIdx].id : uuidv4(),
        createdAt: existingIdx >= 0 ? reports[existingIdx].createdAt : new Date().toISOString(),
    };
    if (existingIdx >= 0) {
        reports[existingIdx] = newReport;
    } else {
        reports.push(newReport);
    }
    setItem(KEYS.WEEKLY_REPORTS, reports);
    return newReport;
}

// --- Competencies ---
export function getCompetencies(userId: string): Competency[] {
    return getItem<Competency[]>(KEYS.COMPETENCIES, []).filter((c) => c.userId === userId);
}

export function addCompetency(competency: Omit<Competency, 'id' | 'createdAt' | 'updatedAt'>): Competency {
    const competencies = getItem<Competency[]>(KEYS.COMPETENCIES, []);
    const now = new Date().toISOString();
    const newCompetency: Competency = {
        ...competency,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
    };
    competencies.push(newCompetency);
    setItem(KEYS.COMPETENCIES, competencies);
    return newCompetency;
}

export function deleteCompetency(id: string): void {
    const competencies = getItem<Competency[]>(KEYS.COMPETENCIES, []);
    setItem(
        KEYS.COMPETENCIES,
        competencies.filter((c) => c.id !== id)
    );
}

// ═══════════════════════════════════════════════════════
// ─── Cache helpers (used by context for Firestore sync) ─
// ═══════════════════════════════════════════════════════

/** Cache a Firestore user into localStorage for fast local reads */
export function cacheUser(user: User): void {
    const users = getItem<User[]>(KEYS.USERS, []);
    const idx = users.findIndex((u) => u.id === user.id || u.email === user.email);
    if (idx >= 0) {
        users[idx] = { ...users[idx], ...user };
    } else {
        users.push(user);
    }
    setItem(KEYS.USERS, users);
    setItem(KEYS.CURRENT_USER, user);
}

/** Cache daily logs from Firestore into localStorage */
export function cacheDailyLogs(userId: string, firestoreLogs: DailyLog[]): void {
    const allLogs = getItem<DailyLog[]>(KEYS.DAILY_LOGS, []);
    // Remove existing logs for this user, replace with Firestore data
    const otherLogs = allLogs.filter((l) => l.userId !== userId);
    setItem(KEYS.DAILY_LOGS, [...otherLogs, ...firestoreLogs]);
}

/** Cache competencies from Firestore into localStorage */
export function cacheCompetencies(userId: string, firestoreCompetencies: Competency[]): void {
    const allCompetencies = getItem<Competency[]>(KEYS.COMPETENCIES, []);
    const otherCompetencies = allCompetencies.filter((c) => c.userId !== userId);
    setItem(KEYS.COMPETENCIES, [...otherCompetencies, ...firestoreCompetencies]);
}

/** Replace a daily log ID (used when Firestore assigns a different ID than local) */
export function replaceDailyLogId(oldId: string, newId: string): void {
    const logs = getItem<DailyLog[]>(KEYS.DAILY_LOGS, []);
    const idx = logs.findIndex((l) => l.id === oldId);
    if (idx >= 0) {
        logs[idx] = { ...logs[idx], id: newId };
        setItem(KEYS.DAILY_LOGS, logs);
    }
}

/** Replace a competency ID (used when Firestore assigns a different ID than local) */
export function replaceCompetencyId(oldId: string, newId: string): void {
    const competencies = getItem<Competency[]>(KEYS.COMPETENCIES, []);
    const idx = competencies.findIndex((c) => c.id === oldId);
    if (idx >= 0) {
        competencies[idx] = { ...competencies[idx], id: newId };
        setItem(KEYS.COMPETENCIES, competencies);
    }
}

/** Set the remembered email */
export function setRememberedEmail(email: string): void {
    setItem(KEYS.REMEMBER_ME, email);
}

/** Clear the remembered email */
export function clearRememberedEmail(): void {
    if (typeof window !== 'undefined') localStorage.removeItem(KEYS.REMEMBER_ME);
}
