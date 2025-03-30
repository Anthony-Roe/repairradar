// Auto-generated from SQL schema

export interface Public.asset {
  id: string;
  tenantId: string;
  name: string;
  location: string | null;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  deletedAt: Date | null;
  updatedAt: Date;
}

export interface Public.call {
  id: string;
  tenantId: string;
  assetId: string;
  reportedById: string;
  issue: string;
  callTime: Date /* default: CURRENT_TIMESTAMP */;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  updatedAt: Date;
  status: unknown /* default: 'OPEN'::public."CallStatus" */;
  deletedAt: Date | null;
}

export interface Public.maintenanceasset {
  maintenanceId: string;
  assetId: string;
}

export interface Public.maintenanceschedule {
  id: string;
  tenantId: string;
  description: string;
  recurrence: any;
  nextRun: Date;
  lastRun: Date | null;
  status: unknown /* default: 'SCHEDULED'::public."MaintenanceStatus" */;
  priority: unknown /* default: 'MEDIUM'::public."MaintenancePriority" */;
  assignedToId: string | null;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Public.part {
  id: string;
  name: string;
  description: string | null;
  quantity: number /* default: 0 */;
  minStock: number /* default: 0 */;
  tenantId: string;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Public.partvendor {
  partId: string;
  vendorId: string;
  cost: unknown | null;
}

export interface Public.tenantconfig {
  id: string;
  tenantId: string;
  modules: any;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Public.tenants {
  id: string;
  name: string;
  subdomain: string;
  parentId: string | null;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Public.user {
  id: string;
  tenantId: string | null;
  email: string;
  password: string;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  deletedAt: Date | null;
  updatedAt: Date;
  role: unknown /* default: 'USER'::public."UserRole" */;
}

export interface Public.vendor {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  tenantId: string;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Public.workorder {
  id: string;
  tenantId: string;
  description: string;
  status: unknown /* default: 'PENDING'::public."WorkOrderStatus" */;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  updatedAt: Date;
  assignedToId: string | null;
  deletedAt: Date | null;
  dueDate: Date | null;
  priority: unknown /* default: 'MEDIUM'::public."WorkOrderPriority" */;
}

export interface Public.workorderasset {
  workOrderId: string;
  assetId: string;
}

export interface Public.workordernote {
  id: string;
  workOrderId: string;
  note: string;
  createdById: string | null;
  createdAt: Date /* default: CURRENT_TIMESTAMP */;
  deletedAt: Date | null;
}

export interface Public.PrismaMigrations {
  id: unknown;
  checksum: unknown;
  finished_at: Date | null;
  migration_name: unknown;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date /* default: now() */;
  applied_steps_count: number /* default: 0 */;
}

export const relations = {
};

export const queries = {
  public.Asset: {
    getAll: `SELECT * FROM public.Asset`,
    getById: `SELECT * FROM public.Asset WHERE id = $1`,
    insert: `INSERT INTO public.Asset (id, tenantId, name, location, createdAt, deletedAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
  },
  public.Call: {
    getAll: `SELECT * FROM public.Call`,
    getById: `SELECT * FROM public.Call WHERE id = $1`,
    insert: `INSERT INTO public.Call (id, tenantId, assetId, reportedById, issue, callTime, createdAt, updatedAt, status, deletedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
  },
  public.MaintenanceAsset: {
    getAll: `SELECT * FROM public.MaintenanceAsset`,
    getById: `SELECT * FROM public.MaintenanceAsset WHERE id = $1`,
    insert: `INSERT INTO public.MaintenanceAsset (maintenanceId, assetId) VALUES ($1, $2) RETURNING *`,
  },
  public.MaintenanceSchedule: {
    getAll: `SELECT * FROM public.MaintenanceSchedule`,
    getById: `SELECT * FROM public.MaintenanceSchedule WHERE id = $1`,
    insert: `INSERT INTO public.MaintenanceSchedule (id, tenantId, description, recurrence, nextRun, lastRun, status, priority, assignedToId, createdAt, updatedAt, deletedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
  },
  public.Part: {
    getAll: `SELECT * FROM public.Part`,
    getById: `SELECT * FROM public.Part WHERE id = $1`,
    insert: `INSERT INTO public.Part (id, name, description, quantity, minStock, tenantId, createdAt, updatedAt, deletedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
  },
  public.PartVendor: {
    getAll: `SELECT * FROM public.PartVendor`,
    getById: `SELECT * FROM public.PartVendor WHERE id = $1`,
    insert: `INSERT INTO public.PartVendor (partId, vendorId, cost) VALUES ($1, $2, $3) RETURNING *`,
  },
  public.TenantConfig: {
    getAll: `SELECT * FROM public.TenantConfig`,
    getById: `SELECT * FROM public.TenantConfig WHERE id = $1`,
    insert: `INSERT INTO public.TenantConfig (id, tenantId, modules, createdAt, updatedAt, deletedAt) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
  },
  public.Tenants: {
    getAll: `SELECT * FROM public.Tenants`,
    getById: `SELECT * FROM public.Tenants WHERE id = $1`,
    insert: `INSERT INTO public.Tenants (id, name, subdomain, parentId, createdAt, updatedAt, deletedAt) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
  },
  public.User: {
    getAll: `SELECT * FROM public.User`,
    getById: `SELECT * FROM public.User WHERE id = $1`,
    insert: `INSERT INTO public.User (id, tenantId, email, password, createdAt, deletedAt, updatedAt, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
  },
  public.Vendor: {
    getAll: `SELECT * FROM public.Vendor`,
    getById: `SELECT * FROM public.Vendor WHERE id = $1`,
    insert: `INSERT INTO public.Vendor (id, name, contact, email, tenantId, createdAt, updatedAt, deletedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
  },
  public.WorkOrder: {
    getAll: `SELECT * FROM public.WorkOrder`,
    getById: `SELECT * FROM public.WorkOrder WHERE id = $1`,
    insert: `INSERT INTO public.WorkOrder (id, tenantId, description, status, createdAt, updatedAt, assignedToId, deletedAt, dueDate, priority) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
  },
  public.WorkOrderAsset: {
    getAll: `SELECT * FROM public.WorkOrderAsset`,
    getById: `SELECT * FROM public.WorkOrderAsset WHERE id = $1`,
    insert: `INSERT INTO public.WorkOrderAsset (workOrderId, assetId) VALUES ($1, $2) RETURNING *`,
  },
  public.WorkOrderNote: {
    getAll: `SELECT * FROM public.WorkOrderNote`,
    getById: `SELECT * FROM public.WorkOrderNote WHERE id = $1`,
    insert: `INSERT INTO public.WorkOrderNote (id, workOrderId, note, createdById, createdAt, deletedAt) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
  },
  public._prisma_migrations: {
    getAll: `SELECT * FROM public._prisma_migrations`,
    getById: `SELECT * FROM public._prisma_migrations WHERE id = $1`,
    insert: `INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
  },
};

