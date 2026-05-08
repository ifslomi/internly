'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import AccountProfilePanel from '@/components/AccountProfilePanel';
import {
    Settings as SettingsIcon,
    Clock,
    Bell,
    Save,
    Check,
    Trash2,
    Shield,
    X,
    LogOut,
} from 'lucide-react';

export default function SettingsPage() {
    const { user, updateUser, logout } = useApp();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'internship' | 'account' | 'notifications'>('internship');
    const [saved, setSaved] = useState(false);
    const [showMobileLogout, setShowMobileLogout] = useState(false);

    // Internship fields
    const [totalHours, setTotalHours] = useState(user?.totalRequiredHours || 480);
    const [startDate, setStartDate] = useState(user?.startDate || '');
    const [endDate, setEndDate] = useState(user?.endDate || '');

    // Notifications
    const [reminderEnabled, setReminderEnabled] = useState(user?.reminderEnabled ?? true);

    // Supervisor management
    const [supervisors, setSupervisors] = useState(user?.supervisors || []);
    const [newSupervisor, setNewSupervisor] = useState('');

    if (!user) return null;

    const showSaved = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSaveInternship = () => {
        updateUser({
            totalRequiredHours: totalHours,
            startDate,
            endDate: endDate || undefined,
        });
        showSaved();
    };

    const handleSaveNotifications = () => {
        updateUser({ reminderEnabled });
        showSaved();
    };

    const addSupervisor = () => {
        if (newSupervisor.trim() && !supervisors.includes(newSupervisor.trim())) {
            const updated = [...supervisors, newSupervisor.trim()];
            setSupervisors(updated);
            updateUser({ supervisors: updated });
            setNewSupervisor('');
        }
    };

    const removeSupervisor = (name: string) => {
        const updated = supervisors.filter((s) => s !== name);
        setSupervisors(updated);
        updateUser({ supervisors: updated });
    };

    const tabs = [
        { id: 'internship' as const, label: 'Internship Details', icon: Clock },
        { id: 'account' as const, label: 'Account', icon: User },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    ];

    return (
        <div>
            {/* Success Toast */}
            {saved && (
                <div style={{
                    position: 'fixed',
                    top: 24,
                    right: 24,
                    zIndex: 2000,
                    padding: '16px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    {activeTab === 'account' && (
                        <div className="card-elevated">
                            <AccountProfilePanel title="Account" description="This is the same account section used by the Profile page." />
                        </div>
                    )}
                                        Add
                                    </button>
                                </div>

                                {supervisors.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {supervisors.map((s) => (
                                            <div
                                                key={s}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 12px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: 'rgba(16,185,129,0.1)',
                                                    border: '1px solid rgba(16,185,129,0.2)',
                                                    fontSize: 13,
                                                    color: 'var(--primary-300)',
                                                }}
                                            >
                                                {s}
                                                <button
                                                    onClick={() => removeSupervisor(s)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--slate-500)',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        display: 'flex',
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: 13, color: 'var(--slate-600)', fontStyle: 'italic' }}>
                                        No supervisors saved yet. They&apos;ll be auto-added as you log.
                                    </p>
                                )}
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleSaveInternship}
                                id="settings-save-internship"
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: 'rgba(6,182,212,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--cyan-400)',
                                }}>
                                    <User size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Account Settings</h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                                        Update your personal information
                                    </p>
                                </div>
                            </div>

                            {/* Profile Photo Section */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 20,
                                padding: 20,
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(15,23,42,0.4)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                marginBottom: 24,
                                flexWrap: 'wrap',
                            }}>
                                <div style={{ position: 'relative' }}>
                                    {profileImage ? (
                                        <img
                                            src={profileImage}
                                            alt={name}
                                            style={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: 20,
                                                objectFit: 'cover',
                                                border: '3px solid rgba(16,185,129,0.3)',
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 20,
                                            background: 'linear-gradient(135deg, #34d399, #10b981)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: 32,
                                            color: 'white',
                                            border: '3px solid rgba(16,185,129,0.3)',
                                        }}>
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            position: 'absolute',
                                            bottom: -4,
                                            right: -4,
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: 'var(--primary-500)',
                                            border: '2px solid var(--slate-900)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: 'white',
                                            transition: 'all 150ms ease',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-400)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary-500)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                        id="settings-upload-photo-btn"
                                    >
                                        <Camera size={14} />
                                    </button>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Profile Photo</h3>
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 12 }}>
                                        JPG, PNG or GIF. Max 2MB.
                                    </p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            id="settings-upload-photo"
                                        >
                                            {uploadingImage ? (
                                                <>
                                                    <span style={{
                                                        width: 14, height: 14,
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTopColor: 'white',
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite',
                                                        display: 'inline-block',
                                                    }} />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={14} /> Upload Photo
                                                </>
                                            )}
                                        </button>
                                        {profileImage && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={handleRemoveImage}
                                                style={{ color: 'var(--rose-400)' }}
                                                id="settings-remove-photo"
                                            >
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                        id="settings-photo-input"
                                    />
                                </div>
                            </div>

                            <div id="settings-account-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-name">Full Name</label>
                                    <input
                                        id="settings-name"
                                        className="input"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-email">Email</label>
                                    <input
                                        id="settings-email"
                                        className="input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="divider" />

                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Shield size={16} style={{ flexShrink: 0 }} />
                                Change Password
                            </h3>

                            <div id="settings-password-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-new-password">New Password</label>
                                    <input
                                        id="settings-new-password"
                                        className="input"
                                        type="password"
                                        placeholder="Leave blank to keep current"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-confirm-password">Confirm New Password</label>
                                    <input
                                        id="settings-confirm-password"
                                        className="input"
                                        type="password"
                                        placeholder="Re-enter new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {newPassword && newPassword !== confirmPassword && (
                                <p style={{ fontSize: 12, color: 'var(--rose-400)', marginBottom: 16 }}>
                                    Passwords do not match
                                </p>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={handleSaveAccount}
                                disabled={newPassword !== '' && newPassword !== confirmPassword}
                                id="settings-save-account"
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: 'rgba(245,158,11,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--amber-400)',
                                }}>
                                    <Bell size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Notification Settings</h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                                        Configure your daily reminders
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 20,
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(15,23,42,0.4)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                marginBottom: 24,
                            }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Daily Reminder</h3>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                                        Receive a reminder at 5:00 PM: &ldquo;Don&apos;t forget to log your hours for today!&rdquo;
                                    </p>
                                </div>
                                <label style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    width: 48,
                                    height: 26,
                                    cursor: 'pointer',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={reminderEnabled}
                                        onChange={(e) => setReminderEnabled(e.target.checked)}
                                        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: 'var(--radius-full)',
                                        background: reminderEnabled ? 'var(--primary-500)' : 'rgba(255,255,255,0.1)',
                                        transition: 'all 200ms ease',
                                    }}>
                                        <span style={{
                                            position: 'absolute',
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: 'white',
                                            top: 3,
                                            left: reminderEnabled ? 25 : 3,
                                            transition: 'left 200ms ease',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        }} />
                                    </span>
                                </label>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleSaveNotifications}
                                id="settings-save-notifications"
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile-only Logout Section */}
            <div id="mobile-logout-section" style={{ display: 'none', marginTop: 32 }}>
                <style>{`
                    @media (max-width: 1024px) {
                        #mobile-logout-section { display: block !important; }
                    }
                `}</style>
                <div style={{
                    padding: 20,
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(244,63,94,0.04)',
                    border: '1px solid rgba(244,63,94,0.12)',
                }}>
                    <button
                        onClick={() => setShowMobileLogout(true)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            padding: '12px 20px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(244,63,94,0.1)',
                            border: '1px solid rgba(244,63,94,0.2)',
                            color: 'var(--rose-400)',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(244,63,94,0.15)';
                            e.currentTarget.style.borderColor = 'rgba(244,63,94,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(244,63,94,0.1)';
                            e.currentTarget.style.borderColor = 'rgba(244,63,94,0.2)';
                        }}
                    >
                        <LogOut size={18} />
                        Log Out
                    </button>
                </div>
            </div>

            {/* Mobile Logout Confirmation Modal */}
            {showMobileLogout && (
                <div className="modal-overlay" onClick={() => setShowMobileLogout(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, padding: 32 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: 16,
                                background: 'rgba(244,63,94,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <LogOut size={28} style={{ color: 'var(--rose-400)' }} />
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Log Out?</h3>
                            <p style={{ fontSize: 14, color: 'var(--slate-400)', marginBottom: 24 }}>
                                Are you sure you want to log out of your account?
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowMobileLogout(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => { logout(); router.push('/'); }}
                                >
                                    <LogOut size={16} /> Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Responsive style for settings grid */}
            <style>{`
                @media (max-width: 768px) {
                    .settings-grid { grid-template-columns: 1fr !important; }
                    .settings-tab-nav {
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 10 !important;
                        background: var(--slate-900) !important;
                        margin: -4px -4px 0 !important;
                        padding: 8px !important;
                        border-radius: var(--radius-md) !important;
                        display: flex !important;
                        gap: 4px !important;
                    }
                    .settings-tab-nav .nav-link {
                        flex: 1 !important;
                        justify-content: center !important;
                        font-size: 12px !important;
                        padding: 8px 4px !important;
                        white-space: nowrap !important;
                    }
                    #settings-account-grid,
                    #settings-password-grid,
                    #settings-dates-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
