// src/lib/queryClient.ts
import { QueryFunction, QueryClient } from "@tanstack/react-query";
import {
  getAssets,
  getWorkOrders,
  getMaintenanceSchedules,
  getIncidents,
  getParts,
} from "@/actions";

type QueryKeys = {
  assets: { tenantId: string };
  workOrders: { tenantId: string };
  maintenance: { tenantId: string };
  incidents: { tenantId: string };
  parts: { tenantId: string };
};

export const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const [key, tenantId] = queryKey as [string, string];

  switch (key) {
    case "assets":
      const assetsRes = await getAssets({ tenantId });
      return assetsRes.assets;
    case "workOrders":
      const workOrdersRes = await getWorkOrders({ tenantId });
      return workOrdersRes.workOrders;
    case "maintenance":
      const maintenanceRes = await getMaintenanceSchedules({ tenantId });
      return maintenanceRes.schedules;
    case "incidents":
      const incidentsRes = await getIncidents({ tenantId });
      return incidentsRes.incidents;
    case "parts":
      const partsRes = await getParts({ tenantId });
      return partsRes.parts;
    default:
      throw new Error(`Unknown query key: ${key}`);
  }
};

export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: defaultQueryFn,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
};