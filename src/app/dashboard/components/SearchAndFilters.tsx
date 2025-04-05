"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui";
import { Search, Filter, RefreshCw } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface SearchProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  loading: boolean;
  refreshData: () => Promise<void>;  // Assuming this is a function that returns a Promise
}

export default function SearchAndFilters({ 
    search, 
    setSearch, 
    loading, 
    refreshData
}: SearchProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1 border border-border rounded-xl bg-card">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets, calls, work orders..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </Button>
        <Button onClick={refreshData} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>
    </div>
  );
}
