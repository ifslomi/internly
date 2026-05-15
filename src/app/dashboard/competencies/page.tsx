"use client";
import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { Award, Plus, Calendar, Trash2, AlertTriangle, X, Save, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

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

const getAreaKey = (areaCovered: string) => {
  const match = areaCovered.trim().match(/^([ABC])\b/);
  return match ? match[1] : '';
};

export default function CompetenciesPage() {
  const { user, competencies, addCompetency, deleteCompetency } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeAreaTab, setActiveAreaTab] = useState<'all' | 'A' | 'B' | 'C'>('all');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: '',
    areaCovered: '',
    outcome: '',
    evidenceType: '' as '' | 'link' | 'image' | 'video' | 'document',
    evidenceUrl: '',
    evidenceLabel: '',
    evidenceFile: null as File | null,
  });

  const handleAddCompetency = async () => {
    if (!user) return;
    if (!formData.activity || !formData.areaCovered || !formData.outcome) return;

    let evidenceUrl = formData.evidenceUrl;
    let evidenceLabel = formData.evidenceLabel;

    if (formData.evidenceType && formData.evidenceType !== 'link') {
      if (!formData.evidenceFile) return;
      evidenceUrl = URL.createObjectURL(formData.evidenceFile);
      evidenceLabel = formData.evidenceFile.name;
    }

    if (formData.evidenceType === 'link' && !formData.evidenceUrl) return;

    const newCompetency = {
      userId: user.id,
      date: formData.date,
      activity: formData.activity,
      areaCovered: formData.areaCovered,
      outcome: formData.outcome,
      evidenceType: formData.evidenceType,
      evidenceUrl,
      evidenceLabel,
    };

    await addCompetency(newCompetency);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      activity: '',
      areaCovered: '',
      outcome: '',
      evidenceType: '',
      evidenceUrl: '',
      evidenceLabel: '',
      evidenceFile: null,
    });
    setShowAddModal(false);
  };

  const handleDeleteCompetency = async (id: string) => {
    const found = competencies.find((c) => c.id === id);
    if (found?.evidenceUrl && found.evidenceUrl.startsWith('blob:')) {
      URL.revokeObjectURL(found.evidenceUrl);
    }
    await deleteCompetency(id);
    setDeleteConfirm(null);
  };

  const filteredCompetencies = useMemo(() => {
    if (activeAreaTab === 'all') return competencies;
    return competencies.filter((c) => getAreaKey(c.areaCovered) === activeAreaTab);
  }, [competencies, activeAreaTab]);

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
                <select
                  className="input"
                  value={formData.areaCovered}
                  onChange={(e) => setFormData({ ...formData, areaCovered: e.target.value })}
                >
                  <option value="">Select area covered</option>
                  {AREA_SECTIONS.map((section) => (
                    <optgroup key={section.key} label={`${section.key}. ${section.title}`}>
                      {section.items.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
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
                  <select
                    className="input"
                    value={formData.evidenceType}
                    onChange={(e) => {
                      const nextType = e.target.value as '' | 'link' | 'image' | 'video' | 'document';
                      setFormData({
                        ...formData,
                        evidenceType: nextType,
                        evidenceUrl: '',
                        evidenceLabel: '',
                        evidenceFile: null,
                      });
                    }}
                  >
                    <option value="">No evidence</option>
                    <option value="link">Link</option>
                    <option value="image">Image upload</option>
                    <option value="video">Video upload</option>
                    <option value="document">Document upload</option>
                  </select>

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
                    <input
                      className="input"
                      type="file"
                      accept={
                        formData.evidenceType === 'image'
                          ? 'image/*'
                          : formData.evidenceType === 'video'
                          ? 'video/*'
                          : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'
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
                  !formData.activity ||
                  !formData.areaCovered ||
                  !formData.outcome ||
                  (formData.evidenceType === 'link' && !formData.evidenceUrl) ||
                  (formData.evidenceType && formData.evidenceType !== 'link' && !formData.evidenceFile)
                }
              >
                <Save size={16} /> Add Entry
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
                  onClick={() => handleDeleteCompetency(deleteConfirm)}
                >
                  <Trash2 size={16} /> Delete
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
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          padding: 6,
          borderRadius: 999,
          background: 'rgba(9,9,11,0.72)',
          border: '1px solid rgba(255,255,255,0.06)',
          width: '100%',
          flexWrap: 'wrap',
        }}
      >
        {[
          { key: 'all', label: 'All Areas' },
          { key: 'A', label: 'A. Problem Analysis' },
          { key: 'B', label: 'B. Teamwork & Communication' },
          { key: 'C', label: 'C. Design/Development' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveAreaTab(tab.key as 'all' | 'A' | 'B' | 'C')}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background:
                activeAreaTab === tab.key
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))'
                  : 'transparent',
              color: activeAreaTab === tab.key ? 'white' : 'var(--slate-400)',
              fontSize: 13,
              fontWeight: 700,
              border:
                activeAreaTab === tab.key
                  ? '1px solid rgba(16,185,129,0.45)'
                  : '1px solid transparent',
              boxShadow:
                activeAreaTab === tab.key ? '0 8px 20px rgba(16,185,129,0.2)' : 'none',
              cursor: 'pointer',
              transition: 'all 200ms',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 8,
              minWidth: 160,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredCompetencies.length === 0 ? (
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: 'var(--slate-400)' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--slate-300)' }}>
            {activeAreaTab === 'all' ? 'No competencies recorded' : 'No entries for this area'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>
            Start adding competency entries to track your learning and development.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Area Covered</th>
                  <th>Outcome</th>
                  <th>Evidence Link</th>
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
                      {(comp.areaCovered.match(/[A-C]\.[0-9]+/i) || [comp.areaCovered])[0]}
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
                        <a
                          href={comp.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--primary-400)',
                            textDecoration: 'none',
                            fontSize: 13,
                          }}
                        >
                          <LinkIcon size={14} />
                          {comp.evidenceType && comp.evidenceType !== 'link'
                            ? comp.evidenceLabel || 'Open file'
                            : 'View'}
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
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
