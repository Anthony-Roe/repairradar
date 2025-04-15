// src/app/(tenant)/[tenant]/@dashboard/components/MaintenanceCalls.tsx
import Link from "next/link";

export function MaintenanceCalls({ schedules }: { schedules: any[] }) {
  return (
    <div className="card bg-base-100 shadow-xl p-4">
      <h3 className="text-lg font-semibold">Upcoming Maintenance</h3>
      <ul className="space-y-2">
        {schedules.slice(0, 5).map((schedule) => (
          <li key={schedule.id}>
            <Link href={`/maintenance/${schedule.id}`} className="text-blue-600 hover:underline">
              {schedule.title || `Schedule #${schedule.id}`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}