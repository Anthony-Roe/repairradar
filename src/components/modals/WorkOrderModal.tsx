"use client";

import { useRouter } from "next/navigation";
import { Prisma, WorkOrderStatus, CallPriority } from "@prisma/client";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { createWorkOrder, updateWorkOrder } from "@/actions/work-orders";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const workOrderFormSchema = z.object({
  tenantId: z.string(),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["PENDING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  maintenanceId: z.string().optional().nullable(),
  dueDate: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderFormSchema>;

interface WorkOrderModalProps {
  workOrder?: Prisma.WorkOrderGetPayload<{}>;
  tenantId: string;
  maintenanceSchedules: Prisma.MaintenanceScheduleGetPayload<{}>[];
}

export function WorkOrderModal({
  workOrder,
  tenantId,
  maintenanceSchedules,
}: WorkOrderModalProps) {
  const router = useRouter();

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      tenantId,
      description: workOrder?.description ?? "",
      status: workOrder?.status ?? "PENDING",
      priority: workOrder?.priority ?? "MEDIUM",
      maintenanceId: workOrder?.maintenanceId ?? null,
      dueDate: workOrder?.dueDate?.toISOString().split("T")[0] ?? "",
    },
  });

  const handleSubmit = async (data: WorkOrderFormData) => {
    try {
      const submitData: Prisma.WorkOrderUncheckedCreateInput = {
        tenantId: data.tenantId,
        description: data.description,
        status: data.status as WorkOrderStatus,
        priority: data.priority as CallPriority,
        maintenanceId: data.maintenanceId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      };

      if (workOrder?.id) {
        await updateWorkOrder(workOrder.id, submitData);
        toast.success("Work order updated successfully");
      } else {
        await createWorkOrder(submitData);
        toast.success("Work order created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save work order");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{workOrder ? "Edit Work Order" : "Create Work Order"}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maintenanceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Schedule</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select maintenance schedule" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {maintenanceSchedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {schedule.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit">{workOrder ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}