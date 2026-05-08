"use client";
import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { Award, Plus, Calendar, Edit3, Trash2, AlertTriangle, X, Check, Save, Link as LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Competency {
  id: string;
  date: string;
  activity: string;
  areaCovered: string;
  outcome: string;
  evidenceLink: string;
}

export default function CompetenciesPage() {
  const { user } = useApp();
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: '',
    areaCovered: '',
    outcome: '',
    evidenceLink: '',
  });

  const handleAddCompetency = () => {
    if (!formData.activity || !formData.areaCovered || !formData.outcome) return;

    const newCompetency: Competency = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
    };

    setCompetencies([newCompetency, ...competencies]);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      activity: '',
      areaCovered: '',
      outcome: '',
      evidenceLink: '',
    });
    setShowAddModal(false);
  };

  const handleDeleteCompetency = (id: string) => {
    setCompetencies(competencies.filter((c) => c.id !== id));
    setDeleteConfirm(null);
  };

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
                <input
                  className="input"
                  type="text"
                  placeholder="What area of competency was covered?"
                  value={formData.areaCovered}
                  onChange={(e) => setFormData({ ...formData, areaCovered: e.target.value })}
                />
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
                <label className="input-label">Evidence Link</label>
                <input
                  className="input"
                  type="url"
                  placeholder="Link to evidence (image, video, document, etc.)"
                  value={formData.evidenceLink}
                  onChange={(e) => setFormData({ ...formData, evidenceLink: e.target.value })}
                />
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
                disabled={!formData.activity || !formData.areaCovered || !formData.outcome}
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

      {/* Table */}
      {competencies.length === 0 ? (
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: 'var(--slate-400)' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--slate-300)' }}>
            No competencies recorded
          </h3>
          <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>
            Start adding competency entries to track your learning and development.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
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
                {competencies.map((comp) => (
                  <tr key={comp.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} style={{ color: 'var(--slate-500)' }} />
                        {format(new Date(comp.date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td>{comp.activity}</td>
                    <td>{comp.areaCovered}</td>
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
                      {comp.evidenceLink ? (
                        <a
                          href={comp.evidenceLink}
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
                          <LinkIcon size={14} /> View
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
