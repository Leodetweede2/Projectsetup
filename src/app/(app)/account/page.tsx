import { requireUser } from "@/lib/auth/guards";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconAccount } from "@/components/icons";
import { ProfileForm } from "../profile/ProfileForm";
import { ChangePasswordForm } from "../settings/ChangePasswordForm";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="Account"
        icon={<IconAccount />}
        description="Update your details and password."
      />

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
