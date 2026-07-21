"use client";

import { useActionState } from "react";
import { updateRolePermissionsAction } from "@/lib/admin/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: ActionState = {};

interface PermItem {
  key: string;
  label: string;
  group: string;
  description: string;
}

interface Props {
  role: { id: string; name: string; isSystem: boolean };
  permissions: PermItem[];
  granted: string[];
  canWrite: boolean;
}

export function RolePermissionsForm({ role, permissions, granted, canWrite }: Props) {
  const [state, formAction] = useActionState(updateRolePermissionsAction, initial);

  const groups = Array.from(new Set(permissions.map((p) => p.group)));

  return (
    <form action={formAction} className="space-y-4">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="roleId" value={role.id} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {group}
            </p>
            <div className="space-y-2">
              {permissions
                .filter((p) => p.group === group)
                .map((p) => (
                  <label
                    key={p.key}
                    className="flex items-start gap-2 text-sm text-ink-muted"
                    title={p.description}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p.key}
                      defaultChecked={granted.includes(p.key)}
                      disabled={!canWrite}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
      {canWrite && <SubmitButton pendingText="Saving…">Save permissions</SubmitButton>}
    </form>
  );
}
