import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const subdomain = url.searchParams.get("subdomain");

  if (subdomain) {
    const tenant = await prisma.tenants.findUnique({
      where: { subdomain, deletedAt: null },
      include: { config: true },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(tenant);
  }

  const tenants = await prisma.tenants.findMany({ include: { config: true } });
  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, subdomain, modules } = await req.json();
  const tenant = await prisma.tenants.create({
    data: { name, subdomain, config: { create: { modules } } },
  });
  return NextResponse.json(tenant, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.headers.get("X-Action");
  if (action === "updateTenant") return await handleUpdateModules(req);
  if (action === "deleteTenant") return await handleDeleteTenant(req);
  if (action === "restoreTenant") return await handleRestoreTenant(req);
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

async function handleUpdateModules(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const { modules } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });

  try {
    const tenant = await prisma.tenants.update({
      where: { id, deletedAt: null }, // Only update active tenants
      data: { config: { update: { modules } } },
    });
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Update modules failed:", error);
    return NextResponse.json({ error: "Failed to update modules" }, { status: 500 });
  }
}

async function handleDeleteTenant(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });

  try {
    const tenant = await prisma.tenants.update({
      where: { id, deletedAt: null }, // Only delete active tenants
      data: { deletedAt: new Date() },
    });
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Soft delete failed:", error);
    return NextResponse.json({ error: "Failed to soft delete tenant" }, { status: 500 });
  }
}

async function handleRestoreTenant(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });

  try {
    const tenant = await prisma.tenants.findUnique({ where: { id } });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    if (!tenant.deletedAt) return NextResponse.json({ error: "Tenant is already active" }, { status: 400 });

    const updatedTenant = await prisma.tenants.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json(updatedTenant);
  } catch (error) {
    console.error("Restore tenant failed:", error);
    return NextResponse.json({ error: "Failed to restore tenant" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });

  const tenant = await prisma.tenants.delete({ where: { id } });
  return NextResponse.json(tenant);
}