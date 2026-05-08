"use client"
import Link from "next/link";
import React from "react";
import { useApp } from '@/lib/context';

export default function ProfilePage() {
  const { user } = useApp();

  if (!user) {
    return (
      <div className="p-6">Please log in to view your profile.</div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">OJT Profile</h1>
      <div className="flex items-center gap-4 mb-6">
        {user.profileImage ? (
          <img src={user.profileImage} alt={user.fullName || user.name} className="w-24 h-24 rounded" />
        ) : (
          <div className="w-24 h-24 rounded bg-emerald-200 flex items-center justify-center font-bold">{(user.name || '').charAt(0).toUpperCase()}</div>
        )}
        <div>
          <p className="text-lg font-semibold">{user.fullName || user.name}</p>
          <p className="text-sm text-slate-400">{user.email}</p>
          <p className="text-sm mt-2">Course: {user.course || '—'}</p>
        </div>
      </div>

      <p className="mb-4">Company: {user.company?.name || '—'}</p>
      <p className="mb-6">Contact: {user.contact || '—'}</p>

      <div className="space-y-4">
        <Link href="/dashboard/profile/edit" className="px-3 py-2 bg-emerald-600 text-white rounded inline-block">Edit profile</Link>
      </div>
    </div>
  );
}
