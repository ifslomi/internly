"use client";
import React from "react";
import { Award, Link2, Video, Image as ImageIcon, Plus } from 'lucide-react';

export default function CompetenciesPage() {
  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>OJT Competencies</h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Manage competency entries and attach evidence like images, videos, or links.</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
            <Award size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Competency Tracking</h3>
            <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Use this area to record your learning outcomes and proof.</p>
          </div>
          <button className="btn btn-primary btn-sm"><Plus size={16} /> Add Competency</button>
        </div>

        <div style={{ borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)', padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            {[
              { icon: ImageIcon, label: 'Image Upload' },
              { icon: Video, label: 'Video Upload' },
              { icon: Link2, label: 'Link Upload' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="card" style={{ padding: 18, textAlign: 'center' }}>
                <Icon size={22} style={{ color: 'var(--primary-400)', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
