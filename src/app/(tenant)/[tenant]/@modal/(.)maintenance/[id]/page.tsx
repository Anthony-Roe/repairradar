import { MaintenanceScheduleModal } from "@/components/modals/MaintenanceScheduleModal";
import { getMaintenanceSchedule, getMeters, getTenantByName } from "@/actions";
import { Modal } from "@/components/modals/default";
import { notFound } from "next/navigation";

interface MaintenanceModalPageProps {
  params: { id: string; tenant: string };
}

export default async function MaintenanceModalPage({ params }: MaintenanceModalPageProps) {
  const { id, tenant: subdomain } = await params;
  const data = await getTenantByName(subdomain);
  if (!data) notFound();

  const schedule = await getMaintenanceSchedule(id) || undefined;
  const meters = await getMeters(data.id);

  return (
    <Modal>
      <MaintenanceScheduleModal schedule={schedule} tenantId={data.id} meters={meters} />
    </Modal>
  );
}