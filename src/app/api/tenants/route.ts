// src/app/api/tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get("subdomain");

  if (subdomain) {
    const tenant = await prisma.tenants.findUnique({
      where: { subdomain, deletedAt: null },
      include: { config: true },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(tenant);
  }

  // Fetch all tenants for SUPER_ADMIN only
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const tenants = await prisma.tenants.findMany({
    where: { deletedAt: null },
    include: { config: true },
  });
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, subdomain, modules } = await req.json();
  const tenant = await prisma.tenants.create({
    data: {
      name,
      subdomain,
      config: { create: { modules } },
    },
    include: { config: true },
  });
  return NextResponse.json(tenant, { status: 201 });
}