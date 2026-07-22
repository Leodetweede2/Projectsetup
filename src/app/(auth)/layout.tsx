import { ThemeToggle } from "@/components/ThemeToggle";
import { AmphiaLogo } from "@/components/AmphiaLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <AmphiaLogo className="mx-auto mb-4 h-10" />
          <p className="mt-1 text-sm text-ink-faint">Sign in to your account</p>
        </div>
        {children}
      </div>
    </div>
  );
}
