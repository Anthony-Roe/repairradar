"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Search, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchSearchResults } from "@/actions/search";
import SearchPreviewModal from "@/components/modals/SearchPreviewModal";

interface SearchResult {
  id: string;
  type: "Asset" | "WorkOrder" | "Incident" | "MaintenanceSchedule" | "Part";
  title: string;
  description: string | null;
  status?: string;
  priority?: string;
}

export default function DashboardHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const tenant = useTenant();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", tenant.id, query],
    queryFn: () => fetchSearchResults({ tenantId: tenant.id, query }),
    enabled: query.length > 2,
  });

  return (
    <header className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">RepairRadar</h1>
          <nav className="hidden md:flex space-x-4">
            <Button variant="ghost" onClick={() => router.push(`/${tenant.id}/dashboard`)}>
              Dashboard
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${tenant.id}/assets`)}>
              Assets
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${tenant.id}/work-orders`)}>
              Work Orders
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${tenant.id}/incidents`)}>
              Incidents
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${tenant.id}/maintenance`)}>
              Maintenance
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${tenant.id}/parts`)}>
              Parts
            </Button>
          </nav>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Button variant="outline" size="icon" onClick={() => setSearchOpen(true)} aria-label="Open search">
              <Search className="h-4 w-4" />
            </Button>
            {searchOpen && (
              <Command className="absolute top-12 right-0 w-[400px] shadow-lg border rounded-md">
                <CommandInput
                  placeholder="Search assets, work orders, incidents..."
                  value={query}
                  onValueChange={setQuery}
                  aria-label="Search input"
                />
                <CommandList>
                  {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
                  {!isLoading && results.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
                  {results.map((result) => (
                    <CommandItem key={`${result.type}-${result.id}`}>
                      <SearchPreviewModal result={result} tenantId={tenant.id} />
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            )}
          </div>
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}