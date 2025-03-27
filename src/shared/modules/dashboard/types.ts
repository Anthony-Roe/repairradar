/** Props for DashboardPage */
export interface DashboardPageProps {
  tenant: string;
}

/** Module summary data */
export interface ModuleMetrics {
  total?: number;
  active?: number;
  pending?: number;
  [key: string]: number | undefined;
}

/** Loaded module with metrics */
export interface LoadedModule {
  name: string;
  apiRoute: string;
  metrics: ModuleMetrics | null;
}