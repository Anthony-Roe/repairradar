"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateAsset, updateWorkOrder, updateIncident, updateMaintenanceSchedule, updatePart } from "@/actions/models";
import { toast } from "sonner";
import { AssetStatus, WorkOrderStatus, CallStatus, MaintenanceStatus, CallPriority } from "@prisma/client";
import { useTenant } from "@/components/TenantProvider";
import { prisma } from "@/lib/prisma";

interface EditModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  modelType: "Asset" | "WorkOrder" | "Incident" | "MaintenanceSchedule" | "Part";
  modelId: string;
  tenantId: string;
}

interface FormData {
  name?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  serialNumber?: string | null;
  partNumber?: string | null;
  quantity?: number;
}

export default function EditModal({ open, setOpen, modelType, modelId }: EditModalProps) {
  const [formData, setFormData] = useState<FormData>({});
  const queryClient = useQueryClient();
  const tenant = useTenant();

  const { data: record, isLoading } = useQuery({
    queryKey: [modelType.toLowerCase(), modelId, tenant.id],
    queryFn: async () => {
      switch (modelType) {
        case "Asset":
          return prisma.asset.findUnique({ where: { id: modelId, tenantId: tenant.id }, select: { name: true, serialNumber: true, status: true } });
        case "WorkOrder":
          return prisma.workOrder.findUnique({ where: { id: modelId, tenantId: tenant.id }, select: { description: true, status: true, priority: true } });
        case "Incident":
          return prisma.incident.findUnique({ where: { id: modelId, tenantId: tenant.id }, select: { description: true, status: true, priority: true } });
        case "MaintenanceSchedule":
          return prisma.maintenanceSchedule.findUnique({ where: { id: modelId, tenantId: tenant.id }, select: { description: true, status: true, priority: true } });
        case "Part":
          return prisma.part.findUnique({ where: { id: modelId, tenantId: tenant.id }, select: { name: true, description: true, partNumber: true, quantity: true } });
        default:
          throw new Error("Invalid model type");
      }
    },
  });

  useEffect(() => {
    if (record) {
      setFormData({
        name: (record as any).name || undefined,
        description: (record as any).description || null,
        status: (record as any).status || undefined,
        priority: (record as any).priority || undefined,
        serialNumber: (record as any).serialNumber || null,
        partNumber: (record as any).partNumber || null,
        quantity: (record as any).quantity || undefined,
      });
    }
  }, [record]);

  const mutation = useMutation({
    mutationFn: async () => {
      switch (modelType) {
        case "Asset":
          return updateAsset({
            id: modelId,
            tenantId: tenant.id,
            name: formData.name!,
            serialNumber: formData.serialNumber,
            status: formData.status as AssetStatus,
          });
        case "WorkOrder":
          return updateWorkOrder({
            id: modelId,
            tenantId: tenant.id,
            description: formData.description!,
            status: formData.status as WorkOrderStatus,
            priority: formData.priority as CallPriority,
          });
        case "Incident":
          return updateIncident({
            id: modelId,
            tenantId: tenant.id,
            description: formData.description!,
            status: formData.status as CallStatus,
            priority: formData.priority as CallPriority,
          });
        case "MaintenanceSchedule":
          return updateMaintenanceSchedule({
            id: modelId,
            tenantId: tenant.id,
            description: formData.description!,
            status: formData.status as MaintenanceStatus,
            priority: formData.priority as CallPriority,
          });
        case "Part":
          return updatePart({
            id: modelId,
            tenantId: tenant.id,
            name: formData.name!,
            description: formData.description,
            partNumber: formData.partNumber,
            quantity: formData.quantity!,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [modelType.toLowerCase(), tenant.id] });
      toast(`Updated ${modelType}`);
      setOpen(false);
    },
    onError: (error: any) => {
      toast(`Failed to update ${modelType}`);
    },
  });

  if (isLoading) return null;

  const statusOptions = {
    Asset: Object.values(AssetStatus),
    WorkOrder: Object.values(WorkOrderStatus),
    Incident: Object.values(CallStatus),
    MaintenanceSchedule: Object.values(MaintenanceStatus),
    Part: [],
  }[modelType];

  const priorityOptions = {
    WorkOrder: Object.values(CallPriority),
    Incident: Object.values(CallPriority),
    MaintenanceSchedule: Object.values(CallPriority),
    Asset: [],
    Part: [],
  }[modelType];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {modelType}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          {["Asset", "Part"].includes(modelType) && (
            <div>
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}
          {["WorkOrder", "Incident", "MaintenanceSchedule"].includes(modelType) && (
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
          )}
          {modelType === "Part" && (
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          )}
          {["Asset"].includes(modelType) && (
            <div>
              <label htmlFor="serialNumber" className="text-sm font-medium">
                Serial Number
              </label>
              <Input
                id="serialNumber"
                value={formData.serialNumber || ""}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>
          )}
          {["Part"].includes(modelType) && (
            <div>
              <label htmlFor="partNumber" className="text-sm font-medium">
                Part Number
              </label>
              <Input
                id="partNumber"
                value={formData.partNumber || ""}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
              />
            </div>
          )}
          {["Part"].includes(modelType) && (
            <div>
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity
              </label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity || 0}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>
          )}
          {statusOptions.length > 0 && (
            <div>
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {priorityOptions.length > 0 && (
            <div>
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}