"use client";

import { useRouter } from "next/navigation";
import { Prisma, CallStatus, CallPriority } from "@prisma/client";
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
import { createIncident, updateIncident } from "@/actions/incidents";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const incidentFormSchema = z.object({
  tenantId: z.string(),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "CLOSED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  assetId: z.string().optional().nullable(),
  reportedById: z.string().optional().nullable(),
  reportedAt: z.string().optional(),
});

type IncidentFormData = z.infer<typeof incidentFormSchema>;

interface IncidentModalProps {
  incident?: Prisma.IncidentGetPayload<{}>;
  tenantId: string;
  assets: Prisma.AssetGetPayload<{}>[];
  users: Prisma.UserGetPayload<{}>[];
}

export function IncidentModal({ incident, tenantId, assets, users }: IncidentModalProps) {
  const router = useRouter();

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      tenantId,
      description: incident?.description ?? "",
      status: incident?.status ?? "OPEN",
      priority: incident?.priority ?? "MEDIUM",
      assetId: incident?.assetId ?? null,
      reportedById: incident?.reportedById ?? null,
      reportedAt: incident?.reportedAt?.toISOString().split("T")[0] ?? "",
    },
  });

  const handleSubmit = async (data: IncidentFormData) => {
    try {
      const submitData: Prisma.IncidentUncheckedCreateInput = {
        tenantId: data.tenantId,
        description: data.description,
        status: data.status as CallStatus,
        priority: data.priority as CallPriority,
        assetId: data.assetId,
        reportedById: data.reportedById,
        reportedAt: data.reportedAt ? new Date(data.reportedAt) : undefined,
      };

      if (incident?.id) {
        await updateIncident(incident.id, submitData);
        toast.success("Incident updated successfully");
      } else {
        await createIncident(submitData);
        toast.success("Incident created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save incident");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{incident ? "Edit Incident" : "Create Incident"}</h2>
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
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
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
            name="assetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
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
            name="reportedById"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reported By</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
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
            name="reportedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reported At</FormLabel>
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
            <Button type="submit">{incident ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}