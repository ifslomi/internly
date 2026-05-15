'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { format, parseISO } from 'date-fns';
import {
    Plus,
    Clock,
    Target,
    TrendingUp,
    Activity,
} from 'lucide-react';

export default function DashboardPage() {
    const { user, logs, competencies, stats } = useApp();
    const router = useRouter();

    if (!user) return null;

    const cleanText = (value: string) => value.replace(/<[^>]*>/g, '');
    const activityItems = [
        ...logs.map((log) => ({
            id: `log-${log.id}`,
            type: 'log' as const,
            date: log.entryDate,
            title: format(parseISO(log.entryDate), 'MMM dd, yyyy'),
            description: cleanText(log.taskDescription),
            tags: log.activityType,
            rightTop: `${log.dailyHours}h`,
            rightBottom: log.supervisor,
            href: '/dashboard/reports',
        })),
        ...competencies.map((comp) => ({
            id: `competency-${comp.id}`,
            type: 'competency' as const,
            date: comp.date,
            title: format(parseISO(comp.date), 'MMM dd, yyyy'),
            description: comp.outcome,
            tags: [(comp.areaCovered.match(/[A-C]\.[0-9]+/i) || [comp.areaCovered])[0], 'Competency'],
            rightTop: (comp.areaCovered.match(/[A-C]\.[0-9]+/i) || ['Area'])[0],
            rightBottom: comp.activity,
            href: '/dashboard/competencies',
        })),
    ];

    const recentActivities = activityItems
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);

    return (
        <div>
            {/* Header */}
            <div className="dash-header" style={{
                marginBottom: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
            }}>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]}
                    </h1>
                    <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                        Here&apos;s your internship progress overview
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => router.push('/dashboard/reports')}
                    id="dashboard-log-btn"
                >
                    <Plus size={18} />
                    <span className="log-btn-full">Log Today&apos;s Work</span>
                    <span className="log-btn-short">Log Work</span>
                </button>
                <style>{`
                    .log-btn-short { display: none; }
                    @media (max-width: 768px) {
                        .log-btn-full { display: none !important; }
                        .log-btn-short { display: inline !important; }
                    }
                `}</style>
            </div>

            {/* Stat Tiles */}
            <div className="stat-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                marginBottom: 32,
            }}>
                <div className="stat-tile stat-tile-indigo">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span className="badge badge-primary">This Week</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(16,185,129,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary-400)',
                            flexShrink: 0,
                        }}>
                            <Clock size={20} />
                        </div>
                        <div className="stat-value" style={{ color: 'var(--primary-300)', marginBottom: 0 }}>
                            {stats.hoursThisWeek}
                        </div>
                    </div>
                    <div className="stat-label">Hours This Week</div>
                </div>

                <div className="stat-tile stat-tile-emerald">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span className="badge badge-success">Total</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(16,185,129,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--emerald-400)',
                            flexShrink: 0,
                        }}>
                            <TrendingUp size={20} />
                        </div>
                        <div className="stat-value" style={{ color: 'var(--emerald-400)', marginBottom: 0 }}>
                            {stats.totalRendered}
                        </div>
                    </div>
                    <div className="stat-label">Total Hours Rendered</div>
                    <div style={{ marginTop: 8 }}>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${stats.progressPercentage}%` }}
                            />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>
                            {stats.progressPercentage}% of {stats.totalRequired} hrs
                        </p>
                    </div>
                </div>

                <div className="stat-tile stat-tile-amber stat-tile-extra" id="stat-remaining">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span className="badge badge-warning">Remaining</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(245,158,11,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--amber-400)',
                            flexShrink: 0,
                        }}>
                            <Target size={20} />
                        </div>
                        <div className="stat-value" style={{ color: 'var(--amber-400)', marginBottom: 0 }}>
                            {stats.remaining}
                        </div>
                    </div>
                    <div className="stat-label">Hours Remaining</div>
                </div>

            </div>

            {/* Recent Activity */}
            <div className="card" style={{ padding: 24 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</h3>
                        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Logs and competencies across your account.</p>
                    </div>
                </div>

                {recentActivities.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: 'var(--slate-500)',
                    }}>
                        <Clock size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No activity yet</p>
                        <p style={{ fontSize: 13 }}>
                            Log your work or add competencies to see activity here.
                        </p>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => router.push('/dashboard/reports')}
                            style={{ marginTop: 16 }}
                            id="dashboard-first-log"
                        >
                            <Plus size={16} /> Log Your First Day
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentActivities.map((item) => (
                            <div
                                key={item.id}
                                className="recent-activity-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    padding: '14px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'all 150ms ease',
                                    cursor: 'pointer',
                                }}
                                onClick={() => router.push(item.href)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(16,185,129,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(16,185,129,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                }}
                            >
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: 'rgba(16,185,129,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    {item.type === 'log' ? (
                                        <Activity size={18} style={{ color: 'var(--primary-400)' }} />
                                    ) : (
                                        <Target size={18} style={{ color: 'var(--primary-400)' }} />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                                            {item.title}
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {item.tags.slice(0, 2).map((tag) => (
                                                <span key={tag} className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                                                    {tag}
                                                </span>
                                            ))}
                                            {item.tags.length > 2 && (
                                                <span className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                                                    +{item.tags.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p style={{
                                        fontSize: 13,
                                        color: 'var(--slate-400)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {item.description.substring(0, 100)}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-300)' }}>
                                        {item.rightTop}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>
                                        {item.rightBottom}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
