// src/app/dashboard/page.tsx
import { fetchDashboardData } from '@/app/dashboard/actions';
import { DashboardData } from '@/lib/types';
import AssetMapEditor from '../../../../scripts/AssetMapEditor';
import ErrorBoundary from 'next/dist/client/components/error-boundary';

export default async function AssetMapPage() {
  const initialData: DashboardData = await fetchDashboardData();
  return (
    <div 
        className='relative bg-gray-50 rounded-md overflow-hidden border w-full h-full'
        style={{ minHeight: '500px' }}
    >
        <AssetMapEditor assets={initialData.assets} calls={initialData.calls} />
    </div>
);
}