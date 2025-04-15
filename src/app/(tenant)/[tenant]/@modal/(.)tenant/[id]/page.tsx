import { TenantModal } from "@/components/modals/TenantModal";
import { getTenant, getTenants } from "@/actions/tenants";
import { Modal } from "@/components/modals/default";
import { notFound } from "next/navigation";

interface TenantModalPageProps {
  params: { id: string };
}

export default async function TenantModalPage({ params }: TenantModalPageProps) {
  const { id } = await params;
  const tenant = await getTenant(id) || undefined;
  const tenants = await getTenants({});

  if (!tenants) notFound();

  return (
    <Modal>
      <TenantModal tenant={tenant} tenants={tenants.tenants} />
    </Modal>
  );
}