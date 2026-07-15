"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type ActionState } from "@/lib/auth/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPasswordAction, initial);

  return (
    <Card>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-600">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
        {state.success && <Alert tone="success">{state.success}</Alert>}
        {!state.success && (
          <form action={formAction} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              <FieldError>{state.fieldErrors?.email}</FieldError>
            </div>
            <SubmitButton className="w-full" pendingText="Sending…">
              Send reset link
            </SubmitButton>
          </form>
        )}
        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
