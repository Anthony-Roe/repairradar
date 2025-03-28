// File: E:\Dev\websites\repairradar\src\app\dashboard\[tenant]\page.tsx
"use client";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ClientToaster from "@/components/ClientToaster";
import { Loader2, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { ModuleManager } from "@/shared/modules/moduleManager";
import { useTenantConfig, useWorkOrderData, useInventoryData } from "@/shared/lib/hooks";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { tenant } = useParams();
  const { data: tenantConfig, isLoading: configLoading, refetch: refetchConfig } = useTenantConfig(tenant);
  const { data: workOrders, isLoading: woLoading, refetch: refetchWO } = useWorkOrderData(tenant, { fallbackData: [] });
  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = useInventoryData(tenant, { fallbackData: [] });
  const [activeModules, setActiveModules] = useState([]);

  useEffect(() => {
    if (status === "authenticated") {
      if (tenantConfig) {
        const modules = ModuleManager.getActiveModules(tenantConfig);
        setActiveModules(modules);
        if (modules.length === 0 && session?.user.role !== "SUPER_ADMIN") {
          toast.error("No modules enabled for this tenant.");
        }
      } else if (!configLoading) {
        // Tenant exists but config is missing or null
        toast.error(`Tenant "${tenant}" has no valid configuration.`);
      }

      if (session?.user.role === "SUPER_ADMIN") {
        fetch("/api/tenants")
          .then((res) => res.json())
          .then((data) => {
            if (data.tenants?.length === 0) {
              toast.info("No tenants found. Redirecting to admin panel to create one.");
              router.push("/admin");
            }
          })
          .catch(() => {
            toast.error("Failed to verify tenant data.");
          });
      }
    }
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, tenantConfig, configLoading, session, router, tenant]);

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchConfig(), refetchWO(), refetchInv()]);
      toast.success("Dashboard data refreshed");
    } catch {
      toast.error("Failed to refresh dashboard");
    }
  };

  if (status === "loading" || configLoading || woLoading || invLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar tenant={tenant} activeModules={activeModules} />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {tenantConfig ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Dashboard - {tenant}</h1>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Work Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Total: {workOrders.length}</p>
                  <p>Pending: {workOrders.filter((e) => e.status === "PENDING").length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Total Parts: {inventory.length}</p>
                  <p>Low Stock: {inventory.filter((e) => e.quantity < e.minStock).length}</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="p-4 text-red-500">Tenant &quot;{tenant}&quot; not found or configuration is missing.</div>
        )}
        <ClientToaster />
      </main>
    </div>
  );
}