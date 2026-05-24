'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronRight, Download, FileText, Calendar, X, ExternalLink } from 'lucide-react';
import type { User, WeeklyReport } from '@/lib/types';
import { useApp } from '@/lib/context';
import { buildStudentSearchText, compareStudentsBySurnameFirst, formatStudentNameForDean } from '@/lib/student-display';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

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
    const viewerContainerRef = useRef<HTMLDivElement | null>(null);

    const getReportFileUrl = (report: WeeklyReport | null | undefined) => {
        if (!report) return '';
        return report.fileUrl || report.importedPdfUrl || '';
    };

    const getViewerSrc = (report: WeeklyReport | null | undefined) => {
        const fileUrl = getReportFileUrl(report);
        return fileUrl ? `/api/weekly-reports/view-file?url=${encodeURIComponent(fileUrl)}` : '';
    };

    const isReportOverdue = (report: WeeklyReport) => {
        if (!report.deadline || !report.submittedAt) return false;
        const submittedAt = new Date(report.submittedAt).getTime();
        const deadline = new Date(report.deadline).getTime();
        return Number.isFinite(submittedAt) && Number.isFinite(deadline) && submittedAt > deadline;
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
                                                onClick={() => setViewerReport(report)}
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
                                                    {report.fileUrl && (
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
                                                                transition: 'background 150ms',
                                                            }}
                                                        >
                                                            <Download size={12} />
                                                            View Report
                                                            <ExternalLink size={12} />
                                                        </span>
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
                        <div ref={viewerContainerRef} style={{ height: '80vh', overflowY: 'auto', background: '#0b0b0d', padding: 16 }}>
                            <div style={{ color: 'var(--slate-400)', fontSize: 14 }}>Loading PDF...</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
