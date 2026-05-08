"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { getWeeksForLogs, getLogsForWeek } from '@/lib/calculations';
import { generatePDF } from '@/lib/pdf';
import { WeeklyReport, ActivityType, DailyLog, ACTIVITY_TYPES } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import {
    FileText,
    Download,
    Calendar,
    Sparkles,
    Eye,
    Clock,
    Search,
    Filter,
    Edit3,
    Trash2,
    History,
    AlertTriangle,
    Tag,
    User,
    Check,
    Save,
    X,
} from 'lucide-react';

export default function ReportsPage() {
    const { user, logs, saveWeeklyReport: ctxSaveReport, getWeeklyReports: ctxGetReports, deleteLog, updateLog } = useApp();
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports');
    
    // Reports state
    const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
    const [reflection, setReflection] = useState('');
    const [showPreview, setShowPreview] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [draftingAI, setDraftingAI] = useState(false);
    const [savedReports, setSavedReports] = useState<WeeklyReport[]>([]);

    // History state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSupervisor, setFilterSupervisor] = useState('');
    const [filterActivity, setFilterActivity] = useState<ActivityType | ''>('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editActivities, setEditActivities] = useState<ActivityType[]>([]);
    const [editDescription, setEditDescription] = useState('');
    const [editSupervisor, setEditSupervisor] = useState('');
    const [editHours, setEditHours] = useState(8);
    const [editSaved, setEditSaved] = useState(false);

    const weeks = useMemo(() => getWeeksForLogs(logs), [logs]);

    // Load saved reports from Firestore
    useEffect(() => {
        if (user) {
            ctxGetReports(user.id).then(setSavedReports).catch(console.error);
        }
    }, [user, ctxGetReports]);

    // History helper functions
    const openEditModal = (log: DailyLog) => {
        setEditingLog(log);
        setEditDate(log.entryDate);
        setEditActivities([...log.activityType]);
        setEditDescription(log.taskDescription);
        setEditSupervisor(log.supervisor);
        setEditHours(log.dailyHours);
        setEditSaved(false);
    };

    const closeEditModal = () => {
        setEditingLog(null);
        setEditSaved(false);
    };

    const toggleEditActivity = (type: ActivityType) => {
        setEditActivities((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const handleSaveEdit = () => {
        if (!editingLog || editActivities.length === 0) return;
        updateLog(editingLog.id, {
            entryDate: editDate,
            activityType: editActivities,
            taskDescription: editDescription,
            supervisor: editSupervisor,
            dailyHours: editHours,
        });
        setEditSaved(true);
        setTimeout(() => {
            closeEditModal();
        }, 1200);
    };

    const supervisors = useMemo(() => {
        const set = new Set(logs.map((l) => l.supervisor));
        return Array.from(set).sort();
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return [...logs]
            .filter((log) => {
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const match =
                        log.taskDescription.toLowerCase().includes(q) ||
                        log.supervisor.toLowerCase().includes(q) ||
                        log.activityType.some((a) => a.toLowerCase().includes(q));
                    if (!match) return false;
                }
                if (filterSupervisor && log.supervisor !== filterSupervisor) return false;
                if (filterActivity && !log.activityType.includes(filterActivity)) return false;
                if (filterDateFrom && log.entryDate < filterDateFrom) return false;
                if (filterDateTo && log.entryDate > filterDateTo) return false;
                return true;
            })
            .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    }, [logs, searchQuery, filterSupervisor, filterActivity, filterDateFrom, filterDateTo]);

    const totalFilteredHours = filteredLogs.reduce((s, l) => s + l.dailyHours, 0);

    const clearFilters = () => {
        setSearchQuery('');
        setFilterSupervisor('');
        setFilterActivity('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const hasActiveFilters = searchQuery || filterSupervisor || filterActivity || filterDateFrom || filterDateTo;

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
            {/* Edit Modal */}
            {editingLog && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, padding: 0 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                    <Edit3 size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Edit Log Entry</h3>
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                                        {format(parseISO(editingLog.entryDate), 'MMMM dd, yyyy')}
                                    </p>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeEditModal}><X size={18} /></button>
                        </div>

                        {editSaved && (
                            <div style={{
                                padding: '12px 24px',
                                background: 'rgba(16,185,129,0.1)',
                                borderBottom: '1px solid rgba(16,185,129,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                color: 'var(--emerald-400)',
                                fontSize: 13,
                                fontWeight: 600,
                            }}>
                                <Check size={16} /> Log updated successfully!
                            </div>
                        )}

                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto' }}>
                            <div className="input-group">
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Calendar size={14} /> Date
                                </label>
                                <input
                                    className="input"
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Tag size={14} /> Nature of Activity<span style={{ color: 'var(--rose-400)', marginLeft: 2 }}>*</span>
                                </label>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    padding: 14,
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(15,23,42,0.4)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    {ACTIVITY_TYPES.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`tag ${editActivities.includes(type) ? 'active' : ''}`}
                                            onClick={() => toggleEditActivity(type)}
                                        >
                                            {editActivities.includes(type) && <Check size={12} />}
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                {editActivities.length === 0 && (
                                    <p style={{ fontSize: 12, color: 'var(--rose-400)', marginTop: 4 }}>
                                        Select at least one activity type
                                    </p>
                                )}
                            </div>

                            <div className="input-group">
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <FileText size={14} /> Task Description
                                </label>
                                <textarea
                                    className="input textarea"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Describe what you worked on..."
                                    style={{ minHeight: 120, lineHeight: 1.8 }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="input-group">
                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User size={14} /> Supervisor
                                    </label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={editSupervisor}
                                        onChange={(e) => setEditSupervisor(e.target.value)}
                                        placeholder="Supervisor name"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={14} /> Hours Rendered
                                    </label>
                                    <input
                                        className="input"
                                        type="number"
                                        min={0.5}
                                        max={24}
                                        step={0.5}
                                        value={editHours}
                                        onChange={(e) => setEditHours(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <button className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveEdit}
                                disabled={editActivities.length === 0 || editSaved}
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, padding: 32 }}>
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
                                <AlertTriangle size={28} style={{ color: 'var(--rose-400)' }} />
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Log Entry?</h3>
                            <p style={{ fontSize: 14, color: 'var(--slate-400)', marginBottom: 24 }}>
                                This action cannot be undone. The hours from this entry will be removed from your total.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        deleteLog(deleteConfirm);
                                        setDeleteConfirm(null);
                                    }}
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ marginBottom: 24, display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
                <button
                    onClick={() => setActiveTab('reports')}
                    style={{
                        padding: '12px 20px',
                        borderBottom: activeTab === 'reports' ? '2px solid var(--primary-400)' : 'transparent',
                        background: 'transparent',
                        color: activeTab === 'reports' ? 'white' : 'var(--slate-400)',
                        fontSize: 14,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                    }}
                >
                    <FileText size={16} style={{ display: 'inline', marginRight: 8, marginBottom: -2 }} />
                    Weekly Reports
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '12px 20px',
                        borderBottom: activeTab === 'history' ? '2px solid var(--primary-400)' : 'transparent',
                        background: 'transparent',
                        color: activeTab === 'history' ? 'white' : 'var(--slate-400)',
                        fontSize: 14,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                    }}
                >
                    <History size={16} style={{ display: 'inline', marginRight: 8, marginBottom: -2 }} />
                    Logs History
                </button>
            </div>

            {/* Content */}
            {activeTab === 'reports' ? (
                // REPORTS TAB
                <ReportsContent 
                    user={user} 
                    logs={logs} 
                    weeks={weeks} 
                    selectedWeekIdx={selectedWeekIdx}
                    setSelectedWeekIdx={setSelectedWeekIdx}
                    reflection={reflection}
                    setReflection={setReflection}
                    showPreview={showPreview}
                    setShowPreview={setShowPreview}
                    generating={generating}
                    draftingAI={draftingAI}
                    savedReports={savedReports}
                    onSaveReport={handleSaveReport}
                    onExportPDF={handleExportPDF}
                    onAIDraft={handleAIDraft}
                />
            ) : (
                // HISTORY TAB
                <HistoryContent
                    logs={logs}
                    filteredLogs={filteredLogs}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    clearFilters={clearFilters}
                    supervisors={supervisors}
                    filterSupervisor={filterSupervisor}
                    setFilterSupervisor={setFilterSupervisor}
                    filterActivity={filterActivity}
                    setFilterActivity={setFilterActivity}
                    filterDateFrom={filterDateFrom}
                    setFilterDateFrom={setFilterDateFrom}
                    filterDateTo={filterDateTo}
                    setFilterDateTo={setFilterDateTo}
                    totalFilteredHours={totalFilteredHours}
                    openEditModal={openEditModal}
                    setDeleteConfirm={setDeleteConfirm}
                />
            )}
        </div>
    );
}

