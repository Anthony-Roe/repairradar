"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR, { SWRConfiguration } from "swr";
import { toast } from "sonner";
import { TenantConfig } from "@/shared/modules/types";
import { Asset, Call, MaintenanceSchedule, WorkOrder, Part, Vendor } from "@prisma/client";

interface FetchOptions {
  id?: string;
  action?: string;
  body?: unknown;
  signal?: AbortSignal;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP error ${res.status}`);
  }
  return res.json();
};

async function dynamicFetch<T>(
  module: string,
  tenant: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  options: FetchOptions = {}
): Promise<T> {
  const { id, action, body, signal } = options;
  const url = new URL(`/api/${module}`, window.location.origin);
  url.searchParams.set("subdomain", tenant);
  if (id) url.searchParams.set("id", id);

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (action) headers["X-Action"] = action;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify({ subdomain: tenant, ...body }) : undefined,
    signal,
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `Failed to ${method} ${module}`);
  }
  return res.json();
}

// Generic tenant data hook with array enforcement
export function useTenantData<T>(
  module: string,
  tenant: string,
  options: SWRConfiguration = {}
) {
  const { status } = useSession();
  const router = useRouter();

  const url = `/api/${module}?subdomain=${tenant}`;
  const key = status === "authenticated" ? url : null;

  const { data, error, mutate, isLoading } = useSWR<T>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      onError: (err) => {
        toast.error(err.message || `Failed to load ${module} data`);
        if (err.message.includes("Unauthorized")) router.push("/auth/signin");
      },
      ...options,
    }
  );

  // Determine if T is an array type and enforce array return
  const isArrayExpected = Array.isArray(options.fallbackData) || module.endsWith("s"); // Heuristic: plural module names expect arrays
  const normalizedData = (() => {
    if (data === undefined || data === null) {
      return isArrayExpected ? [] : undefined;
    }
    if (isArrayExpected) {
      return Array.isArray(data) ? data : [data]; // Force array if not already
    }
    return data;
  })();

  return {
    data: normalizedData as T extends any[] ? T : T | undefined, // Type-safe array enforcement
    error,
    isLoading: isLoading || status === "loading",
    refetch: mutate,
  };
}

// Dedicated hook for tenant config (not an array)
export function useTenantConfig(tenant: string, options: SWRConfiguration = {}) {
  return useTenantData<TenantConfig>(`tenants`, tenant, {
    ...options,
    onSuccess: (data) => data?.modules && JSON.parse(data.modules), // Parse modules if stringified
  });
}

// Module-specific hooks with explicit array typing
export const useAssetData = (tenant: string, options: SWRConfiguration = {}) =>
  useTenantData<Asset[]>("assets", tenant, { fallbackData: [], ...options });

export const useCallData = (tenant: string, options: SWRConfiguration = {}) =>
  useTenantData<Call[]>("calls", tenant, { fallbackData: [], ...options });

export const usePMData = (tenant: string, options: SWRConfiguration = {}) =>
  useTenantData<MaintenanceSchedule[]>("preventative-maintenance", tenant, { fallbackData: [], ...options });

export const useWorkOrderData = (tenant: string, options: SWRConfiguration = {}) =>
  useTenantData<WorkOrder[]>("work-orders", tenant, { fallbackData: [], ...options });

// File: E:\Dev\websites\repairradar\src\shared\lib\hooks\index.ts (partial)
export function useInventoryData(tenant: string, options: SWRConfiguration = {}) {
  return useTenantData<Part[]>("inventory", tenant, options);
}

export function useVendorData(tenant: string, options: SWRConfiguration = {}) {
  return useTenantData<Vendor[]>("vendors", tenant, options);
}

export { dynamicFetch };