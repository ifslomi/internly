'use client';
import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import AccountProfilePanel from '@/components/AccountProfilePanel';
import { Building2, Bell, Save, Check, LogOut, User, Mail, Phone, MapPin, PencilLine, X } from 'lucide-react';

export default function SettingsPage() {
    const { user, updateUser, logout } = useApp();
    const [activeTab, setActiveTab] = useState<'company' | 'account' | 'notifications'>('company');
    const [saved, setSaved] = useState(false);
    const [showMobileLogout, setShowMobileLogout] = useState(false);
    const [companyName, setCompanyName] = useState(user?.company?.name || user?.companyName || '');
    const [companyAddress, setCompanyAddress] = useState(user?.company?.address || user?.companyAddress || '');
    const [companyContactNumber, setCompanyContactNumber] = useState(user?.company?.contactNumber || user?.companyContactNumber || '');
    const [companyEmail, setCompanyEmail] = useState(user?.company?.email || user?.companyEmail || '');
    const [isEditingCompany, setIsEditingCompany] = useState(false);
    const [reminderEnabled, setReminderEnabled] = useState(user?.reminderEnabled ?? true);

    if (!user) return null;

    const showSaved = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSaveCompany = () => {
        updateUser({
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
        setIsEditingCompany(false);
        showSaved();
    };

    const resetCompanyForm = () => {
        setCompanyName(user?.company?.name || user?.companyName || '');
        setCompanyAddress(user?.company?.address || user?.companyAddress || '');
        setCompanyContactNumber(user?.company?.contactNumber || user?.companyContactNumber || '');
        setCompanyEmail(user?.company?.email || user?.companyEmail || '');
    };

    const handleSaveNotifications = () => {
        updateUser({ reminderEnabled });
        showSaved();
    };

    const tabs = [
        { id: 'company' as const, label: 'Company Details', icon: Building2 },
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
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Manage your student info, company details, and preferences</p>
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
                                    <input id="settings-company-name" className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} readOnly={!isEditingCompany} aria-readonly={!isEditingCompany} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="settings-company-address" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /> Company full address</label>
                                    <input id="settings-company-address" className="input" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} readOnly={!isEditingCompany} aria-readonly={!isEditingCompany} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="settings-company-contact" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={14} /> Company contact number</label>
                                        <input id="settings-company-contact" className="input" value={companyContactNumber} onChange={(e) => setCompanyContactNumber(e.target.value)} readOnly={!isEditingCompany} aria-readonly={!isEditingCompany} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="settings-company-email" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} /> Company email address</label>
                                        <input id="settings-company-email" className="input" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} readOnly={!isEditingCompany} aria-readonly={!isEditingCompany} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                {!isEditingCompany ? (
                                    <button className="btn btn-primary" onClick={() => setIsEditingCompany(true)} id="settings-edit-company">
                                        <PencilLine size={16} /> Edit
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                resetCompanyForm();
                                                setIsEditingCompany(false);
                                            }}
                                            id="settings-cancel-company"
                                        >
                                            <X size={16} /> Cancel
                                        </button>
                                        <button className="btn btn-primary" onClick={handleSaveCompany} id="settings-save-company">
                                            <Save size={16} /> Save Changes
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="card-elevated">
                            <AccountProfilePanel title="Account" description="Manage your student profile details." />
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