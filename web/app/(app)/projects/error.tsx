"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ProjectsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="standalone-error" id="main-content">
      <ErrorState reset={reset} />
    </main>
  );
}
