"use client";

import { Button } from "@/components/ui/Button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <p className="text-5xl font-bold text-brand-600">Oops</p>
      <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        An unexpected error occurred. You can try again, or head back and retry.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
