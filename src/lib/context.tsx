'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { User, DailyLog, WeeklyReport, HourStats, Competency, UserRole } from './types';
import * as storage from './storage';
import { calculateHourStats } from './calculations';
import {
    saveUserToFirestore,
    getUserFromFirestore,
    findUserByEmailInFirestore,
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
    getAllStudentsFromFirestore,
    getSanctionsForStudent,
    saveSanctionToFirestore,
    updateSanctionDaysInFirestore,
    updateSanctionInFirestore,
    getDutySlotsFromFirestore,
    createDutySlotInFirestore,
    getSanctionRendersFromFirestore,
    createSanctionRenderInFirestore,
    updateSanctionRenderStatus,
} from './firestore';
import { upsertChatUser, syncChatUserProfileInConversations } from './chat';
import { auth } from './firebase';
import { beginGlobalLoading } from './global-loading';

interface AppContextType {
    user: User | null;
    logs: DailyLog[];
    competencies: Competency[];
    stats: HourStats;
    loading: boolean;
    signUp: (name: string, email: string, password: string, hours: number, startDate: string, role?: string) => Promise<void>;
    login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => Promise<void>;
    addLog: (log: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateLog: (id: string, updates: Partial<DailyLog>) => Promise<void>;
    deleteLog: (id: string) => Promise<void>;
    addCompetency: (competency: Omit<Competency, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    deleteCompetency: (id: string) => Promise<void>;
    refreshData: () => Promise<void>;
    signUpWithGoogle: (password: string, role?: string) => Promise<void>;
    loginWithGoogle: (options?: { preferRedirect?: boolean }) => Promise<void>;
    verifyCode: (code: string) => Promise<void>;
    resendCode: () => Promise<void>;
    saveWeeklyReport: (report: Omit<WeeklyReport, 'id' | 'createdAt'>) => Promise<WeeklyReport>;
    getWeeklyReports: (userId: string) => Promise<WeeklyReport[]>;
    requiresPasswordCredentialSetup: boolean;
    setupPasswordCredential: (password: string) => Promise<void>;
    // Dean functions
    getAllStudents: () => Promise<User[]>;
    getStudentCompetencies: (studentId: string) => Promise<Competency[]>;
    getStudentHourStats: (studentId: string, totalRequiredHours?: number, email?: string) => Promise<HourStats>;
    getSanctionsForStudent: (studentId: string, studentEmail?: string) => Promise<any[]>;
    saveSanction: (sanction: any) => Promise<string>;
    updateSanctionDays: (sanctionId: string, newDays: number) => Promise<void>;
    updateSanction: (sanctionId: string, updates: any) => Promise<void>;
    getDutySlots: () => Promise<any[]>;
    createDutySlot: (slot: any) => Promise<string>;
    getSanctionRenders: (filters?: any) => Promise<any[]>;
    createSanctionRender: (render: any) => Promise<string>;
    updateSanctionRenderStatus: (renderId: string, status: string, updates?: any) => Promise<void>;
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

const isValidProfileImage = (value?: string | null) => {
    if (!value) return false;
    const normalized = value.trim();
    return normalized.startsWith('https://') || normalized.startsWith('http://') || normalized.startsWith('data:image/');
};

const getGoogleProfileImage = (firebaseUser: FirebaseAuthUser | null): string | undefined => {
    if (!firebaseUser) return undefined;
    const fromUser = firebaseUser.photoURL || '';
    if (isValidProfileImage(fromUser)) return fromUser;

    const fromProvider = firebaseUser.providerData.find((p) => isValidProfileImage(p.photoURL || ''))?.photoURL;
    return isValidProfileImage(fromProvider || '') ? (fromProvider as string) : undefined;
};

const needsPasswordCredentialSetup = (firebaseUser: FirebaseAuthUser | null) => {
    if (!firebaseUser) return false;
    const email = (firebaseUser.email || '').trim().toLowerCase();
    if (!isUbEmail(email)) return false;
    const providerIds = firebaseUser.providerData.map((p) => p.providerId);
    return !providerIds.includes('password');
};

const isPermissionDeniedError = (err: unknown) => {
    const code = (err as { code?: string } | null)?.code || '';
    const message = ((err as { message?: string } | null)?.message || '').toLowerCase();

    return (
        code === 'permission-denied' ||
        code === 'firestore/permission-denied' ||
        message.includes('missing or insufficient permissions')
    );
};

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    const [stats, setStats] = useState<HourStats>(emptyStats);
    const [loading, setLoading] = useState(true);
    const [requiresPasswordCredentialSetup, setRequiresPasswordCredentialSetup] = useState(false);
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
            const googlePhoto = getGoogleProfileImage(firebaseUser);

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

            if (!firestoreUser) {
                // Support redirect-based Google sign-in by auto-provisioning first-time UB users.
                const normalizedEmail = (firebaseUser.email || '').trim().toLowerCase();
                if (isUbEmail(normalizedEmail)) {
                    const now = new Date().toISOString();
                    const newUser: User = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || normalizedEmail.split('@')[0] || 'User',
                        email: normalizedEmail,
                        password: '',
                        role: 'intern',
                        totalRequiredHours: 480,
                        startDate: now.split('T')[0],
                        createdAt: now,
                        supervisors: [],
                        reminderEnabled: true,
                        profileImage: googlePhoto,
                    };
                    await saveUserToFirestore(newUser);
                    firestoreUser = newUser;
                }
            }

            if (firestoreUser) {
                if (googlePhoto && !isValidProfileImage(firestoreUser.profileImage)) {
                    firestoreUser = { ...firestoreUser, profileImage: googlePhoto };
                    await updateUserInFirestore(firebaseUser.uid, { profileImage: googlePhoto });
                }

                // Cache to localStorage
                storage.cacheUser(firestoreUser);
                setUser(firestoreUser);

                // One-time migration: flat collections → subcollections
                try {
                    await migrateFromFlatToSubcollections();
                } catch { /* non-critical */ }

                // Load logs and competencies independently so one permission failure does not drop the whole session.
                const [logsResult, competenciesResult] = await Promise.allSettled([
                    getDailyLogsFromFirestore(firestoreUser.id),
                    getCompetenciesFromFirestore(firestoreUser.id),
                ]);

                const firestoreLogs = logsResult.status === 'fulfilled' ? logsResult.value : [];
                const firestoreCompetencies = competenciesResult.status === 'fulfilled' ? competenciesResult.value : [];

                if (logsResult.status === 'rejected') {
                    console.error('[Context] Failed to load Firestore logs:', logsResult.reason);
                }
                if (competenciesResult.status === 'rejected') {
                    console.error('[Context] Failed to load Firestore competencies:', competenciesResult.reason);
                }

                storage.cacheDailyLogs(firestoreUser.id, firestoreLogs);
                storage.cacheCompetencies(firestoreUser.id, firestoreCompetencies);
                setLogs(firestoreLogs);
                setCompetencies(firestoreCompetencies);
                setStats(calculateHourStats(firestoreLogs, firestoreUser.totalRequiredHours));
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
                setRequiresPasswordCredentialSetup(needsPasswordCredentialSetup(firebaseUser));
                await refreshData();
            } else {
                setRequiresPasswordCredentialSetup(false);
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
    const handleSignUp = async (name: string, email: string, password: string, hours: number, startDate: string, role?: string) => {
        if (role !== 'dean' && !isUbEmail(email)) {
            throw new Error('Please use your @ub.edu.ph email address.');
        }
        // Check localStorage for existing account (quick check)
        const existingLocal = storage.findUserByEmail(email);
        if (existingLocal) {
            throw new Error('An account with this email already exists.');
        }

        // Dean signup: skip OTP, create account immediately
        if (role === 'dean') {
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = credential.user.uid;

            const newUser: User = {
                id: uid,
                name,
                email,
                password,
                role: 'dean',
                totalRequiredHours: hours,
                startDate,
                createdAt: new Date().toISOString(),
                supervisors: [],
                reminderEnabled: true,
            };

            // Save to both localStorage and Firestore
            storage.cacheUser(newUser);
            await saveUserToFirestore(newUser);
            storage.clearPendingSignup();

            // Keep them signed in (don't sign out)
            setUser(newUser);
            return;
        }

        // Intern signup: send verification code
        // Note: We don't check Firestore here because the user isn't authenticated yet.
        // Firebase Auth will reject duplicate emails when createUserWithEmailAndPassword is called.

        const res = await fetch('/api/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, role }),
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
            role: role as UserRole,
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
            body: JSON.stringify({ email: pending.email, name: pending.name, role: pending.role }),
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
        const normalizedEmail = email.trim().toLowerCase();

        // Validate against local cache first so obvious bad credentials fail fast.
        const localUser = storage.findUserByEmail(normalizedEmail);
        if (localUser && Boolean(localUser.password)) {
            if (localUser.password !== password) {
                const invalidCredentialError = Object.assign(new Error('Invalid email or password.'), {
                    code: 'auth/invalid-credential',
                });
                throw invalidCredentialError;
            }
        }

        try {
            const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            const uid = credential.user.uid;

            // Load user from Firestore
            let firestoreUser = await getUserFromFirestore(uid);

            if (!firestoreUser) {
                // Try to migrate localStorage data
                const migratedLocalUser = storage.findUserByEmail(normalizedEmail);
                if (migratedLocalUser) {
                    const localLogs = storage.getDailyLogs(migratedLocalUser.id);
                    const localReports = storage.getWeeklyReports(migratedLocalUser.id);
                    await migrateLocalDataToFirestore({ ...migratedLocalUser, id: uid }, localLogs, localReports);
                    firestoreUser = await getUserFromFirestore(uid);
                }
            }

            if (firestoreUser) {
                storage.cacheUser(firestoreUser);
                if (rememberMe) storage.setRememberedEmail(normalizedEmail);
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
            if (firebaseError.code === 'auth/user-not-found') {
                // Fallback: legacy localStorage-only user
                try {
                    const loggedUser = storage.login(normalizedEmail, password, rememberMe);
                    setUser(loggedUser);
                    const localLogs = storage.getDailyLogs(loggedUser.id);
                    setLogs(localLogs);
                    setStats(calculateHourStats(localLogs, loggedUser.totalRequiredHours));
                } catch {
                    const invalidCredentialError = Object.assign(new Error('Invalid email or password.'), {
                        code: 'auth/invalid-credential',
                    });
                    throw invalidCredentialError;
                }
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
    const handleSignUpWithGoogle = async (password: string, role?: string) => {
        const { signInWithPopup } = await import('firebase/auth');
        const { googleProvider } = await import('./firebase');
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        const email = firebaseUser.email || '';

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
        }

        if (role !== 'dean' && !isUbEmail(email)) {
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

        // Dean signup: skip OTP, create account immediately
        if (role === 'dean') {
            // Link email/password credential to the Google account
            if (password) {
                const { EmailAuthProvider, linkWithCredential } = await import('firebase/auth');
                try {
                    const credential = EmailAuthProvider.credential(email, password);
                    await linkWithCredential(firebaseUser, credential);
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

            const newUser: User = {
                id: firebaseUser.uid,
                name,
                email,
                password,
                role: 'dean',
                totalRequiredHours: 480,
                startDate: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                supervisors: [],
                reminderEnabled: true,
                profileImage: firebaseUser.photoURL || undefined,
            };

            // Save to both localStorage and Firestore
            storage.cacheUser(newUser);
            await saveUserToFirestore(newUser);
            storage.clearPendingSignup();

            // Keep them signed in
            setUser(newUser);
            return;
        }

        // Intern signup: send verification code
        const res = await fetch('/api/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');

        storage.storePendingSignup({
            name,
            email,
            password,
            totalRequiredHours: 480,
            startDate: new Date().toISOString().split('T')[0],
            role: role as UserRole,
            verificationToken: data.token,
            tokenExpiresAt: data.expiresAt,
            googleUid: firebaseUser.uid,
            profileImage: firebaseUser.photoURL || undefined,
        });
    };

    // ─── Google Login ───────────────────────────────────
    const handleLoginWithGoogle = async (options?: { preferRedirect?: boolean }) => {
        const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');
        const { googleProvider } = await import('./firebase');

        if (options?.preferRedirect) {
            await signInWithRedirect(auth, googleProvider);
            return;
        }

        let firebaseUser: FirebaseAuthUser;
        try {
            const result = await signInWithPopup(auth, googleProvider);
            firebaseUser = result.user;
        } catch (err) {
            throw err;
        }

        const email = (firebaseUser.email || '').trim().toLowerCase();
        const uid = firebaseUser.uid;
        const googlePhoto = getGoogleProfileImage(firebaseUser);

        if (!isUbEmail(email)) {
            try {
                const { signOut } = await import('firebase/auth');
                await signOut(auth);
            } catch { /* ignore */ }
            throw new Error('Please use your @ub.edu.ph email address.');
        }

        // Check Firestore by UID first.
        let firestoreUser = await getUserFromFirestore(uid);

        if (!firestoreUser) {
            // Fallback: profile exists in Firestore by email but UID doc hasn't been created yet.
            const byEmail = await findUserByEmailInFirestore(email);
            if (byEmail) {
                const rebasedUser: User = {
                    ...byEmail,
                    id: uid,
                    email,
                    name: byEmail.name || firebaseUser.displayName || email.split('@')[0] || 'User',
                    profileImage: byEmail.profileImage || googlePhoto,
                    password: byEmail.password || '',
                };
                await saveUserToFirestore(rebasedUser);
                firestoreUser = rebasedUser;
            }
        }

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
            // Auto-provision first-time UB Mail sign-in.
            const now = new Date().toISOString();
            const newUser: User = {
                id: uid,
                name: firebaseUser.displayName || email.split('@')[0] || 'User',
                email,
                password: '',
                role: 'intern',
                totalRequiredHours: 480,
                startDate: now.split('T')[0],
                createdAt: now,
                supervisors: [],
                reminderEnabled: true,
                profileImage: googlePhoto,
            };

            await saveUserToFirestore(newUser);
            firestoreUser = newUser;
        }

        if (googlePhoto && !isValidProfileImage(firestoreUser.profileImage)) {
            firestoreUser = { ...firestoreUser, profileImage: googlePhoto };
            await updateUserInFirestore(uid, { profileImage: googlePhoto });
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

    const handleSetupPasswordCredential = async (password: string) => {
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
        }

        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) {
            throw new Error('You need to be signed in to set a password.');
        }

        const providerIds = currentUser.providerData.map((p) => p.providerId);
        if (providerIds.includes('password')) {
            setRequiresPasswordCredentialSetup(false);
            return;
        }

        const normalizedEmail = currentUser.email.trim().toLowerCase();
        const { EmailAuthProvider, linkWithCredential } = await import('firebase/auth');

        try {
            const credential = EmailAuthProvider.credential(normalizedEmail, password);
            await linkWithCredential(currentUser, credential);
            setRequiresPasswordCredentialSetup(false);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code || '';
            if (code === 'auth/provider-already-linked') {
                setRequiresPasswordCredentialSetup(false);
                return;
            }
            if (code === 'auth/requires-recent-login') {
                throw new Error('Session expired. Please sign in with UB Mail again, then set your password.');
            }
            if (code === 'auth/weak-password') {
                throw new Error('Password is too weak. Use at least 6 characters.');
            }
            if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
                throw new Error('This email already has another credential. Try Forgot Password to recover access.');
            }
            throw err;
        }
    };

    // ─── Update User ────────────────────────────────────
    const handleUpdateUser = async (updates: Partial<User>) => {
        const endGlobalLoading = beginGlobalLoading();
        // Update localStorage cache immediately for snappy UI
        try {
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

                    // Keep chat profile surfaces in sync for all users in real-time.
                    const sourceUser = updatedLocal || user;
                    if (sourceUser) {
                        const name = updates.name ?? sourceUser.name;
                        const email = updates.email ?? sourceUser.email;
                        const profileImage = updates.profileImage ?? sourceUser.profileImage;

                        await upsertChatUser({
                            uid,
                            name,
                            email,
                            profileImage,
                        });

                        await syncChatUserProfileInConversations(uid, {
                            name,
                            email,
                            profileImage,
                        });
                    }
                } catch (err) {
                    console.error('[Context] Failed to update user in Firestore:', err);
                }
            }
        } finally {
            endGlobalLoading();
        }
    };

    // ─── Add Log ────────────────────────────────────────
    const handleAddLog = async (log: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>) => {
        const endGlobalLoading = beginGlobalLoading();
        // Optimistic: add to localStorage immediately
        try {
            const localLog = storage.addDailyLog(log);

            // Update UI
            setLogs((prev) => {
                const updatedLogs = [...prev, localLog];
                if (user) setStats(calculateHourStats(updatedLogs, user.totalRequiredHours));
                return updatedLogs;
            });

            // Persist to Firestore
            if (auth.currentUser) {
                try {
                    const fsLog = await addDailyLogToFirestore(log);
                    // Replace local ID with Firestore ID if different
                    if (fsLog.id !== localLog.id) {
                        storage.replaceDailyLogId(localLog.id, fsLog.id);
                        setLogs((prev) => prev.map((l) =>
                            l.id === localLog.id ? { ...l, id: fsLog.id } : l
                        ));
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
        } finally {
            endGlobalLoading();
        }
    };

    // ─── Update Log ─────────────────────────────────────
    const handleUpdateLog = async (id: string, updates: Partial<DailyLog>) => {
        const endGlobalLoading = beginGlobalLoading();
        // Optimistic update
        try {
            storage.updateDailyLog(id, updates);
            setLogs((prev) => {
                const updatedLogs = prev.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l));
                if (user) setStats(calculateHourStats(updatedLogs, user.totalRequiredHours));
                return updatedLogs;
            });

            // Persist to Firestore
            if (auth.currentUser) {
                try {
                    await updateDailyLogInFirestore(id, updates);
                } catch (err) {
                    console.error('[Context] Failed to update log in Firestore:', err);
                }
            }
        } finally {
            endGlobalLoading();
        }
    };

    // ─── Delete Log ─────────────────────────────────────
    const handleDeleteLog = async (id: string) => {
        const endGlobalLoading = beginGlobalLoading();
        // Optimistic delete
        try {
            storage.deleteDailyLog(id);
            setLogs((prev) => {
                const updatedLogs = prev.filter((l) => l.id !== id);
                if (user) setStats(calculateHourStats(updatedLogs, user.totalRequiredHours));
                return updatedLogs;
            });

            // Persist to Firestore
            if (auth.currentUser) {
                try {
                    await deleteDailyLogFromFirestore(id);
                } catch (err) {
                    console.error('[Context] Failed to delete log from Firestore:', err);
                }
            }
        } finally {
            endGlobalLoading();
        }
    };

    // ─── Competencies ─────────────────────────────────
    const handleAddCompetency = async (competency: Omit<Competency, 'id' | 'createdAt' | 'updatedAt'>) => {
        const endGlobalLoading = beginGlobalLoading();
        try {
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
        } finally {
            endGlobalLoading();
        }
    };

    const handleDeleteCompetency = async (id: string) => {
        const endGlobalLoading = beginGlobalLoading();
        try {
            storage.deleteCompetency(id);
            setCompetencies((prev) => prev.filter((c) => c.id !== id));

            if (auth.currentUser) {
                try {
                    await deleteCompetencyFromFirestore(id);
                } catch (err) {
                    console.error('[Context] Failed to delete competency from Firestore:', err);
                }
            }
        } finally {
            endGlobalLoading();
        }
    };

    // ─── Weekly Reports (Firestore-backed) ──────────────
    const handleSaveWeeklyReport = async (report: Omit<WeeklyReport, 'id' | 'createdAt'>): Promise<WeeklyReport> => {
        const endGlobalLoading = beginGlobalLoading();
        try {
            if (auth.currentUser) {
                console.log('[Context] Saving weekly report to Firestore:', { weekNumber: report.weekNumber, userId: report.userId });
                try {
                    const savedReport = await saveWeeklyReportToFirestore(report);
                    console.log('[Context] Weekly report saved successfully:', savedReport);
                    storage.cacheWeeklyReport(savedReport);
                    return savedReport;
                } catch (firestoreError) {
                    console.error('[Context] Firestore save failed, falling back to localStorage:', firestoreError);
                    const localReport = storage.saveWeeklyReport(report);
                    storage.cacheWeeklyReport(localReport);
                    // Still throw the error so the caller knows Firestore failed
                    throw firestoreError;
                }
            }
            console.log('[Context] No auth user, saving to localStorage');
            const localReport = storage.saveWeeklyReport(report);
            storage.cacheWeeklyReport(localReport);
            return localReport;
        } finally {
            endGlobalLoading();
        }
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

    // ─── Dean Functions ─────────────────────────────────
    const handleGetAllStudents = useCallback(async (): Promise<User[]> => {
        try {
            return await getAllStudentsFromFirestore();
        } catch (err) {
            console.error('Error getting all students:', err);
            return [];
        }
    }, []);

    const handleGetStudentCompetencies = useCallback(async (studentId: string): Promise<Competency[]> => {
        try {
            return await getCompetenciesFromFirestore(studentId);
        } catch (err) {
            console.error('Error getting student competencies:', err);
            return [];
        }
    }, []);

    const handleGetStudentHourStats = useCallback(async (studentId: string, totalRequiredHours?: number, email?: string): Promise<HourStats> => {
        try {
            const requiredHours = totalRequiredHours ?? 480;

            const resolvedStudent =
                (await getUserFromFirestore(studentId)) ||
                (email ? await findUserByEmailInFirestore(email) : null);
            const resolvedStudentId = resolvedStudent?.id || studentId;

            const [studentLogsResult, studentReportsResult] = await Promise.allSettled([
                getDailyLogsFromFirestore(resolvedStudentId),
                getWeeklyReportsFromFirestore(resolvedStudentId),
            ]);

            const firestoreLogs = studentLogsResult.status === 'fulfilled' ? studentLogsResult.value : [];
            const firestoreReports = studentReportsResult.status === 'fulfilled' ? studentReportsResult.value : [];

            const cachedLogs = storage.getDailyLogs(resolvedStudentId);
            const cachedReports = storage.getWeeklyReports(resolvedStudentId);

            const studentLogs = firestoreLogs.length > 0 ? firestoreLogs : cachedLogs;
            const studentReports = firestoreReports.length > 0 ? firestoreReports : cachedReports;

            const logStats = calculateHourStats(studentLogs, requiredHours);
            const weeklyReportHours = studentReports.reduce((sum, report) => sum + report.hoursRendered, 0);
            const totalRendered = Math.max(logStats.totalRendered, weeklyReportHours);
            const remaining = Math.max(0, requiredHours - totalRendered);
            const progressPercentage = requiredHours > 0 ? Math.min(100, (totalRendered / requiredHours) * 100) : 0;

            return {
                totalRequired: requiredHours,
                totalRendered: Math.round(totalRendered * 100) / 100,
                hoursThisWeek: logStats.hoursThisWeek,
                remaining: Math.round(remaining * 100) / 100,
                progressPercentage: Math.round(progressPercentage * 10) / 10,
                weeklyAverage: logStats.weeklyAverage,
                daysLogged: logStats.daysLogged,
            };
        } catch (err) {
            console.error('Error getting student hour stats:', err);
            return {
                ...emptyStats,
                totalRequired: totalRequiredHours ?? 480,
            };
        }
    }, []);

    const handleGetSanctionsForStudent = useCallback(async (studentId: string, studentEmail?: string) => {
        try {
            const identifiers = new Set<string>([studentId]);

            if (studentEmail) {
                identifiers.add(studentEmail);

                try {
                    const canonicalUser = await findUserByEmailInFirestore(studentEmail);
                    if (canonicalUser?.id) {
                        identifiers.add(canonicalUser.id);
                    }
                } catch (lookupErr) {
                    if (!isPermissionDeniedError(lookupErr)) {
                        console.error('Error resolving canonical student id:', lookupErr);
                    }
                }
            }

            const results = await Promise.all(
                [...identifiers].map(async (identifier) => getSanctionsForStudent(identifier, studentEmail))
            );

            const deduped = new Map<string, any>();
            for (const sanction of results.flat()) {
                deduped.set(sanction.id, sanction);
            }

            return [...deduped.values()].sort((a, b) => {
                const left = new Date(a.createdAt || a.issuedDate || 0).getTime();
                const right = new Date(b.createdAt || b.issuedDate || 0).getTime();
                return right - left;
            });
        } catch (err) {
            if (!isPermissionDeniedError(err)) {
                console.error('Error getting sanctions:', err);
            }
            return [];
        }
    }, []);

    const handleSaveSanction = useCallback(async (sanction: any): Promise<string> => {
        try {
            return await saveSanctionToFirestore(sanction);
        } catch (err) {
            console.error('Error saving sanction:', err);
            throw err;
        }
    }, []);

    const handleUpdateSanctionDays = useCallback(async (sanctionId: string, newDays: number): Promise<void> => {
        try {
            return await updateSanctionDaysInFirestore(sanctionId, newDays);
        } catch (err) {
            console.error('Error updating sanction days:', err);
            throw err;
        }
    }, []);

    const handleUpdateSanction = useCallback(async (sanctionId: string, updates: any): Promise<void> => {
        try {
            await updateSanctionInFirestore(sanctionId, updates);
        } catch (err) {
            console.error('Error updating sanction:', err);
            throw err;
        }
    }, []);

    const handleGetDutySlots = useCallback(async () => {
        try {
            return await getDutySlotsFromFirestore();
        } catch (err) {
            if (!isPermissionDeniedError(err)) {
                console.error('Error getting duty slots:', err);
            }
            return [];
        }
    }, []);

    const handleCreateDutySlot = useCallback(async (slot: any): Promise<string> => {
        try {
            return await createDutySlotInFirestore(slot);
        } catch (err) {
            console.error('Error creating duty slot:', err);
            throw err;
        }
    }, []);

    const handleGetSanctionRenders = useCallback(async (filters?: any) => {
        try {
            return await getSanctionRendersFromFirestore(filters);
        } catch (err) {
            console.error('Error getting sanction renders:', err);
            return [];
        }
    }, []);

    const handleCreateSanctionRender = useCallback(async (render: any): Promise<string> => {
        try {
            return await createSanctionRenderInFirestore(render);
        } catch (err) {
            console.error('Error creating sanction render:', err);
            throw err;
        }
    }, []);

    const handleUpdateSanctionRenderStatus = useCallback(async (renderId: string, status: string, updates?: any) => {
        try {
            await updateSanctionRenderStatus(renderId, status as any, updates);
        } catch (err) {
            console.error('Error updating sanction render status:', err);
            throw err;
        }
    }, []);

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
                requiresPasswordCredentialSetup,
                setupPasswordCredential: handleSetupPasswordCredential,
                // Dean functions
                getAllStudents: handleGetAllStudents,
                getStudentCompetencies: handleGetStudentCompetencies,
                getStudentHourStats: handleGetStudentHourStats,
                getSanctionsForStudent: handleGetSanctionsForStudent,
                saveSanction: handleSaveSanction,
                updateSanctionDays: handleUpdateSanctionDays,
                updateSanction: handleUpdateSanction,
                getDutySlots: handleGetDutySlots,
                createDutySlot: handleCreateDutySlot,
                getSanctionRenders: handleGetSanctionRenders,
                createSanctionRender: handleCreateSanctionRender,
                updateSanctionRenderStatus: handleUpdateSanctionRenderStatus,
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
