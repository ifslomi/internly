"use client"
import React from "react";

export default function SanctionsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">OJT Sanctions</h1>
      <p className="mb-4">View your sanctioned days, schedule, and sign up for available sanction slots.</p>
      <div className="space-y-2">
        <div className="p-3 border rounded">No scheduled sanctions found.</div>
      </div>
    </div>
  );
}
