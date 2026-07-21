import Link from "next/link";
import { verifyEmailByToken } from "@/lib/auth/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

// Verification mutates data based on the link token, so never cache this page.
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await verifyEmailByToken(token)
    : { ok: false, message: "This verification link is missing its token." };

  return (
    <Card>
      <CardBody className="space-y-4">
        <Alert tone={result.ok ? "success" : "error"}>{result.message}</Alert>
        <p className="text-center text-sm text-ink-faint">
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Continue to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
