// src/app/dashboard/components/FloatingActionButton.tsx
'use client';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EditDialog } from "@/components/EditDialog";
import { useState } from "react";
import { Asset, WorkOrderPriority } from "@/lib/types";
import { createCall, createWorkOrder } from "@/app/dashboard/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FloatingActionButtonProps {
  assets: Asset[];
  onCreateWorkOrder: (data: Record<string, any>) => Promise<void>;
  onCreateCall: (data: Record<string, any>) => Promise<void>;
}

export default function FloatingActionButton({ assets, onCreateWorkOrder, onCreateCall }: FloatingActionButtonProps) {
  const router = useRouter();
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);

  const workOrderFields = [
    {
      name: "assetIds",
      label: "Assets",
      type: "selectmulti" as const,
      required: true,
      options: assets.map(asset => ({
        value: asset.id,
        label: `${asset.name} (${asset.location})`,
      })),
    },
    { name: "description", label: "Description", type: "text" as const, required: true },
    {
      name: "priority",
      label: "Priority",
      type: "select" as const,
      required: true,
      options: Object.values(WorkOrderPriority).map(value => ({
        value,
        label: value.charAt(0) + value.slice(1).toLowerCase(),
      })),
    },
  ];

  const callFields = [
    {
      name: "assetId",
      label: "Asset",
      type: "select" as const,
      required: true,
      options: assets.map(asset => ({
        value: asset.id,
        label: `${asset.name} (${asset.location})`,
      })),
    },
    { 
      name: "issue", 
      label: "Issue Description", 
      type: "text" as const, 
      required: true 
    },
    {
      name: "priority",
      label: "Priority",
      type: "select" as const,
      required: true,
      options: [
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High" },
        { value: "CRITICAL", label: "Critical" },
      ],
    },
  ];

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => {
                setIsCallDialogOpen(true);
                setIsWorkOrderDialogOpen(false);
              }}
              className="rounded-full w-14 h-14 p-0 fixed bottom-6 right-6 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Create new call or work order</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Call Creation Dialog */}
      <EditDialog
        open={isCallDialogOpen}
        onOpenChange={setIsCallDialogOpen}
        title="Create New Maintenance Call"
        description="Report a new maintenance issue"
        initialData={{ assetId: "", issue: "", priority: "MEDIUM" }}
        fields={callFields}
        onSubmit={onCreateCall}
      />

      {/* Work Order Creation Dialog (existing) */}
      <EditDialog
        open={isWorkOrderDialogOpen}
        onOpenChange={setIsWorkOrderDialogOpen}
        title="Create New Work Order"
        description="Schedule maintenance work"
        initialData={{ assetIds: [], description: "", priority: WorkOrderPriority.MEDIUM }}
        fields={workOrderFields}
        onSubmit={onCreateWorkOrder}
      />
    </>
  );
}