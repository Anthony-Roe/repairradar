"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ClientToaster from "@/components/ClientToaster";
import { Loader2 } from "lucide-react";
import { ModuleManager } from "@/shared/modules/moduleManager";
import supabase from "@/lib/supabase";
import { useApiQuery } from "@/shared/lib/hooks";
import { TenantConfig } from "@/shared/modules/types";

const ALL_MODULES = ModuleManager.getAllModules();

type Tenant = {
  id: string;
  name: string;
  subdomain: string;
  config?: { modules: Record<string, boolean> } | null;
  deletedAt: string | null;
};
type ModuleConfig = Record<string, boolean>;

export default function AdminPanel() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [newTenant, setNewTenant] = useState<{
    name: string;
    subdomain: string;
    modules: ModuleConfig;
  }>({
    name: "",
    subdomain: "",
    modules: ALL_MODULES.reduce((acc, m) => ({ ...acc, [m]: false }), {} as ModuleConfig),
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const isMounted = useRef(false);
  const { data, loading, error, refetch } = useApiQuery<TenantConfig[]>("tenants", {method: "GET"});

  const handleRefresh = useCallback(async () => {
      setIsRefreshing(true);
      await refetch();
      setIsRefreshing(false);
    }, [refetch]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[AdminPanel] Session fetch error:", error.message);
        router.push("/auth/signin");
        return;
      }
      setSession(session);

      if (session) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (userError || !userData || userData.role !== "SUPER_ADMIN") {
          console.error("[AdminPanel] User fetch error or not SUPER_ADMIN:", userError?.message);
          router.push("/auth/signin");
          return;
        }
      } else {
        router.push("/auth/signin");
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("[AdminPanel] Auth state changed:", event);
      setSession(newSession);
      if (!newSession) {
        router.push("/auth/signin");
      } else {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", newSession.user.id)
          .single();

        if (userError || !userData || userData.role !== "SUPER_ADMIN") {
          console.error("[AdminPanel] User fetch error or not SUPER_ADMIN:", userError?.message);
          router.push("/auth/signin");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchTenants = useCallback(
    async (isInitialFetch = false) => {
      try {
        if (isInitialFetch) setInitialLoading(true);
        

        if (tenantError) {
          console.error("[fetchTenants] Tenant fetch error:", tenantError);
          throw new Error(`Failed to fetch tenants: ${tenantError.message} (code: ${tenantError.code})`);
        }

        if (!tenantData || tenantData.length === 0) {
          setTenants([]);
          console.log("[fetchTenants] No tenants found");
          return;
        }

        const tenantIds = tenantData.map((t) => t.id);
        const { data: configData, error: configError } = await supabase
          .from("tenant_configs")
          .select("tenant_id, modules")
          .in("tenant_id", tenantIds);

        if (configError) {
          console.error("[fetchTenants] Config fetch error:", configError);
          throw new Error(`Failed to fetch tenant configs: ${configError.message} (code: ${configError.code})`);
        }

        const formattedTenants = tenantData.map((t) => {
          const config = configData?.find((c) => c.tenant_id === t.id);
          return {
            id: t.id,
            name: t.name,
            subdomain: t.subdomain,
            deletedAt: t.deletedAt,
            config: config ? { modules: config.modules } : { modules: {} },
          };
        });

        setTenants(formattedTenants);
        console.log("[fetchTenants] Tenants fetched successfully:", formattedTenants);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred while fetching tenants";
        console.error("[fetchTenants] Error:", err);
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      } finally {
        if (isInitialFetch) setInitialLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isMounted.current && session && session.user) {
      fetchTenants(true);
      isMounted.current = true;
    }
  }, [session, fetchTenants]);

  const handleCreateTenant = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (actionLoading) return;
      setActionLoading(true);
      setActionType("create");
      try {
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .insert({ name: newTenant.name, subdomain: newTenant.subdomain })
          .select()
          .single();
        if (tenantError) {
          console.error("[handleCreateTenant] Tenant creation error:", tenantError);
          throw new Error(`Failed to create tenant: ${tenantError.message} (code: ${tenantError.code})`);
        }

        const { error: configError } = await supabase
          .from("tenant_configs")
          .insert({ tenant_id: tenant.id, modules: newTenant.modules });
        if (configError) {
          console.error("[handleCreateTenant] Config creation error:", configError);
          throw new Error(`Failed to create tenant config: ${configError.message} (code: ${configError.code})`);
        }

        setNewTenant({ name: "", subdomain: "", modules: ALL_MODULES.reduce((acc, m) => ({ ...acc, [m]: false }), {} as ModuleConfig) });
        await fetchTenants();
        toast.success("Tenant created successfully");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred while creating tenant";
        console.error("[handleCreateTenant] Error:", err);
        toast.error(errorMsg);
      } finally {
        setActionLoading(false);
        setActionType(null);
      }
    },
    [newTenant, actionLoading, fetchTenants]
  );

  const handleSoftDeleteTenant = useCallback(
    async (id: string) => {
      if (actionLoading) return;
      setActionLoading(true);
      setActionType("softDelete");
      setTargetId(id);
      try {
        const { error } = await supabase
          .from("tenants")
          .update({ deletedAt: new Date().toISOString() })
          .eq("id", id);
        if (error) {
          console.error("[handleSoftDeleteTenant] Error:", error);
          throw new Error(`Failed to soft delete tenant: ${error.message} (code: ${error.code})`);
        }
        await fetchTenants();
        toast.success(`Tenant ${id} soft deleted successfully`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred while soft deleting tenant";
        console.error("[handleSoftDeleteTenant] Error:", err);
        toast.error(errorMsg);
      } finally {
        setActionLoading(false);
        setActionType(null);
        setTargetId(null);
      }
    },
    [fetchTenants, actionLoading]
  );

  const handleRestoreTenant = useCallback(
    async (id: string) => {
      if (actionLoading) return;
      setActionLoading(true);
      setActionType("restore");
      setTargetId(id);
      try {
        const { error } = await supabase
          .from("tenants")
          .update({ deletedAt: null })
          .eq("id", id);
        if (error) {
          console.error("[handleRestoreTenant] Error:", error);
          throw new Error(`Failed to restore tenant: ${error.message} (code: ${error.code})`);
        }
        await fetchTenants();
        toast.success("Tenant restored");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred while restoring tenant";
        console.error("[handleRestoreTenant] Error:", err);
        toast.error(errorMsg);
      } finally {
        setActionLoading(false);
        setActionType(null);
        setTargetId(null);
      }
    },
    [fetchTenants, actionLoading]
  );

  const handleUpdateModules = useCallback(
    async (tenant: Tenant, module: string, enabled: boolean) => {
      if (actionLoading) return;
      setActionLoading(true);
      setActionType(`updateModule-${module}`);
      setTargetId(tenant.id);
      try {
        const updatedModules = { ...(tenant.config?.modules || {}), [module]: enabled };
        const { error } = await supabase
          .from("tenant_configs")
          .upsert({ tenant_id: tenant.id, modules: updatedModules }, { onConflict: "tenant_id" });
        if (error) {
          console.error("[handleUpdateModules] Error:", error);
          throw new Error(`Failed to update modules: ${error.message} (code: ${error.code})`);
        }
        await fetchTenants();
        toast.success("Tenant modules updated");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred while updating tenant modules";
        console.error("[handleUpdateModules] Error:", err);
        toast.error(errorMsg);
      } finally {
        setActionLoading(false);
        setActionType(null);
        setTargetId(null);
      }
    },
    [fetchTenants, actionLoading]
  );

  const handleHardDeleteTenant = useCallback(
    async (id: string) => {
      if (actionLoading || !confirm("Are you sure you want to permanently delete this tenant? This action cannot be undone.")) return;
      setActionLoading(true);
      setActionType("hardDelete");
      setTargetId(id);
      try {
        const { error: configError } = await supabase
          .from("tenant_configs")
          .delete()
          .eq("tenant_id", id);
        if (configError) {
          console.error("[handleHardDeleteTenant] Config delete error:", configError);
          throw new Error(`Failed to delete tenant config: ${configError.message} (code: ${configError.code})`);
        }

        const { error: tenantError } = await supabase
          .from("tenants")
          .delete()
          .eq("id", id);
        if (tenantError) {
          console.error("[handleHardDeleteTenant] Tenant delete error:", tenantError);
          throw new Error(`Failed to delete tenant: ${tenantError.message} (code: ${tenantError.code})`);
        }

        await fetchTenants();
        toast.success("Tenant permanently deleted");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred while permanently deleting tenant";
        console.error("[handleHardDeleteTenant] Error:", err);
        toast.error(errorMsg);
      } finally {
        setActionLoading(false);
        setActionType(null);
        setTargetId(null);
      }
    },
    [fetchTenants, actionLoading]
  );

  const handleViewDashboard = useCallback((subdomain: string) => {
    window.open("/" + subdomain, "_blank");
  }, []);

  const formatDeletedAt = (deletedAt: string | null) => {
    if (!deletedAt) return "";
    return new Date(deletedAt).toISOString().split("T")[0] + " " + new Date(deletedAt).toISOString().split("T")[1].split(".")[0];
  };

  if (initialLoading || !session) {
    return <div className="p-6">Loading...</div>;
  }

  if (errorMessage) return <div className="p-6 text-red-500">{errorMessage}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <Input
              value={newTenant.name}
              onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
              placeholder="Tenant Name"
              required
              disabled={actionLoading}
            />
            <Input
              value={newTenant.subdomain}
              onChange={(e) => setNewTenant({ ...newTenant, subdomain: e.target.value.toLowerCase() })}
              placeholder="Subdomain"
              required
              disabled={actionLoading}
            />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Modules:</h3>
              {ALL_MODULES.map((mod) => (
                <div key={mod} className="flex items-center space-x-2">
                  <Checkbox
                    id={mod}
                    checked={newTenant.modules?.[mod] || false}
                    onCheckedChange={(checked) =>
                      setNewTenant({ ...newTenant, modules: { ...newTenant.modules, [mod]: checked as boolean } })
                    }
                    disabled={actionLoading}
                  />
                  <label htmlFor={mod} className="text-sm">{mod}</label>
                </div>
              ))}
            </div>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading && actionType === "create" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Tenant"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenants.map((t) => (
          <Card key={t.id} className={t.deletedAt ? "opacity-50" : ""}>
            <CardHeader>
              {t.deletedAt ? (
                <CardTitle>
                  {t.name} ({t.subdomain}) - Deleted at {formatDeletedAt(t.deletedAt)}
                </CardTitle>
              ) : (
                <CardTitle>
                  {t.name} ({t.subdomain})
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold">Modules:</h4>
                {ALL_MODULES.map((mod) => (
                  <div key={mod} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${t.id}-${mod}`}
                      checked={t.config?.modules?.[mod] || false}
                      onCheckedChange={(checked) => handleUpdateModules(t, mod, checked as boolean)}
                      disabled={Boolean(t.deletedAt) || (actionLoading && actionType?.startsWith("updateModule") && targetId === t.id)}
                    />
                    <label htmlFor={`${t.id}-${mod}`} className="text-sm">
                      {mod}
                      {actionLoading && actionType === `updateModule-${mod}` && targetId === t.id && (
                        <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <Button
                variant="default"
                className="mt-4"
                onClick={() => handleViewDashboard(t.subdomain)}
                disabled={Boolean(t.deletedAt)}
                type="button"
              >
                View Dashboard
              </Button>
              {t.deletedAt ? (
                <>
                  <Button
                    variant="default"
                    className="mt-4 ml-2"
                    onClick={() => handleRestoreTenant(t.id)}
                    disabled={actionLoading && actionType === "restore" && targetId === t.id}
                    type="button"
                  >
                    {actionLoading && actionType === "restore" && targetId === t.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      "Restore"
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="mt-4 ml-2"
                    onClick={() => handleHardDeleteTenant(t.id)}
                    disabled={actionLoading && actionType === "hardDelete" && targetId === t.id}
                    type="button"
                  >
                    {actionLoading && actionType === "hardDelete" && targetId === t.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Permanently Delete"
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="destructive"
                  className="mt-4 ml-2"
                  onClick={() => handleSoftDeleteTenant(t.id)}
                  disabled={actionLoading && actionType === "softDelete" && targetId === t.id}
                  type="button"
                >
                  {actionLoading && actionType === "softDelete" && targetId === t.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Soft Deleting...
                    </>
                  ) : (
                    "Soft Delete"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <ClientToaster />
    </div>
  );
}