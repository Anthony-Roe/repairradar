"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useInventoryData, useVendorData, dynamicFetch } from "@/shared/lib/hooks";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function InventoryPage({ tenant, activeModules = [], onSelectModule }) {
  const { status } = useSession();
  const router = useRouter();
  const { data: inventory = [], isLoading, refetch } = useInventoryData(tenant); // tenant is subdomain
  const { data: vendors = [], isLoading: vendorsLoading, refetch: refetchVendors } = useVendorData(tenant);
  const [search, setSearch] = useState("");
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [newPart, setNewPart] = useState({ name: "", description: "", quantity: 0, min_stock: 0, tenant_id: tenant });

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([refetch(), refetchVendors()]);
      toast.success("Inventory and vendors refreshed");
    } catch {
      toast.error("Failed to refresh data");
    }
  }, [refetch, refetchVendors]);

  const filteredInventory = useCallback(() => {
    return inventory.filter((item) => {
      const name = item.name || "";
      return search === "" || name.toLowerCase().includes(search.toLowerCase());
    });
  }, [inventory, search]);

  const handleAddPart = useCallback(async (e) => {
    e.preventDefault();
    if (!newPart.name || newPart.quantity < 0 || newPart.min_stock < 0) {
      toast.error("Name and non-negative quantity/min stock are required");
      return;
    }
    try {
      await dynamicFetch("parts", tenant, "POST", { body: newPart });
      setNewPart({ name: "", description: "", quantity: 0, min_stock: 0, tenant_id: tenant });
      setIsAddingPart(false);
      await refreshData();
      toast.success("Part added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add part");
    }
  }, [newPart, tenant, refreshData]);

  const handleDeletePart = useCallback(async (id) => {
    if (confirm("Are you sure you want to delete this part?")) {
      try {
        await dynamicFetch("parts", tenant, "DELETE", { id });
        await refreshData();
        toast.success("Part deleted successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete part");
      }
    }
  }, [tenant, refreshData]);

  useEffect(() => {
    if (status !== "loading" && status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (isLoading || vendorsLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const dashboardModule = activeModules.find((m) => m.name === "dashboard");
  const breadcrumbItems = [...(dashboardModule ? [{ label: "Dashboard", module: dashboardModule }] : []), { label: "Inventory" }];

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb tenant={tenant} items={breadcrumbItems} onSelectModule={onSelectModule} />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory - {tenant}</h1>
          <p className="text-sm text-muted-foreground">Track parts and vendors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoading || vendorsLoading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setIsAddingPart(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Part
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Parts Inventory</CardTitle>
              <CardDescription>
                {filteredInventory().length} {filteredInventory().length === 1 ? "part" : "parts"} found
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-9 w-full md:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isAddingPart && (
            <form onSubmit={handleAddPart} className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={newPart.name}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    placeholder="Part name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <Input
                    type="number"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock *</label>
                  <Input
                    type="number"
                    value={newPart.min_stock}
                    onChange={(e) => setNewPart({ ...newPart, min_stock: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Input
                    value={newPart.description}
                    onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                    placeholder="Description (optional)"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={!newPart.name || newPart.quantity < 0 || newPart.min_stock < 0}>
                    Add Part
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setIsAddingPart(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory().map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={item.quantity < item.min_stock ? "destructive" : "secondary"}>
                      {item.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.min_stock}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => handleDeletePart(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}