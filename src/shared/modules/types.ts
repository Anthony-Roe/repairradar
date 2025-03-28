// src/shared/modules/types.ts
import { WorkOrderPriority, WorkOrderStatus } from "@prisma/client";
import { ComponentType } from "react";

export * from "@prisma/client";

export type ModuleConfig = Record<string, boolean>;

export interface TenantConfig {
  id: string;
  tenantId: string;
  modules?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCallInput {
  tenantId: string;
  issue: string;
  assetId: string;
}

export interface CreateWorkOrderInput {
  tenantId: string;
  description: string;
  assetIds: string[];
  priority?: WorkOrderPriority;
  dueDate?: string;
  assignedToId?: string;
  notes?: string[];
}

export interface UpdateWorkOrderInput {
  id: string;
  status?: WorkOrderStatus;
  assignedToId?: string | null;
  newNotes?: string[];
  assetIds?: string[];
}

export interface Module {
  name: string;
  apiRoute: string;
  component: ComponentType<{ tenant: string }>;
}

export interface RawModule {
  name: string;
  component: () => Promise<{ default: ComponentType<{ tenant: string }> }>;
  apiRoute: string;
}