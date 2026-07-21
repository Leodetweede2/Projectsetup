"use client";

import { useActionState } from "react";
import { createUserAction } from "@/lib/admin/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

export function CreateUserForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState(createUserAction, initial);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="c-name">Full name</Label>
          <Input id="c-name" name="name" required />
          <FieldError>{state.fieldErrors?.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" name="email" type="email" required />
          <FieldError>{state.fieldErrors?.email}</FieldError>
        </div>
      </div>
      <div>
        <Label htmlFor="c-password">Temporary password</Label>
        <Input id="c-password" name="password" type="password" required />
        <FieldError>{state.fieldErrors?.password}</FieldError>
      </div>
      <div>
        <Label>Roles</Label>
        <div className="flex flex-wrap gap-3">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="roleIds" value={role.id} className="h-4 w-4" />
              {role.name}
            </label>
          ))}
        </div>
      </div>
      <SubmitButton pendingText="Creating…">Create user</SubmitButton>
    </form>
  );
}
