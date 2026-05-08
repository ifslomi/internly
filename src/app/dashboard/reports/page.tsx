"use client"
import React from "react";

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Weekly Reports</h1>
      <p className="mb-4">Create and view weekly reports. Each report captures date, activity, task source, and remarks.</p>
      <button className="px-4 py-2 bg-emerald-600 text-white rounded">New Report</button>
    </div>
  );
}
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { getWeeksForLogs, getLogsForWeek } from '@/lib/calculations';
import { generatePDF } from '@/lib/pdf';
import { WeeklyReport } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import {
    FileText,
    Download,
    Calendar,
    Sparkles,
    ChevronDown,
    Eye,
    Clock,
} from 'lucide-react';

export default function ReportsPage() {
    const { user, logs, saveWeeklyReport: ctxSaveReport, getWeeklyReports: ctxGetReports } = useApp();
    const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
    const [reflection, setReflection] = useState('');
    const [showPreview, setShowPreview] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [draftingAI, setDraftingAI] = useState(false);
    const [savedReports, setSavedReports] = useState<WeeklyReport[]>([]);

    const weeks = useMemo(() => getWeeksForLogs(logs), [logs]);

    // Load saved reports from Firestore
    useEffect(() => {
        if (user) {
            ctxGetReports(user.id).then(setSavedReports).catch(console.error);
        }
    }, [user, ctxGetReports]);

    if (!user) return null;

    const selectedWeek = weeks[selectedWeekIdx];
    const weekLogs = selectedWeek
        ? getLogsForWeek(logs, selectedWeek.start, selectedWeek.end)
        : [];
    const weekTotalHours = weekLogs.reduce((s, l) => s + l.dailyHours, 0);

    // Load saved reflection when switching weeks
    const currentSavedReport = selectedWeek
        ? savedReports.find(
            (r) => r.weekStart === selectedWeek.start.toISOString()
        )
        : null;

    React.useEffect(() => {
        if (currentSavedReport) {
            setReflection(currentSavedReport.reflection);
        } else {
            setReflection('');
        }
    }, [selectedWeekIdx, currentSavedReport]);

    const handleSaveReport = async () => {
        if (!selectedWeek) return;
        const saved = await ctxSaveReport({
            userId: user.id,
            weekStart: selectedWeek.start.toISOString(),
            weekEnd: selectedWeek.end.toISOString(),
            reflection,
            logs: weekLogs,
        });
        // Update local state with the saved report
        setSavedReports(prev => {
            const idx = prev.findIndex(r => r.weekStart === saved.weekStart);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
            }
            return [...prev, saved];
        });
    };

    const handleExportPDF = async () => {
        if (!selectedWeek) return;
        setGenerating(true);
        await handleSaveReport();
        try {
            await generatePDF(weekLogs, selectedWeek.label, reflection, user.name);
        } catch (err) {
            console.error('PDF generation failed:', err);
        }
        setGenerating(false);
    };

    const handleAIDraft = () => {
        if (weekLogs.length === 0) return;
        setDraftingAI(true);

        // Simulate AI drafting from the logs
        setTimeout(() => {
            const activities = weekLogs.map((l) => l.activityType.join(', ')).join('; ');
            const descriptions = weekLogs
                .map(
                    (l) =>
                        `${format(parseISO(l.entryDate), 'EEEE')}: ${l.taskDescription
                            .replace(/<[^>]*>/g, '')
                            .substring(0, 100)}`
                )
                .join('\n');

            const draft = `This week was a productive period focused on ${activities}. Over ${weekLogs.length} working day(s), I rendered a total of ${weekTotalHours} hours contributing to various tasks and responsibilities.\n\nKey activities included:\n${descriptions}\n\nThrough these experiences, I have gained deeper understanding of the work processes and improved my professional skills. The hands-on exposure has been invaluable in bridging the gap between academic knowledge and practical application. I look forward to building on these learnings in the coming week.`;

            setReflection(draft);
            setDraftingAI(false);
        }, 2000);
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    Weekly Report Generator
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Compile your daily logs into professional weekly reports
                </p>
            </div>

            {weeks.length === 0 ? (
                <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
                    <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: 'var(--slate-400)' }} />
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--slate-300)' }}>
                        No logs to compile
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>
                        Start logging your daily work to generate weekly reports.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                    {/* Week Selector */}
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 16,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Select Week</p>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <select
                                            className="input"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '4px 32px 4px 0',
                                                fontSize: 16,
                                                fontWeight: 700,
                                                color: 'white',
                                                cursor: 'pointer',
                                            }}
                                            value={selectedWeekIdx}
                                            onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
                                            id="report-week-select"
                                        >
                                            {weeks.map((week, i) => (
                                                <option key={i} value={i} style={{ background: 'var(--slate-800)' }}>
                                                    {week.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div id="report-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setShowPreview(!showPreview)}
                                    id="report-toggle-preview"
                                >
                                    <Eye size={16} /> {showPreview ? 'Hide' : 'Show'} Preview
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleExportPDF}
                                    disabled={generating || weekLogs.length === 0}
                                    id="report-export-pdf"
                                >
                                    {generating ? (
                                        <>
                                            <span style={{
                                                width: 14,
                                                height: 14,
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                                display: 'inline-block',
                                            }} />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} /> Export PDF
                                        </>
                                    )}
                                </button>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </div>
                        </div>

                        {/* Week summary */}
                        <div style={{
                            display: 'flex',
                            gap: 24,
                            marginTop: 16,
                            paddingTop: 16,
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            flexWrap: 'wrap',
                        }}>
                            <div>
                                <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Entries</span>
                                <p style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{weekLogs.length}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Total Hours</span>
                                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-300)' }}>{weekTotalHours}h</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Status</span>
                                <p style={{ fontSize: 14, fontWeight: 600, color: currentSavedReport ? 'var(--emerald-400)' : 'var(--amber-400)' }}>
                                    {currentSavedReport ? '✓ Saved' : 'Not saved'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Log Preview Table */}
                    {showPreview && weekLogs.length > 0 && (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-200)' }}>
                                    Daily Activity Log
                                </h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Activity</th>
                                            <th>Description</th>
                                            <th>Supervisor</th>
                                            <th>Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weekLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {format(parseISO(log.entryDate), 'EEE, MMM dd')}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {log.activityType.map((t) => (
                                                            <span key={t} className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ maxWidth: 300 }}>
                                                    <p style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        fontSize: 13,
                                                    }}>
                                                        {log.taskDescription.replace(/<[^>]*>/g, '')}
                                                    </p>
                                                </td>
                                                <td>{log.supervisor}</td>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: 'var(--primary-300)' }}>
                                                        {log.dailyHours}h
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={4} style={{
                                                textAlign: 'right',
                                                fontWeight: 700,
                                                color: 'white',
                                                borderTop: '2px solid rgba(16,185,129,0.3)',
                                            }}>
                                                Total
                                            </td>
                                            <td style={{
                                                fontWeight: 700,
                                                color: 'var(--primary-300)',
                                                fontSize: 16,
                                                borderTop: '2px solid rgba(16,185,129,0.3)',
                                            }}>
                                                {weekTotalHours}h
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Reflection Section */}
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 16,
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                                Weekly Learning & Reflections
                            </h3>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleAIDraft}
                                disabled={draftingAI || weekLogs.length === 0}
                                style={{ color: 'var(--amber-400)' }}
                                id="report-ai-draft"
                            >
                                {draftingAI ? (
                                    <>
                                        <span style={{
                                            width: 14,
                                            height: 14,
                                            border: '2px solid rgba(245,158,11,0.3)',
                                            borderTopColor: 'var(--amber-400)',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                            display: 'inline-block',
                                        }} />
                                        Drafting...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} /> Draft with AI
                                    </>
                                )}
                            </button>
                        </div>

                        <textarea
                            className="input textarea"
                            placeholder="Write your weekly reflection here. What did you learn? What challenges did you face? What would you do differently?"
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            style={{ minHeight: 200 }}
                            id="report-reflection"
                        />

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 12,
                            marginTop: 16,
                            flexWrap: 'wrap',
                        }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handleSaveReport}
                                id="report-save"
                            >
                                Save Report
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleExportPDF}
                                disabled={generating || weekLogs.length === 0}
                                id="report-export-pdf-bottom"
                            >
                                <Download size={16} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
