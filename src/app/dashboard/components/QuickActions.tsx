// src/app/dashboard/components/QuickActions.tsx
'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, Package, HardHat, Plus } from "lucide-react";
import { EditDialog } from "@/components/EditDialog";
import { Asset, WorkOrderPriority } from "@/lib/types";
import { createCall } from "@/app/dashboard/actions";
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface QuickActionsProps {
  assets: Asset[];
  onCreateWorkOrder: (data: Record<string, any>) => Promise<void>;
  onCreateCall: (data: Record<string, any>) => Promise<void>;
  onCreateAsset: (data: Record<string, any>) => Promise<void>;
}

export default function QuickActions({ 
  assets,
  onCreateWorkOrder,
  onCreateCall,
  onCreateAsset
}: QuickActionsProps) {
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);

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

  const assetFields = [
    { name: "name", label: "Asset Name", type: "text" as const, required: true },
    { name: "location", label: "Location", type: "text" as const, required: true },
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
    { name: "issue", label: "Issue Description", type: "text" as const, required: true },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2" 
              onClick={() => setIsCallDialogOpen(true)}
            >
              <AlertTriangle className="h-6 w-6" />
              <span>New Call</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2" 
              onClick={() => setIsWorkOrderDialogOpen(true)}
            >
              <CalendarDays className="h-6 w-6" />
              <span>New Work Order</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2"
            >
              <Package className="h-6 w-6" />
              <span>Add Part</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2"
              onClick={() => setIsAssetDialogOpen(true)}
            >
              <HardHat className="h-6 w-6" />
              <span>Add Asset</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditDialog
        open={isCallDialogOpen}
        onOpenChange={setIsCallDialogOpen}
        title="Create New Maintenance Call"
        description="Report a new maintenance issue"
        initialData={{ assetId: "", issue: ""}}
        fields={callFields}
        onSubmit={onCreateCall}
      />

<EditDialog
        open={isAssetDialogOpen}
        onOpenChange={setIsAssetDialogOpen}
        title="Create New Asset"
        description="Add new asset to your list"
        initialData={{ name: "", location: ""}}
        fields={assetFields}
        onSubmit={onCreateAsset}
      />

      <EditDialog
        open={isWorkOrderDialogOpen}
        onOpenChange={setIsWorkOrderDialogOpen}
        title="Create New Work Order"
        description="Fill in the details to create a new work order."
        initialData={{ assetIds: "", description: "", priority: WorkOrderPriority.LOW }}
        fields={workOrderFields}
        onSubmit={onCreateWorkOrder}
      />
    </>
  );
}