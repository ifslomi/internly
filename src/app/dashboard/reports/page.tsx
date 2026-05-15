"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { getWeeksForLogs, getLogsForWeek } from '@/lib/calculations';
import { generateSimpleWeeklyReportPDF, generateUBWeeklyReportPDF } from '@/lib/pdf';
import { WeeklyReport, ActivityType, DailyLog, ACTIVITY_TYPES } from '@/lib/types';
import { addWeeks, endOfWeek, format, isValid, parseISO, startOfWeek } from 'date-fns';
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
    Eye,
    ExternalLink,
    Loader2,
} from 'lucide-react';

type WeekRange = { start: Date; end: Date; label: string };

const WEEK_STARTS_ON = 1 as const;

function safeParseIsoDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
}

function getWeekKeyFromDate(date: Date): string {
    return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }).toISOString();
}

function getWeekKeyFromIso(value?: string): string | null {
    const parsed = safeParseIsoDate(value);
    return parsed ? getWeekKeyFromDate(parsed) : null;
}

function tryExtractCloudinaryPublicId(url?: string): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const marker = '/upload/';
        const markerIndex = parsed.pathname.indexOf(marker);
        if (markerIndex < 0) return null;
        let tail = parsed.pathname.slice(markerIndex + marker.length);
        tail = tail.replace(/^v\d+\//, '');
        const withoutExtension = tail.replace(/\.[^/.]+$/, '');
        return withoutExtension || null;
    } catch {
        return null;
    }
}

