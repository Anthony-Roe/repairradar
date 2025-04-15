// src/hooks/useTenantData.ts
import { Prisma } from '@/prisma';
import { TenantWithRelations } from '@/types/tenant';
import { AssetStatus, CallStatus } from '@prisma/client';
import { QueryClient, useQuery } from '@tanstack/react-query';

async function fetchTenantData(subdomain: string): Promise<TenantWithRelations> {
  const res = await fetch(`/api/tenant/${subdomain}/dashboard`);
  if (!res.ok) throw new Error('useTenantData: Failed to fetch data');
  return res.json();
}

export function useTenantData(subdomain: string) {
  return useQuery({
    queryKey: ['tenant', subdomain, 'dashboard'],
    queryFn: () => fetchTenantData(subdomain),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (data: TenantWithRelations) => ({
      ...data,
      lowStockParts: data.parts.filter(p => p.quantity <= p.minStock),
      activeWorkOrders: data.workOrders.filter(wo => 
        ['PENDING', 'IN_PROGRESS'].includes(wo.status)
      ), 
      activeCalls: data.incidents.filter(c => CallStatus.OPEN.includes(c.status)),
      assetsDown: data.assets.filter(a => !AssetStatus.OPERATIONAL.includes(a.status)),
    }),
  }, new QueryClient());
}