// Reports Tab Content
function ReportsContent({ user, logs, weeks, selectedWeekIdx, setSelectedWeekIdx, reflection, setReflection, showPreview, setShowPreview, generating, draftingAI, savedReports, onSaveReport, onExportPDF, onAIDraft }: any) {
    const selectedWeek = weeks[selectedWeekIdx];
    const weekLogs = selectedWeek
        ? getLogsForWeek(logs, selectedWeek.start, selectedWeek.end)
        : [];
    const weekTotalHours = weekLogs.reduce((s: number, l: DailyLog) => s + l.dailyHours, 0);
    const currentSavedReport = selectedWeek
        ? savedReports.find((r: WeeklyReport) => r.weekStart === selectedWeek.start.toISOString())
        : null;

    return (
        <div>
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
                                            {weeks.map((week: any, i: number) => (
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
                                    onClick={onExportPDF}
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
                                        {weekLogs.map((log: DailyLog) => (
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
                                onClick={onAIDraft}
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
                                onClick={onSaveReport}
                                id="report-save"
                            >
                                Save Report
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={onExportPDF}
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

// History Tab Content
function HistoryContent({ logs, filteredLogs, searchQuery, setSearchQuery, showFilters, setShowFilters, hasActiveFilters, clearFilters, supervisors, filterSupervisor, setFilterSupervisor, filterActivity, setFilterActivity, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, totalFilteredHours, openEditModal, setDeleteConfirm }: any) {
    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    Logs History
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Browse, search, and manage all your logged entries
                </p>
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <div id="history-search-row" style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}>
                    <div style={{ flex: '1 1 200px', minWidth: 0, position: 'relative' }}>
                        <Search size={18} style={{
                            position: 'absolute',
                            left: 14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--slate-500)',
                        }} />
                        <input
                            className="input"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 44, width: '100%' }}
                            id="history-search"
                        />
                    </div>
                    <button
                        className={`btn btn-secondary btn-sm ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        style={showFilters ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)' } : {}}
                        id="history-toggle-filters"
                    >
                        <Filter size={16} /> Filters
                        {hasActiveFilters && (
                            <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--primary-400)',
                                marginLeft: 4,
                            }} />
                        )}
                    </button>
                    {hasActiveFilters && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={clearFilters}
                            style={{ color: 'var(--rose-400)' }}
                            id="history-clear-filters"
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>

                {showFilters && (
                    <div id="history-filters-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 12,
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <div className="input-group">
                            <label className="input-label">Supervisor</label>
                            <select
                                className="input"
                                value={filterSupervisor}
                                onChange={(e) => setFilterSupervisor(e.target.value)}
                                id="history-filter-supervisor"
                            >
                                <option value="">All Supervisors</option>
                                {supervisors.map((s: string) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Activity Type</label>
                            <select
                                className="input"
                                value={filterActivity}
                                onChange={(e) => setFilterActivity(e.target.value as ActivityType | '')}
                                id="history-filter-activity"
                            >
                                <option value="">All Activities</option>
                                {ACTIVITY_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">From Date</label>
                            <input
                                className="input"
                                type="date"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                id="history-filter-from"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">To Date</label>
                            <input
                                className="input"
                                type="date"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                                id="history-filter-to"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                padding: '0 4px',
            }}>
                <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                    {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
                    {hasActiveFilters ? ' (filtered)' : ''}
                </p>
                <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                    Total: <span style={{ fontWeight: 700, color: 'var(--primary-300)' }}>{totalFilteredHours}h</span>
                </p>
            </div>

            {filteredLogs.length === 0 ? (
                <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
                    <History size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: 'var(--slate-400)' }} />
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--slate-300)' }}>
                        {logs.length === 0 ? 'No logs yet' : 'No matching entries'}
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>
                        {logs.length === 0
                            ? 'Start logging your daily activities to build your history.'
                            : 'Try adjusting your search or filter criteria.'}
                    </p>
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Activity</th>
                                    <th>Description</th>
                                    <th>Supervisor</th>
                                    <th>Hours</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log: DailyLog) => (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Calendar size={14} style={{ color: 'var(--slate-500)' }} />
                                                {format(parseISO(log.entryDate), 'MMM dd, yyyy')}
                                            </div>
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
                                        <td style={{ maxWidth: 280 }}>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={13} style={{ color: 'var(--slate-500)' }} />
                                                <span style={{ fontWeight: 700, color: 'var(--primary-300)' }}>{log.dailyHours}h</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost btn-icon btn-sm"
                                                    onClick={() => openEditModal(log)}
                                                    title="Edit"
                                                    id={`history-edit-${log.id}`}
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-icon btn-sm"
                                                    onClick={() => setDeleteConfirm(log.id)}
                                                    title="Delete"
                                                    style={{ color: 'var(--rose-400)' }}
                                                    id={`history-delete-${log.id}`}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
