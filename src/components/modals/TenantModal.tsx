"use client";

import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";
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
import { createTenant, updateTenant } from "@/actions/tenants";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subdomain: z.string().min(1, "Subdomain is required"),
  parentId: z.string().optional().nullable(),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantModalProps {
  tenant?: Prisma.TenantGetPayload<{}>;
  tenants: Prisma.TenantGetPayload<{}>[];
}

export function TenantModal({ tenant, tenants }: TenantModalProps) {
  const router = useRouter();

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: tenant?.name ?? "",
      subdomain: tenant?.subdomain ?? "",
      parentId: tenant?.parentId ?? null,
    },
  });

  const handleSubmit = async (data: TenantFormData) => {
    try {
      const submitData: Prisma.TenantUncheckedCreateInput = {
        name: data.name,
        subdomain: data.subdomain,
        parentId: data.parentId,
      };

      if (tenant?.id) {
        await updateTenant(tenant.id, submitData);
        toast.success("Tenant updated successfully");
      } else {
        await createTenant(submitData);
        toast.success("Tenant created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save tenant");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{tenant ? "Edit Tenant" : "Create Tenant"}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter tenant name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subdomain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subdomain</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter subdomain" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Tenant</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent tenant" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit">{tenant ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}