"use client";
import React, { useRef, useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { Award, Plus, Calendar, Trash2, AlertTriangle, X, Save, Link as LinkIcon, Image as ImageIcon, Video, FileText, ExternalLink, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { showToast } from '@/lib/toast';
import { uploadEvidenceFile } from '@/lib/intern';

const AREA_SECTIONS = [
  {
    key: 'A',
    title: 'Problem Analysis and Knowledge for Solving Computing Problems',
    items: [
      'A.1 Analyze complex problems and identify computing requirements suitable to its solution.',
      'A.2 Identify and analyze user requirements vital to implementation of computer-based solutions.',
      'A.3 Develop critical thinking skills.',
      'A.4 Be familiar with current best practices and modern tools in analyzing and solving computing problems.',
    ],
  },
  {
    key: 'B',
    title: 'Individual/Teamwork and Communication',
    items: [
      'B.1 Develop teamwork and collaboration skills.',
      'B.2 Develop desirable attitudes, good work habits and proper office decorum.',
      'B.3 Develop into students sound oral and written communication skills.',
      'B.4 Enhance conflict resolution skills.',
      'B.5 Value corporate code of ethics.',
    ],
  },
  {
    key: 'C',
    title: 'Design/Development of Solution',
    items: [
      'C.1 Design, implement and evaluate computer-based systems or programs to meet the needs and requirements of client.',
      'C.2 Recognized and apply technical standards and interoperability.',
      'C.3 Effectively integrate IT solutions into user environment.',
    ],
  },
];

const getAreaKeys = (areaCovered: string): string[] => {
  const matches = areaCovered.match(/[ABC]\.[0-9]+/g) || [];
  if (matches.length > 0) {
    return [...new Set(matches.map((item) => item.charAt(0)))];
  }

  const fallback = areaCovered.trim().match(/^([ABC])\b/);
  return fallback ? [fallback[1]] : [];
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

export default function CompetenciesPage() {
  const { user, competencies, addCompetency, deleteCompetency } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const evidenceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<{
    type: '' | 'link' | 'image' | 'video' | 'document';
    url: string;
    label: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeAreaTab, setActiveAreaTab] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [selectedAreaSection, setSelectedAreaSection] = useState<'A' | 'B' | 'C'>('A');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingCompetencyId, setDeletingCompetencyId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: '',
    areaCovered: [] as string[],
    outcome: '',
    evidenceType: '' as '' | 'link' | 'image' | 'video' | 'document',
    evidenceUrl: '',
    evidenceLabel: '',
    evidenceFile: null as File | null,
  });

  const handleAddCompetency = async () => {
    if (!user || savingEntry) return;
    if (!formData.activity || formData.areaCovered.length === 0 || !formData.outcome) {
      showToast({ kind: 'warning', title: 'Incomplete Form', message: 'Please complete activity, area covered, and outcome.' });
      return;
    }
    setSavingEntry(true);

    let evidenceUrl = formData.evidenceUrl;
    let evidenceLabel = formData.evidenceLabel;

    if (formData.evidenceType && formData.evidenceType !== 'link') {
      if (!formData.evidenceFile) {
        showToast({ kind: 'warning', title: 'Missing Evidence', message: 'Please choose a file for your selected evidence type.' });
        setSavingEntry(false);
        return;
      }

      setUploadingEvidence(true);
      try {
        evidenceUrl = await uploadEvidenceFile(formData.evidenceFile, `competencies/${user.id}`);
        evidenceLabel = formData.evidenceFile.name;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to upload evidence file.';
        showToast({ kind: 'error', title: 'Upload Failed', message });
        setSavingEntry(false);
        return;
      } finally {
        setUploadingEvidence(false);
      }
    }

    if (formData.evidenceType === 'link' && !formData.evidenceUrl) {
      showToast({ kind: 'warning', title: 'Missing Link', message: 'Please provide an evidence URL.' });
      setSavingEntry(false);
      return;
    }

    const newCompetency = {
      userId: user.id,
      date: formData.date,
      activity: formData.activity,
      areaCovered: formData.areaCovered.join(' | '),
      outcome: formData.outcome,
      evidenceType: formData.evidenceType,
      evidenceUrl,
      evidenceLabel,
    };

    try {
      await addCompetency(newCompetency);
      showToast({ kind: 'success', title: 'Competency Added', message: 'Your competency entry was saved.' });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        activity: '',
        areaCovered: [],
        outcome: '',
        evidenceType: '',
        evidenceUrl: '',
        evidenceLabel: '',
        evidenceFile: null,
      });
      setSelectedAreaSection('A');
      setShowAddModal(false);
    } catch {
      showToast({ kind: 'error', title: 'Save Failed', message: 'Could not add competency. Please try again.' });
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteCompetency = async (id: string) => {
    if (deletingCompetencyId) return;
    setDeletingCompetencyId(id);
    try {
      await deleteCompetency(id);
      showToast({ kind: 'success', title: 'Entry Deleted', message: 'Competency entry removed.' });
      setDeleteConfirm(null);
    } catch {
      showToast({ kind: 'error', title: 'Delete Failed', message: 'Could not delete competency entry. Please try again.' });
    } finally {
      setDeletingCompetencyId(null);
    }
  };

  const openEvidenceModal = (comp: typeof competencies[number]) => {
    if (!comp.evidenceUrl) return;
    setSelectedEvidence({
      type: comp.evidenceType,
      url: comp.evidenceUrl,
      label: comp.evidenceLabel || 'Evidence',
    });
    setShowEvidenceModal(true);
  };

  const filteredCompetencies = useMemo(() => {
    if (activeAreaTab === 'all') return competencies;
    return competencies.filter((c) => getAreaKeys(c.areaCovered).includes(activeAreaTab));
  }, [competencies, activeAreaTab]);

  const selectedAreaOptions = useMemo(() => {
    return AREA_SECTIONS.find((section) => section.key === selectedAreaSection)?.items || [];
  }, [selectedAreaSection]);

  if (!user) return null;

  return (
    <div>
      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, padding: 0 }}>
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
                  <Award size={18} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Add Competency</h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Activity</label>
                <input
                  className="input"
                  type="text"
                  placeholder="What activity did you perform?"
                  value={formData.activity}
                  onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Area Covered</label>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {AREA_SECTIONS.map((section) => {
                      const isActive = selectedAreaSection === section.key;
                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => setSelectedAreaSection(section.key as 'A' | 'B' | 'C')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: isActive ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.12)',
                            background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            color: isActive ? 'var(--primary-300)' : 'var(--slate-300)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {section.key}. {section.title}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)',
                      maxHeight: 220,
                      overflowY: 'auto',
                      padding: '10px',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    {selectedAreaOptions.map((item) => {
                      const checked = formData.areaCovered.includes(item);
                      const parsed = parseAreaItem(item);
                      return (
                        <label
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            cursor: 'pointer',
                            fontSize: 13,
                            color: checked ? 'var(--slate-100)' : 'var(--slate-300)',
                            border: checked ? '1px solid rgba(16,185,129,0.45)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            background: checked ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
                            padding: '10px 12px',
                            transition: 'all 140ms ease',
                            position: 'relative',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setFormData((prev) => ({
                                ...prev,
                                areaCovered: checked
                                  ? prev.areaCovered.filter((entry) => entry !== item)
                                  : [...prev.areaCovered, item],
                              }));
                            }}
                            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                          />
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              marginTop: 1,
                              borderRadius: 6,
                              border: checked ? '1px solid rgba(16,185,129,0.8)' : '1px solid rgba(148,163,184,0.5)',
                              background: checked ? 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(20,184,166,0.85))' : 'rgba(15,23,42,0.35)',
                              boxShadow: checked ? '0 4px 10px rgba(16,185,129,0.35)' : 'none',
                              color: 'white',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              flexShrink: 0,
                              transition: 'all 140ms ease',
                            }}
                          >
                            {checked ? '✓' : ''}
                          </span>
                          <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                width: 'fit-content',
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.03em',
                                border: checked ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(148,163,184,0.35)',
                                background: checked ? 'rgba(16,185,129,0.18)' : 'rgba(148,163,184,0.08)',
                                color: checked ? 'var(--primary-300)' : 'var(--slate-400)',
                              }}
                            >
                              {parsed.code}
                            </span>
                            <span style={{ lineHeight: 1.45, color: checked ? 'var(--slate-100)' : 'var(--slate-300)' }}>
                              {parsed.text || item}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                    Select one or more competency items.
                  </p>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Outcome</label>
                <textarea
                  className="input textarea"
                  placeholder="What was the outcome?"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  style={{ minHeight: 100 }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Evidence</label>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { key: '', label: 'No Evidence', icon: null },
                      { key: 'link', label: 'Link', icon: LinkIcon },
                      { key: 'image', label: 'Image', icon: ImageIcon },
                      { key: 'video', label: 'Video', icon: Video },
                      { key: 'document', label: 'PDF/Document', icon: FileText },
                    ].map((option) => {
                      const Icon = option.icon;
                      const active = formData.evidenceType === option.key;
                      return (
                        <button
                          key={option.key || 'none'}
                          type="button"
                          onClick={() =>
                            {
                              if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
                              setFormData({
                                ...formData,
                                evidenceType: option.key as '' | 'link' | 'image' | 'video' | 'document',
                                evidenceUrl: '',
                                evidenceLabel: '',
                                evidenceFile: null,
                              });
                            }
                          }
                          style={{
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: active ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.12)',
                            background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            color: active ? 'var(--primary-300)' : 'var(--slate-300)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {Icon ? <Icon size={14} /> : null}
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {formData.evidenceType === 'link' && (
                    <input
                      className="input"
                      type="url"
                      placeholder="Paste evidence link"
                      value={formData.evidenceUrl}
                      onChange={(e) => setFormData({ ...formData, evidenceUrl: e.target.value })}
                    />
                  )}

                  {formData.evidenceType && formData.evidenceType !== 'link' && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <input
                        ref={evidenceFileInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        accept={
                          formData.evidenceType === 'image'
                            ? 'image/*'
                            : formData.evidenceType === 'video'
                            ? 'video/*'
                            : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt'
                        }
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setFormData({
                            ...formData,
                            evidenceFile: file,
                            evidenceLabel: file?.name || '',
                          });
                        }}
                      />
                      <div
                        style={{
                          border: '1px solid rgba(16,185,129,0.5)',
                          borderRadius: 10,
                          minHeight: 50,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => evidenceFileInputRef.current?.click()}
                        >
                          Choose File
                        </button>
                        <span
                          style={{
                            fontSize: 14,
                            color: formData.evidenceFile ? 'var(--slate-200)' : 'var(--slate-400)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {formData.evidenceFile
                            ? formData.evidenceFile.name
                            : formData.evidenceType === 'image'
                            ? 'No image selected'
                            : formData.evidenceType === 'video'
                            ? 'No video selected'
                            : 'No document selected'}
                        </span>
                      </div>
                    </div>
                  )}
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
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddCompetency}
                disabled={
                  savingEntry ||
                  !formData.activity ||
                  formData.areaCovered.length === 0 ||
                  !formData.outcome ||
                  (formData.evidenceType === 'link' && !formData.evidenceUrl) ||
                  (!!formData.evidenceType && formData.evidenceType !== 'link' && !formData.evidenceFile)
                }
              >
                {savingEntry ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Save size={16} />} {uploadingEvidence ? 'Uploading evidence...' : savingEntry ? 'Saving entry...' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Viewer Modal */}
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
              {selectedEvidence.type === 'image' && (
                <img
                  src={selectedEvidence.url}
                  alt={selectedEvidence.label}
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, background: 'rgba(0,0,0,0.35)' }}
                />
              )}

              {selectedEvidence.type === 'video' && (
                <video
                  controls
                  style={{ width: '100%', maxHeight: '70vh', borderRadius: 12, background: 'rgba(0,0,0,0.35)' }}
                  src={selectedEvidence.url}
                />
              )}

              {selectedEvidence.type === 'document' && (
                <iframe
                  src={selectedEvidence.url}
                  title={selectedEvidence.label}
                  style={{ width: '100%', height: '70vh', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}
                />
              )}

              {selectedEvidence.type === 'link' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--slate-300)', wordBreak: 'break-all' }}>{selectedEvidence.url}</p>
                  <iframe
                    src={selectedEvidence.url}
                    title={selectedEvidence.label}
                    style={{ width: '100%', height: '58vh', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}
                  />
                </div>
              )}

              {selectedEvidence.type === '' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--slate-300)', wordBreak: 'break-all' }}>{selectedEvidence.url}</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <a href={selectedEvidence.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <ExternalLink size={16} /> Open in new tab
              </a>
              <button className="btn btn-primary" onClick={() => setShowEvidenceModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
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
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Entry?</h3>
              <p style={{ fontSize: 14, color: 'var(--slate-400)', marginBottom: 24 }}>
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  disabled={deletingCompetencyId === deleteConfirm}
                  onClick={() => handleDeleteCompetency(deleteConfirm)}
                >
                  {deletingCompetencyId === deleteConfirm ? <Loader2 size={16} className="spin-smooth btn-loading-icon" /> : <Trash2 size={16} />} {deletingCompetencyId === deleteConfirm ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            OJT Competencies
          </h1>
          <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
            Track competencies with activities, areas covered, outcomes, and evidence
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} /> Add Competency
        </button>
      </div>

      {/* Area Tabs */}
      <div className="area-tabs ui-anim-in" style={{ marginBottom: 16 }}>
        {[
          { key: 'all', label: 'All Areas' },
          { key: 'A', label: 'A. Problem Analysis' },
          { key: 'B', label: 'B. Teamwork & Communication' },
          { key: 'C', label: 'C. Design/Development' },
        ].map((tab) => (
          <button
            key={tab.key}
            className="area-tab"
            data-active={activeAreaTab === tab.key}
            onClick={() => setActiveAreaTab(tab.key as 'all' | 'A' | 'B' | 'C')}
            style={{
              minWidth: 160,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredCompetencies.length === 0 ? (
        <div className="card ui-anim-in" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: 'var(--slate-400)' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--slate-300)' }}>
            {activeAreaTab === 'all' ? 'No competencies recorded' : 'No entries for this area'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>
            Start adding competency entries to track your learning and development.
          </p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ marginTop: 16 }}>
            <Plus size={16} /> Add Competency
          </button>
        </div>
      ) : (
        <div className="card ui-anim-in" style={{ overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Area Covered</th>
                  <th>Outcome</th>
                  <th>Evidence</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetencies.map((comp) => (
                  <tr key={comp.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} style={{ color: 'var(--slate-500)' }} />
                        {format(new Date(comp.date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td>{comp.activity}</td>
                    <td>
                      {splitAreaCovered(comp.areaCovered).join(', ')}
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
                        {comp.outcome}
                      </p>
                    </td>
                    <td>
                      {comp.evidenceUrl ? (
                        <button
                          type="button"
                          onClick={() => openEvidenceModal(comp)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--primary-400)',
                            textDecoration: 'none',
                            fontSize: 13,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <Eye size={14} />
                          {comp.evidenceType && comp.evidenceType !== 'link'
                            ? comp.evidenceLabel || 'View evidence'
                            : 'View link'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          disabled={!!deletingCompetencyId}
                          onClick={() => setDeleteConfirm(comp.id)}
                          title="Delete"
                          style={{ color: 'var(--rose-400)' }}
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
