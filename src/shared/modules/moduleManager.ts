// src/shared/modules/moduleManager.ts
import { moduleImports } from "./moduleImports.generated";
import { TenantConfig } from "./types";

export interface RawModule {
  name: string;
  component: () => Promise<{ default: React.ComponentType<{ tenant: string }> }>;
  apiRoute: string;
}

export class ModuleManager {
  static getActiveModules(config: TenantConfig | undefined): RawModule[] {
    if (!config) return [];
    return Object.keys(config.modules)
      .filter((key) => key && moduleImports[key])
      .map((key) => ({
        name: key,
        component: moduleImports[key],
        apiRoute: `/api/${key}`,
      }));
  }

  static getAllModules(): string[] {
    return Object.keys(moduleImports);
  }
}