'use client';
import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import AccountProfilePanel from '@/components/AccountProfilePanel';
import { auth } from '@/lib/firebase';
import { Building2, Bell, Save, LogOut, User, Mail, Phone, MapPin, ShieldCheck, LockKeyhole, Eye, EyeOff, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { beginGlobalLoading } from '@/lib/global-loading';

export default function SettingsPage() {
    const { user, updateUser, logout } = useApp();
    const [activeTab, setActiveTab] = useState<'company' | 'account' | 'notifications' | 'security'>('account');
    const [showMobileLogout, setShowMobileLogout] = useState(false);
    const [companyName, setCompanyName] = useState(user?.company?.name || user?.companyName || '');
    const [companyAddress, setCompanyAddress] = useState(user?.company?.address || user?.companyAddress || '');
    const [companyContactNumber, setCompanyContactNumber] = useState(user?.company?.contactNumber || user?.companyContactNumber || '');
    const [companyEmail, setCompanyEmail] = useState(user?.company?.email || user?.companyEmail || '');
    const [reminderEnabled, setReminderEnabled] = useState(user?.reminderEnabled ?? true);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingCompany, setSavingCompany] = useState(false);
    const [savingNotifications, setSavingNotifications] = useState(false);

    if (!user) return null;
    const hasPasswordProvider = auth.currentUser?.providerData.some((provider) => provider.providerId === 'password') ?? false;

    const handleSaveCompany = async () => {
        setSavingCompany(true);
        try {
            await updateUser({
                companyName,
                companyAddress,
                companyContactNumber,
                companyEmail,
                company: {
                    ...(user.company || {}),
                    name: companyName,
                    address: companyAddress,
                    contactNumber: companyContactNumber,
                    email: companyEmail,
                    details: companyAddress,
                },
            });
            showToast({ kind: 'success', title: 'Saved', message: 'Company details updated.' });
        } catch {
            showToast({ kind: 'error', title: 'Save Failed', message: 'Could not update company details. Please try again.' });
        } finally {
            setSavingCompany(false);
        }
    };

    const handleSaveNotifications = async () => {
        setSavingNotifications(true);
        try {
            await updateUser({ reminderEnabled });
            showToast({ kind: 'success', title: 'Saved', message: 'Notification preferences updated.' });
        } catch {
            showToast({ kind: 'error', title: 'Save Failed', message: 'Could not update notification settings. Please try again.' });
        } finally {
            setSavingNotifications(false);
        }
    };

    const handleUpdatePassword = async () => {
        const endGlobalLoading = beginGlobalLoading();
        if (!auth.currentUser || !auth.currentUser.email) {
            showToast({ kind: 'error', title: 'Password Update Failed', message: 'No authenticated user found. Please sign in again.' });
            endGlobalLoading();
            return;
        }

        if (newPassword.length < 6) {
            showToast({ kind: 'error', title: 'Password Update Failed', message: 'New password must be at least 6 characters.' });
            endGlobalLoading();
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast({ kind: 'error', title: 'Password Update Failed', message: 'New password and confirmation do not match.' });
            endGlobalLoading();
            return;
        }

        if (hasPasswordProvider && !currentPassword) {
            showToast({ kind: 'error', title: 'Password Update Failed', message: 'Please enter your current password.' });
            endGlobalLoading();
            return;
        }

        setSavingPassword(true);
        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser || !firebaseUser.email) throw new Error('No authenticated user found.');

            const { EmailAuthProvider, reauthenticateWithCredential, updatePassword, linkWithCredential } = await import('firebase/auth');

            if (hasPasswordProvider) {
                const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
                await reauthenticateWithCredential(firebaseUser, credential);
                await updatePassword(firebaseUser, newPassword);
                showToast({ kind: 'success', title: 'Password Updated', message: 'Your password has been changed successfully.' });
            } else {
                const credential = EmailAuthProvider.credential(firebaseUser.email, newPassword);
                await linkWithCredential(firebaseUser, credential);
                showToast({ kind: 'success', title: 'Password Set', message: 'Password login is now enabled for your account.' });
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            let message = firebaseError.message || 'Unable to update password.';

            if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
                message = 'Current password is incorrect.';
            } else if (firebaseError.code === 'auth/weak-password') {
                message = 'New password is too weak. Use at least 6 characters.';
            } else if (firebaseError.code === 'auth/requires-recent-login') {
                message = 'Please sign out and sign in again before changing your password.';
            } else if (firebaseError.code === 'auth/provider-already-linked') {
                message = 'Password provider is already linked. Please use Change Password.';
            } else if (firebaseError.code === 'auth/too-many-requests') {
                message = 'Too many attempts. Please try again later.';
            }

            showToast({ kind: 'error', title: 'Password Update Failed', message });
        } finally {
            setSavingPassword(false);
            endGlobalLoading();
        }
    };

    const tabs = [
        { id: 'account' as const, label: 'Account', icon: User },
        { id: 'security' as const, label: 'Security', icon: ShieldCheck },
        { id: 'company' as const, label: 'Company Details', icon: Building2 },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Manage your student info, company details, and preferences</p>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
                <div className="card settings-tab-nav" style={{ padding: 12, background: 'rgba(24, 24, 27, 0.9)' }}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                className={`nav-link ${isActive ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start', border: isActive ? undefined : 'none', marginBottom: 4 }}
                                id={`settings-tab-${tab.id}`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div>
                    {activeTab === 'company' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Company Details</h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Update your internship company information</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-company-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={14} /> Company name</label>
                                    <input id="settings-company-name" className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-company-address" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /> Company full address</label>
                                    <input id="settings-company-address" className="input" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="settings-company-contact" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={14} /> Company contact number</label>
                                        <input id="settings-company-contact" className="input" value={companyContactNumber} onChange={(e) => setCompanyContactNumber(e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="settings-company-email" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} /> Company email address</label>
                                        <input id="settings-company-email" className="input" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                                <button className="btn btn-primary" onClick={handleSaveCompany} disabled={savingCompany} id="settings-save-company">
                                    {savingCompany ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {savingCompany ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="card-elevated">
                            <AccountProfilePanel title="Account" description="Manage your student profile details." compact />
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose-400)' }}>
                                    <Bell size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Notification Preferences</h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Configure reminder alerts and updates</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 'var(--radius-md)', background: 'rgba(24,24,27,0.45)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Reminder Notifications</h3>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Receive reminders for pending logs and reports</p>
                                </div>
                                <button disabled={savingNotifications} onClick={() => setReminderEnabled(!reminderEnabled)} style={{ width: 56, height: 32, borderRadius: 'var(--radius-full)', background: reminderEnabled ? 'var(--primary-500)' : 'rgba(255,255,255,0.1)', border: 'none', position: 'relative', cursor: savingNotifications ? 'not-allowed' : 'pointer', opacity: savingNotifications ? 0.7 : 1 }} id="settings-toggle-reminders">
                                    <span style={{ position: 'absolute', top: 4, left: reminderEnabled ? 28 : 4, width: 24, height: 24, borderRadius: '50%', background: 'white', transition: 'left 150ms ease' }} />
                                </button>
                            </div>

                            <button className="btn btn-primary" disabled={savingNotifications} onClick={handleSaveNotifications} id="settings-save-notifications">
                                {savingNotifications ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {savingNotifications ? 'Saving...' : 'Save Notification Settings'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Security</h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Manage sign-in credentials and account protection</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: 16 }}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="security-email" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Mail size={14} /> Email Address (Read-only)
                                    </label>
                                    <input id="security-email" className="input" type="email" value={user.email} readOnly aria-readonly="true" />
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 6 }}>
                                        Email cannot be changed.
                                    </p>
                                </div>

                                {hasPasswordProvider && (
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="security-current-password" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <LockKeyhole size={14} /> Current Password
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="security-current-password"
                                                className="input"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Enter your current password"
                                                style={{ paddingRight: 44 }}
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword((v) => !v)}
                                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', padding: 4 }}
                                            >
                                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="input-group">
                                    <label className="input-label" htmlFor="security-new-password" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <LockKeyhole size={14} /> {hasPasswordProvider ? 'New Password' : 'Set Password'}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="security-new-password"
                                            className="input"
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="At least 6 characters"
                                            style={{ paddingRight: 44 }}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword((v) => !v)}
                                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', padding: 4 }}
                                        >
                                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label" htmlFor="security-confirm-password" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <LockKeyhole size={14} /> Confirm {hasPasswordProvider ? 'New Password' : 'Password'}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="security-confirm-password"
                                            className="input"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            style={{ paddingRight: 44 }}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((v) => !v)}
                                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', padding: 4 }}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                                <button className="btn btn-primary" onClick={handleUpdatePassword} disabled={savingPassword} id="settings-save-security">
                                    {savingPassword ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {savingPassword ? 'Saving...' : hasPasswordProvider ? 'Update Password' : 'Set Password'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button className="btn btn-danger btn-lg" onClick={() => setShowMobileLogout(true)} style={{ display: 'none', marginTop: 24, width: '100%' }} id="settings-mobile-logout">
                <LogOut size={16} /> Log Out
            </button>
            <style>{`@media (max-width: 1024px) { #settings-mobile-logout { display: flex !important; } }`}</style>

            {showMobileLogout && (
                <div className="modal-overlay" onClick={() => setShowMobileLogout(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, padding: 32 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <LogOut size={28} style={{ color: 'var(--rose-400)' }} />
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Log Out?</h3>
                            <p style={{ fontSize: 14, color: 'var(--slate-400)', marginBottom: 24 }}>Are you sure you want to log out of your account?</p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => setShowMobileLogout(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={logout}><LogOut size={16} /> Log Out</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
