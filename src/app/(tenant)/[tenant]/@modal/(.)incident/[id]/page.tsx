import { IncidentModal } from "@/components/modals/IncidentModal";
import { getIncident, getAssets, getTenantByName } from "@/actions";
import { getUsers } from "@/actions/users";
import { Modal } from "@/components/modals/default";
import { notFound } from "next/navigation";

interface IncidentModalPageProps {
  params: { id: string; tenant: string };
}

export default async function IncidentModalPage({ params }: IncidentModalPageProps) {
  const { id, tenant: subdomain } = await params;
  const data = await getTenantByName(subdomain);
  if (!data) notFound();

  const incident = await getIncident(id) || undefined;
  const assets = await getAssets({ tenantId: data.id });
  const users = await getUsers({ tenantId: data.id });

  return (
    <Modal>
      <IncidentModal
        incident={incident}
        tenantId={data.id}
        assets={assets.assets}
        users={users.users}
      />
    </Modal>
  );
}