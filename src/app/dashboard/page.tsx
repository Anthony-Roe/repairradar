// dashboard ui .tsx
import { logout } from '@/app/login/actions';
import { getUser, fetchDashboardData } from '@/app/dashboard/actions';

// Mock types for TypeScript (adjust based on your schema)
type Asset = { id: string; name: string; location: string; status: string };
type Call = { id: string; asset_id: string; issue: string; call_time: string; status: string; end_time?: string; solution?: string };
type WorkOrder = { id: string; description: string; status: string; priority: string; assigned_to_id: string };
type Part = { id: string; name: string; quantity: number; min_stock: number };
type Vendor = { id: string; name: string; part_vendors: { cost: number; part_id: string }[]; };

export default async function Dashboard() {
  const tenants = await getUser();
  const { assets, calls, workOrders, parts, vendors } = await fetchDashboardData();

  return (
    <div className="p-4 h-screen grid grid-cols-12 grid-rows-6 gap-4 bg-gray-100">
      {/* Central Hub: Production Floor Map */}
      <div className="col-span-8 row-span-4 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-2">Production Floor</h2>
        <div className="h-full flex flex-wrap gap-4">
          {assets && assets.map((asset: Asset) => (
            <div
              key={asset.id}
              className={`p-2 rounded-full w-16 h-16 flex items-center justify-center text-white cursor-pointer ${
                asset.status === 'down' ? 'bg-red-500' : 'bg-green-500'
              }`}
              title={`${asset.name} - ${asset.location}`}
            >
              {asset.name}
            </div>
          ))}
        </div>
      </div>

      {/* Left Sidebar: Live Maintenance Calls */}
      <div className="col-span-4 row-span-4 bg-white rounded-lg shadow p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Live Maintenance Calls</h2>
        <div className="space-y-2">
          {calls.filter((call: Call) => call.status !== 'closed').map((call: Call) => (
            <div key={call.id} className="p-2 border rounded">
              <p><strong>{assets.find((a: Asset) => a.id === call.asset_id)?.name}</strong>: {call.issue}</p>
              <p>Started: {new Date(call.call_time).toLocaleTimeString()}</p>
              <p>Status: {call.status}</p>
              <button className="mt-2 bg-blue-500 text-white px-2 py-1 rounded">End Call</button>
            </div>
          ))}
        </div>
      </div>

      {/* Top Panel: Parts Inventory & Vendors */}
      <div className="col-span-6 row-span-2 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-2">Parts Inventory</h2>
        <div className="grid grid-cols-2 gap-2">
          {parts.map((part: Part) => (
            <div key={part.id} className="p-2 border rounded">
              <p>{part.name}: {part.quantity}/{part.min_stock}</p>
              {part.quantity < part.min_stock && (
                <select className="mt-1 w-full border">
                  {vendors.map((vendor: Vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name} - ${vendor.part_vendors.toString()}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Work Orders & Assets */}
      <div className="col-span-6 row-span-2 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-2">Work Orders</h2>
        <div className="space-y-2">
          {workOrders.map((wo: WorkOrder) => (
            <div key={wo.id} className="p-2 border rounded">
              <p>{wo.description} - {wo.priority}</p>
              <p>Status: {wo.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Stats & Graphs */}
      <div className="col-span-12 row-span-2 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-2">Stats & Graphs</h2>
        <div className="flex gap-4">
          <div className="w-1/3 h-32 bg-gray-200 rounded">Downtime Chart</div>
          <div className="w-1/3 h-32 bg-gray-200 rounded">Resolution Time</div>
          <div className="w-1/3 h-32 bg-gray-200 rounded">Parts Usage</div>
        </div>
      </div>

      {/* Floating Widget: Virtual Assistant */}
      <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg">
        <p>Chatbot</p>
      </div>
    </div>
  );
}