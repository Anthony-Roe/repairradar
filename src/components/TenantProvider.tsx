// src/providers/tenant-provider.tsx
'use client';

import { createContext, useContext, ReactNode, useState } from 'react';
import { Tenant } from '@/prisma';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/query';

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: Tenant;
  children: ReactNode;
}) {
  const [queryClient] = useState(() => createQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <TenantContext.Provider value={tenant}>
        {children}
      </TenantContext.Provider>
    </QueryClientProvider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}