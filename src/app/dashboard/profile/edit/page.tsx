"use client"
import React, { useState, useEffect } from 'react';
import { uploadProfileImage } from '@/lib/intern';
import { useApp } from '@/lib/context';

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
