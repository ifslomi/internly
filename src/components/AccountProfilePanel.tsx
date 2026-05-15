"use client";
import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { Save, User, GraduationCap, Mail, Phone, MapPin, ShieldCheck, Clock3, PencilLine, X } from 'lucide-react';

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
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [programCourse, setProgramCourse] = useState('');
  const [hoursToRender, setHoursToRender] = useState(480);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.name || '');
      setAddress(user.address || '');
      setPhoneNumber(user.phoneNumber || user.contact || '');
      setGuardianEmail(user.guardianEmail || user.guardian?.email || '');
      setGuardianPhone(user.guardianPhone || user.guardian?.phone || '');
      setProgramCourse(user.course || '');
      setHoursToRender(user.totalRequiredHours || 480);
    }
  }, [user]);

  if (!user) {
    return <div className="card" style={{ padding: 24 }}>Please log in to view your account.</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({
        name: fullName,
        fullName,
        address,
        phoneNumber,
        contact: phoneNumber,
        guardianEmail,
        guardianPhone,
        guardian: {
          email: guardianEmail,
          phone: guardianPhone,
        },
        course: programCourse,
        totalRequiredHours: Number(hoursToRender) || 0,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const resetFormToUser = () => {
    setFullName(user.fullName || user.name || '');
    setAddress(user.address || '');
    setPhoneNumber(user.phoneNumber || user.contact || '');
    setGuardianEmail(user.guardianEmail || user.guardian?.email || '');
    setGuardianPhone(user.guardianPhone || user.guardian?.phone || '');
    setProgramCourse(user.course || '');
    setHoursToRender(user.totalRequiredHours || 480);
  };

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{title}</h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>{description}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.15fr 0.85fr', gap: 24, alignItems: 'start' }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
              <User size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Student Information</h3>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <User size={16} /> Full name
              </label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} readOnly={!isEditing} aria-readonly={!isEditing} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MapPin size={16} /> Address
              </label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} readOnly={!isEditing} aria-readonly={!isEditing} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Mail size={16} /> Contact info: email
              </label>
              <input className="input" value={user.email} readOnly aria-readonly="true" />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Phone size={16} /> Contact info: phone number
              </label>
              <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} readOnly={!isEditing} aria-readonly={!isEditing} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={16} /> Guardian: email
              </label>
              <input className="input" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} readOnly={!isEditing} aria-readonly={!isEditing} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={16} /> Guardian: phone number
              </label>
              <input className="input" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} readOnly={!isEditing} aria-readonly={!isEditing} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GraduationCap size={16} /> Program/Course
              </label>
              <input className="input" value={programCourse} onChange={(e) => setProgramCourse(e.target.value)} readOnly={!isEditing} aria-readonly={!isEditing} />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Clock3 size={16} /> Hours of duty to render
              </label>
              <input className="input" type="number" min={1} max={5000} value={hoursToRender} onChange={(e) => setHoursToRender(Number(e.target.value))} readOnly={!isEditing} aria-readonly={!isEditing} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              {!isEditing ? (
                <button className="btn btn-primary" type="button" onClick={() => setIsEditing(true)}>
                  <PencilLine size={16} /> Edit
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      resetFormToUser();
                      setIsEditing(false);
                    }}
                    disabled={saving}
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {!compact && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                <User size={18} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Student Snapshot</h3>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <User size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Full name</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{fullName || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Address</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{address || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Mail size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Contact info</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{user.email}</p>
                  <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{phoneNumber || 'No phone number yet.'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <ShieldCheck size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Guardian</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{guardianEmail || '—'}</p>
                  <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{guardianPhone || 'No guardian phone yet.'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <GraduationCap size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Program/Course</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{programCourse || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Clock3 size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Hours of duty to render</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{hoursToRender || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}