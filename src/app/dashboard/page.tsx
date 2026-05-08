'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { format, parseISO } from 'date-fns';
import { getBurndownData } from '@/lib/calculations';
import {
    Plus,
    Clock,
    Target,
    TrendingUp,
    Activity,
    Calendar,
    ArrowRight,
    Flame,
    BarChart3,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Area,
    AreaChart,
} from 'recharts';

export default function DashboardPage() {
    const { user, logs, stats } = useApp();
    const router = useRouter();

    if (!user) return null;

    const recentLogs = [...logs]
        .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
        .slice(0, 5);

    const burndownData = getBurndownData(logs, user.totalRequiredHours, user.startDate, user.endDate);

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--slate-800)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    boxShadow: 'var(--shadow-xl)',
                }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 6 }}>{label}</p>
                    {payload.map((entry, i) => (
                        <p key={i} style={{ fontSize: 12, color: entry.color, marginBottom: 2 }}>
                            {entry.name}: {entry.value} hrs
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

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
                    onClick={() => router.push('/dashboard/log')}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(16,185,129,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary-400)',
                        }}>
                            <Clock size={20} />
                        </div>
                        <span className="badge badge-primary">This Week</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--primary-300)' }}>
                        {stats.hoursThisWeek}
                    </div>
                    <div className="stat-label">Hours This Week</div>
                </div>

                <div className="stat-tile stat-tile-emerald">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(16,185,129,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--emerald-400)',
                        }}>
                            <TrendingUp size={20} />
                        </div>
                        <span className="badge badge-success">Total</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--emerald-400)' }}>
                        {stats.totalRendered}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(245,158,11,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--amber-400)',
                        }}>
                            <Target size={20} />
                        </div>
                        <span className="badge badge-warning">Remaining</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--amber-400)' }}>
                        {stats.remaining}
                    </div>
                    <div className="stat-label">Hours Remaining</div>
                </div>

            </div>

            {/* Burn-down Chart */}
            {burndownData.length > 0 && (
                <div className="card" style={{ padding: 24, marginBottom: 32 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 20,
                    }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'rgba(16,185,129,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary-400)',
                        }}>
                            <BarChart3 size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Hours Burndown</h3>
                            <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Remaining hours vs ideal pace</p>
                        </div>
                    </div>

                    <div className="chart-container" style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={burndownData}>
                                <defs>
                                    <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis
                                    dataKey="week"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ paddingTop: 16, fontSize: 12, color: '#94a3b8' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="remaining"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#colorRemaining)"
                                    name="Actual Remaining"
                                    dot={{ fill: '#10b981', r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="ideal"
                                    stroke="#334155"
                                    strokeWidth={2}
                                    strokeDasharray="6 6"
                                    name="Ideal Pace"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Quick Stats Row */}
            <div className="quick-stats-grid" style={{
                display: 'grid',
                gap: 16,
                marginBottom: 32,
            }}>
                <div className="card-glass" style={{ padding: 20, textAlign: 'center' }}>
                    <Flame size={22} style={{ color: 'var(--amber-400)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{stats.daysLogged}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Logged</div>
                </div>
                <div className="card-glass" style={{ padding: 20, textAlign: 'center' }}>
                    <Calendar size={22} style={{ color: 'var(--primary-400)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>
                        {stats.totalRequired > 0 ? Math.ceil(stats.remaining / Math.max(stats.weeklyAverage, 1)) : 0}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weeks Left</div>
                </div>
                <div className="card-glass" style={{ padding: 20, textAlign: 'center' }}>
                    <Target size={22} style={{ color: 'var(--emerald-400)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>
                        {stats.daysLogged > 0 ? (stats.totalRendered / stats.daysLogged).toFixed(1) : 0}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Hrs/Day</div>
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
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</h3>
                    {logs.length > 0 && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => router.push('/dashboard/history')}
                            id="dashboard-view-all"
                        >
                            View All <ArrowRight size={14} />
                        </button>
                    )}
                </div>

                {recentLogs.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: 'var(--slate-500)',
                    }}>
                        <Clock size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No activity yet</p>
                        <p style={{ fontSize: 13 }}>
                            Start logging your daily work to see your activity here.
                        </p>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => router.push('/dashboard/log')}
                            style={{ marginTop: 16 }}
                            id="dashboard-first-log"
                        >
                            <Plus size={16} /> Log Your First Day
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentLogs.map((log) => (
                            <div
                                key={log.id}
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
                                onClick={() => router.push(`/dashboard/log?edit=${log.id}`)}
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
                                    <Calendar size={18} style={{ color: 'var(--primary-400)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
                                            {format(parseISO(log.entryDate), 'MMM dd, yyyy')}
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {log.activityType.slice(0, 2).map((t) => (
                                                <span key={t} className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                                                    {t}
                                                </span>
                                            ))}
                                            {log.activityType.length > 2 && (
                                                <span className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                                                    +{log.activityType.length - 2}
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
                                        {log.taskDescription.replace(/<[^>]*>/g, '').substring(0, 100)}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-300)' }}>
                                        {log.dailyHours}h
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>
                                        {log.supervisor}
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
