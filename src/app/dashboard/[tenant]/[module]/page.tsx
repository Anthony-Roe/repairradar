// File: E:\Dev\websites\repairradar\src\app\dashboard\[tenant]\[module]\page.tsx
"use client";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ClientToaster from "@/components/ClientToaster";
import { ModuleManager } from "@/shared/modules/moduleManager";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function ModulePage() {
  const { status } = useSession();
  const router = useRouter();
  const { tenant, module } = useParams();
  const [tenantConfig, setTenantConfig] = useState(null);
  const [activeModules, setActiveModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTenantConfig() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/tenants?subdomain=${tenant}`);
        if (res.status === 401) {
          router.push("/auth/signin");
          return;
        }
        if (!res.ok) throw new Error(`Failed to fetch tenant config: ${res.statusText}`);
        const data = await res.json();
        if (!data.config) throw new Error("Tenant config not found");

        setTenantConfig(data.config);
        const modules = ModuleManager.getActiveModules(data.config).map((mod) => ({
          ...mod,
          component: dynamic(mod.component, { ssr: false }),
        }));
        setActiveModules(modules);

        const currentModule = modules.find((m) => m.name === module);
        if (currentModule) {
          setSelectedModule(currentModule);
        } else {
          toast.error(`Module "${module}" not found`);
          router.push(`/dashboard/${tenant}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") fetchTenantConfig();
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, tenant, module, router]);

  const handleSelectModule = (mod) => {
    router.push(`/dashboard/${tenant}/${mod.name}`);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        tenant={tenant}
        activeModules={activeModules}
        selectedModule={selectedModule}
        onSelectModule={handleSelectModule}
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {selectedModule ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedModule.name.charAt(0).toUpperCase() + selectedModule.name.slice(1).replace("-", " ")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <selectedModule.component
                tenant={tenant}
                activeModules={activeModules}
                onSelectModule={handleSelectModule}
              />
            </CardContent>
          </Card>
        ) : (
          <p className="text-gray-500">Loading module...</p>
        )}
        <ClientToaster />
      </main>
    </div>
  );
}