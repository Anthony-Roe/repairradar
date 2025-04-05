// src/app/dashboard/client.tsx
'use client';
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import DashboardHeader from "./components/DashboardHeader";
import SearchAndFilters from "./components/SearchAndFilters";
import StatsCards from "./components/StatsCards";
import MaintenanceCalls from "./components/MaintenanceCalls";
import RecentWorkOrders from "./components/RecentWorkOrders";
import AssetStatus from "./components/AssetStatus";
import LowStockItems from "./components/LowStockItems";
import QuickActions from "./components/QuickActions";
import FloatingActionButton from "./components/FloatingActionButton";
import { endCall, createWorkOrder, addWorkOrderNote, createCall, createAsset } from "@/app/dashboard/actions";
import { transformData } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AssetMapEditor from "./components/AssetMapEditor";
import { DashboardData } from "@/types/dashboard";
import { Asset, CallStatus, Incident, Part, Vendor, WorkOrder } from "@prisma/client";

type DashboardArrayItem = Asset | Incident | WorkOrder | Part | Vendor;

export default function Dashboard(initialData: DashboardData) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  const filteredAssets = data.assets.filter(
    (asset) =>
      asset?.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.location?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCalls = data.incident.filter(
    (call) =>
      call.issue.toLowerCase().includes(search.toLowerCase()) ||
      data.assets
        .find((asset) => asset.id === call.assetId)
        ?.name.toLowerCase()
        .includes(search.toLowerCase())
  );

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard");
      const newData = await response.json();
      setData(newData);
      toast.success("Data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async (callId: string) => {
    const { error } = await endCall(callId);
    if (!error) {
      setData((prev) => ({
        ...prev,
        calls: prev.calls.map((call) =>
          call.id === callId ? { ...call, status: CallStatus.CLOSED } : call
        ),
      }));
      toast.success("Call resolved successfully");
    } else {
      toast.error("Failed to resolve call");
    }
  };

  const handleWorkOrderSubmit = async (data: Record<string, any>) => {
    try {
      const { error } = await createWorkOrder([data.assetIds], data.description);
      if (error) throw new Error(error || "Failed to create work order");
      toast.success("Work Order created successfully!");
    } catch (error) {
      toast.error(`Error: ${error}`);
    }
  };

  const handleCreateCall = async (data: Record<string, any>) => {
    try {
      const { error } = await createCall({assetId: data.assetId, issue: data.issue});
      if (error) throw new Error(error || "Failed to create work order");
      toast.success("Work Order created successfully!");
    } catch (error) {
      toast.error(`Error: ${error}`);
    }
  };

  const handleAddNote = async (workOrderId: string, note: string) => {
    const { error } = await addWorkOrderNote(workOrderId, note);
    if (!error) {
      toast.success("Note added successfully");
    } else {
      toast.error("Failed to add note");
    }
  };

  const hanldeCreateAsset = async (data: Record<string, any> ) => {
    const { error } = await createAsset({name: data.name, location: data.location});
    if (!error) {
      toast.success("Asset added successfully");
    } else {
      toast.error("Failed to add asset");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") setData((prev) => ({ ...prev, user: session?.user }));
        else if (event === "SIGNED_OUT") router.push("/login");
      }
    );

    const handleChange = (payload: any, key: keyof DashboardData) => {
      setData((prev: DashboardData) => {
        if (key === "meta") return prev;
        const items: DashboardArrayItem[] = [...prev[key as keyof Omit<DashboardData, "meta">]];
        const newItem = transformData(payload.new);
        const oldItem = payload.old ? transformData(payload.old) : {};

        switch (payload.eventType) {
          case "INSERT":
            if (newItem && "id" in newItem) items.push(newItem as DashboardArrayItem);
            break;
          case "UPDATE":
            if (newItem && "id" in newItem) {
              const index = items.findIndex((item) => item.id === newItem.id);
              if (index !== -1) items[index] = newItem as DashboardArrayItem;
            }
            break;
          case "DELETE":
            if (oldItem && "id" in oldItem) {
              return { ...prev, [key]: items.filter((item) => item.id !== oldItem.id) };
            }
            break;
          default:
            return prev;
        }

        return { ...prev, [key]: items };
      });
    };

    const channels = [
      supabase
        .channel("assets-channel")
        .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, (payload) =>
          handleChange(payload, "assets")
        )
        .subscribe(),
      supabase
        .channel("calls-channel")
        .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, (payload) =>
          handleChange(payload, "calls")
        )
        .subscribe(),
      supabase
        .channel("work-orders-channel")
        .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, (payload) =>
          handleChange(payload, "workOrders")
        )
        .subscribe(),
      supabase
        .channel("parts-channel")
        .on("postgres_changes", { event: "*", schema: "public", table: "parts" }, (payload) =>
          handleChange(payload, "parts")
        )
        .subscribe(),
    ];

    return () => {
      subscription?.unsubscribe();
      channels.forEach((channel) => channel.unsubscribe());
    };
  }, [router]);

  return (
    <div className="min-h-screen border-border font-sans antialiased">
      <div className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center grid auto">
          <DashboardHeader
            meta={data.meta}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <StatsCards {...data} />

        <SearchAndFilters
          search={search}
          setSearch={setSearch}
          loading={loading}
          refreshData={refreshData}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {data.calls.filter(call => call.status !== CallStatus.CLOSED).length > 0 && (
              <MaintenanceCalls
                calls={filteredCalls.filter(call => call.status !== CallStatus.CLOSED)}
                assets={data.assets}
                expandedCall={expandedCall}
                setExpandedCall={setExpandedCall}
                handleEndCall={handleEndCall}
              />
            )}

            <RecentWorkOrders 
              workOrders={data.workOrders} 
              onUpdate={(updatedWorkOrder) => {
                setData(prev => ({
                  ...prev,
                  workOrders: prev.workOrders.map(wo => 
                    wo.id === updatedWorkOrder.id ? updatedWorkOrder : wo
                  )
                }));
              }}
              onAddNote={handleAddNote} // Use the same handleAddNote from earlier
            />
          </div>

          <div className="space-y-6 flex flex-col h-full">
            <div className="flex-1">
              <AssetStatus assets={data.assets} calls={data.calls} />
            </div>
            <div className="flex-1">
              <AssetMapEditor assets={data.assets} calls={data.calls} />
            </div>
            {data.parts.filter(part => part.quantity <= part.minStock).length > 0 && (
              <div className="flex-1">
                <LowStockItems parts={data.parts.filter(part => part.quantity <= part.minStock)} />
              </div>
            )}
            <div className="flex-1">
              <QuickActions 
                assets={data.assets} 
                onCreateWorkOrder={handleWorkOrderSubmit}
                onCreateCall={handleCreateCall}
                onCreateAsset={hanldeCreateAsset}
              />
            </div>
          </div>
        </div>
      </div>

      <FloatingActionButton 
        onCreateWorkOrder={handleWorkOrderSubmit}
        onCreateCall={handleCreateCall}
        assets={data.assets}
      />
    </div>
  );
}