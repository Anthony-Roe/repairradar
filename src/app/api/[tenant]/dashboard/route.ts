import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// src/app/api/dashboard/route.ts
export async function GET(req: NextRequest, { params }: { params: { tenant: string } }){
  const {tenant} = await params;

  const data = await prisma.tenant.findUnique({
    where: { subdomain: tenant },
    include: {
      parent: true,          // Include parent tenant (if exists)
      settings: true,        // Include tenant settings (if exists)
      users: true,           // Include related users
      categories: true,      // Include asset categories
      assetTypes: true,      // Include asset types
      assets: true,          // Include assets
      meters: true,          // Include meters
      maintenance: true,     // Include maintenance schedules
      workOrders: true,      // Include work orders
      parts: true,           // Include parts
      vendors: true,         // Include vendors
      incidents: true,       // Include incidents
      children: true,        // Include child tenants (if exists)
    },
  });

  if (!data) {
    throw new Error(`Dashboard for: ${tenant} failed fetching data.`); 
  }

  return NextResponse.json({
    tenant: data,
    timestamp: new Date().toISOString()
  })
}