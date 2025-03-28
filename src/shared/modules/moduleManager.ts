import { moduleImports } from './moduleImports.generated';

export class ModuleManager {
  static getActiveModules(t) {
    if (!t || !t.modules || typeof t.modules !== "object") {
      console.warn("Invalid config or missing modules:", t);
      return [];
    }
    console.log("Config with modules:", t);
    return Object.keys(t.modules)
      .filter((e) => t.modules[e] && moduleImports[e]) // Fixed: use moduleImports instead of o
      .map((e) => ({
        name: e,
        component: moduleImports[e],
        apiRoute: `/api/${e}`,
      }));
  }

  static getAllModules() {
    console.log(Object.keys(moduleImports));
    return Object.keys(moduleImports);
  }
}
