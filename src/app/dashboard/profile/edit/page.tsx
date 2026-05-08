"use client";
import React, { useState, useEffect } from 'react';
import { uploadProfileImage } from '@/lib/intern';
import { useApp } from '@/lib/context';
import { Building2, Save, Upload, User, GraduationCap } from 'lucide-react';

export default function EditProfilePage() {
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

  async function handleSave() {
    if (!user) return alert('Not signed in');
    setSaving(true);
    try {
      let photoUrl = user.profileImage;
      if (file) photoUrl = await uploadProfileImage(file);
      await updateUser({ fullName: name, course, profileImage: photoUrl });
      alert('Profile saved');
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Edit Profile</h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Update your OJT profile, course, company, and profile image.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr', gap: 24, alignItems: 'start' }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gap: 18 }}>
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
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ paddingTop: 10, paddingBottom: 10 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" type="button" onClick={() => { setName(user?.fullName || user?.name || ''); setCourse(user?.course || ''); setFile(null); }}>
                Reset
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
              <Building2 size={20} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Current Profile Preview</h3>
          </div>

          <div style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {file ? (
                  <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : user?.profileImage ? (
                  <img src={user.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={24} style={{ color: 'var(--primary-300)' }} />
                )}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{name || user?.fullName || user?.name || 'Your name'}</p>
                <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>{course || user?.course || 'Course not set'}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>
              Make sure your OJT profile is accurate so your dean and internship coordinator can track your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
