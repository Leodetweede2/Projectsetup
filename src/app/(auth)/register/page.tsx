"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type ActionState } from "@/lib/auth/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, initial);

  return (
    <Card>
      <CardBody className="space-y-4">
        {state.success && <Alert tone="success">{state.success}</Alert>}
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {!state.success && (
          <form action={formAction} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" autoComplete="name" required />
              <FieldError>{state.fieldErrors?.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              <FieldError>{state.fieldErrors?.email}</FieldError>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              <FieldError>{state.fieldErrors?.password}</FieldError>
            </div>
            <SubmitButton className="w-full" pendingText="Creating account…">
              Create account
            </SubmitButton>
          </form>
        )}
        <p className="text-center text-sm text-ink-faint">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
