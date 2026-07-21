"use client";

import { useActionState } from "react";
import { updateUserAction } from "@/lib/admin/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/Alert";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

interface Props {
  user: { id: string; name: string; email: string };
  roles: { id: string; name: string }[];
  assignedRoleIds: string[];
}

export function EditUserForm({ user, roles, assignedRoleIds }: Props) {
  const [state, formAction] = useActionState(updateUserAction, initial);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="e-name">Full name</Label>
          <Input id="e-name" name="name" defaultValue={user.name} required />
          <FieldError>{state.fieldErrors?.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="e-email">Email</Label>
          <Input id="e-email" name="email" type="email" defaultValue={user.email} required />
          <FieldError>{state.fieldErrors?.email}</FieldError>
        </div>
      </div>
      <div>
        <Label>Roles</Label>
        <div className="flex flex-wrap gap-3">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                name="roleIds"
                value={role.id}
                defaultChecked={assignedRoleIds.includes(role.id)}
                className="h-4 w-4"
              />
              {role.name}
            </label>
          ))}
        </div>
      </div>
      <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
    </form>
  );
}
