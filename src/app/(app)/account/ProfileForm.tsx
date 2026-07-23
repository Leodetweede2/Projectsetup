"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/ui/Toast";
import { updateProfileAction } from "@/lib/user/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction] = useActionState(updateProfileAction, initial);
  useActionToast(state);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={name} required />
        <FieldError>{state.fieldErrors?.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={email} required />
        <FieldError>{state.fieldErrors?.email}</FieldError>
      </div>
      <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
    </form>
  );
}
