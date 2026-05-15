'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { User, DailyLog, WeeklyReport, HourStats, Competency } from './types';
import * as storage from './storage';
import { calculateHourStats } from './calculations';
import {
    saveUserToFirestore,
    getUserFromFirestore,
    updateUserInFirestore,
    getDailyLogsFromFirestore,
    addDailyLogToFirestore,
    updateDailyLogInFirestore,
    deleteDailyLogFromFirestore,
    getCompetenciesFromFirestore,
    addCompetencyToFirestore,
    deleteCompetencyFromFirestore,
    getWeeklyReportsFromFirestore,
    saveWeeklyReportToFirestore,
    migrateLocalDataToFirestore,
    migrateFromFlatToSubcollections,
} from './firestore';
import { auth } from './firebase';

interface AppContextType {
    user: User | null;
    logs: DailyLog[];
    competencies: Competency[];
    stats: HourStats;
    loading: boolean;
    signUp: (name: string, email: string, password: string, hours: number, startDate: string) => Promise<void>;
    login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => Promise<void>;
    addLog: (log: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateLog: (id: string, updates: Partial<DailyLog>) => Promise<void>;
    deleteLog: (id: string) => Promise<void>;
    addCompetency: (competency: Omit<Competency, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    deleteCompetency: (id: string) => Promise<void>;
    refreshData: () => Promise<void>;
    signUpWithGoogle: (password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    verifyCode: (code: string) => Promise<void>;
    resendCode: () => Promise<void>;
    saveWeeklyReport: (report: Omit<WeeklyReport, 'id' | 'createdAt'>) => Promise<WeeklyReport>;
    getWeeklyReports: (userId: string) => Promise<WeeklyReport[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const emptyStats: HourStats = {
    totalRequired: 0,
    totalRendered: 0,
    hoursThisWeek: 0,
    remaining: 0,
    progressPercentage: 0,
    weeklyAverage: 0,
    daysLogged: 0,
};

const isUbEmail = (value: string) => value.trim().toLowerCase().endsWith('@ub.edu.ph');

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    const [stats, setStats] = useState<HourStats>(emptyStats);
    const [loading, setLoading] = useState(true);
    const initializedRef = useRef(false);

    // ─── Refresh: Firestore is the source of truth ──────
    const refreshData = useCallback(async () => {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
            // Fall back to localStorage-only (offline / legacy)
            const localUser = storage.getCurrentUser();
            setUser(localUser);
            if (localUser) {
                const localLogs = storage.getDailyLogs(localUser.id);
                setLogs(localLogs);
                const localCompetencies = storage.getCompetencies(localUser.id);
                setCompetencies(localCompetencies);
                setStats(calculateHourStats(localLogs, localUser.totalRequiredHours));
            } else {
                setLogs([]);
                setCompetencies([]);
                setStats(emptyStats);
            }
            return;
        }

        try {
            // Load user from Firestore
            let firestoreUser = await getUserFromFirestore(firebaseUser.uid);

            if (!firestoreUser) {
                // New login on another device or first time — check localStorage for migration
                const localUser = storage.getCurrentUser();
                if (localUser) {
                    const localLogs = storage.getDailyLogs(localUser.id);
                    const localReports = storage.getWeeklyReports(localUser.id);
                    await migrateLocalDataToFirestore(localUser, localLogs, localReports);
                    firestoreUser = await getUserFromFirestore(firebaseUser.uid);
                }
            }

            if (firestoreUser) {
                // Cache to localStorage
                storage.cacheUser(firestoreUser);
                setUser(firestoreUser);

                // One-time migration: flat collections → subcollections
                try {
                    await migrateFromFlatToSubcollections();
                } catch { /* non-critical */ }

                // Load logs from Firestore (now from subcollections)
                const firestoreLogs = await getDailyLogsFromFirestore(firebaseUser.uid);
                storage.cacheDailyLogs(firestoreUser.id, firestoreLogs);
                setLogs(firestoreLogs);
                setStats(calculateHourStats(firestoreLogs, firestoreUser.totalRequiredHours));

                const firestoreCompetencies = await getCompetenciesFromFirestore(firebaseUser.uid);
                storage.cacheCompetencies(firestoreUser.id, firestoreCompetencies);
                setCompetencies(firestoreCompetencies);
            } else {
                setUser(null);
                setLogs([]);
                setCompetencies([]);
                setStats(emptyStats);
            }
        } catch (err) {
            console.error('[Context] Error loading from Firestore, falling back to cache:', err);
            // Fall back to localStorage cache
            const localUser = storage.getCurrentUser();
            setUser(localUser);
            if (localUser) {
                const localLogs = storage.getDailyLogs(localUser.id);
                setLogs(localLogs);
                const localCompetencies = storage.getCompetencies(localUser.id);
                setCompetencies(localCompetencies);
                setStats(calculateHourStats(localLogs, localUser.totalRequiredHours));
            } else {
                setCompetencies([]);
            }
        }
    }, []);

    // ─── Auth state listener ────────────────────────────
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await refreshData();
            } else {
                // Check if there's a localStorage-only session (legacy)
                const localUser = storage.getCurrentUser();
                if (localUser) {
                    setUser(localUser);
                    const localLogs = storage.getDailyLogs(localUser.id);
                    setLogs(localLogs);
                    const localCompetencies = storage.getCompetencies(localUser.id);
                    setCompetencies(localCompetencies);
                    setStats(calculateHourStats(localLogs, localUser.totalRequiredHours));
                } else {
                    setUser(null);
                    setLogs([]);
                    setCompetencies([]);
                    setStats(emptyStats);
                }
            }
            if (!initializedRef.current) {
                initializedRef.current = true;
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [refreshData]);

    // ─── Sign Up ────────────────────────────────────────
    const handleSignUp = async (name: string, email: string, password: string, hours: number, startDate: string) => {
        if (!isUbEmail(email)) {
            throw new Error('Please use your @ub.edu.ph email address.');
        }
        // Check localStorage for existing account (quick check)
        const existingLocal = storage.findUserByEmail(email);
        if (existingLocal) {
            throw new Error('An account with this email already exists.');
        }

        // Note: We don't check Firestore here because the user isn't authenticated yet.
        // Firebase Auth will reject duplicate emails when createUserWithEmailAndPassword is called.

        const res = await fetch('/api/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name }),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to send verification code.');
        }

        storage.storePendingSignup({
            name,
            email,
            password,
            totalRequiredHours: hours,
            startDate,
            verificationToken: data.token,
            tokenExpiresAt: data.expiresAt,
        });
    };

    // ─── Verify Code ────────────────────────────────────
    const handleVerifyCode = async (code: string) => {
        const pending = storage.getPendingSignup();
        if (!pending) throw new Error('No pending signup found. Please sign up again.');

        const res = await fetch('/api/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                email: pending.email,
                token: pending.verificationToken,
                expiresAt: pending.tokenExpiresAt,
            }),
        });

        const data = await res.json();
        if (!data.verified) {
            throw new Error(data.error || 'Invalid verification code.');
        }

        let uid: string;

        if (pending.googleUid) {
            uid = pending.googleUid;

            // Link email/password credential to the UB Mail account so manual login works.
            if (pending.password) {
                const { EmailAuthProvider, linkWithCredential } = await import('firebase/auth');
                const currentUser = auth.currentUser;
                if (currentUser && currentUser.uid === pending.googleUid) {
                    try {
                        const credential = EmailAuthProvider.credential(pending.email, pending.password);
                        await linkWithCredential(currentUser, credential);
                    } catch (err: unknown) {
                        const code = (err as { code?: string })?.code || '';
                        if (
                            code !== 'auth/provider-already-linked' &&
                            code !== 'auth/email-already-in-use' &&
                            code !== 'auth/credential-already-in-use'
                        ) {
                            throw err;
                        }
                    }
                }
            }
        } else {
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            const credential = await createUserWithEmailAndPassword(auth, pending.email, pending.password);
            uid = credential.user.uid;
        }

        // Create user in localStorage (cache) AND Firestore (source of truth)
        const newUser = storage.completeSignUp(pending, uid);

        // Save to Firestore
        await saveUserToFirestore(newUser);

        storage.clearPendingSignup();

        // Sign out so they must log in manually
        try {
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
        } catch { /* ignore */ }
    };

    // ─── Resend Code ────────────────────────────────────
    const handleResendCode = async () => {
        const pending = storage.getPendingSignup();
        if (!pending) throw new Error('No pending signup found. Please sign up again.');

        const res = await fetch('/api/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pending.email, name: pending.name }),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to resend verification code.');
        }

        storage.storePendingSignup({
            ...pending,
            verificationToken: data.token,
            tokenExpiresAt: data.expiresAt,
        });
    };

    // ─── Login ──────────────────────────────────────────
    const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');

        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const uid = credential.user.uid;

            // Load user from Firestore
            let firestoreUser = await getUserFromFirestore(uid);

            if (!firestoreUser) {
                // Try to migrate localStorage data
                const localUser = storage.findUserByEmail(email);
                if (localUser) {
                    const localLogs = storage.getDailyLogs(localUser.id);
                    const localReports = storage.getWeeklyReports(localUser.id);
                    await migrateLocalDataToFirestore({ ...localUser, id: uid }, localLogs, localReports);
                    firestoreUser = await getUserFromFirestore(uid);
                }
            }

            if (firestoreUser) {
                storage.cacheUser(firestoreUser);
                if (rememberMe) storage.setRememberedEmail(email);
                else storage.clearRememberedEmail();
                setUser(firestoreUser);

                // Load logs from Firestore
                const firestoreLogs = await getDailyLogsFromFirestore(uid);
                storage.cacheDailyLogs(uid, firestoreLogs);
                setLogs(firestoreLogs);
                setStats(calculateHourStats(firestoreLogs, firestoreUser.totalRequiredHours));
            } else {
                throw new Error('Account data not found. Please sign up again.');
            }
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
                // Fallback: legacy localStorage-only user
                const loggedUser = storage.login(email, password, rememberMe);
                setUser(loggedUser);
                const localLogs = storage.getDailyLogs(loggedUser.id);
                setLogs(localLogs);
                setStats(calculateHourStats(localLogs, loggedUser.totalRequiredHours));
            } else {
                throw err;
            }
        }
    };

    // ─── Logout ─────────────────────────────────────────
    const handleLogout = async () => {
        try {
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
        } catch { /* ignore */ }
        storage.logout();
        setUser(null);
        setLogs([]);
        setStats(emptyStats);
    };

    // ─── Google Sign-Up ─────────────────────────────────
    const handleSignUpWithGoogle = async (password: string) => {
        const { signInWithPopup } = await import('firebase/auth');
        const { googleProvider } = await import('./firebase');
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        const email = firebaseUser.email || '';

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
        }

        if (!isUbEmail(email)) {
            try {
                const { signOut } = await import('firebase/auth');
                await signOut(auth);
            } catch { /* ignore */ }
            throw new Error('Please use your @ub.edu.ph email address.');
        }

        // Check if this Google account already has a profile (by UID — safe for Firestore rules)
        const existingFirestore = await getUserFromFirestore(firebaseUser.uid);
        const existingLocal = storage.findUserByEmail(email);
        if (existingFirestore || existingLocal) {
            throw new Error('An account with this email already exists. Please log in instead.');
        }

        const res = await fetch('/api/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');

        storage.storePendingSignup({
            name,
            email,
            password,
            totalRequiredHours: 480,
            startDate: new Date().toISOString().split('T')[0],
            verificationToken: data.token,
            tokenExpiresAt: data.expiresAt,
            googleUid: firebaseUser.uid,
            profileImage: firebaseUser.photoURL || undefined,
        });
    };

    // ─── Google Login ───────────────────────────────────
    const handleLoginWithGoogle = async () => {
        const { signInWithPopup } = await import('firebase/auth');
        const { googleProvider } = await import('./firebase');
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        const email = firebaseUser.email || '';
        const uid = firebaseUser.uid;

        if (!isUbEmail(email)) {
            try {
                const { signOut } = await import('firebase/auth');
                await signOut(auth);
            } catch { /* ignore */ }
            throw new Error('Please use your @ub.edu.ph email address.');
        }

        // Check Firestore by UID, then fall back to localStorage migration
        let firestoreUser = await getUserFromFirestore(uid);

        if (!firestoreUser) {
            // Try localStorage migration
            const localUser = storage.findUserByEmail(email);
            if (localUser) {
                const localLogs = storage.getDailyLogs(localUser.id);
                const localReports = storage.getWeeklyReports(localUser.id);
                await migrateLocalDataToFirestore({ ...localUser, id: uid }, localLogs, localReports);
                firestoreUser = await getUserFromFirestore(uid);
            }
        }

        if (!firestoreUser) {
            throw new Error('No account found with this email. Please sign up first.');
        }

        storage.cacheUser(firestoreUser);
        setUser(firestoreUser);

        const firestoreLogs = await getDailyLogsFromFirestore(uid);
        storage.cacheDailyLogs(uid, firestoreLogs);
        setLogs(firestoreLogs);
        setStats(calculateHourStats(firestoreLogs, firestoreUser.totalRequiredHours));

        const firestoreCompetencies = await getCompetenciesFromFirestore(uid);
        storage.cacheCompetencies(uid, firestoreCompetencies);
        setCompetencies(firestoreCompetencies);
    };

    // ─── Update User ────────────────────────────────────
    const handleUpdateUser = async (updates: Partial<User>) => {
        // Update localStorage cache immediately for snappy UI
        storage.updateUser(updates);
        const updatedLocal = storage.getCurrentUser();
        if (updatedLocal) {
            setUser(updatedLocal);
            setStats(calculateHourStats(logs, updatedLocal.totalRequiredHours));
        }

        // Persist to Firestore
        const uid = auth.currentUser?.uid || user?.id;
        if (uid) {
            try {
                await updateUserInFirestore(uid, updates);
            } catch (err) {
                console.error('[Context] Failed to update user in Firestore:', err);
            }
        }
    };

    // ─── Add Log ────────────────────────────────────────
    const handleAddLog = async (log: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>) => {
        // Optimistic: add to localStorage immediately
        const localLog = storage.addDailyLog(log);

        // Update UI
        const updatedLogs = [...logs, localLog];
        setLogs(updatedLogs);
        if (user) setStats(calculateHourStats(updatedLogs, user.totalRequiredHours));

        // Persist to Firestore
        if (auth.currentUser) {
            try {
                const fsLog = await addDailyLogToFirestore(log);
                // Replace local ID with Firestore ID if different
                if (fsLog.id !== localLog.id) {
                    storage.replaceDailyLogId(localLog.id, fsLog.id);
                    const refreshedLogs = updatedLogs.map(l =>
                        l.id === localLog.id ? { ...l, id: fsLog.id } : l
                    );
                    setLogs(refreshedLogs);
                }
                // Refresh supervisors from Firestore if auto-saved
                if (log.supervisor && user) {
                    const fsUser = await getUserFromFirestore(auth.currentUser.uid);
                    if (fsUser) {
                        storage.cacheUser(fsUser);
                        setUser(fsUser);
                    }
                }
            } catch (err) {
                console.error('[Context] Failed to save log to Firestore:', err);
            }
        }
    };

    // ─── Update Log ─────────────────────────────────────
    const handleUpdateLog = async (id: string, updates: Partial<DailyLog>) => {
        // Optimistic update
        storage.updateDailyLog(id, updates);
        const updatedLogs = logs.map(l => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l);
        setLogs(updatedLogs);
        if (user) setStats(calculateHourStats(updatedLogs, user.totalRequiredHours));

        // Persist to Firestore
        if (auth.currentUser) {
            try {
                await updateDailyLogInFirestore(id, updates);
            } catch (err) {
                console.error('[Context] Failed to update log in Firestore:', err);
            }
        }
    };

    // ─── Delete Log ─────────────────────────────────────
    const handleDeleteLog = async (id: string) => {
        // Optimistic delete
        storage.deleteDailyLog(id);
        const updatedLogs = logs.filter(l => l.id !== id);
        setLogs(updatedLogs);
        if (user) setStats(calculateHourStats(updatedLogs, user.totalRequiredHours));

        // Persist to Firestore
        if (auth.currentUser) {
            try {
                await deleteDailyLogFromFirestore(id);
            } catch (err) {
                console.error('[Context] Failed to delete log from Firestore:', err);
            }
        }
    };

    // ─── Competencies ─────────────────────────────────
    const handleAddCompetency = async (competency: Omit<Competency, 'id' | 'createdAt' | 'updatedAt'>) => {
        const localCompetency = storage.addCompetency(competency);
        setCompetencies((prev) => [localCompetency, ...prev]);

        if (auth.currentUser) {
            try {
                const fsCompetency = await addCompetencyToFirestore(competency);
                if (fsCompetency.id !== localCompetency.id) {
                    storage.replaceCompetencyId(localCompetency.id, fsCompetency.id);
                    setCompetencies((prev) =>
                        prev.map((c) => (c.id === localCompetency.id ? { ...c, id: fsCompetency.id } : c))
                    );
                }
            } catch (err) {
                console.error('[Context] Failed to save competency to Firestore:', err);
            }
        }
    };

    const handleDeleteCompetency = async (id: string) => {
        storage.deleteCompetency(id);
        setCompetencies((prev) => prev.filter((c) => c.id !== id));

        if (auth.currentUser) {
            try {
                await deleteCompetencyFromFirestore(id);
            } catch (err) {
                console.error('[Context] Failed to delete competency from Firestore:', err);
            }
        }
    };

    // ─── Weekly Reports (Firestore-backed) ──────────────
    const handleSaveWeeklyReport = async (report: Omit<WeeklyReport, 'id' | 'createdAt'>): Promise<WeeklyReport> => {
        // Save to localStorage cache
        const localReport = storage.saveWeeklyReport(report);

        // Persist to Firestore
        if (auth.currentUser) {
            try {
                return await saveWeeklyReportToFirestore(report);
            } catch (err) {
                console.error('[Context] Failed to save report to Firestore:', err);
            }
        }
        return localReport;
    };

    const handleGetWeeklyReports = async (userId: string): Promise<WeeklyReport[]> => {
        // Try Firestore first
        if (auth.currentUser) {
            try {
                const reports = await getWeeklyReportsFromFirestore(userId);
                return reports;
            } catch (err) {
                console.error('[Context] Failed to load reports from Firestore:', err);
            }
        }
        // Fall back to localStorage
        return storage.getWeeklyReports(userId);
    };

    return (
        <AppContext.Provider
            value={{
                user,
                logs,
                competencies,
                stats,
                loading,
                signUp: handleSignUp,
                login: handleLogin,
                logout: handleLogout,
                updateUser: handleUpdateUser,
                addLog: handleAddLog,
                updateLog: handleUpdateLog,
                deleteLog: handleDeleteLog,
                addCompetency: handleAddCompetency,
                deleteCompetency: handleDeleteCompetency,
                refreshData,
                signUpWithGoogle: handleSignUpWithGoogle,
                loginWithGoogle: handleLoginWithGoogle,
                verifyCode: handleVerifyCode,
                resendCode: handleResendCode,
                saveWeeklyReport: handleSaveWeeklyReport,
                getWeeklyReports: handleGetWeeklyReports,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
