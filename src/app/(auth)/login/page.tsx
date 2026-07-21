"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/lib/auth/actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <Card>
      <CardBody className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <form action={formAction} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            <FieldError>{state.fieldErrors?.email}</FieldError>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldError>{state.fieldErrors?.password}</FieldError>
          </div>
          <SubmitButton className="w-full" pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <p className="text-center text-sm text-ink-faint">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
