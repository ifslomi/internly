'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { ACTIVITY_TYPES, ActivityType, DailyLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import {
    Search,
    Filter,
    Edit3,
    Trash2,
    Calendar,
    Clock,
    ChevronDown,
    X,
    History,
    AlertTriangle,
    Tag,
    FileText,
    User,
    Check,
    Save,
} from 'lucide-react';

export default function HistoryPage() {
    const { logs, deleteLog, updateLog } = useApp();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSupervisor, setFilterSupervisor] = useState('');
    const [filterActivity, setFilterActivity] = useState<ActivityType | ''>('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Edit modal state
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editActivities, setEditActivities] = useState<ActivityType[]>([]);
    const [editDescription, setEditDescription] = useState('');
    const [editSupervisor, setEditSupervisor] = useState('');
    const [editHours, setEditHours] = useState(8);
    const [editSaved, setEditSaved] = useState(false);

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

    return (
        <div>
            {/* Edit Modal */}
            {editingLog && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, padding: 0 }}>
                        {/* Modal Header */}
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
                            <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={closeEditModal}
                                id="edit-modal-close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Success Banner */}
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

                        {/* Modal Body */}
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto' }}>
                            {/* Date */}
                            <div className="input-group">
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Calendar size={14} /> Date
                                </label>
                                <input
                                    className="input"
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    id="edit-modal-date"
                                />
                            </div>

                            {/* Activity Tags */}
                            <div className="input-group">
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Tag size={14} /> Nature of Activity
                                    <span style={{ color: 'var(--rose-400)', marginLeft: 2 }}>*</span>
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

                            {/* Description */}
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
                                    id="edit-modal-description"
                                />
                            </div>

                            {/* Supervisor & Hours row */}
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
                                        id="edit-modal-supervisor"
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
                                        id="edit-modal-hours"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <button
                                className="btn btn-secondary"
                                onClick={closeEditModal}
                                id="edit-modal-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveEdit}
                                disabled={editActivities.length === 0 || editSaved}
                                id="edit-modal-save"
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
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
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setDeleteConfirm(null)}
                                    id="history-delete-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        deleteLog(deleteConfirm);
                                        setDeleteConfirm(null);
                                    }}
                                    id="history-delete-confirm"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    Logs History
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Browse, search, and manage all your logged entries
                </p>
            </div>

            {/* Search & Filters */}
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

                {/* Filter Panel */}
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
                                {supervisors.map((s) => (
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

            {/* Results count */}
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

            {/* Table */}
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
                                {filteredLogs.map((log) => (
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
