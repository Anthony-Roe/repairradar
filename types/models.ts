// Auto-generated TypeScript types from Prisma schema

export enum AssetStatus {
  OPERATIONAL = "OPERATIONAL",
  MAINTENANCE = "MAINTENANCE",
  OUT_OF_SERVICE = "OUT_OF_SERVICE",
  DECOMMISSIONED = "DECOMMISSIONED",
}

export enum CallPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum CallStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  CLOSED = "CLOSED",
}

export enum IndustryType {
  MANUFACTURING = "MANUFACTURING",
  HEALTHCARE = "HEALTHCARE",
  FACILITY = "FACILITY",
  LABORATORY = "LABORATORY",
  ENERGY = "ENERGY",
  TRANSPORTATION = "TRANSPORTATION",
  OTHER = "OTHER",
}

export enum MaintenanceStatus {
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum MaintenanceTrigger {
  TIME_BASED = "TIME_BASED",
  METER_BASED = "METER_BASED",
}

export enum UserRole {
  TECHNICIAN = "TECHNICIAN",
  SUPERVISOR = "SUPERVISOR",
  MANAGER = "MANAGER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum WorkOrderStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface TenantSettings {
  tenant: any;
  tenantId: string;
  config: any;
}

export interface AssetCategory {
  id: string;
  tenant: any;
  tenantId: string;
  name: string;
  industry: IndustryType;
  description: string | null;
  metadata: any;
}

export interface AssetType {
  id: string;
  tenant: any;
  tenantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  expected_lifespan: number | null;
  maintenance_frequency: number | null;
  criticality: number | null;
  customFields: any;
  category: AssetCategory | null;
}

export interface Asset {
  id: string;
  tenant: any;
  tenantId: string;
  assetTypeId: string | null;
  name: string;
  location: string | null;
  status: AssetStatus;
  serialNumber: string | null;
  purchase_date: Date | null;
  last_maintenance_date: Date | null;
  metadata: any;
  assetType: AssetType | null;
}
