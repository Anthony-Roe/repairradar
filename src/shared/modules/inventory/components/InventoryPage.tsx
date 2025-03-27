// File: E:\Dev\websites\repairradar\src\shared\modules\inventory\components\InventoryPage.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Search, Trash2, Edit, Users, ChevronDown } from "lucide-react";
import { EditDialog } from "@/components/EditDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInventoryData, useVendorData, dynamicFetch } from "@/shared/lib/hooks";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Module } from "@/shared/modules/types"; // Import Module type

type PartWithVendors = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  minStock: number;
  vendors: { vendor: { id: string; name: string } }[];
};

type Vendor = {
  id: string;
  name: string;
  contact?: string;
  email?: string;
};

interface InventoryPageProps {
  tenant: string;
  activeModules?: Module[];           // Added from TenantPage
  onSelectModule?: (module: Module) => void; // Added from TenantPage
}

export default function InventoryPage({ tenant, activeModules = [], onSelectModule }: InventoryPageProps) {
  const { status } = useSession();
  const router = useRouter();

  // Data hooks
  const { data: parts = [], isLoading: partsLoading, refetch: refetchParts } = useInventoryData(tenant);
  const { data: vendors = [], isLoading: vendorsLoading, refetch: refetchVendors } = useVendorData(tenant);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [currentPart, setCurrentPart] = useState<PartWithVendors | null>(null);
  const [newPart, setNewPart] = useState({
    name: "",
    description: "",
    quantity: 0,
    minStock: 0,
    vendorIds: [] as string[],
  });

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([refetchParts(), refetchVendors()]);
      toast.success("Inventory and vendors refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  }, [refetchParts, refetchVendors]);

  // Filter parts
  const filteredParts = useCallback(() => {
    return parts.filter((part) => {
      const name = part.name || "";
      const vendorNames = part.vendors.map((v) => v.vendor.name || "").join(" ");
      return (
        searchTerm === "" ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendorNames.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [parts, searchTerm]);

  // CRUD handlers for Parts
  const handleCreatePart = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPart.name || newPart.quantity < 0 || newPart.minStock < 0) {
        toast.error("Name and non-negative quantity/min stock are required");
        return;
      }

      try {
        await dynamicFetch<PartWithVendors>("inventory", tenant, "POST", {
          body: { subdomain: tenant, ...newPart },
        });
        setNewPart({ name: "", description: "", quantity: 0, minStock: 0, vendorIds: [] });
        setIsCreating(false);
        await handleRefresh();
        toast.success("Part added successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add part");
      }
    },
    [newPart, tenant, handleRefresh]
  );

  const handleUpdatePart = useCallback(
    async (updates: Partial<PartWithVendors>) => {
      if (!currentPart) return;

      try {
        await dynamicFetch<PartWithVendors>("inventory", tenant, "PUT", {
          id: currentPart.id,
          body: updates,
        });
        await handleRefresh();
        setEditDialogOpen(false);
        toast.success("Part updated successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update part");
      }
    },
    [currentPart, tenant, handleRefresh]
  );

  const handleDeletePart = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this part?")) return;

      try {
        await dynamicFetch("inventory", tenant, "DELETE", { id });
        await handleRefresh();
        toast.success("Part deleted successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete part");
      }
    },
    [tenant, handleRefresh]
  );

  // Vendor CRUD
  const handleCreateVendor = useCallback(
    async (data: { name: string; contact?: string; email?: string }) => {
      try {
        await dynamicFetch<Vendor>("vendors", tenant, "POST", {
          body: { subdomain: tenant, ...data },
        });
        await handleRefresh();
        toast.success("Vendor added successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add vendor");
      }
    },
    [tenant, handleRefresh]
  );

  // Auth and initial load
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      handleRefresh();
    }
  }, [status, router, handleRefresh]);

  // Loading state
  if (partsLoading || vendorsLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Find the dashboard module for breadcrumb navigation
  const dashboardModule = activeModules.find((mod) => mod.name === "dashboard");

  // Breadcrumb items
  const breadcrumbItems = [
    ...(dashboardModule ? [{ label: "Dashboard", module: dashboardModule }] : []),
    { label: "Inventory" }, // Current page, no module/href
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb tenant={tenant} items={breadcrumbItems} onSelectModule={onSelectModule} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory - {tenant}</h1>
          <p className="text-sm text-muted-foreground">Track parts and vendors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={partsLoading || vendorsLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setVendorDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Vendors
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Parts Inventory</CardTitle>
              <CardDescription>
                {filteredParts().length} {filteredParts().length === 1 ? "part" : "parts"} found
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or vendor..."
                className="pl-9 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create Form */}
          {isCreating && (
            <form onSubmit={handleCreatePart} className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="col-span-1 md:col-span-2">
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
                    placeholder="Quantity"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock *</label>
                  <Input
                    type="number"
                    value={newPart.minStock}
                    onChange={(e) => setNewPart({ ...newPart, minStock: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="Min Stock"
                    required
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Input
                    value={newPart.description}
                    onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                    placeholder="Description (optional)"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Vendors</label>
                  <Select
                    onValueChange={(value) => {
                      if (!newPart.vendorIds.includes(value)) {
                        setNewPart({ ...newPart, vendorIds: [...newPart.vendorIds, value] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors
                        .filter((v) => !newPart.vendorIds.includes(v.id))
                        .map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {newPart.vendorIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {newPart.vendorIds.map((id) => {
                        const vendor = vendors.find((v) => v.id === id);
                        return vendor ? (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            {vendor.name}
                            <button
                              type="button"
                              onClick={() =>
                                setNewPart({
                                  ...newPart,
                                  vendorIds: newPart.vendorIds.filter((vid) => vid !== id),
                                })
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={!newPart.name || newPart.quantity < 0 || newPart.minStock < 0}>
                    Add Part
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Inventory Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Vendors</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    {searchTerm ? "No matching parts found" : "No parts in inventory"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredParts().map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>{part.description || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={part.quantity < part.minStock ? "destructive" : "secondary"}>
                        {part.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>{part.minStock}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {part.vendors.length > 0 ? (
                          part.vendors.map(({ vendor }) => (
                            <Badge key={vendor.id} variant="outline">
                              {vendor.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setCurrentPart(part);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeletePart(part.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Part Dialog */}
      <EditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setCurrentPart(null);
        }}
        title="Edit Part"
        description="Update part details"
        initialData={{
          name: currentPart?.name || "",
          description: currentPart?.description || "",
          quantity: currentPart?.quantity || 0,
          minStock: currentPart?.minStock || 0,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "description", label: "Description", type: "text" },
          { name: "quantity", label: "Quantity", type: "number", required: true },
          { name: "minStock", label: "Min Stock", type: "number", required: true },
        ]}
        onSubmit={(data) =>
          handleUpdatePart({
            name: data.name,
            description: data.description,
            quantity: parseInt(data.quantity as unknown as string) || 0,
            minStock: parseInt(data.minStock as unknown as string) || 0,
          })
        }
      />

      {/* Vendor Dialog */}
      <EditDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        title="Add Vendor"
        description="Create a new vendor"
        initialData={{ name: "", contact: "", email: "" }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "contact", label: "Contact", type: "text" },
          { name: "email", label: "Email", type: "email" },
        ]}
        onSubmit={handleCreateVendor}
      />
    </div>
  );
}