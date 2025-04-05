import { Asset, WorkOrder, Part, Vendor, Incident } from "@prisma/client";

export interface DashboardData {
    assets: Asset[]; // Replace with actual type
    workOrders: WorkOrder[]; // Replace with actual type
    incident: Incident[]; // Replace with actual type
    parts: Part[]; // Replace with actual type
    vendors: Vendor[]; // Replace with actual type
  };