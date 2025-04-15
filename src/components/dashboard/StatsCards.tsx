// src/app/(tenant)/[tenant]/@dashboard/components/StatsCards.tsx
export function StatsCards({
  assetsCount,
  workOrdersCount,
  maintenanceCount,
  incidentsCount,
}: {
  assetsCount: number;
  workOrdersCount: number;
  maintenanceCount: number;
  incidentsCount: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card bg-base-100 shadow-xl p-4">
        <h3 className="text-lg font-semibold">Assets</h3>
        <p className="text-2xl">{assetsCount}</p>
      </div>
      <div className="card bg-base-100 shadow-xl p-4">
        <h3 className="text-lg font-semibold">Work Orders</h3>
        <p className="text-2xl">{workOrdersCount}</p>
      </div>
      <div className="card bg-base-100 shadow-xl p-4">
        <h3 className="text-lg font-semibold">Maintenance Schedules</h3>
        <p className="text-2xl">{maintenanceCount}</p>
      </div>
      <div className="card bg-base-100 shadow-xl p-4">
        <h3 className="text-lg font-semibold">Incidents</h3>
        <p className="text-2xl">{incidentsCount}</p>
      </div>
    </div>
  );
}