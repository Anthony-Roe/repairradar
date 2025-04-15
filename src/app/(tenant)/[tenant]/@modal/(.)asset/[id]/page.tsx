import { AssetModal } from "@/components/modals/AssetModal";
import { getAsset, getAssetTypes, getTenantByName } from "@/actions";
import { Modal } from "@/components/modals/default";
import { redirect } from "next/navigation";

interface AssetModalPageProps {
  params: { action: string; subdomain: string };
}

export default async function AssetModalPage({ params }: AssetModalPageProps) {
  const { action, subdomain } = await params;
  const tenant = await getTenantByName(subdomain) || redirect("/");


  let asset = undefined;
  switch(action)
  {
    case "new":
      break;
    default:
      {
        asset = await getAsset(action) || undefined
      }

  }

  const assetTypes = await getAssetTypes(tenant.id)

  return (
    <Modal>
      <AssetModal asset={asset} tenantId={tenant.id} assetTypes={assetTypes} />
    </Modal>
  );
}