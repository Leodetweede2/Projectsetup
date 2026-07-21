import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-bold text-ink">App Template</h1>
          <p className="mt-1 text-sm text-ink-faint">Sign in to your account</p>
        </div>
        {children}
      </div>
    </div>
  );
}
