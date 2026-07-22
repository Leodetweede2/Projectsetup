import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-4 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="text-xl font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-ink-muted">
        The page you are looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
