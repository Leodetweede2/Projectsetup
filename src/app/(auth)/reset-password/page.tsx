import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <Alert tone="error">This password reset link is missing its token.</Alert>
          <p className="text-center text-sm text-ink-faint">
            <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
              Request a new link
            </Link>
          </p>
        </CardBody>
      </Card>
    );
  }

  return <ResetPasswordForm token={token} />;
}
