"use client";

import { useRouter } from "next/navigation";
import { Prisma, MaintenanceTrigger, MaintenanceStatus, CallPriority } from "@prisma/client";
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
import { createMaintenanceSchedule, updateMaintenanceSchedule } from "@/actions/maintenance";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const maintenanceFormSchema = z.object({
  tenantId: z.string(),
  description: z.string().min(1, "Description is required"),
  triggerType: z.enum(["TIME_BASED", "METER_BASED"]),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  meterId: z.string().optional().nullable(),
  thresholdValue: z.number().min(0, "Threshold cannot be negative").optional().nullable(),
  nextRun: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;

interface MaintenanceScheduleModalProps {
  schedule?: Prisma.MaintenanceScheduleGetPayload<{}>;
  tenantId: string;
  meters: Prisma.MeterGetPayload<{}>[];
}

export function MaintenanceScheduleModal({
  schedule,
  tenantId,
  meters,
}: MaintenanceScheduleModalProps) {
  const router = useRouter();

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      tenantId,
      description: schedule?.description ?? "",
      triggerType: schedule?.triggerType ?? "TIME_BASED",
      status: schedule?.status ?? "SCHEDULED",
      priority: schedule?.priority ?? "MEDIUM",
      meterId: schedule?.meterId ?? null,
      thresholdValue: schedule?.thresholdValue ? Number(schedule.thresholdValue) : null,
      nextRun: schedule?.nextRun?.toISOString().split("T")[0] ?? "",
    },
  });

  const handleSubmit = async (data: MaintenanceFormData) => {
    try {
      const submitData: Prisma.MaintenanceScheduleUncheckedCreateInput = {
        tenantId: data.tenantId,
        description: data.description,
        triggerType: data.triggerType as MaintenanceTrigger,
        status: data.status as MaintenanceStatus,
        priority: data.priority as CallPriority,
        meterId: data.meterId,
        thresholdValue: data.thresholdValue,
        nextRun: data.nextRun ? new Date(data.nextRun) : null,
      };

      if (schedule?.id) {
        await updateMaintenanceSchedule(schedule.id, submitData);
        toast.success("Maintenance schedule updated successfully");
      } else {
        await createMaintenanceSchedule(submitData);
        toast.success("Maintenance schedule created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save maintenance schedule");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {schedule ? "Edit Maintenance Schedule" : "Create Maintenance Schedule"}
      </h2>
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
            name="triggerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trigger Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TIME_BASED">Time Based</SelectItem>
                    <SelectItem value="METER_BASED">Meter Based</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
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
            name="meterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meter</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select meter" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {meters.map((meter) => (
                      <SelectItem key={meter.id} value={meter.id}>
                        {meter.name}
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
            name="thresholdValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Threshold Value</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                    placeholder="Enter threshold value"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nextRun"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Run</FormLabel>
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
            <Button type="submit">{schedule ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}