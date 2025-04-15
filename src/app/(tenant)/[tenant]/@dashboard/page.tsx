// app/(tenant)/[tenant]/@dashboard/page.tsx
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { useQuery } from "@tanstack/react-query";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/actions/dashboard";
import { TenantProvider } from "@/components/TenantProvider";
import { Skeleton } from "@/components/ui/skeleton";
import {SiteHeader} from "@/components/site-header";
import {AppSidebar} from "@/components/app-sidebar";
import {SectionCards} from "@/components/section-cards";
import {DataTable} from "@/components/data-table";
import {ChartAreaInteractive} from "@/components/chart-area-interactive";
import { FloatingActionButton } from "@/components/dashboard/FloatingActionButton";

// Define dashboard data type based on Prisma schema and data.json
type DashboardData = {
  assets: { total: number; active: number };
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
  incidents: { total: number; unresolved: number };
  maintenanceSchedules: { upcoming: number };
  parts: { lowStock: Array<{ id: string; name: string; quantity: number }> };
  trends: Array<{ date: string; workOrders: number; incidents: number }>;
};

export default async function DashboardPage({ params }: { params: { tenant: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Prefetch data server-side
  const initialData = await getDashboardData(params.tenant);

  return (
    <TenantProvider tenantId={params.tenant}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent initialData={initialData} tenantId={params.tenant} />
      </Suspense>
    </TenantProvider>
  );
}

function DashboardContent({
  initialData,
  tenantId,
}: {
  initialData: DashboardData;
  tenantId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", tenantId],
    queryFn: () => getDashboardData(tenantId),
    initialData,
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader tenantId={tenantId} />
      <div className="flex flex-1">
        <AppSidebar tenantId={tenantId} />
        <main className="flex-1 p-6">
          <SectionCards
            stats={{
              assets: data.assets,
              workOrders: {
                total: data.workOrders.length,
                open: data.workOrders.filter((wo) => wo.status === "OPEN").length,
                closed: data.workOrders.filter((wo) => wo.status === "CLOSED").length,
              },
              incidents: data.incidents,
              maintenanceSchedules: data.maintenanceSchedules,
            }}
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <DataTable rows={data.workOrders} tenantId={tenantId} />
            <ChartAreaInteractive data={data.trends} />
          </div>
        </main>
      </div>
      <FloatingActionButton tenantId={tenantId} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Skeleton className="h-16 w-full" />
      <div className="flex flex-1">
        <Skeleton className="h-full w-64" />
        <div className="flex-1 p-6">
          <Skeleton className="h-32 w-full" />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}