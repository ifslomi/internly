"use client"
import Link from "next/link";
import React from "react";

export default function ProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">OJT Profile</h1>
      <p className="mb-4">Manage your profile, company details, and upload a profile image.</p>
      <div className="space-y-4">
        <Link href="/dashboard/profile/edit" className="text-emerald-600 underline">Edit profile</Link>
      </div>
    </div>
  );
}
