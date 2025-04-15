import { VendorModal } from "@/components/modals/VendorModal";
import { getVendor, getTenantByName } from "@/actions";
import { notFound } from "next/navigation";

interface VendorModalPageProps {
  params: { id: string; tenant: string };
}

export default async function VendorModalPage({ params }: VendorModalPageProps) {
  const { id, tenant: subdomain } = await params; // tenant is subdomain
  const data = await getTenantByName(subdomain);
  if (!data) notFound();

  const vendor = await getVendor(id) || undefined;

  return <VendorModal vendor={vendor} tenantId={data.id} />;
}