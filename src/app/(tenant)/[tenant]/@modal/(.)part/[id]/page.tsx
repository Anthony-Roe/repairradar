import { PartModal } from "@/components/modals/PartModal";
import { getPart, getTenantByName } from "@/actions";
import { Modal } from "@/components/modals/default";
import { notFound } from "next/navigation";

interface PartModalPageProps {
  params: { id: string; tenant: string };
}

export default async function PartModalPage({ params }: PartModalPageProps) {
  const { id, tenant: subdomain } = await params;
  const data = await getTenantByName(subdomain);
  if (!data) notFound();

  const part = await getPart(id) || undefined;

  return (
    <Modal>
      <PartModal part={part} tenantId={data.id} />
    </Modal>
  );
}