function buildSelectableWeeks({
    logs,
    savedReports,
    startDate,
    endDate,
}: {
    logs: DailyLog[];
    savedReports: WeeklyReport[];
    startDate?: string;
    endDate?: string;
}): WeekRange[] {
    const weekMap = new Map<string, { start: Date; end: Date }>();

    for (const week of getWeeksForLogs(logs)) {
        weekMap.set(getWeekKeyFromDate(week.start), {
            start: startOfWeek(week.start, { weekStartsOn: WEEK_STARTS_ON }),
            end: endOfWeek(week.start, { weekStartsOn: WEEK_STARTS_ON }),
        });
    }

    for (const report of savedReports) {
        const reportWeekStart = safeParseIsoDate(report.weekStart);
        if (!reportWeekStart) continue;
        const normalizedStart = startOfWeek(reportWeekStart, { weekStartsOn: WEEK_STARTS_ON });
        weekMap.set(getWeekKeyFromDate(normalizedStart), {
            start: normalizedStart,
            end: endOfWeek(normalizedStart, { weekStartsOn: WEEK_STARTS_ON }),
        });
    }

    const parsedStartDate = safeParseIsoDate(startDate);
    const parsedEndDate = safeParseIsoDate(endDate);
    let timelineStart = parsedStartDate
        ? startOfWeek(parsedStartDate, { weekStartsOn: WEEK_STARTS_ON })
        : null;
    let timelineEnd = parsedEndDate
        ? endOfWeek(parsedEndDate, { weekStartsOn: WEEK_STARTS_ON })
        : endOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });

    if (!timelineStart) {
        const earliestKnownWeek = Array.from(weekMap.values())
            .map((week) => week.start.getTime())
            .sort((a, b) => a - b)[0];
        timelineStart = earliestKnownWeek
            ? new Date(earliestKnownWeek)
            : startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
    }

    if (timelineEnd.getTime() < timelineStart.getTime()) {
        timelineEnd = endOfWeek(timelineStart, { weekStartsOn: WEEK_STARTS_ON });
    }

    for (let cursor = new Date(timelineStart); cursor.getTime() <= timelineEnd.getTime(); cursor = addWeeks(cursor, 1)) {
        const normalizedStart = startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON });
        weekMap.set(getWeekKeyFromDate(normalizedStart), {
            start: normalizedStart,
            end: endOfWeek(normalizedStart, { weekStartsOn: WEEK_STARTS_ON }),
        });
    }

    const weeksAsc = Array.from(weekMap.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
    const weekNumberByKey = new Map<string, number>();
    weeksAsc.forEach((week, idx) => {
        weekNumberByKey.set(getWeekKeyFromDate(week.start), idx + 1);
    });

    return [...weeksAsc]
        .sort((a, b) => b.start.getTime() - a.start.getTime())
        .map((week) => {
            const number = weekNumberByKey.get(getWeekKeyFromDate(week.start)) || 1;
            return {
                ...week,
                label: `Week ${number}: ${format(week.start, 'MMM d')} - ${format(week.end, 'MMM d, yyyy')}`,
            };
        });
}

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
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [importingPdf, setImportingPdf] = useState(false);
    const [paperViewOpen, setPaperViewOpen] = useState(false);
    const [paperWeekIdx, setPaperWeekIdx] = useState(0);
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
    const [deleteImportedPdfConfirm, setDeleteImportedPdfConfirm] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editActivities, setEditActivities] = useState<ActivityType[]>([]);
    const [editDescription, setEditDescription] = useState('');
    const [editSupervisor, setEditSupervisor] = useState('');
    const [editHours, setEditHours] = useState(8);
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

    const weeks = useMemo(
        () =>
            buildSelectableWeeks({
                logs,
                savedReports,
                startDate: user?.startDate,
                endDate: user?.endDate,
            }),
        [logs, savedReports, user?.startDate, user?.endDate]
    );

    useEffect(() => {
        if (weeks.length === 0) {
            setSelectedWeekIdx(0);
            setPaperWeekIdx(0);
            return;
        }
        if (selectedWeekIdx >= weeks.length) {
            setSelectedWeekIdx(0);
        }
        if (paperWeekIdx >= weeks.length) {
            setPaperWeekIdx(0);
        }
    }, [weeks, selectedWeekIdx, paperWeekIdx]);

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

    const handleSaveEdit = async () => {
        if (!editingLog || editActivities.length === 0 || savingEdit) return;
        setSavingEdit(true);
        try {
            await updateLog(editingLog.id, {
                entryDate: editDate,
                activityType: editActivities,
                taskDescription: editDescription,
                supervisor: editSupervisor,
                dailyHours: editHours,
            });
            showToast({ kind: 'success', title: 'Updated', message: 'Log entry updated successfully.' });
            closeEditModal();
        } catch {
            showToast({ kind: 'error', title: 'Update Failed', message: 'Could not update this log entry. Please try again.' });
        } finally {
            setSavingEdit(false);
        }
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

    const hasActiveFilters = Boolean(searchQuery || filterSupervisor || filterActivity || filterDateFrom || filterDateTo);

    const selectedWeek = weeks[selectedWeekIdx];
    const weekLogs = selectedWeek
        ? getLogsForWeek(logs, selectedWeek.start, selectedWeek.end)
        : [];

    // Load saved reflection when switching weeks
    const currentSavedReport = selectedWeek
        ? savedReports.find(
            (r) => getWeekKeyFromIso(r.weekStart) === getWeekKeyFromDate(selectedWeek.start)
        ) || null
        : null;

    React.useEffect(() => {
        if (currentSavedReport) {
            setReflection(currentSavedReport.reflection);
        } else {
            setReflection('');
        }
    }, [selectedWeekIdx, currentSavedReport]);

    if (!user) return null;

    const handleSaveReport = async () => {
        if (!selectedWeek) return;
        const baseReport = {
            userId: user.id,
            weekStart: selectedWeek.start.toISOString(),
            weekEnd: selectedWeek.end.toISOString(),
            reflection,
            logs: weekLogs,
        };
        const reportWithPdf = currentSavedReport?.importedPdfUrl
            ? {
                ...baseReport,
                importedPdfUrl: currentSavedReport.importedPdfUrl,
                importedPdfName: currentSavedReport.importedPdfName,
                importedPdfUploadedAt: currentSavedReport.importedPdfUploadedAt,
                ...(currentSavedReport.importedPdfPublicId
                    ? { importedPdfPublicId: currentSavedReport.importedPdfPublicId }
                    : {}),
                ...(currentSavedReport.importedPdfResourceType
                    ? { importedPdfResourceType: currentSavedReport.importedPdfResourceType }
                    : {}),
            }
            : baseReport;

        const saved = await ctxSaveReport(reportWithPdf);
        const savedWeekKey = getWeekKeyFromIso(saved.weekStart);
        // Update local state with the saved report
        setSavedReports(prev => {
            const idx = prev.findIndex((r) => getWeekKeyFromIso(r.weekStart) === savedWeekKey);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
            }
            return [...prev, saved];
        });
        showToast({ kind: 'success', title: 'Saved', message: 'Weekly report saved.' });
    };

    const handleExportPaperPDF = async () => {
        if (!selectedWeek) return;
        setGenerating(true);
        await handleSaveReport();
        try {
            await generateUBWeeklyReportPDF({
                logs: weekLogs,
                weekLabel: selectedWeek.label,
                reflection,
                user: {
                    name: user.fullName || user.name,
                    companyName: user.companyName || user.company?.name,
                    course: user.course,
                    department: user.department,
                },
                totalRequiredHours: user.totalRequiredHours,
            });
            showToast({ kind: 'success', title: 'Exported', message: 'Paper-view weekly report PDF generated.' });
        } catch (err) {
            console.error('PDF generation failed:', err);
            showToast({ kind: 'error', title: 'Export Failed', message: 'Could not generate PDF. Please try again.' });
        }
        setGenerating(false);
    };

    const handleExportSimplePDF = async () => {
        if (!selectedWeek) return;
        setGenerating(true);
        await handleSaveReport();
        try {
            await generateSimpleWeeklyReportPDF({
                logs: weekLogs,
                weekLabel: selectedWeek.label,
                reflection,
                userName: user.fullName || user.name,
            });
            showToast({ kind: 'success', title: 'Exported', message: 'Simple weekly report PDF generated.' });
        } catch (err) {
            console.error('Simple PDF generation failed:', err);
            showToast({ kind: 'error', title: 'Export Failed', message: 'Could not generate simple PDF. Please try again.' });
        }
        setGenerating(false);
    };

    const handleDeleteImportedPdf = async () => {
        if (!selectedWeek || !user || !currentSavedReport?.id) return;

        const publicId = currentSavedReport.importedPdfPublicId || tryExtractCloudinaryPublicId(currentSavedReport.importedPdfUrl);
        const resourceType = currentSavedReport.importedPdfResourceType || 'raw';

        setImportingPdf(true);
        try {
            if (publicId) {
                const response = await fetch('/api/cloudinary/delete-asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ publicId, resourceType }),
                });
                if (!response.ok) {
                    const payload = (await response.json().catch(() => ({}))) as { error?: string };
                    console.warn('Cloudinary delete warning:', payload.error || 'unknown');
                }
            }

            const saved = await ctxSaveReport({
                userId: user.id,
                weekStart: selectedWeek.start.toISOString(),
                weekEnd: selectedWeek.end.toISOString(),
                reflection,
                logs: weekLogs,
                importedPdfUrl: '',
                importedPdfName: '',
                importedPdfUploadedAt: '',
                importedPdfPublicId: '',
            });
            const savedWeekKey = getWeekKeyFromIso(saved.weekStart);
            setSavedReports((prev) => {
                const idx = prev.findIndex((r) => getWeekKeyFromIso(r.weekStart) === savedWeekKey);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = saved;
                    return updated;
                }
                return [...prev, saved];
            });
            showToast({ kind: 'success', title: 'Deleted', message: 'Imported PDF removed from this week.' });
        } catch (error) {
            console.error('Delete imported PDF failed:', error);
            showToast({ kind: 'error', title: 'Delete Failed', message: 'Could not remove the imported PDF.' });
        } finally {
            setImportingPdf(false);
        }
    };

    return (
        <div>
            <LogWorkModal open={showLogModal} onClose={() => setShowLogModal(false)} />

            {paperViewOpen && (
                <PaperViewModal
                    open={paperViewOpen}
                    onClose={() => setPaperViewOpen(false)}
                    weeks={weeks}
                    selectedWeekIdx={paperWeekIdx}
                    setSelectedWeekIdx={setPaperWeekIdx}
                    logs={logs}
                    savedReports={savedReports}
                    currentSelectedWeekIdx={selectedWeekIdx}
                    currentReflection={reflection}
                    user={user}
                />
            )}
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
                                    background: 'rgba(24,24,27,0.45)',
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
                            <button className="btn btn-secondary" onClick={closeEditModal} disabled={savingEdit}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveEdit}
                                disabled={editActivities.length === 0 || savingEdit}
                            >
                                {savingEdit ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {savingEdit ? 'Saving...' : 'Save Changes'}
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
                                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={!!deletingLogId}>Cancel</button>
                                <button
                                    className="btn btn-danger"
                                    disabled={deletingLogId === deleteConfirm}
                                    onClick={async () => {
                                        if (!deleteConfirm || deletingLogId) return;
                                        setDeletingLogId(deleteConfirm);
                                        try {
                                            await deleteLog(deleteConfirm);
                                            setDeleteConfirm(null);
                                            showToast({ kind: 'success', title: 'Deleted', message: 'Log entry deleted.' });
                                        } catch {
                                            showToast({ kind: 'error', title: 'Delete Failed', message: 'Could not delete this log entry.' });
                                        } finally {
                                            setDeletingLogId(null);
                                        }
                                    }}
                                >
                                    {deletingLogId === deleteConfirm ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Trash2 size={16} />} {deletingLogId === deleteConfirm ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteImportedPdfConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteImportedPdfConfirm(false)}>
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
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Imported PDF?</h3>
                            <p style={{ fontSize: 14, color: 'var(--slate-400)', marginBottom: 24 }}>
                                This removes the imported PDF attachment from this week report.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button className="btn btn-secondary" onClick={() => setDeleteImportedPdfConfirm(false)} disabled={importingPdf}>Cancel</button>
                                <button
                                    className="btn btn-danger"
                                    disabled={importingPdf}
                                    onClick={async () => {
                                        await handleDeleteImportedPdf();
                                        setDeleteImportedPdfConfirm(false);
                                    }}
                                >
                                    {importingPdf ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Trash2 size={16} />} {importingPdf ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showExportOptions && (
                <div className="modal-overlay" onClick={() => setShowExportOptions(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, padding: 28 }}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Choose Export Format</h3>
                            <p style={{ fontSize: 14, color: 'var(--slate-400)', marginBottom: 24 }}>
                                Export as full paper-view format or as a simple summary table.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <button
                                className="btn btn-primary"
                                disabled={generating}
                                onClick={async () => {
                                    await handleExportPaperPDF();
                                    setShowExportOptions(false);
                                }}
                            >
                                {generating ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Download size={16} />} {generating ? 'Generating...' : 'Export Paper View PDF'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={generating}
                                onClick={async () => {
                                    await handleExportSimplePDF();
                                    setShowExportOptions(false);
                                }}
                            >
                                {generating ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Download size={16} />} {generating ? 'Generating...' : 'Export Simple PDF'}
                            </button>
                            <button className="btn btn-ghost" disabled={generating} onClick={() => setShowExportOptions(false)}>
                                Cancel
                            </button>
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
                    importingPdf={importingPdf}
                    onExportPDF={() => setShowExportOptions(true)}
                    onDeleteImportedPDF={() => setDeleteImportedPdfConfirm(true)}
                    onOpenPaperView={() => {
                        if (!selectedWeek) {
                            showToast({ kind: 'error', title: 'No Week Selected', message: 'Add or select a week before opening Paper View.' });
                            return;
                        }
                        setPaperWeekIdx(selectedWeekIdx);
                        setPaperViewOpen(true);
                    }}
                    onOpenLogModal={() => setShowLogModal(true)}
                    selectedWeekReport={currentSavedReport}
                    reflection={reflection}
                    setReflection={setReflection}
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
type ReportsContentProps = {
    activeTab: 'reports' | 'history';
    setActiveTab: React.Dispatch<React.SetStateAction<'reports' | 'history'>>;
    logs: DailyLog[];
    weeks: WeekRange[];
    selectedWeekIdx: number;
    setSelectedWeekIdx: React.Dispatch<React.SetStateAction<number>>;
    showPreview: boolean;
    generating: boolean;
    importingPdf: boolean;
    onExportPDF: () => void;
    onDeleteImportedPDF: () => void;
    onOpenPaperView: () => void;
    onOpenLogModal: () => void;
    selectedWeekReport: WeeklyReport | null;
    reflection: string;
    setReflection: React.Dispatch<React.SetStateAction<string>>;
    previewSearch: string;
    setPreviewSearch: React.Dispatch<React.SetStateAction<string>>;
    previewSupervisor: string;
    setPreviewSupervisor: React.Dispatch<React.SetStateAction<string>>;
    previewActivity: ActivityType | '';
    setPreviewActivity: React.Dispatch<React.SetStateAction<ActivityType | ''>>;
    previewDateFrom: string;
    setPreviewDateFrom: React.Dispatch<React.SetStateAction<string>>;
    previewDateTo: string;
    setPreviewDateTo: React.Dispatch<React.SetStateAction<string>>;
    showPreviewFilters: boolean;
    setShowPreviewFilters: React.Dispatch<React.SetStateAction<boolean>>;
};

function ReportsContent({
    activeTab,
    setActiveTab,
    logs,
    weeks,
    selectedWeekIdx,
    setSelectedWeekIdx,
    showPreview,
    generating,
    importingPdf,
    onExportPDF,
    onDeleteImportedPDF,
    onOpenPaperView,
    onOpenLogModal,
    selectedWeekReport,
    reflection,
    setReflection,
    previewSearch,
    setPreviewSearch,
    previewSupervisor,
    setPreviewSupervisor,
    previewActivity,
    setPreviewActivity,
    previewDateFrom,
    setPreviewDateFrom,
    previewDateTo,
    setPreviewDateTo,
    showPreviewFilters,
    setShowPreviewFilters,
}: ReportsContentProps) {
    const selectedWeek = weeks[selectedWeekIdx];
    const weekLogs = useMemo(
        () => (selectedWeek ? getLogsForWeek(logs, selectedWeek.start, selectedWeek.end) : []),
        [logs, selectedWeek]
    );

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

    const previewHasActiveFilters = Boolean(
        previewSearch || previewSupervisor || previewActivity || previewDateFrom || previewDateTo
    );

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
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={onOpenLogModal}
                        id="report-log-work"
                    >
                        <Plus size={16} /> Log Today&apos;s Work
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onOpenPaperView}
                        id="report-open-paper-view"
                    >
                        <Eye size={16} /> Open Paper View
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={onExportPDF}
                        disabled={generating}
                        id="report-export-pdf"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={16} className="spin-smooth btn-loading-icon" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download size={16} /> Export PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div
                style={{
                    marginBottom: 24,
                    display: 'flex',
                    gap: 10,
                    padding: 6,
                    borderRadius: 999,
                    background: 'rgba(24,24,27,0.72)',
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

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ minWidth: 220, flex: '1 1 320px' }}>
                                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Selected Week</label>
                                <select
                                    className="input"
                                    value={selectedWeekIdx}
                                    onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
                                    id="report-selected-week"
                                >
                                    {weeks.map((week, idx) => (
                                        <option key={week.start.toISOString()} value={idx}>
                                            {week.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedWeekReport?.importedPdfUrl && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                                        Imported file: {selectedWeekReport.importedPdfName || 'weekly-report.pdf'}
                                    </p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <a
                                            className="btn btn-ghost btn-sm"
                                            href={selectedWeekReport.importedPdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <ExternalLink size={14} /> Open
                                        </a>
                                        <a
                                            className="btn btn-ghost btn-sm"
                                            href={selectedWeekReport.importedPdfUrl}
                                            download={selectedWeekReport.importedPdfName || 'weekly-report.pdf'}
                                        >
                                            <Download size={14} /> Download
                                        </a>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={onDeleteImportedPDF}
                                            disabled={importingPdf}
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20 }}>
                        <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>
                            Weekly Reflection
                        </label>
                        <textarea
                            className="input textarea"
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            placeholder="Write your weekly learning, challenges, and key takeaways."
                            style={{ minHeight: 130, lineHeight: 1.65 }}
                        />
                    </div>

                </div>
            )}
        </div>
    );
}

function cleanTaskText(value: string): string {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function PaperViewModal({
    open,
    onClose,
    weeks,
    selectedWeekIdx,
    setSelectedWeekIdx,
    logs,
    savedReports,
    currentSelectedWeekIdx,
    currentReflection,
    user,
}: {
    open: boolean;
    onClose: () => void;
    weeks: { start: Date; end: Date; label: string }[];
    selectedWeekIdx: number;
    setSelectedWeekIdx: (value: number) => void;
    logs: DailyLog[];
    savedReports: WeeklyReport[];
    currentSelectedWeekIdx: number;
    currentReflection: string;
    user: {
        name: string;
        fullName?: string;
        companyName?: string;
        company?: { name?: string };
        course?: string;
        department?: string;
        totalRequiredHours: number;
    };
}) {
    if (!open) return null;

    const selectedWeek = weeks[selectedWeekIdx];
    const weekLogs = selectedWeek ? getLogsForWeek(logs, selectedWeek.start, selectedWeek.end) : [];
    const savedReport = selectedWeek
        ? savedReports.find((r) => getWeekKeyFromIso(r.weekStart) === getWeekKeyFromDate(selectedWeek.start))
        : null;
    const reflection = selectedWeekIdx === currentSelectedWeekIdx
        ? currentReflection
        : (savedReport?.reflection || '');
    const hoursServedThisWeek = weekLogs.reduce((sum, log) => sum + log.dailyHours, 0);
    const totalServedHours = logs.reduce((sum, log) => sum + log.dailyHours, 0);
    const remainingHours = Math.max(0, user.totalRequiredHours - totalServedHours);

    const logsByDay = weekLogs.reduce<Record<string, DailyLog[]>>((acc, log) => {
        if (!acc[log.entryDate]) acc[log.entryDate] = [];
        acc[log.entryDate].push(log);
        return acc;
    }, {});
    const orderedDayKeys = Object.keys(logsByDay).sort((a, b) => a.localeCompare(b));

    const pageStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: 820,
        margin: '0 auto',
        background: 'white',
        color: '#111827',
        borderRadius: 6,
        boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
        padding: '24px 30px',
        fontFamily: '"Times New Roman", Georgia, serif',
        minHeight: 1060,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
    };

    const underlineStyle: React.CSSProperties = {
        borderBottom: '1px solid #111827',
        minHeight: 20,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '0 6px 2px',
        fontSize: 15,
    };

    const buildLinedBlock = (text: string, minLines: number) => (
        <div
            style={{
                lineHeight: '24px',
                minHeight: minLines * 24,
                whiteSpace: 'pre-wrap',
                fontSize: 14,
                padding: '0 6px',
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 23px, #111827 23px, #111827 24px)',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
            }}
        >
            {text.trim() || ' '}
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 960, width: '96vw', padding: 0, overflow: 'hidden' }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 18px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(10,10,12,0.95)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Paper View</h3>
                        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                            UB-style preview from your selected week logs and reflection.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select
                            className="input"
                            value={selectedWeekIdx}
                            onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
                            style={{ minWidth: 300 }}
                        >
                            {weeks.map((week, idx) => (
                                <option key={week.start.toISOString()} value={idx}>
                                    {week.label}
                                </option>
                            ))}
                        </select>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div style={{ maxHeight: '78vh', overflowY: 'auto', background: '#f6f6f6', padding: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={pageStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <p style={{ fontSize: 12, marginTop: 2 }}>F-CICT-05</p>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 16, lineHeight: 1.05, fontWeight: 700 }}>University of Batangas</p>
                                    <p style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>COLLEGE OF INFORMATION & COMMUNICATIONS TECHNOLOGY</p>
                                </div>
                            </div>

                            <h2 style={{ textAlign: 'center', fontSize: 22, marginTop: 8, fontWeight: 700 }}>
                                On-the-Job Training Weekly Report
                            </h2>

                            <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 70px 120px', alignItems: 'end', columnGap: 8 }}>
                                    <strong style={{ fontSize: 14 }}>Student Name :</strong>
                                    <div style={underlineStyle}>{user.fullName || user.name || '-'}</div>
                                    <strong style={{ fontSize: 14 }}>Course :</strong>
                                    <div style={underlineStyle}>{user.course || '-'}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 70px 120px', alignItems: 'end', columnGap: 8 }}>
                                    <strong style={{ fontSize: 14 }}>Company :</strong>
                                    <div style={underlineStyle}>{user.companyName || user.company?.name || '-'}</div>
                                    <strong style={{ fontSize: 14 }}>Dept. :</strong>
                                    <div style={underlineStyle}>{user.department || '-'}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '190px 180px 1fr', alignItems: 'end', columnGap: 8 }}>
                                    <strong style={{ fontSize: 14 }}>Total Practicum Hours :</strong>
                                    <div style={underlineStyle}>{user.totalRequiredHours}</div>
                                    <div />
                                </div>
                            </div>

                            <table style={{ marginTop: 14, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid #111', padding: 5, fontWeight: 700 }}>Practicum Hours Served</th>
                                        <th style={{ border: '1px solid #111', padding: 5, fontWeight: 700 }}>Hours Served This Week</th>
                                        <th style={{ border: '1px solid #111', padding: 5, fontWeight: 700 }}>Hours to Complete Practicum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ border: '1px solid #111', padding: 6, textAlign: 'center', fontSize: 22 }}>{totalServedHours}</td>
                                        <td style={{ border: '1px solid #111', padding: 6, textAlign: 'center', fontSize: 22 }}>{hoursServedThisWeek}</td>
                                        <td style={{ border: '1px solid #111', padding: 6, textAlign: 'center', fontSize: 22 }}>{remainingHours}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3 style={{ marginTop: 12, marginBottom: 8, fontSize: 27, fontWeight: 700 }}>
                                A. Accomplished Activities
                            </h3>

                            {orderedDayKeys.length === 0 ? (
                                buildLinedBlock('No logs found for this week.', 14)
                            ) : (
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {orderedDayKeys.map((dayKey) => {
                                        const dayLogs = logsByDay[dayKey] || [];
                                        const activityTypes = Array.from(
                                            new Set(dayLogs.flatMap((log) => log.activityType).filter(Boolean)),
                                        );
                                        const dayText = dayLogs
                                            .map((log) => cleanTaskText(log.taskDescription))
                                            .filter(Boolean)
                                            .join('\n');
                                        const supervisors = Array.from(
                                            new Set(dayLogs.map((log) => log.supervisor).filter(Boolean)),
                                        );

                                        return (
                                            <div key={dayKey}>
                                                <p style={{ fontSize: 14, marginBottom: 2 }}>
                                                    <strong>Date:</strong> {format(parseISO(dayKey), 'MMMM dd, yyyy')}
                                                </p>
                                                <p style={{ fontSize: 14, marginBottom: 2 }}>
                                                    <strong>Nature of Activity:</strong> {activityTypes.join(', ') || 'General'}
                                                </p>
                                                {buildLinedBlock(dayText || 'No description provided.', Math.max(4, Math.min(7, dayLogs.length * 2)))}
                                                <p style={{ fontSize: 14, marginTop: 2, marginBottom: 2 }}>
                                                    <strong>Task / Assignment Received From</strong>
                                                </p>
                                                {buildLinedBlock(supervisors.join(', ') || '-', 1)}
                                                <p style={{ fontSize: 14, marginTop: 2, marginBottom: 2 }}>
                                                    <strong>Remarks / Signature</strong>
                                                </p>
                                                {buildLinedBlock('', 1)}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                <span>Revision No: 0</span>
                                <span>Issued Date: August 17, 2017</span>
                                <span>Revision Date: NA</span>
                            </div>
                        </div>

                        <div style={pageStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <p style={{ fontSize: 12, marginTop: 2 }}>F-CICT-05</p>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 16, lineHeight: 1.05, fontWeight: 700 }}>University of Batangas</p>
                                    <p style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>COLLEGE OF INFORMATION & COMMUNICATIONS TECHNOLOGY</p>
                                </div>
                            </div>

                            <h3 style={{ marginTop: 12, marginBottom: 8, fontSize: 27, fontWeight: 700 }}>
                                B. Knowledge / skills gained and or Difficulties Encountered for the Period:
                            </h3>

                            {buildLinedBlock(reflection?.trim() || 'No reflection provided for this week.', 24)}

                            <div style={{ marginTop: 'auto', paddingTop: 18 }}>
                                <p style={{ fontSize: 23, marginBottom: 30 }}>
                                    <strong>Noted by:</strong>
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ width: '42%', textAlign: 'center' }}>
                                        <div style={{ borderTop: '1px solid #111', paddingTop: 5, fontSize: 24, fontWeight: 700 }}>Officer-In-Charge</div>
                                    </div>
                                    <div style={{ width: '42%', textAlign: 'center' }}>
                                        <div style={{ borderTop: '1px solid #111', paddingTop: 5, fontSize: 24, fontWeight: 700 }}>Adviser</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                <span>Revision No: 0</span>
                                <span>Issued Date: August 17, 2017</span>
                                <span>Revision Date: NA</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

type HistoryContentProps = {
    activeTab: 'reports' | 'history';
    setActiveTab: React.Dispatch<React.SetStateAction<'reports' | 'history'>>;
    logs: DailyLog[];
    filteredLogs: DailyLog[];
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    showFilters: boolean;
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
    hasActiveFilters: boolean;
    clearFilters: () => void;
    supervisors: string[];
    filterSupervisor: string;
    setFilterSupervisor: React.Dispatch<React.SetStateAction<string>>;
    filterActivity: ActivityType | '';
    setFilterActivity: React.Dispatch<React.SetStateAction<ActivityType | ''>>;
    filterDateFrom: string;
    setFilterDateFrom: React.Dispatch<React.SetStateAction<string>>;
    filterDateTo: string;
    setFilterDateTo: React.Dispatch<React.SetStateAction<string>>;
    totalFilteredHours: number;
    openEditModal: (log: DailyLog) => void;
    setDeleteConfirm: React.Dispatch<React.SetStateAction<string | null>>;
};

// History Tab Content
function HistoryContent({ activeTab, setActiveTab, logs, filteredLogs, searchQuery, setSearchQuery, showFilters, setShowFilters, hasActiveFilters, clearFilters, supervisors, filterSupervisor, setFilterSupervisor, filterActivity, setFilterActivity, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo, totalFilteredHours, openEditModal, setDeleteConfirm }: HistoryContentProps) {
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
                    background: 'rgba(24,24,27,0.72)',
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
