// dashboard ui .tsx
import { fetchDashboardData } from '@/app/dashboard/actions';
import { requireAuth } from '@/lib/auth';
import Dashboard from './client';
import { DashboardData } from '@/types/dashboard';

// Mock types for TypeScript (adjust based on your schema)

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await fetchDashboardData(user) as unknown as DashboardData;

  return ( <Dashboard {...data} /> );
}