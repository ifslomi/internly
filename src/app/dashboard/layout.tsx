'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/lib/context';
import {
    LayoutDashboard,
    Plus,
    FileText,
    History,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ClipboardList,
    BarChart3,
    Clock,
    MessageCircle,
    User,
    Award,
    Calendar,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/hours', label: 'OJT Hours', icon: Clock },
    { href: '/dashboard/log', label: 'Log Today\'s Work', icon: Plus },
    { href: '/dashboard/reports', label: 'Weekly Reports', icon: FileText },
    { href: '/dashboard/competencies', label: 'Competencies', icon: Award },
    { href: '/dashboard/sanctions', label: 'Sanctions', icon: Calendar },
    { href: '/dashboard/history', label: 'Logs History', icon: History },
    { href: '/dashboard/chat', label: 'Messages', icon: MessageCircle },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const mobileNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/log', label: 'Logs', icon: ClipboardList },
    { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useApp();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
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

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(16,185,129,0.05), transparent 32%), var(--slate-950)' }}>
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
                {/* Collapse toggle - only visible when expanded (desktop only) */}
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
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Internly</span>
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
                                    router.push(item.href);
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
                    {user.profileImage ? (
                        <img
                            src={user.profileImage}
                            alt={user.name}
                            title={sidebarCollapsed ? `${user.name}\n${user.email}` : undefined}
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
                            <p style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'white',
                                marginBottom: 2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {user.name}
                            </p>
                            <p style={{
                                fontSize: 12,
                                color: 'var(--slate-500)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {user.email}
                            </p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
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
                                    onClick={() => setShowLogoutConfirm(false)}
                                    id="logout-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleLogout}
                                    id="logout-confirm"
                                >
                                    <LogOut size={16} /> Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Mobile header */}
                <div style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                    padding: '0 0 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }} id="mobile-header">
                    <style>{`@media (max-width: 1024px) { #mobile-header { display: flex !important; } }`}</style>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 15,
                            color: 'white',
                        }}>I</div>
                        <span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Internly</span>
                    </div>
                    <div style={{ width: 40 }} />
                </div>

                {children}
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav" id="mobile-bottom-nav">
                <style>{`
                    #mobile-bottom-nav { display: none; }
                    @media (max-width: 1024px) { #mobile-bottom-nav { display: flex !important; } }
                `}</style>
                {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <button
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 3,
                                padding: '8px 0',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: isActive ? 'var(--primary-400)' : 'var(--slate-500)',
                                transition: 'color 150ms ease',
                                position: 'relative',
                            }}
                        >
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 20,
                                    height: 2,
                                    borderRadius: 2,
                                    background: 'var(--primary-400)',
                                }} />
                            )}
                            <Icon size={20} />
                            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: '0.01em' }}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
