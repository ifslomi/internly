'use client';

import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, Mail, Phone, Building2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { useApp } from '@/lib/context';

export default function DeanOJTProfilesPage() {
    const { getAllStudents } = useApp();
    const [students, setStudents] = useState<User[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

    useEffect(() => {
        const loadStudents = async () => {
            try {
                console.log('[OJT-Profiles] Loading students...');
                const interns = await getAllStudents();
                console.log('[OJT-Profiles] Loaded interns:', interns);
                setStudents(interns);
            } catch (err) {
                console.error('[OJT-Profiles] Failed to load students:', err);
            } finally {
                setLoading(false);
            }
        };
        loadStudents();
    }, [getAllStudents]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredStudents(students);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredStudents(
                students.filter(
                    (student) =>
                        student.name.toLowerCase().includes(query) ||
                        student.email.toLowerCase().includes(query) ||
                        student.course?.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, students]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
            }}>
                <div style={{
                    width: 48,
                    height: 48,
                    border: '3px solid rgba(16,185,129,0.22)',
                    borderTopColor: 'var(--primary-500)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    OJT Profiles
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    View and manage all student profiles
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: 'calc(100vh - 200px)' }}>
                {/* Students List */}
                <div style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {/* Search */}
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                            <Search size={16} style={{ color: 'var(--slate-400)' }} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'white',
                                    fontSize: 14,
                                }}
                            />
                        </div>
                    </div>

                    {/* Students List */}
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                    }}>
                        {filteredStudents.length === 0 ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '300px',
                                color: 'var(--slate-400)',
                            }}>
                                <p>No students found</p>
                            </div>
                        ) : (
                            filteredStudents.map((student) => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: selectedStudent?.id === student.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 150ms',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        justifyContent: 'space-between',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedStudent?.id !== student.id) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedStudent?.id !== student.id) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontWeight: 600,
                                            color: 'white',
                                            margin: 0,
                                            marginBottom: 4,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {student.name}
                                        </p>
                                        <p style={{
                                            fontSize: 12,
                                            color: 'var(--slate-400)',
                                            margin: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {student.course || 'No course'}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} style={{ color: 'var(--slate-500)' }} />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Profile Details */}
                <div style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {selectedStudent ? (
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 16,
                                marginBottom: 24,
                                paddingBottom: 24,
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                {selectedStudent.profileImage ? (
                                    <img
                                        src={selectedStudent.profileImage}
                                        alt={selectedStudent.name}
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 'var(--radius-md)',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 'var(--radius-md)',
                                        background: 'linear-gradient(135deg, #34d399, #10b981)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 24,
                                        color: 'white',
                                    }}>
                                        {selectedStudent.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0, marginBottom: 4 }}>
                                        {selectedStudent.name}
                                    </h2>
                                    <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>
                                        {selectedStudent.email}
                                    </p>
                                </div>
                            </div>

                            {/* Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Course */}
                                {selectedStudent.course && (
                                    <div>
                                        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course</p>
                                        <p style={{ fontSize: 14, color: 'white', margin: 0 }}>{selectedStudent.course}</p>
                                    </div>
                                )}

                                {/* Department */}
                                {selectedStudent.department && (
                                    <div>
                                        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</p>
                                        <p style={{ fontSize: 14, color: 'white', margin: 0 }}>{selectedStudent.department}</p>
                                    </div>
                                )}

                                {/* Contact */}
                                {selectedStudent.phoneNumber && (
                                    <div>
                                        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
                                            <Phone size={14} />
                                            <p style={{ fontSize: 14, margin: 0 }}>{selectedStudent.phoneNumber}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Company */}
                                {selectedStudent.companyName && (
                                    <div>
                                        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</p>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'white' }}>
                                            <Building2 size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                                            <div>
                                                <p style={{ fontSize: 14, margin: 0, fontWeight: 600 }}>{selectedStudent.companyName}</p>
                                                {selectedStudent.companyAddress && (
                                                    <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, marginTop: 4 }}>{selectedStudent.companyAddress}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Required Hours */}
                                <div>
                                    <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required Hours</p>
                                    <p style={{ fontSize: 14, color: 'white', margin: 0 }}>{selectedStudent.totalRequiredHours} hours</p>
                                </div>

                                {/* Start Date */}
                                <div>
                                    <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</p>
                                    <p style={{ fontSize: 14, color: 'white', margin: 0 }}>{new Date(selectedStudent.startDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '300px',
                            color: 'var(--slate-400)',
                        }}>
                            <p>Select a student to view profile</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
