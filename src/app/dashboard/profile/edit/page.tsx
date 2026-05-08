"use client"
import React, { useState } from 'react';
import { uploadProfileImage, createOrUpdateInternProfile } from '@/lib/intern';

export default function EditProfilePage() {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      let photoUrl;
      if (file) photoUrl = await uploadProfileImage(file);
      // NOTE: replace 'me' with real internId from auth context
      await createOrUpdateInternProfile('me', { fullName: name, course, photoUrl });
      alert('Profile saved (placeholder)');
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Edit Profile</h1>
      <label className="block mb-2">Full name</label>
      <input className="w-full p-2 mb-4 border rounded" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="block mb-2">Course</label>
      <input className="w-full p-2 mb-4 border rounded" value={course} onChange={(e) => setCourse(e.target.value)} />
      <label className="block mb-2">Profile Image</label>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="mt-4">
        <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}
