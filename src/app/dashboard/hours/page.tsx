"use client"
import React from "react";

export default function HoursPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">OJT Hours</h1>
      <p className="mb-4">Summary tiles and a log of rendered hours will appear here.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">Hours to render: <strong>--</strong></div>
        <div className="p-4 border rounded">Rendered this week: <strong>--</strong></div>
        <div className="p-4 border rounded">Total remaining: <strong>--</strong></div>
      </div>
    </div>
  );
}
