'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/context';
import { auth } from '@/lib/firebase';
import { uploadProfileImage } from '@/lib/intern';
import { beginGlobalLoading } from '@/lib/global-loading';
import { showToast } from '@/lib/toast';
import {
    Bell,
    Building2,
    Eye,
    EyeOff,
    Loader2,
    LockKeyhole,
    Mail,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    User,
} from 'lucide-react';

const DEAN_DEPARTMENT_OPTIONS = ['CICT'] as const;

export default function DeanSettingsPage() {
    const { user, updateUser } = useApp();
    const [activeTab, setActiveTab] = useState<'account' | 'security' | 'office' | 'notifications'>('account');

    const [fullName, setFullName] = useState('');
    const [address, setAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [department, setDepartment] = useState('');

    const [officeName, setOfficeName] = useState('');
    const [officeAddress, setOfficeAddress] = useState('');
    const [officeContactNumber, setOfficeContactNumber] = useState('');
    const [officeEmail, setOfficeEmail] = useState('');

    const [reminderEnabled, setReminderEnabled] = useState(true);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [savingAccount, setSavingAccount] = useState(false);
    const [savingOffice, setSavingOffice] = useState(false);
    const [savingNotifications, setSavingNotifications] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarLoadError, setAvatarLoadError] = useState(false);

    const digitsOnly = (value: string) => value.replace(/\D/g, '');

    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!user) return;
        setFullName(user.fullName || user.name || '');
        setAddress(user.address || '');
        setPhoneNumber(user.phoneNumber || user.contact || '');
        setDepartment((user.department || '').toUpperCase());

        setOfficeName(user.company?.name || user.companyName || '');
        setOfficeAddress(user.company?.address || user.companyAddress || '');
        setOfficeContactNumber(user.company?.contactNumber || user.companyContactNumber || '');
        setOfficeEmail(user.company?.email || user.companyEmail || '');
        setReminderEnabled(user.reminderEnabled ?? true);
    }, [user]);

    useEffect(() => {
        setAvatarLoadError(false);
    }, [user?.profileImage]);

    if (!user) return null;

    const hasPasswordProvider = auth.currentUser?.providerData.some((provider) => provider.providerId === 'password') ?? false;

    const handleSaveAccount = async () => {
        setSavingAccount(true);
        try {
            await updateUser({
                name: fullName,
                fullName,
                address,
                phoneNumber,
                contact: phoneNumber,
                department,
            });
            showToast({ kind: 'success', title: 'Saved', message: 'Dean account details updated.' });
        } catch {
            showToast({ kind: 'error', title: 'Save Failed', message: 'Could not update account details. Please try again.' });
        } finally {
            setSavingAccount(false);
        }
    };

    const handleSaveOffice = async () => {
        setSavingOffice(true);
        try {
            await updateUser({
                companyName: officeName,
                companyAddress: officeAddress,
                companyContactNumber: officeContactNumber,
                companyEmail: officeEmail,
                company: {
                    ...(user.company || {}),
                    name: officeName,
                    address: officeAddress,
                    contactNumber: officeContactNumber,
                    email: officeEmail,
                    details: officeAddress,
                },
            });
            showToast({ kind: 'success', title: 'Saved', message: 'Office details updated.' });
        } catch {
            showToast({ kind: 'error', title: 'Save Failed', message: 'Could not update office details. Please try again.' });
        } finally {
            setSavingOffice(false);
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

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast({ kind: 'error', title: 'Invalid File', message: 'Please select an image file.' });
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast({ kind: 'error', title: 'Image Too Large', message: 'Please use an image smaller than 5MB.' });
            event.target.value = '';
            return;
        }

        setUploadingAvatar(true);
        try {
            const imageUrl = await uploadProfileImage(file, `profiles/${user.id}`);
            await updateUser({ profileImage: imageUrl });
            setAvatarLoadError(false);
            showToast({ kind: 'success', title: 'Profile Updated', message: 'Your profile picture has been updated.' });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to upload profile picture.';
            showToast({ kind: 'error', title: 'Upload Failed', message });
        } finally {
            setUploadingAvatar(false);
            event.target.value = '';
        }
    };

    const handleUpdatePassword = async () => {
        const endGlobalLoading = beginGlobalLoading();

        if (!auth.currentUser || !auth.currentUser.email) {
            showToast({ kind: 'error', title: 'Password Update Failed', message: 'No authenticated user found. Please sign in again.' });
            endGlobalLoading();
            return;
        }

        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasNumber = /\d/.test(newPassword);
        if (newPassword.length < 8 || !hasUpperCase || !hasNumber) {
            showToast({
                kind: 'error',
                title: 'Weak Password',
                message: 'New password must be at least 8 characters long and contain both an uppercase letter and a number.',
            });
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
        { id: 'office' as const, label: 'Office Details', icon: Building2 },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Manage your dean profile, office details, and preferences</p>
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
                                id={`dean-settings-tab-${tab.id}`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div>
                    {activeTab === 'account' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                    {user.profileImage && !avatarLoadError ? (
                                        <img
                                            src={user.profileImage}
                                            alt={user.name}
                                            style={{ width: 54, height: 54, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
                                            onError={() => setAvatarLoadError(true)}
                                        />
                                    ) : (
                                        <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg, #34d399, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: 'white', flexShrink: 0 }}>
                                            {(user.name || 'D').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                                        <p style={{ fontSize: 12, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                                    </div>
                                </div>

                                <div>
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        className="btn btn-secondary"
                                        type="button"
                                        disabled={uploadingAvatar}
                                        onClick={() => avatarInputRef.current?.click()}
                                        id="dean-settings-upload-photo"
                                    >
                                        {uploadingAvatar ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : null}
                                        {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: 14 }}>
                                <div>
                                    <label className="input-label" htmlFor="dean-settings-name" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <User size={14} /> Full Name
                                    </label>
                                    <input id="dean-settings-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                </div>

                                <div>
                                    <label className="input-label" htmlFor="dean-settings-email" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <Mail size={14} /> Email Address (Read-only)
                                    </label>
                                    <input id="dean-settings-email" className="input" value={user.email} readOnly aria-readonly="true" />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label className="input-label" htmlFor="dean-settings-phone" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <Phone size={14} /> Phone Number
                                        </label>
                                        <input id="dean-settings-phone" className="input" type="tel" inputMode="numeric" value={phoneNumber} onChange={(e) => setPhoneNumber(digitsOnly(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="input-label" htmlFor="dean-settings-department" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <Building2 size={14} /> Department
                                        </label>
                                        <select id="dean-settings-department" className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                                            <option value="">Select Department</option>
                                            {DEAN_DEPARTMENT_OPTIONS.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="input-label" htmlFor="dean-settings-address" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <MapPin size={14} /> Address
                                    </label>
                                    <input id="dean-settings-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button className="btn btn-primary" onClick={handleSaveAccount} disabled={savingAccount} id="dean-settings-save-account">
                                    {savingAccount ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {savingAccount ? 'Saving...' : 'Save Account'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'office' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Office Details</h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Update your department office information</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="dean-settings-office-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={14} /> Office name</label>
                                    <input id="dean-settings-office-name" className="input" value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
                                </div>

                                <div className="input-group">
                                    <label className="input-label" htmlFor="dean-settings-office-address" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /> Office full address</label>
                                    <input id="dean-settings-office-address" className="input" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="dean-settings-office-contact" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={14} /> Office contact number</label>
                                        <input id="dean-settings-office-contact" className="input" type="tel" inputMode="numeric" value={officeContactNumber} onChange={(e) => setOfficeContactNumber(digitsOnly(e.target.value))} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="dean-settings-office-email" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} /> Office email address</label>
                                        <input id="dean-settings-office-email" className="input" type="email" value={officeEmail} onChange={(e) => setOfficeEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                                <button className="btn btn-primary" onClick={handleSaveOffice} disabled={savingOffice} id="dean-settings-save-office">
                                    {savingOffice ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {savingOffice ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
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
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Configure admin reminders and updates</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 'var(--radius-md)', background: 'rgba(24,24,27,0.45)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Reminder Notifications</h3>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Receive reminders for sanctions and pending reviews</p>
                                </div>
                                <button disabled={savingNotifications} onClick={() => setReminderEnabled(!reminderEnabled)} style={{ width: 56, height: 32, borderRadius: 'var(--radius-full)', background: reminderEnabled ? 'var(--primary-500)' : 'rgba(255,255,255,0.1)', border: 'none', position: 'relative', cursor: savingNotifications ? 'not-allowed' : 'pointer', opacity: savingNotifications ? 0.7 : 1 }} id="dean-settings-toggle-reminders">
                                    <span style={{ position: 'absolute', top: 4, left: reminderEnabled ? 28 : 4, width: 24, height: 24, borderRadius: '50%', background: 'white', transition: 'left 150ms ease' }} />
                                </button>
                            </div>

                            <button className="btn btn-primary" disabled={savingNotifications} onClick={handleSaveNotifications} id="dean-settings-save-notifications">
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
                                    <label className="input-label" htmlFor="dean-security-email" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Mail size={14} /> Email Address (Read-only)
                                    </label>
                                    <input id="dean-security-email" className="input" type="email" value={user.email} readOnly aria-readonly="true" />
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 6 }}>
                                        Email cannot be changed.
                                    </p>
                                </div>

                                {hasPasswordProvider && (
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="dean-security-current-password" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <LockKeyhole size={14} /> Current Password
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                id="dean-security-current-password"
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
                                    <label className="input-label" htmlFor="dean-security-new-password" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <LockKeyhole size={14} /> {hasPasswordProvider ? 'New Password' : 'Set Password'}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="dean-security-new-password"
                                            className="input"
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min 8 chars, A-Z, 0-9"
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
                                    <label className="input-label" htmlFor="dean-security-confirm-password" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <LockKeyhole size={14} /> Confirm {hasPasswordProvider ? 'New Password' : 'Password'}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="dean-security-confirm-password"
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
                                <button className="btn btn-primary" onClick={handleUpdatePassword} disabled={savingPassword} id="dean-settings-save-security">
                                    {savingPassword ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {savingPassword ? 'Saving...' : hasPasswordProvider ? 'Update Password' : 'Set Password'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
