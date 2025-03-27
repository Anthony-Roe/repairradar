"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // Import toast directly from sonner
import ClientToaster from "@/components/ClientToaster"; // Only import the component
import { Loader2 } from "lucide-react";
import { ModuleManager } from "@/shared/modules/moduleManager";

const ALL_MODULES = ModuleManager.getAllModules();

type Tenant = { id: string; name: string; subdomain: string; config?: { modules: Record<string, boolean> } | null; deletedAt: string | null };
type ModuleConfig = Record<string, boolean>;

export default function AdminPanel() {
  const { data: session, status } = useSession();
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
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);

  const fetchTenants = useCallback(async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) setInitialLoading(true);
      const res = await fetch("/api/tenants");
      if (!res.ok) throw new Error(`Failed to fetch tenants: ${res.statusText}`);
      setTenants(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      toast.error("Could not load tenants");
    } finally {
      if (isInitialFetch) setInitialLoading(false);
    }
  }, []); // No dependencies, stable function

  useEffect(() => {
    if (!isMounted.current && status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchTenants(true); // Initial fetch
      isMounted.current = true;
    }
  }, [session, status, fetchTenants]);

  const handleCreateTenant = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (actionLoading) return;
      setActionLoading(true);
      setActionType("create");
      try {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTenant),
        });
        if (!res.ok) throw new Error(`Failed to create tenant: ${await res.text()}`);
        setNewTenant({ name: "", subdomain: "", modules: ALL_MODULES.reduce((acc, m) => ({ ...acc, [m]: false }), {} as ModuleConfig) });
        await fetchTenants();
        toast.success("Tenant created successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create tenant");
      } finally {
        setActionLoading(false);
        setActionType(null);
      }
    },
    [newTenant, fetchTenants, actionLoading]
  );

  const handleSoftDeleteTenant = useCallback(
    async (id: string) => {
      if (actionLoading) return;
      setActionLoading(true);
      setActionType("softDelete");
      setTargetId(id);
      try {
        const res = await fetch(`/api/tenants/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Action": "softDeleteTenant",
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(`Failed to soft delete tenant: ${await res.text()}`);
        await fetchTenants();
        toast.success(`Tenant ${id} soft deleted successfully`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not soft delete tenant");
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
        const res = await fetch(`/api/tenants/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Action": "restoreTenant",
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Restore failed:", errorText);
          throw new Error(`Failed to restore tenant: ${errorText}`);
        }
        await fetchTenants();
        toast.success("Tenant restored");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not restore tenant");
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
        const updatedModules = { ...tenant.config?.modules, [module]: enabled };
        const res = await fetch(`/api/tenants/${tenant.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Action": "updateTenant",
          },
          body: JSON.stringify({ modules: updatedModules }),
        });
        if (!res.ok) throw new Error(`Failed to update tenant modules: ${await res.text()}`);
        await fetchTenants();
        toast.success("Tenant modules updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update tenant modules");
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
        const res = await fetch(`/api/tenants/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`Failed to permanently delete tenant: ${await res.text()}`);
        await fetchTenants();
        toast.success("Tenant permanently deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not permanently delete tenant");
      } finally {
        setActionLoading(false);
        setActionType(null);
        setTargetId(null);
      }
    },
    [fetchTenants, actionLoading]
  );

  const handleViewDashboard = useCallback((subdomain: string) => {
    window.open("/" + subdomain, "_blank"); // Open in new tab to avoid leaving /admin
  }, []);

  const formatDeletedAt = (deletedAt: string | null) => {
    if (!deletedAt) return "";
    return new Date(deletedAt).toISOString().split("T")[0] + " " + new Date(deletedAt).toISOString().split("T")[1].split(".")[0];
  };

  if (status === "loading" || initialLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated" || session?.user?.role !== "SUPER_ADMIN") {
    router.push("/auth/signin");
    return null;
  }

  if (error) return <div className="p-6 text-red-500">{error}</div>;

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