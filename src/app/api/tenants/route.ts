// src/app/api/tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  console.log("SESSION:", session);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get("subdomain");

  if (subdomain) {
    const tenant = await prisma.tenants.findUnique({
      where: { subdomain, deletedAt: null },
      select: { config: true },
    });

    console.log("tenant", tenant);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json({ config: tenant.config }); // config might be null
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenants.findMany({
    where: { deletedAt: null },
    select: { id: true, subdomain: true, config: true, createdAt: true },
  });
  return NextResponse.json({ tenants });
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