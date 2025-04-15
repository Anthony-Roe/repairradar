import { Prisma } from "@/prisma";

export type TenantWithRelations = Prisma.TenantGetPayload<{
    include: {
      parent: true;           // Include parent tenant (if exists)
      settings: true;         // Include tenant settings (if exists)
      users: true;            // Include related users
      categories: true;       // Include asset categories
      assetTypes: true;       // Include asset types
      assets: true;           // Include assets
      meters: true;           // Include meters
      maintenance: true;      // Include maintenance schedules
      workOrders: true;       // Include work orders
      parts: true;            // Include parts
      vendors: true;          // Include vendors
      incidents: true;        // Include incidents
      children: true;         // Include child tenants (if exists)
    };
}>;