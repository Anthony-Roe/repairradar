import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCards from "@/components/dashboard/StatsCards";
import WorkOrdersTable from "@/components/dashboard/WorkOrdersTable";

export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.tenantId !== tenant) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader tenantId={tenant} />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <StatsCards tenantId={tenant} />
        <WorkOrdersTable tenantId={tenant} />
      </main>
    </div>
  );
}