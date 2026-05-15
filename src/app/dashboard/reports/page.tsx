"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { getWeeksForLogs, getLogsForWeek } from '@/lib/calculations';
import { generatePDF } from '@/lib/pdf';
import { WeeklyReport, ActivityType, DailyLog, ACTIVITY_TYPES } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import LogWorkModal from '@/components/LogWorkModal';
import WeeklyReportFilters from '@/components/WeeklyReportFilters';
import WeeklyReportTable from '@/components/WeeklyReportTable';
import LogsHistoryFilters from '@/components/LogsHistoryFilters';
import LogsHistoryTable from '@/components/LogsHistoryTable';
import { showToast } from '@/lib/toast';
import {
    FileText,
    Download,
    Calendar,
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
    Plus,
    Save,
    X,
} from 'lucide-react';

export default function ReportsPage() {
    const { user, logs, saveWeeklyReport: ctxSaveReport, getWeeklyReports: ctxGetReports, deleteLog, updateLog } = useApp();
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports');

    // Log modal state
    const [showLogModal, setShowLogModal] = useState(false);
    
    // Reports state
    const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
    const [reflection, setReflection] = useState('');
    const [showPreview] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [savedReports, setSavedReports] = useState<WeeklyReport[]>([]);

    // Preview filters state
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewSupervisor, setPreviewSupervisor] = useState('');
    const [previewActivity, setPreviewActivity] = useState<ActivityType | ''>('');
    const [previewDateFrom, setPreviewDateFrom] = useState('');
    const [previewDateTo, setPreviewDateTo] = useState('');
    const [showPreviewFilters, setShowPreviewFilters] = useState(true);

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
    };

    const closeEditModal = () => {
        setEditingLog(null);
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
        showToast({ kind: 'success', title: 'Updated', message: 'Log entry updated successfully.' });
        closeEditModal();
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
        showToast({ kind: 'success', title: 'Saved', message: 'Weekly report saved.' });
    };

    const handleExportPDF = async () => {
        if (!selectedWeek) return;
        setGenerating(true);
        await handleSaveReport();
        try {
            await generatePDF(weekLogs, selectedWeek.label, reflection, user.name);
            showToast({ kind: 'success', title: 'Exported', message: 'Weekly report PDF generated.' });
        } catch (err) {
            console.error('PDF generation failed:', err);
            showToast({ kind: 'error', title: 'Export Failed', message: 'Could not generate PDF. Please try again.' });
        }
        setGenerating(false);
    };

    return (
        <div>
            <LogWorkModal open={showLogModal} onClose={() => setShowLogModal(false)} />
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
                                    background: 'rgba(9,9,11,0.45)',
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
                                disabled={editActivities.length === 0}
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

            {/* Content */}
            {activeTab === 'reports' ? (
                // REPORTS TAB
                <ReportsContent 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    logs={logs} 
                    weeks={weeks} 
                    selectedWeekIdx={selectedWeekIdx}
                    setSelectedWeekIdx={setSelectedWeekIdx}
                    showPreview={showPreview}
                    generating={generating}
                    onExportPDF={handleExportPDF}
                    onOpenLogModal={() => setShowLogModal(true)}
                    previewSearch={previewSearch}
                    setPreviewSearch={setPreviewSearch}
                    previewSupervisor={previewSupervisor}
                    setPreviewSupervisor={setPreviewSupervisor}
                    previewActivity={previewActivity}
                    setPreviewActivity={setPreviewActivity}
                    previewDateFrom={previewDateFrom}
                    setPreviewDateFrom={setPreviewDateFrom}
                    previewDateTo={previewDateTo}
                    setPreviewDateTo={setPreviewDateTo}
                    showPreviewFilters={showPreviewFilters}
                    setShowPreviewFilters={setShowPreviewFilters}
                />
            ) : (
                // HISTORY TAB
                <HistoryContent
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
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
function ReportsContent({ activeTab, setActiveTab, logs, weeks, selectedWeekIdx, setSelectedWeekIdx, showPreview, generating, onExportPDF, onOpenLogModal, previewSearch, setPreviewSearch, previewSupervisor, setPreviewSupervisor, previewActivity, setPreviewActivity, previewDateFrom, setPreviewDateFrom, previewDateTo, setPreviewDateTo, showPreviewFilters, setShowPreviewFilters }: any) {
    const selectedWeek = weeks[selectedWeekIdx];
    const weekLogs = selectedWeek
        ? getLogsForWeek(logs, selectedWeek.start, selectedWeek.end)
        : [];

    // Preview filters logic
    const previewSupervisors = useMemo(() => {
        const set = new Set(weekLogs.map((l) => l.supervisor));
        return Array.from(set).sort();
    }, [weekLogs]);

    const previewFilteredLogs = useMemo(() => {
        return weekLogs.filter((log) => {
            if (previewSearch) {
                const q = previewSearch.toLowerCase();
                const match =
                    log.taskDescription.toLowerCase().includes(q) ||
                    log.supervisor.toLowerCase().includes(q) ||
                    log.activityType.some((a) => a.toLowerCase().includes(q));
                if (!match) return false;
            }
            if (previewSupervisor && log.supervisor !== previewSupervisor) return false;
            if (previewActivity && !log.activityType.includes(previewActivity)) return false;
            if (previewDateFrom && log.entryDate < previewDateFrom) return false;
            if (previewDateTo && log.entryDate > previewDateTo) return false;
            return true;
        });
    }, [weekLogs, previewSearch, previewSupervisor, previewActivity, previewDateFrom, previewDateTo]);

    const previewTotalFilteredHours = useMemo(() => {
        return previewFilteredLogs.reduce((s, l) => s + l.dailyHours, 0);
    }, [previewFilteredLogs]);

    const previewHasActiveFilters =
        previewSearch || previewSupervisor || previewActivity || previewDateFrom || previewDateTo;

    const clearPreviewFilters = () => {
        setPreviewSearch('');
        setPreviewSupervisor('');
        setPreviewActivity('');
        setPreviewDateFrom('');
        setPreviewDateTo('');
    };

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
                <div>
                    <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                        Weekly Report Generator
                    </h1>
                    <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                        Compile your daily logs into professional weekly reports
                    </p>
                </div>
                <div id="report-top-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                        className="btn btn-success btn-sm"
                        onClick={onOpenLogModal}
                        id="report-log-work"
                    >
                        <Plus size={16} /> Log Today's Work
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
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            <div
                style={{
                    marginBottom: 24,
                    display: 'flex',
                    gap: 10,
                    padding: 6,
                    borderRadius: 999,
                    background: 'rgba(9,9,11,0.72)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    width: '100%',
                }}
            >
                <button
                    onClick={() => setActiveTab('reports')}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 999,
                        background:
                            activeTab === 'reports'
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))'
                                : 'transparent',
                        color: activeTab === 'reports' ? 'white' : 'var(--slate-400)',
                        fontSize: 13,
                        fontWeight: 700,
                        border: activeTab === 'reports' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent',
                        boxShadow: activeTab === 'reports' ? '0 8px 20px rgba(16,185,129,0.2)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        gap: 8,
                    }}
                >
                    <FileText size={16} />
                    Weekly Reports
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 999,
                        background:
                            activeTab === 'history'
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))'
                                : 'transparent',
                        color: activeTab === 'history' ? 'white' : 'var(--slate-400)',
                        fontSize: 13,
                        fontWeight: 700,
                        border: activeTab === 'history' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent',
                        boxShadow: activeTab === 'history' ? '0 8px 20px rgba(16,185,129,0.2)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        gap: 8,
                    }}
                >
                    <History size={16} />
                    Logs History
                </button>
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
                    {showPreview && weekLogs.length > 0 && (
                        <>
                            <WeeklyReportFilters
                                searchQuery={previewSearch}
                                setSearchQuery={setPreviewSearch}
                                showFilters={showPreviewFilters}
                                setShowFilters={setShowPreviewFilters}
                                hasActiveFilters={previewHasActiveFilters}
                                clearFilters={clearPreviewFilters}
                                supervisors={previewSupervisors}
                                filterSupervisor={previewSupervisor}
                                setFilterSupervisor={setPreviewSupervisor}
                                filterActivity={previewActivity}
                                setFilterActivity={setPreviewActivity}
                                filterDateFrom={previewDateFrom}
                                setFilterDateFrom={setPreviewDateFrom}
                                filterDateTo={previewDateTo}
                                setFilterDateTo={setPreviewDateTo}
                            />
                            <WeeklyReportTable
                                weekLogs={weekLogs}
                                filteredLogs={previewFilteredLogs}
                                hasActiveFilters={previewHasActiveFilters}
                                totalFilteredHours={previewTotalFilteredHours}
                            />
                        </>
                    )}

                </div>
            )}
        </div>
    );
}

