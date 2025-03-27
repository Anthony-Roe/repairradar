// src/app/api/tenants/[tenantId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

// Await params explicitly
export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId } = await context.params; // Await params
  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get("subdomain");

  const tenant = await prisma.tenants.findUnique({
    where: subdomain ? { subdomain } : { id: tenantId, deletedAt: null },
    include: { config: true },
  });

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const action = req.headers.get("X-Action");
  const body = await req.json();
  const { tenantId } = await context.params; // Await params

  if (action === "updateTenant") {
    const { modules } = body;
    const tenant = await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        config: {
          upsert: {
            create: { modules },
            update: { modules },
          },
        },
      },
      include: { config: true },
    });
    return NextResponse.json(tenant);
  }else if (action === "softDeleteTenant") {
    const tenant = await prisma.tenants.update({
      where: { id: tenantId },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ message: "Tenant soft deleted" + tenant.id });
  }
  return NextResponse.json({ error: "Invalid action " + action }, { status: 400 });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = await context.params; // Await params
  await prisma.tenants.delete({ where: { id: tenantId } });
  return NextResponse.json({ message: "Tenant deleted" });
}