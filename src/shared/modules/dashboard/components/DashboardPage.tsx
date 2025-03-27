// File: E:\Dev\websites\repairradar\src\shared\modules\dashboard\components\DashboardPage.tsx
"use client";
import { useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAssetData, useCallData, usePMData, useWorkOrderData, useTenantConfig, dynamicFetch, useVendorData, useInventoryData } from "@/shared/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface ModuleMetrics {
  total?: number;
  active?: number;
  open?: number;
  scheduled?: number;
  pending?: number;
}

type DashboardMetrics = Record<string, ModuleMetrics>;

// Define a unified task type
interface DashboardTask {
  id: string;
  type: "call" | "work-order" | "pm";
  description: string;
  status: string;
  priority?: string;
  dueDate?: Date | null;
  assetNames: string[];
  link: string;
}

interface DashboardPageProps {
  tenant: string;
  activeModules?: Module[];
  onSelectModule?: (module: Module) => void;
}

export default function DashboardPage({ tenant, activeModules = [], onSelectModule }: DashboardPageProps) {
  const { status } = useSession();
  const router = useRouter();

  const breadcrumbItems = [{ label: "Dashboard" }];

  // Data hooks
  const { data: tenantConfig, isLoading: tenantLoading } = useTenantConfig(tenant);
  const { data: assetsData, isLoading: assetsLoading, refetch: refetchAssets } = useAssetData(tenant);
  const { data: callsData, isLoading: callsLoading, refetch: refetchCalls } = useCallData(tenant);
  const { data: pmData, isLoading: pmLoading, refetch: refetchPms } = usePMData(tenant);
  const { data: woData, isLoading: woLoading, refetch: refetchWorkOrders } = useWorkOrderData(tenant);
  const { data: vendorsData, isLoading: vdLoading, refetch: refetchVendorData } = useVendorData(tenant);
  const { data: partsData, isLoading: pdLoading, refetch: refetchInventory } = useInventoryData(tenant);

  // Memoized metrics calculation
  const calculatedMetrics = useMemo<DashboardMetrics>(() => {
    if (!tenantConfig || tenantLoading) {
      return {
        assets: {},
        calls: {},
        "preventative-maintenance": {},
        "work-orders": {},
      };
    }

    return {
      assets: assetsData
        ? { total: assetsData.length, active: assetsData.filter((a) => !a.deletedAt).length }
        : {},
      calls: callsData
        ? { total: callsData.length, open: callsData.filter((c) => c.status === "OPEN").length }
        : {},
      "preventative-maintenance": pmData
        ? { total: pmData.length, scheduled: pmData.filter((p) => p.status === "SCHEDULED").length }
        : {},
      "work-orders": woData
        ? {
            total: woData.length,
            pending: woData.filter((w) => w.status === "PENDING").length,
            active: woData.filter((w) => w.status === "IN_PROGRESS").length,
          }
        : {},
      inventory: partsData
        ? {
            total: partsData.length,
            lowStock: partsData.filter((p) => p.quantity < p.minStock).length,
            active: partsData.filter((p) => !p.deletedAt).length,
          }
        : {},
      vendors: vendorsData
        ? { total: vendorsData.length, active: vendorsData.filter((v) => !v.deletedAt).length }
        : {},
    };
  }, [tenantConfig, tenantLoading, assetsData, callsData, pmData, woData, partsData, vendorsData]);

  // Memoized tasks calculation
  const tasks = useMemo<DashboardTask[]>(() => {
    const allTasks: DashboardTask[] = [];

    if (callsData) {
      callsData
        .filter((c) => c.status === "OPEN")
        .forEach((call) => {
          const asset = assetsData?.find((a) => a.id === call.assetId);
          allTasks.push({
            id: call.id,
            type: "call",
            description: call.issue,
            status: call.status,
            assetNames: asset ? [asset.name] : [],
            link: `/${tenant}/calls`,
          });
        });
    }

    if (woData) {
      woData
        .filter((w) => w.status === "PENDING" || w.status === "IN_PROGRESS")
        .forEach((wo) => {
          const assetNames = wo.assets.map((a) => a.asset.name);
          allTasks.push({
            id: wo.id,
            type: "work-order",
            description: wo.description,
            status: wo.status,
            priority: wo.priority,
            dueDate: wo.dueDate ? new Date(wo.dueDate) : null,
            assetNames,
            link: `/${tenant}/work-orders`,
          });
        });
    }

    if (pmData) {
      pmData
        .filter((p) => p.status === "SCHEDULED" && new Date(p.nextRun) <= new Date())
        .forEach((pm) => {
          const assetNames = pm.assets.map((a) => a.asset.name);
          allTasks.push({
            id: pm.id,
            type: "pm",
            description: pm.description,
            status: pm.status,
            priority: pm.priority,
            dueDate: new Date(pm.nextRun),
            assetNames,
            link: `/${tenant}/preventative-maintenance`,
          });
        });
    }

    return allTasks.sort((a, b) => (b.dueDate?.getTime() || 0) - (a.dueDate?.getTime() || 0));
  }, [callsData, woData, pmData, assetsData, tenant]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([refetchWorkOrders(), refetchAssets(), refetchCalls(), refetchPms()]);
      toast.success("Data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  }, [refetchWorkOrders, refetchAssets, refetchCalls, refetchPms]);

  // Quick action to mark a task as complete
  const handleMarkComplete = useCallback(
    async (task: DashboardTask) => {
      try {
        if (task.type === "call") {
          await dynamicFetch("calls", tenant, "PUT", {
            id: task.id,
            body: { status: "CLOSED" },
          });
        } else if (task.type === "work-order") {
          await dynamicFetch("work-orders", tenant, "PUT", {
            id: task.id,
            body: { status: "COMPLETED" },
          });
        } else if (task.type === "pm") {
          await dynamicFetch("preventative-maintenance", tenant, "PUT", {
            id: task.id,
            body: { status: "COMPLETED" },
          });
        }
        await handleRefresh();
        toast.success(`${task.type} marked as complete`);
      } catch (error) {
        toast.error(`Failed to update ${task.type}`);
      }
    },
    [tenant, handleRefresh]
  );

  // Auth and initial load
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      handleRefresh();
    }
  }, [status, router, handleRefresh]);

  // Comprehensive loading state
  if (tenantLoading || assetsLoading || callsLoading || pmLoading || woLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Breadcrumb tenant={tenant} items={breadcrumbItems} onSelectModule={onSelectModule} />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold">Dashboard - {tenant}</h1>
        <Button variant="outline" onClick={handleRefresh} disabled={tenantLoading || assetsLoading || callsLoading || pmLoading || woLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(calculatedMetrics).map(([module, moduleMetrics]) => (
          <Card key={module}>
            <CardHeader>
              <CardTitle>
                {module
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {Object.entries(moduleMetrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <dt className="text-sm text-muted-foreground">
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </dt>
                    <dd>
                      <Badge variant="secondary">{value ?? "N/A"}</Badge>
                    </dd>
                  </div>
                ))}
                {Object.keys(moduleMetrics).length === 0 && (
                  <div className="text-sm text-muted-foreground">No data available</div>
                )}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      No pending tasks
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Badge>
                          {task.type === "call"
                            ? "Call"
                            : task.type === "work-order"
                            ? "Work Order"
                            : "PM"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{task.description || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {task.assetNames.length > 0 ? (
                            task.assetNames.map((name, idx) => (
                              <Badge key={idx} variant="outline">
                                {name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.priority ? (
                          <Badge
                            variant={
                              task.priority === "HIGH"
                                ? "destructive"
                                : task.priority === "MEDIUM"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                          </Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.status === "OPEN" || task.status === "SCHEDULED"
                              ? "secondary"
                              : task.status === "PENDING"
                              ? "outline"
                              : "default"
                          }
                        >
                          {task.status.charAt(0) + task.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? task.dueDate.toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkComplete(task)}
                          title="Mark Complete"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Link href={task.link} passHref>
                          <Button variant="ghost" size="sm" title="View Details">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
