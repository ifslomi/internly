"use client";
import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { uploadProfileImage } from '@/lib/intern';
import { Building2, Save, Upload, User, GraduationCap, Mail, Phone, ImageIcon } from 'lucide-react';

type AccountProfilePanelProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export default function AccountProfilePanel({
  title = 'Account',
  description = 'Manage your account and profile details',
  compact = false,
}: AccountProfilePanelProps) {
  const { user, updateUser } = useApp();
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.fullName || user.name || '');
      setCourse(user.course || '');
    }
  }, [user]);

  if (!user) {
    return <div className="card" style={{ padding: 24 }}>Please log in to view your account.</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      let photoUrl = user.profileImage;
      if (file) photoUrl = await uploadProfileImage(file);
      await updateUser({ fullName: name, course, profileImage: photoUrl });
      setFile(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{title}</h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>{description}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.15fr 0.85fr', gap: 24, alignItems: 'start' }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.fullName || user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={34} style={{ color: 'var(--primary-300)' }} />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
                {user.fullName || user.name}
              </p>
              <p style={{ fontSize: 14, color: 'var(--slate-400)', marginTop: 6 }}>
                {user.email}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                <span className="badge badge-success"><GraduationCap size={12} /> {user.course || 'Course not set'}</span>
                <span className="badge badge-primary"><Building2 size={12} /> {user.company?.name || 'No company yet'}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, display: 'grid', gap: 16 }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <User size={16} /> Full name
              </label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GraduationCap size={16} /> Course
              </label>
              <input className="input" value={course} onChange={(e) => setCourse(e.target.value)} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Upload size={16} /> Profile image
              </label>
              <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ paddingTop: 10, paddingBottom: 10 }} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" type="button" onClick={() => { setName(user.fullName || user.name || ''); setCourse(user.course || ''); setFile(null); }}>
                Reset
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                <ImageIcon size={18} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Profile Details</h3>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Mail size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>OJT Contact Email</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{user.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Phone size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>OJT Contact Info</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{user.contact || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Building2 size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Company Details</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{user.company?.name || '—'}</p>
                  <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{user.company?.details || 'No company details added yet.'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}