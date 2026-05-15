"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/context';
import { Save, User, GraduationCap, Building2, Mail, Phone, MapPin, ShieldCheck, Clock3 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { uploadProfileImage } from '@/lib/intern';

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
  const [department, setDepartment] = useState('');
  const [hoursToRender, setHoursToRender] = useState(480);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.name || '');
      setAddress(user.address || '');
      setPhoneNumber(user.phoneNumber || user.contact || '');
      setGuardianEmail(user.guardianEmail || user.guardian?.email || '');
      setGuardianPhone(user.guardianPhone || user.guardian?.phone || '');
      setProgramCourse(user.course || '');
      setDepartment(user.department || '');
      setHoursToRender(user.totalRequiredHours || 480);
    }
  }, [user]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.profileImage]);

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
        department,
        totalRequiredHours: Number(hoursToRender) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showToast({ kind: 'error', title: 'Invalid File', message: 'Please select an image file.' });
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({ kind: 'error', title: 'Image Too Large', message: 'Please use an image smaller than 5MB.' });
      event.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      const imageUrl = await uploadProfileImage(file, `profiles/${user.id}`);
      await updateUser({ profileImage: imageUrl });
      setAvatarLoadError(false);
      showToast({ kind: 'success', title: 'Profile Updated', message: 'Your profile picture has been updated.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload profile picture.';
      showToast({ kind: 'error', title: 'Upload Failed', message });
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  return (
    <div>
      {!compact && (
        <div className="dash-header" style={{ marginBottom: 24 }}>
          <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{title}</h1>
          <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>{description}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.15fr 0.85fr', gap: 24, alignItems: 'start' }}>
        <div className="card" style={{ padding: compact ? 18 : 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {user.profileImage && !avatarLoadError ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  style={{ width: 54, height: 54, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg, #34d399, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: 'white', flexShrink: 0 }}>
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                <p style={{ fontSize: 12, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
              </div>
            </div>
            <div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary"
                type="button"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: compact ? 12 : 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
              <User size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{compact ? 'Quick Profile Edit' : 'Student Information'}</h3>
          </div>

          {compact ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <User size={16} /> Full Name
                  </label>
                  <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Phone size={16} /> Phone Number
                  </label>
                  <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <MapPin size={16} /> Home Address
                  </label>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Mail size={16} /> Guardian Email
                  </label>
                  <input className="input" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <ShieldCheck size={16} /> Guardian Phone
                  </label>
                  <input className="input" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <GraduationCap size={16} /> Program or Course
                  </label>
                  <input className="input" value={programCourse} onChange={(e) => setProgramCourse(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Building2 size={16} /> Department
                  </label>
                  <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Clock3 size={16} /> Required OJT Hours
                  </label>
                  <input className="input" type="number" min={1} max={5000} value={hoursToRender} onChange={(e) => setHoursToRender(Number(e.target.value))} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <User size={16} /> Full Name
                    </label>
                    <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <MapPin size={16} /> Home Address
                    </label>
                    <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Mail size={16} /> Email Address
                    </label>
                    <input className="input" value={user.email} readOnly aria-readonly="true" />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Phone size={16} /> Phone Number
                    </label>
                    <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guardian</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <ShieldCheck size={16} /> Guardian Email
                    </label>
                    <input className="input" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <ShieldCheck size={16} /> Guardian Phone Number
                    </label>
                    <input className="input" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <GraduationCap size={16} /> Program or Course
                    </label>
                    <input className="input" value={programCourse} onChange={(e) => setProgramCourse(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Building2 size={16} /> Department
                    </label>
                    <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OJT Requirement</h4>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Clock3 size={16} /> Required OJT Hours
                  </label>
                  <input className="input" type="number" min={1} max={5000} value={hoursToRender} onChange={(e) => setHoursToRender(Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: compact ? 12 : 4 }}>
            <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
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
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Full Name</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{fullName || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Home Address</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{address || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Mail size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Contact Information</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{user.email}</p>
                  <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{phoneNumber || 'No phone number yet.'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <ShieldCheck size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Guardian Contact</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{guardianEmail || '—'}</p>
                  <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{guardianPhone || 'No guardian phone yet.'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <GraduationCap size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Program or Course</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{programCourse || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Building2 size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Department</p>
                  <p style={{ fontSize: 14, color: 'white' }}>{department || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Clock3 size={18} style={{ color: 'var(--slate-500)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Required OJT Hours</p>
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


