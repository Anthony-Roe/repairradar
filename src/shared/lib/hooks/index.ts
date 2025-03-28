"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from "react";

// Generic API query hook
export function useApiQuery<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    queryParams?: Record<string, string>;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/${endpoint}`;
      if (options?.queryParams) {
        const queryString = new URLSearchParams(options.queryParams).toString();
        url += `?${queryString}`;
      }
      const res = await fetch(url, {
        meth od: options?.method || "GET",
        headers: { "Content-Type": "application/json" },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
      if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      toast.error(`Error fetching ${endpoint}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// CRUD function to interact with API
export async function apiFetch<T>(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE",
  body?: any
): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Failed to ${method} ${endpoint}`);
  return res.json();
}

// Hook to get tenant-specific data
export function useTenantData<T>(endpoint: string, tenantId: string) {
  const { status } = useSession();
  const router = useRouter();

  const { data, loading, error, refetch } = useApiQuery<T>(endpoint, {
    queryParams: { tenant_id: tenantId },
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  return { data, loading: loading || status === "loading", error, refetch };
}

// Module-specific hooks
export const useAssets = (tenant: string) => useTenantData("assets", tenant);
export const useCalls = (tenant: string) => useTenantData("calls", tenant);
export const usePMs = (tenant: string) => useTenantData("maintenance_schedules", tenant);
export const useWorkOrders = (tenant: string) => useTenantData("work_orders", tenant);
export const useInventory = (tenant: string) => useTenantData("inventory", tenant);
export const useVendors = (tenant: string) => useTenantData("vendors", tenant);
