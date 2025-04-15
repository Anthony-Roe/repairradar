import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { TenantProvider, useTenant } from "@/components/TenantProvider";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await useTenant();

  if (!session || session.id !== tenant) {
    redirect("/auth/signin");
  }

  const tenantData = await prisma.tenant.findUnique({
    where: { id: tenant },
    select: { id: true, name: true, subdomain: true },
  });

  if (!tenantData) {
    redirect("/auth/signin");
  }

  return (
    <TenantProvider tenant={session}>
      {children}
    </TenantProvider>
  );
}