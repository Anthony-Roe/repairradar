"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditDialog } from "@/components/EditDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Archive, Edit, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Asset } from "@prisma/client";
import { useAssetData, dynamicFetch } from "@/shared/lib/hooks";
import router from "next/router";
import { useSession } from "next-auth/react";

export default function AssetsPage({ tenant }: { tenant: string }) {
  const { status } = useSession();
  const { data: assets = [], isLoading, refetch } = useAssetData(tenant);
  const [searchTerm, setSearchTerm] = useState("");
  const [newAsset, setNewAsset] = useState({ name: "", location: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredAssets = useCallback(() => {
    console.log("Assets:", assets);
    const searchTermLower = searchTerm.toLowerCase();
    const filtered = assets.filter((asset) =>
      asset.name.toLowerCase().includes(searchTermLower) ||
      (asset.location && asset.location.toLowerCase().includes(searchTermLower))
    );
    console.log("Filtered assets:", filtered.map((a) => ({ id: a.id, name: a.name }))); // Debug keys
    return filtered;
  }, [assets, searchTerm]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim()) return toast.error("Asset name is required");
    try {
      await dynamicFetch<Asset>("assets", tenant, "POST", { body: newAsset });
      setNewAsset({ name: "", location: "" });
      await handleRefresh();
      toast.success("Asset created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create asset");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to archive this asset?")) return;
    await dynamicFetch<Asset>("assets", tenant, "PUT", { id, action: "delete" });
    await handleRefresh();
    toast.success("Asset archived");
  };

  const handleRestoreAsset = async (id: string) => {
    await dynamicFetch<Asset>("assets", tenant, "PUT", { id, action: "restore" });
    await handleRefresh();
    toast.success("Asset restored");
  };

  const handleUpdateAsset = async (data: Partial<Asset>) => {
    if (!currentAsset) return;
    await dynamicFetch<Asset>("assets", tenant, "PUT", { id: currentAsset.id, body: data });
    await handleRefresh();
    setEditDialogOpen(false);
    toast.success("Asset updated");
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      handleRefresh();
    }
  }, [status, handleRefresh]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-muted-foreground">Manage your organizations physical assets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={() => setIsCreating(!isCreating)}>
            <Plus className="h-4 w-4 mr-2" /> New Asset
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>{filteredAssets().length} {filteredAssets().length === 1 ? "asset" : "assets"} found</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isCreating && (
            <form onSubmit={handleCreateAsset} className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium leading-none mb-1 block">Asset Name *</label>
                  <Input value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="e.g., Laptop" required />
                </div>
                <div>
                  <label className="text-sm font-medium leading-none mb-1 block">Location</label>
                  <Input value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} placeholder="e.g., Room 101" />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={!newAsset.name.trim()}>Add Asset</Button>
                  <Button variant="outline" type="button" onClick={() => setIsCreating(false)}>Cancel</Button>
                </div>
              </div>
            </form>
          )}
          <Table>
            <TableHeader>
              <TableRow key={"header"}>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets().map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.location || "Not specified"}</TableCell>
                  <TableCell><Badge variant={asset.deletedAt ? "destructive" : "default"}>{asset.deletedAt ? "Archived" : "Active"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Actions</Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {asset.deletedAt ? (
                          <DropdownMenuItem onClick={() => handleRestoreAsset(asset.id)} className="text-green-600"><Archive className="h-4 w-4 mr-2" />Restore</DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => { setCurrentAsset(asset); setEditDialogOpen(true); }}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteAsset(asset.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <EditDialog
        open={editDialogOpen}
        onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setCurrentAsset(null); }}
        title="Edit Asset"
        initialData={{ name: currentAsset?.name || "", location: currentAsset?.location || "" }}
        fields={[
          { name: "name", label: "Asset Name", type: "text", required: true },
          { name: "location", label: "Location", type: "text" },
        ]}
        onSubmit={handleUpdateAsset}
      />
    </div>
  );
}