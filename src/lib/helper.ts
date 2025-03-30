"use server";

// database.types.ts
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { any } from "zod";

// 1. Type Definitions
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

export interface Asset {
  id: string;
  tenantId: string;
  name: string;
  location: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  updatedAt: Date;
}

export interface Call {
  id: string;
  tenantId: string;
  assetId: string;
  reportedById: string;
  issue: string;
  callTime: Date;
  createdAt: Date;
  updatedAt: Date;
  status: CallStatus;
  deletedAt: Date | null;
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
  nextRun: Date;
  lastRun: Date | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assignedToId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Part {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  minStock: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface User {
  id: string;
  tenantId: string | null;
  email: string;
  password: string;
  createdAt: Date;
  deletedAt: Date | null;
  updatedAt: Date;
  role: UserRole;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  description: string;
  status: WorkOrderStatus;
  createdAt: Date;
  updatedAt: Date;
  assignedToId: string | null;
  deletedAt: Date | null;
  dueDate: Date | null;
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
  createdAt: Date;
  deletedAt: Date | null;
}

export const db = async () => {
    const supabase = await createClient();
    
    return {
      // Authentication (unchanged)
      auth: {
        signUp: async (email: string, password: string, userMetadata: Record<string, any> = {}) => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: userMetadata
            }
          });
          return { data, error };
        },
        signIn: async (email: string, password: string) => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          return { data, error };
        },
        signOut: async () => {
          const { error } = await supabase.auth.signOut();
          return { error };
        },
        getUser: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          return user;
        },
        updateUser: async (updates: { email?: string; password?: string; data?: Record<string, any> }) => {
          const { data, error } = await supabase.auth.updateUser(updates);
          return { data, error };
        },
      },
  
      // Asset Operations with overloads
      assets: {
        getAll: async (tenantId?: string) => {
          let query = supabase
            .from('assets')
            .select('*')
            .is('deleted_at', null);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
  
          const { data, error } = await query;
          return { data, error };
        },
        getById: async (id: string, tenantId?: string) => {
          let query = supabase
            .from('assets')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
  
          const { data, error } = await query.single();
          return { data, error };
        },
        create: async (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
          const { data, error } = await supabase
            .from('assets')
            .insert({
              ...asset,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .select()
            .single();
          return { data, error };
        },
        update: async (id: string, updates: Partial<Asset>) => {
          const { data, error } = await supabase
            .from('assets')
            .update({
              ...updates,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();
          return { data, error };
        },
        delete: async (id: string) => {
          const { data, error } = await supabase
            .from('assets')
            .update({ deletedAt: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          return { data, error };
        },
      },
  
      // Call Operations with overloads
      calls: {
        getAll: async (tenantId?: string, filters?: { status?: CallStatus; assetId?: string }) => {
          let query = supabase
            .from('calls')
            .select('*')
            .is('deleted_at', null);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
          if (filters?.status) {
            query = query.eq('status', filters.status);
          }
          if (filters?.assetId) {
            query = query.eq('assetId', filters.assetId);
          }
  
          const { data, error } = await query;
          return { data, error };
        },
        create: async (call: Omit<Call, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'status'>) => {
          const { data, error } = await supabase
            .from('calls')
            .insert({
              ...call,
              status: CallStatus.OPEN,
              callTime: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .select()
            .single();
          return { data, error };
        },
        updateStatus: async (id: string, status: CallStatus, tenantId?: string) => {
          let query = supabase
            .from('calls')
            .update({ 
              status, 
              updatedAt: new Date().toISOString() 
            })
            .eq('id', id);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
  
          const { data, error } = await query.select().single();
          return { data, error };
        },
      },
  
      // Work Order Operations with overloads
      workOrders: {
        getAll: async (tenantId?: string, filters?: { 
          status?: WorkOrderStatus;
          assignedToId?: string;
          priority?: WorkOrderPriority;
        }) => {
          let query = supabase
            .from('work_orders')
            .select('*')
            .is('deleted_at', null);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
          if (filters?.status) {
            query = query.eq('status', filters.status);
          }
          if (filters?.assignedToId) {
            query = query.eq('assignedToId', filters.assignedToId);
          }
          if (filters?.priority) {
            query = query.eq('priority', filters.priority);
          }
  
          const { data, error } = await query;
          return { data, error };
        },
        create: async (workOrder: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'status'>) => {
          const { data, error } = await supabase
            .from('work_orders')
            .insert({
              ...workOrder,
              status: WorkOrderStatus.PENDING,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .select()
            .single();
          return { data, error };
        },
        assign: async (workOrderId: string, userId: string, tenantId?: string) => {
          let query = supabase
            .from('work_orders')
            .update({
              assignedToId: userId,
              status: WorkOrderStatus.ASSIGNED,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', workOrderId);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
  
          const { data, error } = await query.select().single();
          return { data, error };
        },
        addNote: async (workOrderId: string, note: string, createdById: string) => {
          const { data, error } = await supabase
            .from('work_order_notes')
            .insert({
              workOrderId,
              note,
              createdById,
              createdAt: new Date().toISOString(),
            })
            .select()
            .single();
          return { data, error };
        },
        getNotes: async (workOrderId: string) => {
          const { data, error } = await supabase
            .from('work_order_notes')
            .select('*')
            .eq('workOrderId', workOrderId)
            .order('createdAt', { ascending: false });
          return { data, error };
        },
      },
  
      // User Operations with overloads
      users: {
        getAll: async (userId?: string) => {
          let query = supabase
            .from('users')
            .select('*')
            .is('deleted_at', null);
  
          if (userId) {
            query = query.eq('id', userId);
          }
  
          const { data, error } = await query;
          return { data, error };
        },
        updateRole: async (userId: string, role: UserRole, tenantId?: string) => {
          let query = supabase
            .from('users')
            .update({ role })
            .eq('id', userId);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
  
          const { data, error } = await query.select().single();
          return { data, error };
        },
      },
  
      // Maintenance Operations with overloads
      maintenance: {
        getAllSchedules: async (tenantId?: string, filters?: {
          status?: MaintenanceStatus;
          assignedToId?: string;
          priority?: MaintenancePriority;
        }) => {
          let query = supabase
            .from('maintenance_schedules')
            .select('*')
            .is('deleted_at', null);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
          if (filters?.status) {
            query = query.eq('status', filters.status);
          }
          if (filters?.assignedToId) {
            query = query.eq('assignedToId', filters.assignedToId);
          }
          if (filters?.priority) {
            query = query.eq('priority', filters.priority);
          }
  
          const { data, error } = await query;
          return { data, error };
        },
        // Add other maintenance operations...
      },
  
      // Parts Operations with overloads
      parts: {
        getAll: async (tenantId?: string, filters?: {
          lowStock?: boolean;
        }) => {
          let query = supabase
            .from('parts')
            .select('*')
            .is('deleted_at', null);
  
          if (tenantId) {
            query = query.eq('tenantId', tenantId);
          }
          if (filters?.lowStock) {
            query.lte('quantity', 'min_stock');
          }
  
          const { data, error } = await query;
          return { data, error };
        },
        // Add other parts operations...
      }
    };
  };

// 4. Helper Types
export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  tenantId?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};