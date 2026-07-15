export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-bold text-slate-900">App Template</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>
        {children}
      </div>
    </div>
  );
}
