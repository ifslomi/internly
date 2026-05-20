'use client';

import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, Award, Calendar } from 'lucide-react';
import type { User, Competency } from '@/lib/types';
import { useApp } from '@/lib/context';

export default function DeanCompetenciesPage() {
    const { getAllStudents } = useApp();
    const [students, setStudents] = useState<User[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedStudentCompetencies, setSelectedStudentCompetencies] = useState<Competency[]>([]);
    const [competenciesLoading, setCompetenciesLoading] = useState(false);

    useEffect(() => {
        const loadStudents = async () => {
            try {
                const interns = await getAllStudents();
                setStudents(interns);
            } catch (err) {
                console.error('Failed to load students:', err);
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

    const handleSelectStudent = async (student: User) => {
        setSelectedStudent(student);
        setCompetenciesLoading(true);
        // Competencies would be loaded from Firestore here in the future
        setSelectedStudentCompetencies([]);
        setCompetenciesLoading(false);
    };

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
                    Student Competencies
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Track and monitor student competency development
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
                                    onClick={() => handleSelectStudent(student)}
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

                {/* Competencies List */}
                <div style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {selectedStudent ? (
                        <>
                            {/* Header */}
                            <div style={{
                                padding: '16px',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <h3 style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: 'white',
                                    margin: 0,
                                    marginBottom: 4,
                                }}>
                                    {selectedStudent.name}
                                </h3>
                                <p style={{
                                    fontSize: 12,
                                    color: 'var(--slate-400)',
                                    margin: 0,
                                }}>
                                    Competency Records
                                </p>
                            </div>

                            {/* Competencies */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                            }}>
                                {competenciesLoading ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '300px',
                                    }}>
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            border: '2px solid rgba(16,185,129,0.22)',
                                            borderTopColor: 'var(--primary-500)',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                        }} />
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                    </div>
                                ) : selectedStudentCompetencies.length === 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '300px',
                                        color: 'var(--slate-400)',
                                    }}>
                                        <p>No competencies recorded</p>
                                    </div>
                                ) : (
                                    <div style={{ padding: '12px' }}>
                                        {selectedStudentCompetencies.map((competency) => (
                                            <div
                                                key={competency.id}
                                                style={{
                                                    padding: '16px',
                                                    marginBottom: '8px',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 12,
                                                    marginBottom: 12,
                                                }}>
                                                    <div style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'rgba(16,185,129,0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'var(--primary-400)',
                                                        flexShrink: 0,
                                                    }}>
                                                        <Award size={20} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <h4 style={{
                                                            fontSize: 14,
                                                            fontWeight: 700,
                                                            color: 'white',
                                                            margin: 0,
                                                            marginBottom: 4,
                                                        }}>
                                                            {competency.activity}
                                                        </h4>
                                                        <div style={{
                                                            display: 'flex',
                                                            gap: 8,
                                                            fontSize: 12,
                                                            color: 'var(--slate-400)',
                                                            marginBottom: 8,
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Calendar size={12} />
                                                                <span>{new Date(competency.date).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                }}>
                                                    {competency.areaCovered && (
                                                        <div>
                                                            <p style={{
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                color: 'var(--slate-400)',
                                                                margin: 0,
                                                                marginBottom: 2,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.05em',
                                                            }}>Area Covered</p>
                                                            <p style={{
                                                                fontSize: 13,
                                                                color: 'var(--slate-300)',
                                                                margin: 0,
                                                            }}>
                                                                {competency.areaCovered}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {competency.outcome && (
                                                        <div>
                                                            <p style={{
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                color: 'var(--slate-400)',
                                                                margin: 0,
                                                                marginBottom: 2,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.05em',
                                                            }}>Outcome</p>
                                                            <p style={{
                                                                fontSize: 13,
                                                                color: 'var(--slate-300)',
                                                                margin: 0,
                                                            }}>
                                                                {competency.outcome}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {competency.evidenceUrl && (
                                                        <div>
                                                            <p style={{
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                color: 'var(--slate-400)',
                                                                margin: 0,
                                                                marginBottom: 6,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.05em',
                                                            }}>Evidence</p>
                                                            <a
                                                                href={competency.evidenceUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: 'inline-block',
                                                                    padding: '4px 8px',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    background: 'rgba(16,185,129,0.15)',
                                                                    color: 'var(--primary-400)',
                                                                    textDecoration: 'none',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    transition: 'background 150ms',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(16,185,129,0.25)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(16,185,129,0.15)';
                                                                }}
                                                            >
                                                                {competency.evidenceType === 'link' && '🔗 View Link'}
                                                                {competency.evidenceType === 'image' && '🖼️ View Image'}
                                                                {competency.evidenceType === 'video' && '🎥 View Video'}
                                                                {competency.evidenceType === 'document' && '📄 View Document'}
                                                                {!competency.evidenceType && '📎 View Evidence'}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '300px',
                            color: 'var(--slate-400)',
                        }}>
                            <p>Select a student to view competencies</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
