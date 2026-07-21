"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/lib/auth/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initial);

  return (
    <Card>
      <CardBody className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success ? (
          <Alert tone="success">{state.success}</Alert>
        ) : (
          <form action={formAction} className="space-y-4" noValidate>
            <input type="hidden" name="token" value={token} />
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              <FieldError>{state.fieldErrors?.password}</FieldError>
            </div>
            <SubmitButton className="w-full" pendingText="Saving…">
              Set new password
            </SubmitButton>
          </form>
        )}
        <p className="text-center text-sm text-ink-faint">
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
