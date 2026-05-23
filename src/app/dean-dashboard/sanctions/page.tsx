'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Calendar, Users, CheckCircle, X, Pencil } from 'lucide-react';
import type { User, Sanction, DutySlot, SanctionRender } from '@/lib/types';
import { useApp } from '@/lib/context';

export default function DeanSanctionsPage() {
    const { user, getAllStudents, getSanctionsForStudent, saveSanction, updateSanctionDays, updateSanction, getDutySlots, createDutySlot, getSanctionRenders } = useApp();
    const [activeTab, setActiveTab] = useState<'sanctions' | 'duty-slots' | 'renders'>('sanctions');
    const [students, setStudents] = useState<User[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingSanction, setSavingSanction] = useState(false);

    const [sanctions, setSanctions] = useState<Sanction[]>([]);
    const [showSanctionModal, setShowSanctionModal] = useState(false);
    const [sanctionForm, setSanctionForm] = useState({
        studentId: '',
        days: 1,
        reason: '',
        description: '',
    });

    const [dutySlots, setDutySlots] = useState<DutySlot[]>([]);
    const [showDutySlotModal, setShowDutySlotModal] = useState(false);
    const [dutySlotForm, setDutySlotForm] = useState({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        capacity: 10,
    });

    const [sanctionRenders, setSanctionRenders] = useState<SanctionRender[]>([]);
    const [editingSanctionId, setEditingSanctionId] = useState<string | null>(null);
    const [editingDays, setEditingDays] = useState(0);
    const [updatingSanction, setUpdatingSanction] = useState(false);
    const [showEditSanctionModal, setShowEditSanctionModal] = useState(false);
    const [savingEditedSanction, setSavingEditedSanction] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState<{
        title: string;
        message: string;
        tone: 'success' | 'error' | 'warning';
    } | null>(null);
    const [editSanctionForm, setEditSanctionForm] = useState({
        id: '',
        days: 1,
        reason: '',
        description: '',
        status: 'active' as Sanction['status'],
    });

    const toDigitsOnly = (value: string) => value.replace(/\D/g, '');
    const toInteger = (value: string, fallback: number, min = 0) => {
        const digits = toDigitsOnly(value);
        if (!digits) return fallback;
        return Math.max(min, Number(digits));
    };
    const blockNonIntegerKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (['e', 'E', '+', '-', '.', ',', ' '].includes(event.key)) {
            event.preventDefault();
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [interns, dutySlotsData, rendersData] = await Promise.all([
                    getAllStudents(),
                    getDutySlots(),
                    getSanctionRenders(),
                ]);

                setStudents(interns);
                setDutySlots(dutySlotsData);
                setSanctionRenders(rendersData);

                const sanctionLists = await Promise.all(
                    interns.map(async (student) => {
                        try {
                            return await getSanctionsForStudent(student.id, student.email);
                        } catch (err) {
                            console.error(`Failed to load sanctions for ${student.id}:`, err);
                            return [] as Sanction[];
                        }
                    })
                );

                setSanctions(
                    sanctionLists
                        .flat()
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                );
            } catch (err) {
                console.error('Failed to load students:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [getAllStudents, getDutySlots, getSanctionsForStudent, getSanctionRenders]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredStudents(students);
            return;
        }

        const query = searchQuery.toLowerCase();
        setFilteredStudents(
            students.filter(
                (student) =>
                    student.name.toLowerCase().includes(query) ||
                    student.email.toLowerCase().includes(query)
            )
        );
    }, [searchQuery, students]);

    const filteredSanctions = useMemo(() => {
        if (!searchQuery.trim()) return sanctions;
        const query = searchQuery.toLowerCase();
        return sanctions.filter((sanction) => {
            const student = students.find((s) => s.id === sanction.userId);
            return (
                student?.name.toLowerCase().includes(query) ||
                student?.email.toLowerCase().includes(query) ||
                sanction.reason.toLowerCase().includes(query)
            );
        });
    }, [sanctions, students, searchQuery]);

    const availedRenders = useMemo(() => {
        const seen = new Set<string>();
        return sanctionRenders.filter((render) => {
            if (render.status !== 'availed') return false;
            const enrollmentKey = `${render.dutySlotId}_${render.userId}`;
            if (seen.has(enrollmentKey)) return false;
            seen.add(enrollmentKey);
            return true;
        });
    }, [sanctionRenders]);

    const handleIssueSanction = async () => {
        if (!sanctionForm.studentId || sanctionForm.days < 1 || !sanctionForm.reason.trim()) {
            setFeedbackModal({
                title: 'Missing Required Fields',
                message: 'Please fill in all required fields.',
                tone: 'warning',
            });
            return;
        }

        if (!user) {
            setFeedbackModal({
                title: 'Sign In Required',
                message: 'You must be signed in as a dean to issue sanctions.',
                tone: 'warning',
            });
            return;
        }

        setSavingSanction(true);
        try {
            const issuedAt = new Date().toISOString();
            const savedId = await saveSanction({
                userId: sanctionForm.studentId,
                userEmail: filteredStudents.find((student) => student.id === sanctionForm.studentId)?.email || '',
                deanId: user.id,
                days: sanctionForm.days,
                reason: sanctionForm.reason.trim(),
                description: sanctionForm.description.trim(),
                issuedDate: issuedAt,
                status: 'active',
            });

            setSanctions((prev) => [
                {
                    id: savedId,
                    userId: sanctionForm.studentId,
                    deanId: user.id,
                    days: sanctionForm.days,
                    reason: sanctionForm.reason.trim(),
                    description: sanctionForm.description.trim(),
                    issuedDate: issuedAt,
                    status: 'active',
                    createdAt: issuedAt,
                    updatedAt: issuedAt,
                },
                ...prev,
            ]);

            setShowSanctionModal(false);
            setSanctionForm({ studentId: '', days: 1, reason: '', description: '' });
        } catch (err) {
            console.error('Failed to save sanction:', err);
            setFeedbackModal({
                title: 'Failed to Save Sanction',
                message: 'Please try again.',
                tone: 'error',
            });
        } finally {
            setSavingSanction(false);
        }
    };

    const handleReduceSanctionDays = async () => {
        if (!editingSanctionId) return;
        if (editingDays < 0) {
            setFeedbackModal({
                title: 'Invalid Days Value',
                message: 'Days cannot be negative.',
                tone: 'warning',
            });
            return;
        }

        setUpdatingSanction(true);
        try {
            await updateSanctionDays(editingSanctionId, editingDays);
            
            setSanctions((prev) =>
                prev.map((s) => (s.id === editingSanctionId ? { ...s, days: editingDays } : s))
            );
            
            setEditingSanctionId(null);
            setEditingDays(0);
            setFeedbackModal({
                title: 'Sanction Updated',
                message: 'Sanction days updated successfully.',
                tone: 'success',
            });
        } catch (err) {
            console.error('Failed to update sanction days:', err);
            setFeedbackModal({
                title: 'Update Failed',
                message: 'Failed to update sanction days. Please try again.',
                tone: 'error',
            });
        } finally {
            setUpdatingSanction(false);
        }
    };

    const handleCreateDutySlot = async () => {
        if (!dutySlotForm.title || !dutySlotForm.date || !dutySlotForm.startTime || !dutySlotForm.endTime) {
            setFeedbackModal({
                title: 'Missing Required Fields',
                message: 'Please fill in all required fields.',
                tone: 'warning',
            });
            return;
        }

        const newSlot: DutySlot = {
            id: crypto.randomUUID(),
            deanId: user?.id || '',
            title: dutySlotForm.title,
            description: dutySlotForm.description,
            date: dutySlotForm.date,
            startTime: dutySlotForm.startTime,
            endTime: dutySlotForm.endTime,
            location: dutySlotForm.location,
            capacity: dutySlotForm.capacity,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            const savedId = await createDutySlot({
                deanId: newSlot.deanId,
                title: newSlot.title,
                description: newSlot.description,
                date: newSlot.date,
                startTime: newSlot.startTime,
                endTime: newSlot.endTime,
                location: newSlot.location,
                capacity: newSlot.capacity,
            });

            setDutySlots((prev) => [{ ...newSlot, id: savedId }, ...prev]);
            setShowDutySlotModal(false);
            setDutySlotForm({
                title: '',
                description: '',
                date: '',
                startTime: '',
                endTime: '',
                location: '',
                capacity: 10,
            });
        } catch (err) {
            console.error('Failed to save duty slot:', err);
            setFeedbackModal({
                title: 'Failed to Save Duty Slot',
                message: 'Please try again.',
                tone: 'error',
            });
        }
    };

    const openEditSanctionModal = (sanction: Sanction) => {
        setEditSanctionForm({
            id: sanction.id,
            days: sanction.days,
            reason: sanction.reason,
            description: sanction.description || '',
            status: sanction.status,
        });
        setShowEditSanctionModal(true);
    };

    const handleSaveEditedSanction = async () => {
        if (!editSanctionForm.id || editSanctionForm.days < 1 || !editSanctionForm.reason.trim()) {
            setFeedbackModal({
                title: 'Invalid Sanction Details',
                message: 'Please provide valid sanction details.',
                tone: 'warning',
            });
            return;
        }

        setSavingEditedSanction(true);
        try {
            await updateSanction(editSanctionForm.id, {
                days: editSanctionForm.days,
                reason: editSanctionForm.reason.trim(),
                description: editSanctionForm.description.trim(),
                status: editSanctionForm.status,
            });

            setSanctions((prev) =>
                prev.map((sanction) =>
                    sanction.id === editSanctionForm.id
                        ? {
                              ...sanction,
                              days: editSanctionForm.days,
                              reason: editSanctionForm.reason.trim(),
                              description: editSanctionForm.description.trim(),
                              status: editSanctionForm.status,
                              updatedAt: new Date().toISOString(),
                          }
                        : sanction
                )
            );

            setShowEditSanctionModal(false);
            setEditSanctionForm({ id: '', days: 1, reason: '', description: '', status: 'active' });
        } catch (err) {
            console.error('Failed to update sanction:', err);
            setFeedbackModal({
                title: 'Failed to Update Sanction',
                message: 'Please try again.',
                tone: 'error',
            });
        } finally {
            setSavingEditedSanction(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div
                    style={{
                        width: 48,
                        height: 48,
                        border: '3px solid rgba(16,185,129,0.22)',
                        borderTopColor: 'var(--primary-500)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    OJT Sanctions Management
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Issue sanctions, schedule duty slots, and track renders
                </p>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 10, padding: 6, borderRadius: 999, background: 'rgba(24,24,27,0.72)', border: '1px solid rgba(255,255,255,0.06)', width: '100%' }}>
                <button onClick={() => setActiveTab('sanctions')} style={{ flex: 1, padding: '10px 18px', borderRadius: 999, background: activeTab === 'sanctions' ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))' : 'transparent', color: activeTab === 'sanctions' ? 'white' : 'var(--slate-400)', fontSize: 13, fontWeight: 700, border: activeTab === 'sanctions' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Users size={16} /> Sanctioned Students
                </button>
                <button onClick={() => setActiveTab('duty-slots')} style={{ flex: 1, padding: '10px 18px', borderRadius: 999, background: activeTab === 'duty-slots' ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))' : 'transparent', color: activeTab === 'duty-slots' ? 'white' : 'var(--slate-400)', fontSize: 13, fontWeight: 700, border: activeTab === 'duty-slots' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Calendar size={16} /> Dean's Schedule
                </button>
                <button onClick={() => setActiveTab('renders')} style={{ flex: 1, padding: '10px 18px', borderRadius: 999, background: activeTab === 'renders' ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))' : 'transparent', color: activeTab === 'renders' ? 'white' : 'var(--slate-400)', fontSize: 13, fontWeight: 700, border: activeTab === 'renders' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle size={16} /> Renders
                </button>
            </div>

            {activeTab === 'sanctions' ? (
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={16} style={{ 
                                position: 'absolute', 
                                left: 12, 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: 'var(--slate-400)' 
                            }} />
                            <input
                                type="text"
                                className="input"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    paddingLeft: 38,
                                }}
                            />
                        </div>
                        <button onClick={() => setShowSanctionModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            <Plus size={16} /> Issue Sanction
                        </button>
                    </div>

                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Days</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSanctions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                                            {sanctions.length === 0 ? 'No sanctions issued yet.' : 'No sanctions match your search.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSanctions.map((sanction) => (
                                        <tr key={sanction.id}>
                                            <td>{students.find((s) => s.id === sanction.userId)?.name || 'Unknown'}</td>
                                            <td>{sanction.days} {sanction.days === 1 ? 'day' : 'days'}</td>
                                            <td>{sanction.reason}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{sanction.status}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => openEditSanctionModal(sanction)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(59,130,246,0.18)',
                                                        border: '1px solid rgba(59,130,246,0.35)',
                                                        color: '#60a5fa',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <Pencil size={12} /> Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'duty-slots' ? (
                <div className="card" style={{ padding: 24 }}>
                    <button onClick={() => setShowDutySlotModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', marginBottom: 24, borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        <Plus size={16} /> Schedule Duty Slot
                    </button>

                    <div style={{ marginBottom: 16, color: 'var(--slate-400)', fontSize: 13 }}>
                        Total scheduled slots: {dutySlots.length}
                    </div>

                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Location</th>
                                    <th>Capacity</th>
                                    <th>Enrolled</th>
                                    <th>Available</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dutySlots.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                                            No duty slots scheduled.
                                        </td>
                                    </tr>
                                ) : (
                                    dutySlots.map((slot) => {
                                        const enrolledCount = availedRenders.filter((r) => r.dutySlotId === slot.id).length;
                                        const availableCount = Math.max(0, slot.capacity - enrolledCount);
                                        return (
                                            <tr key={slot.id}>
                                                <td>{slot.title}</td>
                                                <td>{new Date(slot.date).toLocaleDateString()}</td>
                                                <td>{slot.startTime} - {slot.endTime}</td>
                                                <td>{slot.location || '-'}</td>
                                                <td>{slot.capacity}</td>
                                                <td>
                                                    <span style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--primary-400)', padding: '4px 8px', borderRadius: '4px', fontSize: 12, fontWeight: 600 }}>
                                                        {enrolledCount}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ background: availableCount === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: availableCount === 0 ? '#ef4444' : '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontSize: 12, fontWeight: 600 }}>
                                                        {availableCount}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Students Enrolled in Slots</h3>

                        {availedRenders.length === 0 ? (
                            <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>No interns have enrolled in duty slots yet.</p>
                        ) : (
                            <div className="table-scroll">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Duty Slot</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availedRenders.map((render) => {
                                                const student = students.find((s) => s.id === render.userId);
                                                const slot = dutySlots.find((s) => s.id === render.dutySlotId);
                                                return (
                                                    <tr key={render.id}>
                                                        <td>{student?.name || 'Unknown'}</td>
                                                        <td>{slot?.title || 'Unknown'}</td>
                                                        <td>{slot ? new Date(slot.date).toLocaleDateString() : '-'}</td>
                                                        <td>
                                                            <span style={{ textTransform: 'capitalize', fontSize: 12, fontWeight: 600, color: 'var(--primary-400)' }}>
                                                                {render.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>All Sanctioned Students</h3>
                        <p style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 20 }}>View and manage all students with sanctions. Reduce their sanction days as they complete duty slots.</p>
                    </div>

                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Days</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Issued Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sanctions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                                            No sanctions issued yet.
                                        </td>
                                    </tr>
                                ) : (
                                    sanctions.map((sanction) => (
                                        <tr key={sanction.id}>
                                            <td>{students.find((s) => s.id === sanction.userId)?.name || 'Unknown'}</td>
                                            <td>{sanction.days}</td>
                                            <td>{sanction.reason}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{sanction.status}</td>
                                            <td>{new Date(sanction.issuedDate).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    onClick={() => {
                                                        setEditingSanctionId(sanction.id);
                                                        setEditingDays(sanction.days);
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(59,130,246,0.2)',
                                                        border: '1px solid rgba(59,130,246,0.3)',
                                                        color: '#3b82f6',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Reduce Days
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {editingSanctionId && (
                        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                                Reduce Sanction Days for {students.find((s) => s.id === sanctions.find((s) => s.id === editingSanctionId)?.userId)?.name}
                            </h3>

                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                                        New Days Remaining
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={editingDays}
                                        inputMode="numeric"
                                        onKeyDown={blockNonIntegerKeys}
                                        onChange={(e) => setEditingDays(toInteger(e.target.value, 0, 0))}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
                                    />
                                </div>

                                <button
                                    onClick={handleReduceSanctionDays}
                                    disabled={updatingSanction}
                                    style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: updatingSanction ? 0.7 : 1 }}
                                >
                                    {updatingSanction ? 'Updating...' : 'Update'}
                                </button>

                                <button
                                    onClick={() => {
                                        setEditingSanctionId(null);
                                        setEditingDays(0);
                                    }}
                                    style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showSanctionModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--slate-900)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', maxWidth: 500, width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Issue Sanction</h2>
                            <button onClick={() => setShowSanctionModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 0 }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Student</label>
                                <select 
                                    className="input"
                                    value={sanctionForm.studentId} 
                                    onChange={(e) => setSanctionForm({ ...sanctionForm, studentId: e.target.value })} 
                                    style={{ marginTop: 8 }}
                                >
                                    <option value="">Choose a student...</option>
                                    {filteredStudents.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days of Sanction</label>
                                <input 
                                    type="number" 
                                    className="input"
                                    min={1} 
                                    step={1} 
                                    value={sanctionForm.days} 
                                    inputMode="numeric"
                                    onKeyDown={blockNonIntegerKeys}
                                    onChange={(e) => setSanctionForm({ ...sanctionForm, days: toInteger(e.target.value, 0, 1) })} 
                                    placeholder="E.g., 3" 
                                    style={{ marginTop: 8 }} 
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</label>
                                <input 
                                    type="text" 
                                    className="input"
                                    value={sanctionForm.reason} 
                                    onChange={(e) => setSanctionForm({ ...sanctionForm, reason: e.target.value })} 
                                    placeholder="E.g., Late arrival" 
                                    style={{ marginTop: 8 }} 
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                <textarea 
                                    className="input textarea"
                                    value={sanctionForm.description} 
                                    onChange={(e) => setSanctionForm({ ...sanctionForm, description: e.target.value })} 
                                    placeholder="Additional details..." 
                                    style={{ marginTop: 8 }} 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                <button onClick={() => setShowSanctionModal(false)} style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button onClick={handleIssueSanction} disabled={savingSanction} style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: savingSanction ? 0.7 : 1 }}>
                                    {savingSanction ? 'Saving...' : 'Issue Sanction'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDutySlotModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--slate-900)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', maxWidth: 500, width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Schedule Duty Slot</h2>
                            <button onClick={() => setShowDutySlotModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 0 }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
                                <input type="text" value={dutySlotForm.title} onChange={(e) => setDutySlotForm({ ...dutySlotForm, title: e.target.value })} placeholder="E.g., Cleanup duty" style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                                <input type="date" value={dutySlotForm.date} onChange={(e) => setDutySlotForm({ ...dutySlotForm, date: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Time</label>
                                    <input type="time" value={dutySlotForm.startTime} onChange={(e) => setDutySlotForm({ ...dutySlotForm, startTime: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Time</label>
                                    <input type="time" value={dutySlotForm.endTime} onChange={(e) => setDutySlotForm({ ...dutySlotForm, endTime: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</label>
                                <input type="text" value={dutySlotForm.location} onChange={(e) => setDutySlotForm({ ...dutySlotForm, location: e.target.value })} placeholder="Optional" style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slots Needed</label>
                                <input type="number" min={1} step={1} value={dutySlotForm.capacity} inputMode="numeric" onKeyDown={blockNonIntegerKeys} onChange={(e) => setDutySlotForm({ ...dutySlotForm, capacity: toInteger(e.target.value, 1, 1) })} placeholder="E.g., 5" style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                <button onClick={() => setShowDutySlotModal(false)} style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button onClick={handleCreateDutySlot} style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                                    Create Duty Slot
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditSanctionModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--slate-900)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', maxWidth: 500, width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Sanction</h2>
                            <button
                                onClick={() => setShowEditSanctionModal(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days of Sanction</label>
                                <input
                                    type="number"
                                    className="input"
                                    min={1}
                                    step={1}
                                    value={editSanctionForm.days}
                                    inputMode="numeric"
                                    onKeyDown={blockNonIntegerKeys}
                                    onChange={(e) => setEditSanctionForm((prev) => ({ ...prev, days: toInteger(e.target.value, 0, 1) }))}
                                    style={{ marginTop: 8 }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={editSanctionForm.reason}
                                    onChange={(e) => setEditSanctionForm((prev) => ({ ...prev, reason: e.target.value }))}
                                    style={{ marginTop: 8 }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                <textarea
                                    className="input textarea"
                                    value={editSanctionForm.description}
                                    onChange={(e) => setEditSanctionForm((prev) => ({ ...prev, description: e.target.value }))}
                                    style={{ marginTop: 8 }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                                <select
                                    className="input"
                                    value={editSanctionForm.status}
                                    onChange={(e) => setEditSanctionForm((prev) => ({ ...prev, status: e.target.value as Sanction['status'] }))}
                                    style={{ marginTop: 8 }}
                                >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                <button
                                    onClick={() => setShowEditSanctionModal(false)}
                                    style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEditedSanction}
                                    disabled={savingEditedSanction}
                                    style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: savingEditedSanction ? 0.7 : 1 }}
                                >
                                    {savingEditedSanction ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {feedbackModal && (
                <div
                    onClick={() => setFeedbackModal(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        zIndex: 1000,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 440,
                            borderRadius: 14,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'var(--slate-900)',
                            padding: 18,
                        }}
                    >
                        <h3
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 700,
                                color:
                                    feedbackModal.tone === 'success'
                                        ? '#34d399'
                                        : feedbackModal.tone === 'warning'
                                          ? '#fbbf24'
                                          : '#f87171',
                            }}
                        >
                            {feedbackModal.title}
                        </h3>
                        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--slate-300)', lineHeight: 1.6 }}>
                            {feedbackModal.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button
                                onClick={() => setFeedbackModal(null)}
                                style={{
                                    padding: '7px 12px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'var(--primary-600)',
                                    color: 'white',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}