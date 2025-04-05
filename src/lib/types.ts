export enum CallStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED'
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum UserRole {
  USER = 'USER',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum WorkOrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AssetStatus {
  operational = "Operational",
  maintenance = "Under Maintenance",
  outOfService = "Out of Service"
}

export enum AssetType {

}

export interface Asset {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  createdAt: string | string;
  deletedAt: string | null | string;
  updatedAt: string | string;

  status: AssetStatus;
  type: AssetType;

}

export interface Call {
  id: string;
  tenantId: string;
  assetId: string;
  reportedById: string;
  issue: string;
  callTime: string | string;
  createdAt: string | string;
  updatedAt: string | string;
  status: CallStatus | string;
  deletedAt: string | null | string;
}

export interface MaintenanceAsset {
  maintenanceId: string;
  assetId: string;
}

export interface MaintenanceSchedule {
  id: string;
  tenantId: string;
  description: string;
  recurrence: any;
  nextRun: string;
  lastRun: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Part {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  minStock: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PartVendor {
  partId: string;
  vendorId: string;
  cost: number | null;
}

export interface TenantConfig {
  id: string;
  tenantId: string;
  modules: any;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface User {
  id: string;
  tenantId: string | null;
  email: string;
  password: string;
  createdAt: string;
  deletedAt: string | null;
  updatedAt: string;
  role: UserRole;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  description: string;
  status: WorkOrderStatus;
  createdAt: string;
  updatedAt: string | string;
  assignedToId: string | null;
  deletedAt: string | string | null;
  dueDate: string | string | null;
  priority: WorkOrderPriority;
}

export interface WorkOrderAsset {
  workOrderId: string;
  assetId: string;
}

export interface WorkOrderNote {
  id: string;
  workOrderId: string;
  note: string;
  createdById: string | null;
  createdAt: string;
  deletedAt: string | null;
}

// 4. Helper Types
export type AuthUserMeta = {
  name: string,
  tenant_id: string | "error";
  role: UserRole | UserRole.USER;
  subdomain: string | "error";
  modules: Record<string, boolean> | [];

};

export interface DashboardData {
  assets: Asset[];
  calls: Call[];
  workOrders: WorkOrder[];
  parts: Part[];
  vendors: Vendor[];
}

export interface DynamicDashboardProps {
  initialData: DashboardData;
}

export type UserSignUp = {
  email: string;
  password: string;
  metaData: Record<string, object>;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};