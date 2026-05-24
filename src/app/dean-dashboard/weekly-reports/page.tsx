'use client';

import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, Download, FileText, Calendar, X, ExternalLink } from 'lucide-react';
import type { User, WeeklyReport } from '@/lib/types';
import { useApp } from '@/lib/context';
import { buildStudentSearchText, compareStudentsBySurnameFirst, formatStudentNameForDean } from '@/lib/student-display';

export default function DeanWeeklyReportsPage() {
    const { getAllStudents, getWeeklyReports } = useApp();
    const [students, setStudents] = useState<User[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedStudentReports, setSelectedStudentReports] = useState<WeeklyReport[]>([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [viewerReport, setViewerReport] = useState<WeeklyReport | null>(null);
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState<string | null>(null);
    const [viewerBlobUrl, setViewerBlobUrl] = useState<string>('');

    const getReportFileUrl = (report: WeeklyReport | null | undefined) => {
        if (!report) return '';
        return report.fileUrl || report.importedPdfUrl || '';
    };

    const getViewerSrc = (report: WeeklyReport | null | undefined) => {
        const fileUrl = getReportFileUrl(report);
        return fileUrl ? `/api/weekly-reports/view-file?url=${encodeURIComponent(fileUrl)}` : '';
    };

    const getDownloadSrc = (report: WeeklyReport | null | undefined) => {
        const fileUrl = getReportFileUrl(report);
        if (!fileUrl) return '';
        const fileName = report?.fileName || report?.importedPdfName || 'weekly-report.pdf';
        return `/api/weekly-reports/view-file?url=${encodeURIComponent(fileUrl)}&download=1&filename=${encodeURIComponent(fileName)}`;
    };

    const isReportOverdue = (report: WeeklyReport) => {
        if (!report.deadline || !report.submittedAt) return false;
        const submittedAt = new Date(report.submittedAt).getTime();
        const deadline = new Date(report.deadline).getTime();
        return Number.isFinite(submittedAt) && Number.isFinite(deadline) && submittedAt > deadline;
    };

    useEffect(() => {
        let active = true;
        let objectUrl = '';

        const loadPreview = async () => {
            if (!viewerReport) {
                setViewerBlobUrl('');
                setViewerLoading(false);
                setViewerError(null);
                return;
            }

            const viewerSrc = getViewerSrc(viewerReport);
            if (!viewerSrc) {
                setViewerBlobUrl('');
                setViewerLoading(false);
                setViewerError('No file URL found for this report.');
                return;
            }

            setViewerLoading(true);
            setViewerError(null);
            setViewerBlobUrl('');

            try {
                const response = await fetch(viewerSrc, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('Unable to load the PDF file.');
                }

                const fileBlob = await response.blob();
                if (!active) return;

                objectUrl = URL.createObjectURL(fileBlob);
                setViewerBlobUrl(objectUrl);
                setViewerLoading(false);
            } catch (error) {
                if (!active) return;
                setViewerLoading(false);
                setViewerError(error instanceof Error ? error.message : 'Unable to render the PDF.');
            }
        };

        loadPreview();

        return () => {
            active = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [viewerReport]);

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
        setViewerReport(null);
        setReportsLoading(true);
        try {
            const reports = await getWeeklyReports(student.id);
            setSelectedStudentReports(reports);
        } catch (err) {
            console.error('Failed to load reports:', err);
            setSelectedStudentReports([]);
        } finally {
            setReportsLoading(false);
        }
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
                    Weekly Reports
                </h1>
                <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
                    Review and monitor student weekly reports
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
                                            {student.email}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} style={{ color: 'var(--slate-500)' }} />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Reports List */}
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
                                    Weekly Reports
                                </p>
                            </div>

                            {/* Reports */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                            }}>
                                {reportsLoading ? (
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
                                ) : selectedStudentReports.length === 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '300px',
                                        color: 'var(--slate-400)',
                                    }}>
                                        <p>No reports submitted</p>
                                    </div>
                                ) : (
                                    <div style={{ padding: '12px' }}>
                                        {selectedStudentReports.map((report) => (
                                            <button
                                                key={report.id}
                                                type="button"
                                                onClick={() => {
                                                    setViewerError(null);
                                                    setViewerLoading(true);
                                                    setViewerReport(report);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    marginBottom: '8px',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    cursor: 'pointer',
                                                    transition: 'all 150ms',
                                                    textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 8,
                                                    marginBottom: 8,
                                                }}>
                                                    <FileText size={16} style={{ color: 'var(--primary-500)', marginTop: 2 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{
                                                            fontWeight: 600,
                                                            color: 'white',
                                                            margin: 0,
                                                            marginBottom: 2,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            Week {report.weekNumber}
                                                        </p>
                                                        <div style={{
                                                            display: 'flex',
                                                            gap: 12,
                                                            fontSize: 12,
                                                            color: 'var(--slate-400)',
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Calendar size={12} />
                                                                <span>
                                                                    Submitted {report.submittedAt
                                                                        ? new Date(report.submittedAt).toLocaleDateString()
                                                                        : 'Unknown date'}
                                                                </span>
                                                            </div>
                                                            <span>·</span>
                                                            <span>{report.hoursRendered} hours</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: 8,
                                                    flexWrap: 'wrap',
                                                }}>
                                                    <span className="tag" style={{
                                                        background: isReportOverdue(report) ? 'rgba(244,63,94,0.16)' : 'rgba(16,185,129,0.16)',
                                                        color: isReportOverdue(report) ? 'var(--rose-300)' : 'var(--primary-300)',
                                                    }}>
                                                        {isReportOverdue(report) ? 'Submitted Late' : 'Submitted On Time'}
                                                    </span>
                                                    {getReportFileUrl(report) && (
                                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                            <span
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    padding: '4px 8px',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    background: 'rgba(16,185,129,0.15)',
                                                                    color: 'var(--primary-400)',
                                                                    textDecoration: 'none',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                <ExternalLink size={12} />
                                                                View Report
                                                            </span>
                                                            <a
                                                                href={getDownloadSrc(report)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    padding: '4px 8px',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    background: 'rgba(59,130,246,0.18)',
                                                                    color: '#93c5fd',
                                                                    textDecoration: 'none',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                <Download size={12} />
                                                                Download
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
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
                            <p>Select a student to view reports</p>
                        </div>
                    )}
                </div>
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
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                    <span className="tag" style={{
                                        background: isReportOverdue(viewerReport) ? 'rgba(244,63,94,0.16)' : 'rgba(16,185,129,0.16)',
                                        color: isReportOverdue(viewerReport) ? 'var(--rose-300)' : 'var(--primary-300)',
                                    }}>
                                        {isReportOverdue(viewerReport) ? 'Submitted Late' : 'Submitted On Time'}
                                    </span>
                                    <span className="tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--slate-300)' }}>
                                        Submitted {viewerReport.submittedAt ? new Date(viewerReport.submittedAt).toLocaleString() : 'Unknown date'}
                                    </span>
                                    <span className="tag" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--slate-300)' }}>
                                        Deadline {viewerReport.deadline ? new Date(viewerReport.deadline).toLocaleString() : 'Unknown'}
                                    </span>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewerReport(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,12,0.92)' }}>
                            <a
                                href={getDownloadSrc(viewerReport)}
                                className="btn btn-secondary btn-sm"
                            >
                                <Download size={14} /> Download Report
                            </a>
                        </div>
                        <div style={{ height: '80vh', overflow: 'hidden', background: '#0b0b0d', position: 'relative' }}>
                            {viewerLoading && (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    background: 'rgba(11,11,13,0.92)',
                                    zIndex: 2,
                                }}>
                                    <div style={{
                                        width: 24,
                                        height: 24,
                                        border: '3px solid rgba(16,185,129,0.22)',
                                        borderTopColor: 'var(--primary-500)',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
                                    <p style={{ color: 'var(--slate-300)', fontSize: 14, margin: 0 }}>Loading PDF preview...</p>
                                </div>
                            )}

                            {viewerError && (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    padding: 24,
                                    textAlign: 'center',
                                    background: 'rgba(11,11,13,0.96)',
                                    zIndex: 3,
                                }}>
                                    <p style={{ color: 'var(--rose-300)', fontSize: 14, margin: 0 }}>{viewerError}</p>
                                    <a
                                        href={viewerBlobUrl || getViewerSrc(viewerReport)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary btn-sm"
                                    >
                                        Open In New Tab
                                    </a>
                                </div>
                            )}

                            <iframe
                                title="Weekly Report PDF"
                                src={viewerBlobUrl || 'about:blank'}
                                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                onLoad={() => {
                                    if (viewerBlobUrl) {
                                        setViewerLoading(false);
                                        setViewerError(null);
                                    }
                                }}
                                onError={() => {
                                    setViewerLoading(false);
                                    setViewerError('Preview failed to load in modal. You can open the file in a new tab.');
                                }}
                            />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
