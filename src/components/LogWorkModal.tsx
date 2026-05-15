'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { ACTIVITY_TYPES, ActivityType } from '@/lib/types';
import { Calendar, Tag, FileText, User, Clock, Check, X } from 'lucide-react';
import { showToast } from '@/lib/toast';

interface LogWorkModalProps {
    open: boolean;
    onClose: () => void;
}

export default function LogWorkModal({ open, onClose }: LogWorkModalProps) {
    const { user, addLog } = useApp();
    const [entryDate, setEntryDate] = useState('');
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [taskDescription, setTaskDescription] = useState('');
    const [supervisor, setSupervisor] = useState('');
    const [dailyHours, setDailyHours] = useState(8);
    const [showSupervisorList, setShowSupervisorList] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (!open) return;
        setEntryDate(new Date().toISOString().split('T')[0]);
        setActivityTypes([]);
        setTaskDescription('');
        setSupervisor('');
        setDailyHours(8);
        setShowConfirm(false);
    }, [open]);

    const toggleActivity = (type: ActivityType) => {
        setActivityTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || activityTypes.length === 0) return;
        setShowConfirm(true);
    };

    const handleConfirmSubmit = () => {
        if (!user) return;
        addLog({
            userId: user.id,
            entryDate,
            activityType: activityTypes,
            taskDescription,
            supervisor,
            dailyHours,
        });
        showToast({ kind: 'success', title: 'Work Logged', message: 'Daily work entry added successfully.' });
        setShowConfirm(false);
        onClose();
    };

    if (!open || !user) return null;

    const savedSupervisors = user.supervisors || [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 760, padding: 0 }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Log Today's Work</h3>
                        <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                            Record activities and hours for today
                        </p>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="input-group">
                            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} /> Date
                            </label>
                            <input
                                className="input"
                                type="date"
                                value={entryDate}
                                onChange={(e) => setEntryDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Tag size={14} /> Nature of Activity
                                <span style={{ color: 'var(--rose-400)', marginLeft: 2 }}>*</span>
                            </label>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 8,
                                padding: 16,
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(24,24,27,0.45)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                {ACTIVITY_TYPES.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`tag ${activityTypes.includes(type) ? 'active' : ''}`}
                                        onClick={() => toggleActivity(type)}
                                    >
                                        {activityTypes.includes(type) && <Check size={12} />}
                                        {type}
                                    </button>
                                ))}
                            </div>
                            {activityTypes.length === 0 && (
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
                                placeholder="Describe what you worked on today..."
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                required
                                style={{ minHeight: 140, lineHeight: 1.7 }}
                            />
                        </div>

                        <div className="input-group" style={{ position: 'relative' }}>
                            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> Assigned By (Supervisor)
                            </label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Enter supervisor's name"
                                value={supervisor}
                                onChange={(e) => {
                                    setSupervisor(e.target.value);
                                    setShowSupervisorList(true);
                                }}
                                onFocus={() => setShowSupervisorList(true)}
                                onBlur={() => setTimeout(() => setShowSupervisorList(false), 200)}
                                required
                            />
                            {showSupervisorList && savedSupervisors.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: 4,
                                    background: 'var(--slate-800)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-sm)',
                                    boxShadow: 'var(--shadow-xl)',
                                    zIndex: 10,
                                    maxHeight: 160,
                                    overflowY: 'auto',
                                }}>
                                    {savedSupervisors
                                        .filter((s) => s.toLowerCase().includes(supervisor.toLowerCase()))
                                        .map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    textAlign: 'left',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--slate-300)',
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    transition: 'background 100ms',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                                                onMouseDown={() => {
                                                    setSupervisor(s);
                                                    setShowSupervisorList(false);
                                                }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={14} /> Hours Rendered
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <input
                                    className="hours-range"
                                    type="range"
                                    min={0.5}
                                    max={12}
                                    step={0.5}
                                    value={dailyHours}
                                    onChange={(e) => setDailyHours(Number(e.target.value))}
                                    style={{
                                        flex: 1,
                                        height: 6,
                                        borderRadius: 'var(--radius-full)',
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        background: `linear-gradient(to right, var(--primary-500) 0%, var(--primary-500) ${((dailyHours - 0.5) / 11.5) * 100}%, rgba(255,255,255,0.08) ${((dailyHours - 0.5) / 11.5) * 100}%, rgba(255,255,255,0.08) 100%)`,
                                        border: 'none',
                                        padding: 0,
                                    }}
                                />
                                <div style={{
                                    minWidth: 64,
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    textAlign: 'center',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: 'var(--primary-300)',
                                }}>
                                    {dailyHours}h
                                </div>
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
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-success"
                            disabled={activityTypes.length === 0}
                        >
                            <Check size={16} /> Submit Log
                        </button>
                    </div>
                </form>

                {showConfirm && (
                    <div
                        onClick={() => setShowConfirm(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            zIndex: 3000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(24,24,27,1) 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 20,
                                maxWidth: 480,
                                width: '100%',
                                overflow: 'hidden',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div style={{
                                padding: '20px 24px 16px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: 'rgba(16,185,129,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <FileText size={20} style={{ color: 'var(--primary-300)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 2 }}>
                                        Confirm Submission
                                    </h3>
                                    <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                        Please review your log entry before submitting
                                    </p>
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <Calendar size={16} style={{ color: 'var(--primary-300)', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</p>
                                        <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>
                                            {new Date(entryDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <Tag size={16} style={{ color: 'var(--primary-300)', flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Activities</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {activityTypes.map((type) => (
                                                <span key={type} style={{
                                                    padding: '3px 10px',
                                                    borderRadius: 6,
                                                    background: 'rgba(16,185,129,0.12)',
                                                    border: '1px solid rgba(16,185,129,0.22)',
                                                    color: '#a7f3d0',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}>
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <Clock size={16} style={{ color: 'var(--primary-300)', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hours</p>
                                        <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{dailyHours}h</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: '16px 24px 20px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                gap: 10,
                                justifyContent: 'flex-end',
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(false)}
                                    className="btn btn-secondary"
                                >
                                    Go Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmSubmit}
                                    className="btn btn-success"
                                >
                                    <Check size={16} /> Confirm & Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
