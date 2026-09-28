"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <section className="error-state" role="alert">
      <span className="section-icon" aria-hidden="true">
        <AlertTriangle size={18} strokeWidth={1.7} />
      </span>
      <div>
        <h2>Could not load this workspace</h2>
        <p>The connection may have been interrupted. Your project data was not changed.</p>
      </div>
      <button className="secondary-button" type="button" onClick={reset}>
        <RotateCcw size={14} strokeWidth={1.7} />
        Try again
      </button>
    </section>
  );
}
