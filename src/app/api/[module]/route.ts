import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { ModuleManager } from "@/shared/modules/moduleManager";
import { TenantConfig } from "@/shared/modules/types";

const moduleConfig: Record<
  string,
  {
    model: any;
    metrics?: (items: any[]) => Record<string, number>;
    include?: any;
    orderBy?: any;
    createTransform?: (data: any, session: any) => any;
  }
> = {
  assets: {
    model: prisma.asset,
    metrics: (items) => ({
      total: items.length,
      active: items.filter((item) => !item.deletedAt).length,
    }),
    orderBy: { name: "asc" },
    createTransform: (data, session) => ({
      name: data.name,
      location: data.location || null,
      tenantId: data.tenantId,
    }),
  },
  calls: {
    model: prisma.call,
    metrics: (items) => ({
      total: items.length,
      open: items.filter((item) => item.status === "OPEN").length,
    }),
    include: { asset: true, reportedBy: { select: { id: true, email: true } } },
    orderBy: { callTime: "desc" },
    createTransform: (data, session) => ({
      issue: data.issue,
      status: "OPEN",
      tenantId: data.tenantId,
      assetId: data.assetId,
      reportedById: session.user.id,
      callTime: new Date(),
    }),
  },
  "work-orders": {
    model: prisma.workOrder,
    metrics: (items) => ({
      total: items.length,
      active: items.filter((item) => item.status === "IN_PROGRESS" || item.status === "PENDING").length,
    }),
    include: { assets: { include: { asset: true } }, notes: true, assignedTo: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
    createTransform: (data, session) => ({
      description: data.description,
      status: "PENDING",
      tenantId: data.tenantId,
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assignedToId: data.assignedToId || null,
      assets: { create: data.assetIds.map((assetId: string) => ({ assetId })) },
      notes: data.notes ? { create: data.notes.map((note: string) => ({ note, createdById: session.user.id })) } : undefined,
    }),
  },
  "preventative-maintenance": {
    model: prisma.maintenanceSchedule,
    metrics: (items) => ({
      total: items.length,
      scheduled: items.filter((item) => item.status === "SCHEDULED").length,
    }),
    include: { assets: { include: { asset: true } }, assignedTo: { select: { id: true, email: true } } },
    orderBy: { nextRun: "asc" },
    createTransform: (data) => ({
      description: data.description,
      recurrence: data.recurrence,
      nextRun: new Date(data.nextRun),
      lastRun: data.lastRun ? new Date(data.lastRun) : null,
      status: data.status || "SCHEDULED",
      priority: data.priority || "MEDIUM",
      assignedToId: data.assignedToId || null,
      tenantId: data.tenantId,
      assets: { create: data.assetIds.map((assetId: string) => ({ assetId })) },
    }),
  },
  inventory: {
    model: prisma.part,
    metrics: (items) => ({
      total: items.length,
      lowStock: items.filter((item) => item.quantity < item.minStock).length,
      active: items.filter((item) => !item.deletedAt).length,
    }),
    include: { vendors: { include: { vendor: true } } },
    orderBy: { name: "asc" },
    createTransform: (data) => ({
      name: data.name,
      description: data.description || null,
      quantity: parseInt(data.quantity) || 0,
      minStock: parseInt(data.minStock) || 0,
      tenantId: data.tenantId,
      vendors: data.vendorIds ? { create: data.vendorIds.map((vendorId: string) => ({ vendorId })) } : undefined,
    }),
  },
  vendors: {
    model: prisma.vendor,
    metrics: (items) => ({
      total: items.length,
      active: items.filter((item) => !item.deletedAt).length,
    }),
    orderBy: { name: "asc" },
    createTransform: (data) => ({
      name: data.name,
      contact: data.contact || null,
      email: data.email || null,
      tenantId: data.tenantId,
    }),
  },
  dashboard: { model: null },
};

async function handleRequest(req: NextRequest, method: string, module: string) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const subdomain = url.searchParams.get("subdomain");
  const id = url.searchParams.get("id");
  const config = moduleConfig[module];

  if (!config) return NextResponse.json({ error: `Invalid module: ${module}` }, { status: 404 });

  if (module === "dashboard") {
    if (method !== "GET") return NextResponse.json({ error: "Method not allowed for dashboard" }, { status: 405 });
    return handleDashboardRequest(req, subdomain);
  }

  if (!subdomain) return NextResponse.json({ error: "Subdomain is required" }, { status: 400 });
  const tenant = await prisma.tenants.findUnique({
    where: { subdomain, deletedAt: null },
    include: { config: true },
  });
  if (!tenant) return NextResponse.json({ error: `Tenant not found: ${subdomain}` }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (method !== "GET" && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
  }

  const model = config.model;
  const include = config.include || {};
  const orderBy = config.orderBy || { createdAt: "desc" };

  try {
    switch (method) {
      case "GET":
        const items = await model.findMany({
          where: { tenantId: tenant.id, deletedAt: null },
          include,
          orderBy,
        });
        return NextResponse.json(items);

      case "POST":
        const createData = await req.json();
        if (!createData.subdomain || createData.subdomain !== subdomain) {
          return NextResponse.json({ error: "Subdomain mismatch" }, { status: 400 });
        }
        const transformedData = config.createTransform
          ? config.createTransform({ ...createData, tenantId: tenant.id }, session)
          : { ...createData, tenantId: tenant.id };
        const newItem = await model.create({
          data: transformedData,
          include,
        });
        return NextResponse.json(newItem, { status: 201 });

      case "PUT":
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        const action = req.headers.get("X-Action");
        const updateData = await req.json();

        if (action === "delete") {
          const deletedItem = await model.update({
            where: { id, tenantId: tenant.id, deletedAt: null },
            data: { deletedAt: new Date() },
            include,
          });
          return NextResponse.json(deletedItem);
        } else if (action === "restore") {
          const restoredItem = await model.update({
            where: { id, tenantId: tenant.id },
            data: { deletedAt: null },
            include,
          });
          return NextResponse.json(restoredItem);
        } else {
          // Filter out 'subdomain' from updateData
          const { subdomain: _, ...filteredUpdateData } = updateData;
          const updatedItem = await model.update({
            where: { id, tenantId: tenant.id, deletedAt: null },
            data: { ...filteredUpdateData, updatedAt: new Date() },
            include,
          });
          return NextResponse.json(updatedItem);
        }

      case "DELETE":
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        await model.delete({ where: { id, tenantId: tenant.id } });
        return NextResponse.json({ message: `${module} permanently deleted` });

      default:
        return NextResponse.json({ error: `Method ${method} not allowed` }, { status: 405 });
    }
  } catch (error) {
    console.error(`[${module}] ${method} error:`, error);
    return NextResponse.json({ error: `Failed to process ${module} request` }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  return handleRequest(req, "GET", (await params).module);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  return handleRequest(req, "POST", (await params).module);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  return handleRequest(req, "PUT", (await params).module);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  return handleRequest(req, "DELETE", (await params).module);
}

export const dynamic = "force-dynamic";