import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <p className="text-5xl font-bold text-ink-faint">403</p>
      <h1 className="text-xl font-semibold text-ink">Access denied</h1>
      <p className="max-w-sm text-sm text-ink-faint">
        You don&apos;t have permission to view this page. If you think this is a mistake,
        contact an administrator.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
