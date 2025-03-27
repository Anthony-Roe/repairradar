// src/shared/modules/preventative-maintenance/types.ts
export interface MaintenanceSchedule {
  id: string;
  tenantId: string;
  description: string;
  recurrence: { type: "daily" | "weekly" | "monthly"; interval: number };
  nextRun: Date; // Changed to Date
  lastRun?: Date | null; // Changed to Date | null
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignedToId?: string | null;
  assignedTo?: { id: string; email: string } | null;
  assets: { assetId: string; asset: { id: string; name: string } }[]; // Match API include
  createdAt: Date; // Changed to Date
  updatedAt: Date; // Changed to Date
  deletedAt?: Date | null; // Changed to Date | null
}
  
export interface CreateMaintenanceInput {
  description: string;
  recurrence: { type: "daily" | "weekly" | "monthly"; interval: number };
  nextRun: string;
  lastRun?: string;
  status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  assignedToId?: string;
  assetIds: string[];
  tenantId: string;
}