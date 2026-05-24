'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Award, Clock, Target, TrendingUp } from 'lucide-react';

import { useApp } from '@/lib/context';
import { navigateWithLoader } from '@/lib/route-loading';
import type { WeeklyReport } from '@/lib/types';

export default function DashboardPage() {
    const { user, competencies, stats, getWeeklyReports } = useApp();
    const router = useRouter();
    const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);

    const toFiniteNumber = (value: unknown) => {
        const numericValue = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(numericValue) ? numericValue : 0;
    };

    const formatDateSafe = (value?: string | null, dateFormat = 'MMM dd, yyyy') => {
        if (!value) {
            return 'N/A';
        }

        const parsedIsoDate = parseISO(value);
        if (!Number.isNaN(parsedIsoDate.getTime())) {
            return format(parsedIsoDate, dateFormat);
        }

        const fallbackDate = new Date(value);
        return Number.isNaN(fallbackDate.getTime()) ? 'N/A' : format(fallbackDate, dateFormat);
    };

    useEffect(() => {
        if (!user) {
            setWeeklyReports([]);
            return;
        }

        let active = true;

        getWeeklyReports(user.id)
            .then((reports) => {
                if (active) {
                    setWeeklyReports(reports);
                }
            })
            .catch((error) => {
                console.error('Failed to load weekly reports for dashboard:', error);
                if (active) {
                    setWeeklyReports([]);
                }
            });

        return () => {
            active = false;
        };
    }, [getWeeklyReports, user]);

    const sortedWeeklyReports = useMemo(
        () => [...weeklyReports].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
        [weeklyReports]
    );

    const weeklyReportHoursTotal = useMemo(
        () => weeklyReports.reduce((sum, report) => sum + toFiniteNumber(report.hoursRendered), 0),
        [weeklyReports]
    );

    const safeHoursThisWeek = toFiniteNumber(stats.hoursThisWeek);
    const safeTotalRequired = toFiniteNumber(stats.totalRequired);
    const safeTotalRendered = toFiniteNumber(stats.totalRendered);

    // Upload-first workflow: once reports exist, dashboard totals come from submitted reports.
    const displayTotalRendered = weeklyReports.length > 0 ? weeklyReportHoursTotal : safeTotalRendered;
    const displayRemaining = Math.max(0, safeTotalRequired - displayTotalRendered);
    const displayProgressPercentage = safeTotalRequired > 0
        ? Math.min(100, (displayTotalRendered / safeTotalRequired) * 100)
        : 0;

    const latestWeeklyReport = sortedWeeklyReports[0] || null;

    const recentCompetencies = useMemo(
        () =>
            [...competencies]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 4),
        [competencies]
    );

    if (!user) return null;

    const firstName = user.name.split(' ')[0] || user.name;

    return (
        <div>
            <div
                className="dash-header"
                style={{
                    marginBottom: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                }}
            >
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {firstName}
                    </h1>
                    <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                        Here&apos;s your internship progress overview
                    </p>
                </div>
            </div>

            <div
                className="stat-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 12,
                    marginBottom: 32,
                }}
            >
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
                            {safeHoursThisWeek}
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
                            {displayTotalRendered}
                        </div>
                    </div>
                    <div className="stat-label">Total Hours Rendered</div>
                    <div style={{ marginTop: 8 }}>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${displayProgressPercentage}%` }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>
                            {Math.round(displayProgressPercentage * 10) / 10}% of {safeTotalRequired} hrs
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
                            {displayRemaining}
                        </div>
                    </div>
                    <div className="stat-label">Hours Remaining</div>
                </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Weekly Report Summary</h3>
                        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Submitted weekly report hours and deadlines.</p>
                    </div>
                </div>

                {latestWeeklyReport ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <div className="stat-tile stat-tile-indigo" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span className="badge badge-primary">Latest Week {latestWeeklyReport.weekNumber}</span>
                                <Clock size={18} style={{ color: 'var(--primary-400)' }} />
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 4 }}>
                                {latestWeeklyReport.hoursRendered} hrs
                            </div>
                            <div className="stat-label">Rendered duty hours</div>
                            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--slate-500)' }}>
                                Submitted on {formatDateSafe(latestWeeklyReport.submittedAt)}
                            </p>
                        </div>

                        <div className="stat-tile stat-tile-emerald" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span className="badge badge-success">Deadline</span>
                                <Target size={18} style={{ color: 'var(--emerald-400)' }} />
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 4 }}>
                                {formatDateSafe(latestWeeklyReport.deadline)}
                            </div>
                            <div className="stat-label">Submission deadline</div>
                            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--slate-500)' }}>
                                Status: Submitted
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate-500)' }}>
                        <Clock size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No weekly reports submitted yet</p>
                        <p style={{ fontSize: 13 }}>Submit your weekly report to see rendered duty hours here.</p>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigateWithLoader(router, '/dashboard/reports')}
                            style={{ marginTop: 16 }}
                        >
                            Go to Weekly Reports
                        </button>
                    </div>
                )}

                {sortedWeeklyReports.length > 0 && (
                    <div style={{ marginTop: 20, overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--slate-400)', fontSize: 12 }}>
                                    <th style={{ padding: '10px 12px' }}>Week</th>
                                    <th style={{ padding: '10px 12px' }}>Hours Rendered</th>
                                    <th style={{ padding: '10px 12px' }}>Deadline</th>
                                    <th style={{ padding: '10px 12px' }}>Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedWeeklyReports.map((report) => (
                                    <tr key={report.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px', fontSize: 13, color: 'white', fontWeight: 600 }}>Week {report.weekNumber}</td>
                                        <td style={{ padding: '12px', fontSize: 13, color: 'var(--slate-300)' }}>{report.hoursRendered} hrs</td>
                                        <td style={{ padding: '12px', fontSize: 13, color: 'var(--slate-300)' }}>
                                            {formatDateSafe(report.deadline)}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: 13, color: 'var(--slate-300)' }}>
                                            {formatDateSafe(report.submittedAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Competencies</h3>
                        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Your latest competency entries without daily log history.</p>
                    </div>
                    <Award size={18} style={{ color: 'var(--primary-400)' }} />
                </div>

                {recentCompetencies.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--slate-500)' }}>
                        <Award size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No competency entries yet</p>
                        <p style={{ fontSize: 13 }}>Add competencies to see them appear here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                        {recentCompetencies.map((comp) => (
                            <div
                                key={comp.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: 12,
                                    alignItems: 'center',
                                    padding: '14px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>
                                        {comp.areaCovered}
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 0 }}>
                                        {comp.outcome}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-300)' }}>
                                        {formatDateSafe(comp.date)}
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--slate-500)' }}>{comp.activity}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
