import { cn } from "@/lib/cn";

/**
 * The official Amphia wordmark (extracted from the brand guide). Shows the
 * colour logo on light backgrounds and the white version in dark mode, per the
 * brand guidelines. `className` controls the height (width stays proportional).
 */
export function AmphiaLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/amphia-logo.png"
        alt="Amphia"
        className="block h-full w-auto dark:hidden"
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/amphia-logo-white.png"
        alt="Amphia"
        className="hidden h-full w-auto dark:block"
        draggable={false}
      />
    </span>
  );
}
