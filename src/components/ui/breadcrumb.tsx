// File: E:\Dev\websites\repairradar\src\components\ui\breadcrumb.tsx
"use client";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { Module } from "@/shared/modules/types";

interface BreadcrumbItem {
  label: string;
  module?: Module; // Optional module to switch to
  href?: string;   // Fallback for traditional links (e.g., home)
  onClick?: () => void; // Optional click handler
}

interface BreadcrumbProps {
  tenant?: string;
  items: BreadcrumbItem[];
  onSelectModule?: (module: Module) => void; // Callback from Navbar/TenantPage
}

export function Breadcrumb({ tenant, items, onSelectModule }: BreadcrumbProps) {
  const pathname = usePathname();

  // Base breadcrumb with tenant context
  const baseItems: BreadcrumbItem[] = tenant
    ? [
        { label: "RepairRadar", href: "/" },
        { label: tenant, href: `/dashboard/${tenant}` },
      ]
    : [{ label: "RepairRadar", href: "/" }];

  // Combine base items with provided items
  const breadcrumbItems = [...baseItems, ...items.filter((item) => item.label)];

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {item.href && pathname !== item.href ? (
            <a href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </a>
          ) : item.module && onSelectModule ? (
            <button
              onClick={() => onSelectModule(item.module)}
              className="hover:text-foreground transition-colors"
            >
              {item.label} 
            </button>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
          {index < breadcrumbItems.length - 1 && <ChevronRight className="h-4 w-4 mx-1" />}
        </div>
      ))}
    </nav>
  );
}