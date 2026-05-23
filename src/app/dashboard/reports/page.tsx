'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import { getLogsForWeek } from '@/lib/calculations';
import { generateSimpleWeeklyReportPDF, generateUBWeeklyReportPDF } from '@/lib/pdf';
import { WeeklyReport, ActivityType, DailyLog, ACTIVITY_TYPES } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import LogWorkModal from '@/components/LogWorkModal';
import WeeklyReportFilters from '@/components/WeeklyReportFilters';
import WeeklyReportTable from '@/components/WeeklyReportTable';
import LogsHistoryFilters from '@/components/LogsHistoryFilters';
import LogsHistoryTable from '@/components/LogsHistoryTable';
import { showToast } from '@/lib/toast';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
    buildWeeklyReportSchedule,
    getWeeklyReportDeadline,
    validateWeeklyReportSubmission,
} from '@/lib/weekly-reports';
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

type WeekRange = {
    weekNumber: number;
    start: Date;
    end: Date;
    deadline: Date;
    label: string;
    status: 'pending' | 'overdue' | 'submitted';
    report: WeeklyReport | null;
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
    const [hoursRendered, setHoursRendered] = useState('');
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [showPreview] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [paperViewOpen, setPaperViewOpen] = useState(false);
    const [paperWeekIdx, setPaperWeekIdx] = useState(0);
    const [savedReports, setSavedReports] = useState<WeeklyReport[]>([]);

    // Preview filters state
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewSupervisor, setPreviewSupervisor] = useState('');
    const [previewActivity, setPreviewActivity] = useState<ActivityType | ''>('');
    const [previewDateFrom, setPreviewDateFrom] = useState('');
    const [previewDateTo, setPreviewDateTo] = useState('');
    const [showPreviewFilters, setShowPreviewFilters] = useState(false);

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
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

    const blockScientificNumberKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (['e', 'E', '+', '-'].includes(event.key)) {
            event.preventDefault();
        }
    };

    const sanitizeDecimalInput = (value: string) => {
        const normalized = value.replace(/[^\d.]/g, '');
        return normalized.replace(/(\..*)\./g, '$1');
    };

    const weeks = useMemo(
        () => buildWeeklyReportSchedule(user?.startDate, savedReports),
        [savedReports, user?.startDate]
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

    const currentSavedReport = selectedWeek
        ? savedReports.find((report) => report.weekNumber === selectedWeek.weekNumber) || null
        : null;

    React.useEffect(() => {
        if (currentSavedReport) {
            setReflection(currentSavedReport.reflection);
        } else {
            setReflection('');
        }
    }, [selectedWeekIdx, currentSavedReport]);

    if (!user) return null;

    const submitWeeklyReport = async () => {
        if (!selectedWeek || !user) return;

        const validationError = validateWeeklyReportSubmission({
            weekNumber: selectedWeek.weekNumber,
            hoursRendered,
            file: reportFile,
            startDate: user.startDate,
            reports: savedReports,
        });

        if (validationError) {
            showToast({ kind: 'error', title: 'Submission Failed', message: validationError });
            return;
        }

        const parsedHours = Number(hoursRendered);
        const deadline = getWeeklyReportDeadline(user.startDate, selectedWeek.weekNumber);

        setSubmittingReport(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', reportFile as File);
            uploadFormData.append('userId', user.id);
            uploadFormData.append('weekNumber', String(selectedWeek.weekNumber));

            const uploadResponse = await fetch('/api/weekly-reports/upload-file', {
                method: 'POST',
                body: uploadFormData,
            });

            if (!uploadResponse.ok) {
                const payload = (await uploadResponse.json().catch(() => ({}))) as { error?: string };
                throw new Error(payload.error || 'Unable to upload the PDF file.');
            }

            const uploadPayload = (await uploadResponse.json()) as {
                fileUrl: string;
                fileName: string;
                filePublicId: string;
                fileResourceType: 'raw';
            };

            const saved = await ctxSaveReport({
                userId: user.id,
                weekNumber: selectedWeek.weekNumber,
                weekStart: selectedWeek.start.toISOString(),
                weekEnd: selectedWeek.end.toISOString(),
                deadline: deadline.toISOString(),
                hoursRendered: parsedHours,
                fileUrl: uploadPayload.fileUrl,
                fileName: uploadPayload.fileName,
                filePublicId: uploadPayload.filePublicId,
                submittedAt: new Date().toISOString(),
                status: 'submitted',
                reflection,
                logs: weekLogs,
                importedPdfUrl: uploadPayload.fileUrl,
                importedPdfName: uploadPayload.fileName,
                importedPdfUploadedAt: new Date().toISOString(),
                importedPdfPublicId: uploadPayload.filePublicId,
                importedPdfResourceType: uploadPayload.fileResourceType,
            });

            setSavedReports((prev) => {
                const idx = prev.findIndex((report) => report.weekNumber === saved.weekNumber);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = saved;
                    return updated;
                }
                return [...prev, saved];
            });

            // Refresh reports from Firestore to ensure persistence
            try {
                const refreshedReports = await ctxGetReports(user.id);
                setSavedReports(refreshedReports);
            } catch (refreshError) {
                console.warn('Failed to refresh reports from Firestore:', refreshError);
            }

            setReportFile(null);
            setHoursRendered('');
            showToast({ kind: 'success', title: 'Submitted', message: `Week ${selectedWeek.weekNumber} report submitted successfully.` });
        } catch (error) {
            console.error('Weekly report submission failed:', error);
            const message = error instanceof Error ? error.message : 'Could not submit the weekly report.';
            showToast({ kind: 'error', title: 'Submission Failed', message });
        } finally {
            setSubmittingReport(false);
        }
    };

    const handleExportPaperPDF = async () => {
        if (!selectedWeek) return;
        setGenerating(true);
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
                                        inputMode="decimal"
                                        onKeyDown={blockScientificNumberKeys}
                                        value={editHours}
                                        onChange={(e) => {
                                            const sanitized = sanitizeDecimalInput(e.target.value);
                                            const parsed = Number(sanitized);
                                            setEditHours(Number.isFinite(parsed) ? parsed : 0);
                                        }}
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
                    onExportPDF={() => setShowExportOptions(true)}
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
                    hoursRendered={hoursRendered}
                    setHoursRendered={setHoursRendered}
                    reportFile={reportFile}
                    setReportFile={setReportFile}
                    submittingReport={submittingReport}
                    onSubmitWeeklyReport={submitWeeklyReport}
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
    onExportPDF: () => void;
    onOpenPaperView: () => void;
    onOpenLogModal: () => void;
    selectedWeekReport: WeeklyReport | null;
    reflection: string;
    setReflection: React.Dispatch<React.SetStateAction<string>>;
    hoursRendered: string;
    setHoursRendered: React.Dispatch<React.SetStateAction<string>>;
    reportFile: File | null;
    setReportFile: React.Dispatch<React.SetStateAction<File | null>>;
    submittingReport: boolean;
    onSubmitWeeklyReport: () => void;
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
    onExportPDF,
    onOpenPaperView,
    onOpenLogModal,
    selectedWeekReport,
    reflection,
    setReflection,
    hoursRendered,
    setHoursRendered,
    reportFile,
    setReportFile,
    submittingReport,
    onSubmitWeeklyReport,
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
    const [viewerReport, setViewerReport] = useState<WeeklyReport | null>(null);
    const viewerContainerRef = useRef<HTMLDivElement | null>(null);

    const getReportFileUrl = (report: WeeklyReport | null | undefined) => {
        if (!report) return '';
        return report.fileUrl || report.importedPdfUrl || '';
    };

    const getViewerSrc = (report: WeeklyReport | null | undefined) => {
        const fileUrl = getReportFileUrl(report);
        return fileUrl ? `/api/weekly-reports/view-file?url=${encodeURIComponent(fileUrl)}` : '';
    };

    useEffect(() => {
        if (!viewerReport) return;

        if (!GlobalWorkerOptions.workerSrc) {
            GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
                import.meta.url,
            ).toString();
        }

        let cancelled = false;

        const renderPdf = async () => {
            const viewerSrc = getViewerSrc(viewerReport);
            const container = viewerContainerRef.current;

            if (!viewerSrc || !container) return;

            container.innerHTML = '';
            container.dataset.state = 'loading';
            container.textContent = 'Loading PDF...';

            try {
                const response = await fetch(viewerSrc);
                if (!response.ok) {
                    throw new Error('Unable to load the PDF file.');
                }

                const pdfData = await response.arrayBuffer();
                const pdf = await getDocument({ data: pdfData }).promise;

                if (cancelled || !viewerContainerRef.current) return;

                container.innerHTML = '';
                delete container.dataset.state;

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                    const page = await pdf.getPage(pageNumber);
                    if (cancelled || !viewerContainerRef.current) return;

                    const viewport = page.getViewport({ scale: 1.4 });
                    const pageWrap = document.createElement('div');
                    pageWrap.style.margin = '0 auto 20px';
                    pageWrap.style.maxWidth = '100%';
                    pageWrap.style.background = '#111';
                    pageWrap.style.border = '1px solid rgba(255,255,255,0.08)';
                    pageWrap.style.borderRadius = '12px';
                    pageWrap.style.overflow = 'hidden';

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) {
                        continue;
                    }

                    canvas.width = Math.floor(viewport.width);
                    canvas.height = Math.floor(viewport.height);
                    canvas.style.width = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.display = 'block';
                    pageWrap.appendChild(canvas);
                    container.appendChild(pageWrap);

                    await page.render({ canvasContext: context, viewport } as any).promise;
                }
            } catch (error) {
                if (cancelled || !viewerContainerRef.current) return;
                container.innerHTML = '';
                delete container.dataset.state;
                const message = error instanceof Error ? error.message : 'Unable to render the PDF.';
                const fallback = document.createElement('div');
                fallback.style.color = 'var(--rose-300)';
                fallback.style.padding = '24px';
                fallback.style.fontSize = '14px';
                fallback.textContent = message;
                container.appendChild(fallback);
            }
        };

        renderPdf();

        return () => {
            cancelled = true;
        };
    }, [viewerReport]);

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
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        padding: '10px 18px',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))',
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 700,
                        border: '1px solid rgba(16,185,129,0.45)',
                        boxShadow: '0 8px 20px rgba(16,185,129,0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    <FileText size={16} />
                    Weekly Reports
                </div>
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                            <div className="input-group">
                                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Week Selection</label>
                                <select
                                    className="input"
                                    value={selectedWeekIdx}
                                    onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
                                    id="report-selected-week"
                                >
                                    {weeks.map((week, idx) => (
                                        <option key={week.weekNumber} value={idx}>
                                            Week {week.weekNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Deadline</label>
                                <input
                                    className="input"
                                    readOnly
                                    value={selectedWeek ? format(selectedWeek.deadline, 'MMM d, yyyy') : 'No internship start date'}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label" htmlFor="weekly-report-hours" style={{ marginBottom: 8, display: 'block' }}>
                                    Hours Rendered<span style={{ color: 'var(--rose-400)', marginLeft: 2 }}>*</span>
                                </label>
                                <input
                                    id="weekly-report-hours"
                                    className="input"
                                    type="number"
                                    min={0.5}
                                    step={0.5}
                                    inputMode="decimal"
                                    onKeyDown={blockScientificNumberKeys}
                                    value={hoursRendered}
                                    onChange={(e) => setHoursRendered(sanitizeDecimalInput(e.target.value))}
                                    placeholder="Total hours for the week"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label" htmlFor="weekly-report-file" style={{ marginBottom: 12, display: 'block' }}>
                                    Weekly Report PDF<span style={{ color: 'var(--rose-400)', marginLeft: 2 }}>*</span>
                                </label>
                                <div style={{
                                    position: 'relative',
                                    border: '2px dashed var(--slate-600)',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                }}
                                onMouseEnter={(e) => {
                                    const el = e.currentTarget;
                                    el.style.borderColor = 'var(--primary-400)';
                                    el.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                                }}
                                onMouseLeave={(e) => {
                                    const el = e.currentTarget;
                                    el.style.borderColor = 'var(--slate-600)';
                                    el.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                                }}
                                >
                                    <input
                                        id="weekly-report-file"
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="weekly-report-file" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-400)' }}>
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        <div>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>
                                                {reportFile ? reportFile.name : 'Click to upload or drag file'}
                                            </p>
                                            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 0 0' }}>PDF files only</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                                    Current week: <span style={{ color: 'white', fontWeight: 700 }}>{selectedWeek?.label || 'Select a week'}</span>
                                </p>
                                <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                                    Status: <span style={{ color: selectedWeek?.status === 'submitted' ? 'var(--primary-300)' : selectedWeek?.status === 'overdue' ? 'var(--rose-400)' : 'var(--amber-300)', fontWeight: 700 }}>
                                        {selectedWeek?.status ? selectedWeek.status.toUpperCase() : 'N/A'}
                                    </span>
                                </p>
                                {selectedWeekReport && (
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                                        Submitted file: <span style={{ color: 'white', fontWeight: 700 }}>{selectedWeekReport.fileName || selectedWeekReport.importedPdfName || 'weekly-report.pdf'}</span>
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={onSubmitWeeklyReport}
                                disabled={submittingReport || generating || !selectedWeek || selectedWeek.status === 'submitted'}
                            >
                                {submittingReport ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />}
                                {submittingReport ? 'Submitting...' : 'Submit Weekly Report'}
                            </button>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Week Status Overview</h3>
                                <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Week 1 to Week 15 based on the intern&apos;s start date.</p>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Week</th>
                                        <th>Deadline</th>
                                        <th>Status</th>
                                        <th>Hours</th>
                                        <th>File</th>
                                        <th>Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeks.map((week) => {
                                        const report = week.report;
                                        return (
                                            <tr key={week.weekNumber}>
                                                <td>Week {week.weekNumber}</td>
                                                <td>{format(week.deadline, 'MMM d, yyyy')}</td>
                                                <td>
                                                    <span
                                                        className="tag"
                                                        style={{
                                                            background:
                                                                week.status === 'submitted'
                                                                    ? 'rgba(16,185,129,0.16)'
                                                                    : week.status === 'overdue'
                                                                        ? 'rgba(244,63,94,0.16)'
                                                                        : 'rgba(245,158,11,0.16)',
                                                            color:
                                                                week.status === 'submitted'
                                                                    ? 'var(--primary-300)'
                                                                    : week.status === 'overdue'
                                                                        ? 'var(--rose-300)'
                                                                        : 'var(--amber-300)',
                                                        }}
                                                    >
                                                        {week.status}
                                                    </span>
                                                </td>
                                                <td>{report?.hoursRendered ? `${report.hoursRendered}h` : '-'}</td>
                                                <td>
                                                    {getReportFileUrl(report) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewerReport(report)}
                                                            className="btn btn-ghost btn-sm"
                                                            style={{
                                                                color: 'var(--primary-300)',
                                                                fontWeight: 600,
                                                                padding: '6px 10px',
                                                            }}
                                                        >
                                                            {report?.fileName || report?.importedPdfName || 'View File'}
                                                        </button>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>{report?.submittedAt ? format(new Date(report.submittedAt), 'MMM d, yyyy h:mm a') : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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

                    {viewerReport && getViewerSrc(viewerReport) && (
                        <div className="modal-overlay" onClick={() => setViewerReport(null)}>
                            <div
                                className="modal-content"
                                onClick={(e) => e.stopPropagation()}
                                style={{ maxWidth: 1100, width: '96vw', padding: 0, overflow: 'hidden' }}
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
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Weekly Report PDF</h3>
                                        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                                            Week {viewerReport.weekNumber} · {viewerReport.fileName || viewerReport.importedPdfName || 'Uploaded file'}
                                        </p>
                                    </div>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewerReport(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <div ref={viewerContainerRef} style={{ height: '80vh', overflowY: 'auto', background: '#0b0b0d', padding: 16 }}>
                                    <div style={{ color: 'var(--slate-400)', fontSize: 14 }}>Loading PDF...</div>
                                </div>
                            </div>
                        </div>
                    )}

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
    weeks: WeekRange[];
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
        ? savedReports.find((r) => r.weekNumber === selectedWeek.weekNumber)
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
