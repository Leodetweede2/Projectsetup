"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/ui/Toast";
import { changePasswordAction } from "@/lib/user/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initial);
  useActionToast(state);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError>{state.fieldErrors?.currentPassword}</FieldError>
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError>{state.fieldErrors?.newPassword}</FieldError>
      </div>
      <SubmitButton pendingText="Saving…">Change password</SubmitButton>
    </form>
  );
}
