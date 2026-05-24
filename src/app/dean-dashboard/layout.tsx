'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/lib/context';
import { navigateWithLoader } from '@/lib/route-loading';
import {
    LayoutDashboard,
    Users,
    Clock,
    FileText,
    AlertTriangle,
    BookOpen,
    Settings,
    LogOut,
    X,
    ChevronRight,
    ChevronsLeft,
    MessageCircle,
} from 'lucide-react';

const navItems = [
    { href: '/dean-dashboard/ojt-profiles', label: 'OJT Profiles', icon: Users },
    { href: '/dean-dashboard/ojt-hours', label: 'OJT Hours', icon: Clock },
    { href: '/dean-dashboard/weekly-reports', label: 'Weekly Reports', icon: FileText },
    { href: '/dean-dashboard/sanctions', label: 'OJT Sanctions', icon: AlertTriangle },
    { href: '/dean-dashboard/competencies', label: 'Competencies', icon: BookOpen },
    { href: '/dean-dashboard/chat', label: 'Messages', icon: MessageCircle },
];

export default function DeanDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useApp();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [failedAvatarSrc, setFailedAvatarSrc] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            navigateWithLoader(router, '/login');
        }
        if (!loading && user && user.role !== 'dean') {
            navigateWithLoader(router, '/dashboard');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at top, rgba(16,185,129,0.08), transparent 34%), var(--slate-950)',
            }}>
                <div style={{
                    width: 48,
                    height: 48,
                    border: '3px solid rgba(16,185,129,0.22)',
                    borderTopColor: 'var(--primary-500)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const hasValidAvatar = Boolean(user.profileImage && failedAvatarSrc !== user.profileImage);

    const handleLogout = () => {
        logout();
        navigateWithLoader(router, '/');
    };

    return (
        <div className="dashboard-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'radial-gradient(circle at top, rgba(16,185,129,0.05), transparent 32%), var(--slate-950)' }}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 90,
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {/* Collapse toggle */}
                {!sidebarCollapsed && (
                    <>
                        <button
                            onClick={() => setSidebarCollapsed(true)}
                            id="sidebar-toggle-btn"
                            title="Collapse sidebar"
                            style={{
                                display: 'none',
                                position: 'absolute',
                                top: 30,
                                right: 12,
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--slate-400)',
                                cursor: 'pointer',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 110,
                                padding: 0,
                                transition: 'background 150ms, color 150ms',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-600)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--slate-400)'; }}
                        >
                            <ChevronsLeft size={14} />
                        </button>
                        <style>{`@media (min-width: 1025px) { #sidebar-toggle-btn { display: flex !important; } }`}</style>
                    </>
                )}

                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                    marginBottom: 32,
                    paddingLeft: sidebarCollapsed ? 0 : 4,
                }}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', cursor: sidebarCollapsed ? 'pointer' : 'default' }}
                        onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
                        title={sidebarCollapsed ? 'Expand sidebar' : undefined}
                    >
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 18,
                            color: 'white',
                            flexShrink: 0,
                            transition: 'transform 150ms, box-shadow 150ms',
                            ...(sidebarCollapsed ? { cursor: 'pointer' } : {}),
                        }}
                            onMouseEnter={sidebarCollapsed ? (e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(16,185,129,0.4)'; } : undefined}
                            onMouseLeave={sidebarCollapsed ? (e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; } : undefined}
                        >I</div>
                        {!sidebarCollapsed && (
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Internly Dean</span>
                        )}
                    </div>
                    {!sidebarCollapsed && (
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => setSidebarOpen(false)}
                            style={{ display: 'none' }}
                            id="sidebar-close-mobile"
                        >
                            <X size={18} />
                        </button>
                    )}
                    <style>{`@media (max-width: 1024px) { #sidebar-close-mobile { display: flex !important; } }`}</style>
                </div>

                {/* Nav */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <button
                                key={item.href}
                                className={`nav-link ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    navigateWithLoader(router, item.href);
                                    setSidebarOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                    border: isActive ? undefined : 'none',
                                    padding: sidebarCollapsed ? '10px 0' : undefined,
                                }}
                                title={sidebarCollapsed ? item.label : undefined}
                                id={`nav-${item.href.split('/').pop()}`}
                            >
                                <Icon size={18} />
                                {!sidebarCollapsed && item.label}
                                {!sidebarCollapsed && isActive && (
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Settings */}
                <button
                    className={`nav-link ${pathname === '/dean-dashboard/settings' ? 'active' : ''}`}
                    onClick={() => {
                        navigateWithLoader(router, '/dean-dashboard/settings');
                        setSidebarOpen(false);
                    }}
                    style={{
                        width: '100%',
                        textAlign: 'left',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        border: pathname === '/dean-dashboard/settings' ? undefined : 'none',
                        marginTop: 12,
                        padding: sidebarCollapsed ? '10px 0' : undefined,
                    }}
                    title={sidebarCollapsed ? 'Settings' : undefined}
                    id="nav-settings"
                >
                    <Settings size={18} />
                    {!sidebarCollapsed && 'Settings'}
                    {!sidebarCollapsed && pathname === '/dean-dashboard/settings' && (
                        <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                    )}
                </button>

                {/* Logout */}
                <button
                    className="nav-link"
                    onClick={() => setShowLogoutConfirm(true)}
                    style={{
                        width: '100%',
                        textAlign: 'left',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        border: 'none',
                        color: 'var(--rose-400)',
                        marginTop: 16,
                        padding: sidebarCollapsed ? '10px 0' : undefined,
                    }}
                    title={sidebarCollapsed ? 'Log Out' : undefined}
                    id="nav-logout"
                >
                    <LogOut size={18} />
                    {!sidebarCollapsed && 'Log Out'}
                </button>

                {/* User info */}
                <div style={{
                    padding: sidebarCollapsed ? '8px 0' : '12px',
                    borderRadius: 'var(--radius-md)',
                    background: sidebarCollapsed ? 'transparent' : 'rgba(255,255,255,0.03)',
                    border: sidebarCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    marginTop: 16,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    gap: sidebarCollapsed ? 0 : 10,
                    overflow: 'hidden',
                }}>
                    {hasValidAvatar ? (
                        <img
                            src={user.profileImage}
                            alt={user.name}
                            title={sidebarCollapsed ? `${user.name}\n${user.email}` : undefined}
                            onError={() => setFailedAvatarSrc(user.profileImage || '')}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                objectFit: 'cover',
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        <div
                            title={sidebarCollapsed ? `${user.name}\n${user.email}` : undefined}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #34d399, #10b981)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 14,
                                color: 'white',
                                flexShrink: 0,
                            }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    {!sidebarCollapsed && (
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.name}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Dean
                            </p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Mobile header */}
                <div style={{ display: 'none', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.2)' }} id="mobile-header">
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <span style={{ fontWeight: 600, color: 'white' }}>Internly Dean</span>
                </div>
                <style>{`@media (max-width: 1024px) { #mobile-header { display: flex !important; } }`}</style>

                {/* Content area */}
                <div className="dean-main-content" style={{
                    flex: 1,
                    overflow: 'auto',
                }}>
                    {children}
                </div>
            </main>

            {/* Logout confirm modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400, padding: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Confirm Logout</h2>
                        <p style={{ color: 'var(--slate-400)', marginBottom: 24 }}>Are you sure you want to log out?</p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleLogout}
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
