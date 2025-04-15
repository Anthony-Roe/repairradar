import { UserModal } from "@/components/modals/UserModal";
import { getUser, getTenantByName } from "@/actions";
import { notFound } from "next/navigation";

interface UserModalPageProps {
  params: { id: string; tenant: string };
}

export default async function UserModalPage({ params }: UserModalPageProps) {
  const { id, tenant: subdomain } = await params;
  const data = await getTenantByName(subdomain);
  if (!data) notFound();

  const user = await getUser(id) || undefined;

  return <UserModal user={user} tenantId={data.id} />;
}