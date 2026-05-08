'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import AccountProfilePanel from '@/components/AccountProfilePanel';
import {
    Clock,
    Bell,
    Save,
    Check,
    X,
    LogOut,
    User,
} from 'lucide-react';

export default function SettingsPage() {
    const { user, updateUser, logout } = useApp();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'internship' | 'account' | 'notifications'>('internship');
    const [saved, setSaved] = useState(false);
    const [showMobileLogout, setShowMobileLogout] = useState(false);
    const [totalHours, setTotalHours] = useState(user?.totalRequiredHours || 480);
    const [startDate, setStartDate] = useState(user?.startDate || '');
    const [endDate, setEndDate] = useState(user?.endDate || '');
    const [reminderEnabled, setReminderEnabled] = useState(user?.reminderEnabled ?? true);
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
                    animation: 'slideDown 300ms ease',
                }}>
                    <Check size={20} />
                    Settings saved successfully!
                </div>
            )}
            <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Manage your internship details, account, and preferences</p>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
                <div className="card settings-tab-nav" style={{ padding: 12, position: 'sticky', top: 32, zIndex: 10, background: 'rgb(30, 41, 59)' }}>
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
                    {activeTab === 'internship' && (
                        <div className="card-elevated">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Internship Details</h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Update your OJT hour requirements and dates</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-total-hours">Total Required Hours</label>
                                    <input id="settings-total-hours" className="input" type="number" min={1} max={5000} value={totalHours} onChange={(e) => setTotalHours(Number(e.target.value))} />
                                </div>

                                <div id="settings-dates-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="settings-start-date">Internship Start Date</label>
                                        <input id="settings-start-date" className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="settings-end-date">Expected End Date (optional)</label>
                                        <input id="settings-end-date" className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="divider" style={{ margin: '24px 0' }} />

                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Supervisor Directory</h3>
                                <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>Save frequently used supervisor names for quick selection when logging.</p>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <input className="input" placeholder="Add a supervisor name" value={newSupervisor} onChange={(e) => setNewSupervisor(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSupervisor())} />
                                    <button className="btn btn-secondary btn-sm" onClick={addSupervisor}>Add</button>
                                </div>
                                {supervisors.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {supervisors.map((s) => (
                                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: 'var(--primary-300)' }}>
                                                {s}
                                                <button onClick={() => removeSupervisor(s)} style={{ background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: 13, color: 'var(--slate-600)', fontStyle: 'italic' }}>No supervisors saved yet. They&apos;ll be auto-added as you log.</p>
                                )}
                            </div>

                            <button className="btn btn-primary" onClick={handleSaveInternship} id="settings-save-internship">
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="card-elevated">
                            <AccountProfilePanel title="Account" description="The account tab and profile page now use the same shared UI." />
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

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 'var(--radius-md)', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Reminder Notifications</h3>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Receive reminders for pending logs and reports</p>
                                </div>
                                <button onClick={() => setReminderEnabled(!reminderEnabled)} style={{ width: 56, height: 32, borderRadius: 'var(--radius-full)', background: reminderEnabled ? 'var(--primary-500)' : 'rgba(255,255,255,0.1)', border: 'none', position: 'relative', cursor: 'pointer' }} id="settings-toggle-reminders">
                                    <span style={{ position: 'absolute', top: 4, left: reminderEnabled ? 28 : 4, width: 24, height: 24, borderRadius: '50%', background: 'white', transition: 'left 150ms ease' }} />
                                </button>
                            </div>

                            <button className="btn btn-primary" onClick={handleSaveNotifications} id="settings-save-notifications">
                                <Save size={16} /> Save Notification Settings
                            </button>
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
