// src/lib/tenant-cache.ts
import { cache } from 'react'
import {prisma} from './prisma'
import { TenantWithRelations } from '@/types/tenant'

export const getTenantData = cache(async (subdomain: string): Promise<TenantWithRelations> => {
  return await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      parent: true,           // Include parent tenant (if exists)
      settings: true,         // Include tenant settings (if exists)
      users: true,            // Include related users
      categories: true,       // Include asset categories
      assetTypes: true,       // Include asset types
      assets: true,           // Include assets
      meters: true,           // Include meters
      maintenance: true,      // Include maintenance schedules
      workOrders: true,       // Include work orders
      parts: true,            // Include parts
      vendors: true,          // Include vendors
      incidents: true,        // Include incidents
      children: true,

      // Other frequently accessed relations
    }
  }) as TenantWithRelations
})