"use client";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ClientToaster from "@/components/ClientToaster";
import { ModuleManager } from "@/shared/modules/moduleManager";
import { Tenants } from "@prisma/client";
import { Module, TenantConfig } from "@/shared/modules/types";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function TenantPage() {
  const { status } = useSession();
  const router = useRouter();
  const { tenant } = useParams();
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [activeModules, setActiveModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);

  const fetchTenantConfig = useCallback(async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) setInitialLoading(true);
      setActionLoading(true);
      const res = await fetch(`/api/tenants?subdomain=${tenant}`);
      if (res.status === 401) {
        router.push("/auth/signin");
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch tenant config: ${res.statusText}`);
      const data: Tenants & { config?: TenantConfig } = await res.json();
      if (!data.config) throw new Error("Tenant config not found");

      setTenantConfig(data.config);
      const rawModules: Module[] = ModuleManager.getActiveModules(data.config).map((mod) => ({
        ...mod,
        component: dynamic(mod.component, { ssr: false }),
      }));
      setActiveModules(rawModules);
      setSelectedModule((prev) =>
        prev && rawModules.some((m) => m.name === prev.name) ? prev : rawModules[0] || null
      );
      toast.success(`${rawModules.length} module(s) loaded successfully`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
      if (isInitialFetch) setInitialLoading(false);
    }
  }, [tenant, router]);

  useEffect(() => {
    if (!isMounted.current && status === "authenticated") {
      fetchTenantConfig(true);
      isMounted.current = true;
    }
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, fetchTenantConfig, router]);

  const handleSelectModule = useCallback((module: Module) => {
    setSelectedModule(module);
    toast.success(`Switched to ${module.name.replace("-", " ")} module`);
  }, []);

  // Memoize the rendered component to prevent unnecessary re-renders
  const ModuleComponent = useMemo(
    () => (selectedModule ? selectedModule.component : null),
    [selectedModule]
  );

  if (status === "loading" || initialLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Loading...</span>
      </div>
    );
  }
  if (status === "unauthenticated") return null;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!tenantConfig) return <div className="p-4">No tenant configuration found.</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        tenant={tenant as string}
        activeModules={activeModules}
        selectedModule={selectedModule}
        onSelectModule={handleSelectModule}
        actionLoading={actionLoading}
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeModules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p>No modules enabled for this tenant.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedModule
                  ? `${selectedModule.name.charAt(0).toUpperCase() + selectedModule.name.slice(1).replace("-", " ")}`
                  : "No Module Selected"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedModule ? (
                actionLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Loading module...</span>
                  </div>
                ) : ModuleComponent ? (
                  <ModuleComponent
                    tenant={tenant as string}
                    activeModules={activeModules}         // Pass active modules
                    onSelectModule={handleSelectModule}   // Pass module switch handler
                  />
                ) : (
                  <p className="text-red-500">
                    Error: {selectedModule.name} module failed to load correctly.
                  </p>
                )
              ) : (
                <p className="text-gray-500">Select a module to view its content.</p>
              )}
            </CardContent>
          </Card>
        )}
        <ClientToaster />
      </main>
    </div>
  );
}