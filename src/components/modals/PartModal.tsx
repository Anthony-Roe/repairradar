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
import { createPart, updatePart } from "@/actions/parts";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const partFormSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1, "Name is required"),
  partNumber: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  minStock: z.number().min(0, "Min stock cannot be negative"),
  unitCost: z.number().min(0, "Unit cost cannot be negative").optional().nullable(),
});

type PartFormData = z.infer<typeof partFormSchema>;

interface PartModalProps {
  part?: Prisma.PartGetPayload<{}>;
  tenantId: string;
}

export function PartModal({ part, tenantId }: PartModalProps) {
  const router = useRouter();

  const form = useForm<PartFormData>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      tenantId,
      name: part?.name ?? "",
      partNumber: part?.partNumber ?? "",
      description: part?.description ?? "",
      quantity: part?.quantity ?? 0,
      minStock: part?.minStock ?? 0,
      unitCost: part?.unitCost ? Number(part.unitCost) : null,
    },
  });

  const handleSubmit = async (data: PartFormData) => {
    try {
      const submitData: Prisma.PartUncheckedCreateInput = {
        tenantId: data.tenantId,
        name: data.name,
        partNumber: data.partNumber,
        description: data.description,
        quantity: data.quantity,
        minStock: data.minStock,
        unitCost: data.unitCost,
      };

      if (part?.id) {
        await updatePart(part.id, submitData);
        toast.success("Part updated successfully");
      } else {
        await createPart(submitData);
        toast.success("Part created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save part");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{part ? "Edit Part" : "Create Part"}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter part name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="partNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Part Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter part number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    placeholder="Enter quantity"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Stock</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    placeholder="Enter min stock"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                    placeholder="Enter unit cost"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit">{part ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}