import { WorkOrderModal } from "@/components/modals/WorkOrderModal";
import { getWorkOrder, getMaintenanceSchedules, getTenantByName } from "@/actions";
import { Modal } from "@/components/modals/default";
import { notFound } from "next/navigation";

interface WorkOrderModalPageProps {
  params: { id: string; tenant: string };
}

export default async function WorkOrderModalPage({ params }: WorkOrderModalPageProps) {
  const { id, tenant: subdomain } = await params;
  const data = await getTenantByName(subdomain);
  if (!data) notFound();

  const workOrder = id !== "new" ? await getWorkOrder(id) || undefined : undefined;
  const maintenanceSchedules = await getMaintenanceSchedules({ tenantId: data.id });

  return (
    <Modal>
      <WorkOrderModal
        workOrder={workOrder}
        tenantId={data.id}
        maintenanceSchedules={maintenanceSchedules.schedules}
      />
    </Modal>
  );
}