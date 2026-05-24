'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Calendar, Users, CheckCircle, X, Pencil } from 'lucide-react';
import type { User, Sanction, DutySlot, SanctionRender } from '@/lib/types';
import { useApp } from '@/lib/context';
import { buildStudentSearchText, compareStudentsBySurnameFirst, formatStudentNameForDean, normalizeClassNumber } from '@/lib/student-display';

export default function DeanSanctionsPage() {
    const { user, getAllStudents, getSanctionsForStudent, saveSanction, updateSanctionDays, updateSanction, getDutySlots, createDutySlot, getSanctionRenders } = useApp();
    const STUDENT_PICKER_LIMIT = 120;
    const [activeTab, setActiveTab] = useState<'sanctions' | 'duty-slots' | 'renders'>('sanctions');
    const [students, setStudents] = useState<User[]>([]);
    const [sanctionsSearchQuery, setSanctionsSearchQuery] = useState('');
    const [dutySlotsSearchQuery, setDutySlotsSearchQuery] = useState('');
    const [rendersSearchQuery, setRendersSearchQuery] = useState('');
    const [sanctionStudentQuery, setSanctionStudentQuery] = useState('');
    const [selectedSanctionStudentIds, setSelectedSanctionStudentIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSanction, setSavingSanction] = useState(false);

    const [sanctions, setSanctions] = useState<Sanction[]>([]);
    const [showSanctionModal, setShowSanctionModal] = useState(false);
    const [sanctionForm, setSanctionForm] = useState({
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
    const todayDateKey = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [interns, dutySlotsData, rendersData] = await Promise.all([
                    getAllStudents(),
                    getDutySlots(),
                    getSanctionRenders(),
                ]);

                setStudents([...interns].sort(compareStudentsBySurnameFirst));
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

    const studentsById = useMemo(() => {
        const map = new Map<string, User>();
        for (const student of students) {
            map.set(student.id, student);
        }
        return map;
    }, [students]);

    const sanctionDropdownStudents = useMemo(() => {
        return [...students].sort((a, b) => {
            const aClass = normalizeClassNumber(a.classNumber);
            const bClass = normalizeClassNumber(b.classNumber);

            if (aClass && bClass) {
                const classDiff = Number(aClass) - Number(bClass);
                if (classDiff !== 0) return classDiff;
            } else if (aClass) {
                return -1;
            } else if (bClass) {
                return 1;
            }

            return compareStudentsBySurnameFirst(a, b);
        });
    }, [students]);

    const sanctionStudentMatches = useMemo(() => {
        const query = sanctionStudentQuery.trim().toLowerCase();
        if (!query) return sanctionDropdownStudents;
        return sanctionDropdownStudents
            .filter((student) => buildStudentSearchText(student).includes(query));
    }, [sanctionDropdownStudents, sanctionStudentQuery]);

    const filteredSanctionStudentOptions = useMemo(() => {
        return sanctionStudentMatches.slice(0, STUDENT_PICKER_LIMIT);
    }, [sanctionStudentMatches, STUDENT_PICKER_LIMIT]);

    const visibleSanctionStudentIds = useMemo(() => {
        return filteredSanctionStudentOptions.map((student) => student.id);
    }, [filteredSanctionStudentOptions]);

    const allVisibleStudentsSelected = useMemo(() => {
        if (visibleSanctionStudentIds.length === 0) return false;
        return visibleSanctionStudentIds.every((id) => selectedSanctionStudentIds.includes(id));
    }, [visibleSanctionStudentIds, selectedSanctionStudentIds]);

    const getStudentDisplayName = (studentId: string) => {
        const student = studentsById.get(studentId);
        if (!student) return 'Unknown';
        return formatStudentNameForDean(student);
    };

    const filteredSanctions = useMemo(() => {
        if (!sanctionsSearchQuery.trim()) return sanctions;
        const query = sanctionsSearchQuery.toLowerCase();
        return sanctions.filter((sanction) => {
            const student = studentsById.get(sanction.userId);
            return (
                (student ? buildStudentSearchText(student).includes(query) : false) ||
                sanction.reason.toLowerCase().includes(query)
            );
        });
    }, [sanctions, studentsById, sanctionsSearchQuery]);

    const filteredRenderSanctions = useMemo(() => {
        if (!rendersSearchQuery.trim()) return sanctions;
        const query = rendersSearchQuery.toLowerCase();
        return sanctions.filter((sanction) => {
            const student = studentsById.get(sanction.userId);
            return (
                (student ? buildStudentSearchText(student).includes(query) : false) ||
                sanction.reason.toLowerCase().includes(query)
            );
        });
    }, [sanctions, studentsById, rendersSearchQuery]);

    const filteredDutySlots = useMemo(() => {
        if (!dutySlotsSearchQuery.trim()) return dutySlots;
        const query = dutySlotsSearchQuery.toLowerCase();
        return dutySlots.filter((slot) => {
            const title = (slot.title || '').toLowerCase();
            const description = (slot.description || '').toLowerCase();
            const location = (slot.location || '').toLowerCase();
            const date = (slot.date || '').toLowerCase();
            return (
                title.includes(query) ||
                description.includes(query) ||
                location.includes(query) ||
                date.includes(query)
            );
        });
    }, [dutySlots, dutySlotsSearchQuery]);

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

    const filteredAvailedRenders = useMemo(() => {
        if (!dutySlotsSearchQuery.trim()) return availedRenders;
        const query = dutySlotsSearchQuery.toLowerCase();
        return availedRenders.filter((render) => {
            const student = studentsById.get(render.userId);
            const slot = dutySlots.find((entry) => entry.id === render.dutySlotId);
            const studentText = student ? buildStudentSearchText(student) : '';
            const slotTitle = (slot?.title || '').toLowerCase();
            const slotDate = (slot?.date || '').toLowerCase();

            return (
                studentText.includes(query) ||
                slotTitle.includes(query) ||
                slotDate.includes(query) ||
                render.status.toLowerCase().includes(query)
            );
        });
    }, [availedRenders, dutySlotsSearchQuery, studentsById, dutySlots]);

    const handleIssueSanction = async () => {
        if (selectedSanctionStudentIds.length === 0 || sanctionForm.days < 1 || !sanctionForm.reason.trim()) {
            setFeedbackModal({
                title: 'Missing Required Fields',
                message: 'Please select at least one student and complete all required fields.',
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
            const createdSanctions: Sanction[] = [];
            let failedCount = 0;

            for (const studentId of selectedSanctionStudentIds) {
                try {
                    const savedId = await saveSanction({
                        userId: studentId,
                        userEmail: studentsById.get(studentId)?.email || '',
                        deanId: user.id,
                        days: sanctionForm.days,
                        reason: sanctionForm.reason.trim(),
                        description: sanctionForm.description.trim(),
                        issuedDate: issuedAt,
                        status: 'active',
                    });

                    createdSanctions.push({
                        id: savedId,
                        userId: studentId,
                        deanId: user.id,
                        days: sanctionForm.days,
                        reason: sanctionForm.reason.trim(),
                        description: sanctionForm.description.trim(),
                        issuedDate: issuedAt,
                        status: 'active',
                        createdAt: issuedAt,
                        updatedAt: issuedAt,
                    });
                } catch (err) {
                    failedCount += 1;
                    console.error('Failed to save sanction for student:', studentId, err);
                }
            }

            if (createdSanctions.length > 0) {
                setSanctions((prev) => [...createdSanctions, ...prev]);
            }

            if (failedCount > 0 && createdSanctions.length > 0) {
                setFeedbackModal({
                    title: 'Partially Completed',
                    message: `Issued ${createdSanctions.length} sanction(s); ${failedCount} failed.`,
                    tone: 'warning',
                });
            } else if (failedCount > 0) {
                setFeedbackModal({
                    title: 'Failed to Save Sanctions',
                    message: 'No sanctions were issued. Please try again.',
                    tone: 'error',
                });
            }

            setShowSanctionModal(false);
            setSanctionForm({ days: 1, reason: '', description: '' });
            setSanctionStudentQuery('');
            setSelectedSanctionStudentIds([]);
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

        if (dutySlotForm.date < todayDateKey) {
            setFeedbackModal({
                title: 'Invalid Date',
                message: 'Past dates are not allowed for duty slots.',
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
            const code = (err as { code?: string } | null)?.code || '';
            if (code === 'sanction/past-duty-slot') {
                setFeedbackModal({
                    title: 'Invalid Date',
                    message: 'Past dates are not allowed for duty slots.',
                    tone: 'warning',
                });
                return;
            }
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

    const resetSanctionModal = () => {
        setShowSanctionModal(false);
        setSanctionStudentQuery('');
        setSelectedSanctionStudentIds([]);
        setSanctionForm({ days: 1, reason: '', description: '' });
    };

    const toggleSanctionStudentSelection = (studentId: string) => {
        setSelectedSanctionStudentIds((prev) =>
            prev.includes(studentId)
                ? prev.filter((id) => id !== studentId)
                : [...prev, studentId]
        );
    };

    const toggleSelectAllVisibleSanctionStudents = () => {
        setSelectedSanctionStudentIds((prev) => {
            if (allVisibleStudentsSelected) {
                return prev.filter((id) => !visibleSanctionStudentIds.includes(id));
            }
            const merged = new Set([...prev, ...visibleSanctionStudentIds]);
            return Array.from(merged);
        });
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
                        <div style={{ position: 'relative', width: '100%', maxWidth: 340 }}>
                            <Search
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--slate-400)'
                                }}
                            />
                            <input
                                type="text"
                                className="input"
                                placeholder="Search sanctioned students..."
                                value={sanctionsSearchQuery}
                                onChange={(e) => setSanctionsSearchQuery(e.target.value)}
                                style={{ paddingLeft: 38 }}
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
                                            <td>{getStudentDisplayName(sanction.userId)}</td>
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
                    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: 340 }}>
                            <Search
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--slate-400)'
                                }}
                            />
                            <input
                                type="text"
                                className="input"
                                placeholder="Search schedule and enrollments..."
                                value={dutySlotsSearchQuery}
                                onChange={(e) => setDutySlotsSearchQuery(e.target.value)}
                                style={{ paddingLeft: 38 }}
                            />
                        </div>
                        <button onClick={() => setShowDutySlotModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            <Plus size={16} /> Schedule Duty Slot
                        </button>
                    </div>

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
                                {filteredDutySlots.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                                            {dutySlots.length === 0 ? 'No duty slots scheduled.' : 'No duty slots match your search.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDutySlots.map((slot) => {
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

                        {filteredAvailedRenders.length === 0 ? (
                            <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>
                                {availedRenders.length === 0 ? 'No interns have enrolled in duty slots yet.' : 'No enrolled students match your search.'}
                            </p>
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
                                        {filteredAvailedRenders.map((render) => {
                                                const student = students.find((s) => s.id === render.userId);
                                                const slot = dutySlots.find((s) => s.id === render.dutySlotId);
                                                return (
                                                    <tr key={render.id}>
                                                        <td>{student ? formatStudentNameForDean(student) : 'Unknown'}</td>
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
                        <div style={{ position: 'relative', width: '100%', maxWidth: 340 }}>
                            <Search
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--slate-400)'
                                }}
                            />
                            <input
                                type="text"
                                className="input"
                                placeholder="Search sanctions in renders..."
                                value={rendersSearchQuery}
                                onChange={(e) => setRendersSearchQuery(e.target.value)}
                                style={{ paddingLeft: 38 }}
                            />
                        </div>
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
                                {filteredRenderSanctions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                                            {sanctions.length === 0 ? 'No sanctions issued yet.' : 'No sanctions match your search.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRenderSanctions.map((sanction) => (
                                        <tr key={sanction.id}>
                                            <td>{getStudentDisplayName(sanction.userId)}</td>
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
                                Reduce Sanction Days for {(() => {
                                    const sanction = sanctions.find((item) => item.id === editingSanctionId);
                                    if (!sanction) return 'Unknown';
                                    return getStudentDisplayName(sanction.userId);
                                })()}
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
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 860, padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Issue Sanction</h2>
                            <button
                                onClick={resetSanctionModal}
                                style={{ background: 'transparent', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Student</label>
                                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <input
                                        type="text"
                                        className="input"
                                        value={sanctionStudentQuery}
                                        onChange={(e) => setSanctionStudentQuery(e.target.value)}
                                        placeholder="Search by class #, name, email, course..."
                                    />
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 12,
                                        color: 'var(--slate-300)',
                                        userSelect: 'none',
                                        cursor: filteredSanctionStudentOptions.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: filteredSanctionStudentOptions.length === 0 ? 0.6 : 1,
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={allVisibleStudentsSelected}
                                            onChange={toggleSelectAllVisibleSanctionStudents}
                                            disabled={filteredSanctionStudentOptions.length === 0}
                                            style={{ accentColor: 'var(--primary-500)' }}
                                        />
                                        Select all visible students
                                    </label>
                                    <div style={{
                                        maxHeight: 220,
                                        overflowY: 'auto',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.03)',
                                    }}>
                                        {filteredSanctionStudentOptions.length === 0 ? (
                                            <p style={{ margin: 0, padding: '10px 12px', fontSize: 13, color: 'var(--slate-400)' }}>
                                                No students match your search.
                                            </p>
                                        ) : (
                                            filteredSanctionStudentOptions.map((student) => {
                                                const isSelected = selectedSanctionStudentIds.includes(student.id);
                                                return (
                                                    <label
                                                        key={student.id}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                            background: isSelected ? 'rgba(16,185,129,0.18)' : 'transparent',
                                                            color: isSelected ? 'white' : 'var(--slate-200)',
                                                            cursor: 'pointer',
                                                            fontSize: 13,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSanctionStudentSelection(student.id)}
                                                            style={{ accentColor: 'var(--primary-500)' }}
                                                        />
                                                        <div style={{ minWidth: 0 }}>
                                                            <p style={{ margin: 0, color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {formatStudentNameForDean(student)}
                                                            </p>
                                                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {student.email}
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-500)' }}>
                                        {selectedSanctionStudentIds.length} selected. Showing {filteredSanctionStudentOptions.length} of {sanctionStudentMatches.length} matched students.
                                        {!sanctionStudentQuery.trim() && sanctionStudentMatches.length > STUDENT_PICKER_LIMIT ? ' Type to narrow the list for large batches.' : ''}
                                    </p>
                                </div>
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
                                <button onClick={resetSanctionModal} style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button onClick={handleIssueSanction} disabled={savingSanction} style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--primary-600)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: savingSanction ? 0.7 : 1 }}>
                                    {savingSanction ? 'Saving...' : `Issue Sanction${selectedSanctionStudentIds.length > 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDutySlotModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 640, padding: 24 }}>
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
                                <input type="date" min={todayDateKey} value={dutySlotForm.date} onChange={(e) => setDutySlotForm({ ...dutySlotForm, date: e.target.value })} style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
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
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 640, padding: 24 }}>
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
                <div className="modal-overlay" onClick={() => setFeedbackModal(null)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 440, padding: 18, borderRadius: 14 }}
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