// History Tab Content
function HistoryContent({ activeTab, setActiveTab, logs, filteredLogs, searchQuery, setSearchQuery, showFilters, setShowFilters, hasActiveFilters, clearFilters, supervisors, filterSupervisor, setFilterSupervisor, filterActivity, setFilterActivity, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, totalFilteredHours, openEditModal, setDeleteConfirm }: any) {
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

            <div
                style={{
                    marginBottom: 24,
                    display: 'flex',
                    gap: 10,
                    padding: 6,
                    borderRadius: 999,
                    background: 'rgba(9,9,11,0.72)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    width: '100%',
                }}
            >
                <button
                    onClick={() => setActiveTab('reports')}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 999,
                        background:
                            activeTab === 'reports'
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))'
                                : 'transparent',
                        color: activeTab === 'reports' ? 'white' : 'var(--slate-400)',
                        fontSize: 13,
                        fontWeight: 700,
                        border: activeTab === 'reports' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent',
                        boxShadow: activeTab === 'reports' ? '0 8px 20px rgba(16,185,129,0.2)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        gap: 8,
                    }}
                >
                    <FileText size={16} />
                    Weekly Reports
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 999,
                        background:
                            activeTab === 'history'
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))'
                                : 'transparent',
                        color: activeTab === 'history' ? 'white' : 'var(--slate-400)',
                        fontSize: 13,
                        fontWeight: 700,
                        border: activeTab === 'history' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent',
                        boxShadow: activeTab === 'history' ? '0 8px 20px rgba(16,185,129,0.2)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        gap: 8,
                    }}
                >
                    <History size={16} />
                    Logs History
                </button>
            </div>

            <LogsHistoryFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                hasActiveFilters={!!hasActiveFilters}
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
            />

            <LogsHistoryTable
                logs={logs}
                filteredLogs={filteredLogs}
                hasActiveFilters={!!hasActiveFilters}
                totalFilteredHours={totalFilteredHours}
                openEditModal={openEditModal}
                setDeleteConfirm={setDeleteConfirm}
            />
        </div>
    );
}
