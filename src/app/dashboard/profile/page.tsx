"use client";
import Link from "next/link";
import React from "react";
import { useApp } from '@/lib/context';
import { Building2, Edit3, GraduationCap, Mail, Phone, User, ImageIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useApp();

  if (!user) {
    return <div className="card" style={{ padding: 24 }}>Please log in to view your profile.</div>;
  }

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
          OJT Profile
        </h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
          Keep your intern details, company info, and profile image updated.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 24, alignItems: 'start' }}>
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
            <Link href="/dashboard/profile/edit" className="btn btn-primary btn-sm">
              <Edit3 size={16} /> Edit profile
            </Link>
          </div>
        </div>

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
      </div>
    </div>
  );
}
