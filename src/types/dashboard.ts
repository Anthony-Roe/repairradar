import { Asset, WorkOrder, Part, Vendor, Incident, MaintenanceSchedule, AssetCategory, AssetType, User } from "@prisma/client";
import { Metric } from "@prisma/client/runtime/library";

  export interface DashboardData {
    assets: Asset[];
    incidents: Incident[];
    workOrders: WorkOrder[];
    parts: Part[];
    timestamp?: string;
    // Add other fields as needed from server actions response
    vendors?: Vendor[];
    maintenanceSchedules?: any[];
    assetCategories?: any[];
    assetTypes?: any[];
    metrics?: {
      activeCalls: number;
      criticalCalls: number;
      openWorkOrders: number;
      inProgressWorkOrders: number;
      overdueMaintenance: number;
      lowStockParts: number;
    };
  }