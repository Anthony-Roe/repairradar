// File: E:\Dev\websites\repairradar\src\shared\modules\preventative-maintenance\components\PreventativeMaintenancePage.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { MaintenanceSchedule, Asset } from "@prisma/client";
import { usePMData, useAssetData, dynamicFetch } from "@/shared/lib/hooks";

type MaintenanceScheduleWithRelations = MaintenanceSchedule & {
  assets: { asset: Asset }[];
  assignedTo?: { email: string } | null;
};

// Utility to format recurrence for display
const formatRecurrence = (type: string, interval: number) =>
  `${interval} ${type}${interval > 1 ? "s" : ""}`;

export default function PreventativeMaintenancePage({ tenant }: { tenant: string }) {
  const { status } = useSession();
  const router = useRouter();

  // Data hooks
  const { data: schedules = [], isLoading: pmLoading, refetch: refetchPM } = usePMData(tenant);
  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useAssetData(tenant);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    recurrence: { type: "monthly" as "daily" | "weekly" | "monthly", interval: 1 },
    nextRun: new Date().toISOString().slice(0, 16),
    assetIds: [] as string[],
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
  });

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([refetchPM(), refetchAssets()]);
      toast.success("Maintenance schedules and assets refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  }, [refetchPM, refetchAssets]);

  // Filter schedules
  const filteredSchedules = useCallback(() => {
    return schedules.filter((schedule) => {
      const description = schedule.description || "";
      const assetNames = schedule.assets.map((a) => a.asset.name || "").join(" ");
      return (
        searchTerm === "" ||
        description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assetNames.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [schedules, searchTerm]);

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.description || formData.assetIds.length === 0) {
        toast.error("Description and at least one asset are required");
        return;
      }

      try {
        await dynamicFetch<MaintenanceScheduleWithRelations>("preventative-maintenance", tenant, "POST", {
          body: { subdomain: tenant, ...formData },
        });
        setFormData({
          description: "",
          recurrence: { type: "monthly", interval: 1 },
          nextRun: new Date().toISOString().slice(0, 16),
          assetIds: [],
          priority: "MEDIUM",
        });
        setIsCreating(false);
        await handleRefresh();
        toast.success("Maintenance scheduled successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to schedule maintenance");
      }
    },
    [formData, tenant, handleRefresh]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      handleRefresh();
    }
  }, [status, router, handleRefresh]);

  // Loading state
  if (pmLoading || assetsLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Preventative Maintenance - {tenant}</h1>
          <p className="text-sm text-muted-foreground">Schedule and manage maintenance tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={pmLoading || assetsLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Maintenance Schedules</CardTitle>
              <CardDescription>
                {filteredSchedules().length} {filteredSchedules().length === 1 ? "schedule" : "schedules"} found
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description or asset..."
                className="pl-9 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create Form */}
          {isCreating && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the maintenance task..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Recurrence Type *</label>
                  <Select
                    value={formData.recurrence.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, type: value as "daily" | "weekly" | "monthly" },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interval *</label>
                  <Input
                    type="number"
                    value={formData.recurrence.interval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, interval: parseInt(e.target.value) || 1 },
                      })
                    }
                    min="1"
                    placeholder="Interval"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Next Run *</label>
                  <Input
                    type="datetime-local"
                    value={formData.nextRun}
                    onChange={(e) => setFormData({ ...formData, nextRun: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value as "LOW" | "MEDIUM" | "HIGH" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Assets *</label>
                  <Select
                    onValueChange={(value) => {
                      if (!formData.assetIds.includes(value)) {
                        setFormData({ ...formData, assetIds: [...formData.assetIds, value] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets
                        .filter((a) => !formData.assetIds.includes(a.id))
                        .map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.assetIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.assetIds.map((id) => {
                        const asset = assets.find((a) => a.id === id);
                        return asset ? (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            {asset.name}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  assetIds: formData.assetIds.filter((aid) => aid !== id),
                                })
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={!formData.description || formData.assetIds.length === 0}>
                    Schedule
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Schedules Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    {searchTerm ? "No matching schedules found" : "No schedules available"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchedules().map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.description || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {schedule.assets.length > 0 ? (
                          schedule.assets.map(({ asset }) => (
                            <Badge key={asset.id} variant="outline">
                              {asset.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatRecurrence(schedule.recurrence.type, schedule.recurrence.interval)}</TableCell>
                    <TableCell>{new Date(schedule.nextRun).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          schedule.priority === "HIGH"
                            ? "destructive"
                            : schedule.priority === "MEDIUM"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {schedule.priority.charAt(0) + schedule.priority.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          schedule.status === "COMPLETED"
                            ? "default"
                            : schedule.status === "SCHEDULED"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {schedule.status.charAt(0) + schedule.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}