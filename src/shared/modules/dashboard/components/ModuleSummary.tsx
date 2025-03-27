import { memo, Suspense } from "react";


/**
 * Renders a dynamically loaded module component with loading fallback.
 * @param {string} name - Module name
 * @param {React.ComponentType<{ tenant: string }>} Component - Module component
 * @param {string} tenant - Tenant identifier
 */
interface ModuleSummaryProps {
  name: string | "test";
  Component: React.ComponentType<{ tenant: string }>;
  tenant: string;
}

// eslint-disable-next-line react/display-name
export const ModuleSummary = memo(({ name, Component, tenant }: ModuleSummaryProps) => (
  <Suspense fallback={<div>Loading ...</div>}>
    <div className="border p-4 rounded">
      <h3 className="font-bold">{name}</h3>
      <Component tenant={tenant} />
    </div>
  </Suspense>
));
