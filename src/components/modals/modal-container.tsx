"use client";

import { usePathname, useRouter } from "next/navigation";
import { Modal } from "./default";
import { WorkOrderModal } from "./WorkOrderModal";
import { AssetModal } from "./AssetModal";
import { PartModal } from "./PartModal";
import { IncidentModal } from "./IncidentModal";
import { MaintenanceScheduleModal } from "./MaintenanceScheduleModal";
import { UserModal } from "./UserModal";
import { VendorModal } from "./VendorModal";
import { useEffect, useState } from "react";
import {
  getWorkOrder,
  getAsset,
  getPart,
  getIncident,
  getMaintenanceSchedule,
  getUser,
  getVendor,
  getAssets,
  getMaintenanceSchedules,
  getMeters,
  getUsers,
  getAssetTypes,
} from "@/actions";
import { Prisma } from "@prisma/client";

export function ModalContainer({ tenantId }: { tenantId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [modalData, setModalData] = useState<any>(null);

  const modalMatch = pathname.match(/\/[^/]+\/(work-order|asset|part|incident|maintenance|user|vendor)\/([^/]+)/);
  const modalType = modalMatch?.[1];
  const id = modalMatch?.[2];

  useEffect(() => {
    async function fetchModalData() {
      if (!modalType || !id) {
        setModalData(null);
        return;
      }

      try {
        if (modalType === "work-order" && id !== "new") {
          const workOrder = await getWorkOrder(id);
          const maintenanceSchedules = await getMaintenanceSchedules({ tenantId });
          setModalData({ workOrder, maintenanceSchedules: maintenanceSchedules.schedules });
        } else if (modalType === "asset" && id !== "new") {
          const asset = await getAsset(id);
          const assetTypes = await getAssetTypes(tenantId);
          setModalData({ asset, assetTypes });
        } else if (modalType === "part" && id !== "new") {
          const part = await getPart(id);
          setModalData({ part });
        } else if (modalType === "incident" && id !== "new") {
          const incident = await getIncident(id);
          const assets = await getAssets({ tenantId });
          const users = await getUsers({ tenantId });
          setModalData({ incident, assets: assets.assets, users: users.users });
        } else if (modalType === "maintenance" && id !== "new") {
          const schedule = await getMaintenanceSchedule(id);
          const meters = await getMeters(tenantId);
          setModalData({ schedule, meters });
        } else if (modalType === "user" && id !== "new") {
          const user = await getUser(id);
          setModalData({ user });
        } else if (modalType === "vendor" && id !== "new") {
          const vendor = await getVendor(id);
          setModalData({ vendor });
        } else {
          if (modalType === "work-order") {
            const maintenanceSchedules = await getMaintenanceSchedules({ tenantId });
            setModalData({ maintenanceSchedules: maintenanceSchedules.schedules });
          } else if (modalType === "asset") {
            const assetTypes = await getAssetTypes(tenantId);
            setModalData({ assetTypes });
          } else if (modalType === "incident") {
            const assets = await getAssets({ tenantId });
            const users = await getUsers({ tenantId });
            setModalData({ assets: assets.assets, users: users.users });
          } else if (modalType === "maintenance") {
            const meters = await getMeters(tenantId);
            setModalData({ meters });
          } else {
            setModalData({});
          }
        }
      } catch (error) {
        console.error("Failed to fetch modal data:", error);
        setModalData(null);
      }
    }

    fetchModalData();
  }, [modalType, id, tenantId]);

  if (!modalType || !modalData) return null;

  const renderModal = () => {
    switch (modalType) {
      case "work-order":
        return (
          <WorkOrderModal
            workOrder={modalData.workOrder as Prisma.WorkOrderGetPayload<{}> | undefined}
            tenantId={tenantId}
            maintenanceSchedules={
              modalData.maintenanceSchedules as Prisma.MaintenanceScheduleGetPayload<{}>[]
            }
          />
        );
      case "asset":
        return (
          <AssetModal
            asset={modalData.asset as Prisma.AssetGetPayload<{}> | undefined}
            tenantId={tenantId}
            assetTypes={modalData.assetTypes as Prisma.AssetTypeGetPayload<{}>[]}
          />
        );
      case "part":
        return (
          <PartModal
            part={modalData.part as Prisma.PartGetPayload<{}> | undefined}
            tenantId={tenantId}
          />
        );
      case "incident":
        return (
          <IncidentModal
            incident={modalData.incident as Prisma.IncidentGetPayload<{}> | undefined}
            tenantId={tenantId}
            assets={modalData.assets as Prisma.AssetGetPayload<{}>[]}
            users={modalData.users as Prisma.UserGetPayload<{}>[]}
          />
        );
      case "maintenance":
        return (
          <MaintenanceScheduleModal
            schedule={modalData.schedule as Prisma.MaintenanceScheduleGetPayload<{}> | undefined}
            tenantId={tenantId}
            meters={modalData.meters as Prisma.MeterGetPayload<{}>[]}
          />
        );
      case "user":
        return (
          <UserModal
            user={modalData.user as Prisma.UserGetPayload<{}> | undefined}
            tenantId={tenantId}
          />
        );
      case "vendor":
        return (
          <VendorModal
            vendor={modalData.vendor as Prisma.VendorGetPayload<{}> | undefined}
            tenantId={tenantId}
          />
        );
      default:
        return null;
    }
  };

  return <Modal>{renderModal()}</Modal>;
}