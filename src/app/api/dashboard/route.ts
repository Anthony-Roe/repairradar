// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import {prisma} from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.tenant?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await prisma.$transaction([
    prisma.asset.findMany({ where: { tenantId: session.user.tenant.id } }),
    prisma.incident.findMany({ where: { tenantId: session.user.tenant.id } }),
    prisma.workOrder.findMany({ where: { tenantId: session.user.tenant.id } }),
    prisma.part.findMany({ where: { tenantId: session.user.tenant.id } }),
    prisma.vendor.findMany({ where: { tenantId: session.user.tenant.id } })
  ])

  return NextResponse.json({
    meta: session.user,
    assets: data[0],
    calls: data[1],
    workOrders: data[2],
    parts: data[3],
    vendors: data[4]
  })
}