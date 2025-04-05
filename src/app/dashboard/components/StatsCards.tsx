"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Call, WorkOrder, Part, Asset, CallStatus } from "@/lib/types";
import { Package, Phone, Server, Wrench } from "lucide-react";

export default function StatsCards({ calls, workOrders, parts, assets }: StatsCardsProps) {
  calls = calls.filter((call) => call.status !== CallStatus.CLOSED);
  const downedAssets = assets.filter(a => calls.filter(c => c.assetId == a.id).length > 0).length;
  const assetPriority = downedAssets > 0 ? "bg-destructive border" : "bg-card border";
  const stats = [
    { title: "Active Calls", value: calls.length, bg: "bg-card border", color: "text-secondary-foreground", icon: Phone },
    { title: "Work Orders", value: workOrders.length, bg: "bg-card border", color: "text-secondary-foreground", icon: Wrench },
    { title: "Low Stock Parts", value: parts.filter(p => p.quantity <= p.minStock).length, bg: "bg-card border", color: "text-secondary-foreground", icon: Package },
    { title: "Assets (Not Running)", value: downedAssets, bg: assetPriority, color: "text-secondary-foreground", icon: Server },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="border-none bg-transparent text-card-foreground rounded-xl shadow-lg hover:shadow-[0_0_10px_hsl(var(--primary)/0.3)] transition-shadow"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`rounded-full p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface StatsCardsProps {calls: Call[], workOrders: WorkOrder[], parts: Part[], assets: Asset[]}