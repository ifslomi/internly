'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight, Award, Calendar, Filter, Eye, X, ExternalLink, Loader2 } from 'lucide-react';
import type { User, Competency } from '@/lib/types';
import { useApp } from '@/lib/context';
import { buildStudentSearchText, compareStudentsBySurnameFirst, formatStudentNameForDean } from '@/lib/student-display';

const COMPETENCIES_PAGE_SIZE = 8;

const getAreaKeys = (areaCovered: string): string[] => {
    const matches = areaCovered.match(/[ABC]\.[0-9]+/g) || [];
    if (matches.length > 0) {
        return [...new Set(matches.map((item) => item.charAt(0)))];
    }

    const fallback = areaCovered.trim().match(/^([ABC])\b/);
    return fallback ? [fallback[1]] : [];
};

const extractAreaCodes = (areaCovered: string): string[] => {
    const codes = (areaCovered.match(/[ABC]\.\d+/g) || []).map((item) => item.trim());
    return [...new Set(codes)];
};

const truncateOutcome = (value: string, max = 120) => {
    const text = value.trim();
    if (!text) return 'No outcome provided.';
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}...`;
};

const splitAreaCovered = (areaCovered: string): string[] =>
    areaCovered
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);

const parseAreaItem = (item: string) => {
    const match = item.match(/^([ABC]\.\d+)\s+(.*)$/);
    if (!match) {
        return { code: item, text: '' };
    }

    return { code: match[1], text: match[2] };
};

export default function DeanCompetenciesPage() {
    const { getAllStudents, getStudentCompetencies } = useApp();
    const [students, setStudents] = useState<User[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedStudentCompetencies, setSelectedStudentCompetencies] = useState<Competency[]>([]);
    const [competenciesLoading, setCompetenciesLoading] = useState(false);
    const [competencyQuery, setCompetencyQuery] = useState('');
    const [competencyAreaFilter, setCompetencyAreaFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');
    const [visibleCompetencies, setVisibleCompetencies] = useState(COMPETENCIES_PAGE_SIZE);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState<{
        type: '' | 'link' | 'image' | 'video' | 'document';
        url: string;
        label: string;
    } | null>(null);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const [evidenceLoadError, setEvidenceLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadStudents = async () => {
            try {
                const interns = await getAllStudents();
                setStudents([...interns].sort(compareStudentsBySurnameFirst));
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
                students.filter((student) => buildStudentSearchText(student).includes(query))
            );
        }
    }, [searchQuery, students]);

    const handleSelectStudent = async (student: User) => {
        setSelectedStudent(student);
        setCompetenciesLoading(true);
        setCompetencyQuery('');
        setCompetencyAreaFilter('all');
        setVisibleCompetencies(COMPETENCIES_PAGE_SIZE);
        try {
            const competencies = await getStudentCompetencies(student.id);
            setSelectedStudentCompetencies(competencies);
        } catch (err) {
            console.error('Failed to load competencies:', err);
            setSelectedStudentCompetencies([]);
        } finally {
            setCompetenciesLoading(false);
        }
    };

    const filteredCompetencies = useMemo(() => {
        const q = competencyQuery.trim().toLowerCase();
        return selectedStudentCompetencies.filter((competency) => {
            const areas = getAreaKeys(competency.areaCovered);
            if (competencyAreaFilter !== 'all' && !areas.includes(competencyAreaFilter)) {
                return false;
            }

            if (!q) return true;

            return (
                competency.activity.toLowerCase().includes(q) ||
                competency.areaCovered.toLowerCase().includes(q) ||
                competency.outcome.toLowerCase().includes(q)
            );
        });
    }, [selectedStudentCompetencies, competencyAreaFilter, competencyQuery]);

    const visibleCompetenciesList = useMemo(
        () => filteredCompetencies.slice(0, visibleCompetencies),
        [filteredCompetencies, visibleCompetencies]
    );

    const canLoadMore = visibleCompetencies < filteredCompetencies.length;

    const openEvidenceModal = (competency: Competency) => {
        if (!competency.evidenceUrl) return;

        if (competency.evidenceType === 'link') {
            window.open(competency.evidenceUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        setShowDetailsModal(false);
        setEvidenceLoading(true);
        setEvidenceLoadError(null);
        setSelectedEvidence({
            type: competency.evidenceType,
            url: competency.evidenceUrl,
            label: competency.evidenceLabel || 'Evidence',
        });
        setShowEvidenceModal(true);
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
                                            {formatStudentNameForDean(student)}
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
                                    {formatStudentNameForDean(selectedStudent)}
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
                                <div style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    display: 'grid',
                                    gap: 10,
                                    background: 'rgba(255,255,255,0.015)',
                                }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{
                                            position: 'absolute',
                                            left: 10,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'var(--slate-500)',
                                        }} />
                                        <input
                                            className="input"
                                            placeholder="Search activity, area, or outcome..."
                                            value={competencyQuery}
                                            onChange={(e) => {
                                                setCompetencyQuery(e.target.value);
                                                setVisibleCompetencies(COMPETENCIES_PAGE_SIZE);
                                            }}
                                            style={{ paddingLeft: 34, height: 36, fontSize: 13 }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--slate-500)', fontSize: 12 }}>
                                            <Filter size={12} /> Area
                                        </span>
                                        {[
                                            { key: 'all', label: 'All' },
                                            { key: 'A', label: 'A' },
                                            { key: 'B', label: 'B' },
                                            { key: 'C', label: 'C' },
                                        ].map((tab) => {
                                            const active = competencyAreaFilter === tab.key;
                                            return (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => {
                                                        setCompetencyAreaFilter(tab.key as 'all' | 'A' | 'B' | 'C');
                                                        setVisibleCompetencies(COMPETENCIES_PAGE_SIZE);
                                                    }}
                                                    style={{
                                                        borderRadius: 999,
                                                        border: active ? '1px solid rgba(16,185,129,0.55)' : '1px solid rgba(255,255,255,0.12)',
                                                        background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                                                        color: active ? 'var(--primary-300)' : 'var(--slate-400)',
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        padding: '4px 10px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                        <span style={{ marginLeft: 'auto', color: 'var(--slate-500)', fontSize: 12 }}>
                                            Showing {Math.min(visibleCompetenciesList.length, filteredCompetencies.length)} of {filteredCompetencies.length}
                                        </span>
                                    </div>
                                </div>

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
                                ) : filteredCompetencies.length === 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '220px',
                                        color: 'var(--slate-400)',
                                    }}>
                                        <p>No results match your filters</p>
                                    </div>
                                ) : (
                                    <div style={{ padding: '12px' }}>
                                        {visibleCompetenciesList.map((competency) => {
                                            const areaCodes = extractAreaCodes(competency.areaCovered);
                                            return (
                                            <div
                                                key={competency.id}
                                                style={{
                                                    padding: '14px 16px',
                                                    marginBottom: '8px',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                }}
                                            >
                                                <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
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
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                                            <h4 style={{
                                                                fontSize: 14,
                                                                fontWeight: 700,
                                                                color: 'white',
                                                                margin: 0,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}>
                                                                {competency.activity}
                                                            </h4>
                                                        </div>

                                                        <div style={{
                                                            display: 'flex',
                                                            gap: 10,
                                                            fontSize: 12,
                                                            color: 'var(--slate-400)',
                                                            marginTop: 4,
                                                            marginBottom: 8,
                                                            alignItems: 'center',
                                                            flexWrap: 'wrap',
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Calendar size={12} />
                                                                <span>{new Date(competency.date).toLocaleDateString()}</span>
                                                            </div>
                                                            {areaCodes.length > 0 && (
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                                    {areaCodes.map((code) => (
                                                                        <span
                                                                            key={`${competency.id}-${code}`}
                                                                            style={{
                                                                                fontSize: 11,
                                                                                fontWeight: 700,
                                                                                borderRadius: 999,
                                                                                padding: '2px 8px',
                                                                                border: '1px solid rgba(16,185,129,0.45)',
                                                                                background: 'rgba(16,185,129,0.14)',
                                                                                color: 'var(--primary-300)',
                                                                            }}
                                                                        >
                                                                            {code}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                            {truncateOutcome(competency.outcome)}
                                                        </p>
                                                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCompetency(competency);
                                                                    setShowDetailsModal(true);
                                                                }}
                                                                style={{
                                                                    border: '1px solid rgba(16,185,129,0.45)',
                                                                    background: 'rgba(16,185,129,0.14)',
                                                                    color: 'var(--primary-300)',
                                                                    borderRadius: 8,
                                                                    padding: '5px 10px',
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                }}
                                                            >
                                                                <Eye size={12} /> View
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })}

                                        {canLoadMore && (
                                            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setVisibleCompetencies((prev) => prev + COMPETENCIES_PAGE_SIZE)}
                                                    style={{
                                                        borderRadius: 10,
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        background: 'rgba(255,255,255,0.04)',
                                                        color: 'var(--slate-200)',
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Load More
                                                </button>
                                            </div>
                                        )}
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

            {showDetailsModal && selectedCompetency && (
                <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 780, width: 'calc(100% - 40px)', padding: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 4 }}>Competency Details</h3>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedCompetency.activity}
                                </p>
                            </div>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowDetailsModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: 18, display: 'grid', gap: 14, gridTemplateColumns: 'minmax(220px, 0.95fr) minmax(0, 1.35fr)' }}>
                            <div style={{ display: 'grid', gap: 12, paddingRight: 8, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', margin: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Activity</p>
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-200)', overflowWrap: 'anywhere' }}>{selectedCompetency.activity}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', margin: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</p>
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-200)' }}>{new Date(selectedCompetency.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Area Covered</p>
                                    <div style={{ display: 'grid', gap: 6 }}>
                                        {splitAreaCovered(selectedCompetency.areaCovered).map((item, idx) => {
                                            const parsed = parseAreaItem(item);
                                            return (
                                                <div key={`${parsed.code}-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            borderRadius: 999,
                                                            padding: '2px 8px',
                                                            border: '1px solid rgba(16,185,129,0.45)',
                                                            background: 'rgba(16,185,129,0.14)',
                                                            color: 'var(--primary-300)',
                                                            flexShrink: 0,
                                                            lineHeight: 1.4,
                                                        }}
                                                    >
                                                        {parsed.code}
                                                    </span>
                                                    {parsed.text ? (
                                                        <span style={{ fontSize: 12, color: 'var(--slate-300)', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                                                            {parsed.text}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outcome</p>
                                <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-200)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.6 }}>
                                    {selectedCompetency.outcome || 'No outcome provided.'}
                                </p>
                            </div>
                            {selectedCompetency.evidenceUrl && (
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Evidence</p>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEvidenceModal(selectedCompetency)}>
                                        <Eye size={14} /> {selectedCompetency.evidenceType === 'link' ? 'Open Link' : 'View Evidence'}
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {showEvidenceModal && selectedEvidence && (
                <div className="modal-overlay" onClick={() => setShowEvidenceModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 920, width: 'calc(100% - 40px)', padding: 0, overflow: 'hidden' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Evidence Preview</h3>
                                <p style={{ fontSize: 12, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedEvidence.label}
                                </p>
                            </div>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowEvidenceModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: 16 }}>
                            {evidenceLoading && (
                                <div style={{ minHeight: '45vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)', gap: 8 }}>
                                    <Loader2 size={18} className="spin-smooth" /> Loading evidence...
                                </div>
                            )}

                            {evidenceLoadError && (
                                <div style={{ minHeight: '45vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose-300)', textAlign: 'center', padding: 16 }}>
                                    {evidenceLoadError}
                                </div>
                            )}

                            {selectedEvidence.type === 'image' && (
                                <img
                                    src={selectedEvidence.url}
                                    alt={selectedEvidence.label}
                                    onLoad={() => setEvidenceLoading(false)}
                                    onError={() => {
                                        setEvidenceLoading(false);
                                        setEvidenceLoadError('Failed to load image evidence.');
                                    }}
                                    style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, background: 'rgba(0,0,0,0.35)' }}
                                />
                            )}

                            {selectedEvidence.type === 'video' && (
                                <video
                                    controls
                                    onLoadedData={() => setEvidenceLoading(false)}
                                    onError={() => {
                                        setEvidenceLoading(false);
                                        setEvidenceLoadError('Failed to load video evidence.');
                                    }}
                                    style={{ width: '100%', maxHeight: '70vh', borderRadius: 12, background: 'rgba(0,0,0,0.35)' }}
                                    src={selectedEvidence.url}
                                />
                            )}

                            {selectedEvidence.type === 'document' && (
                                <iframe
                                    src={selectedEvidence.url}
                                    title={selectedEvidence.label}
                                    onLoad={() => setEvidenceLoading(false)}
                                    onError={() => {
                                        setEvidenceLoading(false);
                                        setEvidenceLoadError('Failed to load document evidence.');
                                    }}
                                    style={{ width: '100%', height: '70vh', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}
                                />
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <a href={selectedEvidence.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                <ExternalLink size={16} /> Open in new tab
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
