// src/app/(tenant)/[tenant]/dashboard/client.tsx
"use client";
import { Suspense, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { WorkOrdersTable } from "@/components/dashboard/WorkOrdersTable";
import { LowStockItems } from "@/components/dashboard/LowStockItems";
import { MaintenanceCalls } from "@/components/dashboard/MaintenanceCalls";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ModalContainer } from "@/components/modals/modal-container";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import AssetStatusComp from "@/components/dashboard/AssetStatus";
import { FloatingActionButton } from "@/components/dashboard/FloatingActionButton";
import { LoadingState } from "@/components/FetchStates";
import { Asset, Incident, MaintenanceSchedule, Part, WorkOrder } from "@/prisma";
import { createQueryClient } from "@/lib/query";

interface DashboardClientProps {
  tenantId: string;
  subdomain: string;
}

export default function DashboardClient({ tenantId, subdomain }: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const queryClient = createQueryClient();

  // Fetch data using React Query
  const { data: assets, isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["assets", tenantId],
  }, queryClient);
  const { data: workOrders, isLoading: workOrdersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["workOrders", tenantId],
  }, queryClient);
  const { data: maintenance, isLoading: maintenanceLoading } = useQuery<MaintenanceSchedule[]>({
    queryKey: ["maintenance", tenantId],
  }, queryClient);
  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["incidents", tenantId],
  }, queryClient);
  const { data: parts, isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["parts", tenantId],
  }, queryClient);

  if (assetsLoading || workOrdersLoading || maintenanceLoading || incidentsLoading || partsLoading) {
    return <LoadingState />;
  }

  if (!tenantId || !subdomain || !assets || !workOrders || !maintenance || !incidents || !parts) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <LowStockAlert parts={parts} />
      <Suspense fallback={<div>Loading dashboard...</div>}>
        {activeTab === "overview" && (
          <>
            <StatsCards
              assetsCount={assets.length}
              incidentsCount={incidents.length}
              maintenanceCount={maintenance.length}
              workOrdersCount={workOrders.length}
            />
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="work-orders">
                <AccordionTrigger>Work Orders</AccordionTrigger>
                <AccordionContent>
                  <WorkOrdersTable workOrders={workOrders} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="maintenance-calls">
                <AccordionTrigger>Upcoming Maintenance</AccordionTrigger>
                <AccordionContent>
                  <MaintenanceCalls schedules={maintenance} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <LowStockItems parts={parts} />
          </>
        )}
        {activeTab === "assets" && <AssetStatusComp assets={assets} calls={incidents} />}
        {activeTab === "work-orders" && <WorkOrdersTable workOrders={workOrders} />}
        <QuickActions/>
      </Suspense>
      <FloatingActionButton
        actions={[
          { label: "New Work Order", href: `/${subdomain}/work-order/new` },
          { label: "New Asset", href: `/${subdomain}/asset/new` },
          { label: "New Part", href: `/${subdomain}/part/new` },
          { label: "New Incident", href: `/${subdomain}/incident/new` },
          { label: "New Maintenance", href: `/${subdomain}/maintenance/new` },
          { label: "New User", href: `/${subdomain}/user/new` },
          { label: "New Vendor", href: `/${subdomain}/vendor/new` },
        ]}
      />
      <ModalContainer tenantId={tenantId} />
    </div>
  );
}