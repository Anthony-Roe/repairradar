"use client";

import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";
import {
  Button,
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { createVendor, updateVendor } from "@/actions/vendors";
import { toast } from "sonner";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const vendorFormSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1, "Name is required"),
  contactInfo: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

type VendorFormData = z.infer<typeof vendorFormSchema>;

interface VendorModalProps {
  vendor?: Prisma.VendorGetPayload<{}>;
  tenantId: string;
}

export function VendorModal({ vendor, tenantId }: VendorModalProps) {
  const router = useRouter();

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      tenantId,
      name: vendor?.name ?? "",
      contactInfo: vendor?.contactInfo
        ? (vendor.contactInfo as { email?: string; phone?: string; address?: string })
        : {},
    },
  });

  const handleSubmit: SubmitHandler<VendorFormData> = async (data) => {
    try {
      const submitData: Prisma.VendorUncheckedCreateInput = {
        ...data
      };

      if (vendor?.id) {
        await updateVendor(vendor.id, submitData);
        toast.success("Vendor updated successfully");
      } else {
        await createVendor(submitData);
        toast.success("Vendor created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save vendor");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{vendor ? "Edit Vendor" : "Create Vendor"}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter vendor name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactInfo.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter email" type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactInfo.phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter phone number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactInfo.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit">{vendor ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}