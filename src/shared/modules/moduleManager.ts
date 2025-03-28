// File: E:\Dev\websites\repairradar\src\shared\modules\moduleManager.ts
import { moduleImports as o } from "./moduleImports.generated";

export class ModuleManager {
  static getActiveModules(t) {
    if (!t || !t.modules || typeof t.modules !== "object") {
      console.warn("Invalid config or missing modules:", t);
      return [];
    }
    console.log("Config with modules:", t);
    return Object.keys(t.modules)
      .filter((e) => o[e]) // Only include modules that exist in moduleImports
      .map((e) => ({
        name: e,
        component: o[e],
        apiRoute: `/api/${e}`,
      }));
  }

  static getAllModules() {
    console.log(Object.keys(o));
    return Object.keys(o);
  }
}