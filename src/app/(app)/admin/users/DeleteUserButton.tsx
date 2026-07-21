"use client";

import { deleteUserAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/Button";

export function DeleteUserButton({
  userId,
  email,
  disabled,
}: {
  userId: string;
  email: string;
  disabled?: boolean;
}) {
  return (
    <form
      action={deleteUserAction}
      onSubmit={(e) => {
        if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        variant="danger"
        size="sm"
        disabled={disabled}
        title={disabled ? "You cannot delete your own account" : undefined}
      >
        Delete
      </Button>
    </form>
  );
}
