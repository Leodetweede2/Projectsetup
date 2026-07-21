import { requireUser } from "@/lib/auth/guards";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileForm } from "../profile/ProfileForm";
import { ChangePasswordForm } from "../settings/ChangePasswordForm";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardBody>
          <ProfileForm name={user.name} email={user.email} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
