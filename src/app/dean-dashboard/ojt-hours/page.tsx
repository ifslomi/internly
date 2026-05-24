'use client';

import React, { useEffect, useState } from 'react';
import { Search, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useApp } from '@/lib/context';
import type { User } from '@/lib/types';
import { compareStudentsBySurnameFirst, formatNameSurnameFirst, formatStudentNameForDean, normalizeClassNumber } from '@/lib/student-display';

interface StudentHours {
    id: string;
    name: string;
    classNumber?: string;
    email: string;
    course: string;
    totalRequired: number;
    totalRendered: number;
    remaining: number;
    progressPercentage: number;
}

export default function DeanOJTHoursPage() {
    const { getAllStudents, getStudentHourStats } = useApp();
    const [students, setStudents] = useState<StudentHours[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<StudentHours[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'name' | 'progress' | 'remaining'>('name');

    useEffect(() => {
        const loadStudents = async () => {
            try {
                const interns = await getAllStudents();
                const studentHours = await Promise.all(
                    [...interns].sort(compareStudentsBySurnameFirst).map(async (intern: User) => {
                        const stats = await getStudentHourStats(intern.id, intern.totalRequiredHours, intern.email);
                        return {
                            id: intern.id,
                            name: intern.name,
                            classNumber: intern.classNumber,
                            email: intern.email,
                            course: intern.course || 'N/A',
                            totalRequired: stats.totalRequired,
                            totalRendered: stats.totalRendered,
                            remaining: stats.remaining,
                            progressPercentage: stats.progressPercentage,
                        };
                    })
                );
                setStudents(studentHours);
            } catch (err) {
                console.error('Failed to load students:', err);
            } finally {
                setLoading(false);
            }
        };
        loadStudents();
    }, [getAllStudents, getStudentHourStats]);

    useEffect(() => {
        let filtered = students;

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = students.filter(
                (student) => {
                    const classNumber = normalizeClassNumber(student.classNumber);
                    const surnameFirst = formatNameSurnameFirst(student.name);
                    return (
                        student.name.toLowerCase().includes(query) ||
                        surnameFirst.toLowerCase().includes(query) ||
                        student.email.toLowerCase().includes(query) ||
                        student.course.toLowerCase().includes(query) ||
                        classNumber.includes(query)
                    );
                }
            );
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'progress':
                    return b.progressPercentage - a.progressPercentage;
                case 'remaining':
                    return a.remaining - b.remaining;
                case 'name':
                default:
                    return compareStudentsBySurnameFirst(a, b);
            }
        });

        setFilteredStudents(filtered);
    }, [searchQuery, students, sortBy]);

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
                    OJT Hours Monitoring
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Monitor and track student hour progress
                </p>
            </div>

            {/* Controls */}
            <div style={{
                display: 'flex',
                gap: 12,
                marginBottom: 24,
                flexWrap: 'wrap',
                alignItems: 'center',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: '1 1 250px',
                    minWidth: '200px',
                }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={16} style={{ 
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--slate-400)', 
                            flexShrink: 0 
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
                </div>

                <select
                    className="input"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    style={{
                        width: 'auto',
                        minWidth: 200,
                    }}
                >
                    <option value="name">Sort by Name</option>
                    <option value="progress">Sort by Progress</option>
                    <option value="remaining">Sort by Remaining Hours</option>
                </select>
            </div>

            {/* Table */}
            <div style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                overflow: 'hidden',
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
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                        }}>
                            <thead>
                                <tr style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.02)',
                                }}>
                                    <th style={{
                                        padding: '12px 16px',
                                        textAlign: 'left',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--slate-400)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>Student</th>
                                    <th style={{
                                        padding: '12px 16px',
                                        textAlign: 'right',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--slate-400)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>Required Hours</th>
                                    <th style={{
                                        padding: '12px 16px',
                                        textAlign: 'right',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--slate-400)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>Rendered</th>
                                    <th style={{
                                        padding: '12px 16px',
                                        textAlign: 'right',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--slate-400)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>Remaining</th>
                                    <th style={{
                                        padding: '12px 16px',
                                        textAlign: 'center',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--slate-400)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>Progress</th>
                                    <th style={{
                                        padding: '12px 16px',
                                        textAlign: 'center',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--slate-400)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        transition: 'background 150ms',
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{
                                            padding: '12px 16px',
                                            fontSize: 14,
                                            color: 'white',
                                            fontWeight: 600,
                                        }}>
                                            <div>
                                                <p style={{ margin: 0, marginBottom: 4 }}>{formatStudentNameForDean(student)}</p>
                                                <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-400)' }}>{student.course}</p>
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: '12px 16px',
                                            fontSize: 14,
                                            color: 'white',
                                            fontWeight: 600,
                                            textAlign: 'right',
                                        }}>
                                            {student.totalRequired}
                                        </td>
                                        <td style={{
                                            padding: '12px 16px',
                                            fontSize: 14,
                                            color: '#10b981',
                                            fontWeight: 600,
                                            textAlign: 'right',
                                        }}>
                                            {student.totalRendered}
                                        </td>
                                        <td style={{
                                            padding: '12px 16px',
                                            fontSize: 14,
                                            color: student.remaining > 0 ? '#f59e0b' : '#10b981',
                                            fontWeight: 600,
                                            textAlign: 'right',
                                        }}>
                                            {student.remaining}
                                        </td>
                                        <td style={{
                                            padding: '12px 16px',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                justifyContent: 'center',
                                            }}>
                                                <div style={{
                                                    width: '100%',
                                                    maxWidth: '100px',
                                                    height: 6,
                                                    borderRadius: '3px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        width: `${Math.min(100, student.progressPercentage)}%`,
                                                        height: '100%',
                                                        background: student.progressPercentage >= 100 ? '#10b981' : '#f59e0b',
                                                        borderRadius: '3px',
                                                        transition: 'width 300ms',
                                                    }} />
                                                </div>
                                                <span style={{
                                                    fontSize: 12,
                                                    color: 'var(--slate-400)',
                                                    minWidth: '35px',
                                                    textAlign: 'right',
                                                }}>
                                                    {Math.round(student.progressPercentage)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: '12px 16px',
                                            textAlign: 'center',
                                        }}>
                                            {student.progressPercentage >= 100 ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 4,
                                                    padding: '4px 8px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: '#10b98120',
                                                    color: '#10b981',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}>
                                                    <CheckCircle size={14} />
                                                    Completed
                                                </div>
                                            ) : (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 4,
                                                    padding: '4px 8px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: '#f59e0b20',
                                                    color: '#f59e0b',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}>
                                                    <Clock size={14} />
                                                    In Progress
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
