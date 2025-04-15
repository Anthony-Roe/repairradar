"use client";

import { useRouter } from "next/navigation";
import { Prisma, AssetStatus } from "@prisma/client";
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
import { createAsset, updateAsset } from "@/actions/assets";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const assetFormSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1, "Name is required"),
  assetTypeId: z.string().optional().nullable(),
  location: z.string().optional(),
  status: z.enum(["OPERATIONAL", "MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"]),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

interface AssetModalProps {
  asset?: Prisma.AssetGetPayload<{}>;
  tenantId: string;
  assetTypes: Prisma.AssetTypeGetPayload<{}>[];
}

export function AssetModal({ asset, tenantId, assetTypes }: AssetModalProps) {
  const router = useRouter();

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      tenantId,
      name: asset?.name ?? "",
      assetTypeId: asset?.assetTypeId ?? null,
      location: asset?.location ?? "",
      status: asset?.status ?? "OPERATIONAL",
      serialNumber: asset?.serialNumber ?? "",
      purchaseDate: asset?.purchaseDate?.toISOString().split("T")[0] ?? "",
    },
  });

  const handleSubmit = async (data: AssetFormData) => {
    try {
      const submitData: Prisma.AssetUncheckedCreateInput = {
        tenantId: data.tenantId,
        name: data.name,
        assetTypeId: data.assetTypeId,
        location: data.location,
        status: data.status as AssetStatus,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      };

      if (asset?.id) {
        await updateAsset(asset.id, submitData);
        toast.success("Asset updated successfully");
      } else {
        await createAsset(submitData);
        toast.success("Asset created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save asset");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{asset ? "Edit Asset" : "Create Asset"}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter asset name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assetTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assetTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter location" />
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
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                    <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter serial number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
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
            <Button type="submit">{asset ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}